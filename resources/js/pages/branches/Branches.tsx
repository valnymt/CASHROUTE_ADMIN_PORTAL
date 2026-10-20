import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, ChipGroup, ErrorBlock, LoadingBlock, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
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
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)

  // Deep link from global search: /branches?edit=BR-001
  useEffect(() => {
    const id = params.get('edit')
    if (id && data) {
      const b = data.find((x) => x.id === id)
      if (b) setEditing(b)
      setParams({}, { replace: true })
    }
  }, [params, data, setParams])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data ?? []).filter(
      (b) =>
        (status === 'all' || (status === 'active') === b.active) &&
        (!s || `${b.code} ${b.name} ${b.address} ${b.contactName}`.toLowerCase().includes(s)),
    )
  }, [data, q, status])

  const nextCode = useMemo(() => {
    const nums = (data ?? []).map((b) => Number(b.code.match(/^BR-(\d+)$/)?.[1] ?? 0))
    return `BR-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
  }, [data])

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
            { header: 'Type', cell: (b) => <Badge tone={b.type === 'HQ' ? 'periwinkle' : 'neutral'}>{b.type}</Badge> },
            { header: 'Status', cell: (b) => <StatusBadge status={b.active ? 'Active' : 'Inactive'} /> },
          ]}
          action={(b) => <RowLink onClick={() => setEditing(b)}>Edit ›</RowLink>}
        />
      )}

      {editing && (
        <BranchForm
          branch={editing === 'new' ? null : editing}
          defaultCode={nextCode}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
