import { cn } from '@/lib/cn'
import { fmtDay, fmtTime } from '@/lib/format'
import type { CashRequest } from '@/types'

/** Status history of a cash request (created → submitted → approved → …). */
export default function RequestTimeline({ request }: { request: CashRequest }) {
  const items = [...request.timeline]
  const done = !['Pending'].includes(request.status)
  return (
    <ol className="flex flex-col gap-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', t.label.startsWith('Rejected') || t.label.startsWith('Cancelled') ? 'bg-danger' : 'bg-lime shadow-glow-lime')} />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-ink">{t.label}</p>
            <p className="text-[11px] text-ink-60">
              {i === 0 ? `${t.by} · ` : ''}
              {fmtDay(t.at)} {fmtTime(t.at)}
              {i > 0 && t.by !== items[0]!.by ? ` · ${t.by}` : ''}
            </p>
          </div>
        </li>
      ))}
      {!done && (
        <li className="flex gap-2.5">
          <span className="mt-1 size-2.5 shrink-0 rounded-full bg-lime/50" />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-ink">Awaiting checker</p>
            <p className="text-[11px] text-ink-60">—</p>
          </div>
        </li>
      )}
    </ol>
  )
}
