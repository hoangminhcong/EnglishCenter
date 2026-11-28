import type {
  AuthenticatedStaffSessionDto,
  ChangeOwnStaffPasswordRequestDto,
  CompleteFirstLoginPasswordRequestDto,
  StaffLoginOutcomeDto,
  StaffLoginRequestDto,
  StaffOwnProfileBundleDto,
  UpdateOwnStaffProfileRequestDto,
} from '@english-center/contracts'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import type { AuthRepository } from '@/features/auth/repositories/authRepository'
import { httpAuthAdapter } from '@/features/auth/adapters/httpAuthAdapter'
import {
  clearMockStoredSession,
  mockAuthAdapter,
} from '@/features/auth/adapters/mockAuthAdapter'
import { sessionTokenManager } from '@/features/auth/services/sessionTokenManager'

export const STAFF_AUTH_SYNC_EVENT = 'ec-staff-auth-sync'

export function notifyStaffAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STAFF_AUTH_SYNC_EVENT))
  }
}

function resolveAuthRepository(): AuthRepository {
  return USE_STAFF_MOCK_API ? mockAuthAdapter : httpAuthAdapter
}

export const authService = {
  async login(input: StaffLoginRequestDto): Promise<StaffLoginOutcomeDto> {
    return resolveAuthRepository().login(input)
  },

  async completeFirstLoginPassword(
    input: CompleteFirstLoginPasswordRequestDto,
  ): Promise<AuthenticatedStaffSessionDto> {
    return resolveAuthRepository().completeFirstLoginPassword(input)
  },

  async getMyProfileBundle(): Promise<StaffOwnProfileBundleDto> {
    return resolveAuthRepository().getMyProfileBundle()
  },

  async updateOwnProfile(
    input: UpdateOwnStaffProfileRequestDto,
  ): Promise<StaffOwnProfileBundleDto> {
    const updated = await resolveAuthRepository().updateOwnProfile(input)
    notifyStaffAuthStateChanged()
    return updated
  },

  async changeOwnPassword(input: ChangeOwnStaffPasswordRequestDto): Promise<void> {
    await resolveAuthRepository().changeOwnPassword(input)
  },

  async getCurrentSession(): Promise<AuthenticatedStaffSessionDto | null> {
    return resolveAuthRepository().getCurrentUser()
  },

  async logout(): Promise<void> {
    try {
      await resolveAuthRepository().logout()
    } finally {
      sessionTokenManager.clear()
      clearMockStoredSession()
    }
  },
}
