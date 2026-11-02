import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, PageHeader } from '@/components/ui'
import { api, ApiError } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'

/**
 * Signed-in portal user replaces their own password.
 * Calls POST /api/me/password.
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

  const requirements = [
    { label: 'At least 8 characters', valid: next.length >= 8 },
    { label: 'One uppercase letter (A–Z)', valid: /[A-Z]/.test(next) },
    { label: 'One lowercase letter (a–z)', valid: /[a-z]/.test(next) },
    { label: 'One number (0–9)', valid: /[0-9]/.test(next) },
    {
      label: 'One special character (!@#$%^&*)',
      valid: /[^A-Za-z0-9]/.test(next),
    },
  ]

  const clear = (key: string) => {
    setErrors(({ [key]: _drop, ...rest }) => rest)
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()

    const validationErrors: Record<string, string> = {}

    if (!current) {
      validationErrors.current_password = 'Enter your current password.'
    }

    if (!next) {
      validationErrors.password = 'Enter a new password.'
    } else {
      const failedRequirements = requirements.filter((r) => !r.valid)

      if (failedRequirements.length > 0) {
        validationErrors.password =
          'Your password must meet all the requirements below.'
      } else if (next === current) {
        validationErrors.password =
          'Choose a password different from the current one.'
      }
    }

    if (next && confirm !== next) {
      validationErrors.confirm = 'Passwords do not match.'
    }

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0 || !user) return

    setBusy(true)

    try {
      await api.auth.changePassword(current, next)
      toast('Password changed. Use the new one next time you sign in.')
      navigate(-1)
    } catch (err) {
      const apiError = err as ApiError
      setErrors(apiError.fields ?? {})
      toast(apiError.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Change password"
        subtitle="Replace the default password you were given with your own"
      />

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

          <div className="rounded-xl bg-ink-6 p-3">
            <p className="mb-2 text-sm font-semibold">
              Password requirements
            </p>

            <ul className="grid gap-1 text-sm">
              {requirements.map((requirement) => (
                <li
                  key={requirement.label}
                  className={
                    requirement.valid
                      ? 'text-green-700'
                      : 'text-ink-60'
                  }
                >
                  <span aria-hidden="true">
                    {requirement.valid ? '✓' : '○'}
                  </span>{' '}
                  {requirement.label}
                </li>
              ))}
            </ul>
          </div>

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