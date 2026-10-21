import { useEffect, useState } from 'react'
import { Navigate, Outlet, matchPath, useLocation } from 'react-router-dom'
import Backdrop from '@/components/Backdrop'
import { LoadingBlock } from '@/components/ui'
import { DEMO_PASSWORD } from '@/lib/seed'
import { USE_MOCK_API } from '@/services/api'
import { demoUnlock } from '@/services/mockApi'
import { useAuth } from '@/store/auth'
import { IdleTimeoutProvider } from './IdleTimeout'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/** Breadcrumb + page title for each route (first match wins). */
const META: { path: string; crumbs: string[]; title: string }[] = [
  { path: '/live/*', crumbs: ['Live Monitoring'], title: 'Live Monitoring' },
  { path: '/requests/new', crumbs: ['Operations', 'New Cash Request'], title: 'New Cash Request' },
  { path: '/requests/:id/edit', crumbs: ['Operations', 'All Requests', ':id', 'Edit'], title: 'Cash Requests' },
  { path: '/requests/:id', crumbs: ['Operations', 'All Requests', ':id'], title: 'Cash Requests' },
  { path: '/requests', crumbs: ['Operations', 'All Requests'], title: 'Cash Requests' },
  { path: '/approvals/:id/*', crumbs: ['Operations', 'Approvals', ':id'], title: 'Approvals' },
  { path: '/approvals', crumbs: ['Operations', 'Approvals'], title: 'Approvals' },
  { path: '/branches/*', crumbs: ['Management', 'Branches'], title: 'Branches' },
  { path: '/users/*', crumbs: ['Management', 'Users & Teams'], title: 'Users & Teams' },
  { path: '/teams', crumbs: ['Management', 'Users & Teams', 'Teams'], title: 'Users & Teams' },
  { path: '/audit', crumbs: ['Insights', 'Audit Trail'], title: 'Audit Trail' },
  { path: '/reports/:id', crumbs: ['Insights', 'Reports', ':id'], title: 'Reports' },
  { path: '/reports', crumbs: ['Insights', 'Reports'], title: 'Reports' },
  { path: '/account/password', crumbs: ['Account', 'Change password'], title: 'Account' },
]

/**
 * Preview mode (default while there's no backend): opening any page signs in
 * as the demo Admin User automatically, so every screen can be browsed by URL.
 * Set VITE_REQUIRE_LOGIN=true in .env to force the login screen instead.
 */
const PREVIEW = USE_MOCK_API && import.meta.env.VITE_REQUIRE_LOGIN !== 'true'
const PREVIEW_USER = 'admin.maker'

export default function AppLayout() {
  const { user, ready, login, loggedOut } = useAuth()
  // After an explicit log-out, stay on the login screen instead of auto signing in again.
  const preview = PREVIEW && !loggedOut
  const [autoLogin, setAutoLogin] = useState<'idle' | 'pending' | 'failed'>('idle')
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!preview || !ready || user || autoLogin !== 'idle') return
    setAutoLogin('pending')
    demoUnlock(PREVIEW_USER)
    login(PREVIEW_USER, DEMO_PASSWORD)
      .then(() => setAutoLogin('idle'))
      .catch(() => setAutoLogin('failed'))
  }, [preview, ready, user, autoLogin, login])

  if (!ready || (!user && preview && autoLogin !== 'failed'))
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingBlock />
      </div>
    )
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

  let crumbs: string[] = []
  let title = 'CashRoute'
  for (const m of META) {
    const hit = matchPath(m.path, pathname)
    if (hit) {
      crumbs = m.crumbs.map((c) => (c === ':id' ? (hit.params.id ?? '').toUpperCase() : c))
      title = m.title
      break
    }
  }

  document.title = `${title} · CashRoute HQ Admin`

  return (
    <IdleTimeoutProvider>
      <Backdrop />
      <div className="flex min-h-dvh gap-5 p-3 sm:p-4 lg:p-6">
        {/* Desktop: sticky sidebar */}
        <div className="sticky top-6 hidden h-[calc(100dvh-48px)] shrink-0 lg:block">
          <Sidebar />
        </div>

        {/* Mobile / tablet: slide-in drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="animate-fade-in absolute inset-0 bg-[rgba(66,24,105,0.4)]" onClick={() => setMenuOpen(false)} />
            <div className="animate-slide-in-left absolute inset-y-3 left-3">
              <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <Topbar crumbs={crumbs} title={title} onMenu={() => setMenuOpen(true)} />
          <main className="flex min-w-0 flex-1 flex-col gap-[18px] pb-6 lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </IdleTimeoutProvider>
  )
}
