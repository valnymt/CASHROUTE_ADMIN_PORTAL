import type { AuditLog, CashRequest, User } from '@/types'
import { BRANCH_DIRECTORY, createSeed, DEMO_PASSWORD, type Db } from '@/lib/seed'
import { nextUserId } from '@/lib/ids'
import { teamRuleError } from '@/lib/teams'
import { ApiError, type Api, type BranchInput, type RequestInput, type UserInput } from './types'

/**
 * In-browser stand-in for the Laravel API. Data lives in localStorage so the
 * demo survives reloads; call `resetDemoData()` (or clear site data) to start
 * over. Every method returns a Promise with a small delay, just like a real
 * network call, so loading states are exercised.
 */

const STORAGE_KEY = 'cashroute.mockdb.v8'
const MAX_ATTEMPTS = 5
const LATENCY = 180

let db: Db = load()

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* storage unavailable or corrupt — fall back to fresh seed */
  }
  return createSeed()
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetDemoData() {
  db = createSeed()
  save()
}

const clone = <T>(v: T): T => structuredClone(v)

function respond<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = fn()
        save()
        resolve(clone(result))
      } catch (e) {
        reject(e)
      }
    }, LATENCY)
  })
}

function currentUser(): User {
  const u = db.session && db.users.find((x) => x.id === db.session!.userId)
  if (!u) throw new ApiError('Your session has expired. Please sign in again.', 'unauthenticated', 401)
  return u
}

// Super Admin has both Maker and Checker rights (the Maker-Checker guard still applies to their own requests).
const canMake = (u: User) => u.role === 'Maker' || u.role === 'Super Admin'
const canCheck = (u: User) => u.role === 'Checker' || u.role === 'Super Admin'
const portalRoles: User['role'][] = ['Super Admin', 'Maker', 'Checker']

function audit(event: AuditLog['event'], requestId: string, userId: string) {
  db.audit.unshift({
    id: `A-${String(db.seq.audit++).padStart(4, '0')}`,
    at: new Date().toISOString(),
    event,
    requestId,
    userId,
    source: 'Web portal',
    gps: null,
  })
}

function findRequest(id: string): CashRequest {
  const r = db.requests.find((x) => x.id.toLowerCase() === id.toLowerCase())
  if (!r) throw new ApiError(`Request ${id} was not found.`, 'not_found', 404)
  return r
}

function validateRequest(data: RequestInput) {
  const fields: Record<string, string> = {}
  if (!db.branches.some((b) => b.id === data.branchId && b.active)) fields.branchId = 'Select an active branch.'
  if (!(data.amount > 0)) fields.amount = 'Enter an amount greater than 0.'
  if (!data.date) fields.date = 'Pick a date.'
  if (!data.slot) fields.slot = 'Choose how soon the team must finish.'
  if (Object.keys(fields).length) throw new ApiError('Please fix the highlighted fields.', 'validation', 422, fields)
}

/** A Maker may only edit or cancel their own request, and only while it is Pending. */
function ownPendingRequest(id: string, me: User, action: 'edit' | 'cancel'): CashRequest {
  const r = findRequest(id)
  if (r.createdBy !== me.id) throw new ApiError(`Only the Maker who created ${r.id} can ${action} it.`, 'forbidden', 403)
  if (r.status !== 'Pending')
    throw new ApiError(`${r.id} is ${r.status.toLowerCase()} and can no longer be ${action === 'edit' ? 'edited' : 'cancelled'}.`, 'conflict', 409)
  return r
}

function validateBranch(data: BranchInput, id?: string) {
  const fields: Record<string, string> = {}
  if (!data.code.trim()) fields.code = 'Branch code is required.'
  else if (db.branches.some((b) => b.code.toLowerCase() === data.code.trim().toLowerCase() && b.id !== id))
    fields.code = 'This branch code is already in use.'
  if (!data.name.trim()) fields.name = 'Branch name is required.'
  if (!data.address.trim()) fields.address = 'Address is required.'
  if (!Number.isFinite(data.lat) || data.lat < -90 || data.lat > 90) fields.lat = 'Latitude must be between -90 and 90.'
  if (!Number.isFinite(data.lng) || data.lng < -180 || data.lng > 180) fields.lng = 'Longitude must be between -180 and 180.'
  if (!Number.isFinite(data.radius) || data.radius < 10 || data.radius > 2000) fields.radius = 'Radius must be 10–2000 m.'
  if (!data.contactName.trim()) fields.contactName = 'Contact name is required.'
  if (!data.contactMobile.trim()) fields.contactMobile = 'Mobile number is required.'
  if (!data.contactEmail.trim()) fields.contactEmail = 'Email is required.'
  else if (!/^\S+@\S+\.\S+$/.test(data.contactEmail)) fields.contactEmail = 'Enter a valid email.'
  if (Object.keys(fields).length) throw new ApiError('Please fix the highlighted fields.', 'validation', 422, fields)
}

