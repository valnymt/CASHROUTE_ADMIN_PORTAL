# CashRoute – HQ Admin Portal

A **Laravel 12** application whose front end is a React 19 + TypeScript + Tailwind CSS v4 single-page
app, built from the Figma file **CashRoute – HQ Admin Portal v2 (Light Neon Glass)**.

- `routes/web.php` has one named route per Figma screen, each returning its own Blade view in
  `resources/views/pages/`.
- Every view extends `resources/views/layouts/app.blade.php`, where React renders the screen.
- There's no database or API yet: the screens run on a mock API in the browser, with demo data
  saved in `localStorage`.

## Requirements

- PHP 8.2+ with these extensions enabled in `php.ini`:
  - `openssl`
  - `mbstring`
  - `fileinfo`
  - `pdo_sqlite` or `pdo_mysql`
- Composer 2
- Node 18+

XAMPP 8.2 ships all of these.

## First-time setup

```bash
composer install
```

```bash
npm install
```

```bash
copy .env.example .env
```

```bash
php artisan key:generate
```

```bash
npm run build
```

`.env` is not committed. Copying `.env.example` gives a working config: no database is needed, because
sessions and cache use files.

## Running it

### Option A – XAMPP (Apache)

1. Put the project in `C:\xampp\htdocs\CashRoute_Admin_Portal`.
2. Start **Apache** in the XAMPP Control Panel.
3. Open http://localhost/CashRoute_Admin_Portal/public/

The app works from that sub-folder. Laravel passes the URL prefix to React, and the built assets use
relative paths.

### Option B – Laravel's own server

```bash
php artisan serve
```

Then open http://127.0.0.1:8000.

### While editing React code

Run the Vite dev server alongside Apache or `artisan serve`:

```bash
npm run dev
```

Laravel's `@vite` tag picks up the dev server automatically and pages hot-reload. Stop it and run
`npm run build` when you're done; Apache then serves the files in `public/build`.

**Demo login:** `admin.maker` / `password`. Other demo users, all with the same password:

- `priya.nair` (Maker)
- `daniel.lim` (Checker)
- `amy.tan` (Maker)

To reset the demo data, clear the site's local storage in the browser.

## Project structure

```
app/                       Laravel PHP code (controllers, models — add the backend here)
bootstrap/, config/        Laravel framework setup
database/                  Migrations, seeders (Laravel defaults for now)
public/
  index.php, .htaccess     Laravel front controller (Apache points here)
  assets/                  Logo and background glow images from Figma
  build/                   Compiled React app (created by `npm run build`, not committed)
resources/
  views/
    layouts/app.blade.php  Shared page shell that loads React (@vite)
    pages/                 One Blade view per Figma screen (branches/index, branches/create, …)
  css/app.css              Tailwind + design tokens (colours, glass, shadows from Figma)
  js/
    app.tsx                React entry (loaded by @vite in the Blade view)
    AppRoutes.tsx          All page routes
    pages/                 One folder per feature: auth, live, branches, users, requests, approvals, audit, reports
    layouts/               Sidebar + topbar shell, login shell, idle-timeout dialog
    components/            Icons, logo, UI kit (buttons, inputs, modal, drawer, data table…)
    services/              api.ts → mockApi.ts (browser demo) or httpApi.ts (real Laravel API)
    store/, lib/, types/   Auth state, data hook, toasts, formatting, demo seed data, types
routes/web.php             One named route per screen (see table below)
vite.config.js             Vite + laravel-vite-plugin + React + Tailwind
```

## Screens

**Preview mode (default):** open any URL directly. You're signed in automatically as Admin User, so no login is needed to look around. The login screen is still at `/login`, and **Log out** takes you there. Set `VITE_REQUIRE_LOGIN=true` in `.env` and run `npm run build` to make every page require signing in (`admin.maker` / `password`). Demo IDs: requests `REQ-1048` (someone else's) and `REQ-1049` (yours, Maker-Checker guard), branch `BR-001`, user `U-001`, trip `REQ-1042`.

| Screen | URL | What works |
| --- | --- | --- |
| Login / Account Locked | `/login` | Validation, show/hide password, 5 failed attempts lock the account |
| Session Timeout | any page | Warns after 15 minutes idle, with a 30-second countdown |
| Live Monitoring / Stale GPS | `/live`, `/live/stale-gps` | Moving team markers, map filters, details on click, "Demo: GPS drop" |
| Branches / Add / Edit | `/branches`, `/branches/create`, `/branches/{id}/edit` | Search, filter, add/edit with validation, draggable map pin |
| User Accounts / Add / Edit | `/users`, `/users/create`, `/users/{id}/edit` | Search, role filter, add/edit, unlock users |
| Delivery Teams | `/teams` | Create teams, edit members, drag-and-drop members between teams |
| New Cash Request | `/requests/new` | Deposit/Withdrawal, auto pickup/drop-off, validation, submit → opens the new request's summary |
| All Requests / Request summary | `/requests`, `/requests/{id}` | Search, created-by and status filters; summary card with timeline |
| Pending Approvals | `/approvals` | Pending / Approved / Rejected tabs, search |
| Request Detail, Maker-Checker guard, Reject, Assign team | `/approvals/{id}`, `/approvals/{id}/reject`, `/approvals/{id}/assign` | Approve, reject with a required reason, assign an available team |
| Audit Trail | `/audit` | Every action is logged; search, filter, event details |
| Reports + Request history | `/reports`, `/reports/{id}` | Filters, KPIs, charts, pagination, CSV and Excel export |

Also on every page:

- Live sidebar counts
- Phone and tablet layout with a slide-in menu

## Connecting a real backend (next step)

1. Add the API and Sanctum:

   ```bash
   php artisan install:api
   ```

2. Create migrations, models and controllers for:
   - users
   - branches
   - teams
   - cash requests
   - audit logs
   - trips
   - notifications

   The JSON shapes the UI expects are in `resources/js/types/index.ts`.

3. Add these routes to `routes/api.php`. They're the ones `resources/js/services/httpApi.ts` calls:

   ```
   POST /api/login            GET  /api/me              POST /api/logout
   GET|POST /api/branches     PUT  /api/branches/{id}
   GET|POST /api/users        PUT  /api/users/{id}
   GET|POST /api/teams        PUT  /api/teams/{id}
   GET|POST /api/requests     GET  /api/requests/{id}
   POST /api/requests/{id}/approve | reject | assign
   GET  /api/audit-logs       GET  /api/trips
   GET  /api/notifications    POST /api/notifications/read-all
   ```

   Return validation errors in Laravel's default 422 format; the forms already show them next to
   the right field.

4. Set `VITE_USE_MOCK_API=false` in `.env`, then run `npm run build`.

The mock API in `resources/js/services/mockApi.ts` enforces the business rules the controllers
should copy:

- Only Checkers approve or reject.
- A Maker can't approve their own request.
- A reason is required to reject.
- Only approved requests can be assigned, and only to available teams.
- Every action writes an audit log entry.

## Notes

- **Currency:** the Figma file mixes MMK and SGD, so the demo data uses MMK, the form's default.
- **Dashboard:** the Figma file has no Dashboard frame, so `/` opens Live Monitoring.
