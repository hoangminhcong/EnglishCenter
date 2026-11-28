import type { StaffAccountStatus, UnifiedAuthMeResponseDto } from '@english-center/contracts'
import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import {
  ApiClientError,
  httpClient,
  registerClientUnauthorizedHandler,
} from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { queryClient } from '@/services/api/queryClient'
import { resolveClientAppPortalAccess } from '@/services/portal/portalResolver'
import { isValidEmail, isValidVnPhone } from '@/utils/validators'
import type {
  AuthActionResponse,
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/features/auth/types/auth.types'

export const CLIENT_SESSION_STORAGE_KEY = 'ec_auth_session_user_v2'
export const CLIENT_CLEANUP_MIGRATION_KEY = 'ec_client_cleanup_migration_v1'

const REGISTERED_USERS_STORAGE_KEY = 'ec_auth_registered_users_v2'
const DEV_CREDENTIAL_DIGESTS_KEY = 'ec_client_dev_cred_digests_v2'

const VALID_ACCOUNT_STATUSES = new Set<string>([
  'PENDING_ACTIVATION',
  'ACTIVE',
  'LOCKED',
  'DISABLED',
  'PASSWORD_RESET_REQUIRED',
])

export interface MockAuthUserFixture {
  id: string
  username: string
  email: string
  password?: string
  fullName?: string
  displayName?: string
  phone?: string
  accountType?: 'STUDENT' | 'STAFF'
  portal?: 'CLIENT' | 'STAFF'
  accountStatus?: StaffAccountStatus
  status?: StaffAccountStatus
  defaultLandingRoute?: string
  avatarUrl?: string
  createdAt?: string
}

type AuthListener = () => void
const listeners = new Set<AuthListener>()

const DEFAULT_SEEDED_MOCK_USERS: readonly MockAuthUserFixture[] = [
  {
    id: 'stu-hv-001',
    username: 'hv.minhquan',
    email: 'minhquan@englishcenter.edu.vn',
    password: 'Hocvien@123',
    fullName: 'Đỗ Minh Quân',
    phone: '0988777666',
    accountType: 'STUDENT',
    portal: 'CLIENT',
    accountStatus: 'ACTIVE',
    defaultLandingRoute: '/student/dashboard',
    createdAt: '2026-10-15T08:00:00.000Z',
  },
  {
    id: 'stu-hv-002',
    username: 'hv.minhanh',
    email: 'minhanh@englishcenter.edu.vn',
    password: 'Hocvien@123',
    fullName: 'Nguyễn Minh Anh',
    phone: '0912345678',
    accountType: 'STUDENT',
    portal: 'CLIENT',
    accountStatus: 'ACTIVE',
    defaultLandingRoute: '/student/dashboard',
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'acc-stf-001',
    username: 'admin',
    email: 'admin@englishcenter.edu.vn',
    password: 'Staff@2026',
    displayName: 'Nguyễn Hoàng Nam',
    accountType: 'STAFF',
    portal: 'STAFF',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'acc-stf-002',
    username: 'tuvan',
    email: 'tuvan@englishcenter.edu.vn',
    password: 'Staff@2026',
    displayName: 'Lê Thanh Thảo',
    accountType: 'STAFF',
    portal: 'STAFF',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'acc-stf-003',
    username: 'ketoan',
    email: 'ketoan@englishcenter.edu.vn',
    password: 'Staff@2026',
    displayName: 'Trần Thu Hà',
    accountType: 'STAFF',
    portal: 'STAFF',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'acc-stf-004',
    username: 'hocvu',
    email: 'hocvu@englishcenter.edu.vn',
    password: 'Staff@2026',
    displayName: 'Lê Hoàng Quân',
    accountType: 'STAFF',
    portal: 'STAFF',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'acc-stf-007',
    username: 'giaovien',
    email: 'giaovien@englishcenter.edu.vn',
    password: 'Staff@2026',
    displayName: 'Cô Lan Hương',
    accountType: 'STAFF',
    portal: 'STAFF',
    accountStatus: 'ACTIVE',
  },
]

let injectedMockUsers: MockAuthUserFixture[] = [...DEFAULT_SEEDED_MOCK_USERS]

function notifyAuthListeners() {
  for (const listener of listeners) {
    listener()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLegacyDemoIdentity(id: unknown, username: unknown): boolean {
  const idStr = typeof id === 'string' ? id.trim() : ''
  const userStr = typeof username === 'string' ? username.trim().toLowerCase() : ''
  if (/^stu-00[12]$/i.test(idStr)) return true
  if (userStr.endsWith('.demo') || /^minhanh\.toeic$/i.test(userStr)) return true
  return false
}

function isValidStoredAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.username === 'string' &&
    value.username.trim().length > 0 &&
    typeof value.fullName === 'string' &&
    typeof value.email === 'string' &&
    typeof value.phone === 'string' &&
    value.role === 'student' &&
    value.accountType === 'STUDENT' &&
    value.portal === 'CLIENT' &&
    typeof value.accountStatus === 'string' &&
    VALID_ACCOUNT_STATUSES.has(value.accountStatus) &&
    typeof value.defaultLandingRoute === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function sanitizeStoredSessionInStorage(storage: Storage): void {
  const raw = storage.getItem(CLIENT_SESSION_STORAGE_KEY)
  if (!raw) return
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || isLegacyDemoIdentity(parsed.id, parsed.username)) {
      storage.removeItem(CLIENT_SESSION_STORAGE_KEY)
    }
  } catch {
    storage.removeItem(CLIENT_SESSION_STORAGE_KEY)
  }
}

export function runClientStorageCleanupMigration(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(CLIENT_CLEANUP_MIGRATION_KEY) === '1') {
      return
    }

    window.localStorage.removeItem('ec_client_mock_cred_digests_v1')
    window.localStorage.removeItem('ec_auth_session_user_v1')
    window.sessionStorage.removeItem('ec_auth_session_user_v1')

    for (const suffix of ['1', '2']) {
      window.localStorage.removeItem(`ec_portal_submissions_v2_stu-00${suffix}`)
      window.localStorage.removeItem(`ec_portal_support_requests_v2_stu-00${suffix}`)
    }

    sanitizeStoredSessionInStorage(window.localStorage)
    sanitizeStoredSessionInStorage(window.sessionStorage)

    const rawRegistered = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY)
    if (rawRegistered) {
      try {
        const parsedRegistered: unknown = JSON.parse(rawRegistered)
        if (Array.isArray(parsedRegistered)) {
          const cleaned = parsedRegistered.filter(
            (item) =>
              isValidStoredAuthUser(item) && !isLegacyDemoIdentity(item.id, item.username),
          )
          window.localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(cleaned))
        } else {
          window.localStorage.removeItem(REGISTERED_USERS_STORAGE_KEY)
        }
      } catch {
        window.localStorage.removeItem(REGISTERED_USERS_STORAGE_KEY)
      }
    }

    window.localStorage.setItem(CLIENT_CLEANUP_MIGRATION_KEY, '1')
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

