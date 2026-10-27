import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import { IconChevronDown, IconSearch, IconX } from '../icons'

/* ------------------------------------------------------------------ Card */

export function Card({
  title,
  action,
  className,
  children,
  padded = true,
}: {
  title?: ReactNode
  action?: ReactNode
  className?: string
  children?: ReactNode
  padded?: boolean
}) {
  return (
    <section className={cn('glass min-w-0 rounded-[28px]', padded && 'p-[18px] sm:p-[22px]', className)}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          {title && <h2 className="text-[16px] font-bold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------- Button */

type Variant = 'lime' | 'violet' | 'plum' | 'ghost' | 'danger' | 'danger-soft' | 'link'
const variants: Record<Variant, string> = {
  lime: 'bg-lime text-ink shadow-lime hover:brightness-105',
  violet: 'bg-gradient-to-r from-violet to-violet-2 text-white shadow-violet hover:brightness-110',
  plum: 'bg-plum text-white shadow-plum hover:brightness-125',
  ghost: 'bg-white/70 border border-white/95 text-ink hover:bg-white',
  danger: 'bg-danger text-white hover:brightness-110',
  'danger-soft': 'bg-danger-12 border border-[rgba(229,72,77,0.4)] text-danger hover:bg-[rgba(229,72,77,0.18)]',
  link: 'text-violet hover:underline !p-0 !rounded-none',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  to?: string
}

export function Button({ variant = 'violet', size = 'md', loading, className, children, to, disabled, ...rest }: ButtonProps) {
  const cls = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[30px] font-bold transition',
    'disabled:cursor-not-allowed disabled:bg-ink-6 disabled:text-ink-38 disabled:shadow-none disabled:border-transparent',
    size === 'md' ? 'px-5 py-[11px] text-[14px]' : 'px-4 py-2 text-[12px]',
    variants[variant],
    className,
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-ink-6 text-ink-60 transition hover:bg-ink-9 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------- Badge */

export type BadgeTone = 'lime' | 'violet' | 'neutral' | 'periwinkle' | 'amber' | 'danger' | 'plum'
const badgeTones: Record<BadgeTone, string> = {
  lime: 'bg-lime text-ink shadow-glow-lime',
  violet: 'bg-violet text-white shadow-glow-violet',
  plum: 'bg-plum text-white',
  neutral: 'bg-ink-6 text-ink-60',
  periwinkle: 'bg-periwinkle-18 text-plum',
  amber: 'bg-amber-16 text-amber',
  danger: 'bg-danger-12 text-danger',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-[20px] px-3 py-1 text-[11px] font-bold', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

/** Status → badge colour, used across all tables. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'Active':
    case 'Available':
    case 'In Transit':
    case 'Delivered':
    case 'Complete':
    case 'On time':
    case 'Approve':
      return 'lime'
    case 'Pending':
    case 'Assigned':
    case 'Assign':
      return 'violet'
    case 'Approved':
      return 'plum'
    case 'Locked':
    case 'Rejected':
    case 'Late':
    case 'Reject':
      return 'danger'
    case 'On trip':
    case 'GPS Stale':
    case 'Cancel':
    case 'Cancelled':
      return 'amber'
    case 'Deposit':
    case 'HQ':
    case 'Create':
      return 'periwinkle'
    default:
      return 'neutral'
  }
}

export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTone(status)}>{status}</Badge>

/* ------------------------------------------------------------------ Chip */

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[20px] px-4 py-2 text-[12px] font-bold whitespace-nowrap transition',
              on ? 'bg-plum text-white shadow-plum' : 'border border-white/95 bg-white/70 text-ink hover:bg-white',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Pill that opens a menu on hover (and on click/tap for touch screens).
 * Looks like a selected chip when a non-default option is chosen.
 */
export function FilterDropdown<T extends string>({
  options,
  value,
  onChange,
  label,
  defaultValue,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  /** The "no filter" option; the pill is highlighted when value differs from it. */
  defaultValue?: T
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>(0)
  const current = options.find((o) => o.value === value)
  const active = defaultValue !== undefined && value !== defaultValue

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

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // Small delay so moving the mouse from the pill into the menu doesn't close it.
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[20px] px-4 py-2 text-[12px] font-bold whitespace-nowrap transition',
          active || open ? 'bg-plum text-white shadow-plum' : 'border border-white/95 bg-white/70 text-ink hover:bg-white',
        )}
      >
        {current?.label}
        <IconChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="glass-strong animate-pop-in absolute top-full left-0 z-30 mt-2 min-w-[180px] rounded-[18px] p-1.5"
        >
          {options.map((o) => {
            const on = o.value === value
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-[12px] font-semibold transition',
                    on ? 'bg-periwinkle-18 text-plum' : 'text-ink hover:bg-ink-4',
                  )}
                >
                  {o.label}
                  {on && <span className="size-1.5 rounded-full bg-violet" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Form fields */

const control =
  'w-full rounded-[18px] border border-white/95 bg-white/75 px-4 py-3 text-[13px] text-ink placeholder:text-ink-38 outline-none transition focus:border-violet/40 focus:bg-white focus:ring-4 focus:ring-violet/10 disabled:bg-ink-4 disabled:text-ink-60'
const invalid = '!border-[rgba(229,72,77,0.6)] !ring-danger/10'

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
  required,
}: {
  label?: ReactNode
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
  required?: boolean
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[12px] font-semibold text-ink-60">
          {label}
          {required && ' *'}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-ink-60">{hint}</p>
      )}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: string; hint?: ReactNode; suffix?: ReactNode }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, suffix, className, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fid} className={className} required={required}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          className={cn(control, error && invalid, suffix ? 'pr-12' : '')}
          {...rest}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-4 flex items-center text-[12px] font-bold text-violet">{suffix}</span>
        )}
      </div>
    </Field>
  )
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode
  error?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, id, required, ...rest }: SelectProps) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <Field label={label} error={error} htmlFor={fid} className={className} required={required}>
      <div className="relative">
        <select id={fid} aria-invalid={!!error} className={cn(control, 'appearance-none pr-10', error && invalid, !rest.value && 'text-ink-38')} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled} className="text-ink">
              {o.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-60" />
      </div>
    </Field>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; error?: string; hint?: ReactNode }

