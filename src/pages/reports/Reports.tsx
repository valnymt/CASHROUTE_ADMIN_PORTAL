import { useMemo, useState, type ReactNode } from 'react'
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function defaultFilters(): Filters {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 12)
  return { from: isoDay(from), to: isoDay(to), branch: '', type: '', status: '', team: '' }
}

/** ISO week number, used for the "On-time vs late" chart. */
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)
}

/** AP-10 · Reports & Analytics (the trip log itself lives on Trip History). */
export default function Reports() {
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

    const perDay = WEEKDAYS.map(() => 0)
    rows.forEach((t) => perDay[(new Date(`${t.date}T00:00:00`).getDay() + 6) % 7]!++)

    const perBranch = new Map<string, number>()
    rows.forEach((t) => perBranch.set(t.branchId, (perBranch.get(t.branchId) ?? 0) + t.amount))

    const weeks = new Map<number, { on: number; late: number }>()
    rows.forEach((t) => {
      const w = isoWeek(new Date(`${t.date}T00:00:00`))
      const e = weeks.get(w) ?? { on: 0, late: 0 }
      if (t.onTime) e.on++
      else e.late++
      weeks.set(w, e)
    })

    return {
      n,
      amount,
      avg,
      onTime,
      perDay,
      perBranch: [...perBranch.entries()].sort((a, b) => b[1] - a[1]),
      weeks: [...weeks.entries()].sort((a, b) => a[0] - b[0]).slice(-4),
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
          <TripsPerDay values={stats.perDay} />
        </Card>
        <Card title="Amount moved per branch">
          <ul className="flex flex-col gap-3">
            {stats.perBranch.length === 0 && <li className="text-[12px] text-ink-60">No data.</li>}
            {stats.perBranch.map(([id, amt]) => {
              const share = stats.amount ? Math.round((amt / stats.amount) * 100) : 0
              return (
                <li key={id} className="group relative grid grid-cols-[70px_1fr] items-center gap-3">
                  <span className="truncate text-[11px] text-ink-60">{branchName(id)}</span>
                  <span className="h-2.5 rounded-full bg-gradient-to-r from-violet to-lavender" style={{ width: `${(amt / stats.perBranch[0]![1]) * 100}%` }} />
                  <ChartTip>
                    <p className="text-[11px] font-bold text-ink">{branchName(id)}</p>
                    <p className="mt-0.5 text-[13px] font-bold text-plum">{fmtMoney(amt, currency)}</p>
                    <p className="mt-0.5 text-[10px] text-ink-60">{share}% of total moved</p>
                  </ChartTip>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="On-time vs late">
          <ul className="flex flex-col gap-3">
            {stats.weeks.length === 0 && <li className="text-[12px] text-ink-60">No data.</li>}
            {stats.weeks.map(([w, { on, late }]) => {
              const rate = on + late ? Math.round((on / (on + late)) * 100) : 0
              return (
                <li key={w} className="group relative grid grid-cols-[60px_1fr] items-center gap-3">
                  <span className="text-[11px] text-ink-60">Week {w}</span>
                  <span className="flex h-2.5 gap-1">
                    <span className="rounded-full bg-lime" style={{ flex: on || 0.0001 }} />
                    {late > 0 && <span className="rounded-full bg-violet" style={{ flex: Math.max(late, (on + late) * 0.06) }} />}
                  </span>
                  <ChartTip>
                    <p className="text-[11px] font-bold text-ink">Week {w}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink"><span className="size-1.5 rounded-full bg-lime" /> {on} on time</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-ink"><span className="size-1.5 rounded-full bg-violet" /> {late} late</p>
                    <p className="mt-1 text-[10px] font-bold text-plum">{rate}% on-time rate</p>
                  </ChartTip>
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

function TripsPerDay({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const peak = values.indexOf(max)
  const total = values.reduce((a, b) => a + b, 0)
  return (
    <div className="flex h-[150px] items-end justify-between gap-2">
      {values.map((v, i) => {
        const share = total ? Math.round((v / total) * 100) : 0
        return (
          <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold text-ink-60">{v || ''}</span>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center">
              <div
                className={cn('w-full max-w-[26px] rounded-[10px] transition group-hover:brightness-110', i === peak ? 'bg-gradient-to-b from-lime to-lime-dark' : 'bg-gradient-to-b from-lavender to-violet')}
                style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-ink-60">{WEEKDAYS[i]}</span>
            <ChartTip>
              <p className="text-[11px] font-bold text-ink">{WEEKDAYS[i]}</p>
              <p className="mt-0.5 text-[13px] font-bold text-plum">{v} {v === 1 ? 'trip' : 'trips'}</p>
              <p className="mt-0.5 text-[10px] text-ink-60">{share}% of the week</p>
            </ChartTip>
          </div>
        )
      })}
    </div>
  )
}
