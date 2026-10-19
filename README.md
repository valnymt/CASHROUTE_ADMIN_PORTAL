# CashRoute – HQ Admin Portal

Code clone of the Figma file **CashRoute – HQ Admin Portal v2 (Light Neon Glass)**.
React + TypeScript + Vite + Tailwind CSS v4, font Plus Jakarta Sans.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (starts on the Login screen).

## How it's built

- `src/screens/` — one file per Figma frame, generated from Figma's design data
  (exact sizes, colors, radii, shadows, glass blur). `data-node-id` attributes
  map each element back to its Figma layer.
- `src/components/Stage.tsx` — renders each frame at its native 1440×900 and
  scales it to fit the window. Clicking any layer named `link:<key>` in Figma
  navigates using `linkTargets` in `src/routes.ts` (the prototype workflow).
- `src/components/Ap07Composites.tsx` — the AP-07 overlays are separate "Scrim"
  frames in Figma, stacked on top of their screen here the same way.
- `public/assets/` — icons, map shapes and logo exported from Figma.
- `scripts/localize.py` — re-run after pasting new Figma code into
  `src/screens/` to download its assets and fix font class names.

## Screens

| Route | Figma frame |
| --- | --- |
| `/login` | AP-01 · Login |
| `/login/locked` | AP-01 · Account Locked |
| `/session-timeout` | AP-01 · Session Timeout |
| `/live` | AP-08 · Live Monitoring |
| `/live/stale-gps` | AP-08 · Stale GPS Warning |
| `/branches` | AP-02 · Branch List |
| `/branches/edit` | AP-02 · Add/Edit Branch (modal) |
| `/users` | AP-03 · User Accounts |
| `/users/edit` | AP-03 · Add/Edit User (modal) |
| `/teams` | AP-03 · Delivery Teams |
| `/requests/new` | AP-04/05 · New Cash Request |
| `/approvals` | AP-06 · Pending Approvals |
| `/approvals/req-1048` | AP-06 · Request Detail & Approval |
| `/approvals/req-1049` | AP-06 · Maker-Checker Block Guard |
| `/approvals/req-1048/reject` | AP-07 · Reject Reason (modal) |
| `/approvals/req-1048/assign` | AP-07 · Team Assignment (drawer) |
| `/audit` | AP-09 · Audit Trail |
| `/reports` | AP-10 · Reports & Analytics |
| `/reports/req-1042` | AP-10 · Request Detail (history) |
