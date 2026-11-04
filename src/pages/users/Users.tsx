import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBlock, FilterDropdown, Input, LoadingBlock, Modal, PageHeader, SearchInput, Select, StatusBadge, Toggle } from '@/components/ui'
import { DataTable, RowLink } from '@/components/ui/DataTable'
import { nextUserId } from '@/lib/ids'
import { branchScope } from '@/lib/scope'
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
  const isReadOnly = user?.role === 'Maker' || user?.role === 'Checker'

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

  const where = (u: User) => {
    const branch = u.branchId ? (branches?.find((b) => b.id === u.branchId)?.name ?? u.branchId) : 'No branch'
    const team = u.teamId ? (teams?.find((t) => t.id === u.teamId)?.name ?? u.teamId) : null
    return team ? `${branch} · ${team}` : branch
  }

  // Branch Makers / Checkers only see users from their own branch.
  // Delivery members (drivers/custodians) belonging to that same branch are shown too.
  const isBranchScoped = user?.role === 'Maker' || user?.role === 'Checker'
  const scope = branches ? branchScope(user, branches) : null
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (users ?? []).filter((u) => {
      if (isBranchScoped && (!scope || u.branchId !== scope)) return false
      const okRole =
        role === 'all' ||
        // (role === 'admin' && u.role === 'Super Admin') ||
        (role === 'maker' && u.role === 'Maker') ||
        (role === 'checker' && u.role === 'Checker') ||
        (role === 'delivery' && (u.role === 'Driver' || u.role === 'Custodian'))
      return okRole && (!s || `${u.name} ${u.username} ${u.id} ${u.email}`.toLowerCase().includes(s))
    })
  }, [users, q, role, scope])

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
      ) : !users || (isBranchScoped && !branches) ? (
        <LoadingBlock />
      ) : (
        <DataTable
          rows={[...rows].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())}
          rowKey={(u) => u.id}
          onRowClick={isReadOnly ? undefined : (u) => setEditing(u)}
          // Shows ~10 rows at a time; the rest scrolls inside the table and the header stays put.
          maxHeight="calc(100dvh - 300px)"
          columns={[
            { header: 'User ID', cell: (u) => <span className="font-bold">{u.id}</span>, className: 'w-[18%]', hideOnMobile: true },
            { header: 'Name', cell: (u) => u.name, className: 'w-[22%]', primary: true },
            { header: 'Role', cell: (u) => u.role, className: 'w-[18%]' },
            { header: 'Branch / Team', cell: where, className: 'w-[26%]' },
            { header: 'Status', cell: (u) => <StatusBadge status={u.status} />, className: 'w-[16%]' },
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
  // Shown after a successful Reactivate so the Super Admin can read the
  // one-time password back to the user.
  const [reactivated, setReactivated] = useState<{ tempPassword: string; sentTo: string } | null>(null)
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

  const reactivate = async () => {
    if (!user) return
    setBusy(true)
    try {
      const res = await api.users.reactivate(user.id)
      invalidate()
      setReactivated({ tempPassword: res.tempPassword, sentTo: res.sentTo })
    } catch (err) {
      toast((err as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()

    const validationErrors: Record<string, string> = {}

    if (needsPassword) {
      if (!password) {
        validationErrors.password = 'Please enter a default password.'
      } else if (password.length < 8) {
        validationErrors.password = 'Password must be at least 8 characters.'
      } else if (!/[A-Z]/.test(password)) {
        validationErrors.password = 'Password must contain an uppercase letter.'
      } else if (!/[a-z]/.test(password)) {
        validationErrors.password = 'Password must contain a lowercase letter.'
      } else if (!/[0-9]/.test(password)) {
        validationErrors.password = 'Password must contain a number.'
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        validationErrors.password = 'Password must contain a special character.'
      }

      if (!confirm) {
        validationErrors.confirm = 'Please confirm the password.'
      } else if (password !== confirm) {
        validationErrors.confirm = 'Passwords do not match.'
      }
    }

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setBusy(true)
    try {
      const payload = { ...form, ...(needsPassword ? { password } : {}) }
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

  const isLocked = user?.status === 'Locked'

  if (reactivated) {
    return (
      <Modal
        open
        onClose={() => { setReactivated(null); onClose() }}
        size="sm"
        title="Account reactivated"
        subtitle={`${form.name} can sign in with the one-time password below. They'll be forced to change it immediately.`}
        footer={
          <>
            <Button variant="ghost" onClick={async () => { await navigator.clipboard.writeText(reactivated.tempPassword).catch(() => { }); toast('Copied to clipboard.') }}>
              Copy password
            </Button>
            <Button onClick={() => { setReactivated(null); onClose() }}>Done</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-[18px] bg-periwinkle-18 px-4 py-3">
            <p className="text-[11px] font-bold text-plum">One-time password</p>
            <p className="mt-1 font-mono text-[18px] font-bold tracking-[0.1em] text-ink select-all">{reactivated.tempPassword}</p>
          </div>
          <p className="text-[12px] text-ink-60">
            Sent to <b>{reactivated.sentTo}</b>. Share it with the user if the email didn't arrive. They can change it to anything they like on their first sign-in.
          </p>
        </div>
      </Modal>
    )
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
          {isLocked && (
            <Button variant="danger-soft" onClick={reactivate} loading={busy}>
              Reactivate &amp; reset password
            </Button>
          )}
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
        {form.role && (
          <Select
            label="Branch"
            placeholder="Select branch"
            value={form.branchId ?? ''}
            onChange={(e) => set('branchId', e.target.value || null)}
            options={branchOptions}
            error={errors.branchId}
            required
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
              // hint={
              //   isDelivery
              //     ? 'For the CashRoute mobile app. Share it with the team member; they can change it after signing in.'
              //     : 'Share it with the user; they can change it after signing in.'
              // }
              hint="At least 8 characters, including uppercase, lowercase, number, and special character."
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
        {isDelivery && (
          <p className="text-[12px] text-ink-60">
            Delivery staff are grouped under Users & Teams → Delivery Teams, with teammates from the same branch.
          </p>
        )}
        {/* Status is read-only while the account is Locked — flipping to Active would
            leave the user with no password. Super Admin must use Reactivate &
            reset password instead, which generates a one-time password and emails
            it. For Active accounts you can still freely toggle Locked here. */}
        <div className="flex flex-col gap-1">
          <Toggle
            checked={form.status === 'Active'}
            onChange={(v) => set('status', v ? 'Active' : 'Locked')}
            disabled={isLocked}
            label={`Status: ${form.status}`}
          />
          {isLocked && (
            <p className="text-[11px] text-ink-60">
              Account is locked. Use <b>Reactivate &amp; reset password</b> below — a new password is generated and emailed to the user, and the status flips back to Active automatically.
            </p>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
