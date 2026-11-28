/**
 * Quản lý Token / Phiên phía Frontend theo chiến lược Backend-Ready:
 * - Mặc định ưu tiên HttpOnly Cookie (credentials: 'include' trên staffHttpClient).
 * - Hỗ trợ lưu Access Token ngắn hạn trong RAM nếu Backend chọn Bearer Token.
 * - TUYỆT ĐỐI KHÔNG lưu Refresh Token dài hạn vào localStorage và KHÔNG log token ra console.
 */
let inMemoryAccessToken: string | null = null

export const sessionTokenManager = {
  getAccessToken(): string | null {
    return inMemoryAccessToken
  },

  setAccessToken(token: string | null | undefined): void {
    inMemoryAccessToken = token?.trim() || null
  },

  clear(): void {
    inMemoryAccessToken = null
  },
}
