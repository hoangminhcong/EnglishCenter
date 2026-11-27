import type { IsoDateTimeString } from '../common/api.types'
import type {
  AccountType,
  PermissionCode,
  PortalType,
  StaffRole,
  StudentRole,
} from './rbac.types'

/* ============================================================================
 * 1. ACCOUNT STATUS & DATA SCOPE CONTRACTS (BACKEND-DRIVEN AUTH & FIXED RBAC)
 * ============================================================================ */

export const STAFF_ACCOUNT_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'LOCKED',
  'DISABLED',
  'PASSWORD_RESET_REQUIRED',
] as const

export type StaffAccountStatus = (typeof STAFF_ACCOUNT_STATUSES)[number]

export const EMPLOYEE_PROFILE_TYPES = ['EMPLOYEE', 'TEACHER'] as const
export type EmployeeProfileType = (typeof EMPLOYEE_PROFILE_TYPES)[number]

export const EMPLOYEE_WORK_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type EmployeeWorkStatus = (typeof EMPLOYEE_WORK_STATUSES)[number]

export const ACCESS_SCOPE_TYPES = ['OWN', 'TEAM', 'BRANCH', 'ALL'] as const
export type AccessScopeType = (typeof ACCESS_SCOPE_TYPES)[number]

export interface PermissionScopeGrant {
  type: AccessScopeType
  scopeIds?: readonly string[]
}

export const ACCOUNT_PROVISIONING_METHODS = [
  'INVITE_LINK',
  'TEMPORARY_PASSWORD',
] as const
export type AccountProvisioningMethod = (typeof ACCOUNT_PROVISIONING_METHODS)[number]

/* ============================================================================
 * 2. SEPARATED USER ACCOUNT, EMPLOYEE PROFILE & FIXED ROLE ASSIGNMENT ENTITIES
 * - Tuyệt đối không lưu password / passwordHash bên trong UserAccountDto trả về UI
 * ============================================================================ */

export interface StaffUserAccountDto {
  id: string
  username: string
  email: string
  accountType: AccountType
  status: StaffAccountStatus
  provisioningMethod: AccountProvisioningMethod
  mustChangePassword: boolean
  invitationSentAt?: IsoDateTimeString
  lastLoginAt?: IsoDateTimeString | null
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface StaffEmployeeProfileDto {
  id: string
  userId: string
  employeeCode: string
  fullName: string
  phone: string
  email: string
  profileType: EmployeeProfileType
  branchId: string
  branchName: string
  departmentId: string
  departmentName: string
  jobTitle?: string
  status: EmployeeWorkStatus
  /** Mở rộng chuyên môn khi profileType === 'TEACHER' */
  verifiedToeicScore?: number
  specializations?: readonly string[]
  assignedClassCodes?: readonly string[]
}

export interface UserRoleAssignmentDto {
  userId: string
  roleId: StaffRole
  scopeType: AccessScopeType
  scopeIds?: readonly string[]
  assignedByUserId?: string
  assignedAt: IsoDateTimeString
}

export interface AccountPermissionAuditLogDto {
  id: string
  targetUserId: string
  targetUsername: string
  targetFullName: string
  actionType:
    | 'ACCOUNT_CREATED'
    | 'PROFILE_UPDATED'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'ACCOUNT_DISABLED'
    | 'INVITATION_RESENT'
    | 'PASSWORD_RESET_REQUESTED'
    | 'FIRST_LOGIN_PASSWORD_CHANGED'
    | 'OWN_PASSWORD_CHANGED'
    | 'OWN_PROFILE_UPDATED'
  actorUserId: string
  actorName: string
  occurredAt: IsoDateTimeString
  previousSummary?: string
  nextSummary: string
  reason?: string
}

/* ============================================================================
 * 3. BACKEND-DRIVEN AUTHENTICATION, PORTAL RESOLUTION & /api/v1/auth/me CONTRACT
 * ============================================================================ */

export interface StaffLoginRequestDto {
  identifier: string
  password: string
  rememberMe?: boolean
}

export interface AuthenticatedStaffSessionDto {
  user: {
    id: string
    username: string
    displayName: string
    email: string
    status: StaffAccountStatus
    lastLoginAt?: IsoDateTimeString | null
  }
  accountType: 'STAFF'
  portal: 'STAFF'
  role: StaffRole
  roles: readonly StaffRole[]
  employee: {
    id: string
    employeeCode: string
    profileType: EmployeeProfileType
    phone: string
    email: string
    branchId: string
    branchName: string
    departmentId: string
    departmentName: string
    jobTitle?: string
    status: EmployeeWorkStatus
  }
  permissions: readonly PermissionCode[]
  scopes: Partial<Record<PermissionCode, PermissionScopeGrant>>
  defaultLandingRoute: string
}

export interface AuthenticatedClientSessionDto {
  user: {
    id: string
    username: string
    displayName: string
    email: string
    phone: string
    status: StaffAccountStatus
    avatarUrl?: string
    createdAt: IsoDateTimeString
    lastLoginAt?: IsoDateTimeString | null
  }
  accountType: 'STUDENT'
  portal: 'CLIENT'
  role: StudentRole
  permissions: readonly []
  defaultLandingRoute: string
}

export type UnifiedAuthMeResponseDto =
  | AuthenticatedStaffSessionDto
  | AuthenticatedClientSessionDto

export interface PortalRedirectRequirementDto {
  outcome: 'PORTAL_REDIRECT_REQUIRED'
  accountType: AccountType
  targetPortal: PortalType
  username: string
  displayName: string
  message: string
}

export type StaffLoginOutcomeDto =
  | {
      outcome: 'AUTHENTICATED'
      session: AuthenticatedStaffSessionDto
      accessToken?: string
    }
  | PortalRedirectRequirementDto
  | {
      outcome: 'PASSWORD_RESET_REQUIRED'
      challengeId: string
      userId: string
      username: string
      displayName: string
      email: string
      message: string
    }

export type ClientLoginOutcomeDto =
  | {
      outcome: 'AUTHENTICATED'
      session: AuthenticatedClientSessionDto
      accessToken?: string
    }
  | PortalRedirectRequirementDto

export interface CompleteFirstLoginPasswordRequestDto {
  challengeId: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangeOwnStaffPasswordRequestDto {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateOwnStaffProfileRequestDto {
  phone: string
}

export interface StaffOwnProfileBundleDto {
  account: StaffUserAccountDto
  employee: StaffEmployeeProfileDto
  session: AuthenticatedStaffSessionDto
}

export interface CreateStaffUserRequestDto {
  profile: {
    profileType: EmployeeProfileType
    fullName: string
    employeeCode: string
    phone: string
    email: string
    branchId: string
    departmentId: string
    jobTitle?: string
    verifiedToeicScore?: number
    specializations?: readonly string[]
  }
  account: {
    username: string
    loginEmail: string
    provisioningMethod: AccountProvisioningMethod
    temporaryPassword?: string
    confirmTemporaryPassword?: string
    mustChangePasswordOnFirstLogin: boolean
    initialStatus: StaffAccountStatus
  }
  authorization: {
    role: StaffRole
    scopeType: AccessScopeType
    scopeIds?: readonly string[]
    reason?: string
  }
}

export interface UpdateStaffUserRequestDto {
  userId: string
  profile: {
    profileType: EmployeeProfileType
    fullName: string
    employeeCode: string
    phone: string
    email: string
    branchId: string
    departmentId: string
    jobTitle?: string
    status: EmployeeWorkStatus
    verifiedToeicScore?: number
    specializations?: readonly string[]
  }
}
