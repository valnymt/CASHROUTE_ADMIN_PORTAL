import type { User } from '@/types'

/** Next User ID, e.g. U-017 — the same rule the server uses, so Add User shows the ID the table will get. */
export const nextUserId = (users: User[]) =>
  `U-${String(Math.max(0, ...users.map((u) => Number(u.id.replace(/\D/g, '')) || 0)) + 1).padStart(3, '0')}`
