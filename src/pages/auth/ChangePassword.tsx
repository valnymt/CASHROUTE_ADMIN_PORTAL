import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, PageHeader } from '@/components/ui'
import { DEMO_PASSWORD } from '@/lib/seed'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'

/**
 * Signed-in portal user replaces their own password (e.g. the default one set in Add User).
 * UI only for now: it saves through the normal user update, so User Accounts shows the new
 * password. A dedicated password endpoint comes with the backend.
 */
export default function ChangePassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const invalidate = useInvalidate()
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const f: Record<string, string> = {}
    if (!current) f.current = 'Enter your current password.'
    if (!next) f.password = 'Enter a new password.'
    else if (next.length < 8) f.password = 'New password must be at least 8 characters.'
    else if (next === current) f.password = 'Choose a password different from the current one.'
    if (next && confirm !== next) f.confirm = 'Passwords do not match.'
    setErrors(f)
    if (Object.keys(f).length || !user) return
    setBusy(true)
    try {
      // Read the latest record so a password changed earlier in this session is respected.
      const fresh = (await api.users.list()).find((u) => u.id === user.id) ?? user
      if (current !== (fresh.password ?? DEMO_PASSWORD)) {
        setErrors({ current: 'Current password is incorrect.' })
        return
      }
      const { id, username: _u, ...rest } = fresh
      await api.users.update(id, { ...rest, password: next })
      invalidate()
      toast('Password changed. Use the new one next time you sign in.')
      navigate(-1)
    } catch (err) {
      const ae = err as ApiError
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const clear = (k: string) => setErrors(({ [k]: _drop, ...rest }) => rest)

  return (
    <>
      <PageHeader title="Change password" subtitle="Replace the default password you were given with your own" />
      <Card className="max-w-[520px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value)
              clear('current')
            }}
            error={errors.current}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={next}
            onChange={(e) => {
              setNext(e.target.value)
              clear('password')
            }}
            error={errors.password}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              clear('confirm')
            }}
            error={errors.confirm}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Save password
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
