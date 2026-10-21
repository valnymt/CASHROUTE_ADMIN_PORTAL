import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconChevronDown } from '../icons'
import { Field } from './index'

export interface ComboOption {
  value: string
  label: string
  sub?: string
  badge?: ReactNode
}

/**
 * Text input with live suggestions — type to filter, arrow keys + Enter (or
 * click) to pick. Free text is still allowed, so a value that isn't in the
 * list can be entered too.
 */
export function Combobox({
  label,
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  error,
  hint,
  required,
  filter,
  emptyText = 'No matches — a new entry will be created.',
}: {
  label: ReactNode
  value: string
  onChange: (text: string) => void
  onSelect: (option: ComboOption) => void
  options: ComboOption[]
  placeholder?: string
  error?: string
  hint?: ReactNode
  required?: boolean
  /** Custom matcher; defaults to "label or value contains the text". */
  filter?: (option: ComboOption, query: string) => boolean
  emptyText?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState<string | null>(null) // null = show everything (just focused)
  const wrap = useRef<HTMLDivElement>(null)

  const q = (query ?? '').trim().toLowerCase()
  const match = filter ?? ((o: ComboOption, s: string) => `${o.value} ${o.label} ${o.sub ?? ''}`.toLowerCase().includes(s))
  const shown = (q ? options.filter((o) => match(o, q)) : options).slice(0, 8)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (o: ComboOption) => {
    onSelect(o)
    setOpen(false)
    setQuery(null)
  }

  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required}>
      <div ref={wrap} className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-invalid={!!error}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onFocus={() => {
            setQuery(null)
            setOpen(true)
          }}
          onChange={(e) => {
            onChange(e.target.value)
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((a) => Math.min(a + 1, shown.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && open && shown[active]) {
              e.preventDefault()
              pick(shown[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className={cn(
            'w-full rounded-[18px] border border-white/95 bg-white/75 py-3 pr-10 pl-4 text-[13px] text-ink outline-none transition placeholder:text-ink-38 focus:border-violet/40 focus:bg-white focus:ring-4 focus:ring-violet/10',
            error && '!border-[rgba(229,72,77,0.6)]',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show suggestions"
          onClick={() => {
            setQuery(null)
            setOpen((o) => !o)
          }}
          className="absolute inset-y-0 right-3 flex items-center text-ink-60"
        >
          <IconChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="glass-strong animate-pop-in absolute inset-x-0 top-full z-40 mt-1.5 max-h-[260px] overflow-y-auto rounded-[18px] p-1.5"
          >
            {shown.length === 0 && <li className="px-3 py-2.5 text-[12px] text-ink-60">{emptyText}</li>}
            {shown.map((o, i) => (
              <li key={o.value} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition',
                    i === active ? 'bg-periwinkle-18' : 'hover:bg-ink-4',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{o.label}</span>
                    {o.sub && <span className="block truncate text-[11px] text-ink-60">{o.sub}</span>}
                  </span>
                  {o.badge}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  )
}
