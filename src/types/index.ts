/**
 * Shared domain types. These mirror the JSON the Laravel API should return
 * (see README.md → "API contract"), so swapping the mock API for real
 * endpoints needs no UI changes.
 */

/** Portal roles: Super Admin, Maker, Checker. Driver/Custodian use the mobile app only. */
export type Role = 'Super Admin' | 'Maker' | 'Checker' | 'Driver' | 'Custodian'
export type UserStatus = 'Active' | 'Locked'

export interface User {
  id: string
  name: string
  username: string
  role: Role
  mobile: string
  email: string
  status: UserStatus
  /** Branch name or team id (for delivery staff). */
  branchId: string | null
  teamId: string | null
  /** Portal sign-in password (Super Admin / Maker / Checker). UI demo only — the real backend stores it hashed. */
  password?: string
}

export interface Branch {
  id: string
  code: string
  name: string
  address: string
  type: 'Branch' | 'HQ'
  lat: number
  lng: number
  radius: number
  contactName: string
  contactMobile: string
  contactEmail: string
  active: boolean
}

export type TeamStatus = 'Available' | 'On trip'

export interface Team {
  id: string
  name: string
  status: TeamStatus
  /** Request currently being delivered when status is "On trip". */
  currentRequestId: string | null
  memberIds: string[]
  /** Confirmed = checked to have at least 1 driver + 2 custodians; only confirmed teams can be assigned. Any member change makes it a draft again. */
  confirmed: boolean
}

export type Direction = 'Deposit' | 'Withdrawal'
export type Currency = 'MMK' | 'SGD' | 'USD'
export type RequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Assigned'
  | 'In Transit'
  | 'Delivered'
  | 'Cancelled'

export interface TimelineEntry {
  label: string
  by: string
  at: string // ISO timestamp
}

export interface CashRequest {
  id: string
  type: Direction
  branchId: string
  amount: number
  currency: Currency
  date: string // YYYY-MM-DD
  /** How soon the team must finish, e.g. "Within 3 hours" (see COMPLETION_WINDOWS). */
  slot: string
  remarks: string
  createdBy: string // user id
  createdAt: string // ISO
  status: RequestStatus
  teamId: string | null
  rejectReason: string | null
  /** Set when the request is cancelled (Maker withdrawal or Checker cancel). */
  cancelReason?: string | null
  /** Who cancelled it: the Maker (own Pending request) or a Checker (Approved/Assigned). */
  cancelledBy?: 'Maker' | 'Checker' | null
  timeline: TimelineEntry[]
}

export type AuditEvent =
  | 'Create'
  | 'Approve'
  | 'Reject'
  | 'Assign'
  | 'Edit'
  | 'Cancel'
  | 'In Transit'
  | 'Delivered'

export interface AuditLog {
  id: string
  at: string // ISO with ms
  event: AuditEvent
  requestId: string
  userId: string
  source: 'Web portal' | 'Mobile app'
  gps: string | null
}

export interface Trip {
  id: string // request id
  date: string // YYYY-MM-DD
  branchId: string
  type: Direction
  teamId: string
  amount: number
  currency: Currency
  durationMin: number
  onTime: boolean
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  link: string | null
}

export interface LiveVehicle {
  requestId: string
  teamId: string
  label: string
  /** Position on the 0–100 map grid. */
  x: number
  y: number
  stale: boolean
  lastPingMin: number
}
