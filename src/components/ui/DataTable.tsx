import { useState, type ReactNode } from 'react'
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
 * Includes client-side pagination.
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showAll, setShowAll] = useState(false)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const displayedRows = showAll
    ? rows
    : rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const primary = columns.find((c) => c.primary) ?? columns[0]!
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile)

  return (
    <div className="glass min-w-0 overflow-hidden rounded-[28px] p-3.5">
      {rows.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <>
          {/* Pagination controls */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[13px] text-ink-80">
            <div className="flex items-center gap-2">
              {/* First page */}
              <button
                type="button"
                disabled={showAll || safePage === 1}
                onClick={() => setCurrentPage(1)}
                className="rounded-lg px-2 py-1.5 hover:bg-white disabled:opacity-30"
                title="First page"
                aria-label="First page"
              >
                &lt;&lt;
              </button>

              {/* Previous page */}
              <button
                type="button"
                disabled={showAll || safePage === 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="rounded-lg px-2 py-1.5 hover:bg-white disabled:opacity-30"
                title="Previous page"
                aria-label="Previous page"
              >
                &lt;
              </button>
              <select
                value={safePage}
                disabled={showAll}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="rounded-lg border border-ink-15 bg-white px-2 py-1.5"
                aria-label="Select page"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={showAll || safePage === totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="rounded-lg px-2 py-1.5 hover:bg-white disabled:opacity-30"
                title="Next page"
                aria-label="Next page"
              >
                &gt;
              </button>

              <button
                type="button"
                disabled={showAll || safePage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded-lg px-2 py-1.5 hover:bg-white disabled:opacity-30"
                title="Last page"
                aria-label="Last page"
              >
                &gt;&gt;
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => {
                    setShowAll(e.target.checked)
                    setCurrentPage(1)
                  }}
                  className="size-4 accent-violet"
                />
                Show all
              </label>

              <span className="mx-1 text-ink-30">|</span>

              <label htmlFor="table-page-size">Number of rows:</label>

              <select
                id="table-page-size"
                value={pageSize}
                disabled={showAll}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="rounded-lg border border-ink-15 bg-white px-2 py-1.5 disabled:opacity-50"
              >
                {[10, 25, 50, 100, 250, 500].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* md+ : table */}
          <div
            className={cn(
              'hidden overflow-x-auto md:block',
              maxHeight && 'overflow-y-auto',
            )}
            style={maxHeight ? { maxHeight } : undefined}
          >
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
                  {action && (
                    <th
                      className={cn(
                        'w-px',
                        maxHeight && 'sticky top-0 z-10 bg-white/95 backdrop-blur',
                      )}
                    />
                  )}
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((row) => (
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
                      <td
                        key={i}
                        className={cn(
                          'px-[18px] py-3 text-[13px] whitespace-nowrap text-ink xl:px-[22px]',
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}

                    {action && (
                      <td
                        className="px-[18px] py-3 text-right whitespace-nowrap xl:px-[22px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {action(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones : stacked cards */}
          <ul
            className={cn(
              'flex flex-col gap-2 md:hidden',
              maxHeight && 'overflow-y-auto',
            )}
            style={maxHeight ? { maxHeight } : undefined}
          >
            {displayedRows.map((row) => (
              <li
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'rounded-[20px] bg-white/60 p-3.5',
                  onRowClick && 'cursor-pointer active:bg-white',
                  rowClassName?.(row),
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[14px] font-bold text-ink">
                    {primary.cell(row)}
                  </div>
                  {action && (
                    <div onClick={(e) => e.stopPropagation()}>
                      {action(row)}
                    </div>
                  )}
                </div>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {rest.map((c, i) => (
                    <div key={i} className="min-w-0">
                      <dt className="text-[10px] font-bold text-ink-38 uppercase">
                        {c.header}
                      </dt>
                      <dd className="truncate text-[12px] text-ink">
                        {c.cell(row)}
                      </dd>
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

export function RowLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-semibold whitespace-nowrap text-violet hover:underline"
    >
      {children}
    </button>
  )
}
