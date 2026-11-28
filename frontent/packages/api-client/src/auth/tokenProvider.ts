import type { ApiClientError } from '../errors/apiError'

export interface AuthTokenProvider {
  /** Trả về Bearer Access Token (nếu ứng dụng dùng Header Authorization song song hoặc thay cho Cookie) */
  getAccessToken?: () => string | null | Promise<string | null>
  /** Callback thông báo cho ứng dụng chủ khi Backend trả về 401 Unauthorized */
  onUnauthorized?: (error: ApiClientError) => void
}
