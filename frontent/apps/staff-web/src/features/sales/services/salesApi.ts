import {
  FOLLOW_UP_ALLOWED_TRANSITIONS,
  REVIEWER_REGISTRATION_TRANSITIONS,
  SALE_REGISTRATION_TRANSITIONS,
  computeRemainingClassSeats,
  getAllowedManualLeadTransitions,
  isClassOpenForRegistration,
  isLeadReopenTransition,
  type CenterClassOfferingDto,
  type CourseRegistrationDto,
  type CourseRegistrationStatus,
  type LeadStatusHistoryDto,
  type RegistrationSnapshotDto,
  type RegistrationStatusHistoryDto,
  type SalesConsultationDto,
  type SalesFollowUpDto,
  type SalesLeadDto,
} from '@english-center/contracts'
import {
  getTodayIsoInVietnam,
  isValidEmail,
  isValidFacebookUrl,
  isValidVnPhone,
  shiftIsoYmd,
  toSafeHttpUrl,
} from '@english-center/utils'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { trainingApi } from '@/features/training/api/trainingApi'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import {
  createUniqueId,
  normalizeVnPhone,
  toVietnamYmd,
} from '@/shared/utils/staffFormatters'
import {
  CONSULTATION_CHANNEL_LABELS,
  FOLLOW_UP_STATUS_META,
  LEAD_STATUS_META,
  REGISTRATION_STATUS_META,
  type AttachCourseInterestInput,
  type CreateConsultationInput,
  type CreateFollowUpInput,
  type CreateLeadInput,
  type DuplicateLeadWarning,
  type EnrichedLeadSummary,
  type PreRegistrationValidationReport,
  type RegistrationDetailBundle,
  type SalesActivityEvent,
  type SalesActorContext,
  type SalesDashboardData,
  type SalesLeadDetailBundle,
  type SalesPeriodFilter,
  type TransitionLeadStatusInput,
  type TransitionRegistrationStatusInput,
  type UpdateFollowUpStatusInput,
  type UpdateLeadInput,
  type UpsertCourseRegistrationInput,
} from '@/features/sales/types/sales.types'

export interface SalesMockStoreState {
  leads: SalesLeadDto[]
  consultations: SalesConsultationDto[]
  followUps: SalesFollowUpDto[]
  leadStatusHistory: LeadStatusHistoryDto[]
  registrations: CourseRegistrationDto[]
  registrationStatusHistory: RegistrationStatusHistoryDto[]
}

export const SALES_CRM_MOCK_KEY = 'ec_staff_mock_sales_crm_v6'

