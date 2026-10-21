import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconSparkle } from '@/components/icons'
import RequestTimeline from '@/components/RequestTimeline'
import { Avatar, Badge, Button, Card, Drawer, ErrorBlock, KeyValue, LoadingBlock, Modal, StatusBadge, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate, fmtDateTime, fmtMoney } from '@/lib/format'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi, useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { CashRequest, Team, User } from '@/types'

/**
 * AP-06 · Request Detail & Approval, AP-06 · Maker-Checker Block Guard,
 * AP-07 · Reject Reason (modal) and AP-07 · Team Assignment (drawer).
 */
export default function RequestDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, isChecker } = useAuth()
  const invalidate = useInvalidate()
  const toast = useToast()
  const { data: r, error, reload } = useApi(() => api.requests.get(id), [id])
  const { data: branches } = useApi(() => api.branches.list())
  const { data: users } = useApi(() => api.users.list())
  const { data: teams } = useApi(() => api.teams.list())

  const { pathname } = useLocation()
  // AP-07 overlays are part of the URL: /approvals/{id}/reject and /approvals/{id}/assign.
  const rejectOpen = pathname.endsWith('/reject')
  const assignOpen = pathname.endsWith('/assign')
  const setRejectOpen = (open: boolean) => navigate(open ? `/approvals/${id}/reject` : `/approvals/${id}`)
  const setAssignOpen = (open: boolean) => navigate(open ? `/approvals/${id}/assign` : `/approvals/${id}`)
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (error)
    return (
      <Card>
        <ErrorBlock error={error} onRetry={reload} />
        <div className="text-center">
          <Button variant="ghost" size="sm" to="/approvals">
            ← Back to list
          </Button>
        </div>
      </Card>
    )
  if (!r || !branches || !users || !teams) return <LoadingBlock />

  const branch = branches.find((b) => b.id === r.branchId)
  const hq = branches.find((b) => b.type === 'HQ')
  const creator = users.find((u) => u.id === r.createdBy)
  const mine = r.createdBy === user?.id
  const team = teams.find((t) => t.id === r.teamId)
  const canAct = r.status === 'Pending' && !mine && isChecker
  // A Checker can still call off an approved request until the team is on the road.
  const canCancel = isChecker && (r.status === 'Approved' || r.status === 'Assigned')

  // After a reject or cancel there's nothing left to do here — go back to the queue.
  const finish = (message: string) => {
    invalidate()
    toast(message, 'info')
    navigate('/approvals', { replace: true })
  }

  const approve = async () => {
    setBusy(true)
    try {
      await api.requests.approve(r.id)
      invalidate()
      toast(`${r.id} approved.`)
      setAssignOpen(true)
    } catch (e) {
      toast((e as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-ink sm:text-[22px]">
            {r.id} · {r.type}
          </h1>
          <p className="text-[12px] text-ink-60">{r.type === 'Deposit' ? 'Branch → HQ' : 'HQ → Branch'}</p>
        </div>
        <Button variant="ghost" size="sm" className="!py-2.5" onClick={() => navigate('/approvals')}>
          <IconArrowLeft className="size-4" /> Back to list
        </Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Request details">
          <KeyValue
            rows={[
              ['Type', `${r.type} (${r.type === 'Deposit' ? 'Branch → HQ' : 'HQ → Branch'})`],
              ['Pickup', r.type === 'Deposit' ? branch?.name : hq?.name],
              ['Drop-off', r.type === 'Deposit' ? hq?.name : branch?.name],
              ['Amount', fmtMoney(r.amount, r.currency)],
              ['Requested date', fmtDate(r.date)],
              ['Complete within', r.slot],
              ['Remarks', r.remarks || '—'],
              ['Created by', mine ? `${creator?.name} (you)` : `${creator?.name} (${creator?.role === 'Maker + Checker' ? 'Maker' : creator?.role})`],
              ['Created at', fmtDateTime(r.createdAt)],
              ...(team ? ([['Delivery team', team.name]] as [string, string][]) : []),
              ...(r.rejectReason ? ([['Reject reason', r.rejectReason]] as [string, string][]) : []),
              ...(r.cancelReason ? ([['Cancel reason', r.cancelReason]] as [string, string][]) : []),
            ]}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Approval">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-60">Status</span>
              {r.status === 'Pending' ? <Badge tone="violet">Pending approval</Badge> : <StatusBadge status={r.status} />}
            </div>
            <p className="mt-3 text-[11px] text-ink-60">
              Signed in as: {user?.name} · {isChecker ? 'Checker' : user?.role}
            </p>

            {r.status === 'Pending' && mine && (
              <p className="mt-3 rounded-[16px] bg-amber-16 px-3.5 py-3 text-[12px] font-semibold text-amber">
                Maker-Checker rule: you created this request, so you cannot approve or reject it.
              </p>
            )}
            {r.status === 'Pending' && !mine && !isChecker && (
              <p className="mt-3 rounded-[16px] bg-amber-16 px-3.5 py-3 text-[12px] font-semibold text-amber">
                Only users with the Checker role can approve or reject.
              </p>
            )}

            {r.status === 'Pending' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button onClick={approve} loading={busy} disabled={!canAct}>
                  Approve
                </Button>
                <Button variant="danger-soft" onClick={() => setRejectOpen(true)} disabled={!canAct}>
                  Reject
                </Button>
              </div>
            )}
            {r.status === 'Pending' && mine && (
              <p className="mt-3 inline-block rounded-[20px] bg-plum px-4 py-2 text-[12px] font-bold text-white">
                Another Checker must review your request
              </p>
            )}
            {r.status === 'Approved' && (
              <Button className="mt-4 w-full" onClick={() => setAssignOpen(true)}>
                Assign delivery team
              </Button>
            )}
            {(r.status === 'Assigned' || r.status === 'In Transit') && (
              <Button variant="ghost" className="mt-4 w-full" to="/live">
                Track on live map
              </Button>
            )}
            {canCancel && (
              <Button variant="danger-soft" className="mt-3 w-full" onClick={() => setCancelOpen(true)}>
                Cancel request
              </Button>
            )}
            {r.status === 'Delivered' && (
              <Button variant="ghost" className="mt-4 w-full" to={`/reports/${r.id}`}>
                View trip history
              </Button>
            )}
          </Card>

          <Card
            title={
              <span className="flex items-center gap-1.5">
                <IconSparkle className="size-3.5 text-violet" /> Timeline
              </span>
            }
          >
            <RequestTimeline request={r} />
          </Card>
        </div>
      </div>

      <ReasonModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${r.id}`}
        subtitle="The Maker will be notified. A reason is required."
        label="Reason for rejection"
        placeholder="Explain why this request is being rejected…"
        confirmLabel="Confirm reject"
        onConfirm={async (reason) => {
          await api.requests.reject(r.id, reason)
          finish(`${r.id} rejected — the Maker has been notified.`)
        }}
      />
      <ReasonModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel ${r.id}?`}
        subtitle={
          team
            ? `The approval is withdrawn and ${team.name} is released for other trips. A reason is required.`
            : 'The approval is withdrawn and the request will not be delivered. A reason is required.'
        }
        label="Reason for cancelling"
        placeholder="e.g. Branch postponed the pickup, amount changed…"
        confirmLabel="Cancel request"
        onConfirm={async (reason) => {
          await api.requests.cancel(r.id, reason)
          finish(`${r.id} cancelled.`)
        }}
      />
      <AssignDrawer open={assignOpen} request={r} teams={teams} users={users} onClose={() => setAssignOpen(false)} />
    </>
  )
}

