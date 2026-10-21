/**
 * URL path the app is served from, without the trailing slash:
 * "" in `npm run dev`, or e.g. "/CashRoute/CashRoute_Admin_Portal/dist" for a
 * build served by XAMPP (set with VITE_BASE_PATH in .env).
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** URL of a file in public/, e.g. asset('/images/logo.png'). */
export const asset = (path: string) => `${BASE_PATH}${path}`
