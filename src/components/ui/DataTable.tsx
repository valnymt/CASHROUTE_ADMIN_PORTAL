import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EmptyState } from './index'

export interface Column<T> {
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  /** Hide this column in the stacked (mobile) card view. */
  hideOnMobile?: boolean
  /** Rendered as the card's title row on mobile (first one wins). */
  primary?: boolean
}

/**
 * Glass table from the design on md+ screens; turns into stacked cards on
 * phones so nothing scrolls sideways.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  action,
  empty = 'No records match your filters.',
  maxHeight,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | false | undefined
  /** Trailing action cell, e.g. "Edit ›". */
  action?: (row: T) => ReactNode
  empty?: string
  /** CSS height cap (e.g. "calc(100dvh - 260px)"): the rows scroll inside the card and the header stays put. */
  maxHeight?: string
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0]!
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile)

  return (
    <div className="glass min-w-0 overflow-hidden rounded-[28px] p-3.5">
      {rows.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <>
          {/* md+ : table */}
          <div className={cn('hidden overflow-x-auto md:block', maxHeight && 'overflow-y-auto')} style={maxHeight ? { maxHeight } : undefined}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((c, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-[18px] py-2.5 text-left text-[10px] font-bold tracking-wide whitespace-nowrap text-ink-60 uppercase xl:px-[22px]',
                        maxHeight && 'sticky top-0 z-10 bg-white/95 backdrop-blur',
                        c.className,
                      )}
                    >
                      {c.header}
                    </th>
                  ))}
                  {action && <th className={cn('w-px', maxHeight && 'sticky top-0 z-10 bg-white/95 backdrop-blur')} />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-t border-ink-9 transition',
                      onRowClick && 'cursor-pointer hover:bg-white/60',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((c, i) => (
                      <td key={i} className={cn('px-[18px] py-3 text-[13px] whitespace-nowrap text-ink xl:px-[22px]', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {action && (
                      <td className="px-[18px] py-3 text-right whitespace-nowrap xl:px-[22px]" onClick={(e) => e.stopPropagation()}>
                        {action(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones : stacked cards */}
          <ul className={cn('flex flex-col gap-2 md:hidden', maxHeight && 'overflow-y-auto')} style={maxHeight ? { maxHeight } : undefined}>
            {rows.map((row) => (
              <li
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('rounded-[20px] bg-white/60 p-3.5', onRowClick && 'cursor-pointer active:bg-white', rowClassName?.(row))}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[14px] font-bold text-ink">{primary.cell(row)}</div>
                  {action && <div onClick={(e) => e.stopPropagation()}>{action(row)}</div>}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {rest.map((c, i) => (
                    <div key={i} className="min-w-0">
                      <dt className="text-[10px] font-bold text-ink-38 uppercase">{c.header}</dt>
                      <dd className="truncate text-[12px] text-ink">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function RowLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[12px] font-semibold whitespace-nowrap text-violet hover:underline">
      {children}
    </button>
  )
}
