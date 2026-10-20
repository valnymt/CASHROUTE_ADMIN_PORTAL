import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from '@/components/ui'
import { useAuth } from '@/store/auth'

/**
 * AP-01 · Session Timeout. After IDLE_MIN minutes without input a warning
 * appears; if nobody answers within WARN_SEC the user is signed out.
 */
const IDLE_MIN = Number(import.meta.env.VITE_IDLE_TIMEOUT_MIN ?? 15)
const WARN_SEC = 30

const IdleCtx = createContext<{ trigger: () => void }>({ trigger: () => {} })
export const useIdleTimeout = () => useContext(IdleCtx)

export function IdleTimeoutProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [warning, setWarning] = useState(false)
  const [left, setLeft] = useState(WARN_SEC)
  const idleTimer = useRef<number>(0)

  const arm = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      setLeft(WARN_SEC)
      setWarning(true)
    }, IDLE_MIN * 60_000)
  }, [])

  // Any activity re-arms the idle timer (but not while the warning is shown).
  useEffect(() => {
    if (warning) return
    arm()
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const
    let last = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - last > 1000) {
        last = now
        arm()
      }
    }
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => {
      window.clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [warning, arm])

  const signOut = useCallback(
    async (expired: boolean) => {
      setWarning(false)
      await logout()
      navigate('/login', { replace: true, state: expired ? { expired: true } : undefined })
    },
    [logout, navigate],
  )

  useEffect(() => {
    if (!warning) return
    if (left <= 0) {
      signOut(true)
      return
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [warning, left, signOut])

  const trigger = useCallback(() => {
    setLeft(WARN_SEC)
    setWarning(true)
  }, [])

  return (
    <IdleCtx.Provider value={{ trigger }}>
      {children}
      <Modal
        open={warning}
        onClose={() => setWarning(false)}
        size="sm"
        title="Are you still there?"
        footer={
          <>
            <Button variant="ghost" onClick={() => signOut(false)}>
              Log out
            </Button>
            <Button onClick={() => setWarning(false)}>Stay signed in</Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-60">
          You have been inactive for a while. For security, you will be signed out automatically in{' '}
          <span className="font-bold text-ink tabular-nums">0:{String(Math.max(left, 0)).padStart(2, '0')}</span>.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-6">
          <div
            className="h-full rounded-full bg-lime shadow-glow-lime transition-[width] duration-1000 ease-linear"
            style={{ width: `${(left / WARN_SEC) * 100}%` }}
          />
        </div>
      </Modal>
    </IdleCtx.Provider>
  )
}
