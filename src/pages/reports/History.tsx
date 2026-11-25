import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { DatePicker } from '@/components/ui/DatePicker'
import { fmtDate, fmtMoney } from '@/lib/format'
import { branchScope } from '@/lib/scope'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { LIVE_STATUS_OPTIONS, useApi } from '@/store/data'
import type { Trip } from '@/types'

type Result = 'all' | 'on' | 'late'

/** Trip History — the full log of completed trips, scrolling inside one card. */
export default function History() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: trips, error, reload } = useApi(() => api.trips.list(), [], LIVE_STATUS_OPTIONS)
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list(), [], LIVE_STATUS_OPTIONS)
  // Branch Makers / Checkers see only their own branch's trips.
  const scope = branches ? branchScope(user, branches) : undefined
  // Reports can deep-link into this page with ?q=&from=&to=&result=&dow= preset.
  // dow is 0 (Mon) … 4 (Fri); -1 means "any day".
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [result, setResult] = useState<Result>((params.get('result') as Result) || 'all')
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')
  const dow = Number(params.get('dow') ?? -1)

  const branchName = (id: string) => branches?.find((b) => b.id === id)?.name.replace(' Branch', '') ?? id
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? id

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (trips ?? [])
      .filter((t) => scope === null || t.branchId === scope)
      .filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
      .filter((t) => dow < 0 || (new Date(`${t.date}T00:00:00`).getDay() + 6) % 7 === dow)
      .filter((t) => result === 'all' || (result === 'on' ? t.onTime : !t.onTime))
      .filter((t) => !s || `${t.id} ${branchName(t.branchId)} ${teamName(t.teamId)} ${t.type}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, q, result, from, to, branches, teams, scope])

  const hasFilters = Boolean(q || from || to || result !== 'all' || dow >= 0)
  const openTrip = (trip: Trip) => {
    const filters = new URLSearchParams()
    if (q) filters.set('q', q)
    if (from) filters.set('from', from)
    if (to) filters.set('to', to)
    if (result !== 'all') filters.set('result', result)
    if (dow >= 0) filters.set('dow', String(dow))
    navigate(`/reports/${trip.id}`, { state: { historySearch: `?${filters}` } })
  }

  return (
    <>
      <PageHeader title="Trip History" subtitle={trips && branches ? `${rows.length} completed ${rows.length === 1 ? 'trip' : 'trips'}` : undefined} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-9 bg-white/75 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search request, branch, team…" className="xl:w-[300px]" />
        <FilterDropdown
          label="Result"
          value={result}
          onChange={setResult}
          defaultValue="all"
          options={[
            { value: 'all', label: 'Any result' },
            { value: 'on', label: 'On time' },
            { value: 'late', label: 'Late' },
          ]}
        />
        <div className="flex items-center gap-2">
          <DatePicker placeholder="From date" value={from} onChange={setFrom} max={to || undefined} rangeStart={from} rangeEnd={to} />
          <span className="text-[12px] text-ink-60">to</span>
          <DatePicker placeholder="To date" value={to} onChange={setTo} min={from || undefined} rangeStart={from} rangeEnd={to} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
            setQ('')
            setFrom('')
            setTo('')
            setResult('all')
            setParams({}, { replace: true })
          }}>Clear filters</Button>
        )}
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !trips || !branches ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(t: Trip) => t.id}
          onRowClick={openTrip}
          empty={hasFilters ? 'No trips match these filters.' : 'No completed trips yet.'}
          // The whole log scrolls inside this card; the header row stays visible.
          maxHeight="calc(100dvh - 300px)"
          columns={[
            { header: 'Request', cell: (t) => <span className="font-bold">{t.id}</span>, primary: true },
            { header: 'Date', cell: (t) => fmtDate(t.date) },
            { header: 'Branch', cell: (t) => branchName(t.branchId) },
            { header: 'Type', cell: (t) => <Badge tone={t.type === 'Deposit' ? 'periwinkle' : 'neutral'}>{t.type}</Badge> },
            { header: 'Team', cell: (t) => teamName(t.teamId) },
            { header: 'Amount', cell: (t) => fmtMoney(t.amount, t.currency) },
            { header: 'Duration', cell: (t) => `${t.durationMin} min` },
            { header: 'Result', cell: (t) => <Badge tone={t.onTime ? 'lime' : 'danger'}>{t.onTime ? 'On time' : 'Late'}</Badge> },
          ]}
          action={(t) => <RowLink onClick={() => openTrip(t)}>View trip</RowLink>}
        />
      )}
    </>
  )
}
