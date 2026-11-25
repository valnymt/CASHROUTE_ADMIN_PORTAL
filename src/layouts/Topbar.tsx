import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBell, IconMenu } from '@/components/icons'
import { Button, Modal } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'
import { api } from '@/services/api'
import { useApi } from '@/store/data'

/** Page header, navigation and the signed-in user's notification inbox. */
export default function Topbar({ crumbs, title, onMenu }: { crumbs: string[]; title: string; onMenu: () => void }) {
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState(false)
  const { data: notifications, error, reload } = useApi(() => api.notifications.list(), [], { pollMs: 10_000 })
  const unread = notifications?.filter(item => !item.read).length ?? 0

  const markAllRead = async () => {
    setMarking(true)
    setMarkError(false)
    try {
      await api.notifications.markAllRead()
      reload()
    } catch {
      setMarkError(true)
    } finally {
      setMarking(false)
    }
  }

  return (
    <header className="flex min-h-[56px] items-center gap-3">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenu}
        className="glass grid size-11 shrink-0 place-items-center rounded-[22px] text-ink lg:hidden"
      >
        <IconMenu />
      </button>
      <div className="min-w-0 flex-1 leading-normal">
        <p className="hidden truncate text-[12px] text-ink-60 sm:block">{['CashRoute', ...crumbs].join('  ›  ')}</p>
        <h1 className="truncate text-[22px] font-bold text-plum sm:text-[26px]">{title}</h1>
      </div>
      <button
        type="button"
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="dialog"
        onClick={() => { setOpen(true); reload() }}
        className="glass relative grid size-11 shrink-0 place-items-center rounded-[22px] text-ink"
      >
        <IconBell />
        {unread > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-violet px-1.5 text-[11px] font-bold text-white">{unread}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Notifications" size="sm"
        footer={unread > 0 && <Button variant="ghost" loading={marking} onClick={() => void markAllRead()}>Mark all as read</Button>}>
        {markError && <p role="alert" className="mb-3 text-[12px] text-ink">Unable to mark notifications as read.</p>}
        {error ? (
          <Button variant="ghost" onClick={reload}>Retry loading notifications</Button>
        ) : notifications === undefined ? (
          <p className="text-[12px] text-ink-60">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <p className="text-[12px] text-ink-60">No notifications yet.</p>
        ) : (
          <ul className="grid gap-2">
            {notifications.map(item => (
              <li key={item.id} className={`rounded-2xl p-3 ${item.read ? 'bg-ink-6' : 'bg-periwinkle-18'}`}>
                <p className="text-[13px] font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-[12px] text-ink-60">{item.body}</p>
                <p className="mt-1 text-[11px] text-ink-60">{fmtDateTime(item.at)}</p>
                {item.link && <Link className="mt-2 inline-block text-[12px] font-semibold text-violet" to={item.link} onClick={() => setOpen(false)}>View request</Link>}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </header>
  )
}
