import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Tiny data layer: `useApi` loads data and re-runs whenever `invalidate()` is
 * called after a mutation, so every screen (and the sidebar badges) stays in
 * sync without a global store. Swappable for React Query later if needed.
 */

const VersionCtx = createContext<{ version: number; invalidate: () => void }>({
  version: 0,
  invalidate: () => {},
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const invalidate = useCallback(() => setVersion((v) => v + 1), [])
  return <VersionCtx.Provider value={{ version, invalidate }}>{children}</VersionCtx.Provider>
}

export const LIVE_STATUS_OPTIONS = { pollMs: 5_000 }

export const useInvalidate = () => useContext(VersionCtx).invalidate

export interface ApiState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = [], opts: { pollMs?: number } = {}): ApiState<T> {
  const { version } = useContext(VersionCtx)
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>({
    data: undefined,
    loading: true,
    error: null,
  })
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let alive = true
    let inFlight = false

    const refresh = async (background: boolean) => {
      if (inFlight || (background && document.hidden)) return
      inFlight = true
      if (!background) setState((s) => ({ ...s, loading: true, error: null }))

      try {
        const data = await fetcherRef.current()
        if (alive) setState({ data, loading: false, error: null })
      } catch (error) {
        if (alive && !background) setState((s) => ({ ...s, loading: false, error: error as Error }))
      } finally {
        inFlight = false
      }
    }

    void refresh(false)
    const onVisible = () => { void refresh(true) }
    const timer = opts.pollMs ? window.setInterval(onVisible, opts.pollMs) : undefined
    if (opts.pollMs) document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, opts.pollMs, ...deps])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
