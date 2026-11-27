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
import type { StaffUser } from '@/types/rbac.types'

export interface StaffAuthContextValue {
  session: AuthenticatedStaffSessionDto | null
  user: StaffUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (input: StaffLoginRequestDto) => Promise<StaffLoginOutcomeDto>
  completeFirstLoginPassword: (
    input: CompleteFirstLoginPasswordRequestDto,
  ) => Promise<AuthenticatedStaffSessionDto>
  updateOwnProfile: (
    input: UpdateOwnStaffProfileRequestDto,
  ) => Promise<StaffOwnProfileBundleDto>
  changeOwnPassword: (input: ChangeOwnStaffPasswordRequestDto) => Promise<void>
  refreshPermissionsSession: () => Promise<AuthenticatedStaffSessionDto | null>
  logout: () => Promise<void>
  can: (permission: PermissionCode) => boolean
  canAny: (permissions: readonly PermissionCode[]) => boolean
  canAll: (permissions: readonly PermissionCode[]) => boolean
}
