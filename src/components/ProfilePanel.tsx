import { useState, type FormEvent } from 'react'
import { Avatar, Button, Input, KeyValue, Modal } from '@/components/ui'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import { useToast } from '@/store/toast'

/**
 * Clicked from the sidebar's user chip. Shows the signed-in user's identity
 * details plus an inline Change-password form so password management lives in
 * one popup rather than on its own screen.
 */
export default function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const { data: branches } = useApi(() => api.branches.list())

  const [mode, setMode] = useState<'details' | 'password'>('details')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const close = () => {
    setMode('details')
    setCurrent('')
    setNext('')
    setConfirm('')
    setErrors({})
    onClose()
  }

  if (!user) return null

  const branchName = user.branchId ? (branches?.find((b) => b.id === user.branchId)?.name ?? user.branchId) : '—'

  const requirements = [
    { label: 'At least 8 characters', valid: next.length >= 8 },
    { label: 'One uppercase letter (A–Z)', valid: /[A-Z]/.test(next) },
    { label: 'One lowercase letter (a–z)', valid: /[a-z]/.test(next) },
    { label: 'One number (0–9)', valid: /[0-9]/.test(next) },
    { label: 'One special character (!@#$%^&*)', valid: /[^A-Za-z0-9]/.test(next) },
  ]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v: Record<string, string> = {}
    if (!current) v.current_password = 'Enter your current password.'
    if (!next) v.password = 'Enter a new password.'
    else if (requirements.some((r) => !r.valid)) v.password = 'Your password must meet all the requirements below.'
    else if (next === current) v.password = 'Choose a password different from the current one.'
    if (next && confirm !== next) v.confirm = 'Passwords do not match.'
    setErrors(v)
    if (Object.keys(v).length) return

    setBusy(true)
    try {
      await api.auth.changePassword(current, next)
      toast('Password changed. Use the new one next time you sign in.')
      close()
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
      open={open}
      onClose={close}
      size="sm"
      title={mode === 'details' ? 'Your profile' : 'Change password'}
      subtitle={mode === 'details' ? 'The account signed in to this portal.' : 'Replace the password you were given with your own.'}
      footer={
        mode === 'details' ? (
          <>
            <Button variant="ghost" onClick={close}>Close</Button>
            <Button onClick={() => setMode('password')}>Change password</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setMode('details')}>← Back</Button>
            <Button onClick={submit} loading={busy}>Save password</Button>
          </>
        )
      }
    >
      {mode === 'details' ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={56} />
            <div>
              <p className="text-[16px] font-bold text-ink">{user.name}</p>
              <p className="text-[12px] text-ink-60">{user.role} · {user.id}</p>
            </div>
          </div>
          <KeyValue
            rows={[
              ['Username', user.username],
              ['Email', user.email || '—'],
              ['Mobile', user.mobile || '—'],
              ['Branch', branchName],
              ['Status', user.status],
            ]}
          />
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setErrors(({ current_password: _, ...r }) => r) }}
            error={errors.current_password}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={next}
            onChange={(e) => { setNext(e.target.value); setErrors(({ password: _, ...r }) => r) }}
            error={errors.password}
            required
          />
          <div className="rounded-[16px] bg-ink-6 p-3">
            <p className="mb-1.5 text-[12px] font-semibold text-ink">Password requirements</p>
            <ul className="grid gap-0.5 text-[12px]">
              {requirements.map((r) => (
                <li key={r.label} className={r.valid ? 'text-lime-dark' : 'text-ink-60'}>
                  <span aria-hidden>{r.valid ? '✓' : '○'}</span> {r.label}
                </li>
              ))}
            </ul>
          </div>
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors(({ confirm: _, ...r }) => r) }}
            error={errors.confirm}
            required
          />
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  )
}
