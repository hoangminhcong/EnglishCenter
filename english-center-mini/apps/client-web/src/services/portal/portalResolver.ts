import type { AccountType, PortalType } from '@english-center/contracts'
import { CLIENT_APP_URL, STAFF_APP_URL } from '@/services/api/apiConfig'

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
      // Ignore malformed env URL
    }
  }
  return origins
}

export function sanitizeClientInternalPath(
  candidate: string | undefined | null,
  fallback = '/student/dashboard',
): string {
  if (!candidate) return fallback
  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback
  }
  if (trimmed === '/login' || trimmed === '/register') {
    return fallback
  }
  return trimmed
}

export function resolveSafeClientPortalRedirectUrl(
  targetPortal: PortalType,
  subPath = '/login',
): string | null {
  const baseUrl = targetPortal === 'STAFF' ? STAFF_APP_URL : CLIENT_APP_URL
  if (!baseUrl) return null

  const allowedOrigins = extractAllowedOrigins()
  const cleanSubPath = sanitizeClientInternalPath(subPath, '/login')

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

export function resolveClientAppPortalAccess(input: {
  accountType: AccountType
  portal: PortalType
}): {
  allowedOnCurrentApp: boolean
  targetPortal: PortalType
  safeRedirectUrl: string | null
} {
  if (input.accountType === 'STUDENT' && input.portal === 'CLIENT') {
    return {
      allowedOnCurrentApp: true,
      targetPortal: 'CLIENT',
      safeRedirectUrl: null,
    }
  }

  return {
    allowedOnCurrentApp: false,
    targetPortal: 'STAFF',
    safeRedirectUrl: resolveSafeClientPortalRedirectUrl('STAFF', '/login'),
  }
}
