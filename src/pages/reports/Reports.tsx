import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconDownload } from '@/components/icons'
import { Button, Card, ErrorBlock, LoadingBlock, PageHeader, SelectMenu } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/cn'
import { exportCsv, exportExcel } from '@/lib/export'
import { fmtMoney, fmtMoneyShort, isoDay } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'

interface Filters {
  from: string
  to: string
  branch: string
  type: string
  status: string
  team: string
}

// The bank is closed on Sat/Sun, so the Trips-per-day chart only shows
// business days. Keep the index aligned with Date#getDay (Mon = 0 here).
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th']

/** Monday of the week that contains the given day. */
function mondayOf(d: Date) {
  const m = new Date(d)
  const dow = (m.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  m.setDate(m.getDate() - dow)
  m.setHours(0, 0, 0, 0)
  return m
}

/** 1st | 2nd | 3rd … Monday-week of its Monday's month. */
function nthBusinessWeek(monday: Date) {
  const m = monday.getMonth()
  const y = monday.getFullYear()
  let count = 0
  for (let d = 1; d <= monday.getDate(); d++) {
    const t = new Date(y, m, d)
    if (t.getDay() === 1) count++
  }
  return count
}

interface WeekOpt {
  value: string      // ISO Monday
  label: string      // "This week · 2–6 Nov"
  from: string       // ISO Mon
  to: string         // ISO Fri (effective — today if the week is still in progress)
  rangeText: string  // "2–6 Nov" (uses today's date if in progress)
}

/** Friendly label for a date range inside the same (or crossing) month. */
function rangeLabel(from: Date, to: Date) {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
  if (sameMonth) return `${from.getDate()}–${to.getDate()} ${MONTHS[from.getMonth()]}`
  return `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]}`
}

/** Build the last `count` business weeks as pick-list options. */
function recentWeeks(count = 10): WeekOpt[] {
  const todayMon = mondayOf(new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const out: WeekOpt[] = []
  for (let i = 0; i < count; i++) {
    const mon = new Date(todayMon)
    mon.setDate(mon.getDate() - i * 7)
    const fri = new Date(mon)
    fri.setDate(fri.getDate() + 4)

    // If this is the current week, cap the "to" at today so filtered rows
    // match reality (future days have no data yet).
    const inProgress = i === 0 && today < fri
    const effTo = inProgress ? today : fri

    const range = rangeLabel(mon, effTo)
    let title: string
    if (i === 0) title = `This week · ${range}${inProgress ? ' · so far' : ''}`
    else if (i === 1) title = `Last week · ${range}`
    else {
      const n = nthBusinessWeek(mon)
      title = `${ORDINAL[n] ?? `${n}th`} week of ${MONTHS_LONG[mon.getMonth()]} · ${range}`
    }

    out.push({
      value: isoDay(mon),
      label: title,
      from: isoDay(mon),
      to: isoDay(effTo),
      rangeText: range,
    })
  }
  return out
}

const CUSTOM_RANGE = '__custom__'

function defaultFilters(): Filters {
  const weeks = recentWeeks(1)
  const w = weeks[0]!
  return { from: w.from, to: w.to, branch: '', type: '', status: '', team: '' }
}


/** AP-10 · Reports & Analytics (the trip log itself lives on Trip History). */
export default function Reports() {
  const navigate = useNavigate()
  const { data: trips, error, reload } = useApi(() => api.trips.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const weekOptions = useMemo(() => recentWeeks(10), [])
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(draft)
  // Which week is currently chosen in the dropdown, or CUSTOM_RANGE for arbitrary dates.
  const [weekPick, setWeekPick] = useState<string>(() => weekOptions[0]?.value ?? CUSTOM_RANGE)

  const branchName = (id: string) => branches?.find((b) => b.id === id)?.name.replace(' Branch', '') ?? id
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? id

  const rows = useMemo(
    () =>
      (trips ?? [])
        .filter(
          (t) =>
            t.date >= applied.from &&
            t.date <= applied.to &&
            (!applied.branch || t.branchId === applied.branch) &&
            (!applied.type || t.type === applied.type) &&
            (!applied.team || t.teamId === applied.team) &&
            (!applied.status || (applied.status === 'on' ? t.onTime : !t.onTime)),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [trips, applied],
  )

  const stats = useMemo(() => {
    const n = rows.length
    const amount = rows.reduce((s, t) => s + t.amount, 0)
    const avg = n ? Math.round(rows.reduce((s, t) => s + t.durationMin, 0) / n) : 0
    const onTime = n ? Math.round((rows.filter((t) => t.onTime).length / n) * 100) : 0

    // Per weekday Mon–Fri (bank is closed Sat/Sun, so those bars are hidden).
    // Carries count, amount, duration AND on-time / late split so both charts
    // can reuse the same rollup.
    const perDay = WEEKDAYS.map(() => ({ count: 0, amount: 0, dur: 0, on: 0, late: 0 }))
    rows.forEach((t) => {
      const i = (new Date(`${t.date}T00:00:00`).getDay() + 6) % 7
      if (i < 5) {
        perDay[i]!.count++
        perDay[i]!.amount += t.amount
        perDay[i]!.dur += t.durationMin
        if (t.onTime) perDay[i]!.on++
        else perDay[i]!.late++
      }
    })

    // Per branch: trip count, total amount, deposit vs withdrawal split.
    const perBranchMap = new Map<string, { count: number; amount: number; deposits: number; withdrawals: number }>()
    rows.forEach((t) => {
      const e = perBranchMap.get(t.branchId) ?? { count: 0, amount: 0, deposits: 0, withdrawals: 0 }
      e.count++
      e.amount += t.amount
      if (t.type === 'Deposit') e.deposits++
      else e.withdrawals++
      perBranchMap.set(t.branchId, e)
    })

    return {
      n,
      amount,
      avg,
      onTime,
      perDay,
      perBranch: [...perBranchMap.entries()].sort((a, b) => b[1].amount - a[1].amount),
    }
  }, [rows])

  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!trips || !branches || !teams) return <LoadingBlock />

  const currency = rows[0]?.currency ?? 'MMK'

  const exportData = (): [string[], (string | number)[][]] => [
    ['Request', 'Date', 'Branch', 'Type', 'Team', 'Currency', 'Amount', 'Duration (min)', 'Result'],
    rows.map((t) => [t.id, t.date, branchName(t.branchId), t.type, teamName(t.teamId), t.currency, t.amount, t.durationMin, t.onTime ? 'On time' : 'Late']),
  ]
  const fileBase = `cashroute-trips_${applied.from}_${applied.to}`

  const setF = (k: keyof Filters, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  /** Picking a week updates the From/To range behind the scenes. */
  const pickWeek = (value: string) => {
    setWeekPick(value)
    if (value === CUSTOM_RANGE) return
    const w = weekOptions.find((o) => o.value === value)
    if (w) setDraft((d) => ({ ...d, from: w.from, to: w.to }))
  }
  const currentWeek = weekOptions.find((o) => o.value === weekPick)
  const customMode = weekPick === CUSTOM_RANGE
  // How many business days the chosen window actually covers (1–5), used for a
  // "showing N of 5 business days" hint under the chart row.
  const activeDays = (() => {
    if (!draft.from || !draft.to) return 0
    const a = new Date(`${draft.from}T00:00:00`)
    const b = new Date(`${draft.to}T00:00:00`)
    let n = 0
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) n++
    }
    return n
  })()

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Filter, review and export. The full trip log is under Trip History."
        actions={
          <>
            <Button variant="ghost" onClick={() => exportCsv(`${fileBase}.csv`, ...exportData())} disabled={!rows.length}>
              <IconDownload className="size-4" /> Export CSV
            </Button>
            <Button variant="ghost" onClick={() => exportExcel(`${fileBase}.xls`, 'Trips', ...exportData())} disabled={!rows.length}>
              <IconDownload className="size-4" /> Export Excel
            </Button>
          </>
        }
      />

      {/* relative + z-20 so the DatePicker popovers float above the KPI cards below
          (each glass card is its own stacking context because of backdrop-filter). */}
      <Card padded={false} className="relative z-20 p-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto] xl:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(draft)
          }}
        >
          {/* Week picker in the normal case; falls back to From/To when "Custom range" is chosen. */}
          <div className="sm:col-span-2 xl:col-span-1">
            {customMode ? (
              <div className="grid grid-cols-2 gap-2">
                <DatePicker label="From" placeholder="Start date" value={draft.from} max={draft.to} onChange={(v) => setF('from', v)} rangeStart={draft.from} rangeEnd={draft.to} clearable={false} />
                <DatePicker label="To" placeholder="End date" value={draft.to} min={draft.from} onChange={(v) => setF('to', v)} rangeStart={draft.from} rangeEnd={draft.to} clearable={false} align="right" />
              </div>
            ) : (
              <SelectMenu
                label="Week"
                value={weekPick}
                onChange={pickWeek}
                options={[...weekOptions.map((w) => ({ value: w.value, label: w.label })), { value: CUSTOM_RANGE, label: 'Custom range…' }]}
                placeholder="Pick a week"
              />
            )}
            {!customMode && currentWeek && (
              <p className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-60">
                <span>{currentWeek.rangeText}</span>
                <span>·</span>
                <span>{activeDays === 5 ? 'Full business week' : `${activeDays} of 5 business days`}</span>
                <button type="button" onClick={() => pickWeek(CUSTOM_RANGE)} className="ml-auto font-bold text-violet hover:underline">
                  Custom range
                </button>
              </p>
            )}
            {customMode && (
              <p className="mt-1.5 text-[11px] text-ink-60">
                <button type="button" onClick={() => pickWeek(weekOptions[0]!.value)} className="font-bold text-violet hover:underline">
                  ← Back to weekly picker
                </button>
              </p>
            )}
          </div>
          <SelectMenu label="Branch" value={draft.branch} onChange={(v) => setF('branch', v)} placeholder="All branches" options={branches.filter((b) => b.type === 'Branch').map((b) => ({ value: b.id, label: b.name }))} />
          <SelectMenu label="Type" value={draft.type} onChange={(v) => setF('type', v)} placeholder="All types" options={[{ value: 'Deposit', label: 'Deposit' }, { value: 'Withdrawal', label: 'Withdrawal' }]} />
          <SelectMenu label="Status" value={draft.status} onChange={(v) => setF('status', v)} placeholder="All" options={[{ value: 'on', label: 'On time' }, { value: 'late', label: 'Late' }]} />
          <SelectMenu label="Team" value={draft.team} onChange={(v) => setF('team', v)} placeholder="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 xl:flex-none">
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const d = defaultFilters()
                setDraft(d)
                setApplied(d)
                setWeekPick(weekOptions[0]?.value ?? CUSTOM_RANGE)
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Trips completed" value={String(stats.n)} />
        <Kpi label="Amount moved" value={fmtMoney(stats.amount, currency)} />
        <Kpi label="Avg trip duration" value={`${stats.avg} min`} />
        <Kpi label="On-time rate" value={`${stats.onTime}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Trips per day">
          <TripsPerDay stats={stats.perDay} currency={currency} />
        </Card>
        <Card title="Amount moved per branch">
          <ul className="flex flex-col gap-3">
            {stats.perBranch.length === 0 && <li className="text-[12px] text-ink-60">No data.</li>}
            {stats.perBranch.map(([id, e]) => {
              const avgSize = e.count ? Math.round(e.amount / e.count) : 0
              return (
                <li key={id} className="grid grid-cols-[70px_1fr_auto] items-center gap-3">
                  <span className="truncate text-[11px] text-ink-60">{branchName(id)}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/history?q=${encodeURIComponent(branchName(id))}&from=${applied.from}&to=${applied.to}`)}
                    aria-label={`${branchName(id)} — see ${e.count} trips in Trip History`}
                    className="group relative block h-5 cursor-pointer rounded-full"
                  >
                    {/* The real bar — hover target. */}
                    <span className="block h-2.5 rounded-full bg-gradient-to-r from-violet to-lavender transition group-hover:brightness-110 group-hover:shadow-glow-violet" style={{ width: `${(e.amount / stats.perBranch[0]![1].amount) * 100}%`, marginTop: 5 }} />
                    <ChartTip>
                      <p className="text-[11px] font-bold text-ink">{branchName(id)}</p>
                      <p className="mt-0.5 text-[13px] font-bold text-plum">{fmtMoney(e.amount, currency)}</p>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-ink-60">
                        <span>Trips</span><span className="text-right text-ink">{e.count}</span>
                        <span>Avg trip</span><span className="text-right text-ink">{fmtMoney(avgSize, currency)}</span>
                        <span>Deposits</span><span className="text-right text-ink">{e.deposits}</span>
                        <span>Withdrawals</span><span className="text-right text-ink">{e.withdrawals}</span>
                      </div>
                      <p className="mt-1.5 text-[10px] font-bold text-violet">Click to open in Trip History ›</p>
                    </ChartTip>
                  </button>
                  <span className="text-right text-[11px] font-bold tabular-nums text-ink">{fmtMoneyShort(e.amount, currency)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="On-time vs late" action={<span className="text-[11px] font-bold text-ink-60">by weekday</span>}>
          {stats.n === 0 ? (
            <p className="text-[12px] text-ink-60">No trips in this range.</p>
          ) : (
          <>
          <ul className="flex flex-col gap-3">
            {stats.perDay.map((d, i) => {
              const total = d.on + d.late
              const rate = total ? Math.round((d.on / total) * 100) : 0
              return (
                <li key={i} className="grid grid-cols-[48px_1fr_auto] items-center gap-3">
                  <span className="text-[11px] text-ink-60">{WEEKDAYS[i]}</span>
                  <button
                    type="button"
                    disabled={total === 0}
                    onClick={() => navigate(`/history?from=${applied.from}&to=${applied.to}&dow=${i}`)}
                    aria-label={`${WEEKDAYS[i]} — see ${total} trips in Trip History`}
                    className="group relative block h-5 cursor-pointer disabled:cursor-default"
                  >
                    <span className="flex h-2.5 gap-1 transition group-hover:brightness-110" style={{ marginTop: 5 }}>
                      {total === 0 ? (
                        <span className="w-full rounded-full bg-ink-6" />
                      ) : (
                        <>
                          <span className="rounded-full bg-lime" style={{ flex: d.on || 0.0001 }} />
                          {d.late > 0 && <span className="rounded-full bg-violet" style={{ flex: Math.max(d.late, total * 0.06) }} />}
                        </>
                      )}
                    </span>
                    <ChartTip>
                      <p className="text-[11px] font-bold text-ink">{WEEKDAYS[i]}</p>
                      {total === 0 ? (
                        <p className="mt-1 text-[11px] text-ink-60">No trips</p>
                      ) : (
                        <>
                          <p className="mt-0.5 text-[13px] font-bold text-plum">{rate}% on time</p>
                          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                            <span className="flex items-center gap-1.5 text-ink-60"><span className="size-1.5 rounded-full bg-lime" />On time</span>
                            <span className="text-right font-bold text-ink">{d.on}</span>
                            <span className="flex items-center gap-1.5 text-ink-60"><span className="size-1.5 rounded-full bg-violet" />Late</span>
                            <span className="text-right font-bold text-ink">{d.late}</span>
                            <span className="text-ink-60">Amount</span>
                            <span className="text-right font-bold text-plum">{fmtMoney(d.amount, currency)}</span>
                          </div>
                          <p className="mt-1.5 text-[10px] font-bold text-violet">Click to open in Trip History ›</p>
                        </>
                      )}
                    </ChartTip>
                  </button>
                  <span className="text-right text-[11px] font-bold tabular-nums text-ink">
                    {total === 0 ? <span className="text-ink-38">—</span> : `${d.on}/${total}`}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex gap-4 text-[11px] text-ink-60">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-lime" /> On time</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet" /> Late</span>
          </div>
          </>
          )}
        </Card>
      </div>

    </>
  )
}

/** Floating hover-tooltip used by the Reports charts. Needs a `group relative` parent. */
function ChartTip({ children }: { children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none invisible absolute -top-2 left-1/2 z-20 min-w-[150px] -translate-x-1/2 -translate-y-full rounded-[14px] border border-white/95 bg-white px-3 py-2 text-left opacity-0 shadow-[0_14px_38px_rgba(66,24,105,0.22)] transition group-hover:visible group-hover:opacity-100"
    >
      {children}
      {/* little pointer under the bubble */}
      <span className="absolute top-full left-1/2 -mt-1.5 size-3 -translate-x-1/2 rotate-45 border-r border-b border-white/95 bg-white" />
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[28px] p-4">
      <p className="text-[11px] text-ink-60 sm:text-[12px]">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold text-ink sm:text-[26px]">{value}</p>
    </div>
  )
}

function TripsPerDay({ stats, currency }: { stats: { count: number; amount: number; dur: number; on: number; late: number }[]; currency: import('@/types').Currency }) {
  const max = Math.max(1, ...stats.map((d) => d.count))
  const peak = stats.findIndex((d) => d.count === max)
  const BAR_AREA = 120 // px — fixed drawing area so bar heights are directly proportional to counts.
  return (
    <div className="flex items-end justify-between gap-2">
      {stats.map((d, i) => {
        const avgDur = d.count ? Math.round(d.dur / d.count) : 0
        const h = d.count === 0 ? 4 : Math.round((d.count / max) * BAR_AREA)
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="h-4 text-[10px] font-bold text-ink-60">{d.count || ''}</span>
            {/* The bar itself is the hover target so the tooltip only appears when touching it. */}
            <div className="group relative flex w-full justify-center" style={{ height: BAR_AREA }}>
              <div
                className={cn(
                  'w-full max-w-[26px] self-end rounded-[10px] transition group-hover:brightness-110 group-hover:scale-[1.04]',
                  d.count === 0 ? 'bg-ink-9' : i === peak ? 'bg-gradient-to-b from-lime to-lime-dark' : 'bg-gradient-to-b from-lavender to-violet',
                )}
                style={{ height: h }}
              />
              <ChartTip>
                <p className="text-[11px] font-bold text-ink">{WEEKDAYS[i]}</p>
                <p className="mt-0.5 text-[13px] font-bold text-plum">{d.count} {d.count === 1 ? 'trip' : 'trips'}</p>
                {d.count > 0 && (
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-ink-60">
                    <span>Amount</span><span className="text-right text-ink">{fmtMoney(d.amount, currency)}</span>
                    <span>Avg duration</span><span className="text-right text-ink">{avgDur} min</span>
                    <span>On time</span><span className="text-right text-ink">{d.on} / {d.count}</span>
                  </div>
                )}
              </ChartTip>
            </div>
            <span className="text-[10px] text-ink-60">{WEEKDAYS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}
