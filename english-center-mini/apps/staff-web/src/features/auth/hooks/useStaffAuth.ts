import { useContext } from 'react'
import { StaffAuthContext } from '@/features/auth/context/staffAuthContextInstance'
import type { StaffAuthContextValue } from '@/features/auth/types/staffAuth.types'

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext)
  if (!ctx) {
    throw new Error('useStaffAuth phải được gọi bên trong StaffAuthProvider.')
  }
  return ctx
}
