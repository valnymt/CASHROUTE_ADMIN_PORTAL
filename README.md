# CashRoute – HQ Admin Portal (frontend)

React 19 + TypeScript + Tailwind CSS v4 + Vite single-page app for the CashRoute HQ admin portal,
built from the Figma file **CashRoute – HQ Admin Portal v2 (Light Neon Glass)**.

This folder is **frontend only**. The backend is a separate Laravel project:

```
C:\xampp\htdocs\CashRoute\
  CashRoute_Admin_Portal\   ← this folder (React)
  Cashroute_backend\        ← Laravel API (separate project)
```

There is no backend connection yet: the app runs on a built-in mock API with demo data saved in the
browser's local storage. When the Laravel API is ready, change two lines in `.env` (see below).

## Setup (first time)

```bash
npm install
```

```bash
copy .env.example .env
```

## Run while developing

```bash
npm run dev
```

Open http://localhost:5173. Pages hot-reload as you edit files in `src/`.

## Build and open it through XAMPP

```bash
npm run build
```

This creates `dist/`. With Apache running in XAMPP, open:

**http://localhost/CashRoute/CashRoute_Admin_Portal/**

That address forwards to `dist/`. The build uses `VITE_BASE_PATH` from `.env`, which defaults to
`/CashRoute/CashRoute_Admin_Portal/dist/`. If you move the folder, update that value and rebuild.

- `dist/.htaccess` makes deep links like `/dist/branches/create` work.
- The `.htaccess` in this folder blocks the browser from reading `src/`, `node_modules/`, `.env`
  and other project files.

Run `npm run build` again after every change to see it through XAMPP. `npm run dev` doesn't need a
rebuild.

**`dist/` is committed to git**, so after a `git pull` teammates can open the XAMPP address straight
away, with no `npm install` needed just to view it. Whoever changes the UI runs `npm run build` and
commits the updated `dist/` together with the code.

## Settings (`.env`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_USE_MOCK_API` | `true` | `true` = demo data in the browser. `false` = call the Laravel backend. |
| `VITE_API_BASE_URL` | `http://localhost/CashRoute/Cashroute_backend/public/api` | The backend's API address (used when mock is off). |
| `VITE_REQUIRE_LOGIN` | `false` | `false` = open any page without signing in (demo). `true` = always show the login screen first. |
| `VITE_IDLE_TIMEOUT_MIN` | `15` | Minutes idle before the "Are you still there?" warning. |
| `VITE_BASE_PATH` | `/CashRoute/CashRoute_Admin_Portal/dist/` | URL path of the built app (`npm run build` only). |

`.env` isn't committed. Everything in it ends up in the browser's JavaScript, so never put
passwords or secret keys there.

**Demo login** (when login is required): `admin.maker` / `password`. Other demo users, all with the
same password:

- `priya.nair` (Maker)
- `daniel.lim` (Checker)
- `amy.tan` (Maker)

To reset the demo data, clear the site's local storage in the browser.

## Project structure

```
index.html                 Page shell (Vite entry)
public/
  images/                  Logo and background glow images
  .htaccess                Copied into dist/ — page links work under Apache
src/
  main.tsx                 React entry
  AppRoutes.tsx            All page routes
  styles/app.css           Tailwind + design tokens (colours, glass, shadows from Figma)
  pages/                   One folder per feature: auth, live, branches, users, requests, approvals, audit, reports
  layouts/                 Sidebar + header shell, login shell, idle-timeout dialog
  components/              Icons, logo, map pin picker, UI kit (buttons, inputs, modal, combobox, data table…)
  services/
    api.ts                 Picks the mock or the real backend
    mockApi.ts             In-browser demo backend and business rules
    httpApi.ts             Same API over HTTP → the Laravel backend
    types.ts               The API contract both follow
    geocode.ts             Address ↔ map lookup (OpenStreetMap Nominatim)
  store/, lib/, types/     Auth state, data hook, toasts, formatting, demo data, shared types
vite.config.ts             Vite + React + Tailwind
.htaccess                  Protects this folder when it sits inside htdocs
```

## Screens

**Preview mode (default):** open any URL directly and you're signed in as Admin User. The login
screen is still at `/login`, and **Log out** takes you there. Set `VITE_REQUIRE_LOGIN=true` to require
signing in.

