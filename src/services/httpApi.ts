import type { User } from '@/types'
import { ApiError, type Api } from './types'

/**
 * Real implementation against the separate Laravel backend
 * (../Cashroute_backend). Enable with VITE_USE_MOCK_API=false and set
 * VITE_API_BASE_URL to the backend's /api URL.
 *
 * Assumes Laravel Sanctum SPA auth (session cookie + XSRF-TOKEN cookie) and
 * the routes listed in README.md → "API contract". Validation errors are
 * expected in Laravel's default 422 format: { message, errors: { field: [..] } }.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/CashRoute/Cashroute_backend/public/api').replace(/\/+$/, '')
/** Backend root (without /api), for Sanctum's CSRF cookie endpoint. */
const BACKEND_ROOT = BASE.replace(/\/api$/, '')

function xsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return m ? decodeURIComponent(m[1]!) : ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': xsrfToken(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return undefined as T
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fields: Record<string, string> = {}
    for (const [k, v] of Object.entries(json.errors ?? {})) fields[k] = Array.isArray(v) ? String(v[0]) : String(v)
    throw new ApiError(json.message ?? res.statusText, json.code ?? (res.status === 422 ? 'validation' : 'error'), res.status, fields)
  }
  // Accept both bare payloads and Laravel API Resources ({ data: ... }).
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T
}

const get = <T>(p: string) => request<T>('GET', p)
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b)
const put = <T>(p: string, b?: unknown) => request<T>('PUT', p, b)

export const httpApi: Api = {
  auth: {
    me: () => get<User | null>('/me').catch((e: ApiError) => (e.status === 401 ? null : Promise.reject(e))),
    login: async (username, password) => {
      await fetch(`${BACKEND_ROOT}/sanctum/csrf-cookie`, { credentials: 'include' })
      return post('/login', { username, password })
    },
    logout: () => post('/logout'),
    simulateLockout: async () => {
      throw new ApiError('Lockout simulation is only available in demo mode.', 'unsupported', 400)
    },
    changePassword: (currentPassword, newPassword) =>
      post('/me/password', { current_password: currentPassword, password: newPassword }),
  },
  branches: {
    list: () => get('/branches'),
    directory: () => get('/branch-directory'),
    create: (d) => post('/branches', d),
    update: (id, d) => put(`/branches/${id}`, d),
  },
  users: {
    list: () => get('/users'),
    create: (d) => post('/users', d),
    update: (id, d) => put(`/users/${id}`, d),
  },
  teams: {
    list: () => get('/teams'),
    create: (d) => post('/teams', d),
    update: (id, d) => put(`/teams/${id}`, d),
  },
  requests: {
    list: () => get('/requests'),
    get: (id) => get(`/requests/${id}`),
    create: (d) => post('/requests', d),
    update: (id, d) => put(`/requests/${id}`, d),
    cancel: (id, reason) => post(`/requests/${id}/cancel`, { reason }),
    approve: (id) => post(`/requests/${id}/approve`),
    reject: (id, reason) => post(`/requests/${id}/reject`, { reason }),
    assign: (id, teamId) => post(`/requests/${id}/assign`, { team_id: teamId }),
  },
  audit: { list: () => get('/audit-logs') },
  trips: { list: () => get('/trips') },
  notifications: {
    list: () => get('/notifications'),
    markAllRead: () => post('/notifications/read-all'),
  },
}
