import type {
  AccountType,
  PortalType,
  StaffAccountStatus,
} from '@english-center/contracts'

export type UserRole = 'student'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Học viên',
}

/**
 * Thông tin phiên đăng nhập Học viên trên Client Web (Portal = CLIENT).
 * Tuyệt đối KHÔNG lưu mật khẩu ở bất kỳ đâu trong đối tượng này hoặc trong Storage.
 */
export interface AuthUser {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  accountType: 'STUDENT'
  portal: 'CLIENT'
  accountStatus: StaffAccountStatus
  defaultLandingRoute: string
  avatarUrl?: string
  createdAt: string
}

export interface LoginPayload {
  identifier: string
  password: string
  rememberMe?: boolean
}

export interface RegisterPayload {
  fullName: string
  username: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token?: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ClientPortalRedirectNotice {
  outcome?: 'PORTAL_REDIRECT_REQUIRED'
  accountType: AccountType
  targetPortal: PortalType
  username: string
  displayName: string
  message: string
  safeRedirectUrl: string | null
}

export interface AuthActionResponse {
  success: boolean
  message: string
  errorKind?: 'auth' | 'network' | 'server'
  user?: AuthUser
  portalRedirect?: ClientPortalRedirectNotice
}
