import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconDownload } from '@/components/icons'
import { Button, Card, ErrorBlock, LoadingBlock, PageHeader, SelectMenu } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/cn'
import { exportCsv, exportExcel } from '@/lib/export'
import { fmtMoney, isoDay } from '@/lib/format'
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

function defaultFilters(): Filters {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 12)
  return { from: isoDay(from), to: isoDay(to), branch: '', type: '', status: '', team: '' }
}

/** Monday of the current local week as YYYY-MM-DD. */
function thisWeekMonday() {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7 // Mon = 0
  d.setDate(d.getDate() - dow)
  return isoDay(d)
}

/** AP-10 · Reports & Analytics (the trip log itself lives on Trip History). */
export default function Reports() {
  const navigate = useNavigate()
  const { data: trips, error, reload } = useApi(() => api.trips.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const [draft, setDraft] = useState<Filters>(defaultFilters)
  const [applied, setApplied] = useState<Filters>(draft)

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
    const perDay = WEEKDAYS.map(() => ({ count: 0, amount: 0, dur: 0 }))
    rows.forEach((t) => {
      const i = (new Date(`${t.date}T00:00:00`).getDay() + 6) % 7
      if (i < 5) {
        perDay[i]!.count++
        perDay[i]!.amount += t.amount
        perDay[i]!.dur += t.durationMin
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

    // Current week's Mon–Fri — on-time vs late per business day.
    const weekStart = thisWeekMonday()
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(`${weekStart}T00:00:00`)
      d.setDate(d.getDate() + i)
      return isoDay(d)
    })
    // Use the full trips feed (not the filtered rows) so the "this week"
    // chart isn't blanked out by the Reports date-range filter.
    const weekDays = days.map((day) => {
      const dayRows = (trips ?? []).filter((t) => t.date === day)
      const on = dayRows.filter((t) => t.onTime).length
      const late = dayRows.length - on
      const amount = dayRows.reduce((s, t) => s + t.amount, 0)
      return { day, on, late, amount }
    })

    return {
      n,
      amount,
      avg,
      onTime,
      perDay,
      perBranch: [...perBranchMap.entries()].sort((a, b) => b[1].amount - a[1].amount),
      weekDays,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, trips])

  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!trips || !branches || !teams) return <LoadingBlock />

  const currency = rows[0]?.currency ?? 'MMK'

  const exportData = (): [string[], (string | number)[][]] => [
    ['Request', 'Date', 'Branch', 'Type', 'Team', 'Currency', 'Amount', 'Duration (min)', 'Result'],
    rows.map((t) => [t.id, t.date, branchName(t.branchId), t.type, teamName(t.teamId), t.currency, t.amount, t.durationMin, t.onTime ? 'On time' : 'Late']),
  ]
  const fileBase = `cashroute-trips_${applied.from}_${applied.to}`

  const setF = (k: keyof Filters, v: string) => setDraft((d) => ({ ...d, [k]: v }))

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
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[2.2fr_1fr_1fr_1fr_1fr_auto] xl:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(draft)
          }}
        >
          {/* Full row until xl so the dates ("21 Oct 2026") aren't cut off. */}
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-1">
            <DatePicker label="From" placeholder="Start date" value={draft.from} max={draft.to} onChange={(v) => setF('from', v)} rangeStart={draft.from} rangeEnd={draft.to} clearable={false} />
            <DatePicker label="To" placeholder="End date" value={draft.to} min={draft.from} onChange={(v) => setF('to', v)} rangeStart={draft.from} rangeEnd={draft.to} clearable={false} align="right" />
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
                <li key={id} className="grid grid-cols-[70px_1fr] items-center gap-3">
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
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="On-time vs late" action={<span className="text-[11px] font-bold text-ink-60">This week</span>}>
          <ul className="flex flex-col gap-3">
            {stats.weekDays.every((d) => d.on + d.late === 0) && <li className="text-[12px] text-ink-60">No trips yet this week.</li>}
            {stats.weekDays.map((d, i) => {
              const total = d.on + d.late
              return (
                <li key={d.day} className="grid grid-cols-[60px_1fr] items-center gap-3">
                  <span className="text-[11px] text-ink-60">{WEEKDAYS[i]}</span>
                  <button
                    type="button"
                    disabled={total === 0}
                    onClick={() => navigate(`/history?from=${d.day}&to=${d.day}`)}
                    aria-label={`${WEEKDAYS[i]} ${d.day} — see ${total} trips in Trip History`}
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
                      <p className="mt-0.5 text-[10px] text-ink-60">{d.day}</p>
                      {total === 0 ? (
                        <p className="mt-1 text-[11px] text-ink-60">No trips</p>
                      ) : (
                        <>
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
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex gap-4 text-[11px] text-ink-60">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-lime" /> On time</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet" /> Late</span>
          </div>
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

function TripsPerDay({ stats, currency }: { stats: { count: number; amount: number; dur: number }[]; currency: import('@/types').Currency }) {
  const max = Math.max(1, ...stats.map((d) => d.count))
  const peak = stats.findIndex((d) => d.count === max)
  return (
    <div className="flex h-[150px] items-end justify-between gap-2">
      {stats.map((d, i) => {
        const avgDur = d.count ? Math.round(d.dur / d.count) : 0
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold text-ink-60">{d.count || ''}</span>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center">
              {/* The bar itself is the hover target so the tooltip only shows when touching it. */}
              <div className="group relative flex w-full justify-center">
                <div
                  className={cn('w-full max-w-[26px] rounded-[10px] transition group-hover:brightness-110 group-hover:scale-[1.05]', i === peak ? 'bg-gradient-to-b from-lime to-lime-dark' : 'bg-gradient-to-b from-lavender to-violet')}
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, minHeight: 10 }}
                />
                <ChartTip>
                  <p className="text-[11px] font-bold text-ink">{WEEKDAYS[i]}</p>
                  <p className="mt-0.5 text-[13px] font-bold text-plum">{d.count} {d.count === 1 ? 'trip' : 'trips'}</p>
                  {d.count > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-ink-60">
                      <span>Amount</span><span className="text-right text-ink">{fmtMoney(d.amount, currency)}</span>
                      <span>Avg duration</span><span className="text-right text-ink">{avgDur} min</span>
                    </div>
                  )}
                </ChartTip>
              </div>
            </div>
            <span className="text-[10px] text-ink-60">{WEEKDAYS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}
