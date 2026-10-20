import { useParams } from 'react-router-dom'
import { IconArrowLeft, IconSparkle } from '@/components/icons'
import RequestTimeline from '@/components/RequestTimeline'
import { Button, Card, ErrorBlock, KeyValue, LoadingBlock, StatusBadge } from '@/components/ui'
import { fmtDate, fmtDateTime, fmtMoney } from '@/lib/format'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'

/** One cash request's summary — where a Maker lands after submitting. */
export default function RequestShow() {
  const { id = '' } = useParams()
  const { user, isChecker } = useAuth()
  const { data: r, error, reload } = useApi(() => api.requests.get(id), [id])
  const { data: branches } = useApi(() => api.branches.list())
  const { data: users } = useApi(() => api.users.list())
  const { data: teams } = useApi(() => api.teams.list())

  if (error)
    return (
      <Card>
        <ErrorBlock error={error} onRetry={reload} />
        <div className="text-center">
          <Button variant="ghost" size="sm" to="/requests">
            ← Back to all requests
          </Button>
        </div>
      </Card>
    )
  if (!r || !branches || !users || !teams) return <LoadingBlock />

  const branch = branches.find((b) => b.id === r.branchId)?.name ?? r.branchId
  const hq = branches.find((b) => b.type === 'HQ')?.name ?? 'HQ'
  const mine = r.createdBy === user?.id
  const maker = users.find((u) => u.id === r.createdBy)?.name ?? r.createdBy
  const team = teams.find((t) => t.id === r.teamId)?.name

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-ink sm:text-[22px]">
            {r.id} · {r.type}
          </h1>
          <p className="text-[12px] text-ink-60">Created {fmtDateTime(r.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {r.status === 'Pending' && !mine && isChecker && (
            <Button size="sm" className="!py-2.5" to={`/approvals/${r.id}`}>
              Review in Approvals
            </Button>
          )}
          <Button variant="ghost" size="sm" className="!py-2.5" to="/requests">
            <IconArrowLeft className="size-4" /> Back to all requests
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Request summary">
          <KeyValue
            rows={[
              ['Direction', r.type],
              ['Pickup', r.type === 'Deposit' ? branch : hq],
              ['Drop-off', r.type === 'Deposit' ? hq : branch],
              ['Amount', fmtMoney(r.amount, r.currency)],
              ['Requested for', `${fmtDate(r.date)} · ${r.slot}`],
              ['Remarks', r.remarks || '—'],
              ['Maker', mine ? `${maker} (you)` : maker],
              ...(team ? ([['Delivery team', team]] as [string, string][]) : []),
              ...(r.rejectReason ? ([['Reject reason', r.rejectReason]] as [string, string][]) : []),
              ['Status', <StatusBadge key="s" status={r.status} />],
            ]}
          />
          {mine && r.status === 'Pending' && (
            <p className="mt-4 rounded-[16px] bg-amber-16 px-3.5 py-3 text-[11px] font-semibold text-amber">
              Maker-Checker: you cannot approve a request you created.
            </p>
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
    </>
  )
}
