import type { IsoDateString, IsoDateTimeString, VndAmount } from '../common/api.types'
import type { ToeicSkillCategory } from '../entities/core.types'

/* ============================================================================
 * 1. OPEN CLASS / COURSE OFFERING READ MODEL (DÙNG CHUNG ADMIN & SALES)
 * - Phân biệt rõ Course (Danh mục khóa học) vs Class (Lớp cụ thể mở tại cơ sở)
 * - Không tự suy diễn số chỗ trống nếu thiếu maxStudents hoặc enrolledStudents
 * ============================================================================ */

export const CLASS_RECRUITMENT_STATUSES = [
  'upcoming',
  'open',
  'full',
  'ongoing',
  'completed',
  'cancelled',
] as const

export type ClassRecruitmentStatus = (typeof CLASS_RECRUITMENT_STATUSES)[number]

export interface CenterClassOfferingDto {
  id: string
  classCode: string
  className: string
  courseId: string
  branchId: string
  studyMode: 'Offline' | 'Online'
  classTypeLabel?: string
  startDate: IsoDateString
  startDateDisplay?: string
  endDate?: IsoDateString
  studyDays: string
  startTime: string
  endTime: string
  /** Giảng viên phụ trách nếu đã phân công */
  teacherId?: string
  teacherName?: string
  roomLabel?: string
  /** Sức chứa tối đa và số đã ghi danh chính thức (Enrollment) */
  maxStudents?: number
  enrolledStudents?: number
  /** Hạn đăng ký lớp học */
  registrationDeadline?: IsoDateString
  status: ClassRecruitmentStatus
  isPublishedOnWeb: boolean
}

export function computeRemainingClassSeats(
  cls: Pick<CenterClassOfferingDto, 'maxStudents' | 'enrolledStudents'>,
): number | null {
  if (typeof cls.maxStudents !== 'number' || typeof cls.enrolledStudents !== 'number') {
    return null
  }
  return Math.max(0, cls.maxStudents - cls.enrolledStudents)
}

export function isClassOpenForRegistration(cls: CenterClassOfferingDto): boolean {
  if (cls.status !== 'open' && cls.status !== 'upcoming') {
    return false
  }
  const remaining = computeRemainingClassSeats(cls)
  if (remaining !== null && remaining <= 0) {
    return false
  }
  return true
}

/* ============================================================================
 * 2. LEAD, CONSULTATION & FOLLOW-UP STATE MACHINES
 * ============================================================================ */

