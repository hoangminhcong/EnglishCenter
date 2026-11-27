import {
  computeRemainingClassSeats,
  type AcademicRequestStatus,
  type AcademicRequestType,
  type AcademicStudentDto,
  type CenterClassOfferingDto,
  type CourseSyllabusSessionItemDto,
  type CourseSyllabusVersionDto,
  type PlacementContactLogDto,
  type StudentAcademicRequestDto,
  type StudentEnrollmentRecordDto,
  type StudentLearningStatus,
  type TeachingScheduleRequestDto,
} from '@english-center/contracts'
import {
  getTodayIsoInVietnam,
  isValidEmail,
  isValidVnPhone,
  shiftIsoYmd,
} from '@english-center/utils'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import {
  checkClassScheduleConflict,
  readSalesMockStore,
  writeSalesMockStore,
} from '@/features/sales/services/salesApi'
import {
  readCenterClassesStore,
  writeCenterClassesStore,
} from '@/features/training/api/trainingApi'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/mock/mockStorage'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
  readTeacherOpsStore,
  syncClassScheduleSessions,
  writeAcademicOpsStore,
  writeAccountingOpsStore,
  writeTeacherOpsStore,
} from '@/services/mock/operationsMockStore'

export { syncClassScheduleSessions }
import { createUniqueId, toVietnamYmd } from '@/shared/utils/staffFormatters'
import type {
  AcademicClassDetailBundle,
  AcademicDashboardData,
  AcademicStudentDetailBundle,
  EnrichedAcademicClassItem,
  PendingSalesRegistrationItem,
  PlacementQueueCandidate,
  SalesRegistrationReviewDecision,
  UpsertAcademicClassInput,
} from '@/features/academic/types/academic.types'

export interface AcademicActor {
  userId: string
  fullName: string
}

function daysBetweenYmd(startIsoOrYmd: string, endYmd: string): number {
  const startYmd = toVietnamYmd(startIsoOrYmd)
  const [sy = 2026, sm = 1, sd = 1] = startYmd.split('-').map(Number)
  const [ey = 2026, em = 1, ed = 1] = endYmd.slice(0, 10).split('-').map(Number)
  const sMs = Date.UTC(sy, sm - 1, sd)
  const eMs = Date.UTC(ey, em - 1, ed)
  return Math.max(0, Math.round((eMs - sMs) / 86_400_000))
}

function extractNormalizedWeekdays(studyDays: string): Set<number> {
  const lower = studyDays.toLowerCase()
  const days = new Set<number>()
  for (const m of lower.matchAll(/(?:thứ|thu|t)\s*([2-7])\b/g)) {
    days.add(Number(m[1]))
  }
  for (const m of lower.matchAll(/(?:^|[\s,\-/])([2-7])(?=$|[\s,\-/])/g)) {
    days.add(Number(m[1]))
  }
  if (/\bcn\b|chủ\s*nhật|chu\s*nhat/.test(lower)) {
    days.add(8)
  }
  return days
}

function parseMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function normalizeStudyDaysCanonical(studyDays: string): string {
  const days = extractNormalizedWeekdays(studyDays)
  if (days.size === 0) return studyDays
  return Array.from(days)
    .sort((a, b) => a - b)
    .map((d) => (d === 8 ? 'Chủ nhật' : `Thứ ${d}`))
    .join(' - ')
}

function findAcademicScheduleConflict(
  candidate: CenterClassOfferingDto,
  existingClasses: readonly CenterClassOfferingDto[],
): CenterClassOfferingDto | null {
  const normalizedCandidate: CenterClassOfferingDto = {
    ...candidate,
    studyDays: normalizeStudyDaysCanonical(candidate.studyDays),
  }
  const normalizedExisting = existingClasses.map((cls) => ({
    ...cls,
    studyDays: normalizeStudyDaysCanonical(cls.studyDays),
  }))

  const viaSalesHelper = checkClassScheduleConflict(normalizedCandidate, normalizedExisting)
  if (viaSalesHelper) {
    return existingClasses.find((c) => c.id === viaSalesHelper.id) ?? viaSalesHelper
  }

  const candDays = extractNormalizedWeekdays(candidate.studyDays)
  if (candDays.size === 0) return null
  const candStartMin = parseMinutes(candidate.startTime)
  const candEndMin = parseMinutes(candidate.endTime)

  for (const other of existingClasses) {
    if (other.id === candidate.id) continue
    if (other.status === 'completed' || other.status === 'cancelled') continue
    if (candidate.endDate && candidate.endDate < other.startDate) continue
    if (other.endDate && other.endDate < candidate.startDate) continue

    const otherDays = extractNormalizedWeekdays(other.studyDays)
    let sharesDay = false
    for (const d of candDays) {
      if (otherDays.has(d)) {
        sharesDay = true
        break
      }
    }
    if (!sharesDay) continue

    const otherStartMin = parseMinutes(other.startTime)
    const otherEndMin = parseMinutes(other.endTime)
    if (candStartMin < otherEndMin && otherStartMin < candEndMin) {
      return other
    }
  }

  return null
}

function resolveAccountDisplayName(
  accountMap: Map<string, string>,
  userId?: string,
  fallbackName?: string,
): string {
  if (userId && accountMap.has(userId)) {
    return accountMap.get(userId)!
  }
  return fallbackName?.trim() || 'Chuyên viên Tư vấn'
}

function buildPendingSalesRegistrations(params: {
  courseMap: Map<string, string>
  branchMap: Map<string, string>
  classMap: Map<string, CenterClassOfferingDto>
  accountNameMap: Map<string, string>
}): PendingSalesRegistrationItem[] {
  const salesStore = readSalesMockStore()
  const items: PendingSalesRegistrationItem[] = []

  for (const reg of salesStore.registrations) {
    if (
      reg.status !== 'Submitted' &&
      reg.status !== 'Reviewing' &&
      reg.status !== 'NeedAdditionalInfo'
    ) {
      continue
    }
    const lead = salesStore.leads.find((l) => l.id === reg.leadId)
    const prefClass = params.classMap.get(reg.classId)
    const ownerId = reg.saleId || lead?.assignedSaleId
    const saleOwnerName = resolveAccountDisplayName(params.accountNameMap, ownerId)
    const leadContextNote = [lead?.learningNeed, lead?.currentLevelNote]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' • ')

    items.push({
      id: reg.id,
      registrationCode: reg.registrationCode,
      status: reg.status,
      leadId: reg.leadId,
      leadFullName: lead?.fullName ?? `Khách hàng (${reg.registrationCode})`,
      leadPhone: lead?.phone ?? '—',
      leadEmail: lead?.email,
      saleOwnerId: ownerId,
      saleOwnerName,
      courseId: reg.courseId,
      courseName: params.courseMap.get(reg.courseId) ?? reg.snapshot.courseName,
      branchId: reg.branchId,
      branchName: params.branchMap.get(reg.branchId) ?? reg.snapshot.branchName,
      classId: reg.classId,
      classCode: prefClass?.classCode ?? reg.snapshot.classCode,
      classStartDate: prefClass?.startDate ?? reg.snapshot.classStartDate,
      classScheduleSummary: prefClass
        ? prefClass.endTime
          ? `${prefClass.studyDays} (${prefClass.startTime}–${prefClass.endTime})`
          : prefClass.studyDays
        : reg.snapshot.classScheduleSummary,
      entryScoreTotal: reg.scoreGoal.currentScore ?? 0,
      targetScoreTotal: reg.scoreGoal.targetScore,
      listedTuitionVnd: reg.snapshot.listedTuitionVnd,
      discountAmountVnd: reg.snapshot.discountAmountVnd,
      netEstimatedTuitionVnd: reg.estimatedTuition.netEstimatedTuitionVnd,
      tuitionPolicyId: reg.estimatedTuition.policyId,
      tuitionPolicyCode: reg.snapshot.policyCode ?? reg.estimatedTuition.policyCode,
      discountReason:
        reg.snapshot.discountProgramName ?? reg.estimatedTuition.discountProgramName,
      advisedOutcomeLabel: reg.commitment.advisedOutcomeLabel,
      commitmentConditionsText: reg.commitment.attendanceAndHomeworkConditions,
      consultationNote: leadContextNote || undefined,
      reviewerNote: reg.reviewerNote,
      submittedAt: reg.submittedAt ?? reg.createdAt,
      updatedAt: reg.updatedAt,
    })
  }

  return items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

function buildPlacementQueue(params: {
  todayYmdVn: string
  courseMap: Map<string, string>
  branchMap: Map<string, string>
  classMap: Map<string, CenterClassOfferingDto>
  accountNameMap: Map<string, string>
}): PlacementQueueCandidate[] {
  const academicStore = readAcademicOpsStore()
  const salesStore = readSalesMockStore()

  const contactLogByKey = new Map<string, PlacementContactLogDto>()
  for (const log of [...academicStore.placementContactLogs].sort((a, b) =>
    b.contactedAt.localeCompare(a.contactedAt),
  )) {
    if (!contactLogByKey.has(log.targetKey)) {
      contactLogByKey.set(log.targetKey, log)
    }
  }

  const candidates: PlacementQueueCandidate[] = []

  // 1. Hồ sơ đăng ký khóa học từ Sale đã được duyệt (Approved) chờ xếp lớp chính thức
  for (const reg of salesStore.registrations) {
    if (reg.status !== 'Approved') continue
    const lead = salesStore.leads.find((l) => l.id === reg.leadId)
    if (!lead) continue
    const prefClass = params.classMap.get(reg.classId)
    const expectedMonth =
      prefClass?.startDate.slice(0, 7) ??
      reg.snapshot.classStartDate.slice(0, 7) ??
      params.todayYmdVn.slice(0, 7)

    const ownerId = reg.saleId || lead.assignedSaleId
    const saleOwnerName = resolveAccountDisplayName(params.accountNameMap, ownerId)
    const combinedNotes = [reg.reviewerNote, lead.learningNeed]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' • ')

    candidates.push({
      candidateKey: reg.id,
      sourceType: 'approved_sales_registration',
      registrationId: reg.id,
      registrationCode: reg.registrationCode,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      courseId: reg.courseId,
      courseName: params.courseMap.get(reg.courseId) ?? reg.snapshot.courseName,
      branchId: reg.branchId,
      branchName: params.branchMap.get(reg.branchId) ?? reg.snapshot.branchName,
      preferredClassId: reg.classId,
      preferredClassCode: prefClass?.classCode ?? reg.snapshot.classCode,
      expectedMonth,
      waitingSinceIso: reg.submittedAt ?? reg.createdAt,
      waitingDays: daysBetweenYmd(reg.submittedAt ?? reg.createdAt, params.todayYmdVn),
      entryScoreTotal: reg.scoreGoal.currentScore ?? 0,
      targetScoreTotal: reg.scoreGoal.targetScore,
      agreedTuitionVnd: reg.estimatedTuition.netEstimatedTuitionVnd,
      commitmentLabel: reg.commitment.advisedOutcomeLabel,
      saleOwnerName,
      statusLabel: 'Hồ sơ Sale đã duyệt',
      notes: combinedNotes || undefined,
      latestContactLog: contactLogByKey.get(reg.id),
    })
  }

  // 2. Học viên nội bộ đang ở trạng thái waiting_placement (ví dụ quay lại sau bảo lưu hoặc mới tạo)
  for (const stu of academicStore.students) {
    if (stu.learningStatus !== 'waiting_placement') continue
    const courseId = stu.currentCourseId ?? 'foundation-toeic'
    candidates.push({
      candidateKey: stu.id,
      sourceType: 'waiting_student',
      studentId: stu.id,
      studentCode: stu.studentCode,
      fullName: stu.fullName,
      phone: stu.phone,
      email: stu.email,
      courseId,
      courseName: params.courseMap.get(courseId) ?? stu.currentCourseName ?? courseId,
      branchId: stu.branchId,
      branchName: params.branchMap.get(stu.branchId) ?? stu.branchName,
      expectedMonth: stu.expectedStartMonth ?? params.todayYmdVn.slice(0, 7),
      waitingSinceIso: stu.updatedAt,
      waitingDays: daysBetweenYmd(stu.updatedAt, params.todayYmdVn),
      entryScoreTotal: stu.entryScore.total,
      targetScoreTotal: stu.goalScore.total,
      agreedTuitionVnd: 0,
      commitmentLabel: stu.commitmentSummary?.advisedOutcomeLabel,
      saleOwnerName: undefined,
      statusLabel: 'HV nội bộ chờ xếp lớp',
      notes: stu.note,
      latestContactLog: contactLogByKey.get(stu.id),
    })
  }

  return candidates.sort((a, b) => b.waitingDays - a.waitingDays)
}