function buildEmptySalesMockStore(): SalesMockStoreState {
  const today = getTodayIsoInVietnam()
  const yesterday = shiftIsoYmd(today, -1)
  const twoDaysAgo = shiftIsoYmd(today, -2)
  const fiveDaysAgo = shiftIsoYmd(today, -5)
  const nextWeek = shiftIsoYmd(today, 12)

  return {
    leads: [
      {
        id: 'lead-001',
        fullName: 'Trần Bảo Ngọc',
        phone: '0945112266',
        email: 'baongoc.tran@gmail.com',
        schoolOrWork: 'Đại học Kinh tế Quốc dân – Năm 3',
        learningNeed: 'Cần đạt 550+ TOEIC trong 3 tháng để nộp chứng chỉ chuẩn đầu ra.',
        currentLevelNote: 'Khoảng 360 TOEIC (đã làm bài test nhanh trên web)',
        targetGoalNote: '550–600 LR',
        preferredContactTime: 'Buổi tối (19:00 – 21:00)',
        interestedCourseIds: ['camp-bomb-toeic'],
        preferredBranchId: 'cs-hai-ba-trung',
        source: 'website-consultation',
        consentSummary: 'Khách để lại thông tin qua biểu mẫu tư vấn trên Website.',
        assignedSaleId: 'acc-stf-002',
        status: 'New',
        createdAt: `${today}T07:30:00.000Z`,
        updatedAt: `${today}T07:30:00.000Z`,
      },
      {
        id: 'lead-002',
        fullName: 'Vũ Quang Minh',
        phone: '0936224488',
        email: 'quangminh.vu@gmail.com',
        schoolOrWork: 'Chuyên viên Kiểm toán – Deloitte',
        learningNeed: 'Cần học lớp Submarine 700+ ca tối 3-5-7 tại Hà Đông hoặc Hai Bà Trưng.',
        currentLevelNote: '530 TOEIC',
        targetGoalNote: '750+ LR',
        preferredContactTime: 'Giờ nghỉ trưa (12:00 – 13:30)',
        interestedCourseIds: ['submarine-toeic'],
        preferredBranchId: 'cs-hai-ba-trung',
        interestedClassId: 'sch-hbt-01',
        source: 'course-page',
        consentSummary: 'Khách đăng ký tư vấn từ trang chi tiết khóa Submarine TOEIC 700+.',
        assignedSaleId: 'acc-stf-002',
        status: 'Interested',
        createdAt: `${twoDaysAgo}T09:00:00.000Z`,
        updatedAt: `${yesterday}T12:20:00.000Z`,
      },
      {
        id: 'lead-003',
        fullName: 'Ngô Tuấn Kiệt',
        phone: '0915336699',
        email: 'tuankiet.ngo@gmail.com',
        schoolOrWork: 'Học viện Công nghệ Bưu chính Viễn thông – Năm 2',
        learningNeed: 'Mất gốc ngữ âm và ngữ pháp, muốn đăng ký lớp Foundation tối 2-4-6 tại Hà Đông.',
        currentLevelNote: '220 TOEIC đầu vào',
        targetGoalNote: '450+ LR',
        preferredContactTime: 'Buổi chiều',
        interestedCourseIds: ['foundation-toeic'],
        preferredBranchId: 'cs-ha-dong',
        interestedClassId: 'sch-hd-01',
        source: 'schedule-modal',
        consentSummary: 'Khách bấm Đăng ký giữ chỗ trên bảng Lịch khai giảng.',
        assignedSaleId: 'acc-stf-002',
        status: 'Registered',
        createdAt: `${fiveDaysAgo}T10:00:00.000Z`,
        updatedAt: `${yesterday}T10:15:00.000Z`,
      },
      {
        id: 'lead-004',
        fullName: 'Đặng Phương Thảo',
        phone: '0978556677',
        email: 'phuongthao.dang@gmail.com',
        schoolOrWork: 'Đại học Công nghiệp Hà Nội – Năm 3',
        learningNeed: 'Tìm hiểu khóa Camp Bomb học trực tuyến buổi tối do lịch thực tập ban ngày.',
        currentLevelNote: '380 TOEIC',
        targetGoalNote: '550+ LR',
        preferredContactTime: 'Sau 18:00',
        interestedCourseIds: ['camp-bomb-toeic'],
        preferredBranchId: 'toeic-online',
        interestedClassId: 'sch-onl-01',
        source: 'website-consultation',
        consentSummary: 'Khách đăng ký nhận tư vấn lộ trình học Online.',
        assignedSaleId: 'acc-stf-005',
        status: 'FollowUp',
        createdAt: `${twoDaysAgo}T14:00:00.000Z`,
        updatedAt: `${yesterday}T16:30:00.000Z`,
      },
      {
        id: 'lead-005',
        fullName: 'Bùi Hải Nam',
        phone: '0904778899',
        email: 'hainam.bui@gmail.com',
        schoolOrWork: 'Sinh viên Đại học Xây dựng',
        learningNeed: 'Cần test đầu vào trực tiếp tại cơ sở trước khi chốt lớp.',
        interestedCourseIds: ['beginners-toeic'],
        preferredBranchId: 'cs-hai-ba-trung',
        source: 'manual',
        consentSummary: 'Khách ghé trực tiếp quầy lễ tân cơ sở Hai Bà Trưng.',
        assignedSaleId: 'acc-stf-002',
        status: 'Consulting',
        createdAt: `${yesterday}T15:00:00.000Z`,
        updatedAt: `${yesterday}T15:30:00.000Z`,
      },
    ],
    consultations: [
      {
        id: 'csl-001',
        leadId: 'lead-002',
        consultedAt: `${yesterday}T12:15:00.000Z`,
        saleId: 'acc-stf-002',
        channel: 'phone',
        summary: 'Đã tư vấn chi tiết lộ trình 24 buổi lớp HBT-SB12 và chính sách cam kết đầu ra 700+.',
        identifiedNeed: 'Khách cần lớp sĩ số vừa phải, có giảng viên chữa kỹ Reading Part 7.',
        advisedCourseId: 'submarine-toeic',
        advisedClassId: 'sch-hbt-01',
        outcome: 'Khách rất quan tâm, hẹn xác nhận đóng phí giữ chỗ trong hôm nay.',
      },
      {
        id: 'csl-002',
        leadId: 'lead-003',
        consultedAt: `${twoDaysAgo}T15:30:00.000Z`,
        saleId: 'acc-stf-002',
        channel: 'in_person',
        summary: 'Khách làm bài test đầu vào đạt 220 điểm, đồng ý đăng ký lớp TOEIC-FD01.',
        identifiedNeed: 'Xây nền từ đầu trước khi lên khóa Camp Bomb.',
        advisedCourseId: 'foundation-toeic',
        advisedClassId: 'sch-hd-01',
        outcome: 'Đã lập hồ sơ đăng ký trình Giáo vụ phê duyệt.',
      },
      {
        id: 'csl-003',
        leadId: 'lead-004',
        consultedAt: `${yesterday}T16:25:00.000Z`,
        saleId: 'acc-stf-005',
        channel: 'message',
        summary: 'Gửi lịch khai giảng lớp Zoom ONL-CB11 và video học thử qua Zalo.',
        identifiedNeed: 'Cần linh hoạt xem lại record khi trùng ca trực.',
        advisedCourseId: 'camp-bomb-toeic',
        advisedClassId: 'sch-onl-01',
        outcome: 'Hẹn gọi lại tư vấn học phí ưu đãi.',
      },
    ],
    followUps: [
      {
        id: 'fup-001',
        leadId: 'lead-002',
        dueAt: `${today}T14:00:00.000Z`,
        note: 'Gọi xác nhận giữ chỗ lớp Submarine HBT-SB12 và hướng dẫn thủ tục nhập học.',
        assignedSaleId: 'acc-stf-002',
        status: 'Scheduled',
        createdAt: `${yesterday}T12:20:00.000Z`,
      },
      {
        id: 'fup-002',
        leadId: 'lead-004',
        dueAt: `${shiftIsoYmd(today, 1)}T19:00:00.000Z`,
        note: 'Hỏi phản hồi sau khi xem bài giảng mẫu lớp Online ONL-CB11.',
        assignedSaleId: 'acc-stf-005',
        status: 'Scheduled',
        createdAt: `${yesterday}T16:30:00.000Z`,
      },
      {
        id: 'fup-003',
        leadId: 'lead-005',
        dueAt: `${yesterday}T18:00:00.000Z`,
        note: 'Nhắc lịch đến làm bài kiểm tra đầu vào tại Cs. Hai Bà Trưng.',
        assignedSaleId: 'acc-stf-002',
        status: 'Scheduled',
        createdAt: `${twoDaysAgo}T10:00:00.000Z`,
      },
    ],
    leadStatusHistory: [
      {
        id: 'lsh-001',
        leadId: 'lead-003',
        fromStatus: 'Interested',
        toStatus: 'Registered',
        changedByUserId: 'acc-stf-002',
        changedByName: 'Lê Thanh Thảo',
        changedAt: `${yesterday}T10:15:00.000Z`,
        reason: 'Nộp hồ sơ đăng ký khóa học REG-2026-0003.',
      },
    ],
    registrations: [
      {
        id: 'reg-seed-001',
        registrationCode: 'REG-2026-0001',
        leadId: 'lead-003',
        courseId: 'foundation-toeic',
        branchId: 'cs-ha-dong',
        classId: 'sch-hd-01',
        saleId: 'acc-stf-002',
        scoreGoal: {
          skillCategory: 'listening_reading',
          currentScore: 220,
          targetScore: 380,
          milestoneId: 'ms-foundation',
          scaleVersionCode: 'ETS-LR-990',
        },
        commitment: {
          advisedOutcomeLabel: 'Nắm vững nền tảng ngữ âm & ngữ pháp (300–380+ TOEIC)',
          attendanceAndHomeworkConditions: 'Tham gia tối thiểu 90% số buổi học và nộp đủ BTVN.',
          consultationNote: 'Học viên rảnh các tối Thứ 2 - 4 - 6 tại Cs. Hà Đông.',
          customerConfirmedInfo: true,
        },
        estimatedTuition: {
          policyId: 'tp-foundation-2026',
          policyCode: 'CSHP-FD-2026',
          hasPricingData: true,
          listedTuitionVnd: 2_800_000,
          discountProgramName: 'Ưu đãi đăng ký sớm trước khai giảng 7 ngày',
          discountAmountVnd: 200_000,
          netEstimatedTuitionVnd: 2_600_000,
        },
        snapshot: {
          capturedAt: `${yesterday}T10:15:00.000Z`,
          courseCode: 'FOUNDATION',
          courseName: 'FOUNDATION TOEIC (Xây nền)',
          targetOutcomeLabel: 'Xây dựng nền tảng',
          branchName: 'Cơ sở 1 – Hà Đông',
          classCode: 'TOEIC-FD01',
          className: 'Foundation Xây nền – Tối 2-4-6 (Đang tuyển sinh)',
          classScheduleSummary: 'Thứ 2 - Thứ 4 - Thứ 6 (18:00 – 20:00)',
          classStartDate: nextWeek,
          listedTuitionVnd: 2_800_000,
          discountAmountVnd: 200_000,
          netEstimatedTuitionVnd: 2_600_000,
          scaleVersionCode: 'ETS-LR-990',
        },
        status: 'Submitted',
        createdAt: `${yesterday}T10:00:00.000Z`,
        submittedAt: `${yesterday}T10:15:00.000Z`,
        updatedAt: `${yesterday}T10:15:00.000Z`,
      },
      {
        id: 'reg-seed-002',
        registrationCode: 'REG-2026-0002',
        leadId: 'lead-002',
        courseId: 'submarine-toeic',
        branchId: 'cs-hai-ba-trung',
        classId: 'sch-hbt-01',
        saleId: 'acc-stf-002',
        scoreGoal: {
          skillCategory: 'listening_reading',
          currentScore: 530,
          targetScore: 750,
          milestoneId: 'ms-700',
          scaleVersionCode: 'ETS-LR-990',
        },
        commitment: {
          advisedOutcomeLabel: 'Cam kết đầu ra 700+ TOEIC',
          attendanceAndHomeworkConditions: 'Tham gia đầy đủ tối thiểu 90% buổi học và kỳ thi Giữa khóa.',
          consultationNote: 'Khách làm tại Deloitte, đăng ký lớp tối 3-5-7.',
          customerConfirmedInfo: true,
        },
        estimatedTuition: {
          policyId: 'tp-submarine-2026',
          policyCode: 'CSHP-SM-2026',
          hasPricingData: true,
          listedTuitionVnd: 4_800_000,
          discountProgramName: 'Ưu đãi học viên đăng ký sớm / chuyển tiếp',
          discountAmountVnd: 300_000,
          netEstimatedTuitionVnd: 4_500_000,
        },
        snapshot: {
          capturedAt: `${twoDaysAgo}T16:00:00.000Z`,
          courseCode: 'SUBMARINE',
          courseName: 'SUBMARINE TOEIC 700+',
          targetOutcomeLabel: '700+ TOEIC',
          branchName: 'Cơ sở 3 – Hai Bà Trưng',
          classCode: 'HBT-SB12',
          className: 'Submarine 700+ – Tối 3-5-7 (Cs. Hai Bà Trưng)',
          classScheduleSummary: 'Thứ 3 - Thứ 5 - Thứ 7 (18:30 – 20:30)',
          classStartDate: shiftIsoYmd(today, 15),
          listedTuitionVnd: 4_800_000,
          discountAmountVnd: 300_000,
          netEstimatedTuitionVnd: 4_500_000,
          scaleVersionCode: 'ETS-LR-990',
        },
        status: 'Draft',
        createdAt: `${twoDaysAgo}T16:00:00.000Z`,
        updatedAt: `${yesterday}T12:20:00.000Z`,
      },
    ],
    registrationStatusHistory: [
      {
        id: 'rsh-001',
        registrationId: 'reg-seed-001',
        fromStatus: 'Draft',
        toStatus: 'Submitted',
        changedByUserId: 'acc-stf-002',
        changedByName: 'Lê Thanh Thảo',
        changedAt: `${yesterday}T10:15:00.000Z`,
        note: 'Hoàn thiện hồ sơ và chuyển Giáo vụ thẩm định xếp lớp.',
      },
    ],
  }
}

