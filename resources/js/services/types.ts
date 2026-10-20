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
export type UserInput = Omit<User, 'id' | 'username'> & { username?: string }
export type TeamInput = { name: string; memberIds: string[] }
export interface RequestInput {
  type: Direction
  branchId: string
  amount: number
  currency: Currency
  date: string
  slot: string
  remarks: string
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
  }
  branches: {
    list(): Promise<Branch[]>
    create(data: BranchInput): Promise<Branch>
    update(id: string, data: BranchInput): Promise<Branch>
  }
  users: {
    list(): Promise<User[]>
    create(data: UserInput): Promise<User>
    update(id: string, data: UserInput): Promise<User>
  }
  teams: {
    list(): Promise<Team[]>
    create(data: TeamInput): Promise<Team>
    update(id: string, data: TeamInput): Promise<Team>
  }
  requests: {
    list(): Promise<CashRequest[]>
    get(id: string): Promise<CashRequest>
    create(data: RequestInput): Promise<CashRequest>
    /** Maker edits their own request while it is still Pending. */
    update(id: string, data: RequestInput): Promise<CashRequest>
    /** Maker withdraws their own request while it is still Pending. */
    cancel(id: string, reason: string): Promise<CashRequest>
    approve(id: string): Promise<CashRequest>
    reject(id: string, reason: string): Promise<CashRequest>
    assign(id: string, teamId: string): Promise<CashRequest>
  }
  audit: { list(): Promise<AuditLog[]> }
  trips: { list(): Promise<Trip[]> }
  notifications: {
    list(): Promise<Notification[]>
    markAllRead(): Promise<void>
  }
}
