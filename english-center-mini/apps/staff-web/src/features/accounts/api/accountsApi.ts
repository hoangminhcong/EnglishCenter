import type {
  AccountPermissionAuditLogDto,
  CreateStaffUserRequestDto,
  PermissionCode,
  StaffAccountStatus,
  StaffEmployeeProfileDto,
  StaffRole,
  StaffUserAccountDto,
  UpdateStaffUserRequestDto,
  UserRoleAssignmentDto,
} from '@english-center/contracts'
import { isValidEmail, isValidVnPhone } from '@english-center/utils'
import { findDepartmentById } from '@/config/departments.config'
import { evaluatePasswordPolicy, hashMockCredential } from '@/config/passwordPolicy'
import { cmsApi } from '@/features/content/api/cmsApi'
import {
  MOCK_STUDENT_IDENTITIES,
  buildAuthenticatedSessionForUser,
  ensureSeedMockDigestsInitialized,
  readStaffIdentityStore,
  readStudentSupervisionAccounts,
  writeMockCredentialDigest,
  writeStaffIdentityStore,
  writeStudentSupervisionAccounts,
} from '@/features/auth/mocks/staffIdentityMockStore'
import { notifyStaffAuthStateChanged } from '@/features/auth/services/authService'
import {
  FIXED_ROLE_PERMISSIONS,
  ROLE_DEFINITIONS,
} from '@/services/permissions/permissions.config'
import { mockDelay } from '@/services/mock/mockStorage'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { createUniqueId, normalizeVnPhone } from '@/shared/utils/staffFormatters'
import { mapScopeTypeToLegacyDataScope } from '@/types/rbac.types'
import type {
  AccountActorContext,
  CreateStaffUserResult,
  ManagedAccountRecord,
  RoleMatrixItem,
  SetStaffAccountStatusInput,
  TriggerStaffPasswordResetInput,
} from '@/features/accounts/types/accounts.types'

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/

function validateUsernameFormat(username: string): string | null {
  const normalized = username.trim().toLowerCase()
  if (!normalized) {
    return 'Vui lòng nhập tên đăng nhập (username).'
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username gồm 3–32 ký tự chữ thường không dấu, số hoặc dấu chấm (.), gạch ngang (-), gạch dưới (_).'
  }
  return null
}

function mapStaffEntitiesToManagedRecord(
  account: StaffUserAccountDto,
  profile: StaffEmployeeProfileDto,
  assignments: readonly UserRoleAssignmentDto[],
  effectivePermissions: readonly PermissionCode[],
): ManagedAccountRecord {
  const roles = assignments.map((a) => a.roleId)
  const primaryRole: StaffRole =
    roles[0] ?? (profile.profileType === 'TEACHER' ? 'TEACHER' : 'SALES')
  const primaryScopeType = assignments[0]?.scopeType ?? 'OWN'
  const primaryScopeIds = assignments[0]?.scopeIds
  const legacyScope = mapScopeTypeToLegacyDataScope(primaryScopeType, primaryRole === 'TEACHER')
  const isTeacher = profile.profileType === 'TEACHER'

  return {
    id: account.id,
    username: account.username,
    email: account.email,
    phone: profile.phone,
    category: isTeacher ? 'TEACHER' : 'STAFF',
    role: primaryRole,
    roles,
    status: account.status === 'ACTIVE' ? 'active' : 'suspended',
    accountStatus: account.status,
    scopeType: primaryScopeType,
    scopeIds: primaryScopeIds,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt ?? 'Chưa đăng nhập',
    userAccount: account,
    staffProfile: profile,
    roleAssignments: assignments,
    effectivePermissions,
    employeeProfile: isTeacher
      ? undefined
      : {
          profileId: profile.id,
          employeeCode: profile.employeeCode,
          fullName: profile.fullName,
          departmentId: profile.departmentId,
          department: profile.departmentName,
          jobTitle: profile.jobTitle,
          branchId: profile.branchId,
          branchName: profile.branchName,
          scope: legacyScope,
          joinedDate: account.createdAt.slice(0, 10),
        },
    teacherProfile: isTeacher
      ? {
          profileId: profile.id,
          teacherCode: profile.employeeCode,
          fullName: profile.fullName,
          departmentId: profile.departmentId,
          department: profile.departmentName,
          jobTitle: profile.jobTitle,
          verifiedToeicScore: profile.verifiedToeicScore,
          specializations: [...(profile.specializations ?? [])],
          assignedClassCodes: [...(profile.assignedClassCodes ?? [])],
          branchId: profile.branchId,
          branchName: profile.branchName,
        }
      : undefined,
  }
}

