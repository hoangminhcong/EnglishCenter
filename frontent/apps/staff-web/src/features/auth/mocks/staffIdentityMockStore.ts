import type {
  AccessScopeType,
  AccountPermissionAuditLogDto,
  AuthenticatedStaffSessionDto,
  PermissionCode,
  PermissionScopeGrant,
  StaffAccountStatus,
  StaffEmployeeProfileDto,
  StaffRole,
  StaffUserAccountDto,
  UserRoleAssignmentDto,
} from '@english-center/contracts'
import { hashMockCredential } from '@/config/passwordPolicy'
import {
  getDefaultLandingRouteForRole,
  getPermissionsForRole,
} from '@/services/permissions/permissions.config'
import { readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'

export { hashMockCredential }

export const STAFF_IDENTITY_STORE_KEY = 'ec_staff_identity_store_v6'
export const MOCK_CREDENTIAL_DIGESTS_KEY = 'ec_staff_mock_cred_digests_v6'
export const STUDENT_SUPERVISION_ACCOUNTS_KEY = 'ec_staff_student_supervision_accounts_v6'

export interface StaffIdentityMockStoreState {
  userAccounts: StaffUserAccountDto[]
  employeeProfiles: StaffEmployeeProfileDto[]
  roleAssignments: UserRoleAssignmentDto[]
  auditLogs: AccountPermissionAuditLogDto[]
}

export interface StudentSupervisionSeedRecord {
  id: string
  username: string
  email: string
  phone: string
  status: 'active' | 'suspended'
  createdAt: string
  lastLoginAt: string
  studentProfile: {
    profileId: string
    studentCode: string
    fullName: string
    enrolledClassCode: string
    courseName: string
    entryScore: number
    targetScore: number
    branchName: string
  }
}

function buildSeedStudentSupervisionAccounts(): StudentSupervisionSeedRecord[] {
  return [
    {
      id: 'stu-hv-001',
      username: 'hv.minhquan',
      email: 'minhquan@englishcenter.edu.vn',
      phone: '0988777666',
      status: 'active',
      createdAt: '2026-10-15T08:00:00.000Z',
      lastLoginAt: '2026-11-27T07:40:00.000Z',
      studentProfile: {
        profileId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        fullName: 'Đỗ Minh Quân',
        enrolledClassCode: 'EC-S01',
        courseName: 'SUBMARINE TOEIC 700+',
        entryScore: 550,
        targetScore: 750,
        branchName: 'Cơ sở 1 – Hà Đông',
      },
    },
    {
      id: 'stu-hv-002',
      username: 'hv.minhanh',
      email: 'minhanh@englishcenter.edu.vn',
      phone: '0912345678',
      status: 'active',
      createdAt: '2026-10-20T08:30:00.000Z',
      lastLoginAt: '2026-11-26T20:15:00.000Z',
      studentProfile: {
        profileId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        fullName: 'Nguyễn Minh Anh',
        enrolledClassCode: 'EC-CB02',
        courseName: 'CAMP BOMB TOEIC 450+',
        entryScore: 370,
        targetScore: 530,
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
      },
    },
    {
      id: 'stu-hv-003',
      username: 'hv.giahuy',
      email: 'giahuy@englishcenter.edu.vn',
      phone: '0977112233',
      status: 'active',
      createdAt: '2026-10-22T09:00:00.000Z',
      lastLoginAt: '2026-11-25T19:00:00.000Z',
      studentProfile: {
        profileId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        fullName: 'Phạm Gia Huy',
        enrolledClassCode: 'EC-S01',
        courseName: 'SUBMARINE TOEIC 700+',
        entryScore: 510,
        targetScore: 720,
        branchName: 'Cơ sở 1 – Hà Đông',
      },
    },
  ]
}

export function readStudentSupervisionAccounts(): StudentSupervisionSeedRecord[] {
  return readMockCollection(
    STUDENT_SUPERVISION_ACCOUNTS_KEY,
    buildSeedStudentSupervisionAccounts,
  )
}

export function writeStudentSupervisionAccounts(next: StudentSupervisionSeedRecord[]): void {
  writeMockCollection(STUDENT_SUPERVISION_ACCOUNTS_KEY, next)
}

/** Mật khẩu chung cho toàn bộ tài khoản nhân sự: Staff@2026 */
const SEED_CREDENTIAL_SHA256_DIGESTS: Readonly<Record<string, string>> = {
  'acc-stf-001': '0ab24dd1908d857ba62b8cf84203e01eba826f200eaff3ec26d45862708b8376',
  'acc-stf-002': 'ef8f0850e1fba3eecdd078e4f11f5389fc4bd0d3db586554b54de06f09462c05',
  'acc-stf-003': '968894e8eefe2c61fd63b0bd7bce0bb639454f240e69a48db0da3d589b27e01b',
  'acc-stf-004': 'dc3088e48eeb7e24f4aadf927bdea29c3a99428b08a32160930ea3802182987e',
  'acc-stf-005': 'bdd5abad17a888dc63f39997af5ba4a1c585129c8528bbed6034860384e0043e',
  'acc-stf-006': 'a85c4c52a24bf23abc7f9a50f2e9b9a4892306541cc077af2d20004612b98515',
  'acc-stf-007': 'a843891e4b71535d621c7120241acdd604bad6023a809b518ce0098534217773',
  'acc-stf-008': '532a13726bc681a0465d2f2c7b388b7a4fa9f608f8f3ab0463b50a30862a5ccd',
}
const SEED_CREDENTIAL_FALLBACK_DIGESTS: Readonly<Record<string, string>> = {
  'acc-stf-001': 'ffce6eb20e7e9752',
  'acc-stf-002': 'e40a5123b6528c59',
  'acc-stf-003': 'a5112293ee5cbea8',
  'acc-stf-004': '2ec04fd40e235f00',
  'acc-stf-005': 'c736d6c5831ec967',
  'acc-stf-006': 'd1cf35bff6a48d18',
  'acc-stf-007': 'a0fd6e997e8bd216',
  'acc-stf-008': 'e64eabf0ffe11aff',
}

export interface MockStudentAccountIdentity {
  id: string
  username: string
  email: string
  displayName: string
  status: StaffAccountStatus
}

export const MOCK_STUDENT_IDENTITIES: readonly MockStudentAccountIdentity[] = [
  {
    id: 'stu-hv-001',
    username: 'hv.minhquan',
    email: 'minhquan@englishcenter.edu.vn',
    displayName: 'Đỗ Minh Quân',
    status: 'ACTIVE',
  },
  {
    id: 'stu-hv-002',
    username: 'hv.minhanh',
    email: 'minhanh@englishcenter.edu.vn',
    displayName: 'Nguyễn Minh Anh',
    status: 'ACTIVE',
  },
]

function buildSeedIdentityStore(): StaffIdentityMockStoreState {
  return {
    userAccounts: [
      {
        id: 'acc-stf-001',
        username: 'admin',
        email: 'admin@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-27T08:05:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-11-27T08:05:00.000Z',
      },
      {
        id: 'acc-stf-002',
        username: 'tuvan',
        email: 'tuvan@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-27T08:15:00.000Z',
        createdAt: '2026-09-05T08:00:00.000Z',
        updatedAt: '2026-11-27T08:15:00.000Z',
      },
      {
        id: 'acc-stf-003',
        username: 'ketoan',
        email: 'ketoan@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-27T08:20:00.000Z',
        createdAt: '2026-09-05T08:00:00.000Z',
        updatedAt: '2026-11-27T08:20:00.000Z',
      },
      {
        id: 'acc-stf-004',
        username: 'hocvu',
        email: 'hocvu@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-27T08:25:00.000Z',
        createdAt: '2026-09-05T08:00:00.000Z',
        updatedAt: '2026-11-27T08:25:00.000Z',
      },
      {
        id: 'acc-stf-005',
        username: 'tuvan2',
        email: 'tuvan2@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-26T17:45:00.000Z',
        createdAt: '2026-09-12T08:00:00.000Z',
        updatedAt: '2026-11-26T17:45:00.000Z',
      },
      {
        id: 'acc-stf-006',
        username: 'giaovien2',
        email: 'giaovien2@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-26T21:10:00.000Z',
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-11-26T21:10:00.000Z',
      },
      {
        id: 'acc-stf-007',
        username: 'giaovien',
        email: 'giaovien@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'ACTIVE',
        provisioningMethod: 'INVITE_LINK',
        mustChangePassword: false,
        lastLoginAt: '2026-11-27T07:55:00.000Z',
        createdAt: '2026-09-10T08:00:00.000Z',
        updatedAt: '2026-11-27T07:55:00.000Z',
      },
      {
        id: 'acc-stf-008',
        username: 'nhanvien.tamkhoa',
        email: 'dang.vu@englishcenter.edu.vn',
        accountType: 'STAFF',
        status: 'LOCKED',
        provisioningMethod: 'TEMPORARY_PASSWORD',
        mustChangePassword: false,
        lastLoginAt: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-09-20T08:00:00.000Z',
        updatedAt: '2026-11-15T09:00:00.000Z',
      },
    ],
    employeeProfiles: [
      {
        id: 'emp-stf-001',
        userId: 'acc-stf-001',
        employeeCode: 'NV-ADM-01',
        fullName: 'Nguyễn Hoàng Nam',
        phone: '0989688001',
        email: 'admin@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        departmentId: 'dept-board',
        departmentName: 'Ban Quản trị Hệ thống',
        jobTitle: 'Quản trị viên Hệ thống',
        status: 'ACTIVE',
      },
      {
        id: 'emp-stf-002',
        userId: 'acc-stf-002',
        employeeCode: 'NV-SAL-01',
        fullName: 'Lê Thanh Thảo',
        phone: '0989688002',
        email: 'tuvan@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        departmentId: 'dept-sales',
        departmentName: 'Phòng Tư vấn Tuyển sinh',
        jobTitle: 'Trưởng nhóm Tư vấn Tuyển sinh',
        status: 'ACTIVE',
      },
      {
        id: 'emp-stf-003',
        userId: 'acc-stf-003',
        employeeCode: 'NV-ACC-01',
        fullName: 'Trần Thu Hà',
        phone: '0989688003',
        email: 'ketoan@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        departmentId: 'dept-accounting',
        departmentName: 'Phòng Kế toán – Học phí',
        jobTitle: 'Kế toán Trưởng Học phí',
        status: 'ACTIVE',
      },
      {
        id: 'emp-stf-004',
        userId: 'acc-stf-004',
        employeeCode: 'NV-ACA-01',
        fullName: 'Lê Hoàng Quân',
        phone: '0989688004',
        email: 'hocvu@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        departmentId: 'dept-academic',
        departmentName: 'Phòng Giáo vụ Đào tạo',
        jobTitle: 'Chuyên viên Quản lý Giáo vụ',
        status: 'ACTIVE',
      },
      {
        id: 'emp-stf-005',
        userId: 'acc-stf-005',
        employeeCode: 'NV-SAL-02',
        fullName: 'Phạm Quốc Bảo',
        phone: '0989688005',
        email: 'tuvan2@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-nam-tu-liem',
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
        departmentId: 'dept-sales',
        departmentName: 'Phòng Tư vấn Tuyển sinh',
        jobTitle: 'Chuyên viên Tư vấn Tuyển sinh',
        status: 'ACTIVE',
      },
      {
        id: 'tea-stf-006',
        userId: 'acc-stf-006',
        employeeCode: 'GV-TOEIC-02',
        fullName: 'Thầy Minh Đức',
        phone: '0989688006',
        email: 'giaovien2@englishcenter.edu.vn',
        profileType: 'TEACHER',
        branchId: 'cs-hai-ba-trung',
        branchName: 'Cơ sở 3 – Hai Bà Trưng',
        departmentId: 'dept-teaching',
        departmentName: 'Tổ Chuyên môn TOEIC',
        jobTitle: 'Giảng viên TOEIC Cơ sở & Trực tuyến',
        status: 'ACTIVE',
        verifiedToeicScore: 960,
        specializations: ['TOEIC Foundation', 'TOEIC Online Interactive'],
        assignedClassCodes: ['TOEIC-FD01', 'ONL-CB11'],
      },
      {
        id: 'tea-stf-007',
        userId: 'acc-stf-007',
        employeeCode: 'GV-TOEIC-01',
        fullName: 'Cô Lan Hương',
        phone: '0989688007',
        email: 'giaovien@englishcenter.edu.vn',
        profileType: 'TEACHER',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        departmentId: 'dept-teaching',
        departmentName: 'Tổ Chuyên môn TOEIC',
        jobTitle: 'Giảng viên Chính TOEIC 975',
        status: 'ACTIVE',
        verifiedToeicScore: 975,
        specializations: ['TOEIC Listening & Reading 700+', 'Luyện giải đề ETS chuyên sâu'],
        assignedClassCodes: ['EC-S01', 'EC-CB02'],
      },
      {
        id: 'emp-stf-008',
        userId: 'acc-stf-008',
        employeeCode: 'NV-SAL-03',
        fullName: 'Vũ Hải Đăng',
        phone: '0989688008',
        email: 'dang.vu@englishcenter.edu.vn',
        profileType: 'EMPLOYEE',
        branchId: 'cs-tay-son',
        branchName: 'Cơ sở 4 – Tây Sơn',
        departmentId: 'dept-sales',
        departmentName: 'Phòng Tư vấn Tuyển sinh',
        jobTitle: 'Cộng tác viên Tư vấn',
        status: 'INACTIVE',
      },
    ],
    roleAssignments: [
      { userId: 'acc-stf-001', roleId: 'ADMIN', scopeType: 'ALL', assignedAt: '2026-09-01T08:00:00.000Z' },
      { userId: 'acc-stf-002', roleId: 'SALES', scopeType: 'ALL', assignedAt: '2026-09-05T08:00:00.000Z' },
      { userId: 'acc-stf-003', roleId: 'ACCOUNTANT', scopeType: 'ALL', assignedAt: '2026-09-05T08:00:00.000Z' },
      { userId: 'acc-stf-004', roleId: 'ACADEMIC', scopeType: 'ALL', assignedAt: '2026-09-05T08:00:00.000Z' },
      { userId: 'acc-stf-005', roleId: 'SALES', scopeType: 'OWN', assignedAt: '2026-09-12T08:00:00.000Z' },
      { userId: 'acc-stf-006', roleId: 'TEACHER', scopeType: 'OWN', assignedAt: '2026-09-15T08:00:00.000Z' },
      { userId: 'acc-stf-007', roleId: 'TEACHER', scopeType: 'OWN', assignedAt: '2026-09-10T08:00:00.000Z' },
      { userId: 'acc-stf-008', roleId: 'SALES', scopeType: 'OWN', assignedAt: '2026-09-20T08:00:00.000Z' },
    ],
    auditLogs: [
      {
        id: 'aud-001',
        targetUserId: 'acc-stf-007',
        targetUsername: 'giaovien',
        targetFullName: 'Cô Lan Hương',
        actionType: 'ACCOUNT_CREATED',
        actorUserId: 'acc-stf-001',
        actorName: 'Nguyễn Hoàng Nam',
        occurredAt: '2026-09-10T08:00:00.000Z',
        nextSummary: 'Cấp tài khoản Giảng viên Chính TOEIC (Phạm vi: Lớp được phân công)',
        reason: 'Tiếp nhận nhân sự giảng dạy học kỳ Thu – Đông 2026',
      },
      {
        id: 'aud-002',
        targetUserId: 'acc-stf-008',
        targetUsername: 'nhanvien.tamkhoa',
        targetFullName: 'Vũ Hải Đăng',
        actionType: 'ACCOUNT_LOCKED',
        actorUserId: 'acc-stf-001',
        actorName: 'Nguyễn Hoàng Nam',
        occurredAt: '2026-11-15T09:00:00.000Z',
        previousSummary: 'Trạng thái: ACTIVE',
        nextSummary: 'Trạng thái: LOCKED',
        reason: 'Tạm nghỉ phép cá nhân dài hạn theo đơn đã duyệt',
      },
      {
        id: 'aud-003',
        targetUserId: 'acc-stf-002',
        targetUsername: 'tuvan',
        targetFullName: 'Lê Thanh Thảo',
        actionType: 'PROFILE_UPDATED',
        actorUserId: 'acc-stf-001',
        actorName: 'Nguyễn Hoàng Nam',
        occurredAt: '2026-11-22T14:20:00.000Z',
        previousSummary: 'Chức danh: Chuyên viên Tư vấn Tuyển sinh',
        nextSummary: 'Chức danh: Trưởng nhóm Tư vấn Tuyển sinh (Phạm vi: ALL)',
        reason: 'Bổ nhiệm phụ trách điều phối đội ngũ tư vấn toàn hệ thống',
      },
    ],
  }
}

export function readStaffIdentityStore(): StaffIdentityMockStoreState {
  return readMockCollection(STAFF_IDENTITY_STORE_KEY, buildSeedIdentityStore)
}

export function writeStaffIdentityStore(next: StaffIdentityMockStoreState): void {
  writeMockCollection(STAFF_IDENTITY_STORE_KEY, next)
}

export function readMockCredentialDigests(): Record<string, string> {
  return readMockCollection<Record<string, string>>(MOCK_CREDENTIAL_DIGESTS_KEY, () => ({}))
}

export function writeMockCredentialDigests(next: Record<string, string>): void {
  writeMockCollection(MOCK_CREDENTIAL_DIGESTS_KEY, next)
}

export function writeMockCredentialDigest(userId: string, passwordDigest: string): void {
  const current = readMockCredentialDigests()
  writeMockCredentialDigests({
    ...current,
    [userId]: passwordDigest,
  })
}

export async function ensureSeedMockDigestsInitialized(): Promise<Record<string, string>> {
  const current = readMockCredentialDigests()
  let changed = false
  const next = { ...current }
  const seedMap = globalThis.crypto?.subtle
    ? SEED_CREDENTIAL_SHA256_DIGESTS
    : SEED_CREDENTIAL_FALLBACK_DIGESTS

  for (const [userId, digest] of Object.entries(seedMap)) {
    if (!next[userId]) {
      next[userId] = digest
      changed = true
    }
  }

  if (changed) {
    writeMockCredentialDigests(next)
  }
  return next
}

const SCOPE_RANK: Record<AccessScopeType, number> = {
  OWN: 1,
  TEAM: 2,
  BRANCH: 3,
  ALL: 4,
}

export function buildAuthenticatedSessionForUser(
  userId: string,
  store = readStaffIdentityStore(),
): AuthenticatedStaffSessionDto | null {
  const account = store.userAccounts.find((a) => a.id === userId)
  const employee = store.employeeProfiles.find((p) => p.userId === userId)
  const resolvedAccountType = account?.accountType ?? 'STAFF'
  if (!account || !employee || resolvedAccountType !== 'STAFF') return null

  const assignments = store.roleAssignments.filter((r) => r.userId === userId)
  const roles: StaffRole[] = assignments.map((a) => a.roleId)
  const primaryRole: StaffRole =
    roles[0] ?? (employee.profileType === 'TEACHER' ? 'TEACHER' : 'SALES')

  const permissionSet = new Set<PermissionCode>()
  const scopes: Partial<Record<PermissionCode, PermissionScopeGrant>> = {}

  for (const assignment of assignments) {
    const fixedPerms = getPermissionsForRole(assignment.roleId)
    for (const perm of fixedPerms) {
      permissionSet.add(perm)
      const existing = scopes[perm]
      if (!existing || SCOPE_RANK[assignment.scopeType] > SCOPE_RANK[existing.type]) {
        scopes[perm] = {
          type: assignment.scopeType,
          scopeIds: assignment.scopeIds,
        }
      }
    }
  }

  const permissions = Array.from(permissionSet)
  const defaultLandingRoute = getDefaultLandingRouteForRole(primaryRole)

  return {
    user: {
      id: account.id,
      username: account.username,
      displayName: employee.fullName,
      email: account.email,
      status: account.status,
      lastLoginAt: account.lastLoginAt ?? null,
    },
    accountType: 'STAFF',
    portal: 'STAFF',
    role: primaryRole,
    roles,
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      profileType: employee.profileType,
      phone: employee.phone,
      email: employee.email,
      branchId: employee.branchId,
      branchName: employee.branchName,
      departmentId: employee.departmentId,
      departmentName: employee.departmentName,
      jobTitle: employee.jobTitle,
      status: employee.status,
    },
    permissions,
    scopes,
    defaultLandingRoute,
  }
}
