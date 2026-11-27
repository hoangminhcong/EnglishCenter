import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  AuthenticatedStaffSessionDto,
  ChangeOwnStaffPasswordRequestDto,
  CompleteFirstLoginPasswordRequestDto,
  PermissionCode,
  StaffLoginOutcomeDto,
  StaffLoginRequestDto,
  StaffOwnProfileBundleDto,
  UpdateOwnStaffProfileRequestDto,
} from '@english-center/contracts'
import { registerStaffUnauthorizedHandler } from '@/services/api/httpClient'
import { staffQueryClient } from '@/services/api/queryClient'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/services/permissions/permissions.config'
import { projectSessionToStaffUser } from '@/types/rbac.types'
import { StaffAuthContext } from '@/features/auth/context/staffAuthContextInstance'
import {
  STAFF_AUTH_SYNC_EVENT,
  authService,
} from '@/features/auth/services/authService'
import { clearMockStoredSession } from '@/features/auth/adapters/mockAuthAdapter'

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthenticatedStaffSessionDto | null>(null)
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  const refreshPermissionsSession = useCallback(async () => {
    const resolved = await authService.getCurrentSession()
    setSession(resolved)
    if (!resolved) {
      staffQueryClient.clear()
    }
    return resolved
  }, [])

  useEffect(() => {
    registerStaffUnauthorizedHandler(() => {
      clearMockStoredSession()
      staffQueryClient.clear()
      setSession(null)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login?reason=session_expired')
      }
    })
  }, [])

  useEffect(() => {
    let active = true
    authService
      .getCurrentSession()
      .then((resolved) => {
        if (active) setSession(resolved)
      })
      .finally(() => {
        if (active) setIsInitializing(false)
      })

    const handleSync = () => {
      void authService.getCurrentSession().then((resolved) => {
        if (active) {
          setSession(resolved)
          if (!resolved) {
            staffQueryClient.clear()
          }
        }
      })
    }

    window.addEventListener(STAFF_AUTH_SYNC_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      active = false
      window.removeEventListener(STAFF_AUTH_SYNC_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const login = useCallback(
    async (input: StaffLoginRequestDto): Promise<StaffLoginOutcomeDto> => {
      staffQueryClient.clear()
      const outcome = await authService.login(input)
      if (outcome.outcome === 'AUTHENTICATED') {
        setSession(outcome.session)
      } else {
        setSession(null)
      }
      return outcome
    },
    [],
  )

  const completeFirstLoginPassword = useCallback(
    async (
      input: CompleteFirstLoginPasswordRequestDto,
    ): Promise<AuthenticatedStaffSessionDto> => {
      staffQueryClient.clear()
      const activatedSession = await authService.completeFirstLoginPassword(input)
      setSession(activatedSession)
      return activatedSession
    },
    [],
  )

  const updateOwnProfile = useCallback(
    async (input: UpdateOwnStaffProfileRequestDto): Promise<StaffOwnProfileBundleDto> => {
      const updated = await authService.updateOwnProfile(input)
      setSession(updated.session)
      void staffQueryClient.invalidateQueries({ queryKey: ['staff', 'accounts'] })
      return updated
    },
    [],
  )

  const changeOwnPassword = useCallback(
    async (input: ChangeOwnStaffPasswordRequestDto): Promise<void> => {
      await authService.changeOwnPassword(input)
      void staffQueryClient.invalidateQueries({ queryKey: ['staff', 'accounts'] })
    },
    [],
  )

  const logout = useCallback(async () => {
    await authService.logout()
    staffQueryClient.clear()
    setSession(null)
  }, [])

  const user = useMemo(
    () => (session ? projectSessionToStaffUser(session) : null),
    [session],
  )

  const can = useCallback((perm: PermissionCode) => hasPermission(session, perm), [session])
  const canAny = useCallback(
    (perms: readonly PermissionCode[]) => hasAnyPermission(session, perms),
    [session],
  )
  const canAll = useCallback(
    (perms: readonly PermissionCode[]) => hasAllPermissions(session, perms),
    [session],
  )

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session),
      isInitializing,
      login,
      completeFirstLoginPassword,
      updateOwnProfile,
      changeOwnPassword,
      refreshPermissionsSession,
      logout,
      can,
      canAny,
      canAll,
    }),
    [
      session,
      user,
      isInitializing,
      login,
      completeFirstLoginPassword,
      updateOwnProfile,
      changeOwnPassword,
      refreshPermissionsSession,
      logout,
      can,
      canAny,
      canAll,
    ],
  )

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}