function buildAllManagedAccountsFromStore(): ManagedAccountRecord[] {
  const store = readStaffIdentityStore()
  const staffRecords: ManagedAccountRecord[] = []

  for (const account of store.userAccounts) {
    const profile = store.employeeProfiles.find((p) => p.userId === account.id)
    if (!profile) continue
    const assignments = store.roleAssignments.filter((r) => r.userId === account.id)
    const session = buildAuthenticatedSessionForUser(account.id, store)
    staffRecords.push(
      mapStaffEntitiesToManagedRecord(
        account,
        profile,
        assignments,
        session?.permissions ?? [],
      ),
    )
  }

  const studentSeeds = readStudentSupervisionAccounts()
  const studentRecords: ManagedAccountRecord[] = studentSeeds.map((stu) => ({
    id: stu.id,
    username: stu.username,
    email: stu.email,
    phone: stu.phone,
    category: 'STUDENT',
    role: 'STUDENT',
    roles: [],
    status: stu.status,
    accountStatus: stu.status === 'active' ? 'ACTIVE' : 'LOCKED',
    scopeType: 'OWN',
    createdAt: stu.createdAt,
    lastLoginAt: stu.lastLoginAt,
    studentProfile: stu.studentProfile,
  }))

  return [...staffRecords, ...studentRecords]
}

function assertActorHasPermission(
  actor: AccountActorContext,
  requiredPermission: PermissionCode,
  customMessage?: string,
): void {
  if (!actor.permissions.includes(requiredPermission)) {
    throw new StaffApiClientError(
      customMessage ?? `Bạn không có quyền thực hiện thao tác này (${requiredPermission}).`,
      403,
    )
  }
}

function assertFixedRoleTemplateAllowed(actor: AccountActorContext, role: StaffRole): void {
  const validRole = ROLE_DEFINITIONS.some((d) => d.role === role)
  if (!validRole) {
    throw new StaffApiClientError('Vai trò hệ thống không nằm trong danh mục cố định.', 400)
  }
  if (role === 'ADMIN' && !actor.permissions.includes('accounts.grant_admin')) {
    throw new StaffApiClientError(
      'Bạn không có quyền cấp Role Template Quản trị hệ thống (ADMIN).',
      403,
    )
  }
}

export function getDisplayNameForAccount(record: ManagedAccountRecord): string {
  return (
    record.staffProfile?.fullName ??
    record.employeeProfile?.fullName ??
    record.teacherProfile?.fullName ??
    record.studentProfile?.fullName ??
    record.email
  )
}

export function getProfileCodeForAccount(record: ManagedAccountRecord): string {
  return (
    record.staffProfile?.employeeCode ??
    record.employeeProfile?.employeeCode ??
    record.teacherProfile?.teacherCode ??
    record.studentProfile?.studentCode ??
    '—'
  )
}

