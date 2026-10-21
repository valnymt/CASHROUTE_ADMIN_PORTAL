import type { User } from '@/types'

/** Every delivery team must have at least this many of each role. */
export const TEAM_MIN = { Driver: 1, Custodian: 2 } as const

/** Driver / custodian counts for a set of member ids. */
export function teamMix(memberIds: string[], users: User[]) {
  const roles = memberIds.map((id) => users.find((u) => u.id === id)?.role)
  return { drivers: roles.filter((r) => r === 'Driver').length, custodians: roles.filter((r) => r === 'Custodian').length }
}

/** Why this member list can't form a team, or null if it's fine. */
export function teamRuleError(memberIds: string[], users: User[]): string | null {
  const { drivers, custodians } = teamMix(memberIds, users)
  if (drivers >= TEAM_MIN.Driver && custodians >= TEAM_MIN.Custodian) return null
  return `A team needs at least ${TEAM_MIN.Driver} driver and ${TEAM_MIN.Custodian} custodians (now ${drivers} driver${drivers === 1 ? '' : 's'}, ${custodians} custodian${custodians === 1 ? '' : 's'}).`
}
