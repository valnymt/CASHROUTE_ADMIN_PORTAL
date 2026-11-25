import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge, Card, ErrorBlock, FilterDropdown, LoadingBlock, statusTone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtAge } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { CashRequest, Team } from '@/types'
import LiveMap from '../../components/LiveMap'

type Filter = 'all' | 'transit' | 'stale'

export default function LiveMonitoring() {
  const { data: requests, error, reload } = useApi(() => api.requests.list(), [], { pollMs: 10_000 })
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const { data: liveTrips, error: liveTripsError, reload: reloadLiveTrips } =
    useApi(() => api.trips.live(), [], { pollMs: 3_000 })

  const { pathname } = useLocation()
  const [filter, setFilter] = useState<Filter>(() => pathname.endsWith('/stale-gps') ? 'stale' : 'all')
  const [selected, setSelected] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const selectedTrip = liveTrips?.find(trip => trip.id === selected) ?? null
  const { data: tracked, error: trackError, reload: reloadTrack } = useApi(async () => {
    const reference = selectedTrip?.id
    return { reference, points: reference ? await api.trips.track(reference) : [] }
  }, [selectedTrip?.id], { pollMs: selectedTrip ? 3_000 : undefined })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (liveTripsError) return <ErrorBlock error={liveTripsError} onRetry={reloadLiveTrips} />
  if (!requests || !branches || !teams || !liveTrips) return <LoadingBlock />

  const pingTimes = new Map(liveTrips.map(trip => [trip.id, trip.lastPingAt]))
  const isStale = (reference: string) => {
    const ping = pingTimes.get(reference)
    return !ping || now - Date.parse(ping) >= 120_000
  }
  const activeTrips = liveTrips.filter(trip => trip.status.toLowerCase() === 'in transit')
  const staleCount = activeTrips.filter(trip => isStale(trip.id)).length
  const mappedTrips = filter === 'all' ? liveTrips : activeTrips.filter(trip => (filter === 'stale') === isStale(trip.id))
  const latestPing = liveTrips.map(trip => trip.lastPingAt).filter((at): at is string => !!at).sort().at(-1)
  const branchShort = (id: string) => branches.find((b) => b.id === id)?.name.replace(' Branch', '').replace(' Cash Centre', '') ?? id

  return (
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,65fr)_minmax(300px,35fr)]">
      <Card padded={false} className="flex min-h-[420px] flex-col p-3.5 sm:p-[18px] lg:h-[calc(100dvh-122px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-1 pb-3">
          <div>
            <h2 className="text-[16px] font-bold text-ink">Live tracking</h2>
            <p className="text-[11px] text-ink-60">
              {activeTrips.length} in transit · {latestPing ? 'Last GPS ' + agoText(latestPing) : 'Waiting for GPS'}
            </p>
          </div>
          <FilterDropdown label="Map filter" value={filter} onChange={setFilter} defaultValue="all" options={[
            { value: 'all', label: 'All · ' + liveTrips.length },
            { value: 'transit', label: 'In Transit · ' + (activeTrips.length - staleCount) },
            { value: 'stale', label: 'Stale GPS · ' + staleCount },
          ]} />
        </div>
        <div className="h-[600px] w-full overflow-hidden rounded-[22px] border border-white/95">
          <LiveMap trips={mappedTrips} selectedTrip={selectedTrip}
            traveledPath={tracked?.reference === selectedTrip?.id ? tracked?.points ?? [] : []} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-2 text-[11px] text-ink-60">
          <span><b className="text-violet">Purple</b> · Recorded GPS trail</span>
          <span><b className="text-blue-700">Blue dashes</b> · Suggested road route</span>
          {selectedTrip && trackError && <button type="button" className="underline" onClick={reloadTrack}>Retry GPS trail</button>}
        </div>
      </Card>

      <Card padded={false} className="flex flex-col p-3.5 sm:p-[18px] lg:h-[calc(100dvh-122px)]">
        <h2 className="px-1 pb-3 text-[16px] font-bold text-ink">Live status ticker</h2>
        <Ticker requests={requests} teams={teams} pingTimes={pingTimes} isStale={isStale}
          filter={filter} selected={selected} onSelect={setSelected} branchShort={branchShort} />
      </Card>
    </div>
  )
}