function validateUser(data: UserInput, id?: string) {
  const fields: Record<string, string> = {}
  if (!data.name.trim()) fields.name = 'Full name is required.'
  if (!data.role) fields.role = 'Select a role.'
  if (!data.email.trim()) fields.email = 'Email is required.'
  else if (!/^\S+@\S+\.\S+$/.test(data.email)) fields.email = 'Enter a valid email.'
  else if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase() && u.id !== id))
    fields.email = 'This email is already registered.'
  if (data.mobile && !/^\+?[\d\s-]{6,}$/.test(data.mobile)) fields.mobile = 'Enter a valid mobile number.'
  // Every new user needs a default password (portal or mobile app; they change it later themselves).
  if (!id) {
    if (!data.password) fields.password = 'Set a default password.'
    else if (data.password.length < 8) fields.password = 'Password must be at least 8 characters.'
  }
  if (Object.keys(fields).length) throw new ApiError('Please fix the highlighted fields.', 'validation', 422, fields)
}

/** Confirming a team requires at least 1 driver + 2 custodians. Drafts can have any members. */
function checkTeamRule(memberIds: string[], confirmed?: boolean) {
  const err = confirmed ? teamRuleError(memberIds, db.users) : null
  if (err) throw new ApiError(err, 'validation', 422, { members: err })
}

