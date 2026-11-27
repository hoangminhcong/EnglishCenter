import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { sanitizeInternalRoutePath } from '@/services/portal/portalResolver'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, isInitializing } = useStaffAuth()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#F5FAFE] text-[#64748B]">
        <LoaderCircle className="h-7 w-7 animate-spin text-[#2878B8]" />
        <span className="text-sm font-medium">Đang kiểm tra phiên đăng nhập nhân sự...</span>
      </div>
    )
  }

  // Bảo vệ nghiêm ngặt: chỉ cho phép phiên xác thực hợp lệ có AccountType = STAFF và Portal = STAFF
  if (
    !isAuthenticated ||
    !session ||
    session.accountType !== 'STAFF' ||
    session.portal !== 'STAFF'
  ) {
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/'
    const isSystemOrRoot =
      cleanPath === '/' ||
      cleanPath === '/login' ||
      cleanPath === '/no-access' ||
      cleanPath === '/403' ||
      cleanPath === '/404'
    const safeFrom = isSystemOrRoot
      ? undefined
      : sanitizeInternalRoutePath(`${location.pathname}${location.search}`, '/')
    return <Navigate to="/login" state={safeFrom ? { from: safeFrom } : null} replace />
  }

  return <>{children}</>
}
