import type {
  AuthenticatedStaffSessionDto,
  ChangeOwnStaffPasswordRequestDto,
  CompleteFirstLoginPasswordRequestDto,
  StaffLoginOutcomeDto,
  StaffLoginRequestDto,
  StaffOwnProfileBundleDto,
  UpdateOwnStaffProfileRequestDto,
} from '@english-center/contracts'
import { isValidVnPhone } from '@english-center/utils'
import { evaluatePasswordPolicy, hashMockCredential } from '@/config/passwordPolicy'
import { StaffApiClientError } from '@/services/api/httpClient'
import { ensureMockCleanupMigration, mockDelay } from '@/services/mock/mockStorage'
import type { AuthRepository } from '@/features/auth/repositories/authRepository'
import {
  MOCK_STUDENT_IDENTITIES,
  buildAuthenticatedSessionForUser,
  ensureSeedMockDigestsInitialized,
  readStaffIdentityStore,
  readStudentSupervisionAccounts,
  writeMockCredentialDigest,
  writeStaffIdentityStore,
} from '@/features/auth/mocks/staffIdentityMockStore'

import { normalizeVnPhone } from '@/shared/utils/staffFormatters'

const MOCK_ACTIVE_SESSION_KEY = 'ec_staff_active_session_user_v4'
const pendingChallenges = new Map<string, { userId: string; expiresAtMs: number }>()

function readStoredUserId(): string | null {
  if (typeof window === 'undefined') return null
  ensureMockCleanupMigration()
  try {
    return (
      window.sessionStorage.getItem(MOCK_ACTIVE_SESSION_KEY) ??
      window.localStorage.getItem(MOCK_ACTIVE_SESSION_KEY)
    )
  } catch {
    return null
  }
}

export function clearMockStoredSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(MOCK_ACTIVE_SESSION_KEY)
    window.localStorage.removeItem(MOCK_ACTIVE_SESSION_KEY)
  } catch {
    // Ignore storage errors
  }
}

function persistMockSessionUserId(userId: string, rememberMe = false): void {
  if (typeof window === 'undefined') return
  try {
    clearMockStoredSession()
    window.sessionStorage.setItem(MOCK_ACTIVE_SESSION_KEY, userId)
    if (rememberMe) {
      window.localStorage.setItem(MOCK_ACTIVE_SESSION_KEY, userId)
    }
  } catch {
    // Ignore storage quota errors
  }
}

