import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconSparkle } from '@/components/icons'
import { Badge, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { fmtAge, fmtDay, fmtMoney } from '@/lib/format'
import { branchScope } from '@/lib/scope'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import type { CashRequest } from '@/types'

type Tab = 'all' | 'pending' | 'approved' | 'assign' | 'reassign' | 'in_transit'

const TABS: Tab[] = [
  'all',
  'pending',
  'approved',
  'assign',
  'reassign',
  'in_transit',
]

const isReassign = (r: CashRequest) =>
  r.status === 'Assigned' &&
  r.canReassign === true &&
  r.timeline.some((t) => t.label.startsWith('Reassigned to '))

const isAssign = (r: CashRequest) =>
  r.status === 'Assigned' &&
  !isReassign(r)

const isApprovalRequest = (r: CashRequest) =>
  r.status === 'Pending' ||
  r.status === 'Approved' ||
  isAssign(r) ||
  isReassign(r) ||
  r.status === 'In Transit'

/** Only Checker cancels belong here — a Maker withdrawing their own Pending request stays in All Requests. */
const checkerCancelled = (r: CashRequest) =>
  r.status === 'Cancelled' &&
  (r.cancelledBy ? r.cancelledBy === 'Checker' : r.timeline.some((t) => t.label.startsWith('Cancelled by Checker')))

/** AP-06 · Pending Approvals. */
export default function Approvals() {
  const { user } = useAuth()
  const isReadOnly = user?.role === 'Super Admin'
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

  // Branch Checkers only see requests from their own branch; Super Admin and HQ see every branch.
  // const scope = branches ? branchScope(user, branches) : null
  // const visible = useMemo(() => (requests ?? []).filter((r) => !scope || r.branchId === scope), [requests, scope])
  // Branch Checkers only see requests from their own branch.
  // Super Admin and HQ users can see every branch.
  const isBranchScoped = user?.role === 'Checker' || user?.role === 'Maker'
  const scope = branches ? branchScope(user, branches) : null

  const visible = useMemo(
    () =>
      (requests ?? []).filter((r) =>
        isBranchScoped ? Boolean(scope) && r.branchId === scope : true,
      ),
    [requests, scope, isBranchScoped],
  )

  const counts = useMemo(() => {
    const r = visible
    return {
      all: r.filter(isApprovalRequest).length,
      pending: r.filter((x) => x.status === 'Pending').length,
      approved: r.filter((x) => x.status === 'Approved').length,
      assign: r.filter(isAssign).length,
      reassign: r.filter(isReassign).length,
      in_transit: r.filter((x) => x.status === 'In Transit').length,
    }
  }, [visible])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()

    return visible
      .filter((r) =>
        tab === 'all'
          ? isApprovalRequest(r)
          : tab === 'pending'
            ? r.status === 'Pending'
            : tab === 'approved'
              ? r.status === 'Approved'
              : tab === 'assign'
                ? isAssign(r)
                : tab === 'reassign'
                  ? isReassign(r)
                  : r.status === 'In Transit',
      )
      .filter((r) =>
        !s || `${r.id} ${branchShort(r.branchId)} ${r.type}`.toLowerCase().includes(s),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tab, q, branches])

  return (
    <>
      <PageHeader
        title="Pending Requests"
        subtitle={
          scope
            ? `Review and approve or reject requests from ${branchShort(scope)} branch`
            : 'Review and approve or reject requests created by Makers'
        }
      />
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search request ID or branch…" className="sm:w-[320px]" />
        <FilterDropdown
          label="Status"
          value={tab}
          onChange={setTab}
          defaultValue="all"
          options={[
            { value: 'all', label: `All · ${counts.all}` },
            { value: 'pending', label: `Pending · ${counts.pending}` },
            { value: 'approved', label: `Approved · ${counts.approved}` },
            { value: 'assign', label: `Assign · ${counts.assign}` },
            { value: 'reassign', label: `Reassign · ${counts.reassign}` },
            { value: 'in_transit', label: `In Transit · ${counts.in_transit}` },
          ]}
        />
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !requests || (isBranchScoped && !branches) ? (
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
          // action={(r) => (
          //   <RowLink onClick={() => navigate(`/approvals/${r.id}`)}>
          //     {r.status === 'Pending' && r.createdBy !== user?.id ? 'Review ›' : 'View ›'}
          //   </RowLink>
          action={(r) => (
            <RowLink onClick={() => navigate(`/approvals/${r.id}`)}>
              {isReadOnly
                ? 'View ›'
                : r.status === 'Pending' && r.createdBy !== user?.id
                  ? 'Review ›'
                  : 'View ›'}
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
