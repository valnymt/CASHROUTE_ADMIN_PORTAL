import type { ComponentType } from 'react'
import Ap01Login from './screens/Ap01Login'
import Ap01AccountLocked from './screens/Ap01AccountLocked'
import Ap01SessionTimeout from './screens/Ap01SessionTimeout'
import Ap08LiveMonitoring from './screens/Ap08LiveMonitoring'
import Ap08StaleGpsWarning from './screens/Ap08StaleGpsWarning'
import Ap02BranchList from './screens/Ap02BranchList'
import Ap02AddEditBranchModal from './screens/Ap02AddEditBranchModal'
import Ap03UserAccounts from './screens/Ap03UserAccounts'
import Ap03AddEditUserModal from './screens/Ap03AddEditUserModal'
import Ap03DeliveryTeams from './screens/Ap03DeliveryTeams'
import Ap0405NewCashRequest from './screens/Ap0405NewCashRequest'
import Ap06PendingApprovals from './screens/Ap06PendingApprovals'
import Ap06RequestDetailApproval from './screens/Ap06RequestDetailApproval'
import Ap06MakerCheckerBlockGuard from './screens/Ap06MakerCheckerBlockGuard'
import Ap09AuditTrail from './screens/Ap09AuditTrail'
import Ap10ReportsAnalytics from './screens/Ap10ReportsAnalytics'
import Ap10RequestDetailHistory from './screens/Ap10RequestDetailHistory'
import { Ap07RejectReason, Ap07TeamAssignment } from './components/Ap07Composites'

/** One route per Figma frame, in the order they appear in the file. */
export const screens: { path: string; frame: string; Component: ComponentType }[] = [
  { path: '/login', frame: 'AP-01 · Login', Component: Ap01Login },
  { path: '/login/locked', frame: 'AP-01 · Account Locked', Component: Ap01AccountLocked },
  { path: '/session-timeout', frame: 'AP-01 · Session Timeout', Component: Ap01SessionTimeout },
  { path: '/live', frame: 'AP-08 · Live Monitoring', Component: Ap08LiveMonitoring },
  { path: '/live/stale-gps', frame: 'AP-08 · Stale GPS Warning', Component: Ap08StaleGpsWarning },
  { path: '/branches', frame: 'AP-02 · Branch List', Component: Ap02BranchList },
  { path: '/branches/edit', frame: 'AP-02 · Add/Edit Branch (modal)', Component: Ap02AddEditBranchModal },
  { path: '/users', frame: 'AP-03 · User Accounts', Component: Ap03UserAccounts },
  { path: '/users/edit', frame: 'AP-03 · Add/Edit User (modal)', Component: Ap03AddEditUserModal },
  { path: '/teams', frame: 'AP-03 · Delivery Teams', Component: Ap03DeliveryTeams },
  { path: '/requests/new', frame: 'AP-04/05 · New Cash Request', Component: Ap0405NewCashRequest },
  { path: '/approvals', frame: 'AP-06 · Pending Approvals', Component: Ap06PendingApprovals },
  { path: '/approvals/req-1048', frame: 'AP-06 · Request Detail & Approval', Component: Ap06RequestDetailApproval },
  { path: '/approvals/req-1049', frame: 'AP-06 · Maker-Checker Block Guard', Component: Ap06MakerCheckerBlockGuard },
  { path: '/approvals/req-1048/reject', frame: 'AP-07 · Reject Reason (modal)', Component: Ap07RejectReason },
  { path: '/approvals/req-1048/assign', frame: 'AP-07 · Team Assignment (drawer)', Component: Ap07TeamAssignment },
  { path: '/audit', frame: 'AP-09 · Audit Trail', Component: Ap09AuditTrail },
  { path: '/reports', frame: 'AP-10 · Reports & Analytics', Component: Ap10ReportsAnalytics },
  { path: '/reports/req-1042', frame: 'AP-10 · Request Detail (history)', Component: Ap10RequestDetailHistory },
]

/** Figma prototype link keys ("link:<key>" layer names) -> route. */
export const linkTargets: Record<string, string> = {
  login: '/login',
  locked: '/login/locked',
  timeout: '/session-timeout',
  // The file has no Dashboard frame; Live Monitoring is the first screen in the nav.
  dashboard: '/live',
  live: '/live',
  stale: '/live/stale-gps',
  branches: '/branches',
  branch_form: '/branches/edit',
  users: '/users',
  user_form: '/users/edit',
  teams: '/teams',
  request_new: '/requests/new',
  approvals: '/approvals',
  detail: '/approvals/req-1048',
  detail_blocked: '/approvals/req-1049',
  reject: '/approvals/req-1048/reject',
  assign: '/approvals/req-1048/assign',
  audit: '/audit',
  reports: '/reports',
  report_detail: '/reports/req-1042',
}