/** Confirmation dialog that requires a written reason (used for Reject and Cancel). */
function ReasonModal({
  open,
  onClose,
  title,
  subtitle,
  label,
  placeholder,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  label: string
  placeholder: string
  confirmLabel: string
  onConfirm: (reason: string) => Promise<void>
}) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const empty = !reason.trim()
  const requiredMsg = 'Required — submission is blocked until a reason is entered.'

  const close = () => {
    setReason('')
    setTouched(false)
    onClose()
  }

  const confirm = async () => {
    setTouched(true)
    if (empty) return
    setBusy(true)
    try {
      await onConfirm(reason)
      setReason('')
      setTouched(false)
    } catch (e) {
      toast((e as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Back
          </Button>
          <Button variant={empty ? 'danger-soft' : 'danger'} onClick={confirm} loading={busy} aria-disabled={empty}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Textarea
        label={label}
        required
        autoFocus
        placeholder={placeholder}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && empty ? requiredMsg : undefined}
        hint={!touched ? requiredMsg : undefined}
        className="[&_textarea]:min-h-[110px]"
      />
    </Modal>
  )
}

function AssignDrawer({
  open,
  request,
  teams,
  users,
  onClose,
}: {
  open: boolean
  request: CashRequest
  teams: Team[]
  users: User[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const toast = useToast()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sorted = [...teams].sort((a, b) => Number(a.status !== 'Available') - Number(b.status !== 'Available'))
  const firstFree = sorted.find((t) => t.status === 'Available')?.id ?? null
  const chosen = teamId ?? firstFree

  const assign = async () => {
    if (!chosen) return
    setBusy(true)
    try {
      await api.requests.assign(request.id, chosen)
      invalidate()
      const t = teams.find((x) => x.id === chosen)
      toast(`${t?.name} assigned — push notification sent.`)
      onClose()
      navigate('/approvals')
    } catch (e) {
      toast((e as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const describe = (t: Team) => {
    const roles = t.memberIds.map((id) => users.find((u) => u.id === id)?.role)
    const d = roles.filter((r) => r === 'Driver').length
    const c = roles.filter((r) => r === 'Custodian').length
    return `${d} Driver${d === 1 ? '' : 's'} · ${c} Custodian${c === 1 ? '' : 's'}`
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Assign delivery team"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={assign} loading={busy} disabled={!chosen}>
            Assign & notify team
          </Button>
        </>
      }
    >
      <p className="rounded-[16px] border border-lime/60 bg-lime-28 px-3.5 py-3 text-[12px] font-semibold text-ink">
        ✓ {request.id} approved. Select an available team — a push notification is sent immediately.
      </p>
      <ul role="radiogroup" aria-label="Delivery team" className="mt-4 flex flex-col gap-3">
        {sorted.map((t) => {
          const free = t.status === 'Available'
          const on = chosen === t.id
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!free}
                onClick={() => setTeamId(t.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left transition',
                  on ? 'border-violet/50 bg-periwinkle-18 shadow-[0_0_0_3px_rgba(114,28,184,0.1)]' : 'border-white/95 bg-white/70 hover:bg-white',
                  !free && 'cursor-not-allowed opacity-45 hover:bg-white/70',
                )}
              >
                <span className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border-2', on ? 'border-violet' : 'border-ink-38')}>
                  {on && <span className="size-2 rounded-full bg-violet" />}
                </span>
                <span className="flex -space-x-2">
                  {t.memberIds.slice(0, 3).map((id) => (
                    <Avatar key={id} name={users.find((u) => u.id === id)?.name ?? '?'} size={26} />
                  ))}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[14px] font-bold text-ink">{t.name}</span>
                  <span className="block truncate text-[11px] text-ink-60">
                    {free ? describe(t) : `On trip — ${t.currentRequestId ?? ''}`}
                  </span>
                </span>
                <StatusBadge status={t.status} />
              </button>
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}
