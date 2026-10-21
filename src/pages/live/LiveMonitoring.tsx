import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconAlert } from '@/components/icons'
import { Badge, Card, ChipGroup, ErrorBlock, LoadingBlock, statusTone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtAge, fmtMoney } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { Branch, CashRequest, Team } from '@/types'

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
const STALE_THRESHOLD = 2

type Filter = 'all' | 'transit' | 'stale'

export default function LiveMonitoring() {
  const { data: requests, error, reload } = useApi(() => api.requests.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())

  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // AP-08 · Stale GPS Warning is its own URL: /live/stale-gps
  const staleDemo = pathname.endsWith('/stale-gps')
  const setStaleDemo = (on: boolean) => navigate(on ? '/live/stale-gps' : '/live')
  const [selected, setSelected] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(Date.now())
  const [, forceTick] = useState(0)

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
  if (!requests || !branches || !teams) return <LoadingBlock />

  const branchShort = (id: string) => branches.find((b) => b.id === id)?.name.replace(' Branch', '').replace(' Cash Centre', '') ?? id
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? '—'
  const staleCount = staleDemo ? vehicles.filter((v) => v.stale).length : 0

  const visible = vehicles.filter((v) =>
    filter === 'all' ? true : filter === 'transit' ? v.r.status === 'In Transit' && !v.stale : v.stale,
  )
  const sel = vehicles.find((v) => v.r.id === selected)

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
          <ChipGroup
            label="Map filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'transit', label: 'In Transit' },
              { value: 'stale', label: `Stale GPS${staleCount ? ` (${staleCount})` : ''}` },
            ]}
          />
        </div>

        <div
          className="relative min-h-[320px] flex-1 overflow-hidden rounded-[22px] border border-white/95"
          style={{ backgroundImage: 'linear-gradient(135deg, rgb(238,243,255) 0%, rgb(244,238,255) 100%)' }}
          onClick={() => setSelected(null)}
        >
          <MapArt />

          {/* Route line Orchard → Bugis → HQ, as drawn in the design */}
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="route" x1="0" x2="1">
                <stop offset="0" stopColor="#721cb8" />
                <stop offset="0.6" stopColor="#9a4fe3" />
                <stop offset="1" stopColor="#96d74c" />
              </linearGradient>
            </defs>
            <path
              d={`M ${POS['BR-001']![0]} ${POS['BR-001']![1]} C 30 30, 34 40, ${POS['BR-003']![0]} ${POS['BR-003']![1]} S 70 56, ${HQ[0]} ${HQ[1]}`}
              fill="none"
              stroke="url(#route)"
              strokeWidth="4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          </svg>

          {staleDemo && (
            <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-[20px] border border-[rgba(229,72,77,0.4)] bg-white/90 px-3.5 py-2 text-[12px] font-bold text-danger shadow-sm">
              <IconAlert className="size-4 shrink-0" />
              <span className="truncate">
                {teamName(STALE_TEAM)} — GPS feed lost {STALE_MIN} min ago (threshold {STALE_THRESHOLD} min)
              </span>
            </div>
          )}

          {/* HQ marker */}
          <Marker x={HQ[0]} y={HQ[1]} label="HQ Cash Centre" tone="hq" />

          {visible.map((v) => (
            <Marker
              key={v.r.id}
              x={v.x}
              y={v.y}
              tone={v.stale ? 'stale' : 'team'}
              active={selected === v.r.id}
              label={`${v.r.id} · ${teamName(v.r.teamId)} · ${v.stale ? 'STALE' : branchShort(v.r.branchId) + (v.r.type === 'Deposit' ? ' Br.' : '')}`}
              onClick={() => setSelected(v.r.id)}
            />
          ))}

          {sel && (
            <div
              className="glass-strong animate-pop-in absolute right-3 bottom-3 z-20 w-[min(280px,calc(100%-24px))] rounded-[20px] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-bold text-ink">{sel.r.id}</p>
                <Badge tone={sel.stale ? 'amber' : statusTone(sel.r.status)}>{sel.stale ? 'GPS Stale' : sel.r.status}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-ink-60">
                {teamName(sel.r.teamId)} · {routeText(sel.r, branchShort)}
              </p>
              <p className="mt-2 text-[13px] font-semibold text-ink">{fmtMoney(sel.r.amount, sel.r.currency)}</p>
              <p className="mt-0.5 text-[11px] text-ink-60">
                Last ping: {sel.stale ? `${STALE_MIN} min ago` : 'just now'}
              </p>
              <Link to={`/approvals/${sel.r.id}`} className="mt-3 inline-block text-[12px] font-bold text-violet hover:underline">
                Open request ›
              </Link>
            </div>
          )}
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
    .filter((r) => ['In Transit', 'Assigned', 'Delivered', 'Pending'].includes(r.status))
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
              <Link to={r.status === 'Delivered' ? `/reports/${r.id}` : `/approvals/${r.id}`} className={cls}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const order = (r: CashRequest) => ({ 'In Transit': 0, Assigned: 1, Delivered: 1, Pending: 2 } as Record<string, number>)[r.status] ?? 3