export function Textarea({ label, error, hint, className, id, required, ...rest }: TextareaProps) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fid} className={className} required={required}>
      <textarea id={fid} aria-invalid={!!error} className={cn(control, 'min-h-[88px] resize-y', error && invalid)} {...rest} />
    </Field>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-lime shadow-glow-lime' : 'bg-ink-9',
        )}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </label>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <div className={cn('glass relative flex h-11 items-center gap-2 rounded-[22px] px-4', className)}>
      <IconSearch className="size-4 shrink-0 text-ink-38" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-38 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="text-ink-38 hover:text-ink">
          <IconX className="size-4" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------- Modal & Drawer */

function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade-in absolute inset-0 bg-[rgba(66,24,105,0.4)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'glass-strong animate-pop-in relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] sm:rounded-[28px]',
          size === 'sm' && 'sm:max-w-[600px]',
          size === 'md' && 'sm:max-w-[580px]',
          size === 'lg' && 'sm:max-w-[780px]',
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-[20px] font-bold text-plum sm:text-[22px]">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-ink-60">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <IconX className="size-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 px-5 pb-5 sm:px-6 sm:pb-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-[rgba(66,24,105,0.4)]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className="glass-strong animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-[495px] flex-col rounded-l-[28px]"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-6 sm:px-7">
          <h2 className="text-[20px] font-bold text-plum sm:text-[22px]">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <IconX className="size-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
        {footer && <div className="flex justify-end gap-3 px-5 pb-6 sm:px-7">{footer}</div>}
      </aside>
    </div>,
    document.body,
  )
}

/* ---------------------------------------------------------------- Avatar */

const avatarGradients = [
  'linear-gradient(135deg,#721cb8,#7c83ff)',
  'linear-gradient(135deg,#b58cff,#721cb8)',
  'linear-gradient(135deg,#22d3ee,#7c83ff)',
  'linear-gradient(135deg,#96d74c,#6fa22e)',
  'linear-gradient(135deg,#e879f9,#721cb8)',
]

export function Avatar({ name, size = 30, className }: { name: string; size?: number; className?: string }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full border-2 border-white font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.34, backgroundImage: avatarGradients[hash % avatarGradients.length] }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------- Layout helpers */

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold text-ink sm:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function KeyValue({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-ink-9">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
          <dt className="shrink-0 text-ink-60">{k}</dt>
          <dd className="text-right font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] font-bold text-ink">{title}</p>
      {body && <p className="mt-1 text-[12px] text-ink-60">{body}</p>}
    </div>
  )
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16 text-violet">
      <Spinner />
    </div>
  )
}

export function ErrorBlock({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-[13px] font-semibold text-danger">{error.message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Table */

/** Desktop table head cell. */
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('px-[22px] py-2.5 text-left text-[10px] font-bold tracking-wide text-ink-60 uppercase', className)}>{children}</th>
)
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn('px-[22px] py-3 text-[13px] text-ink', className)}>{children}</td>
)
