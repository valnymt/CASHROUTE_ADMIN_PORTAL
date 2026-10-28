import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconSparkle } from '@/components/icons'
import { Badge, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { fmtAge, fmtDay, fmtMoney } from '@/lib/format'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import type { CashRequest } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected' | 'cancelled'
const TABS: Tab[] = ['pending', 'approved', 'rejected', 'cancelled']
const APPROVED: CashRequest['status'][] = ['Approved', 'Assigned', 'In Transit', 'Delivered']

/** Only Checker cancels belong here — a Maker withdrawing their own Pending request stays in All Requests. */
const checkerCancelled = (r: CashRequest) =>
  r.status === 'Cancelled' &&
  (r.cancelledBy ? r.cancelledBy === 'Checker' : r.timeline.some((t) => t.label.startsWith('Cancelled by Checker')))

/** AP-06 · Pending Approvals. */
export default function Approvals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: requests, error, reload } = useApi(() => api.requests.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: users } = useApi(() => api.users.list())
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'pending'
  const setTab = (t: Tab) => setParams(t === 'pending' ? {} : { tab: t }, { replace: true })
  const [q, setQ] = useState('')

  const branchShort = (id: string) => branches?.find((b) => b.id === id)?.name.replace(' Branch', '') ?? id
  const creator = (id: string) => (id === user?.id ? `${user.name} (you)` : (users?.find((u) => u.id === id)?.name ?? id))

  const counts = useMemo(() => {
    const r = requests ?? []
    return {
      pending: r.filter((x) => x.status === 'Pending').length,
      approved: r.filter((x) => APPROVED.includes(x.status)).length,
      rejected: r.filter((x) => x.status === 'Rejected').length,
      cancelled: r.filter(checkerCancelled).length,
    }
  }, [requests])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (requests ?? [])
      .filter((r) =>
        tab === 'pending'
          ? r.status === 'Pending'
          : tab === 'approved'
            ? APPROVED.includes(r.status)
            : tab === 'rejected'
              ? r.status === 'Rejected'
              : checkerCancelled(r),
      )
      .filter((r) => !s || `${r.id} ${branchShort(r.branchId)} ${r.type}`.toLowerCase().includes(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, tab, q, branches])

  return (
    <>
      <PageHeader
        title="Pending Requests"
        subtitle="Review and approve or reject requests created by Makers"
      />
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search request ID or branch…" className="sm:w-[320px]" />
        <FilterDropdown
          label="Status"
          value={tab}
          onChange={setTab}
          defaultValue="pending"
          options={[
            { value: 'pending', label: `Pending · ${counts.pending}` },
            { value: 'approved', label: `Approved · ${counts.approved}` },
            { value: 'rejected', label: `Rejected · ${counts.rejected}` },
            { value: 'cancelled', label: `Cancelled · ${counts.cancelled}` },
          ]}
        />
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !requests ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/approvals/${r.id}`)}
          rowClassName={(r) => r.createdBy === user?.id && r.status === 'Pending' && '!bg-lime-28'}
          empty={tab === 'pending' ? 'No requests waiting for approval.' : 'Nothing here yet.'}
          columns={[
            { header: 'Request ID', cell: (r) => <span className="font-bold">{r.id}</span>, primary: true },
            { header: 'Type', cell: (r) => <Badge tone={r.type === 'Deposit' ? 'periwinkle' : 'neutral'}>{r.type}</Badge> },
            { header: 'Branch', cell: (r) => branchShort(r.branchId) },
            { header: 'Amount', cell: (r) => fmtMoney(r.amount, r.currency) },
            { header: 'Requested for', cell: (r) => `${fmtDay(r.date)} · ${r.slot}` },
            { header: 'Created by', cell: (r) => creator(r.createdBy) },
            { header: 'Age', cell: (r) => fmtAge(r.createdAt), hideOnMobile: true },
            { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          ]}
          action={(r) => (
            <RowLink onClick={() => navigate(`/approvals/${r.id}`)}>
              {r.status === 'Pending' && r.createdBy !== user?.id ? 'Review ›' : 'View ›'}
            </RowLink>
          )}
        />
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-ink-60">
        <IconSparkle className="size-3 text-violet" /> Highlighted row = created by you (Maker-Checker guard applies).
      </p>
    </>
  )
}
