import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import AuthLayout from '@/layouts/AuthLayout'
import { DEMO_PASSWORD } from '@/lib/seed'
import { api, ApiError, USE_MOCK_API } from '@/services/api'
import { demoUnlock } from '@/services/mockApi'
import { useAuth } from '@/store/auth'

/** AP-01 · Login / Account Locked. Session Timeout lives in IdleTimeout.tsx. */
export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; expired?: boolean } | null

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(state?.expired ? 'Your session ended after a period of inactivity. Please sign in again.' : null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState(false)

  document.title = 'Sign in · CashRoute HQ Admin'
  if (user && !busy) return <Navigate to={state?.from ?? '/live'} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await login(username, password)
      navigate(state?.from ?? '/live', { replace: true })
    } catch (err) {
      const ae = err as ApiError
      if (ae.code === 'locked') setLocked(true)
      else {
        setError(ae.message)
        setFieldErrors(ae.fields ?? {})
      }
      setBusy(false)
    }
  }

  const simulate = async () => {
    const name = username.trim() || 'admin.maker'
    setUsername(name)
    setPassword('•••••••••')
    await api.auth.simulateLockout(name).catch(() => {})
    setLocked(true)
  }

  const backToLogin = () => {
    if (USE_MOCK_API) demoUnlock(username || 'admin.maker')
    setLocked(false)
    setPassword('')
    setError(null)
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-[28px] font-bold text-plum">Welcome back</h1>
      <p className="mt-0.5 text-[13px] text-ink-60">Sign in to manage cash-in-transit operations</p>

      {locked && (
        <div role="alert" className="mt-5 rounded-[18px] border border-[rgba(229,72,77,0.4)] bg-danger-12 p-3.5">
          <p className="text-[13px] font-bold text-danger">Account locked</p>
          <p className="mt-0.5 text-[12px] text-ink-60">
            Too many failed attempts. A notification has been sent to the Super Admin to unlock your account.
          </p>
        </div>
      )}
      {!locked && error && (
        <div role="alert" className="mt-5 rounded-[18px] border border-[rgba(229,72,77,0.4)] bg-danger-12 px-3.5 py-3 text-[12px] font-semibold text-danger">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <Input
          label="Username"
          placeholder="Enter username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
          disabled={locked}
          autoFocus
        />
        <div className="relative">
          <Input
            label="Password"
            placeholder="Enter password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={locked}
            className="[&_input]:pr-16"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            disabled={locked}
            className="absolute top-[34px] right-4 text-[12px] font-bold text-violet disabled:text-ink-38"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <Button type="submit" loading={busy} disabled={locked} className="mt-1 w-full">
          Sign in
        </Button>
      </form>

      {locked ? (
        <>
          <Button variant="ghost" className="mt-3 w-full" onClick={backToLogin}>
            Back to login
          </Button>
          <p className="mt-5 text-[12px] text-ink-60">Need help? Contact your Super Admin.</p>
        </>
      ) : (
        <>
          {USE_MOCK_API && (
            <button type="button" onClick={simulate} className="mx-auto mt-5 block text-[13px] font-bold text-violet hover:underline">
              Demo: simulate 5 failed attempts
            </button>
          )}
          <p className="mt-5 text-[12px] text-ink-60">Sessions end automatically after a period of inactivity.</p>
          {USE_MOCK_API && (
            <p className="mt-2 text-[11px] text-ink-38">
              Demo login: <span className="font-semibold text-ink-60">admin.maker</span> /{' '}
              <span className="font-semibold text-ink-60">{DEMO_PASSWORD}</span>
            </p>
          )}
        </>
      )}
    </AuthLayout>
  )
}
