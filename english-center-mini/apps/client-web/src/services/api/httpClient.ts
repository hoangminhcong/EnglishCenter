import {
  ApiClientError,
  createApiClient,
  type ApiEnvelope,
  type QueryParams,
} from '@english-center/api-client'
import { API_BASE_URL, API_CONFIG_ERROR } from '@/services/api/apiConfig'

export { ApiClientError, type ApiEnvelope, type QueryParams }

type UnauthorizedHandler = (error: ApiClientError) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** Cho phép tầng Auth đăng ký dọn phiên khi Backend trả về 401 mà không tạo vòng lặp import */
export function registerClientUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

export const httpClient = createApiClient({
  baseUrl: API_BASE_URL,
  configError: API_CONFIG_ERROR,
  timeoutMs: 15_000,
  credentials: 'include',
  auth: {
    onUnauthorized: (err) => {
      unauthorizedHandler?.(err)
    },
  },
})
