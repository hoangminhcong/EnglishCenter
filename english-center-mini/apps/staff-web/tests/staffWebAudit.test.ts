import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  deriveAccountingReceivableStatus,
  type SalesLeadDto,
} from '@english-center/contracts'
import {
  evaluatePasswordPolicy,
  generateStrongTemporaryPassword,
  hashMockCredential,
} from '../src/config/passwordPolicy.ts'
import { academicApi } from '../src/features/academic/services/academicApi.ts'
import { accountingApi } from '../src/features/accounting/services/accountingApi.ts'
import { accountsApi } from '../src/features/accounts/api/accountsApi.ts'
import { authService } from '../src/features/auth/services/authService.ts'
import { cmsApi } from '../src/features/content/api/cmsApi.ts'
import { coursesApi } from '../src/features/courses/api/coursesApi.ts'
import {
  projectPublicStudentTestPayload,
  testAuthoringApi,
} from '../src/features/learning/api/testAuthoringApi.ts'
import { canAccessLead } from '../src/features/sales/services/salesApi.ts'
import { teacherApi } from '../src/features/teacher/services/teacherApi.ts'
import { trainingApi } from '../src/features/training/api/trainingApi.ts'
import { calculateNetTuition } from '../src/features/tuition/api/tuitionApi.ts'
import * as mockStorageModule from '../src/services/mock/mockStorage.ts'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
  readTeacherOpsStore,
} from '../src/services/mock/operationsMockStore.ts'
import {
  FIXED_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  ROLE_DEFINITIONS,
  getDefaultLandingRouteForRole,
  getEffectivePermissionScope,
  getPermissionsForRole,
  isPermittedStaffRoute,
  resolveStaffDefaultHomePath,
} from '../src/services/permissions/permissions.config.ts'
import {
  resolveStaffAppPortalAccess,
  sanitizeInternalRoutePath,
} from '../src/services/portal/portalResolver.ts'
import {
  normalizeVnPhone,
  toVietnamYmd,
} from '../src/shared/utils/staffFormatters.ts'
import type { PermissionCode, StaffRole } from '../src/types/rbac.types.ts'
import { seedStaffTestWorkspace } from './fixtures/staffTestFixtures.ts'

beforeEach(() => {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
  if (
    'resetAllMockStorage' in mockStorageModule &&
    typeof mockStorageModule.resetAllMockStorage === 'function'
  ) {
    ;(mockStorageModule.resetAllMockStorage as () => void)()
  }
})

function buildSubjectForRole(role: StaffRole) {
  const permissions = [...getPermissionsForRole(role)]
  const defaultScope = ROLE_DEFINITIONS.find((r) => r.role === role)?.defaultScopeType ?? 'OWN'
  const scopes: Partial<Record<PermissionCode, { type: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' }>> = {}
  for (const perm of permissions) {
    scopes[perm] = { type: defaultScope }
  }
  return {
    permissions,
    scopes,
    defaultLandingRoute: getDefaultLandingRouteForRole(role),
  }
}

describe('Suite 0: Synchronized Review Seed & Zero Demo Accounts', () => {
  it('populates synchronized review datasets across Staff modules and rejects legacy .demo logins', async () => {
    const accounts = await accountsApi.listAccounts()
    assert.equal(accounts.length >= 5, true)
    assert.equal(accounts.some((acc) => acc.username.endsWith('.demo')), false)

    await assert.rejects(() =>
      authService.login({
        identifier: 'admin.demo',
        password: 'Admin@Demo1!',
        rememberMe: false,
      }),
    )

    const validAdmin = await authService.login({
      identifier: 'admin',
      password: 'Staff@2026',
      rememberMe: false,
    })
    assert.equal(validAdmin.outcome, 'AUTHENTICATED')

    const [courses, branches, centerClasses, tests] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      trainingApi.listAllCenterClasses(),
      testAuthoringApi.listTests(),
    ])

    assert.equal(courses.length >= 4, true)
    assert.equal(branches.length >= 6, true)
    assert.equal(centerClasses.length >= 5, true)
    assert.equal(tests.length >= 2, true)
    assert.equal(readAcademicOpsStore().students.length >= 4, true)
    assert.equal(readAccountingOpsStore().transactions.length >= 3, true)
    assert.equal(readTeacherOpsStore().sessions.length >= 24, true)
  })
})

