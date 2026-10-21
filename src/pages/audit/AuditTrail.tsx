import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSparkle } from '@/components/icons'
import { Badge, Card, ErrorBlock, FilterDropdown, KeyValue, LoadingBlock, Modal, PageHeader, SearchInput, statusTone } from '@/components/ui'
import { DataTable } from '@/components/ui/DataTable'
import { DatePicker } from '@/components/ui/DatePicker'
import { fmtDay, fmtIsoLocal, fmtTimeSec, isoDay } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { AuditEvent, AuditLog, User } from '@/types'

type Filter = 'all' | AuditEvent | 'App trip'
const APP_TRIP: AuditEvent[] = ['In Transit', 'Delivered']

/** AP-09 · Audit Trail & System Logs (read-only). */
export default function AuditTrail() {
  const { data: logs, error, reload } = useApi(() => api.audit.list())
  const { data: users } = useApi(() => api.users.list())
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  // Date range (YYYY-MM-DD, local day); empty = no limit.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const userName = (id: string) => users?.find((u) => u.id === id)?.name ?? id

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...(logs ?? [])]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter((l) => filter === 'all' || (filter === 'App trip' ? APP_TRIP.includes(l.event) : l.event === filter))
      .filter((l) => {
        const day = isoDay(new Date(l.at))
        return (!from || day >= from) && (!to || day <= to)
      })
      .filter((l) => !s || `${l.event} ${l.requestId} ${userName(l.userId)}`.toLowerCase().includes(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, q, filter, from, to, users])

  const selected = rows.find((l) => l.id === selectedId) ?? rows.find((l) => l.requestId === 'REQ-1042') ?? rows[0]

  return (
    <>
      <PageHeader
        title="Audit Trail & System Logs"
        subtitle="Chronological, tamper-proof record of every action"
        actions={
          <span className="flex items-center gap-1 rounded-[20px] bg-periwinkle-18 px-3 py-1 text-[11px] font-bold text-plum">
            <IconSparkle className="size-3" /> Read-only
          </span>
        }
      />
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search user, request, event…" className="xl:w-[300px]" />
        <FilterDropdown
          label="Event type"
          value={filter}
          onChange={setFilter}
          defaultValue="all"
          options={[
            { value: 'all', label: 'All events' },
            { value: 'Create', label: 'Create' },
            { value: 'Approve', label: 'Approve' },
            { value: 'Reject', label: 'Reject' },
            { value: 'Assign', label: 'Assign' },
            { value: 'Cancel', label: 'Cancel' },
            { value: 'App trip', label: 'App trip' },
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
      ) : !logs ? (
        <LoadingBlock />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <DataTable
            rows={rows}
            rowKey={(l) => l.id}
            onRowClick={(l) => {
              setSelectedId(l.id)
              if (window.matchMedia('(max-width: 1023px)').matches) setMobileOpen(true)
            }}
            rowClassName={(l) => l.id === selected?.id && '!bg-lime-28'}
            columns={[
              { header: 'Timestamp', cell: (l) => <span className="font-bold">{`${fmtDay(l.at)} · ${fmtTimeSec(l.at)}`}</span>, primary: true },
              { header: 'Event', cell: (l) => <EventBadge event={l.event} /> },
              { header: 'Request', cell: (l) => l.requestId },
              { header: 'User', cell: (l) => userName(l.userId) },
            ]}
          />
          <div className="hidden lg:block">{selected && <Details log={selected} users={users ?? []} />}</div>
        </div>
      )}

      <Modal open={mobileOpen && !!selected} onClose={() => setMobileOpen(false)} title="Event details" size="sm">
        {selected && <DetailsBody log={selected} users={users ?? []} />}
      </Modal>
    </>
  )
}

function EventBadge({ event }: { event: AuditEvent }) {
  const tone = event === 'Create' ? 'neutral' : event === 'In Transit' ? 'periwinkle' : statusTone(event)
  return <Badge tone={tone}>{event}</Badge>
}

function Details({ log, users }: { log: AuditLog; users: User[] }) {
  return (
    <Card title="Event details" className="lg:sticky lg:top-6">
      <DetailsBody log={log} users={users} />
    </Card>
  )
}

function DetailsBody({ log, users }: { log: AuditLog; users: User[] }) {
  const u = users.find((x) => x.id === log.userId)
  return (
    <>
      <KeyValue
        rows={[
          ['Event', log.event],
          ['Request ID', log.requestId],
          ['User ID', `${log.userId} · ${u?.name ?? ''}`],
          ['Timestamp', fmtIsoLocal(log.at)],
          ['GPS stamp', log.gps ?? '—'],
        ]}
      />
      <Link to={`/requests/${log.requestId}`} className="mt-4 inline-block text-[13px] font-bold text-violet hover:underline">
        View details ›
      </Link>
      <p className="mt-4 rounded-[16px] bg-ink-6 px-3.5 py-3 text-[11px] text-ink-60">
        Read-only view: there are no edit or delete actions anywhere on this screen.
      </p>
    </>
  )
}
