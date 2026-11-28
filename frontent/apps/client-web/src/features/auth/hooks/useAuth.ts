import { useCallback, useSyncExternalStore } from 'react'
import {
  CLIENT_SESSION_STORAGE_KEY,
  authService,
  authSessionStore,
} from '@/features/auth/services/authService'
import type { AuthUser } from '@/features/auth/types/auth.types'

let cachedRawJson: string | null = null
let cachedUser: AuthUser | null = null

function getSnapshot(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw =
    window.localStorage.getItem(CLIENT_SESSION_STORAGE_KEY) ??
    window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY)
  if (raw === cachedRawJson) {
    return cachedUser
  }
  cachedRawJson = raw
  cachedUser = authSessionStore.getCurrentUser()
  return cachedUser
}

export function useAuth() {
  const user = useSyncExternalStore(authSessionStore.subscribe, getSnapshot, () => null)

  const logout = useCallback(async () => {
    await authService.logout()
  }, [])

  const isStudent = Boolean(
    user &&
      user.accountType === 'STUDENT' &&
      user.portal === 'CLIENT' &&
      user.accountStatus === 'ACTIVE',
  )

  return {
    user,
    isAuthenticated: isStudent,
    isStudent,
    logout,
  }
}