function routeText(r: CashRequest, branchShort: (id: string) => string) {
  if (r.status === 'Pending') return 'awaiting approval'
  return r.type === 'Deposit' ? `${branchShort(r.branchId)} → HQ` : `HQ → ${branchShort(r.branchId)}`
}

function Ticker({
  requests,
  teams,
  pingTimes, isStale,
  filter,
  selected,
  onSelect,
  branchShort,
}: {
  requests: CashRequest[]
  teams: Team[]
  pingTimes: Map<string, string | null>
  isStale: (reference: string) => boolean
  filter: Filter
  selected: string | null
  onSelect: (id: string) => void
  branchShort: (id: string) => string
}) {
  const lastAt = (r: CashRequest) => pingTimes.get(r.id) ?? r.timeline[r.timeline.length - 1]?.at ?? r.createdAt
  const items = requests
    .filter((r) => ['In Transit', 'Assigned', 'Completed', 'Pending'].includes(r.status))
    .filter((r) => r.status !== 'Pending' || r === requests.find((x) => x.status === 'Pending'))
    .filter((r) => {
      const stale = r.status === 'In Transit' && isStale(r.id)
      if (filter === 'transit') return r.status === 'In Transit' && !stale
      if (filter === 'stale') return stale
      return true
    })
    .sort((a, b) => order(a) - order(b) || lastAt(b).localeCompare(lastAt(a)))

  if (items.length === 0) return <p className="py-10 text-center text-[12px] text-ink-60">Nothing matches this filter.</p>

  return (
    <ul className="-mx-1 min-h-0 flex-1 divide-y divide-ink-9 overflow-y-auto">
      {items.map((r) => {
        const team = teams.find((t) => t.id === r.teamId)
        const stale = r.status === 'In Transit' && isStale(r.id)
        const onMap = r.status === 'In Transit' || r.status === 'Assigned'
        const sub =
          r.status === 'Pending'
            ? `Created by ${r.timeline[0]?.by.replace(/(\w+) (\w)\w*/, '$1 $2.')}`
            : r.status === 'Assigned'
              ? `${team?.name ?? '—'} · awaiting departure`
              : `${team?.name ?? '—'} · ${routeText(r, branchShort)}`
        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-ink">{r.id}</p>
              <Badge tone={stale ? 'amber' : statusTone(r.status)}>{stale ? 'GPS Stale' : r.status}</Badge>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px]">
              <p className="truncate text-ink-60">{sub}</p>
              <p className="shrink-0 text-ink-38">{stale && !pingTimes.get(r.id) ? 'Awaiting GPS' : agoText(lastAt(r))}</p>
            </div>
          </>
        )
        const cls = cn(
          'block w-full rounded-[16px] px-3 py-2.5 text-left transition hover:bg-ink-4',
          stale && 'bg-danger-12 hover:bg-danger-12',
          selected === r.id && 'bg-periwinkle-18',
        )
        return (
          <li key={r.id} className="border-ink-9 px-1 py-0.5">
            {onMap ? (
              <button type="button" className={cls} onClick={() => onSelect(r.id)}>
                {body}
              </button>
            ) : (
              <Link to={r.status === 'Completed' ? `/reports/${r.id}` : `/approvals/${r.id}`} className={cls}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const order = (r: CashRequest) => ({ 'In Transit': 0, Assigned: 1, Completed: 1, Pending: 2 } as Record<string, number>)[r.status] ?? 3
const agoText = (iso: string) => {
  const a = fmtAge(iso)
  return a === 'just now' ? a : `${a} ago`
}
