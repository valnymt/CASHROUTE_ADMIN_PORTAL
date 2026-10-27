import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBlock, FilterDropdown, Input, LoadingBlock, Modal, PageHeader, SearchInput, Select, StatusBadge, Toggle } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { nextUserId } from '@/lib/ids'
import { api, ApiError, type UserInput } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi, useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { Role, User } from '@/types'
import UsersTabs from './UsersTabs'

type RoleFilter = 'all' | 'admin' | 'maker' | 'checker' | 'delivery'
const ROLES: Role[] = ['Maker', 'Checker', 'Driver', 'Custodian']

/** AP-03 · User Accounts + Add/Edit User modal. */
export default function Users() {
  //adding readonly for Maker
  const { user } = useAuth()
  const isReadOnly = user?.role === 'Maker'

  const { data: users, error, reload } = useApi(() => api.users.list())
  const { data: branches } = useApi(() => api.branches.list())
  const { data: teams } = useApi(() => api.teams.list())
  const [q, setQ] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()

  // The modal is part of the URL: /users/create and /users/{id}/edit.
  const editing: User | 'new' | null = isReadOnly
    ? null
    : pathname.endsWith('/create')
      ? 'new'
      : id
        ? (users?.find((u) => u.id.toLowerCase() === id.toLowerCase()) ?? null)
        : null
  const setEditing = (u: User | 'new' | null) =>
    navigate(u === null ? '/users' : u === 'new' ? '/users/create' : `/users/${u.id}/edit`)

  const where = (u: User) =>
    u.teamId
      ? (teams?.find((t) => t.id === u.teamId)?.name ?? u.teamId)
      : u.branchId
        ? (branches?.find((b) => b.id === u.branchId)?.name ?? u.branchId)
        : 'Unassigned'

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (users ?? []).filter((u) => {
      const okRole =
        role === 'all' ||
        // (role === 'admin' && u.role === 'Super Admin') ||
        (role === 'maker' && u.role === 'Maker') ||
        (role === 'checker' && u.role === 'Checker') ||
        (role === 'delivery' && (u.role === 'Driver' || u.role === 'Custodian'))
      return okRole && (!s || `${u.name} ${u.username} ${u.id} ${u.email}`.toLowerCase().includes(s))
    })
  }, [users, q, role])

  return (
    <>
      <UsersTabs />
      <PageHeader
        title="User Accounts"
        subtitle="Assign roles, channels and statuses"
        // actions={<Button onClick={() => setEditing('new')}>+ Add User</Button>}
        actions={
          !isReadOnly ? (
            <Button onClick={() => setEditing('new')}>+ Add User</Button>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or username…" className="sm:w-[320px]" />
        <FilterDropdown
          label="Role"
          value={role}
          onChange={setRole}
          defaultValue="all"
          options={[
            { value: 'all', label: 'All roles' },
            // { value: 'admin', label: 'Super Admin' },
            { value: 'maker', label: 'Maker' },
            { value: 'checker', label: 'Checker' },
            { value: 'delivery', label: 'Delivery' },
          ]}
        />
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : !users ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(u) => u.id}
          // onRowClick={(u) => setEditing(u)}
          onRowClick={isReadOnly ? undefined : (u) => setEditing(u)}
          columns={[
            { header: 'User ID', cell: (u) => <span className="font-bold">{u.id}</span>, hideOnMobile: true },
            { header: 'Name', cell: (u) => u.name, primary: true },
            { header: 'Role', cell: (u) => u.role },
            {
              header: 'Password',
              cell: (u) => (u.password ? <span className="font-mono text-[12px]">{u.password}</span> : <span className="text-ink-38">—</span>),
              hideOnMobile: true,
            },
            { header: 'Branch / Team', cell: where },
            { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
          ]}
          // action={(u) => <RowLink onClick={() => setEditing(u)}>Edit ›</RowLink>}
          action={
            isReadOnly
              ? undefined
              : (u) => <RowLink onClick={() => setEditing(u)}>Edit ›</RowLink>
          }
        />
      )}

      {editing && (
        <UserForm
          key={editing === 'new' ? 'new' : editing.id}
          user={editing === 'new' ? null : editing}
          branchOptions={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
          nextId={nextUserId(users ?? [])}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function UserForm({
  user,
  branchOptions,
  nextId,
  onClose,
}: {
  user: User | null
  branchOptions: { value: string; label: string }[]
  /** ID the new user will get (Add mode). */
  nextId: string
  onClose: () => void
}) {
  const invalidate = useInvalidate()
  const toast = useToast()
  const [form, setForm] = useState<UserInput>(
    user ?? { name: '', role: '' as Role, mobile: '', email: '', status: 'Active', branchId: null, teamId: null },
  )
  const employeeId = user?.id ?? nextId
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const isDelivery = form.role === 'Driver' || form.role === 'Custodian'
  /** Every new user gets a default password: portal roles sign in to the portal, delivery staff to the mobile app. */
  const needsPassword = !user

  const set = <K extends keyof UserInput>(k: K, v: UserInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => {
      const next = { ...e }
      delete next[k as string]
      return next
    })
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (needsPassword && password && password !== confirm) {
      setErrors((x) => ({ ...x, confirm: 'Passwords do not match.' }))
      return
    }
    setBusy(true)
    try {
      const payload = { ...form, branchId: isDelivery ? null : form.branchId, ...(needsPassword ? { password } : {}) }
      if (user) await api.users.update(user.id, payload)
      else await api.users.create(payload)
      invalidate()
      toast(`${form.name} ${user ? 'updated' : 'added'}.`)
      onClose()
    } catch (err) {
      const ae = err as ApiError
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? 'Edit User' : 'Add User'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} loading={busy}>
            Save User
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" placeholder="e.g. Amy Tan" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
          <Input label="Employee ID" placeholder="e.g. U-1234" value={employeeId} disabled hint={user ? undefined : 'Assigned automatically — this is the ID the new user will get'} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mobile number" type="tel" placeholder="+95 …" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} />
          <Input label="Email" type="email" placeholder="name@bank.com" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required />
        </div>
        <Select
          label="Role"
          placeholder="Select role"
          value={form.role}
          onChange={(e) => set('role', e.target.value as Role)}
          options={ROLES.map((r) => ({ value: r, label: r }))}
          error={errors.role}
          required
        />
        {form.role && !isDelivery && (
          <Select
            label="Branch"
            placeholder="Select branch"
            value={form.branchId ?? ''}
            onChange={(e) => set('branchId', e.target.value || null)}
            options={branchOptions}
          />
        )}
        {needsPassword && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Default password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors(({ password: _p, ...x }) => x)
              }}
              error={errors.password}
              hint={
                isDelivery
                  ? 'For the CashRoute mobile app. Share it with the team member; they can change it after signing in.'
                  : 'Share it with the user; they can change it after signing in.'
              }
              required
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Type it again"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                setErrors(({ confirm: _c, ...x }) => x)
              }}
              error={errors.confirm}
              required
            />
          </div>
        )}
        {isDelivery && <p className="text-[12px] text-ink-60">Delivery staff are grouped under Users & Teams → Delivery Teams.</p>}
        <Toggle
          checked={form.status === 'Active'}
          onChange={(v) => set('status', v ? 'Active' : 'Locked')}
          label={`Status: ${form.status}`}
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
