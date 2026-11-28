import {
  type AccessScopeType,
  type AccountStatus,
  type AccountType,
  type AuthenticatedStaffSessionDto,
  type PermissionCode as ContractPermissionCode,
  type PermissionScopeGrant,
  type PortalType,
  type StaffAccountStatus,
  type StaffRole as ContractStaffRole,
} from '@english-center/contracts'

export {
  type AccessScopeType,
  type AccountStatus,
  type AccountType,
  type AuthenticatedStaffSessionDto,
  type PermissionScopeGrant,
  type PortalType,
  type StaffAccountStatus,
}

export type StaffRole = ContractStaffRole

export type DataScope =
  | 'all'
  | 'own'
  | 'branch'
  | 'assigned_classes_only'
  | 'own_department'

export type PermissionCode = ContractPermissionCode

export function mapScopeTypeToLegacyDataScope(
  scopeType: AccessScopeType,
  isTeacherProfile = false,
): DataScope {
  if (scopeType === 'ALL') return 'all'
  if (scopeType === 'BRANCH') return 'branch'
  if (scopeType === 'TEAM') return 'own_department'
  return isTeacherProfile ? 'assigned_classes_only' : 'own'
}

export interface StaffUser {
  id: string
  username: string
  accountType: 'STAFF'
  portal: 'STAFF'
  employeeCode: string
  fullName: string
  email: string
  phone?: string
  role: StaffRole
  roles: readonly StaffRole[]
  departmentId: string
  department: string
  jobTitle?: string
  branchId: string
  branchName: string
  scopeType: AccessScopeType
  scopeIds?: readonly string[]
  scope: DataScope
  accountStatus: StaffAccountStatus
  status: AccountStatus
  permissions: readonly PermissionCode[]
  scopes: Partial<Record<PermissionCode, PermissionScopeGrant>>
  defaultLandingRoute: string
}

export function projectSessionToStaffUser(session: AuthenticatedStaffSessionDto): StaffUser {
  const primaryRole = session.role
  const firstGrant = Object.values(session.scopes)[0]
  const scopeType: AccessScopeType = firstGrant?.type ?? 'OWN'
  const isTeacher = session.employee.profileType === 'TEACHER'

  return {
    id: session.user.id,
    username: session.user.username,
    accountType: session.accountType,
    portal: session.portal,
    employeeCode: session.employee.employeeCode,
    fullName: session.user.displayName,
    email: session.user.email,
    phone: session.employee.phone,
    role: primaryRole,
    roles: session.roles,
    departmentId: session.employee.departmentId,
    department: session.employee.departmentName,
    jobTitle: session.employee.jobTitle,
    branchId: session.employee.branchId,
    branchName: session.employee.branchName,
    scopeType,
    scopeIds: firstGrant?.scopeIds,
    scope: mapScopeTypeToLegacyDataScope(scopeType, isTeacher),
    accountStatus: session.user.status,
    status: session.user.status === 'ACTIVE' ? 'active' : 'suspended',
    permissions: session.permissions,
    scopes: session.scopes,
    defaultLandingRoute: session.defaultLandingRoute,
  }
}
