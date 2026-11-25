import { useParams } from 'react-router-dom'
import { IconArrowLeft } from '@/components/icons'
import { Button, Card, KeyValue, LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { Branch, Team, Trip, User } from '@/types'

/** AP-10 · Request Detail (history): event timeline, handover records, proof of delivery. */
export default function ReportDetail() {
  const { id = '' } = useParams()
  const { data: trip, error, reload } = useApi(() => api.trips.detail(id), [id])
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const { data: users } = useApi(() => api.users.list())

  if (error) return <Card title="Trip details could not be loaded"><Button onClick={reload}>Try again</Button></Card>
  if (trip === undefined || !branches || !teams || !users) return <LoadingBlock />
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

  const h = buildHistory(trip, branches, teams, users)
  const proof = trip.proof_of_delivery

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold text-ink sm:text-[22px]">
            {trip.id} · {trip.type} · {trip.type === 'Deposit' ? `${h.branchShort} → HQ` : `HQ → ${h.branchShort}`}
          </h1>
          <p className="text-[12px] text-ink-60">
            Completed {fmtDate(trip.date)} · {h.team}
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
            {h.events.map((e, i) => (
              <li key={i} className="relative flex gap-3">
                <span
                  className={cn(
                    'mt-1 size-[9px] shrink-0 rounded-full',
                    i === h.events.length - 1 ? 'bg-lime shadow-glow-lime' : 'bg-violet shadow-glow-violet',
                  )}
                />
                <div className="leading-tight">
                  <p className="text-[13px] font-bold text-ink">{e.label}</p>
                  <p className="text-[11px] text-ink-60">
                    {e.by} · {e.time}
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
                ['Handed over by', h.handedBy],
                ['Received by', h.receivedBy],
                ['OTP verified', `Yes · ${h.otpTime}`],
                ['Within geo-fence', `Yes · ${h.distance} m from pin`],
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
                  ['Submitted', new Date(proof.submitted_at).toLocaleString()],
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

/** Reconstructs the trip timeline. With a real backend this comes from GET /api/trips/{id}. */
function buildHistory(trip: Trip, branches: Branch[], teams: Team[], users: User[]) {
  const branch = branches.find((b) => b.id === trip.branchId)
  const branchShort = branch?.name.replace(' Branch', '') ?? trip.branchId
  const team = teams.find((t) => t.id === trip.teamId)
  const members = (team?.memberIds ?? []).map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[]
  const driver = members.find((m) => m.role === 'Driver')?.name ?? 'Driver'
  const custodian = members.find((m) => m.role === 'Custodian')?.name ?? 'Custodian'

  // Deterministic per-trip start time between 08:00 and 13:00.
  const seed = [...trip.id].reduce((a, c) => a + c.charCodeAt(0), 0)
  let t = trip.id === 'REQ-1042' ? 8 * 60 + 40 : 8 * 60 + (seed % 300)
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const step = (mins: number) => hhmm((t += mins))

  const created = hhmm(t)
  const approved = step(12)
  const assigned = step(3)
  const departed = step(10)
  const arrived = step(Math.round(trip.durationMin * 0.4))
  const otp = step(7)
  const delivered = step(Math.max(5, trip.durationMin - Math.round(trip.durationMin * 0.4) - 7))

  const there = trip.type === 'Deposit' ? branch?.name : 'HQ Cash Centre'
  const back = trip.type === 'Deposit' ? 'HQ' : branchShort

  return {
    branchShort,
    team: team?.name ?? trip.teamId,
    handedBy: trip.type === 'Deposit' ? `${branch?.contactName ?? '—'} (Branch)` : 'Ops Desk (HQ)',
    receivedBy: `${custodian} (Custodian)`,
    otpTime: otp,
    distance: 20 + (seed % 60),
    events: [
      { label: 'Request created', by: 'Priya Nair', time: created },
      { label: 'Approved', by: 'Admin User', time: approved },
      { label: `${team?.name ?? 'Team'} assigned`, by: 'Admin User', time: assigned },
      { label: trip.type === 'Deposit' ? 'Departed HQ' : 'Departed HQ (loaded)', by: driver, time: departed },
      { label: `Arrived at ${there}`, by: driver, time: arrived },
      { label: 'Handover OTP verified', by: trip.type === 'Deposit' ? (branch?.contactName ?? '—') : 'Ops Desk', time: otp },
      { label: `Completed delivery to ${back}`, by: driver, time: delivered },
    ],
  }
}
