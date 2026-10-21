import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { IconSparkle } from '@/components/icons'
import MapPinPicker from '@/components/MapPinPicker'
import { Badge, Button, Input, Modal, StatusBadge } from '@/components/ui'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { api, ApiError, type BranchInput, type DirectoryBranch } from '@/services/api'
import { geocodeAddress, reverseGeocode } from '@/services/geocode'
import { useApi, useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { Branch } from '@/types'

const EMPTY: BranchInput = {
  code: '',
  name: '',
  address: '',
  type: 'Branch',
  // Yangon city centre — the map opens here for a new branch.
  lat: 16.8409,
  lng: 96.1735,
  radius: 150,
  contactName: '',
  contactMobile: '',
  contactEmail: '',
  active: true,
}

/**
 * AP-02 · Add/Edit Branch — create, edit and deactivate a branch: code, name,
 * address, GPS coordinates (picked on the map) and handover radius.
 *
 * The map and Full Address stay in sync: moving the pin fills the address,
 * and typing an address moves the pin.
 *
 * In "Add" mode, Branch Code and Branch Name search the bank's branch
 * directory, listing only branches not yet in the portal (registered ones are
 * changed via Edit). Picking one fills in its code, name, address and
 * location; anything else creates a brand-new branch. Every field is required.
 */
export default function BranchForm({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const invalidate = useInvalidate()
  const toast = useToast()
  const { data: directory } = useApi(() => api.branches.directory())
  const { data: branches } = useApi(() => api.branches.list())

  const [form, setForm] = useState<BranchInput>(branch ?? EMPTY)
  /** Registered branch being edited (Edit mode only). */
  const targetId = branch?.id ?? null
  const [source, setSource] = useState<'none' | 'directory'>('none')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState(false)
  const editMode = !!branch

  /* ---------------- map <-> address sync ---------------- */
  type Lookup = { tone: 'busy' | 'ok' | 'warn'; text: string } | null
  const [lookup, setLookup] = useState<Lookup>(null)
  /** Set only when the user types in Full Address — triggers a (debounced) forward lookup. */
  const [typedAddress, setTypedAddress] = useState<string | null>(null)
  const reverseAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typedAddress === null) return
    const q = typedAddress.trim()
    if (q.length < 6) {
      setLookup(null)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLookup({ tone: 'busy', text: 'Finding this address on the map…' })
      try {
        const hit = await geocodeAddress(q, ctrl.signal)
        if (hit) {
          setForm((f) => ({ ...f, lat: hit.lat, lng: hit.lng }))
          setLookup({ tone: 'ok', text: 'Map moved to this address. Drag the pin to fine-tune.' })
        } else setLookup({ tone: 'warn', text: 'Could not find this address on the map. Place the pin yourself.' })
      } catch (e) {
        if ((e as Error).name !== 'AbortError')
          setLookup({ tone: 'warn', text: 'Address lookup is unavailable (offline?). Place the pin yourself.' })
      }
    }, 900)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [typedAddress])

  /** Pin moved on the map: store the coordinates and fill the address from that spot. */
  const onPinMoved = async (lat: number, lng: number) => {
    setForm((f) => ({ ...f, lat, lng }))
    setTypedAddress(null)
    reverseAbort.current?.abort()
    const ctrl = new AbortController()
    reverseAbort.current = ctrl
    setLookup({ tone: 'busy', text: 'Looking up the address for this spot…' })
    try {
      const addr = await reverseGeocode(lat, lng, ctrl.signal)
      if (addr) {
        setForm((f) => ({ ...f, address: addr }))
        setErrors((e) => {
          const next = { ...e }
          delete next.address
          return next
        })
        setLookup({ tone: 'ok', text: 'Address filled from the map pin. Edit it if needed.' })
      } else setLookup({ tone: 'warn', text: 'No street address at this spot. Type it in.' })
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setLookup({ tone: 'warn', text: 'Address lookup is unavailable (offline?). Type the address in.' })
    }
  }

  const set = <K extends keyof BranchInput>(k: K, v: BranchInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => {
      const next = { ...e }
      delete next[k]
      return next
    })
  }

  /** Branches in the bank directory that aren't in the portal yet (registered ones are already working). */
  const unregistered = useMemo(() => (directory ?? []).filter((d) => !d.registered), [directory])

  /** Fill the form from a directory entry. */
  const applyDirectory = (d: DirectoryBranch) => {
    setErrors({})
    setTypedAddress(null)
    setLookup(null)
    setForm((f) => ({ ...f, code: d.code, name: d.name, address: d.address, lat: d.lat, lng: d.lng }))
    setSource('directory')
  }

  // Typing a code or name that exactly matches a directory entry picks it automatically.
  const onTyped = (field: 'code' | 'name', text: string) => {
    set(field, text)
    const t = text.trim().toLowerCase()
    const hit = unregistered.find((d) => (field === 'code' ? d.code : d.name).toLowerCase() === t)
    if (hit) applyDirectory(hit)
    else if (source !== 'none') setSource('none') // moved away from the picked branch: a new one from here on
  }

  const badge = <Badge tone="neutral">Not in portal</Badge>
  const codeOptions: ComboOption[] = useMemo(
    () => unregistered.map((d) => ({ value: d.code, label: `${d.code} · ${d.name}`, sub: d.address, badge })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unregistered],
  )
  const nameOptions: ComboOption[] = useMemo(
    () => unregistered.map((d) => ({ value: d.code, label: d.name, sub: `${d.code} · ${d.address}`, badge })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unregistered],
  )
  const pick = (o: ComboOption) => {
    const d = unregistered.find((x) => x.code === o.value)
    if (d) applyDirectory(d)
  }

  /** Every field is required — a branch can't be saved half filled in. */
  const validate = () => {
    const f: Record<string, string> = {}
    if (!form.code.trim()) f.code = 'Branch code is required.'
    else if (!editMode && branches?.some((b) => b.code.toLowerCase() === form.code.trim().toLowerCase()))
      f.code = 'This branch is already registered. Use Edit on the Branches list instead.'
    if (!form.name.trim()) f.name = 'Branch name is required.'
    if (!form.address.trim()) f.address = 'Address is required.'
    if (!Number.isFinite(form.lat)) f.lat = 'Latitude is required.'
    if (!Number.isFinite(form.lng)) f.lng = 'Longitude is required.'
    if (!Number.isFinite(form.radius) || form.radius < 10 || form.radius > 2000) f.radius = 'Radius must be 10–2000 m.'
    if (!form.contactName.trim()) f.contactName = 'Contact name is required.'
    if (!form.contactMobile.trim()) f.contactMobile = 'Mobile number is required.'
    else if (!/^\+?[0-9 ]{7,}$/.test(form.contactMobile.trim())) f.contactMobile = 'Enter a valid mobile number, e.g. +95 9 123 456 789.'
    if (!form.contactEmail.trim()) f.contactEmail = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) f.contactEmail = 'Enter a valid email.'
    setErrors(f)
    return Object.keys(f).length === 0
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!validate()) {
      toast('Fill in every field to save the branch.', 'error')
      return
    }
    setBusy(true)
    try {
      if (targetId) await api.branches.update(targetId, form)
      else await api.branches.create(form)
      invalidate()
      toast(`${form.name} ${targetId ? 'updated' : 'registered'}.`)
      onClose()
    } catch (err) {
      const ae = err as ApiError
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  /** Flip Active/Inactive on the saved branch (other unsaved edits in the form are not applied). */
  const toggleActive = async () => {
    if (!targetId) return
    const saved = branches?.find((b) => b.id === targetId)
    const base: BranchInput = saved
      ? { code: saved.code, name: saved.name, address: saved.address, type: saved.type, lat: saved.lat, lng: saved.lng, radius: saved.radius, contactName: saved.contactName, contactMobile: saved.contactMobile, contactEmail: saved.contactEmail, active: saved.active }
      : form
    setBusy(true)
    try {
      await api.branches.update(targetId, { ...base, active: !base.active })
      invalidate()
      toast(`${base.name} ${base.active ? 'deactivated' : 'reactivated'}.`, base.active ? 'info' : 'success')
      setConfirmStatus(false)
      onClose()
    } catch (err) {
      toast((err as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const title = editMode ? 'Edit Branch' : 'Add Branch'

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          {targetId && form.type !== 'HQ' && (
            <Button variant={form.active ? 'danger-soft' : 'ghost'} className="sm:mr-auto" onClick={() => setConfirmStatus(true)}>
              {form.active ? 'Deactivate branch' : 'Reactivate branch'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy}>
            {targetId ? 'Save Changes' : 'Save Branch'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {!editMode && source === 'directory' && (
          <p className="rounded-[16px] bg-lime-28 px-3.5 py-3 text-[12px] font-semibold text-ink">
            Found {form.code} in the bank's branch directory. Check the pin and contact, then save to register it.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {editMode ? (
            <>
              <Input label="Branch Code" value={form.code} disabled hint="Codes can't change once registered." />
              <Input label="Branch Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
            </>
          ) : (
            <>
              <Combobox
                label="Branch Code"
                placeholder="Search or type a code, e.g. BR-006"
                value={form.code}
                onChange={(t) => onTyped('code', t.toUpperCase())}
                onSelect={pick}
                options={codeOptions}
                error={errors.code}
                required
                emptyText="Not in the directory — this will register a new branch code."
              />
              <Combobox
                label="Branch Name"
                placeholder="Start typing, e.g. Kamayut"
                value={form.name}
                onChange={(t) => onTyped('name', t)}
                onSelect={pick}
                options={nameOptions}
                filter={(o, q) => o.label.toLowerCase().includes(q)}
                error={errors.name}
                required
                emptyText="No matching branch — a new branch will be created."
              />
            </>
          )}
        </div>
        <Input
          label="Full Address"
          placeholder="Street, unit, postal code (the map follows as you type)"
          value={form.address}
          onChange={(e) => {
            set('address', e.target.value)
            setTypedAddress(e.target.value)
          }}
          error={errors.address}
          hint={
            lookup && (
              <span className={lookup.tone === 'warn' ? 'text-amber' : lookup.tone === 'ok' ? 'text-lime-dark' : 'text-ink-60'}>
                {lookup.text}
              </span>
            )
          }
          required
        />

        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-semibold text-ink-60">Map pinpicker — drag the pin or click the map; the address updates to match</p>
          <MapPinPicker lat={form.lat} lng={form.lng} radius={form.radius} onChange={onPinMoved} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Latitude" type="number" step="0.0001" value={Number.isFinite(form.lat) ? form.lat : ''} onChange={(e) => set('lat', parseFloat(e.target.value))} error={errors.lat} required />
          <Input label="Longitude" type="number" step="0.0001" value={Number.isFinite(form.lng) ? form.lng : ''} onChange={(e) => set('lng', parseFloat(e.target.value))} error={errors.lng} required />
        </div>
        <Input
          label="Handover radius (meters)"
          type="number"
          min={10}
          max={2000}
          value={Number.isFinite(form.radius) ? form.radius : ''}
          onChange={(e) => set('radius', parseInt(e.target.value, 10))}
          suffix="m"
          hint="Geo-fence used to validate on-site handover (the circle on the map)."
          error={errors.radius}
          required
        />

        <p className="flex items-center gap-1.5 text-[14px] font-bold text-violet">
          <IconSparkle className="size-3.5" /> Handover contact (OTP delivery)
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Contact name" placeholder="Full name" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} error={errors.contactName} required />
          <Input label="Mobile number" type="tel" placeholder="+95 …" value={form.contactMobile} onChange={(e) => set('contactMobile', e.target.value)} error={errors.contactMobile} required />
          <Input label="Email (OTP delivery)" type="email" placeholder="name@bank.com" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} error={errors.contactEmail} required />
        </div>
        {targetId && (
          <div className="flex items-center gap-2 text-[13px] text-ink-60">
            Status <StatusBadge status={form.active ? 'Active' : 'Inactive'} />
            {!form.active && <span className="text-[12px]">· not offered for new cash requests</span>}
          </div>
        )}
        <button type="submit" hidden />
      </form>

      <Modal
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        size="sm"
        title={form.active ? `Deactivate ${form.name}?` : `Reactivate ${form.name}?`}
        subtitle={
          form.active
            ? 'It stays in the list and its history is kept, but Makers can no longer choose it for new cash requests.'
            : 'Makers will be able to choose this branch for new cash requests again.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmStatus(false)}>
              Back
            </Button>
            <Button variant={form.active ? 'danger' : 'lime'} loading={busy} onClick={toggleActive}>
              {form.active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p className="text-[12px] text-ink-60">
          {form.code} · {form.address}
        </p>
      </Modal>
    </Modal>
  )
}
