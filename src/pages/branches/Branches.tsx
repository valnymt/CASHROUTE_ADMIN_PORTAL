import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, ChipGroup, ErrorBlock, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { api } from '@/services/api'
import { useApi } from '@/store/data'
import type { Branch } from '@/types'
import BranchForm from './BranchForm'

type StatusFilter = 'all' | 'active' | 'inactive'

/** AP-02 · Branch List + Add/Edit Branch modal. */
export default function Branches() {
  const { data, error, reload } = useApi(() => api.branches.list())
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()

  // The modal is part of the URL: /branches/create and /branches/{id}/edit.
  const editing: Branch | 'new' | null = pathname.endsWith('/create')
    ? 'new'
    : id
      ? (data?.find((b) => b.id.toLowerCase() === id.toLowerCase()) ?? null)
      : null
  const setEditing = (b: Branch | 'new' | null) =>
    navigate(b === null ? '/branches' : b === 'new' ? '/branches/create' : `/branches/${b.id}/edit`)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data ?? []).filter(
      (b) =>
        (status === 'all' || (status === 'active') === b.active) &&
        (!s || `${b.code} ${b.name} ${b.address} ${b.contactName}`.toLowerCase().includes(s)),
    )
  }, [data, q, status])

  return (
    <>
      <PageHeader
        title="Branch Registration & Geo-Fencing"
        subtitle="Register branches and define handover zones"
        actions={<Button onClick={() => setEditing('new')}>+ Add Branch</Button>}
      />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search by code or name…" className="sm:w-[320px]" />
        <ChipGroup
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(b) => b.id}
          onRowClick={(b) => setEditing(b)}
          columns={[
            { header: 'Code', cell: (b) => <span className="font-bold">{b.code}</span>, hideOnMobile: true },
            { header: 'Name', cell: (b) => b.name, primary: true },
            { header: 'Address', cell: (b) => b.address, className: 'max-w-[240px] truncate' },
            { header: 'Radius', cell: (b) => `${b.radius} m` },
            { header: 'Handover contact', cell: (b) => b.contactName },
            { header: 'Status', cell: (b) => <StatusBadge status={b.active ? 'Active' : 'Inactive'} /> },
          ]}
          action={(b) => <RowLink onClick={() => setEditing(b)}>Edit ›</RowLink>}
        />
      )}

      {editing && (
        <BranchForm
          key={editing === 'new' ? 'new' : editing.id}
          branch={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
