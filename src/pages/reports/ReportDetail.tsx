import { Link, useLocation, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@/components/icons'
import { Badge, ErrorBlock, LoadingBlock, statusTone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate, fmtMoney, fmtTimeSec } from '@/lib/format'
import { api } from '@/services/api'
import { LIVE_STATUS_OPTIONS, useApi } from '@/store/data'

const panel = 'min-w-0 rounded-2xl border border-ink-9 bg-white/85 p-5 sm:p-6'
const heading = 'mb-4 text-base font-bold text-ink'

export default function ReportDetail() {
  const { id = '' } = useParams()
  const { state } = useLocation()
  const historyPath = typeof state?.historySearch === 'string' && state.historySearch.startsWith('?')
    ? { pathname: '/history', search: state.historySearch }
    : '/history'
  const { data: trip, error, reload } = useApi(() => api.trips.detail(id), [id], LIVE_STATUS_OPTIONS)
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list(), [], LIVE_STATUS_OPTIONS)

  const backLink = (
    <Link to={historyPath} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink/75 hover:bg-white/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet">
      <IconArrowLeft className="size-4" /> Back to trip history
    </Link>
  )

  if (error) return <>{backLink}<ErrorBlock error={error} onRetry={reload} /></>
  if (trip === undefined) return <>{backLink}<LoadingBlock /></>
  if (!trip) return <>{backLink}<p className={panel}>No trip found for {id.toUpperCase()}.</p></>

  const branch = branches?.find(item => item.id === trip.branchId)?.name ?? trip.branchId
  const pickup = trip.pickup?.name ?? (trip.type === 'Deposit' ? branch : 'HQ')
  const dropoff = trip.dropoff?.name ?? (trip.type === 'Deposit' ? 'HQ' : branch)
  const roster = trip.teamRoster
  const team = roster?.team_name ?? teams?.find(item => item.id === trip.teamId)?.name ?? trip.teamId
  const events = trip.timeline ?? []
  const proof = trip.proof_of_delivery
  const status = trip.status ?? 'Completed'
  const duration = (trip.startedAt && trip.completedAt) || trip.durationMin > 0
    ? `${trip.durationMin} min`
    : 'Not recorded'

  return (
    <>
      <header className="flex flex-col gap-2">
        {backLink}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{trip.id}</h2>
          <Badge tone={statusTone(status)}>{status}</Badge>
          <span className="text-sm font-medium text-ink/75">{trip.type}</span>
        </div>
      </header>

      <section className={panel} aria-labelledby="trip-details-title">
        <h3 id="trip-details-title" className={heading}>Trip details</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 gap-3">
            <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-violet" />
            <div className="min-w-0">
              <dt className="text-xs font-medium text-ink/75">Pickup</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink">{pickup}</dd>
              {trip.pickup?.address && <dd className="mt-1 text-sm text-ink/75">{trip.pickup.address}</dd>}
            </div>
          </div>
          <div className="flex min-w-0 gap-3">
            <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-violet" />
            <div className="min-w-0">
              <dt className="text-xs font-medium text-ink/75">Drop-off</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink">{dropoff}</dd>
              {trip.dropoff?.address && <dd className="mt-1 text-sm text-ink/75">{trip.dropoff.address}</dd>}
            </div>
          </div>
        </dl>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-9 pt-4 sm:grid-cols-3">
          <Detail label="Delivery team" value={team ?? 'Unassigned'} />
          <Detail label="Requested amount" value={fmtMoney(trip.amount, trip.currency)} />
          <Detail label="Duration" value={duration} />
        </dl>

        <div className="mt-5 border-t border-ink-9 pt-4">
          <h4 className="text-sm font-bold text-ink">Team members at assignment</h4>
          {roster?.members.length ? (
            <ul className="mt-2 divide-y divide-ink-9">
              {roster.members.map(member => (
                <li key={member.employee_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-ink">{member.name}</p>
                    <p className="text-xs text-ink/75">{[member.role, member.employee_id].filter(Boolean).join(' · ')}</p>
                  </div>
                  {member.is_leader && <Badge tone="periwinkle">Team lead</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink/75">No roster was recorded for this assignment.</p>
          )}
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className={panel} aria-labelledby="trip-timeline-title">
          <h3 id="trip-timeline-title" className={heading}>Event timeline</h3>
          {events.length === 0 && <p className="text-sm text-ink/75">No trip events recorded.</p>}
          <ol className="ml-1">
            {events.map((event) => (
              <li key={event.kind ?? event.label} className="relative border-l border-ink-9 pb-5 pl-5 last:border-transparent last:pb-0">
                <span aria-hidden className={cn(
                  'absolute -left-[5px] top-1.5 size-[9px] rounded-full',
                  event.kind === 'completed' ? 'bg-lime' : 'bg-violet',
                )} />
                <p className="text-sm font-semibold text-ink">{event.label}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink/75">
                  <span>{event.actor ?? 'Actor not recorded'}</span>
                  <time dateTime={event.at} className="tabular-nums">{formatTimestamp(event.at)}</time>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={panel} aria-labelledby="trip-proof-title">
          <h3 id="trip-proof-title" className={heading}>Proof of delivery</h3>
          {proof ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label="Receiver" value={proof.receiver_name || 'Not recorded'} />
                <Detail label="Confirmed amount" value={fmtMoney(Number(proof.confirmed_amount), trip.currency)} />
                <Detail label="Submitted by" value={proof.submitted_by ?? 'Actor not recorded'} />
                <Detail label="Submitted" value={formatTimestamp(proof.submitted_at)} />
              </dl>
              {(proof.photo_ids.length > 0 || proof.has_signature) && (
                <div className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  {proof.photo_ids.map((photo, index) => (
                    <ProofImage key={photo} reference={trip.id} image={photo} label={proof.photo_ids.length === 1 ? 'Delivery photo' : `Delivery photo ${index + 1}`} />
                  ))}
                  {proof.has_signature && <ProofImage reference={trip.id} image="signature" label="Receiver signature" />}
                </div>
              )}
            </>
          ) : <p className="text-sm text-ink/75">No proof of delivery has been recorded.</p>}
        </section>
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink/75">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function ProofImage({ reference, image, label }: { reference: string; image: number | 'signature'; label: string }) {
  const url = api.trips.proofImageUrl(reference, image)
  return (
    <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label.toLowerCase()} in a new tab`}
      className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-violet">
      <img className="aspect-[4/3] w-full rounded-xl border border-ink-9 bg-white object-contain"
        src={url} crossOrigin="use-credentials" alt="" loading="lazy" />
      <span className="mt-2 block text-xs font-medium text-ink group-hover:underline">{label}</span>
    </a>
  )
}

function formatTimestamp(value: string) {
  return fmtDate(value) + ' · ' + fmtTimeSec(value)
}
