import type { Branch, User } from '@/types'

/**
 * The branch a portal user is limited to, or null when they work across all
 * branches (Super Admin, or staff based at HQ). Branch Makers only raise
 * requests for their own branch, and branch Checkers only review requests from it.
 */
export function branchScope(user: User | null | undefined, branches: Branch[]): string | null {
  if (!user || user.role === 'Super Admin') return null
  const home = user.branchId ? branches.find((b) => b.id === user.branchId) : undefined
  return home?.type === 'Branch' ? home.id : null
}
