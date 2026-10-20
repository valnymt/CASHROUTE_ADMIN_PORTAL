import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ErrorBlock, Input, LoadingBlock, PageHeader, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { isoDay } from '@/lib/format'
import { api, ApiError, type RequestInput } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi, useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { Currency, Direction } from '@/types'

const SLOTS = ['08:00 – 10:00', '09:00 – 11:00', '10:00 – 12:00', '13:00 – 15:00', '14:00 – 16:00', '15:00 – 17:00']
const CURRENCIES: Currency[] = ['MMK', 'SGD', 'USD']
const HQ_ID = 'HQ-001'

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoDay(d)
}

/**
 * AP-04/05 · Unified Request Creation (Maker workspace).
 * Also the edit form for a Maker's own pending request: /requests/{id}/edit.
 */
export default function NewRequest() {
  const { id } = useParams()
  const editing = !!id
  const { user, isMaker } = useAuth()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const toast = useToast()
  const { data: branches, error, reload } = useApi(() => api.branches.list())
  const { data: existing, error: loadError } = useApi(() => (id ? api.requests.get(id) : Promise.resolve(null)), [id])

  const blank = (): RequestInput & { amountText: string } => ({
    type: 'Deposit',
    branchId: 'BR-001',
    amount: 0,
    amountText: '',
    currency: 'MMK',
    date: tomorrow(),
    slot: '10:00 – 12:00',
    remarks: '',
  })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Edit mode: fill the form from the saved request once it loads.
  useEffect(() => {
    if (!existing) return
    setForm({
      type: existing.type,
      branchId: existing.branchId,
      amount: existing.amount,
      amountText: existing.amount.toLocaleString('en-US'),
      currency: existing.currency,
      date: existing.date,
      slot: existing.slot,
      remarks: existing.remarks,
    })
  }, [existing])

  const branchOptions = useMemo(
    () =>
      (branches ?? [])
        .filter((b) => b.type === 'Branch')
        .map((b) => ({ value: b.id, label: `${b.name} (${b.code})${b.active ? '' : ' — inactive'}`, disabled: !b.active })),
    [branches],
  )

  if (error || loadError) return <ErrorBlock error={(error ?? loadError)!} onRetry={reload} />
  if (!branches || (editing && !existing)) return <LoadingBlock />

  // Only the Maker who created a request may edit it, and only while it's Pending.
  const editBlocked =
    editing && existing
      ? existing.createdBy !== user?.id
        ? `Only the Maker who created ${existing.id} can edit it.`
        : existing.status !== 'Pending'
          ? `${existing.id} is ${existing.status.toLowerCase()} and can no longer be edited.`
          : null
      : null

  const name = (id: string) => branches.find((b) => b.id === id)?.name ?? '—'
  const pickup = form.type === 'Deposit' ? name(form.branchId) : name(HQ_ID)
  const dropoff = form.type === 'Deposit' ? name(HQ_ID) : name(form.branchId)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => {
      const next = { ...e }
      delete next[k as string]
      return next
    })
  }

  const onAmount = (raw: string) => {
    const clean = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    const [int = '', dec] = clean.split('.')
    const pretty = int ? Number(int).toLocaleString('en-US') + (dec !== undefined ? `.${dec.slice(0, 2)}` : '') : dec !== undefined ? `0.${dec}` : ''
    setForm((f) => ({ ...f, amountText: pretty, amount: parseFloat(clean) || 0 }))
    setErrors(({ amount: _a, ...rest }) => rest)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { amountText: _t, ...payload } = form
      const r = editing ? await api.requests.update(id!, payload) : await api.requests.create(payload)
      invalidate()
      toast(editing ? `${r.id} updated.` : `${r.id} submitted — a Checker has been notified.`)
      navigate(`/requests/${r.id}`)
    } catch (err) {
      const ae = err as ApiError
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={editing ? `Edit ${existing?.id}` : 'Unified Request Creation'}
        subtitle={
          editing
            ? 'Changes are saved to the same request; it stays Pending for the Checker'
            : 'Maker workspace — submitted requests go to a Checker for approval'
        }
        actions={
          <Button variant="ghost" to={editing ? `/requests/${id}` : '/requests'}>
            {editing ? '← Back to request' : 'View all requests'}
          </Button>
        }
      />

      {editBlocked && (
        <div className="rounded-[18px] bg-amber-16 px-4 py-3 text-[12px] font-semibold text-amber">{editBlocked}</div>
      )}

      {!isMaker && (
        <div className="rounded-[18px] bg-amber-16 px-4 py-3 text-[12px] font-semibold text-amber">
          Your role ({user?.role}) can review requests but not create them.
        </div>
      )}

      <Card title="Request details">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-ink-60">Direction</span>
            <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-[24px] bg-ink-6 p-1">
              {(['Deposit', 'Withdrawal'] as Direction[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={form.type === d}
                  onClick={() => set('type', d)}
                  className={cn(
                    'rounded-[20px] px-3 py-2.5 text-[12px] font-bold transition sm:text-[13px]',
                    form.type === d ? 'bg-gradient-to-r from-violet to-violet-2 text-white shadow-violet' : 'text-ink-60 hover:text-ink',
                  )}
                >
                  {d}
                  <span className="hidden font-semibold sm:inline">  {d === 'Deposit' ? '(Branch → HQ)' : '(HQ → Branch)'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Branch" value={form.branchId} onChange={(e) => set('branchId', e.target.value)} options={branchOptions} error={errors.branchId} />
            <Input label="Pickup (auto)" value={pickup} readOnly tabIndex={-1} className="[&_input]:bg-ink-6" />
            <Input label="Drop-off (auto)" value={dropoff} readOnly tabIndex={-1} className="[&_input]:bg-ink-6" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Input label="Amount" inputMode="decimal" placeholder="0.00" value={form.amountText} onChange={(e) => onAmount(e.target.value)} error={errors.amount} required />
            <Select label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Requested date" type="date" min={isoDay(new Date())} value={form.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
            <Select label="Time slot" value={form.slot} onChange={(e) => set('slot', e.target.value)} options={SLOTS.map((s) => ({ value: s, label: s }))} error={errors.slot} />
          </div>

          <Textarea label="Remarks" placeholder="Add any notes for the checker or delivery team…" value={form.remarks} maxLength={500} onChange={(e) => set('remarks', e.target.value)} />

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => (editing ? navigate(`/requests/${id}`) : setForm(blank()))}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!isMaker || !!editBlocked}>
              {editing ? 'Save changes' : 'Submit for approval'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
