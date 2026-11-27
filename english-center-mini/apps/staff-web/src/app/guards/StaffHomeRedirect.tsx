import { Navigate } from 'react-router-dom'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { resolveStaffDefaultHomePath } from '@/services/permissions/permissions.config'

export function StaffHomeRedirect() {
  const { session } = useStaffAuth()
  return <Navigate to={resolveStaffDefaultHomePath(session)} replace />
}
