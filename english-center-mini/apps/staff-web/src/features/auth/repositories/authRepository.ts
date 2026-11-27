import type {
  AuthenticatedStaffSessionDto,
  ChangeOwnStaffPasswordRequestDto,
  CompleteFirstLoginPasswordRequestDto,
  StaffLoginOutcomeDto,
  StaffLoginRequestDto,
  StaffOwnProfileBundleDto,
  UpdateOwnStaffProfileRequestDto,
} from '@english-center/contracts'

export interface AuthRepository {
  login(input: StaffLoginRequestDto): Promise<StaffLoginOutcomeDto>
  completeFirstLoginPassword(
    input: CompleteFirstLoginPasswordRequestDto,
  ): Promise<AuthenticatedStaffSessionDto>
  getMyProfileBundle(): Promise<StaffOwnProfileBundleDto>
  updateOwnProfile(input: UpdateOwnStaffProfileRequestDto): Promise<StaffOwnProfileBundleDto>
  changeOwnPassword(input: ChangeOwnStaffPasswordRequestDto): Promise<void>
  getCurrentUser(): Promise<AuthenticatedStaffSessionDto | null>
  logout(): Promise<void>
}
