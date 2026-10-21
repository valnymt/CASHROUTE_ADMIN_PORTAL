import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto glass-strong animate-pop-in flex max-w-sm items-start gap-2.5 rounded-[18px] px-4 py-3 text-[13px] font-semibold',
              t.tone === 'error' && 'text-danger',
              t.tone === 'success' && 'text-ink',
              t.tone === 'info' && 'text-violet',
            )}
          >
            <span
              className={cn(
                'mt-1 size-2 shrink-0 rounded-full',
                t.tone === 'success' && 'bg-lime shadow-glow-lime',
                t.tone === 'error' && 'bg-danger',
                t.tone === 'info' && 'bg-violet shadow-glow-violet',
              )}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
