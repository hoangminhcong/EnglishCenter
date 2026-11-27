import type { ApiValidationIssue } from '@english-center/contracts'
import type { AuthTokenProvider } from '../auth/tokenProvider'
import {
  ApiClientError,
  getDefaultHttpErrorMessage,
  mapStatusToErrorCode,
} from '../errors/apiError'

export interface ApiEnvelope<T> {
  success?: boolean
  data: T
  message?: string
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiClientConfig {
  /** URL gốc do ứng dụng chủ truyền vào (packages/api-client tuyệt đối không tự đọc import.meta.env) */
  baseUrl: string
  /** Thông báo lỗi cấu hình nếu ứng dụng đang ở Production nhưng thiếu baseUrl */
  configError?: string | null
  timeoutMs?: number
  credentials?: RequestCredentials
  defaultHeaders?: Record<string, string>
  auth?: AuthTokenProvider
}

export interface RequestOptions {
  params?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface ApiClientInstance {
  request: <T>(method: HttpMethod, endpoint: string, options?: RequestOptions) => Promise<T>
  get: <T>(endpoint: string, params?: QueryParams, headers?: Record<string, string>) => Promise<T>
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>
  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>
  patch: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>
  delete: <T>(endpoint: string, params?: QueryParams, headers?: Record<string, string>) => Promise<T>
}

function buildRequestUrl(baseUrl: string, endpoint: string, params?: QueryParams): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const originFallback =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${normalizedBase}${path}`, originFallback)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }
  return payload as T
}

function extractServerError(
  status: number,
  parsed: unknown,
): {
  message: string
  validationIssues?: readonly ApiValidationIssue[]
} {
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    if (record.error && typeof record.error === 'object') {
      const errObj = record.error as Record<string, unknown>
      const msg =
        typeof errObj.message === 'string' && errObj.message.trim()
          ? errObj.message
          : getDefaultHttpErrorMessage(status)
      const details = Array.isArray(errObj.details)
        ? (errObj.details as ApiValidationIssue[])
        : undefined
      return { message: msg, validationIssues: details }
    }

    if (typeof record.message === 'string' && record.message.trim()) {
      return { message: record.message }
    }
  }

  return { message: getDefaultHttpErrorMessage(status) }
}

export function createApiClient(config: ApiClientConfig): ApiClientInstance {
  const timeoutMs = config.timeoutMs ?? 15_000
  const credentials = config.credentials ?? 'include'

  async function request<T>(
    method: HttpMethod,
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T> {
    if (config.configError) {
      throw new ApiClientError(config.configError, 0, undefined, 'CONFIG_ERROR')
    }

    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...config.defaultHeaders,
      ...options?.headers,
    }

    if (options?.body !== undefined && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (config.auth?.getAccessToken) {
      const token = await config.auth.getAccessToken()
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    const controller = new AbortController()
    let didTimeout = false
    const timeoutId = globalThis.setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, timeoutMs)

    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort()
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true })
      }
    }

    let response: Response
    try {
      response = await fetch(buildRequestUrl(config.baseUrl, endpoint, options?.params), {
        method,
        headers,
        credentials,
        body:
          options?.body === undefined
            ? undefined
            : isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        signal: controller.signal,
      })
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      if (isAbort && !didTimeout) {
        throw new ApiClientError('Yêu cầu đã được hủy.', 0, err, 'REQUEST_ABORTED')
      }
      throw new ApiClientError(
        didTimeout
          ? 'Máy chủ phản hồi quá chậm. Vui lòng thử lại.'
          : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        0,
        err,
        didTimeout ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
      )
    } finally {
      globalThis.clearTimeout(timeoutId)
    }

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const parsed: unknown = isJson ? await response.json().catch(() => null) : null

    if (!response.ok) {
      const { message, validationIssues } = extractServerError(response.status, parsed)
      const apiErr = new ApiClientError(
        message,
        response.status,
        parsed,
        mapStatusToErrorCode(response.status),
        validationIssues,
      )
      if (response.status === 401) {
        config.auth?.onUnauthorized?.(apiErr)
      }
      throw apiErr
    }

    return unwrapEnvelope<T>(parsed)
  }

  return {
    request,
    get: <T>(endpoint: string, params?: QueryParams, headers?: Record<string, string>) =>
      request<T>('GET', endpoint, { params, headers }),
    post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('POST', endpoint, { body, headers }),
    put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('PUT', endpoint, { body, headers }),
    patch: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('PATCH', endpoint, { body, headers }),
    delete: <T>(endpoint: string, params?: QueryParams, headers?: Record<string, string>) =>
      request<T>('DELETE', endpoint, { params, headers }),
  }
}
