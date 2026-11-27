import type { ApiErrorCode, ApiValidationIssue } from '@english-center/contracts'

const STATUS_DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ (400). Vui lòng kiểm tra lại dữ liệu gửi lên.',
  401: 'Phiên đăng nhập đã hết hạn hoặc chưa xác thực (401). Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này (403).',
  404: 'Không tìm thấy dữ liệu yêu cầu (404).',
  409: 'Dữ liệu bị xung đột hoặc đã tồn tại (409).',
  422: 'Dữ liệu đầu vào chưa đúng định dạng quy định (422).',
  429: 'Bạn thao tác quá nhanh (429). Vui lòng đợi ít phút rồi thử lại.',
  500: 'Máy chủ đang gặp sự cố xử lý (500). Vui lòng thử lại sau.',
}

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 422:
      return 'VALIDATION_ERROR'
    case 429:
      return 'TOO_MANY_REQUESTS'
    default:
      return status === 0 ? 'NETWORK_ERROR' : 'INTERNAL_SERVER_ERROR'
  }
}

export function getDefaultHttpErrorMessage(status: number): string {
  return STATUS_DEFAULT_MESSAGES[status] ?? `Yêu cầu thất bại (Mã lỗi ${status})`
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: unknown
  readonly validationIssues?: readonly ApiValidationIssue[]

  constructor(
    message: string,
    status = 500,
    details?: unknown,
    code?: ApiErrorCode,
    validationIssues?: readonly ApiValidationIssue[],
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code ?? mapStatusToErrorCode(status)
    this.details = details
    this.validationIssues = validationIssues
  }
}
