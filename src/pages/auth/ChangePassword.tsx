import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, PageHeader } from '@/components/ui'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'

/**
 * Signed-in portal user replaces their own password.
 * Calls POST /api/me/password (demo mode: equivalent helper on mockApi).
 */
export default function ChangePassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const clear = (k: string) => setErrors(({ [k]: _drop, ...rest }) => rest)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const f: Record<string, string> = {}
    if (!current) f.current_password = 'Enter your current password.'
    if (!next) f.password = 'Enter a new password.'
    else if (next.length < 8) f.password = 'New password must be at least 8 characters.'
    else if (next === current) f.password = 'Choose a password different from the current one.'
    if (next && confirm !== next) f.confirm = 'Passwords do not match.'
    setErrors(f)
    if (Object.keys(f).length || !user) return
    setBusy(true)
    try {
      await api.auth.changePassword(current, next)
      toast('Password changed. Use the new one next time you sign in.')
      navigate(-1)
    } catch (err) {
      const ae = err as ApiError
      // Backend returns `current_password` / `password` in `fields`.
      setErrors(ae.fields ?? {})
      toast(ae.message, 'error')
    } finally {
      setBusy(false)
    }
  }

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
              clear('current_password')
            }}
            error={errors.current_password}
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
