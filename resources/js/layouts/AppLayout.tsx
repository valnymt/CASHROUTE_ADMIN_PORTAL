import { useEffect, useState } from 'react'
import { Navigate, Outlet, matchPath, useLocation } from 'react-router-dom'
import Backdrop from '@/components/Backdrop'
import { LoadingBlock } from '@/components/ui'
import { useAuth } from '@/store/auth'
import { IdleTimeoutProvider } from './IdleTimeout'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/** Breadcrumb + page title for each route (first match wins). */
const META: { path: string; crumbs: string[]; title: string }[] = [
  { path: '/live', crumbs: ['Live Monitoring'], title: 'Live Monitoring' },
  { path: '/requests/new', crumbs: ['Operations', 'New Cash Request'], title: 'New Cash Request' },
  { path: '/approvals/:id', crumbs: ['Operations', 'Approvals', ':id'], title: 'Approvals' },
  { path: '/approvals', crumbs: ['Operations', 'Approvals'], title: 'Approvals' },
  { path: '/branches', crumbs: ['Management', 'Branches'], title: 'Branches' },
  { path: '/users', crumbs: ['Management', 'Users & Teams'], title: 'Users & Teams' },
  { path: '/teams', crumbs: ['Management', 'Users & Teams', 'Teams'], title: 'Users & Teams' },
  { path: '/audit', crumbs: ['Insights', 'Audit Trail'], title: 'Audit Trail' },
  { path: '/reports/:id', crumbs: ['Insights', 'Reports', ':id'], title: 'Reports' },
  { path: '/reports', crumbs: ['Insights', 'Reports'], title: 'Reports' },
]

export default function AppLayout() {
  const { user, ready } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  if (!ready)
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