export const mockAuthAdapter: AuthRepository = {
  async login(input: StaffLoginRequestDto): Promise<StaffLoginOutcomeDto> {
    const cleanIdentifier = input.identifier.trim().toLowerCase()
    if (!cleanIdentifier || !input.password) {
      throw new StaffApiClientError(
        'Vui lòng nhập đầy đủ Tên đăng nhập / Email và Mật khẩu.',
        400,
      )
    }

    await mockDelay(200)
    const digests = await ensureSeedMockDigestsInitialized()

    // 1. Kiểm tra ranh giới Portal Học viên (STUDENT -> CLIENT)
    const supervisionStudents = readStudentSupervisionAccounts()
    const matchedSupervisionStudent = supervisionStudents.find(
      (s) =>
        s.username.toLowerCase() === cleanIdentifier ||
        s.email.toLowerCase() === cleanIdentifier,
    )
    const matchedIdentityStudent = MOCK_STUDENT_IDENTITIES.find(
      (s) =>
        s.username.toLowerCase() === cleanIdentifier ||
        s.email.toLowerCase() === cleanIdentifier,
    )
    const matchedStudentId = matchedSupervisionStudent?.id ?? matchedIdentityStudent?.id
    if (matchedStudentId) {
      const expectedStuDigest = digests[matchedStudentId]
      const candidateStuDigest = await hashMockCredential(matchedStudentId, input.password)
      if (!expectedStuDigest || candidateStuDigest !== expectedStuDigest) {
        throw new StaffApiClientError('Tên đăng nhập hoặc mật khẩu không chính xác.', 401)
      }
      const effectiveStudentStatus = matchedSupervisionStudent
        ? matchedSupervisionStudent.status === 'active'
          ? 'ACTIVE'
          : 'LOCKED'
        : matchedIdentityStudent!.status
      if (effectiveStudentStatus === 'LOCKED' || effectiveStudentStatus === 'DISABLED') {
        throw new StaffApiClientError(
          'Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên.',
          403,
        )
      }
      clearMockStoredSession()
      return {
        outcome: 'PORTAL_REDIRECT_REQUIRED',
        accountType: 'STUDENT',
        targetPortal: 'CLIENT',
        username: matchedSupervisionStudent?.username ?? matchedIdentityStudent!.username,
        displayName:
          matchedSupervisionStudent?.studentProfile.fullName ??
          matchedIdentityStudent!.displayName,
        message:
          'Tài khoản này thuộc Cổng Học viên, không có quyền truy cập Cổng Nhân sự.',
      }
    }

    // 2. Xác thực tài khoản Nhân sự (STAFF)
    const store = readStaffIdentityStore()
    const accountIdx = store.userAccounts.findIndex(
      (a) =>
        a.username.toLowerCase() === cleanIdentifier ||
        a.email.toLowerCase() === cleanIdentifier,
    )

    if (accountIdx === -1) {
      throw new StaffApiClientError(
        'Tài khoản không tồn tại hoặc hệ thống xác thực chưa kết nối máy chủ.',
        401,
      )
    }

    const account = store.userAccounts[accountIdx]!
    const storedDigest = digests[account.id]

    if (account.status === 'PENDING_ACTIVATION' && !storedDigest) {
      throw new StaffApiClientError(
        'Tài khoản đang ở trạng thái Chờ kích hoạt (PENDING_ACTIVATION). Vui lòng hoàn tất kích hoạt hoặc liên hệ Quản trị viên.',
        403,
      )
    }

    const candidateDigest = await hashMockCredential(account.id, input.password)
    if (!storedDigest || candidateDigest !== storedDigest) {
      throw new StaffApiClientError('Tên đăng nhập hoặc mật khẩu không chính xác.', 401)
    }

    if (account.status === 'PENDING_ACTIVATION') {
      throw new StaffApiClientError(
        'Tài khoản đang ở trạng thái Chờ kích hoạt. Vui lòng liên hệ Quản trị viên để kích hoạt.',
        403,
      )
    }

    if (account.status === 'LOCKED' || account.status === 'DISABLED') {
      throw new StaffApiClientError(
        'Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên.',
        403,
      )
    }

    const normalizedAccountType = account.accountType ?? 'STAFF'
    if (normalizedAccountType !== 'STAFF') {
      clearMockStoredSession()
      return {
        outcome: 'PORTAL_REDIRECT_REQUIRED',
        accountType: normalizedAccountType,
        targetPortal: 'CLIENT',
        username: account.username,
        displayName: account.username,
        message: 'Tài khoản không được cấp quyền truy cập ứng dụng Staff Web.',
      }
    }

    const profile = store.employeeProfiles.find((p) => p.userId === account.id)
    const displayName = profile?.fullName ?? account.username

    if (account.status === 'PASSWORD_RESET_REQUIRED' || account.mustChangePassword) {
      const challengeId = `chg-${Date.now()}-${account.id}`
      pendingChallenges.set(challengeId, {
        userId: account.id,
        expiresAtMs: Date.now() + 10 * 60 * 1000,
      })
      return {
        outcome: 'PASSWORD_RESET_REQUIRED',
        challengeId,
        userId: account.id,
        username: account.username,
        displayName,
        email: account.email,
        message:
          'Tài khoản đang sử dụng mật khẩu tạm thời hoặc có yêu cầu đặt lại mật khẩu. Vui lòng thiết lập mật khẩu cá nhân mới để bắt đầu làm việc.',
      }
    }

    const nowIso = new Date().toISOString()
    const nextAccounts = [...store.userAccounts]
    nextAccounts[accountIdx] = {
      ...account,
      accountType: 'STAFF',
      lastLoginAt: nowIso,
      updatedAt: nowIso,
    }
    const updatedStore = { ...store, userAccounts: nextAccounts }
    writeStaffIdentityStore(updatedStore)

    const session = buildAuthenticatedSessionForUser(account.id, updatedStore)
    if (!session || session.permissions.length === 0) {
      clearMockStoredSession()
      throw new StaffApiClientError('Tài khoản chưa được cấp quyền truy cập hệ thống.', 403)
    }

    persistMockSessionUserId(account.id, input.rememberMe)
    return {
      outcome: 'AUTHENTICATED',
      session,
    }
  },

  async completeFirstLoginPassword(
    input: CompleteFirstLoginPasswordRequestDto,
  ): Promise<AuthenticatedStaffSessionDto> {
    await mockDelay(180)
    const challenge = pendingChallenges.get(input.challengeId)
    if (!challenge || challenge.expiresAtMs < Date.now()) {
      pendingChallenges.delete(input.challengeId)
      throw new StaffApiClientError(
        'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng đăng nhập lại.',
        401,
      )
    }

    if (input.newPassword !== input.confirmPassword) {
      throw new StaffApiClientError('Mật khẩu xác nhận không trùng khớp.', 400)
    }
    if (input.newPassword === input.currentPassword) {
      throw new StaffApiClientError('Mật khẩu mới phải khác mật khẩu tạm thời hiện tại.', 400)
    }

    const policyCheck = evaluatePasswordPolicy(input.newPassword)
    if (!policyCheck.isValid) {
      throw new StaffApiClientError(policyCheck.issues[0]!, 422)
    }

    const digests = await ensureSeedMockDigestsInitialized()
    const currentHash = await hashMockCredential(challenge.userId, input.currentPassword)
    if (digests[challenge.userId] !== currentHash) {
      throw new StaffApiClientError('Mật khẩu hiện tại không chính xác.', 401)
    }

    const nextHash = await hashMockCredential(challenge.userId, input.newPassword)
    writeMockCredentialDigest(challenge.userId, nextHash)

    const store = readStaffIdentityStore()
    const accIdx = store.userAccounts.findIndex((a) => a.id === challenge.userId)
    if (accIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy tài khoản.', 404)
    }

    const prevAcc = store.userAccounts[accIdx]!
    const profile = store.employeeProfiles.find((p) => p.userId === prevAcc.id)
    const nowIso = new Date().toISOString()

    const nextAccounts = [...store.userAccounts]
    nextAccounts[accIdx] = {
      ...prevAcc,
      accountType: 'STAFF',
      status: 'ACTIVE',
      mustChangePassword: false,
      lastLoginAt: nowIso,
      updatedAt: nowIso,
    }

    const updatedStore = {
      ...store,
      userAccounts: nextAccounts,
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          targetUserId: prevAcc.id,
          targetUsername: prevAcc.username,
          targetFullName: profile?.fullName ?? prevAcc.username,
          actionType: 'FIRST_LOGIN_PASSWORD_CHANGED' as const,
          actorUserId: prevAcc.id,
          actorName: profile?.fullName ?? prevAcc.username,
          occurredAt: nowIso,
          previousSummary: `Trạng thái: ${prevAcc.status}`,
          nextSummary: 'Trạng thái: ACTIVE (Đã hoàn tất đổi mật khẩu lần đầu)',
        },
        ...store.auditLogs,
      ],
    }
    writeStaffIdentityStore(updatedStore)
    pendingChallenges.delete(input.challengeId)

    const session = buildAuthenticatedSessionForUser(prevAcc.id, updatedStore)
    if (!session || session.permissions.length === 0) {
      throw new StaffApiClientError('Tài khoản chưa được cấp quyền truy cập hệ thống.', 403)
    }

    persistMockSessionUserId(prevAcc.id, false)
    return session
  },

  async getMyProfileBundle(): Promise<StaffOwnProfileBundleDto> {
    await mockDelay(120)
    const userId = readStoredUserId()
    if (!userId) {
      throw new StaffApiClientError('Phiên đăng nhập đã hết hạn.', 401)
    }

    const store = readStaffIdentityStore()
    const account = store.userAccounts.find((a) => a.id === userId)
    const employee = store.employeeProfiles.find((p) => p.userId === userId)
    const session = buildAuthenticatedSessionForUser(userId, store)

    if (!account || !employee || !session || account.status !== 'ACTIVE') {
      clearMockStoredSession()
      throw new StaffApiClientError('Không tìm thấy thông tin tài khoản nhân sự.', 401)
    }

    return {
      account: { ...account, accountType: 'STAFF' },
      employee,
      session,
    }
  },

  async updateOwnProfile(
    input: UpdateOwnStaffProfileRequestDto,
  ): Promise<StaffOwnProfileBundleDto> {
    await mockDelay(180)
    const userId = readStoredUserId()
    if (!userId) {
      throw new StaffApiClientError('Phiên đăng nhập đã hết hạn.', 401)
    }

    const cleanPhone = normalizeVnPhone(input.phone)
    if (!isValidVnPhone(cleanPhone)) {
      throw new StaffApiClientError(
        'Số điện thoại không hợp lệ (gồm 10 chữ số chuẩn nhà mạng Việt Nam, ví dụ 0901234567).',
        422,
      )
    }

    const store = readStaffIdentityStore()
    const accIdx = store.userAccounts.findIndex((a) => a.id === userId)
    const empIdx = store.employeeProfiles.findIndex((p) => p.userId === userId)
    if (accIdx === -1 || empIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ nhân sự hiện tại.', 404)
    }

    const duplicatePhone = store.employeeProfiles.some(
      (p) => p.userId !== userId && normalizeVnPhone(p.phone) === cleanPhone,
    )
    if (duplicatePhone) {
      throw new StaffApiClientError(
        'Số điện thoại này đã được đăng ký cho một nhân sự khác trong hệ thống.',
        409,
      )
    }

    const prevAccount = store.userAccounts[accIdx]!
    const prevEmployee = store.employeeProfiles[empIdx]!
    const nowIso = new Date().toISOString()

    const nextEmployee = {
      ...prevEmployee,
      phone: cleanPhone,
    }
    const nextAccount = {
      ...prevAccount,
      accountType: 'STAFF' as const,
      updatedAt: nowIso,
    }

    const nextEmployees = [...store.employeeProfiles]
    nextEmployees[empIdx] = nextEmployee
    const nextAccounts = [...store.userAccounts]
    nextAccounts[accIdx] = nextAccount

    const updatedStore = {
      ...store,
      userAccounts: nextAccounts,
      employeeProfiles: nextEmployees,
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          targetUserId: prevAccount.id,
          targetUsername: prevAccount.username,
          targetFullName: prevEmployee.fullName,
          actionType: 'OWN_PROFILE_UPDATED' as const,
          actorUserId: prevAccount.id,
          actorName: prevEmployee.fullName,
          occurredAt: nowIso,
          previousSummary: `SĐT: ${prevEmployee.phone}`,
          nextSummary: `SĐT: ${cleanPhone}`,
          reason: 'Nhân sự tự cập nhật thông tin liên hệ cá nhân.',
        },
        ...store.auditLogs,
      ],
    }
    writeStaffIdentityStore(updatedStore)

    const session = buildAuthenticatedSessionForUser(userId, updatedStore)
    if (!session) {
      throw new StaffApiClientError('Không thể làm mới phiên đăng nhập.', 500)
    }

    return {
      account: nextAccount,
      employee: nextEmployee,
      session,
    }
  },

  async changeOwnPassword(input: ChangeOwnStaffPasswordRequestDto): Promise<void> {
    await mockDelay(200)
    const userId = readStoredUserId()
    if (!userId) {
      throw new StaffApiClientError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)
    }

    if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
      throw new StaffApiClientError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.', 400)
    }

    if (input.newPassword !== input.confirmPassword) {
      throw new StaffApiClientError('Mật khẩu xác nhận không trùng khớp với mật khẩu mới.', 400)
    }

    if (input.newPassword === input.currentPassword) {
      throw new StaffApiClientError('Mật khẩu mới phải khác mật khẩu đang sử dụng hiện tại.', 400)
    }

    const policyCheck = evaluatePasswordPolicy(input.newPassword)
    if (!policyCheck.isValid) {
      throw new StaffApiClientError(policyCheck.issues[0]!, 422)
    }

    const digests = await ensureSeedMockDigestsInitialized()
    const currentHash = await hashMockCredential(userId, input.currentPassword)
    if (!digests[userId] || digests[userId] !== currentHash) {
      throw new StaffApiClientError('Mật khẩu hiện tại không chính xác.', 401)
    }

    const nextHash = await hashMockCredential(userId, input.newPassword)
    writeMockCredentialDigest(userId, nextHash)

    const store = readStaffIdentityStore()
    const accIdx = store.userAccounts.findIndex((a) => a.id === userId)
    if (accIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy tài khoản hiện tại.', 404)
    }

    const prevAcc = store.userAccounts[accIdx]!
    const profile = store.employeeProfiles.find((p) => p.userId === userId)
    const nowIso = new Date().toISOString()

    const nextAccounts = [...store.userAccounts]
    nextAccounts[accIdx] = {
      ...prevAcc,
      accountType: 'STAFF',
      mustChangePassword: false,
      updatedAt: nowIso,
    }

    writeStaffIdentityStore({
      ...store,
      userAccounts: nextAccounts,
      auditLogs: [
        {
          id: `aud-${Date.now()}`,
          targetUserId: prevAcc.id,
          targetUsername: prevAcc.username,
          targetFullName: profile?.fullName ?? prevAcc.username,
          actionType: 'OWN_PASSWORD_CHANGED' as const,
          actorUserId: prevAcc.id,
          actorName: profile?.fullName ?? prevAcc.username,
          occurredAt: nowIso,
          previousSummary: 'Mật khẩu đang hoạt động',
          nextSummary: 'Đã cập nhật băm mật khẩu cá nhân mới',
          reason: 'Nhân sự chủ động đổi mật khẩu bảo mật cá nhân.',
        },
        ...store.auditLogs,
      ],
    })
  },

  async getCurrentUser(): Promise<AuthenticatedStaffSessionDto | null> {
    const userId = readStoredUserId()
    if (!userId) return null

    const store = readStaffIdentityStore()
    const account = store.userAccounts.find((a) => a.id === userId)
    const resolvedAccountType = account?.accountType ?? 'STAFF'

    if (
      !account ||
      resolvedAccountType !== 'STAFF' ||
      account.status !== 'ACTIVE' ||
      account.mustChangePassword
    ) {
      clearMockStoredSession()
      return null
    }

    return buildAuthenticatedSessionForUser(userId, store)
  },

  async logout(): Promise<void> {
    await mockDelay(80)
    clearMockStoredSession()
  },
}
