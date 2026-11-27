import { createContext } from 'react'
import type { StaffAuthContextValue } from '@/features/auth/types/staffAuth.types'

export const StaffAuthContext = createContext<StaffAuthContextValue | null>(null)
