import type { ReactNode } from 'react'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/services/permissions/permissions.config'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import type { PermissionCode } from '@/types/rbac.types'

interface PermissionGuardProps {
  permission?: PermissionCode
  requiredPermissions?: readonly PermissionCode[]
  anyPermissions?: readonly PermissionCode[]
  children: ReactNode
}

export function PermissionGuard({
  permission,
  requiredPermissions,
  anyPermissions,
  children,
}: PermissionGuardProps) {
  const { session } = useStaffAuth()

  if (anyPermissions && anyPermissions.length > 0) {
    if (!hasAnyPermission(session, anyPermissions)) {
      return (
        <ForbiddenPage
          missingPermission={anyPermissions[0]}
          missingPermissions={anyPermissions}
        />
      )
    }
    return <>{children}</>
  }

  const requiredList =
    requiredPermissions && requiredPermissions.length > 0
      ? requiredPermissions
      : permission
        ? [permission]
        : []

  if (!hasAllPermissions(session, requiredList)) {
    const missing = requiredList.filter((code) => !hasPermission(session, code))
    return (
      <ForbiddenPage
        missingPermission={missing[0] ?? requiredList[0]}
        missingPermissions={missing.length > 0 ? missing : requiredList}
      />
    )
  }

  return <>{children}</>
}