Demo IDs to try:
- requests `REQ-1048` (someone else's) and `REQ-1049` (yours, so the Maker-Checker guard applies)
- branch `BR-001`
- user `U-001`
- trip `REQ-1042`

| Screen | URL | What works |
| --- | --- | --- |
| Login / Account Locked | `/login` | Validation, show/hide password, 5 failed attempts lock the account |
| Session Timeout | any page | Warns after 15 minutes idle, with a 30-second countdown |
| Live Monitoring / Stale GPS | `/live`, `/live/stale-gps` | Moving team markers, map filters, details on click, "Demo: GPS drop" |
| Branches / Add / Edit / Deactivate | `/branches`, `/branches/create`, `/branches/{id}/edit` | Code and name search the bank's branch directory. Picking a registered branch updates it, e.g. after a relocation. Real map with a draggable pin and geo-fence circle; the map and Full Address update each other. |
| User Accounts / Add / Edit | `/users`, `/users/create`, `/users/{id}/edit` | Search, role filter, add/edit, unlock users |
| Delivery Teams | `/teams` | Create teams, edit members, drag-and-drop members between teams |
| New Cash Request | `/requests/new` | Deposit/Withdrawal, auto pickup/drop-off, Complete within, validation |
| All Requests / Request summary / Edit | `/requests`, `/requests/{id}`, `/requests/{id}/edit` | Status dropdown filter. The Maker can edit or cancel their own Pending request. |
| Pending Approvals | `/approvals` | Pending / Approved / Rejected / Cancelled tabs, search |
| Request Detail, Reject, Assign team | `/approvals/{id}`, `/approvals/{id}/reject`, `/approvals/{id}/assign` | Approve, reject (reason required), assign an available team. A Checker can also cancel an approved request. |
| Audit Trail | `/audit` | Every action is logged; search, filter, event details |
| Reports + Request history | `/reports`, `/reports/{id}` | Filters, KPIs, charts, pagination, CSV and Excel export |

## Connecting the Laravel backend

1. In the backend (`Cashroute_backend`), build the API. Its endpoints and JSON shapes must match
   `src/services/httpApi.ts` and `src/types/index.ts`:

   ```
   POST /api/login            GET  /api/me              POST /api/logout
   GET|POST /api/branches     PUT  /api/branches/{id}   GET  /api/branch-directory
   GET|POST /api/users        PUT  /api/users/{id}
   GET|POST /api/teams        PUT  /api/teams/{id}
   GET|POST /api/requests     GET|PUT /api/requests/{id}
   POST /api/requests/{id}/approve | reject | assign | cancel
   GET  /api/audit-logs       GET  /api/trips
   GET  /api/notifications    POST /api/notifications/read-all
   ```

   Return validation errors in Laravel's default 422 format; the forms already show them next to the
   right field.

2. Because the frontend and backend live at different addresses, the backend must allow this
   frontend. Install Sanctum (`php artisan install:api`), then in the backend's `.env` set:

   ```
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost
   SESSION_DOMAIN=localhost
   ```

   In the backend's `config/cors.php`, set `paths` to `['api/*', 'sanctum/csrf-cookie']`, set
   `allowed_origins` to `['http://localhost:5173', 'http://localhost']`, and set
   `supports_credentials` to `true`.

3. In this folder's `.env`, set `VITE_USE_MOCK_API=false`, check `VITE_API_BASE_URL`, and restart
   `npm run dev` (or run `npm run build` again).

The mock API (`src/services/mockApi.ts`) enforces the business rules the backend should copy:

- Only Checkers approve or reject.
- A Maker can't approve their own request.
- A reason is required to reject.
- Only approved requests can be assigned, and only to available teams.
- The Maker can edit or cancel their own request while it's Pending.
- A Checker can cancel an Approved or Assigned request, with a reason; the team is released.
- Every action writes an audit log entry.

## Notes

- **Currency:** amounts are in MMK.
- **Dashboard:** the Figma file has no Dashboard frame, so `/` opens Live Monitoring.
- **Internet:** the branch map and the address lookup need internet (OpenStreetMap).
