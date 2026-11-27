import {
  ApiClientError,
  createApiClient,
  type ApiEnvelope,
  type QueryParams,
} from '@english-center/api-client'
import { STAFF_API_BASE_URL, STAFF_API_CONFIG_ERROR } from '@/services/api/apiConfig'
import { sessionTokenManager } from '@/features/auth/services/sessionTokenManager'

export { ApiClientError as StaffApiClientError, type ApiEnvelope, type QueryParams }

type UnauthorizedHandler = (error: ApiClientError) => void
let staffUnauthorizedHandler: UnauthorizedHandler | null = null

export function registerStaffUnauthorizedHandler(handler: UnauthorizedHandler): void {
  staffUnauthorizedHandler = handler
}

export const staffHttpClient = createApiClient({
  baseUrl: STAFF_API_BASE_URL,
  configError: STAFF_API_CONFIG_ERROR,
  timeoutMs: 15_000,
  credentials: 'include',
  auth: {
    getAccessToken: () => sessionTokenManager.getAccessToken(),
    onUnauthorized: (err) => {
      // Chỉ thu hồi phiên trên lỗi 401 (phiên hết hạn / không hợp lệ), tuyệt đối không tự xóa phiên trên lỗi 403
      sessionTokenManager.clear()
      staffUnauthorizedHandler?.(err)
    },
  },
})