export function readSalesMockStore(): SalesMockStoreState {
  return readMockCollection(SALES_CRM_MOCK_KEY, buildEmptySalesMockStore)
}

export function writeSalesMockStore(next: SalesMockStoreState): void {
  writeMockCollection(SALES_CRM_MOCK_KEY, next)
}

export function canAccessLead(lead: SalesLeadDto, actor: SalesActorContext): boolean {
  if (actor.scope === 'all' || actor.scope === 'own_department') return true
  if (actor.scope === 'branch') {
    return (
      Boolean(actor.branchId && lead.preferredBranchId === actor.branchId) ||
      lead.assignedSaleId === actor.userId
    )
  }
  return lead.assignedSaleId === actor.userId
}

function canAccessRegistration(reg: CourseRegistrationDto, actor: SalesActorContext): boolean {
  if (
    actor.scope === 'all' ||
    actor.scope === 'own_department' ||
    actor.canReviewRegistrations
  ) {
    return true
  }
  if (actor.scope === 'branch') {
    return (
      Boolean(actor.branchId && reg.branchId === actor.branchId) ||
      reg.saleId === actor.userId
    )
  }
  return reg.saleId === actor.userId
}

function normalizeSafeFacebookUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  const safe = toSafeHttpUrl(trimmed)
  if (!safe || safe.startsWith('/')) {
    throw new StaffApiClientError(
      'Liên kết Facebook phải bắt đầu bằng http:// hoặc https://.',
      400,
    )
  }
  if (!isValidFacebookUrl(safe)) {
    throw new StaffApiClientError(
      'Liên kết Facebook không hợp lệ (ví dụ: https://facebook.com/...).',
      400,
    )
  }
  return safe
}

function parseMinutes(hhmm: string): number | null {
  const parts = hhmm.trim().split(':')
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function extractDayTokens(studyDays: string): string[] {
  const lower = studyDays.toLowerCase()
  const tokens = new Set<string>()
  for (const m of lower.matchAll(/(?:thứ|thu|t)\s*([2-7])\b/g)) {
    tokens.add(`thứ${m[1]}`)
  }
  for (const m of lower.matchAll(/(?:^|[\s,\-/])([2-7])(?=$|[\s,\-/])/g)) {
    tokens.add(`thứ${m[1]}`)
  }
  if (/\bcn\b|chủ\s*nhật|chu\s*nhat/.test(lower)) {
    tokens.add('chủnhật')
  }
  return Array.from(tokens)
}

export function checkClassScheduleConflict(
  candidate: CenterClassOfferingDto,
  existingClasses: readonly CenterClassOfferingDto[],
): CenterClassOfferingDto | null {
  const candDays = extractDayTokens(candidate.studyDays)
  const candStart = parseMinutes(candidate.startTime)
  const candEnd = parseMinutes(candidate.endTime)
  if (candDays.length === 0 || candStart === null || candEnd === null) return null

  for (const other of existingClasses) {
    if (other.id === candidate.id) continue
    if (candidate.endDate && other.startDate > candidate.endDate) continue
    if (other.endDate && candidate.startDate > other.endDate) continue

    const otherDays = extractDayTokens(other.studyDays)
    const shareDay = candDays.some((d) => otherDays.includes(d))
    if (!shareDay) continue

    const oStart = parseMinutes(other.startTime)
    const oEnd = parseMinutes(other.endTime)
    if (oStart === null || oEnd === null) continue

    if (candStart < oEnd && oStart < candEnd) {
      return other
    }
  }
  return null
}

export function evaluatePreRegistrationChecks(params: {
  lead: SalesLeadDto | undefined
  courseExists: boolean
  branchExists: boolean
  selectedClass: CenterClassOfferingDto | undefined
  courseId: string
  branchId: string
  existingLeadRegistrations: readonly CourseRegistrationDto[]
  allClasses: readonly CenterClassOfferingDto[]
  excludeRegistrationId?: string
  todayYmdVn?: string
}): PreRegistrationValidationReport {
  const blockingErrors: string[] = []
  const warnings: string[] = []
  const todayYmd = params.todayYmdVn ?? getTodayIsoInVietnam()

  if (!params.lead) {
    blockingErrors.push('Chưa chọn khách hàng hợp lệ trong CRM.')
  }
  if (!params.courseExists) {
    blockingErrors.push('Khóa học đã chọn không tồn tại hoặc đã ngưng tuyển sinh.')
  }
  if (!params.branchExists) {
    blockingErrors.push('Cơ sở đào tạo đã chọn không tồn tại hoặc đang tạm ngưng.')
  }
  if (!params.selectedClass) {
    blockingErrors.push('Bắt buộc chọn một lớp cụ thể đang nhận đăng ký.')
  } else {
    const cls = params.selectedClass
    if (cls.courseId !== params.courseId) {
      blockingErrors.push('Lớp đã chọn không thuộc khóa học đang đăng ký.')
    }
    if (cls.branchId !== params.branchId) {
      blockingErrors.push('Lớp đã chọn không thuộc cơ sở đã chọn.')
    }
    if (cls.registrationDeadline && cls.registrationDeadline < todayYmd) {
      blockingErrors.push(
        `Lớp đã quá hạn nhận đăng ký (${cls.classCode} – hạn chót ${cls.registrationDeadline}).`,
      )
    }
    if (!isClassOpenForRegistration(cls)) {
      const rem = computeRemainingClassSeats(cls)
      if (rem !== null && rem <= 0) {
        blockingErrors.push(
          `Lớp ${cls.classCode} đã đủ sĩ số (${cls.enrolledStudents}/${cls.maxStudents}).`,
        )
      } else {
        blockingErrors.push(
          `Lớp ${cls.classCode} hiện không ở trạng thái nhận đăng ký (${cls.status}).`,
        )
      }
    }

    const activeRegs = params.existingLeadRegistrations.filter(
      (r) =>
        r.id !== params.excludeRegistrationId &&
        r.status !== 'Cancelled' &&
        r.status !== 'Rejected',
    )

    const duplicateSameClass = activeRegs.find((r) => r.classId === cls.id)
    if (duplicateSameClass) {
      blockingErrors.push(
        `Khách hàng đã có hồ sơ ${duplicateSameClass.registrationCode} (${REGISTRATION_STATUS_META[duplicateSameClass.status].label}) cho chính lớp ${cls.classCode}.`,
      )
    } else {
      const duplicateSameCourse = activeRegs.find((r) => r.courseId === params.courseId)
      if (duplicateSameCourse) {
        blockingErrors.push(
          `Khách hàng đã có hồ sơ đang hoạt động ${duplicateSameCourse.registrationCode} (${REGISTRATION_STATUS_META[duplicateSameCourse.status].label}) cho cùng khóa học này (Lớp ${duplicateSameCourse.snapshot.classCode}).`,
        )
      }
    }

    const activeRegisteredClasses = activeRegs
      .map((r) => params.allClasses.find((c) => c.id === r.classId))
      .filter((c): c is CenterClassOfferingDto => Boolean(c))

    const conflictClass = checkClassScheduleConflict(cls, activeRegisteredClasses)
    if (conflictClass) {
      const conflictTime = conflictClass.endTime
        ? `${conflictClass.startTime}–${conflictClass.endTime}`
        : conflictClass.startTime
      blockingErrors.push(
        `Xung đột lịch học với lớp ${conflictClass.classCode} (${conflictClass.studyDays}, ${conflictTime}) mà khách đã đăng ký.`,
      )
    }

    const remSeats = computeRemainingClassSeats(cls)
    if (remSeats === null) {
      warnings.push(
        `Lớp ${cls.classCode} chưa được cấu hình chỉ tiêu sĩ số tối đa; Giáo vụ sẽ kiểm tra sức chứa phòng học khi duyệt.`,
      )
    } else if (remSeats <= 3) {
      warnings.push(
        `Lớp ${cls.classCode} chỉ còn ${remSeats} chỗ trống. Vui lòng hoàn tất hồ sơ sớm để đảm bảo chỉ tiêu sĩ số của lớp.`,
      )
    }
  }

  return { blockingErrors, warnings }
}

function enrichLeads(
  leads: readonly SalesLeadDto[],
  consultations: readonly SalesConsultationDto[],
  followUps: readonly SalesFollowUpDto[],
): EnrichedLeadSummary[] {
  return leads.map((lead) => {
    const leadConsults = consultations
      .filter((c) => c.leadId === lead.id)
      .sort((a, b) => b.consultedAt.localeCompare(a.consultedAt))

    const nextScheduled = followUps
      .filter((f) => f.leadId === lead.id && f.status === 'Scheduled')
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]

    return {
      ...lead,
      lastContactedAt: leadConsults[0]?.consultedAt,
      nextFollowUp: nextScheduled,
    }
  })
}

