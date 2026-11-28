import type {
  AccountType,
  AuthenticatedStaffSessionDto,
  ChangeOwnStaffPasswordRequestDto,
  CompleteFirstLoginPasswordRequestDto,
  PortalType,
  StaffLoginOutcomeDto,
  StaffLoginRequestDto,
  StaffOwnProfileBundleDto,
  UnifiedAuthMeResponseDto,
  UpdateOwnStaffProfileRequestDto,
} from '@english-center/contracts'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import type { AuthRepository } from '@/features/auth/repositories/authRepository'
import { sessionTokenManager } from '@/features/auth/services/sessionTokenManager'

interface BackendLoginHttpPayload {
  outcome?: 'AUTHENTICATED' | 'PASSWORD_RESET_REQUIRED' | 'PORTAL_REDIRECT_REQUIRED'
  accessToken?: string
  accountType?: AccountType
  portal?: PortalType
  targetPortal?: PortalType
  challengeId?: string
  userId?: string
  username?: string
  displayName?: string
  email?: string
  message?: string
  session?: UnifiedAuthMeResponseDto
}

/**
 * HTTP Auth Adapter chuẩn bị sẵn để kết nối Backend Node.js dùng chung (/api/v1/auth/*).
 * Lưu ý: Backend chưa được triển khai trong phạm vi hiện tại; Adapter này chỉ kích hoạt khi tắt Mock.
 */
export const httpAuthAdapter: AuthRepository = {
  async login(input: StaffLoginRequestDto): Promise<StaffLoginOutcomeDto> {
    const response = await staffHttpClient.post<BackendLoginHttpPayload>(
      STAFF_API_ENDPOINTS.auth.login,
      {
        identifier: input.identifier.trim(),
        password: input.password,
      },
    )

    if (response.outcome === 'PASSWORD_RESET_REQUIRED' && response.challengeId) {
      return {
        outcome: 'PASSWORD_RESET_REQUIRED',
        challengeId: response.challengeId,
        userId: response.userId ?? '',
        username: response.username ?? input.identifier.trim(),
        displayName: response.displayName ?? input.identifier.trim(),
        email: response.email ?? '',
        message:
          response.message ?? 'Tài khoản cần thiết lập mật khẩu mới trước khi truy cập hệ thống.',
      }
    }

    if (
      response.outcome === 'PORTAL_REDIRECT_REQUIRED' ||
      response.portal === 'CLIENT' ||
      response.targetPortal === 'CLIENT' ||
      response.accountType === 'STUDENT'
    ) {
      sessionTokenManager.clear()
      return {
        outcome: 'PORTAL_REDIRECT_REQUIRED',
        accountType: response.accountType ?? 'STUDENT',
        targetPortal: 'CLIENT',
        username: response.username ?? input.identifier.trim(),
        displayName: response.displayName ?? input.identifier.trim(),
        message:
          response.message ??
          'Tài khoản này thuộc Cổng Học viên (Client Web), không có quyền truy cập Staff Web.',
      }
    }

    if (response.accessToken) {
      sessionTokenManager.setAccessToken(response.accessToken)
    }

    const mePayload =
      response.session ??
      (await staffHttpClient.get<UnifiedAuthMeResponseDto>(STAFF_API_ENDPOINTS.auth.me))

    if (mePayload.portal !== 'STAFF' || mePayload.accountType !== 'STAFF') {
      sessionTokenManager.clear()
      return {
        outcome: 'PORTAL_REDIRECT_REQUIRED',
        accountType: mePayload.accountType,
        targetPortal: mePayload.portal,
        username: mePayload.user.username,
        displayName: mePayload.user.displayName,
        message: 'Tài khoản này thuộc Cổng Học viên (Client Web), không thuộc Staff Web.',
      }
    }

    if (!mePayload.permissions || mePayload.permissions.length === 0) {
      sessionTokenManager.clear()
      throw new StaffApiClientError('Tài khoản chưa được cấp quyền truy cập hệ thống.', 403)
    }

    return {
      outcome: 'AUTHENTICATED',
      session: mePayload,
      accessToken: response.accessToken,
    }
  },

  async completeFirstLoginPassword(
    input: CompleteFirstLoginPasswordRequestDto,
  ): Promise<AuthenticatedStaffSessionDto> {
    const res = await staffHttpClient.post<{
      accessToken?: string
      session?: AuthenticatedStaffSessionDto
    }>(STAFF_API_ENDPOINTS.auth.completeFirstLoginPassword, input)

    if (res.accessToken) {
      sessionTokenManager.setAccessToken(res.accessToken)
    }

    const session = res.session ?? (await this.getCurrentUser())
    if (!session) {
      throw new StaffApiClientError('Không thể khởi tạo phiên làm việc nhân sự.', 401)
    }
    return session
  },

  async getMyProfileBundle(): Promise<StaffOwnProfileBundleDto> {
    return staffHttpClient.get<StaffOwnProfileBundleDto>(STAFF_API_ENDPOINTS.auth.myProfile)
  },

  async updateOwnProfile(
    input: UpdateOwnStaffProfileRequestDto,
  ): Promise<StaffOwnProfileBundleDto> {
    return staffHttpClient.patch<StaffOwnProfileBundleDto>(
      STAFF_API_ENDPOINTS.auth.myProfile,
      input,
    )
  },

  async changeOwnPassword(input: ChangeOwnStaffPasswordRequestDto): Promise<void> {
    await staffHttpClient.post<unknown>(STAFF_API_ENDPOINTS.auth.changePassword, input)
  },

  async getCurrentUser(): Promise<AuthenticatedStaffSessionDto | null> {
    try {
      const me = await staffHttpClient.get<UnifiedAuthMeResponseDto>(STAFF_API_ENDPOINTS.auth.me)
      if (me.accountType !== 'STAFF' || me.portal !== 'STAFF') {
        sessionTokenManager.clear()
        return null
      }
      return me
    } catch {
      sessionTokenManager.clear()
      return null
    }
  },

  async logout(): Promise<void> {
    try {
      await staffHttpClient.post<unknown>(STAFF_API_ENDPOINTS.auth.logout)
    } finally {
      sessionTokenManager.clear()
    }
  },
}
