import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { IconCalendar, IconChevronDown, IconX } from '../icons'
import { Field } from './index'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** YYYY-MM-DD for a local date. */
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Parse YYYY-MM-DD as a local date (not UTC). */
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
const fmtShort = (s: string) => fromIso(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Pill-shaped date filter with a calendar popover in the portal's glass style
 * (replaces the browser's native date picker). Value is YYYY-MM-DD or ''.
 * `rangeStart`/`rangeEnd` shade the days between a From/To pair.
 * With a `label` it renders as a form field (label above, full width) to sit
 * next to Input/Select; without one it's a compact filter pill.
 */
function DatePickerControl({
  value,
  onChange,
  placeholder,
  min,
  max,
  rangeStart,
  rangeEnd,
  align = 'left',
  label,
  clearable = true,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  min?: string
  max?: string
  rangeStart?: string
  rangeEnd?: string
  align?: 'left' | 'right'
  label?: string
  /** Show the × and Clear actions. Turn off when a date is always required. */
  clearable?: boolean
}) {
  const fid = useId()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const d = value ? fromIso(value) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const ref = useRef<HTMLDivElement>(null)
  const today = toIso(new Date())

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

  const toggle = () => {
    // Open on the selected month (or this month).
    if (!open) {
      const d = value ? fromIso(value) : new Date()
      setView(new Date(d.getFullYear(), d.getMonth(), 1))
    }
    setOpen((o) => !o)
  }
  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }
  const shift = (months: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + months, 1))

  // Monday-first grid: blanks before the 1st, then each day of the month.
  const lead = (view.getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIso(new Date(view.getFullYear(), view.getMonth(), i + 1))),
  ]
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max)
  const inRange = (iso: string) => !!rangeStart && !!rangeEnd && iso > rangeStart && iso < rangeEnd

  return (
    <div ref={ref} className="relative">
      <button
        id={fid}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${label ?? placeholder}: ${fmtShort(value)}` : (label ?? placeholder)}
        onClick={toggle}
        className={cn(
          label
            ? cn(
                'flex w-full items-center gap-2 rounded-[18px] border bg-white/75 px-4 py-3 text-left text-[13px] transition hover:bg-white',
                open ? 'border-violet/40 bg-white ring-4 ring-violet/10' : 'border-white/95',
                value ? 'text-ink' : 'text-ink-38',
              )
            : cn(
                'inline-flex items-center gap-2 rounded-[20px] px-4 py-2 text-[12px] font-bold whitespace-nowrap transition',
                value || open ? 'bg-plum text-white shadow-plum' : 'border border-white/95 bg-white/70 text-ink-60 hover:bg-white hover:text-ink',
              ),
        )}
      >
        <IconCalendar className={cn('size-3.5 shrink-0', label && 'size-4 text-ink-60')} />
        <span className={cn(label && 'flex-1 truncate')}>{value ? fmtShort(value) : placeholder}</span>
        {value && clearable && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${placeholder}`}
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
              }
            }}
            className="-mr-1 grid size-4 place-items-center rounded-full hover:bg-white/20"
          >
            <IconX className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={placeholder}
          className={cn(
            // Solid (not see-through glass) so the table behind doesn't show through the days.
            'animate-pop-in absolute top-full z-30 mt-2 w-[284px] rounded-[22px] border border-white bg-white/98 p-3.5 shadow-[0_18px_48px_rgba(66,24,105,0.22)] backdrop-blur-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              className="grid size-8 place-items-center rounded-full text-ink-60 transition hover:bg-white hover:text-ink"
            >
              <IconChevronDown className="size-4 rotate-90" />
            </button>
            <p className="text-[13px] font-bold text-ink">{view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift(1)}
              className="grid size-8 place-items-center rounded-full text-ink-60 transition hover:bg-white hover:text-ink"
            >
              <IconChevronDown className="size-4 -rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-[10px] font-bold text-ink-38">
                {d}
              </span>
            ))}
            {cells.map((iso, i) =>
              iso ? (
                <span key={iso} className={cn('grid place-items-center', inRange(iso) && 'bg-periwinkle-18')}>
                  <button
                    type="button"
                    disabled={disabled(iso)}
                    onClick={() => pick(iso)}
                    aria-pressed={iso === value}
                    aria-label={fmtShort(iso)}
                    className={cn(
                      'grid size-9 place-items-center rounded-full text-[12px] font-semibold transition',
                      iso === value
                        ? 'bg-violet text-white shadow-[0_4px_12px_rgba(114,28,184,0.35)]'
                        : iso === rangeStart || iso === rangeEnd
                          ? 'bg-periwinkle-18 text-plum'
                          : 'text-ink hover:bg-white',
                      iso === today && iso !== value && 'font-bold text-violet ring-1 ring-violet/40',
                      'disabled:cursor-not-allowed disabled:text-ink-38 disabled:opacity-40 disabled:ring-0 disabled:hover:bg-transparent',
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                </span>
              ) : (
                <span key={`blank-${i}`} />
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-ink-6 pt-2.5">
            {clearable ? (
              <button
                type="button"
                onClick={() => pick('')}
                className="rounded-[14px] px-2.5 py-1.5 text-[12px] font-bold text-ink-60 transition hover:bg-white hover:text-ink"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={disabled(today)}
              onClick={() => pick(today)}
              className="rounded-[14px] px-2.5 py-1.5 text-[12px] font-bold text-violet transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DatePicker(props: Parameters<typeof DatePickerControl>[0]) {
  if (!props.label) return <DatePickerControl {...props} />
  return (
    <Field label={props.label}>
      <DatePickerControl {...props} />
    </Field>
  )
}