describe('Fixed RBAC Registry & Separation of Duties', () => {
  it('defines exactly 5 Staff roles and excludes STUDENT from Staff RBAC', () => {
    const roles = Object.keys(FIXED_ROLE_PERMISSIONS).sort()
    assert.deepEqual(roles, ['ACADEMIC', 'ACCOUNTANT', 'ADMIN', 'SALES', 'TEACHER'])
    assert.equal('STUDENT' in FIXED_ROLE_PERMISSIONS, false)
  })

  it('has 100% two-way alignment between PERMISSION_CATALOG and FIXED_ROLE_PERMISSIONS (zero orphan permissions)', () => {
    const catalogCodes = new Set(PERMISSION_CATALOG.map((item) => item.code))
    assert.equal(catalogCodes.size, PERMISSION_CATALOG.length, 'Duplicate code in PERMISSION_CATALOG')

    const assignedCodes = new Set<PermissionCode>()
    for (const perms of Object.values(FIXED_ROLE_PERMISSIONS)) {
      for (const code of perms) {
        assert.equal(catalogCodes.has(code), true, `Unregistered permission assigned: ${code}`)
        assignedCodes.add(code)
      }
    }

    for (const code of catalogCodes) {
      assert.equal(assignedCodes.has(code), true, `Orphan permission in catalog: ${code}`)
    }
  })

  it('enforces strict role isolation (ADMIN !== ALL_PERMISSIONS)', () => {
    const adminPerms = new Set(FIXED_ROLE_PERMISSIONS.ADMIN)
    for (const code of adminPerms) {
      assert.equal(code.startsWith('sales.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('finance.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('academic.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('teacher.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('attendance.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('assignments.'), false, `ADMIN must not hold ${code}`)
      assert.equal(code.startsWith('grades.'), false, `ADMIN must not hold ${code}`)
    }

    assert.equal(FIXED_ROLE_PERMISSIONS.SALES.includes('sales.leads.reopen'), true)
    assert.equal(FIXED_ROLE_PERMISSIONS.ACADEMIC.includes('sales.registrations.review'), true)
    assert.equal(FIXED_ROLE_PERMISSIONS.ACADEMIC.includes('sales.leads.view'), false)
    assert.equal(FIXED_ROLE_PERMISSIONS.TEACHER.includes('assignments.update'), true)
    assert.equal(FIXED_ROLE_PERMISSIONS.TEACHER.includes('assignments.close'), true)
  })

  it('resolves effective permission scopes accurately', () => {
    const teacher = buildSubjectForRole('TEACHER')
    assert.deepEqual(getEffectivePermissionScope(teacher, 'grades.update'), { type: 'OWN' })
    assert.equal(getEffectivePermissionScope(teacher, 'accounts.view'), null)
  })
})

describe('Portal Access, Route Guards & Redirect Sanitization', () => {
  it('routes each Staff role to its exact landing dashboard and blocks empty permissions', () => {
    assert.equal(resolveStaffDefaultHomePath(buildSubjectForRole('ADMIN')), '/dashboard')
    assert.equal(resolveStaffDefaultHomePath(buildSubjectForRole('SALES')), '/sales/dashboard')
    assert.equal(
      resolveStaffDefaultHomePath(buildSubjectForRole('ACCOUNTANT')),
      '/accounting/dashboard',
    )
    assert.equal(
      resolveStaffDefaultHomePath(buildSubjectForRole('ACADEMIC')),
      '/academic/dashboard',
    )
    assert.equal(resolveStaffDefaultHomePath(buildSubjectForRole('TEACHER')), '/teacher/dashboard')
    assert.equal(
      resolveStaffDefaultHomePath({ permissions: [], scopes: {}, defaultLandingRoute: '/dashboard' }),
      '/no-access',
    )
    assert.equal(resolveStaffDefaultHomePath(null), '/login')
  })

  it('validates permitted vs forbidden routes across roles, including /profile and dynamic paths', () => {
    const admin = buildSubjectForRole('ADMIN')
    const academic = buildSubjectForRole('ACADEMIC')
    const teacher = buildSubjectForRole('TEACHER')

    for (const subject of [admin, academic, teacher]) {
      assert.equal(isPermittedStaffRoute(subject, '/profile'), true)
      assert.equal(isPermittedStaffRoute(subject, '/profile?tab=password'), true)
      assert.equal(isPermittedStaffRoute(subject, '/change-password'), true)
    }

    assert.equal(isPermittedStaffRoute(admin, '/accounts'), true)
    assert.equal(isPermittedStaffRoute(admin, '/sales/dashboard'), false)
    assert.equal(isPermittedStaffRoute(admin, '/accounting/payments'), false)

    assert.equal(isPermittedStaffRoute(academic, '/academic/placement'), true)
    assert.equal(isPermittedStaffRoute(academic, '/sales/registrations/reg-2026-0002'), true)
    assert.equal(isPermittedStaffRoute(academic, '/sales/registrations/new'), false)
    assert.equal(isPermittedStaffRoute(academic, '/sales/leads/lead-01'), false)

    assert.equal(isPermittedStaffRoute(teacher, '/teacher/progress'), true)
    assert.equal(isPermittedStaffRoute(teacher, '/teacher/classes/cls-hd-550-01'), true)
    assert.equal(isPermittedStaffRoute(teacher, '/accounts'), false)
  })

  it('prevents open redirects and rejects STUDENT portal sessions on Staff Web', () => {
    assert.equal(sanitizeInternalRoutePath('https://evil.example/phish', '/dashboard'), '/dashboard')
    assert.equal(sanitizeInternalRoutePath('//evil.example/phish', '/dashboard'), '/dashboard')
    assert.equal(sanitizeInternalRoutePath('javascript:alert(1)', '/dashboard'), '/dashboard')
    assert.equal(sanitizeInternalRoutePath(12345, '/dashboard'), '/dashboard')
    assert.equal(
      sanitizeInternalRoutePath('/academic/classes?tab=active', '/dashboard'),
      '/academic/classes?tab=active',
    )

    const studentAttempt = resolveStaffAppPortalAccess({
      accountType: 'STUDENT',
      portal: 'CLIENT',
    })
    assert.equal(studentAttempt.allowedOnCurrentApp, false)
    assert.equal(studentAttempt.targetPortal, 'CLIENT')
    assert.equal(studentAttempt.safeRedirectUrl, 'http://localhost:5173/login')

    const staffAttempt = resolveStaffAppPortalAccess({
      accountType: 'STAFF',
      portal: 'STAFF',
    })
    assert.equal(staffAttempt.allowedOnCurrentApp, true)
    assert.equal(staffAttempt.safeRedirectUrl, null)
  })
})

describe('Password Policy, Hashing & Domain Helpers', () => {
  it('enforces password complexity and generates compliant temporary passwords', async () => {
    assert.equal(evaluatePasswordPolicy('weak123').isValid, false)
    assert.equal(evaluatePasswordPolicy('NoSpecialChar123').isValid, false)
    assert.equal(evaluatePasswordPolicy('Strong#Pass2026').isValid, true)

    for (let i = 0; i < 10; i++) {
      const generated = generateStrongTemporaryPassword(12)
      const evalResult = evaluatePasswordPolicy(generated)
      assert.equal(evalResult.isValid, true)
      assert.equal(evalResult.score, 5)
    }

    const h1 = await hashMockCredential('staff-01', 'Strong#Pass2026')
    const h2 = await hashMockCredential('staff-02', 'Strong#Pass2026')
    assert.equal(h1.length, 64)
    assert.notEqual(h1, h2)
    assert.equal(h1.includes('Strong#Pass2026'), false)
  })

  it('normalizes VN phone numbers, formats Vietnam UTC+7 dates, computes net tuition, and enforces Sales data scopes', () => {
    assert.equal(normalizeVnPhone('+84 901.234.567'), '0901234567')
    assert.equal(normalizeVnPhone('84987654321'), '0987654321')
    assert.equal(toVietnamYmd('2026-11-26T18:30:00.000Z'), '2026-11-27')

    assert.equal(calculateNetTuition(4_000_000, 15, 0), 3_400_000)
    assert.equal(calculateNetTuition(4_000_000, 10, 200_000), 3_400_000)
    assert.equal(calculateNetTuition(2_000_000, 0, 5_000_000), 0)

    const mockLead: SalesLeadDto = {
      id: 'lead-test-01',
      fullName: 'Test Lead',
      phone: '0901234567',
      source: 'website-consultation',
      learningNeed: 'TOEIC 650+',
      interestedCourseIds: ['foundation-toeic'],
      preferredBranchId: 'br-hadong',
      consentSummary: 'Khách đăng ký qua biểu mẫu tư vấn.',
      assignedSaleId: 'staff-sale-01',
      status: 'New',
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    }

    assert.equal(
      canAccessLead(mockLead, {
        userId: 'staff-sale-01',
        fullName: 'Sale 01',
        role: 'SALES',
        scope: 'own',
        canReviewRegistrations: false,
        canAdminReopenLead: false,
      }),
      true,
    )
    assert.equal(
      canAccessLead(mockLead, {
        userId: 'staff-sale-02',
        fullName: 'Sale 02',
        role: 'SALES',
        scope: 'own',
        canReviewRegistrations: false,
        canAdminReopenLead: false,
      }),
      false,
    )
    assert.equal(
      canAccessLead(mockLead, {
        userId: 'staff-sale-02',
        fullName: 'Sale 02',
        role: 'SALES',
        scope: 'branch',
        branchId: 'br-hadong',
        canReviewRegistrations: false,
        canAdminReopenLead: false,
      }),
      true,
    )
    assert.equal(
      canAccessLead(mockLead, {
        userId: 'staff-sale-02',
        fullName: 'Sale 02',
        role: 'SALES',
        scope: 'branch',
        branchId: 'br-caugiay',
        canReviewRegistrations: false,
        canAdminReopenLead: false,
      }),
      false,
    )
  })
})

describe('End-to-End Business Workflows & Data Integrity', () => {
  it('derives Accounting receivable statuses accurately and cascades voidTransaction onto Receipts', async () => {
    await seedStaffTestWorkspace()

    assert.equal(
      deriveAccountingReceivableStatus({
        isCancelled: false,
        totalReceivableVnd: 4_000_000,
        paidConfirmedVnd: 4_000_000,
        dueDate: '2026-12-01',
        todayYmdVn: '2026-11-27',
      }),
      'Paid',
    )
    assert.equal(
      deriveAccountingReceivableStatus({
        isCancelled: false,
        totalReceivableVnd: 4_000_000,
        paidConfirmedVnd: 1_500_000,
        dueDate: '2026-11-01',
        todayYmdVn: '2026-11-27',
      }),
      'Overdue',
    )
    assert.equal(
      deriveAccountingReceivableStatus({
        isCancelled: false,
        totalReceivableVnd: 4_000_000,
        paidConfirmedVnd: 1_500_000,
        dueDate: '2026-12-15',
        todayYmdVn: '2026-11-27',
      }),
      'PartiallyPaid',
    )

    const [beforeReceipts, refunds] = await Promise.all([
      accountingApi.listReceipts(),
      accountingApi.listRefunds(),
    ])
    const activeRefundTxIds = new Set(
      refunds
        .filter((rf) => rf.status !== 'Rejected' && rf.status !== 'Cancelled')
        .map((rf) => rf.originalTransactionId),
    )

    const refundProtectedReceipt = beforeReceipts.receipts.find(
      (r) => !r.isVoided && activeRefundTxIds.has(r.transactionId),
    )
    assert.ok(refundProtectedReceipt, 'Expected a receipt protected by an active refund')
    await assert.rejects(
      () =>
        accountingApi.voidTransaction(
          { userId: 'acc-stf-003', fullName: 'Trần Thu Hà', canApproveRefunds: true },
          refundProtectedReceipt.transactionId,
          'Thử hủy giao dịch đang hoàn tiền',
        ),
      (err: unknown) =>
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status: number }).status === 409,
    )

    const targetReceipt = beforeReceipts.receipts.find(
      (r) => !r.isVoided && !activeRefundTxIds.has(r.transactionId),
    )
    assert.ok(targetReceipt, 'Expected at least one active receipt without an active refund')

    await accountingApi.voidTransaction(
      { userId: 'acc-stf-003', fullName: 'Trần Thu Hà', canApproveRefunds: true },
      targetReceipt.transactionId,
      'Nhập nhầm mã giao dịch đối chiếu ngân hàng',
    )

    const afterReceipts = await accountingApi.listReceipts()
    const voidedReceipt = afterReceipts.receipts.find((r) => r.id === targetReceipt.id)
    assert.equal(voidedReceipt?.isVoided, true)
    assert.equal(voidedReceipt?.voidReason, 'Nhập nhầm mã giao dịch đối chiếu ngân hàng')
  })

  it('bridges Sales Registration Review -> Academic Placement Queue (Workflow 2)', async () => {
    await seedStaffTestWorkspace()

    const actor = { userId: 'acc-stf-004', fullName: 'Lê Hoàng Nam' }
    const initialWorkspace = await academicApi.getPlacementWorkspace()
    const submittedReg = initialWorkspace.pendingRegistrations.find(
      (r) => r.status === 'Submitted',
    )
    assert.ok(submittedReg, 'Expected a Submitted registration from Sales CRM')

    await assert.rejects(
      () =>
        academicApi.reviewSalesRegistration(actor, {
          registrationId: submittedReg.id,
          nextStatus: 'NeedAdditionalInfo',
          reviewerNote: '   ',
        }),
      /ghi chú/i,
    )

    await academicApi.reviewSalesRegistration(actor, {
      registrationId: submittedReg.id,
      nextStatus: 'Approved',
      reviewerNote: 'Hồ sơ hợp lệ, chuyển sang hàng đợi xếp lớp.',
    })

    const updatedWorkspace = await academicApi.getPlacementWorkspace()
    const promoted = updatedWorkspace.candidates.find(
      (c) => c.registrationId === submittedReg.id,
    )
    assert.ok(promoted)

    const placed = await academicApi.confirmMonthlyPlacement(actor, {
      candidateKey: promoted.candidateKey,
      targetClassId: 'sch-hd-01',
    })
    assert.match(placed.studentCode, /^HV-\d{4}-0002$/)
  })

  it('blocks cross-teacher grade overwrites (403) and enforces edit reasons on Teacher Gradebook', async () => {
    await seedStaffTestWorkspace()

    const store = readTeacherOpsStore()
    const existingGrade = store.grades[0]
    assert.ok(existingGrade, 'Expected seeded grade record')

    const intruderTeacher = {
      userId: 'acc-tea-intruder-999',
      employeeCode: 'GV-INTRUDER',
      fullName: 'Intruder Teacher',
      scope: 'assigned_classes_only' as const,
    }

    await assert.rejects(
      () =>
        teacherApi.upsertAssessmentGrade(intruderTeacher, {
          id: existingGrade.id,
          classId: existingGrade.classId,
          studentId: existingGrade.studentId,
          category: existingGrade.category,
          assessmentTitle: existingGrade.assessmentTitle,
          examDate: existingGrade.examDate,
          listeningScore: 300,
          readingScore: 300,
          maxListeningScore: existingGrade.maxListeningScore,
          maxReadingScore: existingGrade.maxReadingScore,
          changeReason: 'Thử ghi đè trái phép',
        }),
      (err: unknown) =>
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status: number }).status === 403,
    )

    const assignedTeacher = {
      userId: 'acc-stf-007',
      employeeCode: 'GV-TOEIC-01',
      fullName: 'Cô Lan Hương',
      scope: 'assigned_classes_only' as const,
    }

    await assert.rejects(
      () =>
        teacherApi.upsertAssessmentGrade(assignedTeacher, {
          id: existingGrade.id,
          classId: existingGrade.classId,
          studentId: existingGrade.studentId,
          category: existingGrade.category,
          assessmentTitle: existingGrade.assessmentTitle,
          examDate: existingGrade.examDate,
          listeningScore: 360,
          readingScore: 330,
          maxListeningScore: existingGrade.maxListeningScore,
          maxReadingScore: existingGrade.maxReadingScore,
          changeReason: '   ',
        }),
      /lý do/i,
    )
  })

  it('clones Test Online with 100% distinct IDs, preserves live published version via workingDraft, and strips answerKeys on public projection', async () => {
    await seedStaffTestWorkspace()

    const tests = await testAuthoringApi.listTests()
    const published = tests.find((t) => t.status === 'published')
    assert.ok(published, 'Expected a published TOEIC test')

    const cloned = await testAuthoringApi.cloneTest(published.id)
    assert.notEqual(cloned.id, published.id)
    assert.equal(cloned.status, 'draft')

    const sourceQuestionIds = new Set(
      published.parts.flatMap((p) => p.groups.flatMap((g) => g.questions.map((q) => q.id))),
    )
    const clonedQuestionIds = cloned.parts.flatMap((p) =>
      p.groups.flatMap((g) => g.questions.map((q) => q.id)),
    )
    assert.ok(clonedQuestionIds.length > 0)
    for (const qId of clonedQuestionIds) {
      assert.equal(sourceQuestionIds.has(qId), false, `Cloned question reused source ID ${qId}`)
      assert.ok(cloned.answerKeys[qId], `Missing remapped answerKey for ${qId}`)
    }

    const { saved, forkedNewVersion } = await testAuthoringApi.saveTestAuthoring({
      ...published,
      title: `${published.title} – Đang cập nhật v2`,
    })
    assert.equal(forkedNewVersion, true)
    assert.equal(saved.status, 'published')
    assert.ok(saved.workingDraft)
    assert.equal(saved.workingDraft.versionNumber, published.activeVersionNumber + 1)

    const publicPayload = projectPublicStudentTestPayload(saved)
    assert.equal('answerKeys' in publicPayload, false)
    assert.equal('versionHistory' in publicPayload, false)
    assert.equal('workingDraft' in publicPayload, false)
    assert.equal(typeof publicPayload.duration, 'number')
    assert.equal(typeof publicPayload.totalQuestions, 'number')
    assert.ok(Array.isArray(publicPayload.parts))
    assert.ok(publicPayload.parts.length > 0)
    const samplePart = publicPayload.parts[0]!
    assert.ok(Array.isArray(samplePart.questionGroups))
    assert.ok(Array.isArray(samplePart.instructions))
    assert.ok(Array.isArray(samplePart.importantNotes))
  })

  it('enforces public schedule isPublishedOnWeb filtering and auto-generates class sessions', async () => {
    await seedStaffTestWorkspace()

    const publicSchedules = await trainingApi.listPublicSchedules()
    assert.ok(publicSchedules.length > 0)
    for (const sch of publicSchedules) {
      assert.equal(sch.isPublished, true, `Unpublished schedule leaked: ${sch.classCode}`)
    }

    const createdClass = await academicApi.upsertClass({
      classCode: 'HD-SYNC-99',
      className: 'Foundation Sync Auto Sessions',
      courseId: 'foundation-toeic',
      branchId: 'cs-ha-dong',
      studyMode: 'Offline',
      startDate: '2027-03-01',
      endDate: '2027-05-30',
      studyDays: 'Thứ 2 - Thứ 4 - Thứ 6',
      startTime: '18:00',
      endTime: '20:00',
      roomLabel: 'Phòng P.405 – Hà Đông',
      maxStudents: 20,
      status: 'open',
      isPublishedOnWeb: true,
    })

    const generatedSessions = readTeacherOpsStore().sessions.filter(
      (s) => s.classId === createdClass.id,
    )
    assert.ok(
      generatedSessions.length >= 12,
      `Expected auto-generated sessions for new class, got ${generatedSessions.length}`,
    )
  })
})
