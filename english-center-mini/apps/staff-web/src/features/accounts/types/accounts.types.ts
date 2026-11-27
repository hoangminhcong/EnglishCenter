import type {
  AccessScopeType,
  AccountStatus,
  PermissionCode,
  StaffAccountStatus,
  StaffEmployeeProfileDto,
  StaffRole,
  StaffUserAccountDto,
  UserRoleAssignmentDto,
} from '@english-center/contracts'
import type { DataScope } from '@/types/rbac.types'

export type AccountCategory = 'STAFF' | 'TEACHER' | 'STUDENT'

export interface LinkedEmployeeProfile {
  profileId: string
  employeeCode: string
  fullName: string
  departmentId: string
  department: string
  jobTitle?: string
  branchId: string
  branchName: string
  scope: DataScope
  joinedDate: string
}

export interface LinkedTeacherProfile {
  profileId: string
  teacherCode: string
  fullName: string
  departmentId: string
  department: string
  jobTitle?: string
  verifiedToeicScore?: number
  specializations: string[]
  assignedClassCodes: string[]
  branchId: string
  branchName: string
}

export interface LinkedStudentProfile {
  profileId: string
  studentCode: string
  fullName: string
  enrolledClassCode: string
  courseName: string
  entryScore: number
  targetScore: number
  branchName: string
}

/**
 * Bản ghi tổng hợp phục vụ màn hình Quản lý Tài khoản (/accounts).
 * Tách bạch rõ Tài khoản đăng nhập (userAccount), Hồ sơ nhân viên (staffProfile) và Role cố định (role).
 * Tuyệt đối không chứa password/hash và không có quyền tùy biến cá nhân.
 */
export interface ManagedAccountRecord {
  id: string
  username?: string
  email: string
  phone: string
  category: AccountCategory
  role: StaffRole | 'STUDENT'
  roles: readonly StaffRole[]
  status: AccountStatus
  accountStatus: StaffAccountStatus
  scopeType: AccessScopeType
  scopeIds?: readonly string[]
  createdAt: string
  lastLoginAt: string
  userAccount?: StaffUserAccountDto
  staffProfile?: StaffEmployeeProfileDto
  roleAssignments?: readonly UserRoleAssignmentDto[]
  effectivePermissions?: readonly PermissionCode[]
  employeeProfile?: LinkedEmployeeProfile
  teacherProfile?: LinkedTeacherProfile
  studentProfile?: LinkedStudentProfile
}

export interface AccountActorContext {
  userId: string
  fullName: string
  roles: readonly StaffRole[]
  permissions: readonly PermissionCode[]
}

export interface CreateStaffUserResult {
  record: ManagedAccountRecord
  /** Chỉ trả về 1 lần duy nhất trong bộ nhớ RAM ngay sau khi cấp mật khẩu tạm thời */
  oneTimeTemporaryPassword?: string
}

export interface SetStaffAccountStatusInput {
  userId: string
  nextStatus: 'ACTIVE' | 'LOCKED' | 'DISABLED'
  reason: string
}

export interface TriggerStaffPasswordResetInput {
  userId: string
  mode: 'REQUIRE_RESET_ONLY' | 'ISSUE_TEMP_PASSWORD'
  temporaryPassword?: string
  reason: string
}

export interface RoleMatrixItem {
  role: StaffRole
  label: string
  shortBadge: string
  scope: DataScope
  scopeType: AccessScopeType
  defaultLandingRoute: string
  description: string
  accountCount: number
  permissions: readonly PermissionCode[]
}
