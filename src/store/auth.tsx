import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/services/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  ready: boolean
  /** True after the user explicitly logged out (or timed out) in this tab. */
  loggedOut: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
  isMaker: boolean
  isChecker: boolean
  isSuperAdmin: boolean
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [loggedOut, setLoggedOut] = useState(false)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.auth.login(username, password)
    setLoggedOut(false)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => { })
    setLoggedOut(true)
    setUser(null)
  }, [])

  const role = user?.role
  return (
    <AuthCtx.Provider
      value={{
        user,
        ready,
        loggedOut,
        login,
        logout,
        isMaker: role === 'Maker',
        isChecker: role === 'Checker' || role === 'Super Admin',
        isSuperAdmin: role === 'Super Admin',
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
