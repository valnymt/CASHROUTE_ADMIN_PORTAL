import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBell } from '@/components/icons'
import { cn } from '@/lib/cn'
import { fmtAge } from '@/lib/format'
import { api } from '@/services/api'
import { useApi, useInvalidate } from '@/store/data'

/**
 * Bell in the Topbar: shows unread count and a dropdown with the latest
 * notifications for the signed-in user. Opens on click, closes on outside
 * click or Escape. Polls /api/notifications every 30 s so new events pop up
 * without a page reload.
 */
export default function NotificationBell() {
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: items } = useApi(() => api.notifications.list(), [], { pollMs: 30_000 })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const list = items ?? []
  const unread = list.filter((n) => !n.read).length

  const open_notif = async (link: string | null) => {
    setOpen(false)
    try {
      await api.notifications.markAllRead()
      invalidate()
    } catch {
      // ignore — the user still gets to see the notification page
    }
    if (link) navigate(link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'glass relative grid size-11 shrink-0 place-items-center rounded-[22px] text-ink transition hover:bg-white',
          open && 'ring-4 ring-violet/10',
        )}
      >
        <IconBell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-violet px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-pop-in absolute top-full right-0 z-40 mt-2 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[22px] border border-white/95 bg-white shadow-[0_18px_48px_rgba(66,24,105,0.22)]"
        >
          <div className="flex items-center justify-between border-b border-ink-6 px-4 py-3">
            <p className="text-[13px] font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await api.notifications.markAllRead().catch(() => {})
                  invalidate()
                }}
                className="text-[11px] font-bold text-violet hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[400px] overflow-auto">
            {list.length === 0 ? (
              <li className="px-4 py-8 text-center text-[12px] text-ink-60">You're all caught up.</li>
            ) : (
              list.slice(0, 20).map((n) => (
                <li key={n.id} className="border-b border-ink-6 last:border-0">
                  <button
                    type="button"
                    onClick={() => open_notif(n.link)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-ink-4',
                      !n.read && 'bg-periwinkle-18/40',
                    )}
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-ink-9' : 'bg-violet')} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className={cn('truncate text-[12px]', n.read ? 'text-ink' : 'font-bold text-ink')}>{n.title}</p>
                      <p className="line-clamp-2 text-[11px] text-ink-60">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-ink-38">{fmtAge(new Date(n.at))} ago</p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