runClientStorageCleanupMigration()

async function hashClientCredential(userId: string, password: string): Promise<string> {
  const input = `ec_dev_salt_v2::${userId}::${password}`
  if (globalThis.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input)
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

function readCredentialDigests(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(DEV_CREDENTIAL_DIGESTS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return {}
    const result: Record<string, string> = {}
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string') {
        result[key] = val
      }
    }
    return result
  } catch {
    return {}
  }
}

function writeCredentialDigest(userId: string, digest: string): void {
  if (typeof window === 'undefined') return
  try {
    const next = { ...readCredentialDigests(), [userId]: digest }
    window.localStorage.setItem(DEV_CREDENTIAL_DIGESTS_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota errors
  }
}

function readRegisteredUsers(): AuthUser[] {
  if (typeof window === 'undefined') return []
  runClientStorageCleanupMigration()
  try {
    const raw = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is AuthUser =>
        isValidStoredAuthUser(item) && !isLegacyDemoIdentity(item.id, item.username),
    )
  } catch {
    return []
  }
}

function saveRegisteredUsers(users: AuthUser[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(users))
  } catch {
    // Ignore storage errors
  }
}

export function configureMockAuthUsersForTest(users: readonly MockAuthUserFixture[]): void {
  injectedMockUsers = users.map((u) => ({ ...u }))
}

export function resetMockAuthForTest(): void {
  injectedMockUsers = [...DEFAULT_SEEDED_MOCK_USERS]
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CLIENT_SESSION_STORAGE_KEY)
      window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY)
      window.localStorage.removeItem(REGISTERED_USERS_STORAGE_KEY)
      window.localStorage.removeItem(DEV_CREDENTIAL_DIGESTS_KEY)
    } catch {
      // Ignore storage errors
    }
  }
  notifyAuthListeners()
  queryClient.clear()
}

