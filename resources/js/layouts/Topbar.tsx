import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBell, IconMenu, IconSearch, IconSparkle } from '@/components/icons'
import { Button, Modal } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtAge } from '@/lib/format'
import { api } from '@/services/api'
import { useApi, useInvalidate } from '@/store/data'

export default function Topbar({ crumbs, title, onMenu }: { crumbs: string[]; title: string; onMenu: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="flex min-h-[56px] items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenu}
          className="glass grid size-11 shrink-0 place-items-center rounded-[22px] text-ink lg:hidden"
        >
          <IconMenu />
        </button>
        <div className="min-w-0 leading-normal">
          <p className="hidden truncate text-[12px] text-ink-60 sm:block">{['CashRoute', ...crumbs].join('  ›  ')}</p>
          <h1 className="truncate text-[22px] font-bold text-plum sm:text-[26px]">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="glass hidden h-11 w-[200px] items-center justify-between rounded-[22px] px-4 text-[13px] text-ink-38 md:flex xl:w-[270px]"
        >
          <span className="flex items-center gap-2 truncate">
            <IconSearch className="size-4 shrink-0" /> Search requests, branches, staff…
          </span>
          <kbd className="rounded-[6px] bg-ink-6 px-[7px] py-0.5 text-[10px] font-bold text-ink-60">⌘K</kbd>
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setPaletteOpen(true)}
          className="glass grid size-11 place-items-center rounded-[22px] text-ink md:hidden"
        >
          <IconSearch />
        </button>
        <span className="hidden sm:block">
          <Button to="/requests/new" className="!px-[18px]">
            <IconSparkle className="size-3.5" /> New Request
          </Button>
        </span>
        <Notifications />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useApi(() => api.notifications.list())
  const invalidate = useInvalidate()
  const unread = data?.filter((n) => !n.read).length ?? 0

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

  const markAll = async () => {
    await api.notifications.markAllRead()
    invalidate()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="glass relative grid size-11 place-items-center rounded-[22px] text-plum"
      >
        <IconBell className="size-[22px]" />
        {unread > 0 && (
          <span className="absolute -top-px left-[27px] grid size-4 place-items-center rounded-[8px] bg-violet text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="glass-strong animate-pop-in absolute top-[52px] right-0 z-40 w-[min(340px,calc(100vw-2rem))] rounded-[22px] p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[14px] font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-[12px] font-semibold text-violet hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {data?.length === 0 && <li className="px-3 py-6 text-center text-[12px] text-ink-60">You're all caught up.</li>}
            {data?.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.link ?? '#'}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-[16px] px-3 py-2.5 transition hover:bg-ink-4"
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-ink-9' : 'bg-violet shadow-glow-violet')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{n.title}</span>
                    <span className="block truncate text-[12px] text-ink-60">{n.body}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-38">{fmtAge(n.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** ⌘K global search across requests, branches and staff. */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: requests } = useApi(() => api.requests.list(), [open])
  const { data: branches } = useApi(() => api.branches.list(), [open])
  const { data: users } = useApi(() => api.users.list(), [open])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const branchName = (id: string) => branches?.find((b) => b.id === id)?.name ?? id
    const all = [
      ...(requests ?? []).map((r) => ({
        key: r.id,
        group: 'Requests',
        title: `${r.id} · ${r.type}`,
        sub: `${branchName(r.branchId)} · ${r.status}`,
        to: r.status === 'Delivered' ? `/reports/${r.id}` : `/approvals/${r.id}`,
      })),
      ...(branches ?? []).map((b) => ({ key: b.id, group: 'Branches', title: b.name, sub: `${b.code} · ${b.address}`, to: `/branches/${b.id}/edit` })),
      ...(users ?? []).map((u) => ({ key: u.id, group: 'Staff', title: u.name, sub: `${u.id} · ${u.role}`, to: `/users/${u.id}/edit` })),
    ]
    if (!s) return all.slice(0, 8)
    return all.filter((r) => `${r.title} ${r.sub}`.toLowerCase().includes(s)).slice(0, 12)
  }, [q, requests, branches, users])

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <Modal open={open} onClose={onClose} title="Search" size="md">
      <div className="glass flex h-11 items-center gap-2 rounded-[22px] px-4">
        <IconSearch className="size-4 text-ink-38" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && results[active]) go(results[active].to)
          }}
          placeholder="Search requests, branches, staff…"
          aria-label="Search requests, branches, staff"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-38"
        />
      </div>
      <ul className="mt-3 flex flex-col gap-1" role="listbox">
        {results.length === 0 && <li className="py-8 text-center text-[13px] text-ink-60">No matches for “{q}”.</li>}
        {results.map((r, i) => (
          <li key={`${r.group}-${r.key}`} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.to)}
              className={cn('flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-2.5 text-left', i === active && 'bg-ink-6')}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">{r.title}</span>
                <span className="block truncate text-[12px] text-ink-60">{r.sub}</span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-ink-38 uppercase">{r.group}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
