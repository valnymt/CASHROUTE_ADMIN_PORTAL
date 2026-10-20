import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** "Users | Delivery Teams" segmented switch shared by both AP-03 screens. */
export default function UsersTabs() {
  const tab = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-[20px] px-4 py-2 text-[12px] font-bold transition',
          isActive ? 'bg-gradient-to-r from-violet to-violet-2 text-white shadow-violet' : 'text-ink-60 hover:text-ink',
        )
      }
    >
      {label}
    </NavLink>
  )
  return (
    <div className="glass flex w-max gap-1 rounded-[24px] p-1">
      {tab('/users', 'Users')}
      {tab('/teams', 'Delivery Teams')}
    </div>
  )
}
