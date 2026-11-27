import type { ReactNode } from 'react'
import type { PermissionCode } from '@english-center/contracts'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'

interface ActionGuardProps {
  permission?: PermissionCode
  permissions?: readonly PermissionCode[]
  mode?: 'all' | 'any'
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Kiểm soát hiển thị nút bấm / hành động trên giao diện thuần theo Permission.
 * Tuyệt đối không kiểm tra cứng theo tên Role.
 */
export function ActionGuard({
  permission,
  permissions,
  mode = 'all',
  fallback = null,
  children,
}: ActionGuardProps) {
  const { can, canAll, canAny } = useStaffAuth()

  const list = permissions ?? (permission ? [permission] : [])
  if (list.length === 0) {
    return <>{children}</>
  }

  const allowed =
    list.length === 1
      ? can(list[0]!)
      : mode === 'any'
        ? canAny(list)
        : canAll(list)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
