import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingBlock } from './components/ui'
import AppLayout from './layouts/AppLayout'
import Login from './pages/auth/Login'

const LiveMonitoring = lazy(() => import('./pages/live/LiveMonitoring'))
const Branches = lazy(() => import('./pages/branches/Branches'))
const UsersPage = lazy(() => import('./pages/users/Users'))
const Teams = lazy(() => import('./pages/users/Teams'))
const NewRequest = lazy(() => import('./pages/requests/NewRequest'))
const Requests = lazy(() => import('./pages/requests/Requests'))
const RequestShow = lazy(() => import('./pages/requests/RequestShow'))
const Approvals = lazy(() => import('./pages/approvals/Approvals'))
const RequestDetail = lazy(() => import('./pages/approvals/RequestDetail'))
const AuditTrail = lazy(() => import('./pages/audit/AuditTrail'))
const Reports = lazy(() => import('./pages/reports/Reports'))
const ReportDetail = lazy(() => import('./pages/reports/ReportDetail'))
const History = lazy(() => import('./pages/reports/History'))
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'))

/**
 * Client-side routes — one per Figma frame. Keep in sync with routes/web.php,
 * which lists the same URLs on the Laravel side.
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        {/* AP-01 · Login / Account Locked */}
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          {/* AP-08 · Live Monitoring / Stale GPS Warning */}
          <Route path="/live" element={<LiveMonitoring />} />
          <Route path="/live/stale-gps" element={<LiveMonitoring />} />

          {/* AP-04/05 · New Cash Request, All Requests, Request summary, Edit request */}
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:id" element={<RequestShow />} />
          <Route path="/requests/:id/edit" element={<NewRequest />} />

          {/* AP-06 · Approvals, Request Detail, Maker-Checker guard; AP-07 · Reject / Assign */}
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/approvals/:id" element={<RequestDetail />} />
          <Route path="/approvals/:id/reject" element={<RequestDetail />} />
          <Route path="/approvals/:id/assign" element={<RequestDetail />} />

          {/* AP-02 · Branch List / Add-Edit Branch */}
          <Route path="/branches" element={<Branches />} />
          <Route path="/branches/create" element={<Branches />} />
          <Route path="/branches/:id/edit" element={<Branches />} />

          {/* AP-03 · User Accounts / Add-Edit User / Delivery Teams */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/create" element={<UsersPage />} />
          <Route path="/users/:id/edit" element={<UsersPage />} />
          <Route path="/teams" element={<Teams />} />

          {/* AP-09 · Audit Trail */}
          <Route path="/audit" element={<AuditTrail />} />

          {/* AP-10 · Reports / Request Detail (history) */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/history" element={<History />} />

          {/* Account · change own password */}
          <Route path="/account/password" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<Navigate to="/live" replace />} />
      </Routes>
    </Suspense>
  )
}
