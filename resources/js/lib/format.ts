import type { Currency } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

const toDate = (v: string | Date) => (typeof v === 'string' ? new Date(v.length === 10 ? `${v}T00:00:00` : v) : v)

/** "13 Oct 2026" */
export function fmtDate(v: string | Date) {
  const d = toDate(v)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "13 Oct" */
export function fmtDay(v: string | Date) {
  const d = toDate(v)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "09:12" */
export function fmtTime(v: string | Date) {
  const d = toDate(v)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "09:41:22" */
export function fmtTimeSec(v: string | Date) {
  const d = toDate(v)
  return `${fmtTime(d)}:${pad(d.getSeconds())}`
}

/** "13 Oct 2026 · 09:12" */
export function fmtDateTime(v: string | Date) {
  return `${fmtDate(v)} · ${fmtTime(v)}`
}

/** "2026-10-13 09:36:05.218 +08:00" */
export function fmtIsoLocal(v: string | Date) {
  const d = toDate(v)
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${fmtTimeSec(d)}.${String(d.getMilliseconds()).padStart(3, '0')} ` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** "YYYY-MM-DD" in local time */
export function isoDay(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "20 min", "2 h", "3 d" */
export function fmtAge(v: string | Date, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - toDate(v).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

/** "MMK 250,000" */
export function fmtMoney(amount: number, currency: Currency) {
  return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

/** "MMK 14.2M" */
export function fmtMoneyShort(amount: number, currency: Currency) {
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(0)}K`
  return `${currency} ${amount}`
}

/** "Amy Tan" → "AT" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** How soon the delivery team must finish a request ("Complete within" dropdown). */
export const COMPLETION_WINDOWS = [
  'Within 1 hour',
  'Within 3 hours',
  'Within 5 hours',
  'Within 10 hours',
  'Within 12 hours',
  'Within 1 day',
  'Within 2 days',
] as const

/** Dropdown label — the longest windows are meant for long-distance drives. */
export const completionLabel = (w: string) => (w === 'Within 2 days' ? 'Within 2 days (long drive)' : w)
