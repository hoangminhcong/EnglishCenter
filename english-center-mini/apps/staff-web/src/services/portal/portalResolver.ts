import type { AccountType, PortalType } from '@english-center/contracts'
import { CLIENT_APP_URL, STAFF_APP_URL } from '@/services/api/apiConfig'

interface PortalResolutionResult {
  allowedOnCurrentApp: boolean
  currentPortal: 'STAFF'
  targetPortal: PortalType
  safeRedirectUrl: string | null
}

function extractAllowedOrigins(): Set<string> {
  const origins = new Set<string>()
  for (const candidate of [CLIENT_APP_URL, STAFF_APP_URL]) {
    if (!candidate) continue
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        origins.add(parsed.origin)
      }
    } catch {
      // Bỏ qua URL cấu hình không hợp lệ
    }
  }
  return origins
}

function resolveSafePortalRedirectUrl(
  targetPortal: PortalType,
  subPath = '/login',
): string | null {
  const baseUrl = targetPortal === 'CLIENT' ? CLIENT_APP_URL : STAFF_APP_URL
  if (!baseUrl) return null

  const allowedOrigins = extractAllowedOrigins()
  const cleanSubPath = sanitizeInternalRoutePath(subPath, '/login')

  try {
    const built = new URL(cleanSubPath, `${baseUrl}/`)
    if (!allowedOrigins.has(built.origin)) {
      return null
    }
    return built.toString()
  } catch {
    return null
  }
}

/**
 * Chỉ chấp nhận đường dẫn nội bộ tương đối bắt đầu bằng đúng một dấu `/`.
 */
export function sanitizeInternalRoutePath(
  candidate: unknown,
  fallback: string,
): string {
  if (typeof candidate !== 'string' || !candidate) return fallback
  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback
  }
  return trimmed
}

export function resolveClientPortalUrl(subPath = '/login'): string | null {
  return resolveSafePortalRedirectUrl('CLIENT', subPath)
}

/**
 * Kiểm tra tài khoản sau xác thực có thuộc Staff Web hay phải điều hướng sang Client Web.
 */
export function resolveStaffAppPortalAccess(input: {
  accountType: AccountType
  portal: PortalType
}): PortalResolutionResult {
  if (input.accountType === 'STAFF' && input.portal === 'STAFF') {
    return {
      allowedOnCurrentApp: true,
      currentPortal: 'STAFF',
      targetPortal: 'STAFF',
      safeRedirectUrl: null,
    }
  }

  return {
    allowedOnCurrentApp: false,
    currentPortal: 'STAFF',
    targetPortal: 'CLIENT',
    safeRedirectUrl: resolveSafePortalRedirectUrl('CLIENT', '/login'),
  }
}