export const salesApi = {
  async getDashboardData(
    actor: SalesActorContext,
    params: { period: SalesPeriodFilter; todayYmdVn: string; nowIso: string },
  ): Promise<SalesDashboardData> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<SalesDashboardData>(STAFF_API_ENDPOINTS.sales.dashboard, {
        period: params.period,
      })
    }

    await mockDelay(120)
    const store = readSalesMockStore()
    const scopedLeads = store.leads
      .filter((lead) => canAccessLead(lead, actor))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    const scopedLeadIds = new Set(scopedLeads.map((l) => l.id))
    const leadMap = new Map(scopedLeads.map((l) => [l.id, l]))

    const scopedConsultations = store.consultations.filter((c) => scopedLeadIds.has(c.leadId))
    const scopedFollowUps = store.followUps
      .filter((f) =>
        actor.scope === 'own'
          ? f.assignedSaleId === actor.userId && scopedLeadIds.has(f.leadId)
          : scopedLeadIds.has(f.leadId),
      )
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))

    const scopedRegistrations = store.registrations.filter((r) =>
      canAccessRegistration(r, actor),
    )

    const minYmd =
      params.period === 'today'
        ? params.todayYmdVn
        : shiftIsoYmd(params.todayYmdVn, params.period === '7d' ? -6 : -29)

    const newLeadsInPeriod = scopedLeads.filter(
      (l) => toVietnamYmd(l.createdAt) >= minYmd,
    ).length
    const untouchedNewLeadsCount = scopedLeads.filter((l) => l.status === 'New').length
    const activeConsultingCount = scopedLeads.filter(
      (l) =>
        l.status === 'Contacting' ||
        l.status === 'Consulting' ||
        l.status === 'FollowUp' ||
        l.status === 'Interested',
    ).length

    const scheduledDueTodayOrEarlier = scopedFollowUps.filter(
      (f) =>
        f.status === 'Scheduled' &&
        (f.dueAt < params.nowIso || toVietnamYmd(f.dueAt) <= params.todayYmdVn),
    )
    const overdueFollowUpsCount = scheduledDueTodayOrEarlier.filter(
      (f) => f.dueAt < params.nowIso,
    ).length
    const upcomingFollowUpsCount = scopedFollowUps.filter(
      (f) =>
        f.status === 'Scheduled' &&
        f.dueAt >= params.nowIso &&
        toVietnamYmd(f.dueAt) > params.todayYmdVn,
    ).length

    const registeredLeadsCount = scopedLeads.filter((l) => l.status === 'Registered').length
    const approvedOrConvertedInPeriod = scopedRegistrations.filter(
      (r) =>
        (r.status === 'Approved' || r.status === 'Converted') &&
        (toVietnamYmd(r.updatedAt) >= minYmd ||
          Boolean(r.submittedAt && toVietnamYmd(r.submittedAt) >= minYmd)),
    ).length
    const convertedRegistrationsCount = scopedRegistrations.filter(
      (r) => r.status === 'Converted',
    ).length
    const pendingReviewRegistrationsCount = scopedRegistrations.filter(
      (r) =>
        r.status === 'Submitted' ||
        r.status === 'Reviewing' ||
        r.status === 'NeedAdditionalInfo',
    ).length

    const approvedOrConvertedLeadIds = new Set(
      store.registrations
        .filter(
          (r) =>
            scopedLeadIds.has(r.leadId) &&
            (r.status === 'Approved' || r.status === 'Converted'),
        )
        .map((r) => r.leadId),
    )
    const convertedOrRegisteredLeadsCount = scopedLeads.filter(
      (l) => l.status === 'Registered' || approvedOrConvertedLeadIds.has(l.id),
    ).length
    const conversionRatePercent =
      scopedLeads.length === 0
        ? 0
        : Math.round((convertedOrRegisteredLeadsCount / scopedLeads.length) * 1000) / 10

    const activities: SalesActivityEvent[] = [
      ...scopedConsultations.map((c) => ({
        id: `act-c-${c.id}`,
        occurredAt: c.consultedAt,
        kind: 'consultation' as const,
        leadId: c.leadId,
        leadName: leadMap.get(c.leadId)?.fullName ?? 'Khách hàng',
        actorName: c.saleId === actor.userId ? actor.fullName : 'Nhân viên Tư vấn',
        description: `Tư vấn qua ${CONSULTATION_CHANNEL_LABELS[c.channel]}: ${c.summary}`,
      })),
      ...store.leadStatusHistory
        .filter((h) => scopedLeadIds.has(h.leadId))
        .map((h) => ({
          id: `act-s-${h.id}`,
          occurredAt: h.changedAt,
          kind: 'status_change' as const,
          leadId: h.leadId,
          leadName: leadMap.get(h.leadId)?.fullName ?? 'Khách hàng',
          actorName: h.changedByName,
          description: `Chuyển trạng thái sang "${LEAD_STATUS_META[h.toStatus].label}"${
            h.reason ? ` (${h.reason})` : ''
          }`,
        })),
      ...scopedFollowUps.map((f) => ({
        id: `act-f-${f.id}`,
        occurredAt: f.completedAt ?? f.createdAt,
        kind: 'followup' as const,
        leadId: f.leadId,
        leadName: leadMap.get(f.leadId)?.fullName ?? 'Khách hàng',
        actorName: f.assignedSaleId === actor.userId ? actor.fullName : 'Nhân viên Tư vấn',
        description:
          f.status === 'Scheduled'
            ? `Đặt lịch gọi lại (${FOLLOW_UP_STATUS_META[f.status].label}): ${f.note}`
            : `Cập nhật lịch gọi lại (${FOLLOW_UP_STATUS_META[f.status].label}): ${f.note}`,
      })),
      ...scopedRegistrations.map((r) => ({
        id: `act-r-${r.id}`,
        occurredAt: r.updatedAt,
        kind: 'registration' as const,
        leadId: r.leadId,
        leadName: leadMap.get(r.leadId)?.fullName ?? 'Khách hàng',
        actorName: r.saleId === actor.userId ? actor.fullName : 'Bộ phận Tuyển sinh',
        description: `Hồ sơ ${r.registrationCode} – Lớp ${r.snapshot.classCode} (${REGISTRATION_STATUS_META[r.status].label})`,
      })),
    ]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 8)

    return {
      kpis: {
        newLeadsInPeriod,
        untouchedNewLeadsCount,
        activeConsultingCount,
        followUpsDueOrOverdueToday: scheduledDueTodayOrEarlier.length,
        overdueFollowUpsCount,
        upcomingFollowUpsCount,
        registeredLeadsCount,
        approvedOrConvertedInPeriod,
        convertedRegistrationsCount,
        pendingReviewRegistrationsCount,
        conversionRatePercent,
      },
      leads: enrichLeads(scopedLeads, scopedConsultations, scopedFollowUps),
      followUps: scopedFollowUps.map((f) => ({
        ...f,
        leadName: leadMap.get(f.leadId)?.fullName ?? 'Khách hàng',
        leadPhone: leadMap.get(f.leadId)?.phone ?? '',
      })),
      recentActivities: activities,
    }
  },

  async findDuplicateLeads(
    actor: SalesActorContext,
    input: { phone: string; email?: string; excludeLeadId?: string },
  ): Promise<DuplicateLeadWarning[]> {
    const normalizedPhone = normalizeVnPhone(input.phone)
    const normalizedEmail = input.email?.trim().toLowerCase() ?? ''

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<DuplicateLeadWarning[]>(
        `${STAFF_API_ENDPOINTS.sales.leads}/duplicates`,
        {
          phone: normalizedPhone,
          email: normalizedEmail || undefined,
          excludeLeadId: input.excludeLeadId,
        },
      )
    }

    await mockDelay(60)
    const store = readSalesMockStore()
    const warnings: DuplicateLeadWarning[] = []

    for (const item of store.leads) {
      if (item.id === input.excludeLeadId) continue
      const samePhone =
        normalizedPhone.length >= 9 && normalizeVnPhone(item.phone) === normalizedPhone
      const sameEmail =
        normalizedEmail.length > 3 && (item.email?.toLowerCase() ?? '') === normalizedEmail

      if (samePhone || sameEmail) {
        const accessible = canAccessLead(item, actor)
        warnings.push({
          leadId: item.id,
          matchedBy: samePhone ? 'phone' : 'email',
          fullName: accessible ? item.fullName : 'Khách hàng đã tồn tại trong CRM',
          status: item.status,
          assignedSaleId: item.assignedSaleId,
          isAccessibleByCurrentActor: accessible,
        })
      }
    }

    return warnings
  },

  async createLead(actor: SalesActorContext, input: CreateLeadInput): Promise<SalesLeadDto> {
    const normalizedPhone = normalizeVnPhone(input.phone)
    if (!input.fullName.trim()) {
      throw new StaffApiClientError('Vui lòng nhập họ và tên khách hàng.', 400)
    }
    if (!isValidVnPhone(normalizedPhone)) {
      throw new StaffApiClientError(
        'Số điện thoại không đúng chuẩn 10 chữ số Việt Nam.',
        400,
      )
    }
    if (input.email?.trim() && !isValidEmail(input.email.trim())) {
      throw new StaffApiClientError('Địa chỉ email khách hàng không hợp lệ.', 400)
    }
    const safeFacebookUrl = normalizeSafeFacebookUrl(input.facebookUrl)
    if (!input.learningNeed.trim()) {
      throw new StaffApiClientError('Vui lòng ghi nhận nhu cầu học tập ban đầu của khách.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<SalesLeadDto>(STAFF_API_ENDPOINTS.sales.leads, {
        ...input,
        phone: normalizedPhone,
        facebookUrl: safeFacebookUrl,
      })
    }

    await mockDelay()
    const store = readSalesMockStore()

    if (!input.allowDuplicateOverride) {
      const duplicates = await this.findDuplicateLeads(actor, {
        phone: normalizedPhone,
        email: input.email,
      })
      if (duplicates.length > 0) {
        throw new StaffApiClientError(
          'Phát hiện khách hàng trùng số điện thoại hoặc email trong CRM. Hãy mở hồ sơ sẵn có hoặc xác nhận tạo mới.',
          409,
        )
      }
    }

    const nowIso = new Date().toISOString()
    const resolvedSaleId =
      actor.scope === 'own' ? actor.userId : input.assignedSaleId || actor.userId

    const created: SalesLeadDto = {
      id: createUniqueId('lead'),
      fullName: input.fullName.trim(),
      phone: normalizedPhone,
      email: input.email?.trim() || undefined,
      facebookUrl: safeFacebookUrl,
      schoolOrWork: input.schoolOrWork?.trim() || undefined,
      learningNeed: input.learningNeed.trim(),
      currentLevelNote: input.currentLevelNote?.trim() || undefined,
      targetGoalNote: input.targetGoalNote?.trim() || undefined,
      preferredContactTime: input.preferredContactTime?.trim() || undefined,
      interestedCourseIds: Array.from(new Set(input.interestedCourseIds)),
      preferredBranchId: input.preferredBranchId || undefined,
      interestedClassId: input.interestedClassId || undefined,
      source: input.source,
      consentSummary:
        input.consentSummary.trim() ||
        'Khách cung cấp thông tin trực tiếp để nhận tư vấn khóa học.',
      assignedSaleId: resolvedSaleId,
      status: 'New',
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    writeSalesMockStore({
      ...store,
      leads: [created, ...store.leads],
      leadStatusHistory: [
        {
          id: createUniqueId('lsh'),
          leadId: created.id,
          fromStatus: null,
          toStatus: 'New',
          changedByUserId: actor.userId,
          changedByName: actor.fullName,
          changedAt: nowIso,
          reason: 'Khởi tạo hồ sơ khách hàng tiềm năng mới.',
        },
        ...store.leadStatusHistory,
      ],
    })

    return created
  },

  async getLeadDetail(actor: SalesActorContext, leadId: string): Promise<SalesLeadDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<SalesLeadDetailBundle>(
        STAFF_API_ENDPOINTS.sales.leadDetail(leadId),
      )
    }

    await mockDelay(90)
    const store = readSalesMockStore()
    const lead = store.leads.find((l) => l.id === leadId)
    if (!lead) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ khách hàng tiềm năng.', 404)
    }
    if (!canAccessLead(lead, actor)) {
      throw new StaffApiClientError(
        'Khách hàng này nằm ngoài phạm vi phụ trách của bạn.',
        403,
      )
    }

    return {
      lead,
      consultations: store.consultations
        .filter((c) => c.leadId === leadId)
        .sort((a, b) => b.consultedAt.localeCompare(a.consultedAt)),
      followUps: store.followUps
        .filter((f) => f.leadId === leadId)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      statusHistory: store.leadStatusHistory
        .filter((h) => h.leadId === leadId)
        .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      registrations: store.registrations
        .filter((r) => r.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  },

  async updateLead(actor: SalesActorContext, input: UpdateLeadInput): Promise<SalesLeadDto> {
    const normalizedPhone = normalizeVnPhone(input.phone)
    if (!input.fullName.trim() || !isValidVnPhone(normalizedPhone)) {
      throw new StaffApiClientError('Họ tên hoặc số điện thoại cập nhật không hợp lệ.', 400)
    }
    if (input.email?.trim() && !isValidEmail(input.email.trim())) {
      throw new StaffApiClientError('Địa chỉ email không hợp lệ.', 400)
    }
    const safeFacebookUrl = normalizeSafeFacebookUrl(input.facebookUrl)
    if (!input.learningNeed.trim()) {
      throw new StaffApiClientError('Vui lòng ghi nhận nhu cầu học tập của khách hàng.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<SalesLeadDto>(
        STAFF_API_ENDPOINTS.sales.leadDetail(input.leadId),
        {
          ...input,
          phone: normalizedPhone,
          facebookUrl: safeFacebookUrl,
        },
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const idx = store.leads.findIndex((l) => l.id === input.leadId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy khách hàng.', 404)

    const existing = store.leads[idx]!
    if (!canAccessLead(existing, actor)) {
      throw new StaffApiClientError('Bạn không có quyền chỉnh sửa khách hàng ngoài phạm vi.', 403)
    }

    if (!input.allowDuplicateOverride) {
      const duplicates = await this.findDuplicateLeads(actor, {
        phone: normalizedPhone,
        email: input.email,
        excludeLeadId: existing.id,
      })
      if (duplicates.length > 0) {
        throw new StaffApiClientError(
          'Phát hiện khách hàng khác trùng số điện thoại hoặc email trong CRM. Hãy kiểm tra lại hoặc xác nhận cập nhật.',
          409,
        )
      }
    }

    const nextAssignedSaleId =
      actor.scope === 'own'
        ? existing.assignedSaleId
        : input.assignedSaleId || existing.assignedSaleId

    const updated: SalesLeadDto = {
      ...existing,
      fullName: input.fullName.trim(),
      phone: normalizedPhone,
      email: input.email?.trim() || undefined,
      facebookUrl: safeFacebookUrl,
      schoolOrWork: input.schoolOrWork?.trim() || undefined,
      learningNeed: input.learningNeed.trim(),
      currentLevelNote: input.currentLevelNote?.trim() || undefined,
      targetGoalNote: input.targetGoalNote?.trim() || undefined,
      preferredContactTime: input.preferredContactTime?.trim() || undefined,
      interestedCourseIds: Array.from(new Set(input.interestedCourseIds)),
      preferredBranchId: input.preferredBranchId || undefined,
      interestedClassId:
        input.interestedClassId !== undefined
          ? input.interestedClassId || undefined
          : existing.interestedClassId,
      assignedSaleId: nextAssignedSaleId,
      updatedAt: new Date().toISOString(),
    }

    const nextLeads = [...store.leads]
    nextLeads[idx] = updated

    const nextFollowUps =
      nextAssignedSaleId !== existing.assignedSaleId
        ? store.followUps.map((f) =>
            f.leadId === existing.id && f.status === 'Scheduled'
              ? { ...f, assignedSaleId: nextAssignedSaleId }
              : f,
          )
        : store.followUps

    writeSalesMockStore({ ...store, leads: nextLeads, followUps: nextFollowUps })
    return updated
  },

  async transitionLeadStatus(
    actor: SalesActorContext,
    input: TransitionLeadStatusInput,
  ): Promise<SalesLeadDto> {
    if (input.toStatus === 'Registered') {
      throw new StaffApiClientError(
        'Trạng thái "Registered" không được đặt thủ công; hệ thống chỉ tự động chuyển khi nộp hồ sơ đăng ký khóa học.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<SalesLeadDto>(
        `${STAFF_API_ENDPOINTS.sales.leadDetail(input.leadId)}/status`,
        input,
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const idx = store.leads.findIndex((l) => l.id === input.leadId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy khách hàng.', 404)

    const lead = store.leads[idx]!
    if (!canAccessLead(lead, actor)) {
      throw new StaffApiClientError('Không đủ quyền thao tác trên khách hàng này.', 403)
    }

    const allowed = getAllowedManualLeadTransitions(lead.status, actor.canAdminReopenLead)
    if (!allowed.includes(input.toStatus)) {
      throw new StaffApiClientError(
        `Chuyển trạng thái từ "${LEAD_STATUS_META[lead.status].label}" sang "${LEAD_STATUS_META[input.toStatus].label}" không hợp lệ theo quy trình nghiệp vụ.`,
        400,
      )
    }

    if (isLeadReopenTransition(lead.status, input.toStatus) && !input.reason?.trim()) {
      throw new StaffApiClientError(
        'Bắt buộc nhập lý do khi mở lại hồ sơ khách hàng về trạng thái Đang liên hệ.',
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const updated: SalesLeadDto = {
      ...lead,
      status: input.toStatus,
      updatedAt: nowIso,
    }

    const nextLeads = [...store.leads]
    nextLeads[idx] = updated

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      leadStatusHistory: [
        {
          id: createUniqueId('lsh'),
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: input.toStatus,
          changedByUserId: actor.userId,
          changedByName: actor.fullName,
          changedAt: nowIso,
          reason: input.reason?.trim() || undefined,
        },
        ...store.leadStatusHistory,
      ],
    })

    return updated
  },

  /**
   * Mỗi lần tư vấn tạo một bản ghi bất biến mới, tuyệt đối không ghi đè lần tư vấn cũ.
   */
  async createConsultation(
    actor: SalesActorContext,
    input: CreateConsultationInput,
  ): Promise<SalesConsultationDto> {
    if (!input.summary.trim() || !input.identifiedNeed.trim() || !input.outcome.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập đầy đủ Nội dung trao đổi, Nhu cầu ghi nhận và Kết quả buổi tư vấn.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<SalesConsultationDto>(
        STAFF_API_ENDPOINTS.sales.consultations,
        input,
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const leadIdx = store.leads.findIndex((l) => l.id === input.leadId)
    if (leadIdx === -1) throw new StaffApiClientError('Không tìm thấy khách hàng.', 404)

    const lead = store.leads[leadIdx]!
    if (!canAccessLead(lead, actor)) {
      throw new StaffApiClientError('Không đủ quyền ghi tư vấn cho khách hàng này.', 403)
    }

    const nowIso = new Date().toISOString()
    const created: SalesConsultationDto = {
      id: createUniqueId('cons'),
      leadId: lead.id,
      consultedAt: nowIso,
      saleId: actor.userId,
      channel: input.channel,
      summary: input.summary.trim(),
      identifiedNeed: input.identifiedNeed.trim(),
      advisedCourseId: input.advisedCourseId || undefined,
      advisedClassId: input.advisedClassId || undefined,
      outcome: input.outcome.trim(),
      note: input.note?.trim() || undefined,
    }

    const mergedCourses = input.advisedCourseId
      ? Array.from(new Set([...lead.interestedCourseIds, input.advisedCourseId]))
      : lead.interestedCourseIds

    const nextLeads = [...store.leads]
    nextLeads[leadIdx] = {
      ...lead,
      interestedCourseIds: mergedCourses,
      interestedClassId: input.advisedClassId || lead.interestedClassId,
      updatedAt: nowIso,
    }

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      consultations: [created, ...store.consultations],
    })

    return created
  },

  async createFollowUp(
    actor: SalesActorContext,
    input: CreateFollowUpInput,
  ): Promise<SalesFollowUpDto> {
    if (!input.dueAt || !input.note.trim()) {
      throw new StaffApiClientError(
        'Vui lòng chọn thời điểm hẹn gọi lại và nội dung cần trao đổi.',
        400,
      )
    }

    const parsedDue = input.dueAt.includes('T')
      ? new Date(input.dueAt)
      : new Date(`${input.dueAt}T09:00:00.000Z`)
    if (Number.isNaN(parsedDue.getTime())) {
      throw new StaffApiClientError('Thời điểm hẹn gọi lại không hợp lệ.', 400)
    }
    const dueIso = parsedDue.toISOString()

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<SalesFollowUpDto>(STAFF_API_ENDPOINTS.sales.followUps, {
        ...input,
        dueAt: dueIso,
      })
    }

    await mockDelay()
    const store = readSalesMockStore()
    const leadIdx = store.leads.findIndex((l) => l.id === input.leadId)
    if (leadIdx === -1) throw new StaffApiClientError('Không tìm thấy khách hàng.', 404)

    const lead = store.leads[leadIdx]!
    if (!canAccessLead(lead, actor)) {
      throw new StaffApiClientError('Không đủ quyền đặt lịch liên hệ cho khách hàng này.', 403)
    }

    const nowIso = new Date().toISOString()
    const created: SalesFollowUpDto = {
      id: createUniqueId('fup'),
      leadId: lead.id,
      dueAt: dueIso,
      note: input.note.trim(),
      assignedSaleId: lead.assignedSaleId,
      status: 'Scheduled',
      createdAt: nowIso,
    }

    const nextLeads = [...store.leads]
    nextLeads[leadIdx] = { ...lead, updatedAt: nowIso }

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      followUps: [created, ...store.followUps],
    })

    return created
  },

  async updateFollowUpStatus(
    actor: SalesActorContext,
    input: UpdateFollowUpStatusInput,
  ): Promise<SalesFollowUpDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<SalesFollowUpDto>(
        `${STAFF_API_ENDPOINTS.sales.followUps}/${input.followUpId}/status`,
        { status: input.status },
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const idx = store.followUps.findIndex((f) => f.id === input.followUpId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy lịch liên hệ lại.', 404)

    const target = store.followUps[idx]!
    const lead = store.leads.find((l) => l.id === target.leadId)
    if (lead && !canAccessLead(lead, actor)) {
      throw new StaffApiClientError('Không đủ quyền cập nhật lịch liên hệ này.', 403)
    }

    const allowed = FOLLOW_UP_ALLOWED_TRANSITIONS[target.status]
    if (!allowed.includes(input.status)) {
      throw new StaffApiClientError(
        `Lịch hẹn ở trạng thái "${FOLLOW_UP_STATUS_META[target.status].label}" không thể chuyển tiếp.`,
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const updated: SalesFollowUpDto = {
      ...target,
      status: input.status,
      completedAt: nowIso,
    }

    const nextFollowUps = [...store.followUps]
    nextFollowUps[idx] = updated
    writeSalesMockStore({ ...store, followUps: nextFollowUps })
    return updated
  },

  async listAccessibleLeads(actor: SalesActorContext): Promise<SalesLeadDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<SalesLeadDto[]>(STAFF_API_ENDPOINTS.sales.leads)
    }

    await mockDelay(80)
    const store = readSalesMockStore()
    return store.leads
      .filter((l) => canAccessLead(l, actor))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  /**
   * Gắn khóa quan tâm vào Lead kèm ghi nhận tư vấn đề xuất (KHÔNG tạo hồ sơ đăng ký hay Enrollment).
   */
  async attachCourseInterestToLead(
    actor: SalesActorContext,
    input: AttachCourseInterestInput,
  ): Promise<SalesLeadDto> {
    if (!input.proposalReason.trim()) {
      throw new StaffApiClientError('Vui lòng nhập lý do đề xuất khóa học cho khách hàng.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<SalesLeadDto>(
        `${STAFF_API_ENDPOINTS.sales.leadDetail(input.leadId)}/course-interest`,
        input,
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const idx = store.leads.findIndex((l) => l.id === input.leadId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy khách hàng.', 404)

    const lead = store.leads[idx]!
    if (!canAccessLead(lead, actor)) {
      throw new StaffApiClientError('Bạn không có quyền thao tác trên khách hàng này.', 403)
    }

    const nowIso = new Date().toISOString()
    const updatedLead: SalesLeadDto = {
      ...lead,
      interestedCourseIds: Array.from(new Set([...lead.interestedCourseIds, input.courseId])),
      interestedClassId: input.classId || lead.interestedClassId,
      learningNeed: input.identifiedNeed.trim() || lead.learningNeed,
      targetGoalNote: input.targetGoalNote.trim() || lead.targetGoalNote,
      updatedAt: nowIso,
    }

    const consultRecord: SalesConsultationDto = {
      id: createUniqueId('cons'),
      leadId: lead.id,
      consultedAt: nowIso,
      saleId: actor.userId,
      channel: 'phone',
      summary: `Đề xuất khóa học & gắn vào hồ sơ quan tâm: ${input.proposalReason.trim()}`,
      identifiedNeed: input.identifiedNeed.trim() || lead.learningNeed,
      advisedCourseId: input.courseId,
      advisedClassId: input.classId || undefined,
      outcome: `Mục tiêu tư vấn: ${input.targetGoalNote.trim() || 'Theo lộ trình khóa'}`,
    }

    const nextLeads = [...store.leads]
    nextLeads[idx] = updatedLead

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      consultations: [consultRecord, ...store.consultations],
    })

    return updatedLead
  },

  async listRegistrations(actor: SalesActorContext): Promise<CourseRegistrationDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<CourseRegistrationDto[]>(STAFF_API_ENDPOINTS.sales.registrations)
    }

    await mockDelay(100)
    const store = readSalesMockStore()
    return store.registrations
      .filter((r) => canAccessRegistration(r, actor))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getRegistrationDetail(
    actor: SalesActorContext,
    registrationId: string,
  ): Promise<RegistrationDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<RegistrationDetailBundle>(
        STAFF_API_ENDPOINTS.sales.registrationDetail(registrationId),
      )
    }

    await mockDelay(90)
    const store = readSalesMockStore()
    const registration = store.registrations.find((r) => r.id === registrationId)
    if (!registration) {
      throw new StaffApiClientError('Không tìm thấy hồ sơ đăng ký khóa học.', 404)
    }
    if (!canAccessRegistration(registration, actor)) {
      throw new StaffApiClientError(
        'Hồ sơ đăng ký này nằm ngoài phạm vi phụ trách của bạn.',
        403,
      )
    }

    const lead = store.leads.find((l) => l.id === registration.leadId) ?? null
    return {
      registration,
      lead,
      statusHistory: store.registrationStatusHistory
        .filter((h) => h.registrationId === registrationId)
        .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      relatedConsultations: store.consultations
        .filter((c) => c.leadId === registration.leadId)
        .sort((a, b) => b.consultedAt.localeCompare(a.consultedAt)),
    }
  },

  async saveOrSubmitRegistration(
    actor: SalesActorContext,
    input: UpsertCourseRegistrationInput,
  ): Promise<CourseRegistrationDto> {
    if (!USE_STAFF_MOCK_API) {
      if (input.registrationId) {
        return staffHttpClient.put<CourseRegistrationDto>(
          STAFF_API_ENDPOINTS.sales.registrationDetail(input.registrationId),
          input,
        )
      }
      return staffHttpClient.post<CourseRegistrationDto>(
        STAFF_API_ENDPOINTS.sales.registrations,
        input,
      )
    }

    await mockDelay()
    const [courses, branches, allClasses] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      trainingApi.listAllCenterClasses(),
    ])

    const store = readSalesMockStore()
    const leadIdx = store.leads.findIndex((l) => l.id === input.leadId)
    const lead = leadIdx >= 0 ? store.leads[leadIdx] : undefined

    if (!lead || !canAccessLead(lead, actor)) {
      throw new StaffApiClientError(
        'Khách hàng không hợp lệ hoặc nằm ngoài phạm vi phụ trách.',
        403,
      )
    }

    const course = courses.find((c) => c.id === input.courseId && c.status === 'active')
    const branch = branches.find((b) => b.id === input.branchId && b.isActive)
    const selectedClass = allClasses.find((c) => c.id === input.classId)

    const todayYmdVn = getTodayIsoInVietnam()
    const existingLeadRegs = store.registrations.filter((r) => r.leadId === lead.id)
    const check = evaluatePreRegistrationChecks({
      lead,
      courseExists: Boolean(course),
      branchExists: Boolean(branch),
      selectedClass,
      courseId: input.courseId,
      branchId: input.branchId,
      existingLeadRegistrations: existingLeadRegs,
      allClasses,
      excludeRegistrationId: input.registrationId,
      todayYmdVn,
    })

    if (input.mode === 'submit') {
      if (check.blockingErrors.length > 0) {
        throw new StaffApiClientError(check.blockingErrors[0]!, 400)
      }
      if (!input.commitment.customerConfirmedInfo) {
        throw new StaffApiClientError(
          'Vui lòng xác nhận đã trao đổi đầy đủ thông tin lộ trình và điều kiện học tập với khách hàng.',
          400,
        )
      }
    } else if (!course || !branch || !selectedClass) {
      throw new StaffApiClientError(
        'Để lưu nháp hồ sơ, vui lòng chọn tối thiểu Khách hàng, Khóa học, Cơ sở và Lớp dự kiến.',
        400,
      )
    }

    const resolvedCourse = course!
    const resolvedBranch = branch!
    const resolvedClass = selectedClass!
    const nowIso = new Date().toISOString()

    const snapshot: RegistrationSnapshotDto = {
      capturedAt: nowIso,
      courseCode: resolvedCourse.code,
      courseName: resolvedCourse.name,
      targetOutcomeLabel: resolvedCourse.targetScoreLabel,
      branchName: resolvedBranch.name,
      classCode: resolvedClass.classCode,
      className: resolvedClass.className,
      classScheduleSummary: resolvedClass.endTime
        ? `${resolvedClass.studyDays} (${resolvedClass.startTime} – ${resolvedClass.endTime})`
        : resolvedClass.studyDays === resolvedClass.startTime
          ? resolvedClass.studyDays
          : `${resolvedClass.studyDays} (${resolvedClass.startTime})`,
      classStartDate: resolvedClass.startDate,
      listedTuitionVnd: input.estimatedTuition.listedTuitionVnd,
      policyCode: input.estimatedTuition.policyCode,
      discountProgramName: input.estimatedTuition.discountProgramName,
      discountAmountVnd: input.estimatedTuition.discountAmountVnd,
      netEstimatedTuitionVnd: input.estimatedTuition.netEstimatedTuitionVnd,
      scaleVersionCode: input.scoreGoal.scaleVersionCode,
    }

    const nextStatus: CourseRegistrationStatus =
      input.mode === 'submit' ? 'Submitted' : 'Draft'

    let savedReg: CourseRegistrationDto
    let nextRegs = [...store.registrations]
    let nextRegHistory = [...store.registrationStatusHistory]

    if (input.registrationId) {
      const regIdx = store.registrations.findIndex((r) => r.id === input.registrationId)
      if (regIdx === -1) {
        throw new StaffApiClientError('Không tìm thấy hồ sơ đăng ký để cập nhật.', 404)
      }
      const prevReg = store.registrations[regIdx]!
      if (!canAccessRegistration(prevReg, actor)) {
        throw new StaffApiClientError('Bạn không có quyền chỉnh sửa hồ sơ đăng ký này.', 403)
      }
      if (prevReg.status !== 'Draft' && prevReg.status !== 'NeedAdditionalInfo') {
        throw new StaffApiClientError(
          'Chỉ được chỉnh sửa hồ sơ ở trạng thái Bản nháp hoặc Cần bổ sung thông tin.',
          400,
        )
      }

      savedReg = {
        ...prevReg,
        courseId: input.courseId,
        branchId: input.branchId,
        classId: input.classId,
        scoreGoal: input.scoreGoal,
        commitment: input.commitment,
        estimatedTuition: input.estimatedTuition,
        snapshot,
        status: nextStatus,
        submittedAt: input.mode === 'submit' ? nowIso : prevReg.submittedAt,
        updatedAt: nowIso,
      }
      nextRegs[regIdx] = savedReg

      if (prevReg.status !== nextStatus) {
        nextRegHistory = [
          {
            id: createUniqueId('rsh'),
            registrationId: savedReg.id,
            fromStatus: prevReg.status,
            toStatus: nextStatus,
            changedByUserId: actor.userId,
            changedByName: actor.fullName,
            changedAt: nowIso,
            note: input.submitNote?.trim() || 'Cập nhật và nộp hồ sơ đăng ký.',
          },
          ...nextRegHistory,
        ]
      }
    } else {
      const maxSeq = store.registrations.reduce((acc, r) => {
        const match = /(\d+)$/.exec(r.registrationCode)
        const num = match ? Number(match[1]) : 0
        return Number.isFinite(num) && num > acc ? num : acc
      }, store.registrations.length)
      const seqNum = String(maxSeq + 1).padStart(4, '0')
      const yearStr = todayYmdVn.slice(0, 4)

      savedReg = {
        id: createUniqueId('reg'),
        registrationCode: `REG-${yearStr}-${seqNum}`,
        leadId: lead.id,
        courseId: input.courseId,
        branchId: input.branchId,
        classId: input.classId,
        saleId: lead.assignedSaleId,
        scoreGoal: input.scoreGoal,
        commitment: input.commitment,
        estimatedTuition: input.estimatedTuition,
        snapshot,
        status: nextStatus,
        createdAt: nowIso,
        submittedAt: input.mode === 'submit' ? nowIso : undefined,
        updatedAt: nowIso,
      }
      nextRegs = [savedReg, ...nextRegs]
      nextRegHistory = [
        {
          id: createUniqueId('rsh'),
          registrationId: savedReg.id,
          fromStatus: null,
          toStatus: nextStatus,
          changedByUserId: actor.userId,
          changedByName: actor.fullName,
          changedAt: nowIso,
          note:
            input.submitNote?.trim() ||
            (nextStatus === 'Submitted'
              ? `Nộp hồ sơ đăng ký lớp ${resolvedClass.classCode}.`
              : `Lưu nháp hồ sơ đăng ký lớp ${resolvedClass.classCode}.`),
        },
        ...nextRegHistory,
      ]
    }

    const nextLeads = [...store.leads]
    let nextLeadHistory = [...store.leadStatusHistory]

    if (input.mode === 'submit' && lead.status !== 'Registered') {
      nextLeads[leadIdx] = {
        ...lead,
        interestedCourseIds: Array.from(new Set([...lead.interestedCourseIds, input.courseId])),
        preferredBranchId: input.branchId,
        interestedClassId: input.classId,
        status: 'Registered',
        updatedAt: nowIso,
      }
      nextLeadHistory = [
        {
          id: createUniqueId('lsh'),
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: 'Registered',
          changedByUserId: actor.userId,
          changedByName: `${actor.fullName} (Hệ thống tự động khi nộp ${savedReg.registrationCode})`,
          changedAt: nowIso,
          reason: `Tự động đặt Registered khi nộp hồ sơ đăng ký ${savedReg.registrationCode} vào lớp ${resolvedClass.classCode}.`,
        },
        ...nextLeadHistory,
      ]
    }

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      leadStatusHistory: nextLeadHistory,
      registrations: nextRegs,
      registrationStatusHistory: nextRegHistory,
    })

    return savedReg
  },

  async transitionRegistrationStatus(
    actor: SalesActorContext,
    input: TransitionRegistrationStatusInput,
  ): Promise<CourseRegistrationDto> {
    if (
      (input.toStatus === 'NeedAdditionalInfo' ||
        input.toStatus === 'Rejected' ||
        input.toStatus === 'Cancelled') &&
      !input.note?.trim()
    ) {
      throw new StaffApiClientError(
        'Vui lòng nhập ghi chú / lý do cụ thể khi Yêu cầu bổ sung, Từ chối hoặc Hủy hồ sơ.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<CourseRegistrationDto>(
        `${STAFF_API_ENDPOINTS.sales.registrationDetail(input.registrationId)}/status`,
        input,
      )
    }

    await mockDelay()
    const store = readSalesMockStore()
    const idx = store.registrations.findIndex((r) => r.id === input.registrationId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy hồ sơ đăng ký.', 404)

    const reg = store.registrations[idx]!
    if (!canAccessRegistration(reg, actor)) {
      throw new StaffApiClientError('Không đủ quyền thao tác trên hồ sơ đăng ký này.', 403)
    }

    const saleAllowed = SALE_REGISTRATION_TRANSITIONS[reg.status]
    const reviewerAllowed = actor.canReviewRegistrations
      ? REVIEWER_REGISTRATION_TRANSITIONS[reg.status]
      : []

    const combinedAllowed = Array.from(new Set([...saleAllowed, ...reviewerAllowed]))
    if (!combinedAllowed.includes(input.toStatus)) {
      throw new StaffApiClientError(
        `Chuyển trạng thái hồ sơ từ "${REGISTRATION_STATUS_META[reg.status].label}" sang "${REGISTRATION_STATUS_META[input.toStatus].label}" không hợp lệ với vai trò hiện tại.`,
        403,
      )
    }

    if (
      input.toStatus === 'Submitted' &&
      (reg.status === 'Draft' || reg.status === 'NeedAdditionalInfo')
    ) {
      const [courses, branches, allClasses] = await Promise.all([
        coursesApi.listCourses(),
        cmsApi.listBranches(),
        trainingApi.listAllCenterClasses(),
      ])
      const lead = store.leads.find((l) => l.id === reg.leadId)
      const course = courses.find((c) => c.id === reg.courseId && c.status === 'active')
      const branch = branches.find((b) => b.id === reg.branchId && b.isActive)
      const selectedClass = allClasses.find((c) => c.id === reg.classId)
      const existingLeadRegs = store.registrations.filter((r) => r.leadId === reg.leadId)

      const check = evaluatePreRegistrationChecks({
        lead,
        courseExists: Boolean(course),
        branchExists: Boolean(branch),
        selectedClass,
        courseId: reg.courseId,
        branchId: reg.branchId,
        existingLeadRegistrations: existingLeadRegs,
        allClasses,
        excludeRegistrationId: reg.id,
        todayYmdVn: getTodayIsoInVietnam(),
      })

      if (check.blockingErrors.length > 0) {
        throw new StaffApiClientError(check.blockingErrors[0]!, 422)
      }
      if (!reg.commitment.customerConfirmedInfo) {
        throw new StaffApiClientError(
          'Hồ sơ chưa xác nhận đã tư vấn đầy đủ thông tin lộ trình và điều kiện cam kết với khách hàng. Vui lòng chỉnh sửa hồ sơ để xác nhận trước khi nộp.',
          422,
        )
      }
    }

    const nowIso = new Date().toISOString()
    const updated: CourseRegistrationDto = {
      ...reg,
      status: input.toStatus,
      reviewerNote: actor.canReviewRegistrations
        ? input.note?.trim() || reg.reviewerNote
        : reg.reviewerNote,
      submittedAt: input.toStatus === 'Submitted' ? nowIso : reg.submittedAt,
      updatedAt: nowIso,
    }

    const nextRegs = [...store.registrations]
    nextRegs[idx] = updated

    const nextLeads = [...store.leads]
    let nextLeadHistory = [...store.leadStatusHistory]
    if (input.toStatus === 'Submitted') {
      const leadIdx = store.leads.findIndex((l) => l.id === reg.leadId)
      if (leadIdx >= 0 && store.leads[leadIdx]!.status !== 'Registered') {
        const prevLead = store.leads[leadIdx]!
        nextLeads[leadIdx] = { ...prevLead, status: 'Registered', updatedAt: nowIso }
        nextLeadHistory = [
          {
            id: createUniqueId('lsh'),
            leadId: prevLead.id,
            fromStatus: prevLead.status,
            toStatus: 'Registered',
            changedByUserId: actor.userId,
            changedByName: `${actor.fullName} (Hệ thống tự động)`,
            changedAt: nowIso,
            reason: `Hồ sơ ${reg.registrationCode} chuyển sang Submitted.`,
          },
          ...nextLeadHistory,
        ]
      }
    }

    writeSalesMockStore({
      ...store,
      leads: nextLeads,
      leadStatusHistory: nextLeadHistory,
      registrations: nextRegs,
      registrationStatusHistory: [
        {
          id: createUniqueId('rsh'),
          registrationId: reg.id,
          fromStatus: reg.status,
          toStatus: input.toStatus,
          changedByUserId: actor.userId,
          changedByName: actor.fullName,
          changedAt: nowIso,
          note: input.note?.trim() || undefined,
        },
        ...store.registrationStatusHistory,
      ],
    })

    return updated
  },
}
