import type {
  AuditLog,
  Branch,
  CashRequest,
  Notification,
  Team,
  TimelineEntry,
  Trip,
  User,
} from '@/types'
import { isoDay } from './format'

/**
 * Demo data matching the Figma screens. Timestamps are generated relative to
 * "now" on first load so ages ("20 min ago") and the reports date range stay
 * realistic. Replace with Laravel seeders when the backend exists.
 */

export const DEMO_PASSWORD = 'password'

export interface Db {
  users: User[]
  branches: Branch[]
  teams: Team[]
  requests: CashRequest[]
  audit: AuditLog[]
  trips: Trip[]
  notifications: Notification[]
  session: { userId: string } | null
  failedAttempts: Record<string, number>
  seq: { request: number; user: number; team: number; audit: number }
}

const user = (
  id: string,
  name: string,
  role: User['role'],
  extra: Partial<User> = {},
): User => ({
  id,
  name,
  username: name.toLowerCase().replace(/\s+/g, '.'),
  role,
  mobile: `+95 9 ${(4000000 + Number(id.slice(2)) * 137531).toString().slice(0, 7)}`,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@cashroute.com`,
  status: 'Active',
  branchId: null,
  teamId: null,
  ...extra,
})

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeed(now = new Date()): Db {
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const at = (dayOffset: number, h: number, m: number, s = 0, ms = 0) => {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(h, m, s, ms)
    return d.toISOString()
  }
  const day = (offset: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    return isoDay(d)
  }

  const users: User[] = [
    user('U-001', 'Amy Tan', 'Maker', { branchId: 'BR-001' }),
    user('U-002', 'Priya Nair', 'Maker', { branchId: 'HQ-001' }),
    user('U-003', 'Admin User', 'Maker + Checker', { branchId: 'HQ-001', username: 'admin.maker' }),
    user('U-004', 'Raj Kumar', 'Driver', { teamId: 'T-A' }),
    user('U-005', 'Lena Ho', 'Custodian', { teamId: 'T-A' }),
    user('U-006', 'Sam Yeo', 'Custodian', { status: 'Locked' }),
    user('U-007', 'Tom Chew', 'Custodian', { teamId: 'T-A' }),
    user('U-008', 'Ali Rahim', 'Driver', { teamId: 'T-B' }),
    user('U-009', 'Grace Lim', 'Custodian', { teamId: 'T-B' }),
    user('U-010', 'Ken Ong', 'Custodian', { teamId: 'T-B' }),
    user('U-011', 'Vik Shah', 'Driver', { teamId: 'T-C' }),
    user('U-012', 'Mei Ling', 'Custodian', { teamId: 'T-C' }),
    user('U-013', 'Joe Tan', 'Custodian', { teamId: 'T-C' }),
    user('U-014', 'Dina Wu', 'Driver'),
    user('U-015', 'Hari Raj', 'Custodian'),
    user('U-016', 'Daniel Lim', 'Checker', { branchId: 'BR-002' }),
  ]

  const branch = (b: Omit<Branch, 'contactMobile' | 'contactEmail'>): Branch => ({
    ...b,
    contactMobile: '+95 9 450 112 233',
    contactEmail: `${b.contactName.toLowerCase().replace(/\s+/g, '.')}@bank.com`,
  })
  const branches: Branch[] = [
    branch({ id: 'BR-001', code: 'BR-001', name: 'Orchard Branch', address: '238 Orchard Rd, Singapore', type: 'Branch', lat: 1.3048, lng: 103.8318, radius: 150, contactName: 'Amy Tan', active: true }),
    branch({ id: 'BR-002', code: 'BR-002', name: 'Tampines Branch', address: '4 Tampines Central 5', type: 'Branch', lat: 1.3526, lng: 103.9447, radius: 120, contactName: 'Daniel Lim', active: true }),
    branch({ id: 'BR-003', code: 'BR-003', name: 'Bugis Branch', address: '200 Victoria St', type: 'Branch', lat: 1.2995, lng: 103.8554, radius: 100, contactName: 'Sara Koh', active: true }),
    branch({ id: 'BR-004', code: 'BR-004', name: 'Jurong Branch', address: '63 Jurong Gateway Rd', type: 'Branch', lat: 1.3331, lng: 103.7426, radius: 150, contactName: 'Wei Ming', active: false }),
    branch({ id: 'BR-005', code: 'BR-005', name: 'Clementi Branch', address: '3155 Commonwealth Ave W', type: 'Branch', lat: 1.3151, lng: 103.7652, radius: 120, contactName: 'Nora Lee', active: true }),
    branch({ id: 'HQ-001', code: 'HQ-001', name: 'HQ Cash Centre', address: '1 Raffles Quay', type: 'HQ', lat: 1.2812, lng: 103.8513, radius: 250, contactName: 'Ops Desk', active: true }),
  ]

  const teams: Team[] = [
    { id: 'T-A', name: 'Team A', status: 'Available', currentRequestId: null, memberIds: ['U-004', 'U-005', 'U-007'] },
    { id: 'T-B', name: 'Team B', status: 'On trip', currentRequestId: 'REQ-1043', memberIds: ['U-008', 'U-009', 'U-010'] },
    { id: 'T-C', name: 'Team C', status: 'Available', currentRequestId: null, memberIds: ['U-011', 'U-012', 'U-013'] },
  ]

  const tl = (...entries: [string, string, string][]): TimelineEntry[] =>
    entries.map(([label, by, atIso]) => ({ label, by, at: atIso }))

  const pending = (
    id: string,
    type: CashRequest['type'],
    branchId: string,
    amount: number,
    dateOffset: number,
    slot: string,
    createdBy: string,
    createdMinsAgo: number,
    remarks = 'Daily surplus cash',
  ): CashRequest => {
    const createdAt = minsAgo(createdMinsAgo)
    const by = users.find((u) => u.id === createdBy)!.name
    return {
      id, type, branchId, amount, currency: 'MMK', date: day(dateOffset), slot, remarks, createdBy, createdAt,
      status: 'Pending', teamId: null, rejectReason: null,
      timeline: tl(['Created', by, createdAt], ['Submitted for approval', by, createdAt]),
    }
  }

  const active = (
    id: string,
    type: CashRequest['type'],
    branchId: string,
    amount: number,
    status: CashRequest['status'],
    teamId: string,
    updatedMinsAgo: number,
  ): CashRequest => ({
    id, type, branchId, amount, currency: 'MMK', date: day(0), slot: 'Within 3 hours', remarks: '',
    createdBy: 'U-002', createdAt: minsAgo(updatedMinsAgo + 70), status, teamId, rejectReason: null,
    timeline: tl(
      ['Created', 'Priya Nair', minsAgo(updatedMinsAgo + 70)],
      ['Approved', 'Admin User', minsAgo(updatedMinsAgo + 58)],
      [`${teams.find((t) => t.id === teamId)!.name} assigned`, 'Admin User', minsAgo(updatedMinsAgo + 55)],
      ...(status === 'In Transit' || status === 'Delivered'
        ? ([['Departed HQ', 'Raj Kumar', minsAgo(updatedMinsAgo + 10)]] as [string, string, string][])
        : []),
      ...(status === 'Delivered'
        ? ([['Delivered to HQ', 'Raj Kumar', minsAgo(updatedMinsAgo)]] as [string, string, string][])
        : []),
    ),
  })

  const requests: CashRequest[] = [
    pending('REQ-1048', 'Deposit', 'BR-001', 250000, 1, 'Within 3 hours', 'U-002', 20),
    pending('REQ-1050', 'Withdrawal', 'BR-002', 120000, 1, 'Within 5 hours', 'U-001', 45),
    pending('REQ-1049', 'Deposit', 'BR-003', 80000, 1, 'Within 1 hour', 'U-003', 60),
    pending('REQ-1051', 'Withdrawal', 'BR-004', 300000, 2, 'Within 1 day', 'U-002', 120),
    pending('REQ-1052', 'Deposit', 'BR-005', 95000, 2, 'Within 2 days', 'U-001', 180),
    active('REQ-1042', 'Deposit', 'BR-001', 250000, 'In Transit', 'T-A', 1),
    active('REQ-1043', 'Deposit', 'BR-002', 180000, 'In Transit', 'T-B', 0),
    active('REQ-1045', 'Deposit', 'BR-003', 140000, 'In Transit', 'T-C', 3),
    active('REQ-1039', 'Withdrawal', 'BR-004', 200000, 'Assigned', 'T-C', 5),
    active('REQ-1038', 'Withdrawal', 'BR-005', 120000, 'Delivered', 'T-A', 12),
    active('REQ-1047', 'Withdrawal', 'BR-005', 60000, 'Assigned', 'T-C', 14),
  ]

  const audit: AuditLog[] = [
    { id: 'A-0008', at: at(0, 9, 41, 22, 104), event: 'Delivered', requestId: 'REQ-1038', userId: 'U-004', source: 'Mobile app', gps: '1.3151° N, 103.7652° E (±6 m)' },
    { id: 'A-0007', at: at(0, 9, 36, 5, 218), event: 'In Transit', requestId: 'REQ-1042', userId: 'U-004', source: 'Mobile app', gps: '1.3048° N, 103.8318° E (±8 m)' },
    { id: 'A-0006', at: at(0, 9, 30, 48, 551), event: 'Assign', requestId: 'REQ-1043', userId: 'U-003', source: 'Web portal', gps: null },
    { id: 'A-0005', at: at(0, 9, 28, 10, 37), event: 'Approve', requestId: 'REQ-1043', userId: 'U-003', source: 'Web portal', gps: null },
    { id: 'A-0004', at: at(0, 9, 15, 33, 902), event: 'Reject', requestId: 'REQ-1041', userId: 'U-003', source: 'Web portal', gps: null },
    { id: 'A-0003', at: at(0, 9, 12, 2, 460), event: 'Create', requestId: 'REQ-1048', userId: 'U-002', source: 'Web portal', gps: null },
    { id: 'A-0002', at: at(0, 8, 58, 19, 75), event: 'Cancel', requestId: 'REQ-1036', userId: 'U-001', source: 'Web portal', gps: null },
    { id: 'A-0001', at: at(0, 8, 40, 51, 640), event: 'In Transit', requestId: 'REQ-1035', userId: 'U-005', source: 'Mobile app', gps: '1.2995° N, 103.8554° E (±5 m)' },
  ]

  // ~128 completed trips over the last 13 days for Reports & Analytics.
  const rand = mulberry32(1042)
  const branchIds = ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005']
  const teamIds = ['T-A', 'T-B', 'T-C']
  const perDay = [9, 11, 10, 12, 13, 7, 6, 10, 11, 10, 12, 12, 5]
  const trips: Trip[] = []
  let n = 900
  perDay.forEach((count, i) => {
    const offset = i - (perDay.length - 1)
    for (let k = 0; k < count; k++) {
      const durationMin = 30 + Math.round(rand() * 32)
      trips.push({
        id: `REQ-${n++}`,
        date: day(offset),
        branchId: branchIds[Math.floor(rand() * branchIds.length)]!,
        type: rand() > 0.45 ? 'Deposit' : 'Withdrawal',
        teamId: teamIds[Math.floor(rand() * teamIds.length)]!,
        amount: Math.round(40 + rand() * 140) * 1000,
        currency: 'MMK',
        durationMin,
        onTime: rand() > 0.09,
      })
    }
  })
  // The three trips shown in the design, most recent first.
  trips.push(
    { id: 'REQ-1035', date: day(-1), branchId: 'BR-003', type: 'Deposit', teamId: 'T-C', amount: 90000, currency: 'MMK', durationMin: 38, onTime: true },
    { id: 'REQ-1038', date: day(0), branchId: 'BR-005', type: 'Withdrawal', teamId: 'T-A', amount: 120000, currency: 'MMK', durationMin: 51, onTime: false },
    { id: 'REQ-1042', date: day(0), branchId: 'BR-001', type: 'Deposit', teamId: 'T-A', amount: 250000, currency: 'MMK', durationMin: 42, onTime: true },
  )

  const notifications: Notification[] = [
    { id: 'N-3', title: 'GPS feed delayed', body: 'Team B last ping 2 min ago', at: minsAgo(2), read: false, link: '/live' },
    { id: 'N-2', title: 'New request to review', body: 'REQ-1048 · Orchard · MMK 250,000', at: minsAgo(20), read: false, link: '/approvals/REQ-1048' },
    { id: 'N-1', title: 'Trip delivered', body: 'REQ-1038 delivered by Team A', at: minsAgo(30), read: false, link: '/reports/REQ-1038' },
  ]

  return {
    users,
    branches,
    teams,
    requests,
    audit,
    trips,
    notifications,
    session: null,
    failedAttempts: {},
    seq: { request: 1053, user: 17, team: 4, audit: 9 },
  }
}