export const accountsApi = {
  async listAccounts(): Promise<ManagedAccountRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedAccountRecord[]>(STAFF_API_ENDPOINTS.staffUsers.list)
    }
    await mockDelay(120)
    return buildAllManagedAccountsFromStore()
  },

  async listAuditLogs(): Promise<AccountPermissionAuditLogDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AccountPermissionAuditLogDto[]>(
        STAFF_API_ENDPOINTS.staffUsers.auditLogs,
      )
    }
    await mockDelay(80)
    const store = readStaffIdentityStore()
    return [...store.auditLogs].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  },

  async createStaffUser(
    actor: AccountActorContext,
    input: CreateStaffUserRequestDto,
  ): Promise<CreateStaffUserResult> {
    assertActorHasPermission(actor, 'accounts.create')
    assertFixedRoleTemplateAllowed(actor, input.authorization.role)

    const fullName = input.profile.fullName.trim()
    const employeeCode = input.profile.employeeCode.trim().toUpperCase()
    const normalizedPhone = normalizeVnPhone(input.profile.phone)
    const profileEmail = input.profile.email.trim().toLowerCase()
    const loginEmail = (input.account.loginEmail.trim() || profileEmail).toLowerCase()
    const username = input.account.username.trim().toLowerCase()

    if (!fullName || !employeeCode) {
      throw new StaffApiClientError('Vui lòng nhập đầy đủ họ và tên và mã nhân viên.', 400)
    }
    const usernameErr = validateUsernameFormat(username)
    if (usernameErr) {
      throw new StaffApiClientError(usernameErr, 400)
    }
    if (!isValidEmail(profileEmail) || !isValidEmail(loginEmail)) {
      throw new StaffApiClientError('Email công vụ hoặc email đăng nhập không đúng định dạng.', 400)
    }
    if (!isValidVnPhone(normalizedPhone)) {
      throw new StaffApiClientError(
        'Số điện thoại không hợp lệ (chuẩn 10 chữ số di động Việt Nam).',
        400,
      )
    }

    if (
      input.profile.profileType === 'TEACHER' &&
      input.profile.verifiedToeicScore !== undefined &&
      (input.profile.verifiedToeicScore < 0 || input.profile.verifiedToeicScore > 990)
    ) {
      throw new StaffApiClientError('Điểm TOEIC xác minh phải nằm trong khoảng 0 – 990.', 422)
    }

    const department = findDepartmentById(input.profile.departmentId)
    if (!department) {
      throw new StaffApiClientError('Phòng ban công tác không hợp lệ.', 400)
    }

    if (
      input.authorization.scopeType === 'BRANCH' &&
      (!input.authorization.scopeIds || input.authorization.scopeIds.length === 0)
    ) {
      throw new StaffApiClientError(
        'Vui lòng chọn ít nhất 01 cơ sở áp dụng khi phạm vi dữ liệu là Theo cơ sở (BRANCH).',
        400,
      )
    }

    let oneTimePasswordToReturn: string | undefined
    if (input.account.provisioningMethod === 'TEMPORARY_PASSWORD') {
      const tempPwd = input.account.temporaryPassword ?? ''
      const confirmPwd = input.account.confirmTemporaryPassword ?? ''
      if (tempPwd !== confirmPwd) {
        throw new StaffApiClientError('Mật khẩu tạm thời và xác nhận mật khẩu không khớp.', 400)
      }
      const policyCheck = evaluatePasswordPolicy(tempPwd)
      if (!policyCheck.isValid) {
        throw new StaffApiClientError(
          policyCheck.issues[0] ?? 'Mật khẩu tạm thời chưa đạt chuẩn an toàn.',
          400,
        )
      }
      oneTimePasswordToReturn = tempPwd
    }

    if (!USE_STAFF_MOCK_API) {
      const created = await staffHttpClient.post<ManagedAccountRecord>(
        STAFF_API_ENDPOINTS.staffUsers.list,
        input,
      )
      return { record: created, oneTimeTemporaryPassword: oneTimePasswordToReturn }
    }

    const branches = await cmsApi.listBranches()
    const branch = branches.find((b) => b.id === input.profile.branchId)
    if (!branch) {
      throw new StaffApiClientError('Cơ sở công tác không tồn tại trên hệ thống.', 400)
    }

    await mockDelay(220)
    await ensureSeedMockDigestsInitialized()
    const store = readStaffIdentityStore()
    const studentSupervision = readStudentSupervisionAccounts()

    if (store.employeeProfiles.some((p) => p.employeeCode.toUpperCase() === employeeCode)) {
      throw new StaffApiClientError(
        `Mã nhân viên "${employeeCode}" đã tồn tại trong hệ thống.`,
        409,
      )
    }
    if (
      store.employeeProfiles.some((p) => normalizeVnPhone(p.phone) === normalizedPhone) ||
      studentSupervision.some((s) => normalizeVnPhone(s.phone) === normalizedPhone)
    ) {
      throw new StaffApiClientError(
        `Số điện thoại "${normalizedPhone}" đã được đăng ký cho tài khoản khác.`,
        409,
      )
    }
    if (
      store.userAccounts.some((u) => u.username.toLowerCase() === username) ||
      studentSupervision.some((s) => s.username.toLowerCase() === username) ||
      MOCK_STUDENT_IDENTITIES.some((s) => s.username.toLowerCase() === username)
    ) {
      throw new StaffApiClientError(
        `Tên đăng nhập "${username}" đã được sử dụng trong hệ thống.`,
        409,
      )
    }
    if (
      store.userAccounts.some(
        (u) => u.email.toLowerCase() === loginEmail || u.email.toLowerCase() === profileEmail,
      ) ||
      store.employeeProfiles.some(
        (p) => p.email.toLowerCase() === loginEmail || p.email.toLowerCase() === profileEmail,
      ) ||
      studentSupervision.some(
        (s) => s.email.toLowerCase() === loginEmail || s.email.toLowerCase() === profileEmail,
      ) ||
      MOCK_STUDENT_IDENTITIES.some(
        (s) => s.email.toLowerCase() === loginEmail || s.email.toLowerCase() === profileEmail,
      )
    ) {
      throw new StaffApiClientError(
        'Email công vụ hoặc Email đăng nhập đã tồn tại trong hệ thống.',
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const newUserId = createUniqueId('acc-stf')
    const newProfileId =
      input.profile.profileType === 'TEACHER' ? `tea-${newUserId}` : `emp-${newUserId}`

    const resolvedStatus: StaffAccountStatus =
      input.account.provisioningMethod === 'INVITE_LINK'
        ? 'PENDING_ACTIVATION'
        : input.account.mustChangePasswordOnFirstLogin
          ? 'PASSWORD_RESET_REQUIRED'
          : input.account.initialStatus === 'LOCKED' || input.account.initialStatus === 'DISABLED'
            ? input.account.initialStatus
            : 'ACTIVE'

    const newAccount: StaffUserAccountDto = {
      id: newUserId,
      username,
      email: loginEmail,
      accountType: 'STAFF',
      status: resolvedStatus,
      provisioningMethod: input.account.provisioningMethod,
      mustChangePassword:
        input.account.provisioningMethod === 'TEMPORARY_PASSWORD'
          ? input.account.mustChangePasswordOnFirstLogin
          : true,
      invitationSentAt:
        input.account.provisioningMethod === 'INVITE_LINK' ? nowIso : undefined,
      lastLoginAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const newProfile: StaffEmployeeProfileDto = {
      id: newProfileId,
      userId: newUserId,
      employeeCode,
      fullName,
      phone: normalizedPhone,
      email: profileEmail,
      profileType: input.profile.profileType,
      branchId: branch.id,
      branchName: branch.name,
      departmentId: department.id,
      departmentName: department.name,
      jobTitle: input.profile.jobTitle?.trim() || undefined,
      status: 'ACTIVE',
      verifiedToeicScore:
        input.profile.profileType === 'TEACHER' ? input.profile.verifiedToeicScore : undefined,
      specializations:
        input.profile.profileType === 'TEACHER'
          ? input.profile.specializations && input.profile.specializations.length > 0
            ? [...input.profile.specializations]
            : []
          : undefined,
      assignedClassCodes: input.profile.profileType === 'TEACHER' ? [] : undefined,
    }

    const effectiveScopeIds =
      input.authorization.scopeType === 'BRANCH'
        ? input.authorization.scopeIds && input.authorization.scopeIds.length > 0
          ? [...input.authorization.scopeIds]
          : [branch.id]
        : undefined

    const newAssignment: UserRoleAssignmentDto = {
      userId: newUserId,
      roleId: input.authorization.role,
      scopeType: input.authorization.scopeType,
      scopeIds: effectiveScopeIds,
      assignedByUserId: actor.userId,
      assignedAt: nowIso,
    }

    if (
      input.account.provisioningMethod === 'TEMPORARY_PASSWORD' &&
      oneTimePasswordToReturn
    ) {
      const digest = await hashMockCredential(newUserId, oneTimePasswordToReturn)
      writeMockCredentialDigest(newUserId, digest)
    }

    const auditEntry: AccountPermissionAuditLogDto = {
      id: `aud-${Date.now()}`,
      targetUserId: newUserId,
      targetUsername: username,
      targetFullName: fullName,
      actionType: 'ACCOUNT_CREATED',
      actorUserId: actor.userId,
      actorName: actor.fullName,
      occurredAt: nowIso,
      nextSummary: `Khởi tạo tài khoản [${resolvedStatus}] • Role cố định: ${input.authorization.role} (${input.authorization.scopeType}) • Phương thức: ${input.account.provisioningMethod}`,
      reason:
        input.authorization.reason?.trim() ||
        'Khởi tạo hồ sơ nhân sự và tài khoản theo Role Template cố định.',
    }

    const nextStore = {
      ...store,
      userAccounts: [newAccount, ...store.userAccounts],
      employeeProfiles: [newProfile, ...store.employeeProfiles],
      roleAssignments: [newAssignment, ...store.roleAssignments],
      auditLogs: [auditEntry, ...store.auditLogs],
    }
    writeStaffIdentityStore(nextStore)
    notifyStaffAuthStateChanged()

    const session = buildAuthenticatedSessionForUser(newUserId, nextStore)
    const record = mapStaffEntitiesToManagedRecord(
      newAccount,
      newProfile,
      [newAssignment],
      session?.permissions ?? [],
    )

    return {
      record,
      oneTimeTemporaryPassword: oneTimePasswordToReturn,
    }
  },

  async updateStaffProfile(
    actor: AccountActorContext,
    input: UpdateStaffUserRequestDto,
  ): Promise<ManagedAccountRecord> {
    assertActorHasPermission(actor, 'accounts.update')

    const fullName = input.profile.fullName.trim()
    const employeeCode = input.profile.employeeCode.trim().toUpperCase()
    const normalizedPhone = normalizeVnPhone(input.profile.phone)
    const email = input.profile.email.trim().toLowerCase()

    if (!fullName || !employeeCode) {
      throw new StaffApiClientError('Họ và tên và mã nhân viên không được để trống.', 400)
    }
    if (!isValidEmail(email)) {
      throw new StaffApiClientError('Email công vụ không hợp lệ.', 400)
    }
    if (!isValidVnPhone(normalizedPhone)) {
      throw new StaffApiClientError('Số điện thoại không hợp lệ (chuẩn 10 số Việt Nam).', 400)
    }

    if (
      input.profile.profileType === 'TEACHER' &&
      input.profile.verifiedToeicScore !== undefined &&
      (input.profile.verifiedToeicScore < 0 || input.profile.verifiedToeicScore > 990)
    ) {
      throw new StaffApiClientError('Điểm TOEIC xác minh phải nằm trong khoảng 0 – 990.', 422)
    }

    const department = findDepartmentById(input.profile.departmentId)
    if (!department) {
      throw new StaffApiClientError('Phòng ban công tác không hợp lệ.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<ManagedAccountRecord>(
        STAFF_API_ENDPOINTS.staffUsers.detail(input.userId),
        input,
      )
    }

    const branches = await cmsApi.listBranches()
    const branch = branches.find((b) => b.id === input.profile.branchId)
    if (!branch) {
      throw new StaffApiClientError('Cơ sở công tác không hợp lệ.', 400)
    }

    await mockDelay(160)
    const store = readStaffIdentityStore()
    const studentSupervision = readStudentSupervisionAccounts()
    const accountIdx = store.userAccounts.findIndex((u) => u.id === input.userId)
    const profileIdx = store.employeeProfiles.findIndex((p) => p.userId === input.userId)
    if (accountIdx === -1 || profileIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ nhân sự cần cập nhật.', 404)
    }

    if (
      store.employeeProfiles.some(
        (p) => p.employeeCode.toUpperCase() === employeeCode && p.userId !== input.userId,
      )
    ) {
      throw new StaffApiClientError(`Mã nhân sự "${employeeCode}" đã tồn tại.`, 409)
    }
    if (
      store.employeeProfiles.some(
        (p) => normalizeVnPhone(p.phone) === normalizedPhone && p.userId !== input.userId,
      ) ||
      studentSupervision.some((s) => normalizeVnPhone(s.phone) === normalizedPhone)
    ) {
      throw new StaffApiClientError(`Số điện thoại "${normalizedPhone}" đã được sử dụng.`, 409)
    }
    if (
      store.userAccounts.some(
        (u) => u.email.toLowerCase() === email && u.id !== input.userId,
      ) ||
      store.employeeProfiles.some(
        (p) => p.email.toLowerCase() === email && p.userId !== input.userId,
      ) ||
      studentSupervision.some((s) => s.email.toLowerCase() === email) ||
      MOCK_STUDENT_IDENTITIES.some((s) => s.email.toLowerCase() === email)
    ) {
      throw new StaffApiClientError(`Email "${email}" đã được gắn cho tài khoản khác.`, 409)
    }

    const nowIso = new Date().toISOString()
    const oldProfile = store.employeeProfiles[profileIdx]!
    const oldAccount = store.userAccounts[accountIdx]!

    const updatedAccount: StaffUserAccountDto = {
      ...oldAccount,
      email,
      updatedAt: nowIso,
    }

    const updatedProfile: StaffEmployeeProfileDto = {
      ...oldProfile,
      profileType: input.profile.profileType,
      fullName,
      employeeCode,
      phone: normalizedPhone,
      email,
      branchId: branch.id,
      branchName: branch.name,
      departmentId: department.id,
      departmentName: department.name,
      jobTitle: input.profile.jobTitle?.trim() || undefined,
      status: input.profile.status,
      verifiedToeicScore:
        input.profile.profileType === 'TEACHER'
          ? (input.profile.verifiedToeicScore ?? oldProfile.verifiedToeicScore)
          : undefined,
      specializations:
        input.profile.profileType === 'TEACHER'
          ? input.profile.specializations !== undefined
            ? [...input.profile.specializations]
            : [...(oldProfile.specializations ?? [])]
          : undefined,
    }

    const nextAccounts = [...store.userAccounts]
    nextAccounts[accountIdx] = updatedAccount
    const nextProfiles = [...store.employeeProfiles]
    nextProfiles[profileIdx] = updatedProfile

    const auditEntry: AccountPermissionAuditLogDto = {
      id: `aud-${Date.now()}`,
      targetUserId: input.userId,
      targetUsername: updatedAccount.username,
      targetFullName: fullName,
      actionType: 'PROFILE_UPDATED',
      actorUserId: actor.userId,
      actorName: actor.fullName,
      occurredAt: nowIso,
      previousSummary: `${oldProfile.employeeCode} • ${oldProfile.fullName} • ${oldProfile.departmentName} (${oldProfile.branchName})`,
      nextSummary: `${updatedProfile.employeeCode} • ${updatedProfile.fullName} • ${updatedProfile.departmentName} (${updatedProfile.branchName})`,
      reason: 'Cập nhật thông tin hồ sơ nhân sự (PATCH /staff/users/:id).',
    }

    const nextStore = {
      ...store,
      userAccounts: nextAccounts,
      employeeProfiles: nextProfiles,
      auditLogs: [auditEntry, ...store.auditLogs],
    }
    writeStaffIdentityStore(nextStore)
    notifyStaffAuthStateChanged()

    const assignments = nextStore.roleAssignments.filter((r) => r.userId === input.userId)
    const session = buildAuthenticatedSessionForUser(input.userId, nextStore)
    return mapStaffEntitiesToManagedRecord(
      updatedAccount,
      updatedProfile,
      assignments,
      session?.permissions ?? [],
    )
  },

  async setStaffAccountStatus(
    actor: AccountActorContext,
    input: SetStaffAccountStatusInput,
  ): Promise<ManagedAccountRecord> {
    assertActorHasPermission(actor, 'accounts.lock')

    if (input.userId === actor.userId && input.nextStatus !== 'ACTIVE') {
      throw new StaffApiClientError(
        'Không thể tự khóa hoặc vô hiệu hóa tài khoản đang đăng nhập trực tiếp.',
        400,
      )
    }
    if (!input.reason.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do thay đổi trạng thái tài khoản.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      const endpoint =
        input.nextStatus === 'ACTIVE'
          ? STAFF_API_ENDPOINTS.staffUsers.unlock(input.userId)
          : STAFF_API_ENDPOINTS.staffUsers.lock(input.userId)
      return staffHttpClient.post<ManagedAccountRecord>(endpoint, {
        status: input.nextStatus,
        reason: input.reason.trim(),
      })
    }

    await mockDelay(150)
    if (input.userId.startsWith('stu-')) {
      const students = readStudentSupervisionAccounts()
      const sIdx = students.findIndex((s) => s.id === input.userId)
      if (sIdx === -1) {
        throw new StaffApiClientError('Không tìm thấy tài khoản học viên.', 404)
      }
      const nextStuStatus: 'active' | 'suspended' =
        input.nextStatus === 'ACTIVE' ? 'active' : 'suspended'
      const updatedStu = { ...students[sIdx]!, status: nextStuStatus }
      const nextStudents = [...students]
      nextStudents[sIdx] = updatedStu
      writeStudentSupervisionAccounts(nextStudents)

      return {
        id: updatedStu.id,
        username: updatedStu.username,
        email: updatedStu.email,
        phone: updatedStu.phone,
        category: 'STUDENT',
        role: 'STUDENT',
        roles: [],
        status: updatedStu.status,
        accountStatus: updatedStu.status === 'active' ? 'ACTIVE' : 'LOCKED',
        scopeType: 'OWN',
        createdAt: updatedStu.createdAt,
        lastLoginAt: updatedStu.lastLoginAt,
        studentProfile: updatedStu.studentProfile,
      }
    }

    const store = readStaffIdentityStore()
    const idx = store.userAccounts.findIndex((u) => u.id === input.userId)
    const profile = store.employeeProfiles.find((p) => p.userId === input.userId)
    if (idx === -1 || !profile) {
      throw new StaffApiClientError('Không tìm thấy tài khoản nhân sự.', 404)
    }

    const prevAccount = store.userAccounts[idx]!
    const nowIso = new Date().toISOString()
    const updatedAccount: StaffUserAccountDto = {
      ...prevAccount,
      status: input.nextStatus,
      mustChangePassword: input.nextStatus === 'ACTIVE' ? false : prevAccount.mustChangePassword,
      updatedAt: nowIso,
    }

    const nextAccounts = [...store.userAccounts]
    nextAccounts[idx] = updatedAccount

    const actionType: AccountPermissionAuditLogDto['actionType'] =
      input.nextStatus === 'LOCKED'
        ? 'ACCOUNT_LOCKED'
        : input.nextStatus === 'DISABLED'
          ? 'ACCOUNT_DISABLED'
          : 'ACCOUNT_UNLOCKED'

    const auditEntry: AccountPermissionAuditLogDto = {
      id: `aud-${Date.now()}`,
      targetUserId: updatedAccount.id,
      targetUsername: updatedAccount.username,
      targetFullName: profile.fullName,
      actionType,
      actorUserId: actor.userId,
      actorName: actor.fullName,
      occurredAt: nowIso,
      previousSummary: prevAccount.status,
      nextSummary: updatedAccount.status,
      reason: input.reason.trim(),
    }

    const nextStore = {
      ...store,
      userAccounts: nextAccounts,
      auditLogs: [auditEntry, ...store.auditLogs],
    }
    writeStaffIdentityStore(nextStore)
    notifyStaffAuthStateChanged()

    const assignments = nextStore.roleAssignments.filter((r) => r.userId === input.userId)
    const session = buildAuthenticatedSessionForUser(input.userId, nextStore)
    return mapStaffEntitiesToManagedRecord(
      updatedAccount,
      profile,
      assignments,
      session?.permissions ?? [],
    )
  },

  async resendActivationInvite(
    actor: AccountActorContext,
    userId: string,
  ): Promise<ManagedAccountRecord> {
    assertActorHasPermission(actor, 'accounts.update')

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedAccountRecord>(
        STAFF_API_ENDPOINTS.staffUsers.activate(userId),
      )
    }

    await mockDelay(150)
    const store = readStaffIdentityStore()
    const idx = store.userAccounts.findIndex((u) => u.id === userId)
    const profile = store.employeeProfiles.find((p) => p.userId === userId)
    if (idx === -1 || !profile) {
      throw new StaffApiClientError('Không tìm thấy tài khoản nhân sự.', 404)
    }

    const prevAccount = store.userAccounts[idx]!
    if (prevAccount.status !== 'PENDING_ACTIVATION') {
      throw new StaffApiClientError(
        'Chỉ áp dụng gửi lời mời kích hoạt cho tài khoản đang ở trạng thái Chờ kích hoạt (PENDING_ACTIVATION).',
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const updatedAccount: StaffUserAccountDto = {
      ...prevAccount,
      invitationSentAt: nowIso,
      updatedAt: nowIso,
    }
    const nextAccounts = [...store.userAccounts]
    nextAccounts[idx] = updatedAccount

    const auditEntry: AccountPermissionAuditLogDto = {
      id: `aud-${Date.now()}`,
      targetUserId: updatedAccount.id,
      targetUsername: updatedAccount.username,
      targetFullName: profile.fullName,
      actionType: 'INVITATION_RESENT',
      actorUserId: actor.userId,
      actorName: actor.fullName,
      occurredAt: nowIso,
      previousSummary: prevAccount.invitationSentAt
        ? `Gửi lần trước: ${prevAccount.invitationSentAt}`
        : 'Chưa ghi nhận thời điểm mời',
      nextSummary: `Đã ghi nhận yêu cầu gửi lại lời mời kích hoạt lúc ${nowIso}`,
    }

    const nextStore = {
      ...store,
      userAccounts: nextAccounts,
      auditLogs: [auditEntry, ...store.auditLogs],
    }
    writeStaffIdentityStore(nextStore)

    const assignments = nextStore.roleAssignments.filter((r) => r.userId === userId)
    const session = buildAuthenticatedSessionForUser(userId, nextStore)
    return mapStaffEntitiesToManagedRecord(
      updatedAccount,
      profile,
      assignments,
      session?.permissions ?? [],
    )
  },

  async triggerPasswordReset(
    actor: AccountActorContext,
    input: TriggerStaffPasswordResetInput,
  ): Promise<CreateStaffUserResult> {
    assertActorHasPermission(actor, 'accounts.reset_password')
    if (!input.reason.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do yêu cầu đặt lại mật khẩu.', 400)
    }

    let oneTimePasswordToReturn: string | undefined
    if (input.mode === 'ISSUE_TEMP_PASSWORD') {
      const tempPwd = input.temporaryPassword ?? ''
      const check = evaluatePasswordPolicy(tempPwd)
      if (!check.isValid) {
        throw new StaffApiClientError(
          check.issues[0] ?? 'Mật khẩu tạm thời chưa đạt chuẩn Password Policy.',
          400,
        )
      }
      oneTimePasswordToReturn = tempPwd
    }

    if (!USE_STAFF_MOCK_API) {
      const updated = await staffHttpClient.post<ManagedAccountRecord>(
        STAFF_API_ENDPOINTS.staffUsers.passwordReset(input.userId),
        input,
      )
      return { record: updated, oneTimeTemporaryPassword: oneTimePasswordToReturn }
    }

    await mockDelay(160)
    await ensureSeedMockDigestsInitialized()
    const store = readStaffIdentityStore()
    const idx = store.userAccounts.findIndex((u) => u.id === input.userId)
    const profile = store.employeeProfiles.find((p) => p.userId === input.userId)
    if (idx === -1 || !profile) {
      throw new StaffApiClientError('Không tìm thấy tài khoản nhân sự.', 404)
    }

    const prevAccount = store.userAccounts[idx]!
    if (prevAccount.status === 'DISABLED') {
      throw new StaffApiClientError(
        'Không thể đặt lại mật khẩu cho tài khoản đã vô hiệu hóa (DISABLED).',
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const updatedAccount: StaffUserAccountDto = {
      ...prevAccount,
      status: 'PASSWORD_RESET_REQUIRED',
      mustChangePassword: true,
      updatedAt: nowIso,
    }
    const nextAccounts = [...store.userAccounts]
    nextAccounts[idx] = updatedAccount

    if (oneTimePasswordToReturn) {
      const digest = await hashMockCredential(updatedAccount.id, oneTimePasswordToReturn)
      writeMockCredentialDigest(updatedAccount.id, digest)
    }

    const auditEntry: AccountPermissionAuditLogDto = {
      id: `aud-${Date.now()}`,
      targetUserId: updatedAccount.id,
      targetUsername: updatedAccount.username,
      targetFullName: profile.fullName,
      actionType: 'PASSWORD_RESET_REQUESTED',
      actorUserId: actor.userId,
      actorName: actor.fullName,
      occurredAt: nowIso,
      previousSummary: prevAccount.status,
      nextSummary:
        input.mode === 'ISSUE_TEMP_PASSWORD'
          ? 'PASSWORD_RESET_REQUIRED (Đã cấp mật khẩu tạm băm SHA-256, bắt buộc đổi ngay khi đăng nhập)'
          : 'PASSWORD_RESET_REQUIRED (Yêu cầu đổi mật khẩu ở phiên đăng nhập kế tiếp)',
      reason: input.reason.trim(),
    }

    const nextStore = {
      ...store,
      userAccounts: nextAccounts,
      auditLogs: [auditEntry, ...store.auditLogs],
    }
    writeStaffIdentityStore(nextStore)
    notifyStaffAuthStateChanged()

    const assignments = nextStore.roleAssignments.filter((r) => r.userId === input.userId)
    const session = buildAuthenticatedSessionForUser(input.userId, nextStore)
    const record = mapStaffEntitiesToManagedRecord(
      updatedAccount,
      profile,
      assignments,
      session?.permissions ?? [],
    )
    return { record, oneTimeTemporaryPassword: oneTimePasswordToReturn }
  },

  /**
   * GET /api/v1/staff/roles – Chỉ đọc danh sách Role cố định và bộ Permission tương ứng.
   * Hệ thống KHÔNG cung cấp API chỉnh sửa Permission của Role.
   */
  async listRolesMatrix(): Promise<RoleMatrixItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<RoleMatrixItem[]>(STAFF_API_ENDPOINTS.rbac.roles)
    }

    await mockDelay(80)
    const store = readStaffIdentityStore()

    return ROLE_DEFINITIONS.map((def) => ({
      ...def,
      scopeType: def.defaultScopeType,
      accountCount: new Set(
        store.roleAssignments.filter((r) => r.roleId === def.role).map((r) => r.userId),
      ).size,
      permissions: FIXED_ROLE_PERMISSIONS[def.role],
    }))
  },
}
