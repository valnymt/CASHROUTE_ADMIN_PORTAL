# CashRoute – HQ Admin Portal

Working, responsive React UI for the Figma file **CashRoute – HQ Admin Portal v2 (Light Neon Glass)**.
React 19 + TypeScript + Tailwind CSS v4 + React Router 7, laid out in **Laravel's folder structure**
(`resources/js`, `resources/css`, `resources/views`) so it drops straight into a Laravel app.

There is no backend yet: everything runs in the browser against a mock API with demo data saved in
`localStorage`. Flip one env variable to point it at a real Laravel API later.

## Run it on its own (no Laravel)

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with **admin.maker / password**.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build |

Other demo accounts (same password): `priya.nair` (Maker only), `daniel.lim` (Checker only),
`amy.tan` (Maker). To reset the demo data, clear the site's local storage in the browser.

## What works

| Screen | Route | Interactions |
| --- | --- | --- |
| AP-01 Login / Account Locked | `/login` | Validation, show/hide password, 5 failed attempts lock the account, "simulate 5 failed attempts" demo, redirect back to the page you came from |
| AP-01 Session Timeout | (any page) | Idle detection (15 min, `VITE_IDLE_TIMEOUT_MIN`), 30 s countdown, Stay signed in / Log out, "Demo: idle timeout" link |
| AP-08 Live Monitoring + Stale GPS | `/live` | Moving team markers, All / In Transit / Stale GPS filters, click marker or ticker row for details, "Demo: GPS drop" toggles the stale-feed warning |
| AP-02 Branches + Add/Edit modal | `/branches` | Search, status filter, add/edit with validation, draggable map pin updates lat/long, radius ring, active toggle |
| AP-03 User Accounts + modal | `/users` | Search, role filter, add/edit, unlock a locked user via the status toggle |
| AP-03 Delivery Teams | `/teams` | Create team, edit members, drag-and-drop members between teams, "+ Add" from unassigned |
| AP-04/05 New Cash Request | `/requests/new` | Deposit/Withdrawal switch (pickup/drop-off auto-swap), amount formatting, live summary, validation, submit → Approvals |
| AP-06 Pending Approvals | `/approvals` | Pending / Approved / Rejected tabs with counts, search, your own requests highlighted |
| AP-06 Request Detail + Maker-Checker guard | `/approvals/:id` | Approve, reject, role checks, live timeline; the guard blocks approving your own request |
| AP-07 Reject modal / Team drawer | (from detail) | Reject requires a reason; after Approve the drawer opens to assign an available team (teams on a trip are disabled) |
| AP-09 Audit Trail | `/audit` | Every action you take is logged here; search, event filter, event detail panel (read-only) |
| AP-10 Reports + Request history | `/reports`, `/reports/:id` | Date/branch/type/status/team filters, KPIs and charts computed from data, pagination, **real CSV and Excel downloads** |

Global: ⌘K / Ctrl+K search across requests, branches and staff, a notifications dropdown, live
sidebar badges, toasts, and a slide-in menu on phones and tablets. Breakpoints: phone (<640px),
tablet (640–1023px, collapsible sidebar) and desktop (≥1024px, matches the Figma 1440×900 frames).

## Project structure

```
resources/
  css/app.css              Tailwind + design tokens (colors, glass, shadows from Figma)
  js/
    app.tsx                Entry point (mounts into <div id="app">)
    AppRoutes.tsx          All client-side routes
    components/            Icons, Logo, Backdrop and the UI kit (ui/index.tsx, ui/DataTable.tsx)
    layouts/               AppLayout (sidebar + topbar), AuthLayout, IdleTimeout
    pages/                 One folder per feature (auth, live, branches, users, requests, approvals, audit, reports)
    services/
      api.ts               Chooses mock or HTTP implementation
      mockApi.ts           In-browser backend (localStorage), validation and business rules
      httpApi.ts           Same API over fetch → Laravel /api routes (Sanctum)
      types.ts             The API contract both implementations follow
    store/                 Auth, toasts and the useApi data hook
    lib/                   Formatting, seed data, CSV/Excel export
    types/                 Domain types (User, Branch, Team, CashRequest, …)
  views/app.blade.php      Laravel Blade shell
public/assets/             Logo and background glow images from Figma
laravel/                   Files to copy into your Laravel project (see below)
index.html, vite.config.ts Standalone (non-Laravel) dev setup
```

## Putting it into a Laravel project

Tested approach: React SPA inside one Blade view (no Inertia needed). Requires Laravel 10+ and Node 18+.

1. **Create the Laravel app** (skip if you already have one):

   ```bash
   composer create-project laravel/laravel cashroute
   ```

2. **Copy these folders and files** from this repo into the Laravel project, overwriting when asked:

   | From this repo | To the Laravel project |
   | --- | --- |
   | `resources/js/` | `resources/js/` (replace the default `app.js` / `bootstrap.js`) |
   | `resources/css/app.css` | `resources/css/app.css` |
   | `resources/views/app.blade.php` | `resources/views/app.blade.php` |
   | `public/assets/` | `public/assets/` |
   | `tsconfig.json` | `tsconfig.json` |
   | `laravel/vite.config.js` | `vite.config.js` (project root) |
   | contents of `laravel/routes-web.php` | `routes/web.php` |

   Delete the old `resources/js/app.js` and `resources/js/bootstrap.js` if they are still there.

3. **Install the front-end packages** in the Laravel project:

   ```bash
   npm install react react-dom react-router-dom @fontsource/plus-jakarta-sans
   ```

   ```bash
   npm install -D @vitejs/plugin-react @tailwindcss/vite tailwindcss typescript @types/react @types/react-dom laravel-vite-plugin
   ```

4. **Run it:**

   ```bash
   php artisan serve
   ```

   ```bash
   npm run dev
   ```

   Open http://127.0.0.1:8000. For production, run `npm run build` and Laravel serves the built files from `public/build`.

### Connecting the real backend later

1. Install Sanctum for SPA auth (`php artisan install:api` on Laravel 11+).
2. Build the endpoints listed in `laravel/routes-api.php` (copy it into `routes/api.php`). The JSON shapes
   are in `resources/js/types/index.ts` and `resources/js/services/types.ts`. Validation errors use
   Laravel's default 422 format (`{ message, errors: { field: [...] } }`), which the forms already show
   next to the right input.
3. Set `VITE_USE_MOCK_API=false` in Laravel's `.env` and restart `npm run dev`.

The mock enforces the same business rules your controllers should:

- Only Checkers can approve or reject.
- A Maker cannot approve their own request.
- A reason is required to reject.
- Only approved requests can be assigned.
- Only available teams can be assigned.
- Every action writes an audit log entry.

## Notes

- **Currency:** the Figma file mixes MMK and SGD for the same request. The app stores a currency per
  request and the demo data uses MMK, which matches the form's default and the +95 phone numbers.
- **Live map:** the map is a stylised illustration, as in the design. Team positions are simulated
  until a real GPS feed exists. Swap in a map library such as Leaflet or Mapbox when the backend
  provides coordinates.
- **Dashboard:** the Figma file has no Dashboard frame, so `/` opens Live Monitoring.
