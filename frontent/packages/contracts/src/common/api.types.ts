/** Chuỗi ngày lịch YYYY-MM-DD theo múi giờ nghiệp vụ Asia/Ho_Chi_Minh */
export type IsoDateString = string

/** Chuỗi thời điểm ISO-8601 đầy đủ (YYYY-MM-DDTHH:mm:ss.sssZ) */
export type IsoDateTimeString = string

/** Số tiền nguyên theo đơn vị Đồng Việt Nam (VND) */
export type VndAmount = number

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiPaginatedResponse<T> {
  success: true
  data: readonly T[]
  meta: PaginationMeta
  message?: string
}

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'TOO_MANY_REQUESTS',
  'INTERNAL_SERVER_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT_ERROR',
  'REQUEST_ABORTED',
  'CONFIG_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiValidationIssue {
  field: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: ApiErrorCode
    message: string
    details?: readonly ApiValidationIssue[]
  }
}
