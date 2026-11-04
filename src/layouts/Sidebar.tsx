import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, type ComponentType, type SVGProps } from 'react'
import Logo from '@/components/Logo'
import { IconBuilding, IconChart, IconHistory, IconCheckCircle, IconDoc, IconPin, IconPlus, IconUsers, IconX } from '@/components/icons'
import ProfilePanel from '@/components/ProfilePanel'
import { Avatar, IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { branchScope } from '@/lib/scope'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'

interface NavItem {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  count?: number
  countTone?: 'lime' | 'violet'
  match?: string[]
  /** Only light up on this exact path, not its sub-pages. */
  end?: boolean
}

export default function Sidebar({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  // Poll every 30 s so Approvals / Live Monitoring badges update when another
  // user (e.g. a Maker on their own device) creates or finishes a request.
  const { data: requests } = useApi(() => api.requests.list(), [], { pollMs: 30_000 })
  const { data: branches } = useApi(() => api.branches.list())

  const onRoad = requests?.filter((r) => r.status === 'In Transit' || r.status === 'Assigned').length
  const scope = branches ? branchScope(user, branches) : null
  const toReview = requests?.filter((r) => r.status === 'Pending' && r.createdBy !== user?.id && (!scope || r.branchId === scope)).length

  // Sidebar is scoped per role:
  //  - Super Admin → sees everything
  //  - Checker     → Live Monitoring, Approvals, Users & Teams, Trip History (own branch)
  //  - Maker       → Live Monitoring, New Cash Request, Users & Teams, Trip History (own branch)
  const isSuperAdmin = user?.role === 'Super Admin'
  const isChecker = user?.role === 'Checker'
  const isMaker = user?.role === 'Maker'

  const live: NavItem = { to: '/live', label: 'Live Monitoring', Icon: IconPin, count: onRoad, countTone: 'lime' }
  const newRequest: NavItem = { to: '/requests/new', label: 'New Cash Request', Icon: IconPlus }
  const approvals: NavItem = { to: '/approvals', label: 'Approvals', Icon: IconCheckCircle, count: toReview, countTone: 'violet' }
  const branchesItem: NavItem = { to: '/branches', label: 'Branches', Icon: IconBuilding }
  const usersTeams: NavItem = {
    to: '/users',
    label: 'Users & Teams',
    Icon: IconUsers,
    match: ['/users', '/teams'],
  }
  const audit: NavItem = { to: '/audit', label: 'Audit Trail', Icon: IconDoc }
  const reports: NavItem = { to: '/reports', label: 'Reports', Icon: IconChart, end: true }
  const history: NavItem = { to: '/history', label: 'Trip History', Icon: IconHistory, match: ['/history', '/reports/'] }

  let sections: { heading: string; items: NavItem[] }[]
  if (isMaker) {
    sections = [
      { heading: 'OPERATIONS', items: [live, newRequest] },
      { heading: 'MANAGEMENT', items: [usersTeams] },
      { heading: 'INSIGHTS', items: [history] },
    ]
  } else if (isChecker) {
    sections = [
      { heading: 'OPERATIONS', items: [live, approvals] },
      { heading: 'MANAGEMENT', items: [usersTeams] },
      { heading: 'INSIGHTS', items: [history] },
    ]
  } else {
    // Super Admin — full menu
    sections = [
      { heading: 'OPERATIONS', items: [live, newRequest, approvals] },
      { heading: 'MANAGEMENT', items: [branchesItem, usersTeams] },
      { heading: 'INSIGHTS', items: [audit, reports, history] },
    ]
  }
  // Suppress TS "unused" when a role doesn't use the full menu.
  void isSuperAdmin

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav aria-label="Main" className="glass flex h-full w-[260px] flex-col overflow-hidden rounded-[28px] px-3">
      <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pt-5 pb-4">
        <div className="flex items-start justify-between px-1.5 pb-2">
          <Logo />
          {onClose && (
            <IconButton label="Close menu" onClick={onClose} className="lg:hidden">
              <IconX className="size-4" />
            </IconButton>
          )}
        </div>

        {sections.filter((s) => s.items.length > 0).map((s) => (
          <div key={s.heading} className="flex flex-col gap-1 pt-1.5">
            <p className="px-2 pt-0.5 pb-0.5 text-[10px] font-bold tracking-wider text-ink-38">{s.heading}</p>
            {s.items.map(({ to, label, Icon, count, countTone, match, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => {
                  const active = isActive || match?.some((m) => pathname.startsWith(m))
                  return cn(
                    'flex h-[38px] shrink-0 items-center justify-between rounded-[20px] pr-3.5 pl-4 text-[13.5px] transition',
                    active
                      ? 'bg-gradient-to-r from-violet to-violet-2 font-bold text-white shadow-violet'
                      : 'bg-[#D1D3FF]/45 font-medium text-ink hover:bg-white hover:shadow-plum',
                  )
                }}
              >
                {({ isActive }) => {
                  const active = isActive || match?.some((m) => pathname.startsWith(m))
                  return (
                    <>
                      <span className="flex items-center gap-2.5">
                        <Icon className={cn('size-5', active ? 'text-white' : 'text-violet')} />
                        {label}
                      </span>
                      {!!count && (
                        <span
                          className={cn(
                            'grid size-[22px] place-items-center rounded-[11px] text-[11px] font-bold',
                            active ? 'bg-white text-violet' : countTone === 'violet' ? 'bg-violet text-white' : 'bg-violet text-white',
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )
                }}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="min-h-4 flex-1" />

        {user && (
          <button
            type="button"
            onClick={() => { onNavigate?.(); setProfileOpen(true) }}
            className="flex w-full shrink-0 items-center gap-2.5 rounded-[22px] px-1.5 py-2 text-left transition hover:bg-white"
            aria-label="Open profile"
          >
            <Avatar name={user.name} size={38} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-ink-60">{user.role}</p>
            </div>
            <span className="pr-1 text-[11px] font-bold text-violet">View</span>
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 w-full shrink-0 rounded-[22px] border border-white/95 bg-white/60 px-3 py-2.5 text-[13px] font-semibold text-ink-60 transition hover:bg-white hover:text-ink"
        >
          Log out
        </button>
      </div>
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </nav>
  )
}