const REQUEST_ALLOWED_TRANSITIONS: Record<
  AcademicRequestStatus,
  readonly AcademicRequestStatus[]
> = {
  Pending: ['Reviewing', 'Approved', 'Rejected', 'Cancelled'],
  Reviewing: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Completed', 'Cancelled'],
  Rejected: [],
  Cancelled: [],
  Completed: [],
}

export const academicApi = {
  async getDashboardData(todayYmdVn = getTodayIsoInVietnam()): Promise<AcademicDashboardData> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AcademicDashboardData>(
        `${STAFF_API_ENDPOINTS.academic.dashboard}?today=${encodeURIComponent(todayYmdVn)}`,
      )
    }

    await mockDelay(120)
    const [courses, branches, accounts] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      accountsApi.listAccounts(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))
    const accountNameMap = new Map(
      accounts.map((a) => [
        a.id,
        a.staffProfile?.fullName ?? a.teacherProfile?.fullName ?? a.studentProfile?.fullName ?? a.email,
      ]),
    )

    const classes = readCenterClassesStore()
    const classMap = new Map(classes.map((c) => [c.id, c]))
    const academicStore = readAcademicOpsStore()
    const teacherStore = readTeacherOpsStore()

    const waitingPlacementItems = buildPlacementQueue({
      todayYmdVn,
      courseMap,
      branchMap,
      classMap,
      accountNameMap,
    })

    const pendingRegistrations = buildPendingSalesRegistrations({
      courseMap,
      branchMap,
      classMap,
      accountNameMap,
    })

    const activeClasses = classes.filter(
      (c) => c.status !== 'completed' && c.status !== 'cancelled',
    )
    const upcomingClasses = activeClasses
      .filter((c) => c.startDate >= todayYmdVn)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((c) => ({
        ...c,
        courseName: courseMap.get(c.courseId) ?? c.courseId,
        branchName: branchMap.get(c.branchId) ?? c.branchId,
      }))

    const nearCapacityClasses = activeClasses
      .map((c) => {
        const rem = computeRemainingClassSeats(c)
        return {
          ...c,
          courseName: courseMap.get(c.courseId) ?? c.courseId,
          branchName: branchMap.get(c.branchId) ?? c.branchId,
          remainingSeats: rem ?? 999,
        }
      })
      .filter((c) => c.remainingSeats <= 6)
      .sort((a, b) => a.remainingSeats - b.remainingSeats)

    const pendingRequests = academicStore.academicRequests.filter(
      (r) => r.status === 'Pending' || r.status === 'Reviewing',
    )
    const pendingTeachingRequestsCount = teacherStore.teachingRequests.filter(
      (r) => r.status === 'Requested' || r.status === 'UnderReview',
    ).length
    const completedStudentsCount = academicStore.students.filter(
      (s) => s.learningStatus === 'completed',
    ).length
    const droppedStudentsCount = academicStore.students.filter(
      (s) => s.learningStatus === 'dropped',
    ).length

    const recentActivities = [
      ...academicStore.transferHistory.map((t) => ({
        id: `act-trf-${t.id}`,
        occurredAt: t.transferredAt,
        actorName: t.transferredByName,
        summary: `Chuyển lớp học viên ${t.studentName} (${t.fromClassCode} -> ${t.toClassCode})`,
      })),
      ...academicStore.placementContactLogs.map((l) => ({
        id: `act-pcl-${l.id}`,
        occurredAt: l.contactedAt,
        actorName: l.contactedByName,
        summary: `Liên hệ xếp lớp ${l.studentOrLeadName}: ${l.resultSummary}`,
      })),
      ...academicStore.academicRequests.map((r) => ({
        id: `act-req-${r.id}`,
        occurredAt: r.reviewedAt ?? r.submittedAt,
        actorName: r.reviewedByName ?? r.studentName,
        summary: `Đơn ${r.requestCode} (${r.studentName}) – Trạng thái: ${r.status}`,
      })),
    ]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 6)

    return {
      kpis: {
        totalStudentsCount: academicStore.students.length,
        studyingStudentsCount: academicStore.students.filter((s) => s.learningStatus === 'studying')
          .length,
        activeClassesCount: activeClasses.length,
        totalClassesCount: classes.length,
        waitingPlacementCount: waitingPlacementItems.length,
        holdStudentsCount: academicStore.students.filter((s) => s.learningStatus === 'hold').length,
        completedStudentsCount,
        droppedStudentsCount,
        droppedOrCompletedCount: completedStudentsCount + droppedStudentsCount,
        pendingRequestsCount: pendingRequests.length + pendingTeachingRequestsCount,
        pendingSalesRegistrationsCount: pendingRegistrations.length,
        upcomingClassesCount: upcomingClasses.length,
      },
      waitingPlacementItems: waitingPlacementItems.slice(0, 6),
      upcomingClasses: upcomingClasses.slice(0, 6),
      nearCapacityClasses: nearCapacityClasses.slice(0, 6),
      pendingRequests,
      pendingTeachingRequestsCount,
      pendingSalesRegistrationsCount: pendingRegistrations.length,
      recentActivities,
    }
  },

  async listStudents(): Promise<AcademicStudentDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AcademicStudentDto[]>(STAFF_API_ENDPOINTS.academic.students)
    }

    await mockDelay(90)
    const store = readAcademicOpsStore()
    return [...store.students].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getStudentDetail(studentId: string): Promise<AcademicStudentDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AcademicStudentDetailBundle>(
        STAFF_API_ENDPOINTS.academic.studentDetail(studentId),
      )
    }

    await mockDelay(90)
    const store = readAcademicOpsStore()
    const teacherStore = readTeacherOpsStore()
    const student = store.students.find((s) => s.id === studentId)
    if (!student) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ học viên.', 404)
    }

    return {
      student,
      enrollments: store.enrollments
        .filter((e) => e.studentId === studentId)
        .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)),
      transferHistory: store.transferHistory
        .filter((t) => t.studentId === studentId)
        .sort((a, b) => b.transferredAt.localeCompare(a.transferredAt)),
      academicRequests: store.academicRequests
        .filter((r) => r.studentId === studentId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      gradesReadOnly: teacherStore.grades.filter((g) => g.studentId === studentId),
    }
  },

  async createOrUpdateStudent(input: {
    id?: string
    fullName: string
    phone: string
    email?: string
    dateOfBirth?: string
    schoolOrWork?: string
    branchId: string
    currentCourseId?: string
    entryLc: number
    entryRc: number
    goalLc: number
    goalRc: number
    expectedStartMonth?: string
    note?: string
  }): Promise<AcademicStudentDto> {
    const cleanPhone = input.phone.replace(/\s+/g, '')
    const cleanEmail = input.email?.trim().toLowerCase()
    if (!input.fullName.trim()) {
      throw new StaffApiClientError('Vui lòng nhập họ và tên học viên.', 400)
    }
    if (!isValidVnPhone(cleanPhone)) {
      throw new StaffApiClientError('Số điện thoại học viên không hợp lệ (10 chữ số VN).', 400)
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      throw new StaffApiClientError('Địa chỉ email học viên không hợp lệ.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<AcademicStudentDto>(
          STAFF_API_ENDPOINTS.academic.studentDetail(input.id),
          input,
        )
      }
      return staffHttpClient.post<AcademicStudentDto>(STAFF_API_ENDPOINTS.academic.students, input)
    }

    await mockDelay()
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const branch = branches.find((b) => b.id === input.branchId)
    if (!branch) {
      throw new StaffApiClientError('Cơ sở quản lý học viên không hợp lệ.', 400)
    }
    const course = input.currentCourseId
      ? courses.find((c) => c.id === input.currentCourseId)
      : undefined

    const store = readAcademicOpsStore()
    const dupPhone = store.students.find(
      (s) => s.phone.replace(/\s+/g, '') === cleanPhone && s.id !== input.id,
    )
    if (dupPhone) {
      throw new StaffApiClientError(
        `Số điện thoại này đã gắn với học viên ${dupPhone.fullName} (${dupPhone.studentCode}).`,
        409,
      )
    }

    if (cleanEmail) {
      const dupEmail = store.students.find(
        (s) => s.email?.trim().toLowerCase() === cleanEmail && s.id !== input.id,
      )
      if (dupEmail) {
        throw new StaffApiClientError(
          `Địa chỉ email này đã gắn với học viên ${dupEmail.fullName} (${dupEmail.studentCode}).`,
          409,
        )
      }
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = store.students.findIndex((s) => s.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy học viên.', 404)
      const prev = store.students[idx]!
      const updated: AcademicStudentDto = {
        ...prev,
        fullName: input.fullName.trim(),
        phone: cleanPhone,
        email: input.email?.trim() || undefined,
        dateOfBirth: input.dateOfBirth || undefined,
        schoolOrWork: input.schoolOrWork?.trim() || undefined,
        branchId: branch.id,
        branchName: branch.name,
        currentCourseId: course?.id ?? prev.currentCourseId,
        currentCourseName: course?.name ?? prev.currentCourseName,
        entryScore: {
          lc: input.entryLc,
          rc: input.entryRc,
          total: input.entryLc + input.entryRc,
        },
        goalScore: {
          lc: input.goalLc,
          rc: input.goalRc,
          total: input.goalLc + input.goalRc,
        },
        expectedStartMonth: input.expectedStartMonth || prev.expectedStartMonth,
        note: input.note?.trim() || undefined,
        updatedAt: nowIso,
      }
      const nextStudents = [...store.students]
      nextStudents[idx] = updated
      writeAcademicOpsStore({ ...store, students: nextStudents })
      return updated
    }

    const seq = String(store.students.length + 1).padStart(4, '0')
    const created: AcademicStudentDto = {
      id: createUniqueId('stu'),
      studentCode: `HV-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      fullName: input.fullName.trim(),
      phone: cleanPhone,
      email: input.email?.trim() || undefined,
      dateOfBirth: input.dateOfBirth || undefined,
      schoolOrWork: input.schoolOrWork?.trim() || undefined,
      branchId: branch.id,
      branchName: branch.name,
      currentCourseId: course?.id,
      currentCourseName: course?.name,
      entryScore: {
        lc: input.entryLc,
        rc: input.entryRc,
        total: input.entryLc + input.entryRc,
      },
      goalScore: {
        lc: input.goalLc,
        rc: input.goalRc,
        total: input.goalLc + input.goalRc,
      },
      learningStatus: 'waiting_placement',
      expectedStartMonth: input.expectedStartMonth || getTodayIsoInVietnam().slice(0, 7),
      note: input.note?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    writeAcademicOpsStore({
      ...store,
      students: [created, ...store.students],
    })
    return created
  },

  async updateStudentLearningStatus(
    actor: AcademicActor,
    input: {
      studentId: string
      nextStatus: Extract<StudentLearningStatus, 'completed' | 'dropped'>
      note?: string
    },
  ): Promise<AcademicStudentDto> {
    if (input.nextStatus === 'dropped' && !input.note?.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do thôi học để lưu vết hồ sơ học vụ.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<AcademicStudentDto>(
        STAFF_API_ENDPOINTS.academic.studentStatus(input.studentId),
        { ...input, actorUserId: actor.userId },
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const stuIdx = store.students.findIndex((s) => s.id === input.studentId)
    if (stuIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy học viên.', 404)
    }
    const prevStudent = store.students[stuIdx]!
    if (prevStudent.learningStatus === input.nextStatus) {
      throw new StaffApiClientError('Học viên đã ở trạng thái học tập này.', 400)
    }

    const nowIso = new Date().toISOString()
    const classes = readCenterClassesStore()
    let classesChanged = false
    const nextClasses = [...classes]

    const nextEnrollments = store.enrollments.map((enr) => {
      if (
        enr.studentId === prevStudent.id &&
        (enr.status === 'active' || enr.status === 'hold')
      ) {
        if (enr.status === 'active') {
          const clsIdx = nextClasses.findIndex((c) => c.id === enr.classId)
          if (clsIdx >= 0) {
            const cls = nextClasses[clsIdx]!
            const nextCount = Math.max(0, (cls.enrolledStudents ?? 1) - 1)
            nextClasses[clsIdx] = {
              ...cls,
              enrolledStudents: nextCount,
              status:
                cls.status === 'full' &&
                (typeof cls.maxStudents !== 'number' || nextCount < cls.maxStudents)
                  ? 'open'
                  : cls.status,
            }
            classesChanged = true
          }
        }
        return {
          ...enr,
          status: input.nextStatus === 'completed' ? ('completed' as const) : ('dropped' as const),
          endedAt: nowIso,
          note: input.note?.trim()
            ? `${enr.note ? `${enr.note} | ` : ''}${input.note.trim()} (${actor.fullName})`
            : enr.note,
        }
      }
      return enr
    })

    if (classesChanged) {
      writeCenterClassesStore(nextClasses)
    }

    const updatedStudent: AcademicStudentDto = {
      ...prevStudent,
      learningStatus: input.nextStatus,
      currentClassId: input.nextStatus === 'dropped' ? undefined : prevStudent.currentClassId,
      currentClassCode: input.nextStatus === 'dropped' ? undefined : prevStudent.currentClassCode,
      note: input.note?.trim() || prevStudent.note,
      updatedAt: nowIso,
    }

    const nextStudents = [...store.students]
    nextStudents[stuIdx] = updatedStudent
    writeAcademicOpsStore({
      ...store,
      students: nextStudents,
      enrollments: nextEnrollments,
    })

    return updatedStudent
  },

  async listClasses(): Promise<EnrichedAcademicClassItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<EnrichedAcademicClassItem[]>(STAFF_API_ENDPOINTS.academic.classes)
    }

    await mockDelay(90)
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))
    const classes = readCenterClassesStore()

    return classes.map((c) => ({
      ...c,
      courseName: courseMap.get(c.courseId) ?? c.courseId,
      branchName: branchMap.get(c.branchId) ?? c.branchId,
      remainingSeats: computeRemainingClassSeats(c),
    }))
  },

  async getClassDetail(classId: string): Promise<AcademicClassDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AcademicClassDetailBundle>(
        STAFF_API_ENDPOINTS.academic.classDetail(classId),
      )
    }

    const allClasses = await this.listClasses()
    const classInfo = allClasses.find((c) => c.id === classId)
    if (!classInfo) {
      throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    }

    const academicStore = readAcademicOpsStore()
    const teacherStore = readTeacherOpsStore()
    const studentMap = new Map(academicStore.students.map((s) => [s.id, s]))

    const roster = academicStore.enrollments
      .filter((e) => e.classId === classId && e.status !== 'transferred')
      .map((enrollment) => ({
        enrollment,
        student: studentMap.get(enrollment.studentId),
      }))
      .filter(
        (item): item is { enrollment: StudentEnrollmentRecordDto; student: AcademicStudentDto } =>
          Boolean(item.student),
      )

    return {
      classInfo,
      roster,
      transferHistory: academicStore.transferHistory.filter(
        (t) => t.fromClassId === classId || t.toClassId === classId,
      ),
      teachingRequests: teacherStore.teachingRequests.filter((r) => r.classId === classId),
    }
  },

  async upsertClass(input: UpsertAcademicClassInput): Promise<CenterClassOfferingDto> {
    const normalizedCode = input.classCode.trim().toUpperCase()
    if (!normalizedCode || !input.className.trim()) {
      throw new StaffApiClientError('Vui lòng nhập Mã lớp và Tên lớp học.', 400)
    }
    if (!Number.isFinite(input.maxStudents) || input.maxStudents < 1) {
      throw new StaffApiClientError('Sĩ số tối đa phải từ 1 học viên trở lên.', 400)
    }
    if (input.endDate && input.endDate < input.startDate) {
      throw new StaffApiClientError('Ngày kết thúc lớp không được nhỏ hơn ngày khai giảng.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<CenterClassOfferingDto>(
          STAFF_API_ENDPOINTS.academic.classDetail(input.id),
          input,
        )
      }
      return staffHttpClient.post<CenterClassOfferingDto>(
        STAFF_API_ENDPOINTS.academic.classes,
        input,
      )
    }

    await mockDelay()
    const [courses, branches, accounts] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      accountsApi.listAccounts(),
    ])

    const course = courses.find((c) => c.id === input.courseId)
    if (!course) throw new StaffApiClientError('Khóa học đã chọn không hợp lệ.', 400)

    const branch = branches.find((b) => b.id === input.branchId)
    if (!branch) throw new StaffApiClientError('Cơ sở đào tạo không hợp lệ.', 400)

    const classes = readCenterClassesStore()
    const dupCode = classes.find(
      (c) => c.classCode.toUpperCase() === normalizedCode && c.id !== input.id,
    )
    if (dupCode) {
      throw new StaffApiClientError(`Mã lớp "${normalizedCode}" đã tồn tại trên hệ thống.`, 409)
    }

    let resolvedTeacherName: string | undefined
    if (input.teacherId && input.status !== 'cancelled') {
      const teacherAcc = accounts.find(
        (a) =>
          a.id === input.teacherId &&
          (a.category === 'TEACHER' || a.roles.includes('TEACHER')) &&
          a.status === 'active',
      )
      if (!teacherAcc) {
        throw new StaffApiClientError('Giảng viên được chọn không hợp lệ hoặc đang tạm khóa.', 400)
      }
      resolvedTeacherName = teacherAcc.teacherProfile?.fullName ?? teacherAcc.email

      const teacherActiveClasses = classes.filter(
        (c) =>
          c.id !== input.id &&
          c.teacherId === input.teacherId &&
          c.status !== 'completed' &&
          c.status !== 'cancelled',
      )
      const candidateDraft: CenterClassOfferingDto = {
        id: input.id ?? 'draft-check',
        classCode: normalizedCode,
        className: input.className.trim(),
        courseId: input.courseId,
        branchId: input.branchId,
        studyMode: input.studyMode,
        startDate: input.startDate,
        endDate: input.endDate || undefined,
        studyDays: input.studyDays.trim(),
        startTime: input.startTime,
        endTime: input.endTime,
        maxStudents: input.maxStudents,
        enrolledStudents: 0,
        status: input.status,
        isPublishedOnWeb: input.isPublishedOnWeb,
      }
      const conflict = findAcademicScheduleConflict(candidateDraft, teacherActiveClasses)
      if (conflict) {
        throw new StaffApiClientError(
          `Giảng viên ${resolvedTeacherName} bị trùng lịch dạy với lớp ${conflict.classCode} (${conflict.studyDays}, ${conflict.startTime}–${conflict.endTime}).`,
          409,
        )
      }
    }

    if (input.id) {
      const idx = classes.findIndex((c) => c.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
      const prev = classes[idx]!
      const curEnrolled = prev.enrolledStudents ?? 0

      if (input.status === 'cancelled') {
        const academicStore = readAcademicOpsStore()
        const activeEnrCount = academicStore.enrollments.filter(
          (e) => e.classId === prev.id && (e.status === 'active' || e.status === 'hold'),
        ).length
        if (curEnrolled > 0 || activeEnrCount > 0) {
          throw new StaffApiClientError(
            `Không thể hủy lớp ${prev.classCode} khi đang có học viên ghi danh (${Math.max(curEnrolled, activeEnrCount)} HV). Vui lòng chuyển lớp cho toàn bộ học viên trước khi hủy lớp.`,
            409,
          )
        }
      }

      if (input.maxStudents < curEnrolled) {
        throw new StaffApiClientError(
          `Sĩ số tối đa (${input.maxStudents}) không được nhỏ hơn số học viên đang ghi danh (${curEnrolled}).`,
          400,
        )
      }
      const updated: CenterClassOfferingDto = {
        ...prev,
        classCode: normalizedCode,
        className: input.className.trim(),
        courseId: input.courseId,
        branchId: input.branchId,
        studyMode: input.studyMode,
        startDate: input.startDate,
        startDateDisplay:
          input.startDate !== prev.startDate ? undefined : prev.startDateDisplay,
        endDate: input.endDate || undefined,
        studyDays: input.studyDays.trim(),
        startTime: input.startTime,
        endTime: input.endTime,
        teacherId: input.teacherId || undefined,
        teacherName: input.teacherId ? (resolvedTeacherName ?? prev.teacherName) : undefined,
        roomLabel: input.roomLabel?.trim() || undefined,
        maxStudents: input.maxStudents,
        enrolledStudents: curEnrolled,
        status: input.status,
        isPublishedOnWeb: input.isPublishedOnWeb,
      }
      const next = [...classes]
      next[idx] = updated
      writeCenterClassesStore(next)

      const academicStoreForSessions = readAcademicOpsStore()
      const teacherStoreForSessions = readTeacherOpsStore()
      const nextSessions = syncClassScheduleSessions(
        updated,
        academicStoreForSessions.courseSyllabi,
        teacherStoreForSessions.sessions,
        {
          courseName: course.name,
          branchName: branch.name,
          totalSessions: course.sessionsCount,
        },
      )
      writeTeacherOpsStore({
        ...teacherStoreForSessions,
        sessions: nextSessions,
      })

      return updated
    }

    const created: CenterClassOfferingDto = {
      id: createUniqueId('cls'),
      classCode: normalizedCode,
      className: input.className.trim(),
      courseId: input.courseId,
      branchId: input.branchId,
      studyMode: input.studyMode,
      startDate: input.startDate,
      endDate: input.endDate || undefined,
      studyDays: input.studyDays.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      teacherId: input.teacherId || undefined,
      teacherName: resolvedTeacherName,
      roomLabel: input.roomLabel?.trim() || undefined,
      maxStudents: input.maxStudents,
      enrolledStudents: 0,
      status: input.status,
      isPublishedOnWeb: input.isPublishedOnWeb,
    }
    writeCenterClassesStore([created, ...classes])

    if (created.status !== 'cancelled') {
      const academicStoreForSessions = readAcademicOpsStore()
      const teacherStoreForSessions = readTeacherOpsStore()
      const nextSessions = syncClassScheduleSessions(
        created,
        academicStoreForSessions.courseSyllabi,
        teacherStoreForSessions.sessions,
        {
          courseName: course.name,
          branchName: branch.name,
          totalSessions: course.sessionsCount,
        },
      )
      writeTeacherOpsStore({
        ...teacherStoreForSessions,
        sessions: nextSessions,
      })
    }

    return created
  },

  async enrollStudentIntoClass(input: {
    classId: string
    studentId: string
    agreedTuitionVnd?: number
    sourceRegistrationCode?: string
    listedTuitionSnapshotVnd?: number
    discountSnapshotVnd?: number
    tuitionPolicyIdSnapshot?: string
    tuitionPolicyCodeSnapshot?: string
    billingExemptionReason?: 'transfer' | 'retake' | 'return_from_hold'
    note?: string
  }): Promise<StudentEnrollmentRecordDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<StudentEnrollmentRecordDto>(
        STAFF_API_ENDPOINTS.academic.classEnroll(input.classId),
        input,
      )
    }

    await mockDelay()
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const classes = readCenterClassesStore()
    const clsIdx = classes.findIndex((c) => c.id === input.classId)
    if (clsIdx === -1) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)

    const cls = classes[clsIdx]!
    if (cls.status === 'completed' || cls.status === 'cancelled') {
      throw new StaffApiClientError('Không thể thêm học viên vào lớp đã kết thúc hoặc đã hủy.', 400)
    }

    const rem = computeRemainingClassSeats(cls)
    if (rem !== null && rem <= 0) {
      throw new StaffApiClientError(
        `Lớp ${cls.classCode} đã đủ sĩ số tối đa (${cls.enrolledStudents}/${cls.maxStudents}).`,
        400,
      )
    }

    const academicStore = readAcademicOpsStore()
    const stuIdx = academicStore.students.findIndex((s) => s.id === input.studentId)
    if (stuIdx === -1) throw new StaffApiClientError('Không tìm thấy học viên.', 404)
    const prevStudent = academicStore.students[stuIdx]!

    if (
      prevStudent.currentCourseId &&
      (prevStudent.learningStatus === 'waiting_placement' ||
        prevStudent.learningStatus === 'hold') &&
      prevStudent.currentCourseId !== cls.courseId &&
      !input.sourceRegistrationCode
    ) {
      throw new StaffApiClientError(
        `Khóa học đăng ký của học viên (${prevStudent.currentCourseName ?? prevStudent.currentCourseId}) không tương thích với khóa học của lớp ${cls.classCode}.`,
        400,
      )
    }

    const dupActive = academicStore.enrollments.find(
      (e) =>
        e.studentId === input.studentId &&
        e.classId === cls.id &&
        (e.status === 'active' || e.status === 'hold'),
    )
    if (dupActive) {
      throw new StaffApiClientError(
        `Học viên này đã có bản ghi ghi danh hiệu lực (${dupActive.enrollmentCode}) trong lớp ${cls.classCode}.`,
        409,
      )
    }

    const studentActiveClasses = academicStore.enrollments
      .filter((e) => e.studentId === input.studentId && e.status === 'active')
      .map((e) => classes.find((c) => c.id === e.classId))
      .filter((c): c is CenterClassOfferingDto => Boolean(c))

    const conflict = findAcademicScheduleConflict(cls, studentActiveClasses)
    if (conflict) {
      throw new StaffApiClientError(
        `Học viên bị trùng lịch học với lớp đang theo học ${conflict.classCode} (${conflict.studyDays}, ${conflict.startTime}–${conflict.endTime}).`,
        409,
      )
    }

    const course = courses.find((c) => c.id === cls.courseId)
    const branch = branches.find((b) => b.id === cls.branchId)
    const nowIso = new Date().toISOString()
    const seq = String(academicStore.enrollments.length + 1).padStart(4, '0')

    const createdEnrollment: StudentEnrollmentRecordDto = {
      id: createUniqueId('enr'),
      enrollmentCode: `ENR-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      studentId: input.studentId,
      courseId: cls.courseId,
      courseName: course?.name ?? cls.courseId,
      classId: cls.id,
      classCode: cls.classCode,
      branchId: cls.branchId,
      branchName: branch?.name ?? cls.branchId,
      status: 'active',
      agreedTuitionVnd: input.agreedTuitionVnd ?? course?.listedTuitionVnd ?? 3_000_000,
      sourceRegistrationCode: input.sourceRegistrationCode,
      listedTuitionSnapshotVnd: input.listedTuitionSnapshotVnd,
      discountSnapshotVnd: input.discountSnapshotVnd,
      tuitionPolicyIdSnapshot: input.tuitionPolicyIdSnapshot,
      tuitionPolicyCodeSnapshot: input.tuitionPolicyCodeSnapshot,
      billingExemptionReason: input.billingExemptionReason,
      enrolledAt: nowIso,
      note: input.note?.trim() || undefined,
    }

    const nextEnrolled = (cls.enrolledStudents ?? 0) + 1
    const nextClassStatus =
      typeof cls.maxStudents === 'number' && nextEnrolled >= cls.maxStudents && cls.status === 'open'
        ? 'full'
        : cls.status

    const nextClasses = [...classes]
    nextClasses[clsIdx] = {
      ...cls,
      enrolledStudents: nextEnrolled,
      status: nextClassStatus,
    }
    writeCenterClassesStore(nextClasses)

    const nextStudents = [...academicStore.students]
    nextStudents[stuIdx] = {
      ...prevStudent,
      currentCourseId: cls.courseId,
      currentCourseName: course?.name ?? cls.courseId,
      currentClassId: cls.id,
      currentClassCode: cls.classCode,
      branchId: cls.branchId,
      branchName: branch?.name ?? prevStudent.branchName,
      learningStatus: 'studying',
      updatedAt: nowIso,
    }

    writeAcademicOpsStore({
      ...academicStore,
      students: nextStudents,
      enrollments: [createdEnrollment, ...academicStore.enrollments],
    })

    return createdEnrollment
  },

  /**
   * Chuyển lớp cho học viên: bảo toàn 100% lịch sử Enrollment lớp cũ ('transferred'),
   * tạo Enrollment lớp mới ('active', billingExemptionReason: 'transfer'), đồng bộ classId/classCode trên Receivable mở.
   */
  async transferStudentClass(
    actor: AcademicActor,
    input: {
      studentId: string
      fromClassId: string
      toClassId: string
      reason: string
    },
  ): Promise<void> {
    if (!input.reason.trim()) {
      throw new StaffApiClientError('Bắt buộc nhập lý do chuyển lớp để lưu lịch sử học tập.', 400)
    }
    if (input.fromClassId === input.toClassId) {
      throw new StaffApiClientError('Lớp chuyển đến phải khác lớp hiện tại.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      await staffHttpClient.post<void>(STAFF_API_ENDPOINTS.academic.classTransfer, input)
      return
    }

    await mockDelay()
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const classes = readCenterClassesStore()
    const fromIdx = classes.findIndex((c) => c.id === input.fromClassId)
    const toIdx = classes.findIndex((c) => c.id === input.toClassId)
    if (fromIdx === -1 || toIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy lớp nguồn hoặc lớp đích.', 404)
    }

    const fromCls = classes[fromIdx]!
    const toCls = classes[toIdx]!

    if (toCls.courseId !== fromCls.courseId) {
      throw new StaffApiClientError(
        `Không thể chuyển lớp khác khóa học (${fromCls.classCode} và ${toCls.classCode} không cùng chương trình đào tạo).`,
        400,
      )
    }
    if (toCls.status === 'completed' || toCls.status === 'cancelled') {
      throw new StaffApiClientError('Lớp chuyển đến đã kết thúc hoặc đã hủy.', 400)
    }
    const remSeats = computeRemainingClassSeats(toCls)
    if (remSeats !== null && remSeats <= 0) {
      throw new StaffApiClientError(
        `Lớp đích ${toCls.classCode} đã đầy (${toCls.enrolledStudents}/${toCls.maxStudents}).`,
        400,
      )
    }

    const academicStore = readAcademicOpsStore()
    const stuIdx = academicStore.students.findIndex((s) => s.id === input.studentId)
    if (stuIdx === -1) throw new StaffApiClientError('Không tìm thấy học viên.', 404)
    const student = academicStore.students[stuIdx]!

    const oldEnrIdx = academicStore.enrollments.findIndex(
      (e) =>
        e.studentId === input.studentId &&
        e.classId === input.fromClassId &&
        (e.status === 'active' || e.status === 'hold'),
    )
    if (oldEnrIdx === -1) {
      throw new StaffApiClientError(
        'Không tìm thấy bản ghi ghi danh hiệu lực của học viên ở lớp nguồn.',
        404,
      )
    }

    const otherActiveClasses = academicStore.enrollments
      .filter(
        (e) =>
          e.studentId === input.studentId &&
          e.classId !== input.fromClassId &&
          e.status === 'active',
      )
      .map((e) => classes.find((c) => c.id === e.classId))
      .filter((c): c is CenterClassOfferingDto => Boolean(c))

    const conflict = findAcademicScheduleConflict(toCls, otherActiveClasses)
    if (conflict) {
      throw new StaffApiClientError(
        `Lớp đích ${toCls.classCode} bị trùng lịch học với lớp ${conflict.classCode} của học viên.`,
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const oldEnr = academicStore.enrollments[oldEnrIdx]!
    const nextEnrollments = [...academicStore.enrollments]
    nextEnrollments[oldEnrIdx] = {
      ...oldEnr,
      status: 'transferred',
      endedAt: nowIso,
      note: `Đã chuyển sang lớp ${toCls.classCode}: ${input.reason.trim()}`,
    }

    const targetCourse = courses.find((c) => c.id === toCls.courseId)
    const targetBranch = branches.find((b) => b.id === toCls.branchId)
    const seq = String(academicStore.enrollments.length + 1).padStart(4, '0')
    const newEnrollment: StudentEnrollmentRecordDto = {
      id: createUniqueId('enr'),
      enrollmentCode: `ENR-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      studentId: student.id,
      courseId: toCls.courseId,
      courseName: targetCourse?.name ?? toCls.courseId,
      classId: toCls.id,
      classCode: toCls.classCode,
      branchId: toCls.branchId,
      branchName: targetBranch?.name ?? toCls.branchId,
      status: 'active',
      agreedTuitionVnd: oldEnr.agreedTuitionVnd,
      sourceRegistrationCode: oldEnr.sourceRegistrationCode,
      listedTuitionSnapshotVnd: oldEnr.listedTuitionSnapshotVnd,
      discountSnapshotVnd: oldEnr.discountSnapshotVnd,
      tuitionPolicyIdSnapshot: oldEnr.tuitionPolicyIdSnapshot,
      tuitionPolicyCodeSnapshot: oldEnr.tuitionPolicyCodeSnapshot,
      billingExemptionReason: 'transfer',
      enrolledAt: nowIso,
      note: `Chuyển từ lớp ${fromCls.classCode} sang (${input.reason.trim()})`,
    }

    const nextClasses = [...classes]
    const fromCount =
      oldEnr.status === 'active'
        ? Math.max(0, (fromCls.enrolledStudents ?? 1) - 1)
        : (fromCls.enrolledStudents ?? 0)
    nextClasses[fromIdx] = {
      ...fromCls,
      enrolledStudents: fromCount,
      status:
        fromCls.status === 'full' &&
        (typeof fromCls.maxStudents !== 'number' || fromCount < fromCls.maxStudents)
          ? 'open'
          : fromCls.status,
    }
    const toCount = (toCls.enrolledStudents ?? 0) + 1
    nextClasses[toIdx] = {
      ...toCls,
      enrolledStudents: toCount,
      status:
        typeof toCls.maxStudents === 'number' && toCount >= toCls.maxStudents && toCls.status === 'open'
          ? 'full'
          : toCls.status,
    }
    writeCenterClassesStore(nextClasses)

    // Đồng bộ mã lớp trên Khoản phải thu đang mở của bản ghi Enrollment cũ để Kế toán theo dõi đúng lớp hiện tại
    const accountingStore = readAccountingOpsStore()
    let receivablesUpdated = false
    const nextReceivables = accountingStore.receivables.map((rcv) => {
      if (
        !rcv.isCancelled &&
        (rcv.enrollmentId === oldEnr.id ||
          (rcv.studentId === student.id && rcv.classId === fromCls.id))
      ) {
        receivablesUpdated = true
        return {
          ...rcv,
          classId: toCls.id,
          classCode: toCls.classCode,
          branchId: toCls.branchId,
          branchName: targetBranch?.name ?? rcv.branchName,
          updatedAt: nowIso,
        }
      }
      return rcv
    })
    if (receivablesUpdated) {
      writeAccountingOpsStore({
        ...accountingStore,
        receivables: nextReceivables,
      })
    }

    const nextStudents = [...academicStore.students]
    nextStudents[stuIdx] = {
      ...student,
      currentCourseId: toCls.courseId,
      currentCourseName: targetCourse?.name ?? toCls.courseId,
      currentClassId: toCls.id,
      currentClassCode: toCls.classCode,
      branchId: toCls.branchId,
      branchName: targetBranch?.name ?? student.branchName,
      learningStatus: 'studying',
      updatedAt: nowIso,
    }

    writeAcademicOpsStore({
      ...academicStore,
      students: nextStudents,
      enrollments: [newEnrollment, ...nextEnrollments],
      transferHistory: [
        {
          id: createUniqueId('trf'),
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.studentCode,
          fromClassId: fromCls.id,
          fromClassCode: fromCls.classCode,
          toClassId: toCls.id,
          toClassCode: toCls.classCode,
          courseId: toCls.courseId,
          reason: input.reason.trim(),
          transferredByUserId: actor.userId,
          transferredByName: actor.fullName,
          transferredAt: nowIso,
        },
        ...academicStore.transferHistory,
      ],
    })
  },

  async listAllTeachingRequests(): Promise<TeachingScheduleRequestDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<TeachingScheduleRequestDto[]>(
        STAFF_API_ENDPOINTS.academic.teachingRequests,
      )
    }

    await mockDelay(80)
    const teacherStore = readTeacherOpsStore()
    return [...teacherStore.teachingRequests].sort((a, b) =>
      b.requestedAt.localeCompare(a.requestedAt),
    )
  },

  async reviewTeachingRequest(
    actor: AcademicActor,
    input: {
      requestId: string
      decision: 'Approved' | 'Rejected'
      reviewNote?: string
    },
  ): Promise<TeachingScheduleRequestDto> {
    if (input.decision === 'Rejected' && !input.reviewNote?.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do từ chối nguyện vọng dạy lớp.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeachingScheduleRequestDto>(
        STAFF_API_ENDPOINTS.academic.teachingRequestReview(input.requestId),
        input,
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const reqIdx = teacherStore.teachingRequests.findIndex((r) => r.id === input.requestId)
    if (reqIdx === -1) throw new StaffApiClientError('Không tìm thấy nguyện vọng giảng dạy.', 404)

    const req = teacherStore.teachingRequests[reqIdx]!
    if (req.status !== 'Requested' && req.status !== 'UnderReview') {
      throw new StaffApiClientError('Nguyện vọng này đã được xử lý trước đó.', 400)
    }

    const classes = readCenterClassesStore()
    const clsIdx = classes.findIndex((c) => c.id === req.classId)
    if (clsIdx === -1) throw new StaffApiClientError('Không tìm thấy lớp học liên quan.', 404)

    const targetClass = classes[clsIdx]!
    const nowIso = new Date().toISOString()

    let nextSessions = [...teacherStore.sessions]

    if (input.decision === 'Approved') {
      const teacherOtherClasses = classes.filter(
        (c) =>
          c.id !== targetClass.id &&
          c.teacherId === req.teacherId &&
          c.status !== 'completed' &&
          c.status !== 'cancelled',
      )
      const conflict = findAcademicScheduleConflict(targetClass, teacherOtherClasses)
      if (conflict) {
        throw new StaffApiClientError(
          `Không thể duyệt vì giảng viên ${req.teacherName} bị trùng lịch với lớp ${conflict.classCode}.`,
          409,
        )
      }

      const assignedClass: CenterClassOfferingDto = {
        ...targetClass,
        teacherId: req.teacherId,
        teacherName: req.teacherName,
      }
      const nextClasses = [...classes]
      nextClasses[clsIdx] = assignedClass
      writeCenterClassesStore(nextClasses)

      const courses = await coursesApi.listCourses()
      const matchedCourse = courses.find((c) => c.id === assignedClass.courseId)
      const academicStoreForSyl = readAcademicOpsStore()
      nextSessions = syncClassScheduleSessions(
        assignedClass,
        academicStoreForSyl.courseSyllabi,
        nextSessions,
        {
          courseName: matchedCourse?.name ?? req.courseName,
          branchName: req.branchName,
          totalSessions: matchedCourse?.sessionsCount ?? 24,
        },
      )
    }

    const updatedReq: TeachingScheduleRequestDto = {
      ...req,
      status: input.decision,
      reviewedByName: actor.fullName,
      reviewedAt: nowIso,
      reviewNote: input.reviewNote?.trim() || undefined,
    }

    const nextReqs = [...teacherStore.teachingRequests]
    nextReqs[reqIdx] = updatedReq

    writeTeacherOpsStore({
      ...teacherStore,
      sessions: nextSessions,
      teachingRequests: nextReqs,
    })

    return updatedReq
  },

  async getPlacementWorkspace(todayYmdVn = getTodayIsoInVietnam()): Promise<{
    candidates: PlacementQueueCandidate[]
    pendingRegistrations: PendingSalesRegistrationItem[]
    openClasses: EnrichedAcademicClassItem[]
    contactLogs: PlacementContactLogDto[]
  }> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<{
        candidates: PlacementQueueCandidate[]
        pendingRegistrations: PendingSalesRegistrationItem[]
        openClasses: EnrichedAcademicClassItem[]
        contactLogs: PlacementContactLogDto[]
      }>(`${STAFF_API_ENDPOINTS.academic.placementQueue}?today=${encodeURIComponent(todayYmdVn)}`)
    }

    const [courses, branches, allClasses, accounts] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      this.listClasses(),
      accountsApi.listAccounts(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))
    const classMap = new Map(allClasses.map((c) => [c.id, c]))
    const accountNameMap = new Map(
      accounts.map((a) => [
        a.id,
        a.staffProfile?.fullName ?? a.teacherProfile?.fullName ?? a.studentProfile?.fullName ?? a.email,
      ]),
    )

    const candidates = buildPlacementQueue({
      todayYmdVn,
      courseMap,
      branchMap,
      classMap,
      accountNameMap,
    })

    const pendingRegistrations = buildPendingSalesRegistrations({
      courseMap,
      branchMap,
      classMap,
      accountNameMap,
    })

    const openClasses = allClasses.filter(
      (c) =>
        (c.status === 'open' || c.status === 'upcoming' || c.status === 'ongoing') &&
        (c.remainingSeats === null || c.remainingSeats > 0),
    )

    const academicStore = readAcademicOpsStore()
    return {
      candidates,
      pendingRegistrations,
      openClasses,
      contactLogs: [...academicStore.placementContactLogs].sort((a, b) =>
        b.contactedAt.localeCompare(a.contactedAt),
      ),
    }
  },

  async reviewSalesRegistration(
    actor: AcademicActor,
    input: {
      registrationId: string
      nextStatus: SalesRegistrationReviewDecision
      reviewerNote?: string
    },
  ): Promise<void> {
    if (
      (input.nextStatus === 'NeedAdditionalInfo' || input.nextStatus === 'Rejected') &&
      !input.reviewerNote?.trim()
    ) {
      throw new StaffApiClientError(
        'Bắt buộc nhập ghi chú phản hồi chi tiết khi yêu cầu bổ sung hoặc từ chối hồ sơ đăng ký.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      await staffHttpClient.post<void>(
        STAFF_API_ENDPOINTS.academic.registrationReview(input.registrationId),
        input,
      )
      return
    }

    await mockDelay()
    const salesStore = readSalesMockStore()
    const regIdx = salesStore.registrations.findIndex((r) => r.id === input.registrationId)
    if (regIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ đăng ký từ bộ phận Sale.', 404)
    }
    const reg = salesStore.registrations[regIdx]!
    if (
      reg.status !== 'Submitted' &&
      reg.status !== 'Reviewing' &&
      reg.status !== 'NeedAdditionalInfo'
    ) {
      throw new StaffApiClientError(
        `Hồ sơ ${reg.registrationCode} đang ở trạng thái "${reg.status}" nên không thể xét duyệt lại.`,
        400,
      )
    }

    if (input.nextStatus === 'Approved') {
      const classes = readCenterClassesStore()
      const prefCls = classes.find((c) => c.id === reg.classId)
      if (!prefCls) {
        throw new StaffApiClientError(
          'Không tìm thấy lớp học nguyện vọng trong danh mục lớp trung tâm.',
          404,
        )
      }
      if (prefCls.status === 'completed' || prefCls.status === 'cancelled') {
        throw new StaffApiClientError(
          `Lớp nguyện vọng ${prefCls.classCode} đã kết thúc hoặc đã hủy. Vui lòng yêu cầu Sale chọn lớp khác.`,
          400,
        )
      }
      const rem = computeRemainingClassSeats(prefCls)
      if (rem !== null && rem <= 0) {
        throw new StaffApiClientError(
          `Lớp nguyện vọng ${prefCls.classCode} đã đủ sĩ số tối đa (${prefCls.enrolledStudents}/${prefCls.maxStudents}). Vui lòng yêu cầu Sale điều chỉnh lớp khác.`,
          409,
        )
      }
    }

    const nowIso = new Date().toISOString()
    const nextRegistrations = [...salesStore.registrations]
    nextRegistrations[regIdx] = {
      ...reg,
      status: input.nextStatus,
      reviewerNote: input.reviewerNote?.trim() || reg.reviewerNote,
      updatedAt: nowIso,
    }

    writeSalesMockStore({
      ...salesStore,
      registrations: nextRegistrations,
      registrationStatusHistory: [
        {
          id: createUniqueId('rsh'),
          registrationId: reg.id,
          fromStatus: reg.status,
          toStatus: input.nextStatus,
          changedByUserId: actor.userId,
          changedByName: `${actor.fullName} (Giáo vụ)`,
          changedAt: nowIso,
          note:
            input.reviewerNote?.trim() ||
            `Giáo vụ cập nhật trạng thái hồ sơ sang ${input.nextStatus}.`,
        },
        ...salesStore.registrationStatusHistory,
      ],
    })
  },

  async logPlacementContact(
    actor: AcademicActor,
    input: {
      targetKey: string
      studentOrLeadName: string
      phone: string
      resultSummary: string
      nextFollowUpDate?: string
      note?: string
    },
  ): Promise<PlacementContactLogDto> {
    if (!input.resultSummary.trim()) {
      throw new StaffApiClientError('Vui lòng nhập kết quả cuộc gọi / liên hệ xếp lớp.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<PlacementContactLogDto>(
        STAFF_API_ENDPOINTS.academic.placementContactLogs,
        input,
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const created: PlacementContactLogDto = {
      id: createUniqueId('pcl'),
      targetKey: input.targetKey,
      studentOrLeadName: input.studentOrLeadName,
      phone: input.phone,
      contactedAt: new Date().toISOString(),
      contactedByUserId: actor.userId,
      contactedByName: actor.fullName,
      resultSummary: input.resultSummary.trim(),
      nextFollowUpDate: input.nextFollowUpDate || undefined,
      note: input.note?.trim() || undefined,
    }

    writeAcademicOpsStore({
      ...store,
      placementContactLogs: [created, ...store.placementContactLogs],
    })
    return created
  },

  /**
   * Xác nhận xếp lớp chính thức theo tháng:
   * - Nếu từ hồ sơ đăng ký Sale đã duyệt ('Approved'): tạo Học viên (nếu chưa có), tạo Enrollment kèm Snapshot học phí,
   *   tăng sĩ số lớp, và chuyển hồ sơ Sale sang 'Converted'.
   * - Nếu từ Học viên đang chờ xếp lớp (bao gồm quay lại sau bảo lưu): kiểm tra Receivable khóa học hiện có để miễn thu trùng.
   */
  async confirmMonthlyPlacement(
    actor: AcademicActor,
    input: {
      candidateKey: string
      targetClassId: string
      note?: string
    },
  ): Promise<{ studentCode: string; classCode: string; enrollmentCode: string }> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<{ studentCode: string; classCode: string; enrollmentCode: string }>(
        STAFF_API_ENDPOINTS.academic.placementConfirm,
        input,
      )
    }

    await mockDelay()
    const workspace = await this.getPlacementWorkspace()
    const candidate = workspace.candidates.find((c) => c.candidateKey === input.candidateKey)
    if (!candidate) {
      throw new StaffApiClientError('Không tìm thấy học viên trong danh sách chờ xếp lớp.', 404)
    }

    const targetClass = workspace.openClasses.find((c) => c.id === input.targetClassId)
    if (!targetClass) {
      throw new StaffApiClientError('Lớp được chọn không hợp lệ hoặc đã hết chỗ trống.', 400)
    }
    if (targetClass.courseId !== candidate.courseId) {
      throw new StaffApiClientError(
        `Lớp ${targetClass.classCode} không thuộc khóa học ${candidate.courseName} của học viên.`,
        400,
      )
    }

    const nowIso = new Date().toISOString()

    if (candidate.sourceType === 'waiting_student' && candidate.studentId) {
      const academicStore = readAcademicOpsStore()
      const accountingStore = readAccountingOpsStore()

      const existingCourseReceivable = accountingStore.receivables.find(
        (r) =>
          !r.isCancelled &&
          r.studentId === candidate.studentId &&
          r.courseId === targetClass.courseId,
      )
      const prevHoldEnr = academicStore.enrollments.find(
        (e) =>
          e.studentId === candidate.studentId &&
          e.courseId === targetClass.courseId &&
          e.status === 'hold',
      )

      if (prevHoldEnr) {
        const nextEnrs = academicStore.enrollments.map((e) =>
          e.id === prevHoldEnr.id
            ? {
                ...e,
                status: 'transferred' as const,
                endedAt: nowIso,
                note: `${e.note ? `${e.note} | ` : ''}Đã xếp lại vào lớp ${targetClass.classCode} sau bảo lưu.`,
              }
            : e,
        )
        writeAcademicOpsStore({
          ...academicStore,
          enrollments: nextEnrs,
        })
      }

      const enr = await this.enrollStudentIntoClass({
        classId: targetClass.id,
        studentId: candidate.studentId,
        agreedTuitionVnd: existingCourseReceivable
          ? existingCourseReceivable.totalReceivableVnd
          : prevHoldEnr?.agreedTuitionVnd,
        sourceRegistrationCode: prevHoldEnr?.sourceRegistrationCode,
        listedTuitionSnapshotVnd:
          existingCourseReceivable?.listedTuitionVnd ?? prevHoldEnr?.listedTuitionSnapshotVnd,
        discountSnapshotVnd:
          existingCourseReceivable?.discountAmountVnd ?? prevHoldEnr?.discountSnapshotVnd,
        tuitionPolicyIdSnapshot:
          existingCourseReceivable?.tuitionPolicyId ?? prevHoldEnr?.tuitionPolicyIdSnapshot,
        tuitionPolicyCodeSnapshot:
          existingCourseReceivable?.tuitionPolicyCode ?? prevHoldEnr?.tuitionPolicyCodeSnapshot,
        billingExemptionReason: existingCourseReceivable ? 'return_from_hold' : undefined,
        note: input.note?.trim() || 'Xếp lớp từ hàng đợi Xếp lớp theo tháng.',
      })

      if (existingCourseReceivable) {
        const latestAccStore = readAccountingOpsStore()
        const nextRcvs = latestAccStore.receivables.map((r) =>
          r.id === existingCourseReceivable.id
            ? {
                ...r,
                classId: targetClass.id,
                classCode: targetClass.classCode,
                branchId: targetClass.branchId,
                branchName: targetClass.branchName,
                updatedAt: nowIso,
              }
            : r,
        )
        writeAccountingOpsStore({ ...latestAccStore, receivables: nextRcvs })
      }

      return {
        studentCode: candidate.studentCode ?? 'HV',
        classCode: targetClass.classCode,
        enrollmentCode: enr.enrollmentCode,
      }
    }

    // Nguồn: Hồ sơ đăng ký khóa học của Sale (status === 'Approved')
    const salesStore = readSalesMockStore()
    const regIdx = salesStore.registrations.findIndex((r) => r.id === candidate.registrationId)
    if (regIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ đăng ký gốc từ Sales CRM.', 404)
    }
    const reg = salesStore.registrations[regIdx]!

    const academicStore = readAcademicOpsStore()
    const cleanPhone = candidate.phone.replace(/\s+/g, '')
    let student = academicStore.students.find((s) => s.phone.replace(/\s+/g, '') === cleanPhone)

    if (!student) {
      const seq = String(academicStore.students.length + 1).padStart(4, '0')
      const halfEntry = Math.round((candidate.entryScoreTotal || 200) / 2)
      const halfGoal = Math.round(candidate.targetScoreTotal / 2)
      student = {
        id: createUniqueId('stu'),
        studentCode: `HV-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
        fullName: candidate.fullName,
        phone: cleanPhone,
        email: candidate.email,
        branchId: targetClass.branchId,
        branchName: targetClass.branchName,
        currentCourseId: targetClass.courseId,
        currentCourseName: targetClass.courseName,
        currentClassId: targetClass.id,
        currentClassCode: targetClass.classCode,
        entryScore: {
          lc: halfEntry,
          rc: (candidate.entryScoreTotal || 200) - halfEntry,
          total: candidate.entryScoreTotal || 200,
        },
        goalScore: {
          lc: halfGoal,
          rc: candidate.targetScoreTotal - halfGoal,
          total: candidate.targetScoreTotal,
        },
        commitmentSummary: {
          advisedOutcomeLabel: reg.commitment.advisedOutcomeLabel,
          conditionsText: reg.commitment.attendanceAndHomeworkConditions,
          sourceRegistrationCode: reg.registrationCode,
        },
        learningStatus: 'waiting_placement',
        sourceRegistrationId: reg.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      writeAcademicOpsStore({
        ...academicStore,
        students: [student, ...academicStore.students],
      })
    }

    const createdEnrollment = await this.enrollStudentIntoClass({
      classId: targetClass.id,
      studentId: student.id,
      agreedTuitionVnd: reg.estimatedTuition.netEstimatedTuitionVnd,
      sourceRegistrationCode: reg.registrationCode,
      listedTuitionSnapshotVnd: reg.snapshot.listedTuitionVnd,
      discountSnapshotVnd: reg.snapshot.discountAmountVnd,
      tuitionPolicyIdSnapshot: reg.estimatedTuition.policyId,
      tuitionPolicyCodeSnapshot: reg.snapshot.policyCode ?? reg.estimatedTuition.policyCode,
      note:
        input.note?.trim() ||
        `Chuyển đổi xếp lớp chính thức từ hồ sơ Sale ${reg.registrationCode}.`,
    })

    const nextRegs = [...salesStore.registrations]
    nextRegs[regIdx] = {
      ...reg,
      classId: targetClass.id,
      status: 'Converted',
      updatedAt: nowIso,
    }
    writeSalesMockStore({
      ...salesStore,
      registrations: nextRegs,
      registrationStatusHistory: [
        {
          id: createUniqueId('rsh'),
          registrationId: reg.id,
          fromStatus: reg.status,
          toStatus: 'Converted',
          changedByUserId: actor.userId,
          changedByName: `${actor.fullName} (Giáo vụ xếp lớp)`,
          changedAt: nowIso,
          note: `Đã xếp vào lớp ${targetClass.classCode} – Mã HV: ${student.studentCode} (${createdEnrollment.enrollmentCode}).`,
        },
        ...salesStore.registrationStatusHistory,
      ],
    })

    return {
      studentCode: student.studentCode,
      classCode: targetClass.classCode,
      enrollmentCode: createdEnrollment.enrollmentCode,
    }
  },

  async listAcademicRequests(): Promise<StudentAcademicRequestDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<StudentAcademicRequestDto[]>(STAFF_API_ENDPOINTS.academic.requests)
    }

    await mockDelay(80)
    const store = readAcademicOpsStore()
    return [...store.academicRequests].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    )
  },

  async createAcademicRequest(input: {
    studentId: string
    requestType: AcademicRequestType
    targetClassId?: string
    reason: string
    detailNote: string
    effectiveDate: string
    holdUntilDate?: string
  }): Promise<StudentAcademicRequestDto> {
    if (!input.reason.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do gửi yêu cầu học vụ.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<StudentAcademicRequestDto>(
        STAFF_API_ENDPOINTS.academic.requests,
        input,
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const classes = readCenterClassesStore()
    const student = store.students.find((s) => s.id === input.studentId)
    if (!student) throw new StaffApiClientError('Không tìm thấy học viên.', 404)

    const resolvedEffectiveDate = input.effectiveDate || getTodayIsoInVietnam()
    const targetClass = input.targetClassId
      ? classes.find((c) => c.id === input.targetClassId)
      : undefined
    const activeEnr = store.enrollments.find(
      (e) => e.studentId === student.id && (e.status === 'active' || e.status === 'hold'),
    )
    const studentCourseId = activeEnr?.courseId ?? student.currentCourseId ?? 'foundation-toeic'

    if (input.requestType === 'hold') {
      if (student.learningStatus !== 'studying') {
        throw new StaffApiClientError(
          'Chỉ học viên đang theo học (Studying) mới có thể tạo đơn xin bảo lưu khóa học.',
          400,
        )
      }
      const resolvedHoldUntil = input.holdUntilDate || shiftIsoYmd(resolvedEffectiveDate, 60)
      if (resolvedHoldUntil < resolvedEffectiveDate) {
        throw new StaffApiClientError(
          'Ngày kết thúc bảo lưu không được nhỏ hơn ngày bắt đầu áp dụng.',
          400,
        )
      }
    } else if (input.requestType === 'resume') {
      if (student.learningStatus !== 'hold') {
        throw new StaffApiClientError(
          'Chỉ học viên đang trong diện Bảo lưu mới có thể lập đơn Khôi phục học sau bảo lưu.',
          400,
        )
      }
      if (input.targetClassId) {
        if (!targetClass) {
          throw new StaffApiClientError('Lớp dự kiến xếp lại không tồn tại.', 404)
        }
        if (targetClass.status === 'completed' || targetClass.status === 'cancelled') {
          throw new StaffApiClientError('Lớp dự kiến xếp lại đã kết thúc hoặc đã hủy.', 400)
        }
        const rem = computeRemainingClassSeats(targetClass)
        if (rem !== null && rem <= 0) {
          throw new StaffApiClientError(`Lớp ${targetClass.classCode} đã đủ sĩ số tối đa.`, 400)
        }
        if (targetClass.courseId !== studentCourseId) {
          throw new StaffApiClientError(
            `Lớp ${targetClass.classCode} không cùng khóa học bảo lưu của học viên.`,
            400,
          )
        }
      }
    } else if (input.requestType === 'transfer') {
      if (!student.currentClassId) {
        throw new StaffApiClientError('Học viên hiện chưa có lớp đang theo học để chuyển lớp.', 400)
      }
      if (input.targetClassId) {
        if (!targetClass) {
          throw new StaffApiClientError('Lớp chuyển đến được chọn không tồn tại.', 404)
        }
        if (targetClass.id === student.currentClassId) {
          throw new StaffApiClientError('Lớp chuyển đến phải khác lớp hiện tại.', 400)
        }
        if (targetClass.status === 'completed' || targetClass.status === 'cancelled') {
          throw new StaffApiClientError('Lớp chuyển đến đã kết thúc hoặc đã hủy.', 400)
        }
        const rem = computeRemainingClassSeats(targetClass)
        if (rem !== null && rem <= 0) {
          throw new StaffApiClientError(`Lớp đích ${targetClass.classCode} đã đủ sĩ số tối đa.`, 400)
        }
        if (targetClass.courseId !== studentCourseId) {
          throw new StaffApiClientError(
            `Lớp chuyển đến ${targetClass.classCode} phải cùng khóa học với lớp hiện tại của học viên.`,
            400,
          )
        }
      }
    } else if (input.requestType === 'retake') {
      if (input.targetClassId) {
        if (!targetClass) {
          throw new StaffApiClientError('Lớp học lại được chọn không tồn tại.', 404)
        }
        if (targetClass.status === 'completed' || targetClass.status === 'cancelled') {
          throw new StaffApiClientError('Lớp học lại đã kết thúc hoặc đã hủy.', 400)
        }
        const rem = computeRemainingClassSeats(targetClass)
        if (rem !== null && rem <= 0) {
          throw new StaffApiClientError(`Lớp học lại ${targetClass.classCode} đã đủ sĩ số tối đa.`, 400)
        }
        if (targetClass.courseId !== studentCourseId) {
          const hasPriorCourseHistory = store.enrollments.some(
            (e) => e.studentId === student.id && e.courseId === targetClass.courseId,
          )
          if (!hasPriorCourseHistory) {
            throw new StaffApiClientError(
              'Lớp học lại phải thuộc khóa học học viên đã từng theo học hoặc có cam kết đầu ra.',
              400,
            )
          }
        }
      }
      const hasPriorEnrollmentOrCommitment =
        store.enrollments.some((e) => e.studentId === student.id) ||
        Boolean(student.commitmentSummary)
      if (!hasPriorEnrollmentOrCommitment) {
        throw new StaffApiClientError(
          'Học viên chưa có lịch sử ghi danh hoặc cam kết đầu ra nên chưa đủ điều kiện học lại.',
          400,
        )
      }
    }

    const seq = String(store.academicRequests.length + 1).padStart(3, '0')
    const created: StudentAcademicRequestDto = {
      id: createUniqueId('req-aca'),
      requestCode: `REQ-ACA-${seq}`,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      studentPhone: student.phone,
      enrollmentId: activeEnr?.id,
      currentCourseId: targetClass?.courseId ?? studentCourseId,
      currentCourseName: student.currentCourseName ?? 'Khóa học hiện tại',
      currentClassId: student.currentClassId,
      currentClassCode: student.currentClassCode,
      targetClassId: targetClass?.id,
      targetClassCode: targetClass?.classCode,
      requestType: input.requestType,
      reason: input.reason.trim(),
      detailNote: input.detailNote.trim(),
      effectiveDate: resolvedEffectiveDate,
      holdUntilDate:
        input.requestType === 'hold'
          ? input.holdUntilDate || shiftIsoYmd(resolvedEffectiveDate, 60)
          : undefined,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
    }

    writeAcademicOpsStore({
      ...store,
      academicRequests: [created, ...store.academicRequests],
    })
    return created
  },

  async transitionAcademicRequest(
    actor: AcademicActor,
    input: {
      requestId: string
      toStatus: AcademicRequestStatus
      resolutionNote?: string
      targetClassId?: string
    },
  ): Promise<StudentAcademicRequestDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<StudentAcademicRequestDto>(
        STAFF_API_ENDPOINTS.academic.requestStatus(input.requestId),
        input,
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const idx = store.academicRequests.findIndex((r) => r.id === input.requestId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy đơn yêu cầu học vụ.', 404)

    const req = store.academicRequests[idx]!
    const allowed = REQUEST_ALLOWED_TRANSITIONS[req.status]
    if (!allowed.includes(input.toStatus)) {
      throw new StaffApiClientError(
        `Không thể chuyển trạng thái đơn từ "${req.status}" sang "${input.toStatus}".`,
        400,
      )
    }

    if (input.toStatus === 'Rejected' && !input.resolutionNote?.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do từ chối yêu cầu học vụ.', 400)
    }

    let resolvedTargetClassId = input.targetClassId?.trim() || req.targetClassId
    let resolvedTargetClassCode = req.targetClassCode

    // Thực thi cập nhật trạng thái học tập / sĩ số lớp khi duyệt hoặc hoàn tất
    if (input.toStatus === 'Approved' || input.toStatus === 'Completed') {
      if (req.requestType === 'hold') {
        if (req.holdUntilDate && req.holdUntilDate < req.effectiveDate) {
          throw new StaffApiClientError(
            'Thời hạn bảo lưu không hợp lệ (ngày kết thúc nhỏ hơn ngày bắt đầu).',
            400,
          )
        }
        const freshStore = readAcademicOpsStore()
        const classes = readCenterClassesStore()
        const nextClasses = [...classes]
        let classesUpdated = false

        const sIdx = freshStore.students.findIndex((s) => s.id === req.studentId)
        const nextStudents = [...freshStore.students]
        if (sIdx >= 0) {
          nextStudents[sIdx] = {
            ...nextStudents[sIdx]!,
            learningStatus: 'hold',
            updatedAt: new Date().toISOString(),
          }
        }

        const nextEnrs = freshStore.enrollments.map((e) => {
          if (e.studentId === req.studentId && e.status === 'active') {
            const clsIdx = nextClasses.findIndex((c) => c.id === e.classId)
            if (clsIdx >= 0) {
              const cls = nextClasses[clsIdx]!
              const nextCount = Math.max(0, (cls.enrolledStudents ?? 1) - 1)
              nextClasses[clsIdx] = {
                ...cls,
                enrolledStudents: nextCount,
                status:
                  cls.status === 'full' &&
                  (typeof cls.maxStudents !== 'number' || nextCount < cls.maxStudents)
                    ? 'open'
                    : cls.status,
              }
              classesUpdated = true
            }
            return {
              ...e,
              status: 'hold' as const,
              note: `${e.note ? `${e.note} | ` : ''}Tạm bảo lưu theo đơn ${req.requestCode}.`,
            }
          }
          return e
        })

        if (classesUpdated) {
          writeCenterClassesStore(nextClasses)
        }
        writeAcademicOpsStore({
          ...freshStore,
          students: nextStudents,
          enrollments: nextEnrs,
        })
      } else if (req.requestType === 'resume') {
        const freshStore = readAcademicOpsStore()
        const sIdx = freshStore.students.findIndex((s) => s.id === req.studentId)
        if (sIdx >= 0) {
          const curStudent = freshStore.students[sIdx]!
          const nowIso = new Date().toISOString()

          if (resolvedTargetClassId) {
            const classes = readCenterClassesStore()
            const targetClass = classes.find((c) => c.id === resolvedTargetClassId)
            if (!targetClass) {
              throw new StaffApiClientError('Không tìm thấy lớp dự kiến khôi phục học.', 404)
            }
            resolvedTargetClassCode = targetClass.classCode
            const alreadyActiveInTarget = freshStore.enrollments.some(
              (e) =>
                e.studentId === req.studentId &&
                e.classId === resolvedTargetClassId &&
                e.status === 'active',
            )
            if (!alreadyActiveInTarget) {
              if (targetClass.courseId !== (curStudent.currentCourseId ?? req.currentCourseId)) {
                throw new StaffApiClientError(
                  `Lớp ${targetClass.classCode} không cùng khóa học bảo lưu của học viên.`,
                  400,
                )
              }

              const holdEnr = freshStore.enrollments.find(
                (e) => e.studentId === req.studentId && e.status === 'hold',
              )
              if (holdEnr) {
                const closedHoldEnrs = freshStore.enrollments.map((e) =>
                  e.id === holdEnr.id
                    ? {
                        ...e,
                        status: 'transferred' as const,
                        endedAt: nowIso,
                        note: `${e.note ? `${e.note} | ` : ''}Đã khôi phục học vào lớp ${targetClass.classCode} (${req.requestCode}).`,
                      }
                    : e,
                )
                writeAcademicOpsStore({
                  ...freshStore,
                  enrollments: closedHoldEnrs,
                })
              }

              const accountingStore = readAccountingOpsStore()
              const existingReceivable = accountingStore.receivables.find(
                (r) =>
                  !r.isCancelled &&
                  r.studentId === req.studentId &&
                  r.courseId === targetClass.courseId,
              )

              await this.enrollStudentIntoClass({
                classId: targetClass.id,
                studentId: req.studentId,
                agreedTuitionVnd:
                  existingReceivable?.totalReceivableVnd ?? holdEnr?.agreedTuitionVnd ?? 0,
                sourceRegistrationCode: holdEnr?.sourceRegistrationCode,
                listedTuitionSnapshotVnd:
                  existingReceivable?.listedTuitionVnd ?? holdEnr?.listedTuitionSnapshotVnd,
                discountSnapshotVnd:
                  existingReceivable?.discountAmountVnd ?? holdEnr?.discountSnapshotVnd,
                tuitionPolicyIdSnapshot:
                  existingReceivable?.tuitionPolicyId ?? holdEnr?.tuitionPolicyIdSnapshot,
                tuitionPolicyCodeSnapshot:
                  existingReceivable?.tuitionPolicyCode ?? holdEnr?.tuitionPolicyCodeSnapshot,
                billingExemptionReason: existingReceivable ? 'return_from_hold' : undefined,
                note: `Khôi phục học sau bảo lưu theo đơn ${req.requestCode}.`,
              })

              if (existingReceivable) {
                const latestAcc = readAccountingOpsStore()
                writeAccountingOpsStore({
                  ...latestAcc,
                  receivables: latestAcc.receivables.map((r) =>
                    r.id === existingReceivable.id
                      ? {
                          ...r,
                          classId: targetClass.id,
                          classCode: targetClass.classCode,
                          updatedAt: nowIso,
                        }
                      : r,
                  ),
                })
              }
            }
          } else if (curStudent.learningStatus === 'hold') {
            const nextStudents = [...freshStore.students]
            nextStudents[sIdx] = {
              ...curStudent,
              learningStatus: 'waiting_placement',
              currentClassId: undefined,
              currentClassCode: undefined,
              expectedStartMonth: req.effectiveDate.slice(0, 7),
              note: `Khôi phục học từ bảo lưu (${req.requestCode}) – đang chờ xếp lớp.`,
              updatedAt: nowIso,
            }
            writeAcademicOpsStore({
              ...freshStore,
              students: nextStudents,
            })
          }
        }
      } else if (req.requestType === 'transfer') {
        if (!req.currentClassId) {
          throw new StaffApiClientError('Đơn chuyển lớp thiếu thông tin lớp hiện tại của học viên.', 400)
        }
        if (!resolvedTargetClassId) {
          throw new StaffApiClientError(
            'Vui lòng chọn lớp chuyển đến hợp lệ trước khi phê duyệt đơn chuyển lớp.',
            400,
          )
        }
        const classes = readCenterClassesStore()
        const fromCls = classes.find((c) => c.id === req.currentClassId)
        const toCls = classes.find((c) => c.id === resolvedTargetClassId)
        if (!fromCls || !toCls) {
          throw new StaffApiClientError('Không tìm thấy lớp nguồn hoặc lớp đích.', 404)
        }
        if (toCls.id === fromCls.id) {
          throw new StaffApiClientError('Lớp chuyển đến phải khác lớp hiện tại.', 400)
        }
        if (toCls.courseId !== fromCls.courseId) {
          throw new StaffApiClientError('Lớp chuyển đến phải cùng khóa học với lớp hiện tại.', 400)
        }
        resolvedTargetClassId = toCls.id
        resolvedTargetClassCode = toCls.classCode
        if (input.toStatus === 'Approved') {
          const rem = computeRemainingClassSeats(toCls)
          if (
            toCls.status === 'completed' ||
            toCls.status === 'cancelled' ||
            (rem !== null && rem <= 0)
          ) {
            throw new StaffApiClientError(`Lớp đích ${toCls.classCode} hiện không còn chỗ trống.`, 400)
          }
        } else if (input.toStatus === 'Completed') {
          await this.transferStudentClass(actor, {
            studentId: req.studentId,
            fromClassId: req.currentClassId,
            toClassId: resolvedTargetClassId,
            reason: `Thực thi theo đơn ${req.requestCode}: ${req.reason}`,
          })
        }
      } else if (req.requestType === 'retake') {
        if (!resolvedTargetClassId) {
          throw new StaffApiClientError(
            'Vui lòng chọn lớp học lại hợp lệ trước khi phê duyệt đơn học lại.',
            400,
          )
        }
        const classes = readCenterClassesStore()
        const targetClass = classes.find((c) => c.id === resolvedTargetClassId)
        if (!targetClass) {
          throw new StaffApiClientError('Không tìm thấy lớp học lại đã chọn.', 404)
        }
        if (targetClass.courseId !== req.currentCourseId) {
          throw new StaffApiClientError('Lớp học lại phải thuộc đúng khóa học đăng ký học lại.', 400)
        }
        resolvedTargetClassId = targetClass.id
        resolvedTargetClassCode = targetClass.classCode
        if (input.toStatus === 'Approved') {
          const rem = computeRemainingClassSeats(targetClass)
          if (
            targetClass.status === 'completed' ||
            targetClass.status === 'cancelled' ||
            (rem !== null && rem <= 0)
          ) {
            throw new StaffApiClientError(`Lớp ${targetClass.classCode} hiện không còn chỗ trống.`, 400)
          }
        } else if (input.toStatus === 'Completed') {
          await this.enrollStudentIntoClass({
            classId: resolvedTargetClassId,
            studentId: req.studentId,
            agreedTuitionVnd: 0,
            billingExemptionReason: 'retake',
            note: `Ghi danh học lại miễn phí theo cam kết – đơn ${req.requestCode}.`,
          })
        }
      }
    }

    const latestStore = readAcademicOpsStore()
    const latestIdx = latestStore.academicRequests.findIndex((r) => r.id === input.requestId)
    const nowIso = new Date().toISOString()
    const updated: StudentAcademicRequestDto = {
      ...latestStore.academicRequests[latestIdx]!,
      targetClassId: resolvedTargetClassId,
      targetClassCode: resolvedTargetClassCode,
      status: input.toStatus,
      reviewedByUserId: actor.userId,
      reviewedByName: actor.fullName,
      reviewedAt: nowIso,
      resolutionNote: input.resolutionNote?.trim() || req.resolutionNote,
    }

    const nextReqs = [...latestStore.academicRequests]
    nextReqs[latestIdx] = updated
    writeAcademicOpsStore({ ...latestStore, academicRequests: nextReqs })
    return updated
  },

  async listCourseSyllabi(): Promise<CourseSyllabusVersionDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<CourseSyllabusVersionDto[]>(STAFF_API_ENDPOINTS.academic.syllabi)
    }

    await mockDelay(80)
    const store = readAcademicOpsStore()
    return [...store.courseSyllabi].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async createSyllabusVersion(
    actor: AcademicActor,
    input: {
      courseId: string
      versionCode: string
      effectiveFrom: string
      summaryNote: string
      cloneFromSyllabusId?: string
    },
  ): Promise<CourseSyllabusVersionDto> {
    if (!input.versionCode.trim() || !input.summaryNote.trim()) {
      throw new StaffApiClientError('Vui lòng nhập Mã phiên bản và Mô tả tóm tắt.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<CourseSyllabusVersionDto>(
        STAFF_API_ENDPOINTS.academic.syllabi,
        input,
      )
    }

    await mockDelay()
    const courses = await coursesApi.listCourses()
    const course = courses.find((c) => c.id === input.courseId)
    if (!course) throw new StaffApiClientError('Khóa học không tồn tại.', 404)

    const store = readAcademicOpsStore()
    const normalizedVer = input.versionCode.trim().toUpperCase()
    const dup = store.courseSyllabi.find((s) => s.versionCode.toUpperCase() === normalizedVer)
    if (dup) {
      throw new StaffApiClientError(`Mã phiên bản "${normalizedVer}" đã tồn tại.`, 409)
    }

    const source = input.cloneFromSyllabusId
      ? store.courseSyllabi.find((s) => s.id === input.cloneFromSyllabusId)
      : store.courseSyllabi.find((s) => s.courseId === course.id && s.status === 'active')

    const clonedSessions: CourseSyllabusSessionItemDto[] = source
      ? source.sessions.map((ses) => ({
          ...ses,
          id: createUniqueId('syl-ses'),
        }))
      : [
          {
            id: createUniqueId('syl-ses'),
            sessionNumber: 1,
            activityType: 'class',
            topicTitle: `Buổi 01: Định hướng lộ trình ${course.name}`,
            learningObjectives: 'Nắm vững cấu trúc bài thi và phương pháp tự học.',
            lcSummary: 'Kỹ thuật nghe bắt từ khóa nền tảng.',
            rcSummary: 'Hệ thống ngữ pháp trọng tâm buổi đầu.',
            teachingMaterials: [],
          },
        ]

    const created: CourseSyllabusVersionDto = {
      id: createUniqueId('syl'),
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      versionCode: normalizedVer,
      status: 'draft',
      effectiveFrom: input.effectiveFrom || getTodayIsoInVietnam(),
      summaryNote: input.summaryNote.trim(),
      sessions: clonedSessions,
      updatedByName: actor.fullName,
      updatedAt: new Date().toISOString(),
    }

    writeAcademicOpsStore({
      ...store,
      courseSyllabi: [created, ...store.courseSyllabi],
    })
    return created
  },

  async upsertSyllabusSession(
    actor: AcademicActor,
    input: {
      syllabusId: string
      session: Omit<CourseSyllabusSessionItemDto, 'id'> & { id?: string }
    },
  ): Promise<CourseSyllabusVersionDto> {
    if (!input.session.topicTitle.trim() || !input.session.learningObjectives.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập Chủ đề buổi học và Mục tiêu đầu ra buổi học.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<CourseSyllabusVersionDto>(
        `${STAFF_API_ENDPOINTS.academic.syllabusDetail(input.syllabusId)}/sessions`,
        input.session,
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const idx = store.courseSyllabi.findIndex((s) => s.id === input.syllabusId)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy phiên bản nội dung khóa học.', 404)
    }

    const syl = store.courseSyllabi[idx]!
    if (syl.status === 'archived') {
      throw new StaffApiClientError(
        'Phiên bản đã lưu trữ không được sửa trực tiếp để bảo vệ lịch sử lớp cũ. Hãy tạo phiên bản mới.',
        400,
      )
    }

    let nextSessions = [...syl.sessions]
    if (input.session.id) {
      nextSessions = nextSessions.map((s) =>
        s.id === input.session.id ? { ...input.session, id: s.id } : s,
      )
    } else {
      nextSessions.push({
        ...input.session,
        id: createUniqueId('syl-ses'),
      })
    }
    nextSessions.sort((a, b) => a.sessionNumber - b.sessionNumber)

    const updated: CourseSyllabusVersionDto = {
      ...syl,
      sessions: nextSessions,
      updatedByName: actor.fullName,
      updatedAt: new Date().toISOString(),
    }

    const nextSyllabi = [...store.courseSyllabi]
    nextSyllabi[idx] = updated
    writeAcademicOpsStore({ ...store, courseSyllabi: nextSyllabi })
    return updated
  },

  async activateSyllabusVersion(
    actor: AcademicActor,
    syllabusId: string,
  ): Promise<CourseSyllabusVersionDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<CourseSyllabusVersionDto>(
        `${STAFF_API_ENDPOINTS.academic.syllabusDetail(syllabusId)}/activate`,
        {},
      )
    }

    await mockDelay()
    const store = readAcademicOpsStore()
    const target = store.courseSyllabi.find((s) => s.id === syllabusId)
    if (!target) throw new StaffApiClientError('Không tìm thấy phiên bản giáo trình.', 404)

    const nowIso = new Date().toISOString()
    const nextSyllabi = store.courseSyllabi.map((item) => {
      if (item.id === syllabusId) {
        return {
          ...item,
          status: 'active' as const,
          updatedByName: actor.fullName,
          updatedAt: nowIso,
        }
      }
      if (item.courseId === target.courseId && item.status === 'active') {
        return { ...item, status: 'archived' as const }
      }
      return item
    })

    writeAcademicOpsStore({ ...store, courseSyllabi: nextSyllabi })
    return nextSyllabi.find((s) => s.id === syllabusId)!
  },
}
