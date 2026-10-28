import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBlock, FilterDropdown, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import type { Branch } from '@/types'
import BranchForm from './BranchForm'

type StatusFilter = 'all' | 'active' | 'inactive'

/** AP-02 · Branch List + Add/Edit Branch modal. */
export default function Branches() {

  //check if it is a checker 
  const { user } = useAuth()
  const isReadOnly = user?.role === 'Checker' || user?.role === 'Maker'

  const { data, error, reload } = useApi(() => api.branches.list())
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()

  // The modal is part of the URL: /branches/create and /branches/{id}/edit.
  // const editing: Branch | 'new' | null = pathname.endsWith('/create')
  //   ? 'new'
  //   : id
  //     ? (data?.find((b) => b.id.toLowerCase() === id.toLowerCase()) ?? null)
  //     : null
  // The modal is part of the URL: /branches/create and /branches/{id}/edit.
  const canManageBranches = !isReadOnly

  const editing: Branch | 'new' | null = !canManageBranches
    ? null
    : pathname.endsWith('/create')
      ? 'new'
      : id
        ? (data?.find((b) => b.id.toLowerCase() === id.toLowerCase()) ?? null)
        : null
  const setEditing = (b: Branch | 'new' | null) =>
    navigate(b === null ? '/branches' : b === 'new' ? '/branches/create' : `/branches/${b.id}/edit`)

  const counts = useMemo(() => {
    const d = data ?? []
    return { all: d.length, active: d.filter((b) => b.active).length, inactive: d.filter((b) => !b.active).length }
  }, [data])

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
        // actions={<Button onClick={() => setEditing('new')}>+ Add Branch</Button>}
        actions={
          !isReadOnly ? (
            <Button onClick={() => setEditing('new')}>+ Add Branch</Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search by code or name…" className="sm:w-[320px]" />
        <FilterDropdown
          label="Status"
          value={status}
          onChange={setStatus}
          defaultValue="all"
          options={[
            { value: 'all', label: `All · ${counts.all}` },
            { value: 'active', label: `Active · ${counts.active}` },
            { value: 'inactive', label: `Inactive · ${counts.inactive}` },
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
          //onRowClick={(b) => setEditing(b)}
          onRowClick={isReadOnly ? undefined : (b) => setEditing(b)}
          columns={[
            { header: 'Code', cell: (b) => <span className="font-bold">{b.code}</span>, hideOnMobile: true },
            { header: 'Name', cell: (b) => b.name, primary: true },
            { header: 'Address', cell: (b) => b.address, className: 'max-w-[240px] truncate' },
            { header: 'Radius', cell: (b) => `${b.radius} m` },
            { header: 'Handover contact', cell: (b) => b.contactName },
            { header: 'Status', cell: (b) => <StatusBadge status={b.active ? 'Active' : 'Inactive'} /> },
          ]}
          // action={(b) => <RowLink onClick={() => setEditing(b)}>Edit ›</RowLink>}
          action={
            isReadOnly
              ? undefined
              : (b) => <RowLink onClick={() => setEditing(b)}>Edit ›</RowLink>
          }
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
