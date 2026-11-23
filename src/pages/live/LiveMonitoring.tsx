import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Card, ErrorBlock, FilterDropdown, LoadingBlock, statusTone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtAge } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { Branch, CashRequest, Team } from '@/types'
import LiveMap from '../../components/LiveMap';

/** Map positions (0–100 % of the canvas) for each branch, laid out like the Figma map. */
const POS: Record<string, [number, number]> = {
  'BR-001': [19, 18],
  'BR-002': [64, 24],
  'BR-003': [43, 46],
  'BR-004': [29, 68],
  'BR-005': [11, 50],
  'HQ-001': [81, 64],
}
const HQ = POS['HQ-001']!
const STALE_TEAM = 'T-B'
const STALE_MIN = 6

type Filter = 'all' | 'transit' | 'stale'

export default function LiveMonitoring() {
  const { data: requests, error, reload } = useApi(() => api.requests.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const { data: liveTrips, error: liveTripsError, reload: reloadLiveTrips, } = useApi(() => api.trips.live())

  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // AP-08 · Stale GPS Warning is its own URL: /live/stale-gps
  const staleDemo = pathname.endsWith('/stale-gps')
  const setStaleDemo = (on: boolean) => navigate(on ? '/live/stale-gps' : '/live')
  const [selected, setSelected] = useState<string | null>(null)
  const selectedTrip = liveTrips?.find((trip) => trip.id === selected) ?? null
  const [progress, setProgress] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(Date.now())
  const [, forceTick] = useState(0)

  const reloadLiveTripsRef = useRef(reloadLiveTrips)

  useEffect(() => {
    reloadLiveTripsRef.current = reloadLiveTrips
  }, [reloadLiveTrips])

  useEffect(() => {
    let active = true

    const poll = async () => {
      try {
        await reloadLiveTripsRef.current()
        if (active) setUpdatedAt(Date.now())
      } catch (err) {
        console.error('Live trips refresh failed:', err)
      }
    }

    void poll() // Fetch once immediately
    const timer = setInterval(() => void poll(), 3000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])
  // Simulated GPS feed: in-transit teams creep toward their destination.
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => Math.min(p + 0.01, 0.6))
      setUpdatedAt(Date.now())
    }, 3000)
    const clock = setInterval(() => forceTick((x) => x + 1), 15000)
    return () => {
      clearInterval(t)
      clearInterval(clock)
    }
  }, [])

  const vehicles = useMemo(() => {
    if (!requests) return []
    return requests
      .filter((r) => (r.status === 'In Transit' || r.status === 'Assigned') && r.teamId)
      .map((r) => {
        const from = POS[r.type === 'Deposit' ? r.branchId : 'HQ-001'] ?? HQ
        const to = POS[r.type === 'Deposit' ? 'HQ-001' : r.branchId] ?? HQ
        const stale = staleDemo && r.teamId === STALE_TEAM
        const k = r.status === 'In Transit' && !stale ? progress : 0
        const start = r.status === 'Assigned' ? (POS[r.branchId] ?? HQ) : from
        return {
          r,
          stale,
          x: start[0] + (to[0] - start[0]) * k,
          y: start[1] + (to[1] - start[1]) * k,
        }
      })
  }, [requests, staleDemo, progress])

  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (liveTripsError) {
    return <ErrorBlock error={liveTripsError} onRetry={reloadLiveTrips} />
  }
  if (!requests || !branches || !teams) return <LoadingBlock />

  const branchShort = (id: string) => branches.find((b) => b.id === id)?.name.replace(' Branch', '').replace(' Cash Centre', '') ?? id
  const staleCount = staleDemo ? vehicles.filter((v) => v.stale).length : 0

  return (
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,65fr)_minmax(300px,35fr)]">
      <Card padded={false} className="flex min-h-[420px] flex-col p-3.5 sm:p-[18px] lg:h-[calc(100dvh-122px)]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-1 pb-3">
          <div>
            <h2 className="text-[16px] font-bold text-ink">Live tracking</h2>
            <p className="text-[11px] text-ink-60">
              {vehicles.length} teams on the road · updated {fmtAge(new Date(updatedAt))} {fmtAge(new Date(updatedAt)) === 'just now' ? '' : 'ago'}
            </p>
          </div>
          <FilterDropdown
            label="Map filter"
            value={filter}
            onChange={setFilter}
            defaultValue="all"
            options={[
              { value: 'all', label: `All · ${vehicles.length}` },
              { value: 'transit', label: `In Transit · ${vehicles.filter((v) => v.r.status === 'In Transit' && !v.stale).length}` },
              { value: 'stale', label: `Stale GPS${staleCount ? ` · ${staleCount}` : ''}` },
            ]}
          />
        </div>

        <div className="h-[600px] w-full overflow-hidden rounded-[22px] border border-white/95">
          <LiveMap trips={liveTrips ?? []} selectedTrip={selectedTrip} />
        </div>
      </Card>

      <Card padded={false} className="flex flex-col p-3.5 sm:p-[18px] lg:h-[calc(100dvh-122px)]">
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 className="text-[16px] font-bold text-ink">Live status ticker</h2>
          <button
            type="button"
            onClick={() => {
              setStaleDemo(!staleDemo)
              setFilter('all')
            }}
            className="text-[12px] font-bold text-violet hover:underline"
          >
            {staleDemo ? 'Back to live' : 'Demo: GPS drop'}
          </button>
        </div>
        <Ticker
          requests={requests}
          teams={teams}
          branches={branches}
          staleDemo={staleDemo}
          filter={filter}
          selected={selected}
          onSelect={setSelected}
          branchShort={branchShort}
        />
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
  staleDemo,
  filter,
  selected,
  onSelect,
  branchShort,
}: {
  requests: CashRequest[]
  teams: Team[]
  branches: Branch[]
  staleDemo: boolean
  filter: Filter
  selected: string | null
  onSelect: (id: string) => void
  branchShort: (id: string) => string
}) {
  const lastAt = (r: CashRequest) => r.timeline[r.timeline.length - 1]?.at ?? r.createdAt
  const items = requests
    .filter((r) => ['In Transit', 'Assigned', 'Completed', 'Pending'].includes(r.status))
    .filter((r) => r.status !== 'Pending' || r === requests.find((x) => x.status === 'Pending'))
    .filter((r) => {
      const stale = staleDemo && r.teamId === STALE_TEAM && r.status === 'In Transit'
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
        const stale = staleDemo && r.teamId === STALE_TEAM && r.status === 'In Transit'
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
              <p className="shrink-0 text-ink-38">{stale ? `${STALE_MIN} min ago` : agoText(lastAt(r))}</p>
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