const agoText = (iso: string) => {
  const a = fmtAge(iso)
  return a === 'just now' ? a : `${a} ago`
}

function Marker({
  x,
  y,
  label,
  tone,
  active,
  onClick,
}: {
  x: number
  y: number
  label: string
  tone: 'team' | 'stale' | 'hq'
  active?: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={
        onClick
          ? (e: React.MouseEvent) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
      className={cn('absolute z-10 flex -translate-y-1/2 items-center gap-2 transition-[left,top] duration-[2500ms] ease-linear', active && 'z-20')}
      style={{ left: `calc(${x}% - 9px)`, top: `${y}%` }}
      aria-label={label}
    >
      <span
        className={cn(
          'relative grid size-[18px] shrink-0 place-items-center rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(66,24,105,0.35)]',
          tone === 'team' && 'bg-violet',
          tone === 'stale' && 'bg-danger',
          tone === 'hq' && 'bg-plum',
          active && 'ring-4 ring-violet/25',
        )}
      >
        {tone === 'stale' && <span className="absolute inset-[-6px] animate-ping rounded-full bg-danger/30" />}
      </span>
      <span
        className={cn(
          'hidden rounded-[10px] bg-white/95 px-2.5 py-1 text-[10px] font-bold whitespace-nowrap shadow-[0_2px_10px_rgba(66,24,105,0.12)] sm:inline',
          tone === 'stale' ? 'text-danger' : 'text-ink',
        )}
      >
        {label}
      </span>
    </Tag>
  )
}

/** Stylised city map: soft grid, two arterial roads, park and water patches. */
function MapArt() {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(114,28,184,0.06)" strokeWidth="0.25" />
        </pattern>
        <radialGradient id="park">
          <stop offset="0" stopColor="rgba(150,215,76,0.45)" />
          <stop offset="1" stopColor="rgba(150,215,76,0)" />
        </radialGradient>
        <radialGradient id="water">
          <stop offset="0" stopColor="rgba(124,131,255,0.35)" />
          <stop offset="1" stopColor="rgba(124,131,255,0)" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />
      <ellipse cx="8" cy="8" rx="20" ry="16" fill="url(#park)" />
      <ellipse cx="82" cy="58" rx="26" ry="30" fill="url(#water)" />
      <path d="M -5 20 C 25 12, 55 14, 105 18" stroke="white" strokeWidth="14" fill="none" vectorEffect="non-scaling-stroke" opacity="0.95" />
      <path d="M -5 62 C 30 52, 60 68, 105 54" stroke="white" strokeWidth="12" fill="none" vectorEffect="non-scaling-stroke" opacity="0.95" />
      <path d="M 33 -5 C 30 30, 34 70, 30 105" stroke="white" strokeWidth="10" fill="none" vectorEffect="non-scaling-stroke" opacity="0.9" />
      <path d="M 75 -5 C 72 40, 76 70, 70 105" stroke="white" strokeWidth="9" fill="none" vectorEffect="non-scaling-stroke" opacity="0.9" />
    </svg>
  )
}
