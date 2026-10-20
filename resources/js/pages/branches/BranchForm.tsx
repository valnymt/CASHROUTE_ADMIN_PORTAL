import { useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { IconSparkle } from '@/components/icons'
import { Button, Input, Modal, Select, Toggle } from '@/components/ui'
import { api, ApiError, type BranchInput } from '@/services/api'
import { useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { Branch } from '@/types'

/** Bounds of the pin-picker map (Singapore metro). */
const BOUNDS = { minLat: 1.2, maxLat: 1.47, minLng: 103.6, maxLng: 104.05 }

export default function BranchForm({
  branch,
  defaultCode,
  onClose,
}: {
  branch: Branch | null
  defaultCode: string
  onClose: () => void
}) {
  const invalidate = useInvalidate()
  const toast = useToast()
  const [form, setForm] = useState<BranchInput>(
    branch ?? {
      code: defaultCode,
      name: '',
      address: '',
      type: 'Branch',
      lat: 1.3048,
      lng: 103.8318,
      radius: 150,
      contactName: '',
      contactMobile: '',
      contactEmail: '',
      active: true,
    },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof BranchInput>(k: K, v: BranchInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => {
      const next = { ...e }
      delete next[k]
      return next
    })
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    try {
      if (branch) await api.branches.update(branch.id, form)
      else await api.branches.create(form)
      invalidate()
      toast(`${form.name} ${branch ? 'updated' : 'registered'}.`)
      onClose()
    } catch (err) {
      const ae = err as ApiError
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={branch ? 'Edit Branch' : 'Add Branch'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy}>
            Save Branch
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Branch Code" value={form.code} onChange={(e) => set('code', e.target.value)} error={errors.code} required />
          <Input label="Branch Name" placeholder="e.g. Clementi Branch" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input label="Full Address" placeholder="Street, unit, postal code" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} required />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set('type', e.target.value as Branch['type'])}
            options={[
              { value: 'Branch', label: 'Branch' },
              { value: 'HQ', label: 'HQ' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-semibold text-ink-60">Map pinpicker — drag pin to set location</p>
          <PinPicker lat={form.lat} lng={form.lng} radius={form.radius} onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Latitude" type="number" step="0.0001" value={form.lat} onChange={(e) => set('lat', parseFloat(e.target.value))} error={errors.lat} />
          <Input label="Longitude" type="number" step="0.0001" value={form.lng} onChange={(e) => set('lng', parseFloat(e.target.value))} error={errors.lng} />
        </div>
        <Input
          label="Handover radius (meters)"
          type="number"
          min={10}
          max={2000}
          value={Number.isFinite(form.radius) ? form.radius : ''}
          onChange={(e) => set('radius', parseInt(e.target.value, 10))}
          suffix="m"
          hint="Geo-fence used to validate on-site handover."
          error={errors.radius}
        />

        <p className="flex items-center gap-1.5 text-[14px] font-bold text-violet">
          <IconSparkle className="size-3.5" /> Handover contact (OTP delivery)
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Contact name" placeholder="Full name" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
          <Input label="Mobile number" type="tel" placeholder="+95 …" value={form.contactMobile} onChange={(e) => set('contactMobile', e.target.value)} />
          <Input label="Email (OTP delivery)" type="email" placeholder="name@bank.com" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} error={errors.contactEmail} />
        </div>
        <Toggle checked={form.active} onChange={(v) => set('active', v)} label={form.active ? 'Active' : 'Inactive'} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function PinPicker({
  lat,
  lng,
  radius,
  onChange,
}: {
  lat: number
  lng: number
  radius: number
  onChange: (lat: number, lng: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const x = clamp(((Number.isFinite(lng) ? lng : 103.83) - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng))
  const y = clamp((BOUNDS.maxLat - (Number.isFinite(lat) ? lat : 1.3)) / (BOUNDS.maxLat - BOUNDS.minLat))
  const ring = Math.min(120, Math.max(36, (Number.isFinite(radius) ? radius : 150) / 2.5))

  const move = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const nx = clamp((e.clientX - r.left) / r.width)
    const ny = clamp((e.clientY - r.top) / r.height)
    onChange(
      +(BOUNDS.maxLat - ny * (BOUNDS.maxLat - BOUNDS.minLat)).toFixed(4),
      +(BOUNDS.minLng + nx * (BOUNDS.maxLng - BOUNDS.minLng)).toFixed(4),
    )
  }

  return (
    <div
      ref={ref}
      className="relative h-[180px] w-full touch-none overflow-hidden rounded-[20px] border border-white/95 select-none sm:w-[420px]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 10% 10%, rgba(150,215,76,0.35), transparent 30%), radial-gradient(circle at 75% 80%, rgba(124,131,255,0.35), transparent 35%), linear-gradient(rgba(114,28,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(114,28,184,0.06) 1px, transparent 1px), linear-gradient(135deg, #eef3ff, #f4eeff)',
        backgroundSize: 'auto, auto, 18px 18px, 18px 18px, auto',
      }}
      onPointerDown={(e) => {
        dragging.current = true
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={() => (dragging.current = false)}
      role="application"
      aria-label="Drag to set branch location"
    >
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet/60 bg-violet/15"
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: ring, height: ring }}
      />
      <div
        className="absolute size-[14px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white bg-plum shadow-[0_2px_8px_rgba(66,24,105,0.4)] active:cursor-grabbing"
        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      />
    </div>
  )
}
