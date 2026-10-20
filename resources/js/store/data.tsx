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

export const useInvalidate = () => useContext(VersionCtx).invalidate

export interface ApiState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
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
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcherRef
      .current()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
