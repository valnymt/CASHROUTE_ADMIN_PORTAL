import type {
  AuditLog,
  Branch,
  CashRequest,
  Currency,
  Direction,
  Notification,
  Team,
  Trip,
  User,
} from '@/types'

export type BranchInput = Omit<Branch, 'id'>
/** Entry in the bank's branch directory; `registered` = already set up in the portal. */
export interface DirectoryBranch {
  code: string
  name: string
  address: string
  lat: number
  lng: number
  registered: boolean
}
export type UserInput = Omit<User, 'id' | 'username' | 'createdAt'> & { username?: string }
/** `confirmed: true` = Confirm team (needs at least 1 driver + 2 custodians). Leave it out to save as a draft. */
export type TeamInput = { name: string; memberIds: string[]; confirmed?: boolean; leaderId?: string }
export interface RequestInput {
  type: Direction
  branchId: string
  amount: number
  currency: Currency
  date: string
  slot: string
  remarks: string
}

export interface LiveTripLocation {
  name: string | null
  code: string | null
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  handoverRadius: number | null
  contactName?: string | null
  contactPhone?: string | null
}

export interface LiveTrip {
  id: string
  status: string
  currentLatitude: number | null
  currentLongitude: number | null
  lastPingAt: string | null
  pickup: LiveTripLocation | null
  dropoff: LiveTripLocation | null
}

/** Error with a machine-readable code (mirrors Laravel's JSON error responses). */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string = 'error',
    public status = 422,
    public fields: Record<string, string> = {},
  ) {
    super(message)
  }
}

/**
 * The full API surface the UI depends on. `mockApi` implements it in the
 * browser; `httpApi` implements it against Laravel routes under /api.
 */
export interface Api {
  auth: {
    me(): Promise<User | null>
    login(username: string, password: string): Promise<User>
    logout(): Promise<void>
    /** Demo helper from the design: burns the remaining attempts. */
    simulateLockout(username: string): Promise<void>
    /** The signed-in user replaces their own password (POST /me/password). */
    changePassword(currentPassword: string, newPassword: string): Promise<void>
  }
  branches: {
    list(): Promise<Branch[]>
    /** The bank's branch directory, registered or not (for Add Branch suggestions). */
    directory(): Promise<DirectoryBranch[]>
    create(data: BranchInput): Promise<Branch>
    update(id: string, data: BranchInput): Promise<Branch>
  }
  users: {
    list(): Promise<User[]>
    create(data: UserInput): Promise<User>
    update(id: string, data: UserInput): Promise<User>
    /**
     * Super Admin reactivates a locked user. Returns the one-time password the
     * user must change on first sign-in — show it to the admin so they can read
     * it to the user if the email didn't arrive.
     */
    reactivate(id: string): Promise<{ user: User; tempPassword: string; sentTo: string }>
  }
  teams: {
    list(): Promise<Team[]>
    create(data: TeamInput): Promise<Team>
    update(id: string, data: TeamInput): Promise<Team>
    setLeader(id: string, leaderId: string): Promise<Team>
  }
  requests: {
    list(): Promise<CashRequest[]>
    get(id: string): Promise<CashRequest>
    create(data: RequestInput): Promise<CashRequest>
    /** Maker edits their own request while it is still Pending. */
    update(id: string, data: RequestInput): Promise<CashRequest>
    /** Maker withdraws their own Pending request, or a Checker cancels an Approved/Assigned one (reason required). */
    cancel(id: string, reason: string): Promise<CashRequest>
    approve(id: string): Promise<CashRequest>
    reject(id: string, reason: string): Promise<CashRequest>
    assign(id: string, teamId: string): Promise<CashRequest>
  }
  audit: { list(): Promise<AuditLog[]> }
  trips: {
    list(): Promise<Trip[]>
    live(): Promise<LiveTrip[]>
    route(reference: string, position: string): Promise<{ geometry: { coordinates: [number, number][] } } | null>
    detail(reference: string): Promise<Trip | null>
    proofImageUrl(reference: string, image: number | 'signature'): string
  }
  notifications: {
    list(): Promise<Notification[]>
    markAllRead(): Promise<void>
  }
}
