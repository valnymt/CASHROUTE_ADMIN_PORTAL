import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { DatePicker } from '@/components/ui/DatePicker'
import { fmtDate, fmtMoney } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { Trip } from '@/types'

type Result = 'all' | 'on' | 'late'

/** Trip History — the full log of completed trips, scrolling inside one card. */
export default function History() {
  const navigate = useNavigate()
  const { data: trips, error, reload } = useApi(() => api.trips.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const [q, setQ] = useState('')
  const [result, setResult] = useState<Result>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const branchName = (id: string) => branches?.find((b) => b.id === id)?.name.replace(' Branch', '') ?? id
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? id

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (trips ?? [])
      .filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
      .filter((t) => result === 'all' || (result === 'on' ? t.onTime : !t.onTime))
      .filter((t) => !s || `${t.id} ${branchName(t.branchId)} ${teamName(t.teamId)} ${t.type}`.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, q, result, from, to, branches, teams])

  return (
    <>
      <PageHeader title="Trip History" subtitle={trips ? `${rows.length} of ${trips.length} trips · open one for its full timeline` : undefined} />
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
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
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !trips ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(t: Trip) => t.id}
          onRowClick={(t) => navigate(`/reports/${t.id}`)}
          empty="No trips match these filters."
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
          action={(t) => <RowLink onClick={() => navigate(`/reports/${t.id}`)}>Details ›</RowLink>}
        />
      )}
    </>
  )
}
