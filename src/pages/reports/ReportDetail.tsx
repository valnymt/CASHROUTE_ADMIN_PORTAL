import { useParams } from 'react-router-dom'
import { IconArrowLeft } from '@/components/icons'
import { Button, Card, KeyValue, LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate, fmtTimeSec } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'


/** AP-10 · Request Detail (history): event timeline, handover records, proof of delivery. */
export default function ReportDetail() {
  const { id = '' } = useParams()
  const { data: trip, error, reload } = useApi(() => api.trips.detail(id), [id])
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())


  if (error) return <Card title="Trip details could not be loaded"><Button onClick={reload}>Try again</Button></Card>
  if (trip === undefined || !branches || !teams) return <LoadingBlock />
  if (!trip)
    return (
      <Card className="text-center">
        <p className="py-6 text-[14px] font-bold text-ink">No completed trip found for {id.toUpperCase()}.</p>
        <p className="mb-5 text-[12px] text-ink-60">It may still be in progress — check Approvals or Live Monitoring.</p>
        <Button variant="ghost" size="sm" to="/history">
          ← Back to trip history
        </Button>
      </Card>
    )

  const branchName = branches.find(branch => branch.id === trip.branchId)?.name ?? trip.branchId
  const pickup = trip.pickup?.name ?? (trip.type === 'Deposit' ? branchName : 'HQ')
  const dropoff = trip.dropoff?.name ?? (trip.type === 'Deposit' ? 'HQ' : branchName)
  const team = teams.find(item => item.id === trip.teamId)?.name ?? trip.teamId
  const events = trip.timeline ?? []
  const proof = trip.proof_of_delivery

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold text-ink sm:text-[22px]">
            {trip.id} · {trip.type} · {pickup} → {dropoff}
          </h1>
          <p className="text-[12px] text-ink-60">
            Completed {trip.completedAt ? formatTimestamp(trip.completedAt) : fmtDate(trip.date)} · {team}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="!py-2.5" to="/history">
          <IconArrowLeft className="size-4" /> Back to trip history
        </Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="Event timeline">
          <ol className="relative flex flex-col gap-3.5">
            <span aria-hidden className="absolute top-2 bottom-2 left-[4px] w-px bg-ink-9" />
            {events.length === 0 && <li className="text-[12px] text-ink-60">No trip events recorded.</li>}
            {events.map((e, i) => (
              <li key={e.label} className="relative flex gap-3">
                <span
                  className={cn(
                    'mt-1 size-[9px] shrink-0 rounded-full',
                    i === events.length - 1 ? 'bg-lime shadow-glow-lime' : 'bg-violet shadow-glow-violet',
                  )}
                />
                <div className="leading-tight">
                  <p className="text-[13px] font-bold text-ink">{e.label}</p>
                  <p className="text-[11px] text-ink-60">
                    {formatTimestamp(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Handover records">
            <KeyValue
              rows={[
                ['Pickup arrival', trip.arrivedPickupAt ? formatTimestamp(trip.arrivedPickupAt) : 'Not recorded'],
                ['Pickup OTP verified', trip.pickupVerifiedAt ? formatTimestamp(trip.pickupVerifiedAt) : 'Not recorded'],
                ['Drop-off arrival', trip.arrivedDropoffAt ? formatTimestamp(trip.arrivedDropoffAt) : 'Not recorded'],
                ['Drop-off OTP verified', trip.dropoffVerifiedAt ? formatTimestamp(trip.dropoffVerifiedAt) : 'Not recorded'],
                ['Duration', `${trip.durationMin} min · ${trip.onTime ? 'On time' : 'Late'}`],
              ]}
            />
          </Card>
          <Card title="Proof of delivery">
            {proof ? (
              <>
                <KeyValue rows={[
                  ['Confirmed amount', `${trip.currency} ${Number(proof.confirmed_amount).toLocaleString()}`],
                  ['Receiver', proof.receiver_name || '—'],
                  ['Submitted', formatTimestamp(proof.submitted_at)],
                ]} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {proof.photo_ids.map((photo, index) => (
                    <ProofImage key={photo} reference={trip.id} image={photo} label={`Delivery photo ${index + 1}`} />
                  ))}
                  {proof.has_signature && <ProofImage reference={trip.id} image="signature" label="Receiver signature" />}
                </div>
              </>
            ) : <p className="text-[12px] text-ink-60">No proof of delivery has been recorded.</p>}
          </Card>
        </div>
      </div>
    </>
  )
}

function ProofImage({ reference, image, label }: { reference: string; image: number | 'signature'; label: string }) {
  return (
    <img
      className="w-full rounded-[20px] bg-ink-6 object-contain"
      src={api.trips.proofImageUrl(reference, image)}
      crossOrigin="use-credentials"
      alt={label}
    />
  )
}

function formatTimestamp(value: string) {
  return fmtDate(value) + ' · ' + fmtTimeSec(value)
}