export const mockApi: Api = {
  auth: {
    me: () => respond(() => (db.session ? db.users.find((u) => u.id === db.session!.userId) ?? null : null)),

    login: (username, password) =>
      respond(() => {
        const key = username.trim().toLowerCase()
        if (!key || !password)
          throw new ApiError('Enter your username and password.', 'validation', 422, {
            ...(key ? {} : { username: 'Username is required.' }),
            ...(password ? {} : { password: 'Password is required.' }),
          })
        const u = db.users.find((x) => x.username.toLowerCase() === key)
        if (u?.status === 'Locked')
          throw new ApiError('Account locked', 'locked', 423)
        if (!u || password !== (u.password ?? DEMO_PASSWORD)) {
          const attempts = (db.failedAttempts[key] ?? 0) + 1
          db.failedAttempts[key] = attempts
          if (u && attempts >= MAX_ATTEMPTS) {
            u.status = 'Locked'
            save()
            throw new ApiError('Account locked', 'locked', 423)
          }
          save()
          const left = MAX_ATTEMPTS - attempts
          throw new ApiError(
            `Incorrect username or password.${u ? ` ${left} attempt${left === 1 ? '' : 's'} left.` : ''}`,
            'invalid_credentials',
            401,
          )
        }
        if (!portalRoles.includes(u.role))
          throw new ApiError('Delivery staff sign in with the CashRoute mobile app.', 'forbidden', 403)
        db.failedAttempts[key] = 0
        db.session = { userId: u.id }
        return u
      }),

    logout: () =>
      respond(() => {
        db.session = null
      }),

    simulateLockout: (username) =>
      respond(() => {
        const key = (username.trim() || 'admin.maker').toLowerCase()
        const u = db.users.find((x) => x.username.toLowerCase() === key)
        db.failedAttempts[key] = MAX_ATTEMPTS
        if (u) u.status = 'Locked'
      }),

  },

  branches: {
    list: () => respond(() => db.branches),
    directory: () =>
      respond(() => {
        // Registered branches use their current portal details; the rest come from the bank directory.
        const registered = db.branches.map((b) => ({ code: b.code, name: b.name, address: b.address, lat: b.lat, lng: b.lng, registered: true }))
        const others = BRANCH_DIRECTORY.filter((d) => !db.branches.some((b) => b.code === d.code)).map((d) => ({ ...d, registered: false }))
        return [...registered, ...others].sort((a, b) => a.code.localeCompare(b.code))
      }),
    create: (data) =>
      respond(() => {
        validateBranch(data)
        const b = { ...data, code: data.code.trim().toUpperCase(), id: data.code.trim().toUpperCase() }
        db.branches.push(b)
        return b
      }),
    update: (id, data) =>
      respond(() => {
        validateBranch(data, id)
        const i = db.branches.findIndex((b) => b.id === id)
        if (i < 0) throw new ApiError('Branch not found.', 'not_found', 404)
        db.branches[i] = { ...data, code: data.code.trim().toUpperCase(), id }
        return db.branches[i]
      }),
  },

  users: {
    list: () => respond(() => db.users),
    create: (data) =>
      respond(() => {
        validateUser(data)
        const u: User = {
          ...data,
          id: nextUserId(db.users),
          username: data.username || data.name.trim().toLowerCase().replace(/\s+/g, '.'),
        }
        db.users.push(u)
        return u
      }),
    update: (id, data) =>
      respond(() => {
        validateUser(data, id)
        const u = db.users.find((x) => x.id === id)
        if (!u) throw new ApiError('User not found.', 'not_found', 404)
        // Edit User never sends a password; only Change password does (for the signed-in user).
        Object.assign(u, data, { username: u.username, password: data.password || u.password })
        if (u.status === 'Active') db.failedAttempts[u.username.toLowerCase()] = 0
        return u
      }),
  },

  teams: {
    list: () => respond(() => db.teams),
    create: ({ name, memberIds, confirmed }) =>
      respond(() => {
        if (!name.trim()) throw new ApiError('Team name is required.', 'validation', 422, { name: 'Team name is required.' })
        if (db.teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase()))
          throw new ApiError('A team with this name exists.', 'validation', 422, { name: 'A team with this name exists.' })
        checkTeamRule(memberIds, confirmed)
        const t = { id: `T-${db.seq.team++}`, name: name.trim(), status: 'Available' as const, currentRequestId: null, memberIds: [] as string[], confirmed: false }
        db.teams.push(t)
        setMembers(t.id, memberIds)
        t.confirmed = !!confirmed
        return t
      }),
    update: (id, { name, memberIds, confirmed }) =>
      respond(() => {
        const t = db.teams.find((x) => x.id === id)
        if (!t) throw new ApiError('Team not found.', 'not_found', 404)
        if (!name.trim()) throw new ApiError('Team name is required.', 'validation', 422, { name: 'Team name is required.' })
        checkTeamRule(memberIds, confirmed)
        t.name = name.trim()
        setMembers(id, memberIds)
        t.confirmed = !!confirmed
        return t
      }),
  },

  requests: {
    list: () => respond(() => db.requests),
    get: (id) => respond(() => findRequest(id)),
    create: (data) =>
      respond(() => {
        const me = currentUser()
        if (!canMake(me)) throw new ApiError('Only Makers can create requests.', 'forbidden', 403)
        validateRequest(data)
        const now = new Date().toISOString()
        const r: CashRequest = {
          ...data,
          id: `REQ-${db.seq.request++}`,
          createdBy: me.id,
          createdAt: now,
          status: 'Pending',
          teamId: null,
          rejectReason: null,
          timeline: [
            { label: 'Created', by: me.name, at: now },
            { label: 'Submitted for approval', by: me.name, at: now },
          ],
        }
        db.requests.unshift(r)
        audit('Create', r.id, me.id)
        return r
      }),
    update: (id, data) =>
      respond(() => {
        const me = currentUser()
        const r = ownPendingRequest(id, me, 'edit')
        validateRequest(data)
        Object.assign(r, data)
        r.timeline.push({ label: 'Edited by Maker', by: me.name, at: new Date().toISOString() })
        audit('Edit', r.id, me.id)
        return r
      }),
    cancel: (id, reason) =>
      respond(() => {
        const me = currentUser()
        const r = findRequest(id)
        // Maker: withdraw their own request while it's Pending (reason optional).
        // Checker: cancel an approved request before the team leaves (reason required).
        const byChecker = r.status === 'Approved' || r.status === 'Assigned'
        if (byChecker) {
          if (!canCheck(me)) throw new ApiError('Only Checkers can cancel an approved request.', 'forbidden', 403)
          if (!reason.trim())
            throw new ApiError('A reason is required.', 'validation', 422, { reason: 'Enter why this approved request is being cancelled.' })
          const team = db.teams.find((t) => t.id === r.teamId)
          if (team && team.currentRequestId === r.id) {
            team.status = 'Available'
            team.currentRequestId = null
          }
        } else {
          ownPendingRequest(id, me, 'cancel')
        }
        r.status = 'Cancelled'
        r.cancelReason = reason.trim() || null
        const who = byChecker ? 'Checker' : 'Maker'
        r.cancelledBy = who
        r.timeline.push({
          label: reason.trim() ? `Cancelled by ${who} — ${reason.trim()}` : `Cancelled by ${who}`,
          by: me.name,
          at: new Date().toISOString(),
        })
        audit('Cancel', r.id, me.id)
        return r
      }),
    approve: (id) =>
      respond(() => {
        const me = currentUser()
        const r = findRequest(id)
        if (!canCheck(me)) throw new ApiError('Only Checkers can approve requests.', 'forbidden', 403)
        if (r.createdBy === me.id)
          throw new ApiError('Maker-Checker rule: you cannot approve a request you created.', 'maker_checker', 403)
        if (r.status !== 'Pending') throw new ApiError(`Request is already ${r.status.toLowerCase()}.`, 'conflict', 409)
        r.status = 'Approved'
        r.timeline.push({ label: 'Approved', by: me.name, at: new Date().toISOString() })
        audit('Approve', r.id, me.id)
        return r
      }),
    reject: (id, reason) =>
      respond(() => {
        const me = currentUser()
        const r = findRequest(id)
        if (!canCheck(me)) throw new ApiError('Only Checkers can reject requests.', 'forbidden', 403)
        if (r.createdBy === me.id)
          throw new ApiError('Maker-Checker rule: you cannot reject a request you created.', 'maker_checker', 403)
        if (!reason.trim())
          throw new ApiError('A reason is required.', 'validation', 422, { reason: 'Required — submission is blocked until a reason is entered.' })
        if (r.status !== 'Pending') throw new ApiError(`Request is already ${r.status.toLowerCase()}.`, 'conflict', 409)
        r.status = 'Rejected'
        r.rejectReason = reason.trim()
        r.timeline.push({ label: `Rejected — ${reason.trim()}`, by: me.name, at: new Date().toISOString() })
        audit('Reject', r.id, me.id)
        return r
      }),
    assign: (id, teamId) =>
      respond(() => {
        const me = currentUser()
        const r = findRequest(id)
        const t = db.teams.find((x) => x.id === teamId)
        if (r.status !== 'Approved') throw new ApiError('Only approved requests can be assigned.', 'conflict', 409)
        if (!t) throw new ApiError('Select a team.', 'validation', 422)
        if (t.status !== 'Available') throw new ApiError(`${t.name} is on a trip.`, 'conflict', 409)
        if (!t.confirmed) throw new ApiError(`${t.name} isn't confirmed yet. Confirm it in Delivery Teams first.`, 'conflict', 409)
        r.status = 'Assigned'
        r.teamId = t.id
        r.timeline.push({ label: `${t.name} assigned`, by: me.name, at: new Date().toISOString() })
        t.status = 'On trip'
        t.currentRequestId = r.id
        audit('Assign', r.id, me.id)
        db.notifications.unshift({
          id: `N-${Date.now()}`,
          title: `${t.name} notified`,
          body: `Push sent for ${r.id}`,
          at: new Date().toISOString(),
          read: false,
          link: `/approvals/${r.id}`,
        })
        return r
      }),
  },

  audit: { list: () => respond(() => db.audit) },
  trips: { list: () => respond(() => db.trips) },

  notifications: {
    list: () => respond(() => db.notifications),
    markAllRead: () =>
      respond(() => {
        db.notifications.forEach((n) => (n.read = true))
      }),
  },
}

/** Move users into a team (removing them from any other team). */
function setMembers(teamId: string, memberIds: string[]) {
  for (const t of db.teams) {
    if (t.id === teamId) continue
    const kept = t.memberIds.filter((m) => !memberIds.includes(m))
    // Losing a member to another team turns a confirmed team back into a draft.
    if (kept.length !== t.memberIds.length) t.confirmed = false
    t.memberIds = kept
  }
  const team = db.teams.find((t) => t.id === teamId)!
  for (const u of db.users) {
    if (memberIds.includes(u.id)) u.teamId = teamId
    else if (u.teamId === teamId) u.teamId = null
  }
  team.memberIds = [...memberIds]
}

/**
 * Demo-only: unlock an account again (in production a Super Admin does this
 * from Users & Teams → Edit → Status).
 */
export function demoUnlock(username: string) {
  const key = username.trim().toLowerCase()
  const u = db.users.find((x) => x.username.toLowerCase() === key)
  if (u) u.status = 'Active'
  db.failedAttempts[key] = 0
  save()
}
