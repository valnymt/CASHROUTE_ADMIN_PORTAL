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
const Approvals = lazy(() => import('./pages/approvals/Approvals'))
const RequestDetail = lazy(() => import('./pages/approvals/RequestDetail'))
const AuditTrail = lazy(() => import('./pages/audit/AuditTrail'))
const Reports = lazy(() => import('./pages/reports/Reports'))
const ReportDetail = lazy(() => import('./pages/reports/ReportDetail'))

/**
 * Client-side routes. Laravel serves resources/views/app.blade.php for every
 * non-API URL (see laravel/routes-web.php) and React Router takes over.
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/live" element={<LiveMonitoring />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/approvals/:id" element={<RequestDetail />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/live" replace />} />
      </Routes>
    </Suspense>
  )
}
