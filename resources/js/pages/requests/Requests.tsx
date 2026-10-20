import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, ChipGroup, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { fmtDay, fmtMoney, shortSlot } from '@/lib/format'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import type { CashRequest } from '@/types'

type Scope = 'all' | 'mine'
type StatusFilter = 'all' | 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled'

const IN_PROGRESS: CashRequest['status'][] = ['Approved', 'Assigned', 'In Transit']

/** All cash requests — the Maker's "View all requests" list. */
export default function Requests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: requests, error, reload } = useApi(() => api.requests.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: users } = useApi(() => api.users.list())
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const branchShort = (id: string) => branches?.find((b) => b.id === id)?.name.replace(' Branch', '') ?? id
  const creator = (id: string) => (id === user?.id ? `${user.name} (you)` : (users?.find((u) => u.id === id)?.name ?? id))

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...(requests ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((r) => scope === 'all' || r.createdBy === user?.id)
      .filter(
        (r) =>
          status === 'all' ||
          (status === 'pending' && r.status === 'Pending') ||
          (status === 'approved' && IN_PROGRESS.includes(r.status)) ||
          (status === 'completed' && r.status === 'Delivered') ||
          (status === 'rejected' && r.status === 'Rejected') ||
          (status === 'cancelled' && r.status === 'Cancelled'),
      )
      .filter((r) => !s || `${r.id} ${branchShort(r.branchId)} ${r.type}`.toLowerCase().includes(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, q, scope, status, branches, user])

  return (
    <>
      <PageHeader
        title="All Requests"
        subtitle="Every cash request and where it is in the approval flow"
      />

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search request ID or branch…" className="lg:w-[300px]" />
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup
            label="Created by"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'All requests' },
              { value: 'mine', label: 'Created by me' },
            ]}
          />
          <FilterDropdown
            label="Status"
            value={status}
            onChange={setStatus}
            defaultValue="all"
            options={[
              { value: 'all', label: 'Any status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !requests ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/requests/${r.id}`)}
          empty="No requests match these filters."
          columns={[
            { header: 'Request ID', cell: (r) => <span className="font-bold">{r.id}</span>, primary: true },
            { header: 'Type', cell: (r) => <Badge tone={r.type === 'Deposit' ? 'periwinkle' : 'neutral'}>{r.type}</Badge> },
            { header: 'Branch', cell: (r) => branchShort(r.branchId) },
            { header: 'Amount', cell: (r) => fmtMoney(r.amount, r.currency) },
            { header: 'Requested for', cell: (r) => `${fmtDay(r.date)} · ${shortSlot(r.slot)}` },
            { header: 'Created by', cell: (r) => creator(r.createdBy) },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          ]}
          action={(r) => <RowLink onClick={() => navigate(`/requests/${r.id}`)}>View ›</RowLink>}
        />
      )}
    </>
  )
}
