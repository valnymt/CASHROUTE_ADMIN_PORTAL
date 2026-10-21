import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import Logo from '@/components/Logo'
import { IconBuilding, IconChart, IconHistory, IconCheckCircle, IconDoc, IconPin, IconPlus, IconUsers, IconX } from '@/components/icons'
import { Avatar, IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/services/api'
import { useAuth } from '@/store/auth'
import { useApi } from '@/store/data'
import { useIdleTimeout } from './IdleTimeout'

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
  const { trigger } = useIdleTimeout()
  const { data: requests } = useApi(() => api.requests.list())

  const onRoad = requests?.filter((r) => r.status === 'In Transit' || r.status === 'Assigned').length
  const toReview = requests?.filter((r) => r.status === 'Pending' && r.createdBy !== user?.id).length

  const sections: { heading: string; items: NavItem[] }[] = [
    { heading: 'OVERVIEW', items: [] },
    {
      heading: 'OPERATIONS',
      items: [
        { to: '/live', label: 'Live Monitoring', Icon: IconPin, count: onRoad, countTone: 'lime' },
        { to: '/requests/new', label: 'New Cash Request', Icon: IconPlus },
        { to: '/approvals', label: 'Approvals', Icon: IconCheckCircle, count: toReview, countTone: 'violet' },
      ],
    },
    {
      heading: 'MANAGEMENT',
      items: [
        { to: '/branches', label: 'Branches', Icon: IconBuilding },
        { to: '/users', label: 'Users & Teams', Icon: IconUsers, match: ['/teams'] },
      ],
    },
    {
      heading: 'INSIGHTS',
      items: [
        { to: '/audit', label: 'Audit Trail', Icon: IconDoc },
        { to: '/reports', label: 'Reports', Icon: IconChart, end: true },
        // Trip detail pages (/reports/{id}) are opened from here, so keep this item lit on them.
        { to: '/history', label: 'Trip History', Icon: IconHistory, match: ['/history', '/reports/'] },
      ],
    },
  ]

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav aria-label="Main" className="glass flex h-full w-[256px] flex-col gap-[3px] overflow-y-auto rounded-[28px] px-4 pt-[22px] pb-[18px]">
      <div className="flex items-start justify-between px-1.5 pb-3.5">
        <Logo />
        {onClose && (
          <IconButton label="Close menu" onClick={onClose} className="lg:hidden">
            <IconX className="size-4" />
          </IconButton>
        )}
      </div>

      {sections.map((s) => (
        <div key={s.heading} className="flex flex-col gap-[3px]">
          <p className="px-2 pt-3 pb-1 text-[10px] font-bold text-ink-38">{s.heading}</p>
          {s.items.map(({ to, label, Icon, count, countTone, match, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) => {
                const active = isActive || match?.some((m) => pathname.startsWith(m))
                return cn(
                  'flex h-[42px] shrink-0 items-center justify-between rounded-[21px] pr-3 pl-3.5 text-[14px] transition',
                  active
                    ? 'bg-gradient-to-r from-violet to-violet-2 font-bold text-white shadow-violet'
                    : 'font-medium text-ink hover:bg-white/70',
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
                          active ? 'bg-white text-violet' : countTone === 'lime' ? 'bg-lime text-ink' : 'bg-violet text-white',
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

      <div className="min-h-6 flex-1" />

      {user && (
        <div className="flex shrink-0 items-center gap-2.5 px-1 pt-2.5 pb-1">
          <Avatar name={user.name} size={38} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-ink-60">{user.role}</p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          navigate('/account/password')
        }}
        className="self-start text-[11px] font-semibold text-violet hover:underline"
      >
        Change password
      </button>
      <button type="button" onClick={() => { onNavigate?.(); trigger() }} className="self-start text-[11px] font-semibold text-violet hover:underline">
        Demo: idle timeout
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 w-full shrink-0 rounded-[22px] border border-white/95 bg-white/60 px-3 py-2.5 text-[13px] font-semibold text-ink-60 transition hover:bg-white hover:text-ink"
      >
        Log out
      </button>
    </nav>
  )
}