export const LEAD_SOURCES = [
  'website-consultation',
  'schedule-modal',
  'course-page',
  'manual',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LEAD_STATUSES = [
  'New',
  'Contacting',
  'Consulting',
  'FollowUp',
  'Interested',
  'NotInterested',
  'Lost',
  'Registered',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

/**
 * Bảng chuyển trạng thái thủ công hợp lệ cho Sale.
 * Lưu ý: 'Registered' KHÔNG được đặt tay — hệ thống tự chuyển khi nộp CourseRegistration ('Submitted').
 */
export const LEAD_ALLOWED_MANUAL_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  New: ['Contacting', 'NotInterested', 'Lost'],
  Contacting: ['Consulting', 'FollowUp', 'NotInterested', 'Lost'],
  Consulting: ['FollowUp', 'Interested', 'NotInterested', 'Lost'],
  FollowUp: ['Contacting', 'Consulting', 'Interested', 'NotInterested', 'Lost'],
  Interested: ['FollowUp', 'NotInterested', 'Lost'],
  NotInterested: ['Contacting'],
  Lost: ['Contacting'],
  Registered: [],
}

export function getAllowedManualLeadTransitions(
  currentStatus: LeadStatus,
  canAdminReopenRegistered = false,
): readonly LeadStatus[] {
  if (currentStatus === 'Registered' && canAdminReopenRegistered) {
    return ['Contacting']
  }
  return LEAD_ALLOWED_MANUAL_TRANSITIONS[currentStatus]
}

export function isLeadReopenTransition(from: LeadStatus, to: LeadStatus): boolean {
  return (
    (from === 'NotInterested' || from === 'Lost' || from === 'Registered') &&
    to === 'Contacting'
  )
}

export const CONSULTATION_CHANNELS = ['phone', 'in_person', 'message', 'other'] as const
export type ConsultationChannel = (typeof CONSULTATION_CHANNELS)[number]

export const FOLLOW_UP_STATUSES = ['Scheduled', 'Completed', 'Missed', 'Cancelled'] as const
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

export const FOLLOW_UP_ALLOWED_TRANSITIONS: Record<FollowUpStatus, readonly FollowUpStatus[]> = {
  Scheduled: ['Completed', 'Missed', 'Cancelled'],
  Completed: [],
  Missed: [],
  Cancelled: [],
}

/* ============================================================================
 * 3. COURSE REGISTRATION STATE MACHINE & SNAPSHOT
 * ============================================================================ */

export const COURSE_REGISTRATION_STATUSES = [
  'Draft',
  'Submitted',
  'Reviewing',
  'NeedAdditionalInfo',
  'Approved',
  'Rejected',
  'Cancelled',
  'Converted',
] as const

export type CourseRegistrationStatus = (typeof COURSE_REGISTRATION_STATUSES)[number]

export const SALE_REGISTRATION_TRANSITIONS: Record<
  CourseRegistrationStatus,
  readonly CourseRegistrationStatus[]
> = {
  Draft: ['Submitted', 'Cancelled'],
  Submitted: ['Cancelled'],
  Reviewing: [],
  NeedAdditionalInfo: ['Submitted', 'Cancelled'],
  Approved: [],
  Rejected: [],
  Cancelled: [],
  Converted: [],
}

export const REVIEWER_REGISTRATION_TRANSITIONS: Record<
  CourseRegistrationStatus,
  readonly CourseRegistrationStatus[]
> = {
  Draft: [],
  Submitted: ['Reviewing', 'Cancelled'],
  Reviewing: ['NeedAdditionalInfo', 'Approved', 'Rejected'],
  NeedAdditionalInfo: ['Cancelled'],
  Approved: ['Cancelled'],
  Rejected: [],
  Cancelled: [],
  Converted: [],
}

/* ============================================================================
 * 4. SALES CRM CORE DTOS
 * ============================================================================ */

export interface SalesLeadDto {
  id: string
  fullName: string
  phone: string
  email?: string
  facebookUrl?: string
  schoolOrWork?: string
  learningNeed: string
  currentLevelNote?: string
  targetGoalNote?: string
  preferredContactTime?: string
  interestedCourseIds: string[]
  preferredBranchId?: string
  interestedClassId?: string
  source: LeadSource
  consentSummary: string
  assignedSaleId: string
  status: LeadStatus
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface SalesConsultationDto {
  id: string
  leadId: string
  consultedAt: IsoDateTimeString
  saleId: string
  channel: ConsultationChannel
  summary: string
  identifiedNeed: string
  advisedCourseId?: string
  advisedClassId?: string
  outcome: string
  note?: string
}

export interface SalesFollowUpDto {
  id: string
  leadId: string
  dueAt: IsoDateTimeString
  note: string
  assignedSaleId: string
  status: FollowUpStatus
  createdAt: IsoDateTimeString
  completedAt?: IsoDateTimeString
}

export interface LeadStatusHistoryDto {
  id: string
  leadId: string
  fromStatus: LeadStatus | null
  toStatus: LeadStatus
  changedByUserId: string
  changedByName: string
  changedAt: IsoDateTimeString
  reason?: string
}

export interface RegistrationScoreGoalDto {
  skillCategory: ToeicSkillCategory
  currentScore?: number
  targetScore: number
  milestoneId?: string
  scaleVersionCode: string
}

export interface RegistrationCommitmentDto {
  advisedOutcomeLabel: string
  attendanceAndHomeworkConditions: string
  consultationNote: string
  customerConfirmedInfo: boolean
}

export interface RegistrationEstimatedTuitionDto {
  policyId?: string
  policyCode?: string
  hasPricingData: boolean
  listedTuitionVnd: VndAmount
  discountProgramName?: string
  discountAmountVnd: VndAmount
  netEstimatedTuitionVnd: VndAmount
}

/**
 * Bản chụp bất biến tại thời điểm tạo/nộp hồ sơ đăng ký.
 * Việc Admin thay đổi giá khóa học hoặc chính sách học phí sau đó không làm biến đổi hồ sơ cũ.
 */
export interface RegistrationSnapshotDto {
  capturedAt: IsoDateTimeString
  courseCode: string
  courseName: string
  targetOutcomeLabel: string
  branchName: string
  classCode: string
  className: string
  classScheduleSummary: string
  classStartDate: IsoDateString
  listedTuitionVnd: VndAmount
  policyCode?: string
  discountProgramName?: string
  discountAmountVnd: VndAmount
  netEstimatedTuitionVnd: VndAmount
  scaleVersionCode: string
}

export interface CourseRegistrationDto {
  id: string
  registrationCode: string
  leadId: string
  courseId: string
  branchId: string
  classId: string
  saleId: string
  scoreGoal: RegistrationScoreGoalDto
  commitment: RegistrationCommitmentDto
  estimatedTuition: RegistrationEstimatedTuitionDto
  snapshot: RegistrationSnapshotDto
  status: CourseRegistrationStatus
  reviewerNote?: string
  createdAt: IsoDateTimeString
  submittedAt?: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface RegistrationStatusHistoryDto {
  id: string
  registrationId: string
  fromStatus: CourseRegistrationStatus | null
  toStatus: CourseRegistrationStatus
  changedByUserId: string
  changedByName: string
  changedAt: IsoDateTimeString
  note?: string
}