export const authSessionStore = {
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    runClientStorageCleanupMigration()
    try {
      const raw =
        window.localStorage.getItem(CLIENT_SESSION_STORAGE_KEY) ??
        window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      if (
        !isValidStoredAuthUser(parsed) ||
        parsed.accountStatus !== 'ACTIVE' ||
        isLegacyDemoIdentity(parsed.id, parsed.username)
      ) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  },

  setCurrentUser(user: AuthUser | null, rememberMe = true): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(CLIENT_SESSION_STORAGE_KEY)
      window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY)
      if (user && user.accountType === 'STUDENT' && user.portal === 'CLIENT') {
        const serialized = JSON.stringify(user)
        if (rememberMe) {
          window.localStorage.setItem(CLIENT_SESSION_STORAGE_KEY, serialized)
        } else {
          window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, serialized)
        }
      }
    } catch {
      // Ignore storage errors
    }
    notifyAuthListeners()
  },

  subscribe(listener: AuthListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

registerClientUnauthorizedHandler(() => {
  authSessionStore.setCurrentUser(null)
  queryClient.clear()
})

export const authValidators = {
  required(value: string, emptyMessage: string): string {
    return value.trim() ? '' : emptyMessage
  },
  email(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return 'Email không được để trống.'
    return isValidEmail(trimmed) ? '' : 'Email chưa đúng định dạng.'
  },
  username(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return 'Tên đăng nhập không được để trống.'
    return /^[a-zA-Z0-9._-]{4,28}$/.test(trimmed)
      ? ''
      : 'Tên đăng nhập 4–28 ký tự, chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'
  },
  phone(value: string): string {
    const cleaned = value.replace(/\s+/g, '')
    if (!cleaned) return 'Số điện thoại không được để trống.'
    return isValidVnPhone(cleaned) ? '' : 'Số điện thoại chưa hợp lệ (VD: 0987654321).'
  },
  passwordStrength(value: string): string {
    if (!value) return 'Mật khẩu không được để trống.'
    if (value.length < 8 || !/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
      return 'Mật khẩu tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.'
    }
    return ''
  },
}

function mapMeToClientAuthUser(me: UnifiedAuthMeResponseDto): AuthUser | null {
  if (me.accountType !== 'STUDENT' || me.portal !== 'CLIENT') {
    return null
  }
  return {
    id: me.user.id,
    username: me.user.username,
    fullName: me.user.displayName,
    email: me.user.email,
    phone: me.user.phone,
    role: 'student',
    accountType: 'STUDENT',
    portal: 'CLIENT',
    accountStatus: me.user.status,
    defaultLandingRoute: me.defaultLandingRoute || '/student/dashboard',
    avatarUrl: me.user.avatarUrl,
    createdAt: me.user.createdAt,
  }
}

export const authService = {
  configureMockAuthUsersForTest,
  resetMockAuthForTest,

  async login(payload: LoginPayload): Promise<AuthActionResponse> {
    queryClient.clear()
    authSessionStore.setCurrentUser(null)

    if (!USE_MOCK_API) {
      try {
        const res = await httpClient.post<{
          outcome?: string
          accountType?: 'STUDENT' | 'STAFF'
          portal?: 'CLIENT' | 'STAFF'
          targetPortal?: 'CLIENT' | 'STAFF'
          username?: string
          displayName?: string
          message?: string
          session?: UnifiedAuthMeResponseDto
        }>(API_ENDPOINTS.auth.login, {
          identifier: payload.identifier.trim(),
          password: payload.password,
        })

        const resolvedAccountType = res.session?.accountType ?? res.accountType ?? 'STUDENT'
        const resolvedPortal = res.session?.portal ?? res.targetPortal ?? res.portal ?? 'CLIENT'

        if (resolvedAccountType !== 'STUDENT' || resolvedPortal !== 'CLIENT') {
          const portalResolution = resolveClientAppPortalAccess({
            accountType: resolvedAccountType,
            portal: resolvedPortal,
          })
          return {
            success: false,
            message:
              res.message ??
              'Tài khoản nhân sự không đăng nhập trên Cổng Học viên.',
            portalRedirect: {
              outcome: 'PORTAL_REDIRECT_REQUIRED',
              accountType: resolvedAccountType,
              targetPortal: 'STAFF',
              username: res.username ?? payload.identifier.trim(),
              displayName: res.displayName ?? payload.identifier.trim(),
              message:
                res.message ??
                'Tài khoản này thuộc Cổng Nhân sự. Vui lòng chuyển sang ứng dụng dành cho nhân sự.',
              safeRedirectUrl: portalResolution.safeRedirectUrl,
            },
          }
        }

        const me =
          res.session ?? (await httpClient.get<UnifiedAuthMeResponseDto>(API_ENDPOINTS.auth.me))
        const mappedUser = mapMeToClientAuthUser(me)
        if (!mappedUser) {
          return {
            success: false,
            errorKind: 'auth',
            message: 'Tài khoản không được cấp quyền truy cập Cổng Học viên.',
          }
        }
        authSessionStore.setCurrentUser(mappedUser, payload.rememberMe ?? true)
        return {
          success: true,
          message: 'Đăng nhập thành công.',
          user: mappedUser,
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          const errorKind =
            err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT_ERROR' || err.status === 0
              ? 'network'
              : err.status >= 500 || err.code === 'CONFIG_ERROR'
                ? 'server'
                : 'auth'
          return { success: false, errorKind, message: err.message }
        }
        return {
          success: false,
          errorKind: 'auth',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
        }
      }
    }

    await mockDelay(260)
    const identifier = payload.identifier.trim().toLowerCase()
    const digests = readCredentialDigests()

    const matchedInjected = injectedMockUsers.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier,
    )

    if (matchedInjected) {
      const storedDigest = digests[matchedInjected.id]
      if (storedDigest) {
        const candidateDigest = await hashClientCredential(matchedInjected.id, payload.password)
        if (candidateDigest !== storedDigest) {
          return {
            success: false,
            errorKind: 'auth',
            message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
          }
        }
      } else if (matchedInjected.password !== undefined && payload.password !== matchedInjected.password) {
        return {
          success: false,
          errorKind: 'auth',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
        }
      }

      const resolvedAccountType = matchedInjected.accountType ?? 'STUDENT'
      const resolvedPortal =
        matchedInjected.portal ?? (resolvedAccountType === 'STAFF' ? 'STAFF' : 'CLIENT')
      const resolvedStatus = matchedInjected.accountStatus ?? matchedInjected.status ?? 'ACTIVE'

      if (resolvedStatus === 'LOCKED' || resolvedStatus === 'DISABLED') {
        return {
          success: false,
          errorKind: 'auth',
          message: 'Tài khoản của bạn hiện đang bị khóa hoặc tạm ngừng truy cập.',
        }
      }

      if (resolvedAccountType !== 'STUDENT' || resolvedPortal !== 'CLIENT') {
        const portalRes = resolveClientAppPortalAccess({
          accountType: resolvedAccountType,
          portal: resolvedPortal,
        })
        const displayName =
          matchedInjected.displayName ?? matchedInjected.fullName ?? matchedInjected.username
        return {
          success: false,
          message: 'Tài khoản nhân sự không đăng nhập trên Cổng Học viên.',
          portalRedirect: {
            outcome: 'PORTAL_REDIRECT_REQUIRED',
            accountType: 'STAFF',
            targetPortal: 'STAFF',
            username: matchedInjected.username,
            displayName,
            message:
              'Tài khoản này thuộc Cổng Nhân sự. Vui lòng chuyển sang ứng dụng dành cho nhân sự.',
            safeRedirectUrl: portalRes.safeRedirectUrl,
          },
        }
      }

      if (resolvedStatus === 'PENDING_ACTIVATION') {
        return {
          success: false,
          errorKind: 'auth',
          message: 'Tài khoản của bạn đang chờ kích hoạt.',
        }
      }

      const studentUser: AuthUser = {
        id: matchedInjected.id,
        username: matchedInjected.username,
        fullName:
          matchedInjected.fullName ?? matchedInjected.displayName ?? matchedInjected.username,
        email: matchedInjected.email,
        phone: matchedInjected.phone ?? '',
        role: 'student',
        accountType: 'STUDENT',
        portal: 'CLIENT',
        accountStatus: resolvedStatus,
        defaultLandingRoute: matchedInjected.defaultLandingRoute || '/student/dashboard',
        avatarUrl: matchedInjected.avatarUrl,
        createdAt: matchedInjected.createdAt ?? new Date().toISOString(),
      }

      authSessionStore.setCurrentUser(studentUser, payload.rememberMe ?? true)
      return {
        success: true,
        message: 'Đăng nhập thành công.',
        user: studentUser,
      }
    }

    const users = readRegisteredUsers()
    const matchedStudent = users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier,
    )

    if (!matchedStudent) {
      return {
        success: false,
        errorKind: 'auth',
        message: 'Tài khoản không tồn tại hoặc hệ thống xác thực chưa kết nối máy chủ.',
      }
    }

    const expectedDigest = digests[matchedStudent.id]
    const candidateDigest = await hashClientCredential(matchedStudent.id, payload.password)
    if (!expectedDigest || candidateDigest !== expectedDigest) {
      return {
        success: false,
        errorKind: 'auth',
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      }
    }

    if (
      matchedStudent.accountStatus === 'LOCKED' ||
      matchedStudent.accountStatus === 'DISABLED'
    ) {
      return {
        success: false,
        errorKind: 'auth',
        message: 'Tài khoản của bạn hiện đang bị khóa hoặc tạm ngừng truy cập.',
      }
    }

    if (matchedStudent.accountStatus === 'PENDING_ACTIVATION') {
      return {
        success: false,
        errorKind: 'auth',
        message: 'Tài khoản của bạn đang chờ kích hoạt.',
      }
    }

    authSessionStore.setCurrentUser(matchedStudent, payload.rememberMe ?? true)
    return {
      success: true,
      message: 'Đăng nhập thành công.',
      user: matchedStudent,
    }
  },

  async register(payload: RegisterPayload): Promise<AuthActionResponse> {
    if (!USE_MOCK_API) {
      return httpClient.post<AuthActionResponse>(API_ENDPOINTS.auth.register, {
        fullName: payload.fullName.trim(),
        username: payload.username.trim(),
        email: payload.email.trim(),
        phone: payload.phone.replace(/\s+/g, ''),
        password: payload.password,
      })
    }

    await mockDelay(320)
    const users = readRegisteredUsers()
    const usernameLower = payload.username.trim().toLowerCase()
    const emailLower = payload.email.trim().toLowerCase()

    if (
      users.some((u) => u.username.toLowerCase() === usernameLower) ||
      injectedMockUsers.some((u) => u.username.toLowerCase() === usernameLower)
    ) {
      return {
        success: false,
        message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên đăng nhập khác.',
      }
    }
    if (
      users.some((u) => u.email.toLowerCase() === emailLower) ||
      injectedMockUsers.some((u) => u.email.toLowerCase() === emailLower)
    ) {
      return {
        success: false,
        message: 'Địa chỉ email này đã được đăng ký trong hệ thống.',
      }
    }

    const newId = `stu-${Date.now()}`
    const newUser: AuthUser = {
      id: newId,
      username: payload.username.trim(),
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      phone: payload.phone.replace(/\s+/g, ''),
      role: 'student',
      accountType: 'STUDENT',
      portal: 'CLIENT',
      accountStatus: 'ACTIVE',
      defaultLandingRoute: '/student/dashboard',
      createdAt: new Date().toISOString(),
    }

    const digest = await hashClientCredential(newId, payload.password)
    writeCredentialDigest(newId, digest)
    saveRegisteredUsers([...users, newUser])

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay.',
      user: newUser,
    }
  },

  async requestPasswordReset(payload: ForgotPasswordPayload): Promise<AuthActionResponse> {
    if (!USE_MOCK_API) {
      return httpClient.post<AuthActionResponse>(API_ENDPOINTS.auth.forgotPassword, payload)
    }

    await mockDelay(350)
    return {
      success: true,
      message:
        'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.',
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthActionResponse> {
    if (!USE_MOCK_API) {
      return httpClient.post<AuthActionResponse>(API_ENDPOINTS.auth.resetPassword, payload)
    }

    await mockDelay(350)
    if (!payload.token?.trim()) {
      return {
        success: false,
        message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      }
    }
    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    }
  },

  async changePassword(payload: ChangePasswordPayload): Promise<AuthActionResponse> {
    if (!USE_MOCK_API) {
      return httpClient.post<AuthActionResponse>(API_ENDPOINTS.auth.changePassword, payload)
    }

    await mockDelay(350)
    const current = authSessionStore.getCurrentUser()
    if (!current) {
      return { success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
    }
    if (payload.currentPassword === payload.newPassword) {
      return { success: false, message: 'Mật khẩu mới phải khác với mật khẩu hiện tại.' }
    }

    const digests = readCredentialDigests()
    const injected = injectedMockUsers.find((u) => u.id === current.id)
    if (digests[current.id]) {
      const currentHash = await hashClientCredential(current.id, payload.currentPassword)
      if (digests[current.id] !== currentHash) {
        return { success: false, message: 'Mật khẩu hiện tại không chính xác.' }
      }
    } else if (injected?.password !== undefined && payload.currentPassword !== injected.password) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác.' }
    }

    const nextHash = await hashClientCredential(current.id, payload.newPassword)
    writeCredentialDigest(current.id, nextHash)

    return {
      success: true,
      message: 'Cập nhật mật khẩu thành công.',
    }
  },

  async logout(): Promise<void> {
    if (!USE_MOCK_API) {
      try {
        await httpClient.post(API_ENDPOINTS.auth.logout, {})
      } catch {
        // Ignore network failure during logout cleanup
      }
    }
    await mockDelay(100)
    authSessionStore.setCurrentUser(null)
    queryClient.clear()
  },
}
