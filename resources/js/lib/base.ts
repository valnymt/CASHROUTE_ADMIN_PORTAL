const root = document.getElementById('app')?.dataset

/**
 * URL prefix for page routes, passed in by the Blade view
 * (e.g. "/CashRoute_Admin_Portal/public" under XAMPP, "" with `php artisan serve`).
 */
export const BASE_PATH = (root?.base ?? '').replace(/\/+$/, '')

/** Laravel's asset() root for files in public/ (never contains index.php). */
const ASSET_ROOT = (root?.asset ?? BASE_PATH).replace(/\/+$/, '')

/** URL of a file in Laravel's public/ folder, e.g. asset('/assets/logo.png'). */
export const asset = (path: string) => `${ASSET_ROOT}${path}`
