import type { IsoDateString, IsoDateTimeString, VndAmount } from '../common/api.types'

export const LESSON_ACTIVITY_TYPES = ['class', 'review', 'demo', 'mid', 'final'] as const
export type LessonActivityType = (typeof LESSON_ACTIVITY_TYPES)[number]

/* ============================================================================
 * 1. ACCOUNTING PORTAL CONTRACTS (KẾ TOÁN & HỌC PHÍ)
 * - Tách bạch Học phí niêm yết (Course/Policy) vs Khoản phải thu (Receivable)
 *   vs Tiền thực thu đã xác nhận (Confirmed Payment) vs Hoàn tiền (Refund).
 * ============================================================================ */

export const ACCOUNTING_RECEIVABLE_STATUSES = [
  'Unpaid',
  'PartiallyPaid',
  'Paid',
  'Overdue',
  'Cancelled',
] as const

export type AccountingReceivableStatus = (typeof ACCOUNTING_RECEIVABLE_STATUSES)[number]

/**
 * Quy tắc ưu tiên trạng thái Khoản phải thu nhất quán toàn hệ thống:
 * 1. Cancelled (nếu đã hủy nghiệp vụ)
 * 2. Paid (nếu đã thu xác nhận >= tổng phải thu và tổng phải thu > 0)
 * 3. Overdue (nếu còn số dư chưa thanh toán > 0 và dueDate < todayYmdVn)
 * 4. PartiallyPaid (nếu đã thu xác nhận > 0 nhưng chưa đủ)
 * 5. Unpaid (chưa có khoản thu xác nhận nào)
 */
export function deriveAccountingReceivableStatus(params: {
  isCancelled: boolean
  totalReceivableVnd: VndAmount
  paidConfirmedVnd: VndAmount
  dueDate: IsoDateString
  todayYmdVn: IsoDateString
}): AccountingReceivableStatus {
  if (params.isCancelled) return 'Cancelled'
  const remaining = Math.max(0, params.totalReceivableVnd - params.paidConfirmedVnd)
  if (params.totalReceivableVnd > 0 && remaining === 0) return 'Paid'
  if (remaining > 0 && params.dueDate < params.todayYmdVn) return 'Overdue'
  if (params.paidConfirmedVnd > 0) return 'PartiallyPaid'
  return 'Unpaid'
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer'] as const
export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_TRANSACTION_STATUSES = [
  'Confirmed',
  'PendingVerification',
  'Voided',
] as const
export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number]

export const REFUND_STATUSES = [
  'Requested',
  'PendingApproval',
  'Approved',
  'Rejected',
  'Completed',
  'Cancelled',
] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export interface AccountingReceivableDto {
  id: string
  receivableCode: string
  studentId: string
  studentCode: string
  studentName: string
  studentPhone: string
  enrollmentId: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchId: string
  branchName: string
  tuitionPolicyId?: string
  tuitionPolicyCode?: string
  listedTuitionVnd: VndAmount
  discountAmountVnd: VndAmount
  discountReason?: string
  totalReceivableVnd: VndAmount
  dueDate: IsoDateString
  isCancelled: boolean
  cancelReason?: string
  note?: string
  createdByUserId: string
  createdByName: string
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface TransactionAuditLogDto {
  id: string
  transactionId: string
  action: 'created' | 'confirmed' | 'voided' | 'note_updated'
  actorUserId: string
  actorName: string
  occurredAt: IsoDateTimeString
  detail: string
}

export interface PaymentTransactionDto {
  id: string
  transactionCode: string
  receivableId: string
  receivableCode: string
  studentId: string
  studentCode: string
  studentName: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchId: string
  branchName: string
  amountVnd: VndAmount
  paymentMethod: PaymentMethodCode
  paidAt: IsoDateTimeString
  payerName: string
  recordedByUserId: string
  recordedByName: string
  status: PaymentTransactionStatus
  /** Thông tin đối chiếu chuyển khoản thủ công (không giả lập API ngân hàng tự động) */
  bankTransferMeta?: {
    bankName: string
    referenceCode: string
    transferContent: string
    verifiedByName?: string
    verifiedAt?: IsoDateTimeString
  }
  voidReason?: string
  voidedAt?: IsoDateTimeString
  voidedByName?: string
  note?: string
  receiptId?: string
  receiptNumber?: string
  createdAt: IsoDateTimeString
}

export interface PaymentReceiptDto {
  id: string
  receiptNumber: string
  transactionId: string
  transactionCode: string
  receivableId: string
  receivableCode: string
  studentId: string
  studentCode: string
  studentName?: string
  payerName: string
  cashierUserId: string
  cashierName: string
  amountVnd: VndAmount
  paymentMethod: PaymentMethodCode
  reasonContent: string
  issuedAt: IsoDateTimeString
  isVoided?: boolean
  voidReason?: string
  voidedAt?: IsoDateTimeString
  note?: string
}

export interface RefundRequestDto {
  id: string
  refundCode: string
  receivableId: string
  receivableCode: string
  originalTransactionId: string
  originalTransactionCode: string
  studentId: string
  studentCode: string
  studentName: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchId: string
  amountVnd: VndAmount
  paymentMethod: PaymentMethodCode
  reason: string
  status: RefundStatus
  requestedByUserId: string
  requestedByName: string
  requestedAt: IsoDateTimeString
  reviewedByUserId?: string
  reviewedByName?: string
  reviewedAt?: IsoDateTimeString
  reviewNote?: string
  completedAt?: IsoDateTimeString
}

/* ============================================================================
 * 2. ACADEMIC PORTAL CONTRACTS (GIÁO VỤ & QUẢN LÝ HỌC VIÊN / LỚP HỌC)
 * ============================================================================ */

export const STUDENT_LEARNING_STATUSES = [
  'waiting_placement',
  'studying',
  'hold',
  'completed',
  'dropped',
] as const

export type StudentLearningStatus = (typeof STUDENT_LEARNING_STATUSES)[number]

export const ACADEMIC_REQUEST_TYPES = ['hold', 'resume', 'transfer', 'retake'] as const
export type AcademicRequestType = (typeof ACADEMIC_REQUEST_TYPES)[number]

export const ACADEMIC_REQUEST_STATUSES = [
  'Pending',
  'Reviewing',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
] as const
export type AcademicRequestStatus = (typeof ACADEMIC_REQUEST_STATUSES)[number]

export interface AcademicStudentDto {
  id: string
  userAccountId?: string
  studentCode: string
  fullName: string
  phone: string
  email?: string
  dateOfBirth?: IsoDateString
  schoolOrWork?: string
  branchId: string
  branchName: string
  currentCourseId?: string
  currentCourseName?: string
  currentClassId?: string
  currentClassCode?: string
  entryScore: {
    lc: number
    rc: number
    total: number
  }
  goalScore: {
    lc: number
    rc: number
    total: number
  }
  commitmentSummary?: {
    advisedOutcomeLabel: string
    conditionsText: string
    sourceRegistrationCode?: string
  }
  learningStatus: StudentLearningStatus
  expectedStartMonth?: string // YYYY-MM cho hàng đợi xếp lớp theo tháng
  sourceRegistrationId?: string
  note?: string
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface StudentEnrollmentRecordDto {
  id: string
  enrollmentCode: string
  studentId: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchId: string
  branchName: string
  status: 'active' | 'hold' | 'transferred' | 'completed' | 'dropped'
  agreedTuitionVnd: VndAmount
  listedTuitionSnapshotVnd?: VndAmount
  discountSnapshotVnd?: VndAmount
  tuitionPolicyIdSnapshot?: string
  tuitionPolicyCodeSnapshot?: string
  billingExemptionReason?: 'transfer' | 'retake' | 'return_from_hold'
  sourceRegistrationCode?: string
  enrolledAt: IsoDateTimeString
  endedAt?: IsoDateTimeString
  note?: string
}

export interface ClassTransferHistoryDto {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  fromClassId: string
  fromClassCode: string
  toClassId: string
  toClassCode: string
  courseId: string
  reason: string
  transferredByUserId: string
  transferredByName: string
  transferredAt: IsoDateTimeString
}

export interface PlacementContactLogDto {
  id: string
  targetKey: string // studentId hoặc registrationId
  studentOrLeadName: string
  phone: string
  contactedAt: IsoDateTimeString
  contactedByUserId: string
  contactedByName: string
  resultSummary: string
  nextFollowUpDate?: IsoDateString
  note?: string
}

export interface StudentAcademicRequestDto {
  id: string
  requestCode: string
  studentId: string
  studentCode: string
  studentName: string
  studentPhone: string
  enrollmentId?: string
  currentCourseId: string
  currentCourseName: string
  currentClassId?: string
  currentClassCode?: string
  targetClassId?: string
  targetClassCode?: string
  requestType: AcademicRequestType
  reason: string
  detailNote: string
  effectiveDate: IsoDateString
  holdUntilDate?: IsoDateString
  status: AcademicRequestStatus
  submittedAt: IsoDateTimeString
  reviewedByUserId?: string
  reviewedByName?: string
  reviewedAt?: IsoDateTimeString
  resolutionNote?: string
}

export interface CourseSyllabusSessionItemDto {
  id: string
  sessionNumber: number
  activityType: LessonActivityType
  topicTitle: string
  learningObjectives: string
  lcSummary: string
  rcSummary: string
  teachingMaterials: string[]
}

export interface CourseSyllabusVersionDto {
  id: string
  courseId: string
  courseCode: string
  courseName: string
  versionCode: string
  status: 'draft' | 'active' | 'archived'
  effectiveFrom: IsoDateString
  summaryNote: string
  sessions: CourseSyllabusSessionItemDto[]
  updatedByName: string
  updatedAt: IsoDateTimeString
}

/* ============================================================================
 * 3. TEACHER PORTAL CONTRACTS (GIẢNG VIÊN – PHẠM VI ASSIGNED_CLASSES_ONLY)
 * ============================================================================ */

export const TEACHER_ATTENDANCE_STATUSES = [
  'Unmarked',
  'Present',
  'Late',
  'Excused',
  'Unexcused',
] as const
export type TeacherAttendanceStatus = (typeof TEACHER_ATTENDANCE_STATUSES)[number]

export const STUDENT_ATTENDANCE_VIEW_STATUSES = [
  'none',
  'on',
  'late',
  'excused',
  'absent',
] as const
export type StudentAttendanceViewStatus = (typeof STUDENT_ATTENDANCE_VIEW_STATUSES)[number]

export function mapTeacherToStudentAttendanceStatus(
  status: TeacherAttendanceStatus,
): StudentAttendanceViewStatus {
  switch (status) {
    case 'Present':
      return 'on'
    case 'Late':
      return 'late'
    case 'Excused':
      return 'excused'
    case 'Unexcused':
      return 'absent'
    case 'Unmarked':
      return 'none'
  }
}

export function mapStudentToTeacherAttendanceStatus(
  status: StudentAttendanceViewStatus,
): TeacherAttendanceStatus {
  switch (status) {
    case 'on':
      return 'Present'
    case 'late':
      return 'Late'
    case 'excused':
      return 'Excused'
    case 'absent':
      return 'Unexcused'
    case 'none':
      return 'Unmarked'
  }
}

export const TOEIC_EXAM_PART_KEYS = [
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7s',
  'p7d',
  'p7t',
] as const
export type ToeicExamPartKey = (typeof TOEIC_EXAM_PART_KEYS)[number]

export interface ToeicExamPartScoreDto {
  correct: number
  total: number
}

export type ToeicExamPartBreakdownDto = Record<ToeicExamPartKey, ToeicExamPartScoreDto>

export const TEACHER_SUBMISSION_STATUSES = [
  'NotSubmitted',
  'Submitted',
  'LateSubmitted',
  'Grading',
  'Graded',
  'ReturnedForRevision',
] as const
export type TeacherSubmissionStatus = (typeof TEACHER_SUBMISSION_STATUSES)[number]

export const ASSESSMENT_CATEGORIES = [
  'homework',
  'quiz',
  'regular',
  'mid',
  'final',
  'toeic_mock',
] as const
export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number]

export const TEACHING_REQUEST_STATUSES = [
  'Requested',
  'UnderReview',
  'Approved',
  'Rejected',
  'Cancelled',
] as const
export type TeachingRequestStatus = (typeof TEACHING_REQUEST_STATUSES)[number]

export const ASSIGNMENT_TARGET_SCOPES = [
  'whole_class',
  'group',
  'individual_students',
] as const
export type AssignmentTargetScope = (typeof ASSIGNMENT_TARGET_SCOPES)[number]

export interface ClassScheduleSessionDto {
  id: string
  classId: string
  classCode: string
  courseId: string
  courseName: string
  branchName: string
  teacherId: string
  teacherName: string
  sessionNumber: number
  weekIndex: number
  sessionDate: IsoDateString
  startTime: string
  endTime: string
  roomLabel: string
  activityType: LessonActivityType
  officialTitle: string
}

export interface TeachingSessionPlanDto {
  id: string
  sessionId: string
  classId: string
  teacherId: string
  topicTitle: string
  lcContent: string
  rcContent: string
  learningObjectives: string
  materialLinks: string[]
  homeworkBrief?: string
  teacherNote?: string
  completionStatus: 'planned' | 'in_progress' | 'completed'
  updatedAt: IsoDateTimeString
}

export interface TeacherAttendanceEntryDto {
  id: string
  sessionId: string
  classId: string
  studentId: string
  status: TeacherAttendanceStatus
  note?: string
  recordedByTeacherId?: string
  recordedByTeacherName?: string
  updatedAt?: IsoDateTimeString
}

export interface AttendanceAuditEntryDto {
  id: string
  sessionId: string
  classId: string
  studentId: string
  studentName: string
  previousStatus: TeacherAttendanceStatus
  nextStatus: TeacherAttendanceStatus
  changedByName: string
  changedAt: IsoDateTimeString
  reason?: string
}

export interface TeacherAssignmentRecordDto {
  id: string
  code: string
  classId: string
  classCode: string
  sessionId: string
  sessionNumber: number
  title: string
  instructions: string
  attachmentUrl?: string
  assignedDate: IsoDateString
  dueAt: IsoDateTimeString
  submissionFormat: 'drive_link' | 'lc_rc_sheet' | 'file_url'
  maxScore: number
  isDemoTest?: boolean
  partMaxQuestions?: {
    lc: number
    rc: number
  }
  targetScope: AssignmentTargetScope
  targetGroupLabel?: string
  targetStudentIds?: string[]
  status?: 'open' | 'closed'
  closedAt?: IsoDateTimeString
  createdByTeacherId: string
  createdByTeacherName: string
  createdAt: IsoDateTimeString
}

export interface TeacherSubmissionRecordDto {
  id: string
  assignmentId: string
  classId: string
  studentId: string
  studentCode: string
  studentName: string
  status: TeacherSubmissionStatus
  submissionUrl?: string
  studentAnswerNote?: string
  lcCorrect?: number
  rcCorrect?: number
  demoScores?: {
    lcScore: number
    rcScore: number
    totalScore: number
    isConfirmedByTeacher: boolean
  }
  evaluationOutcome?: 'passed' | 'failed'
  submittedAt?: IsoDateTimeString
  score: number | null
  teacherFeedback?: string
  gradedByTeacherId?: string
  gradedByTeacherName?: string
  gradedAt?: IsoDateTimeString
}

export interface StudentAssessmentGradeDto {
  id: string
  classId: string
  classCode: string
  studentId: string
  studentCode: string
  studentName: string
  category: AssessmentCategory
  assessmentTitle: string
  examDate: IsoDateString
  maxListeningScore: number
  maxReadingScore: number
  maxTotalScore: number
  /** null = Chưa đánh giá; 0 = 0 điểm thực tế */
  listeningScore: number | null
  readingScore: number | null
  totalScore: number | null
  partBreakdown?: ToeicExamPartBreakdownDto
  teacherComment?: string
  updatedByTeacherId: string
  updatedByTeacherName: string
  updatedAt: IsoDateTimeString
}

export interface GradeAuditEntryDto {
  id: string
  gradeId: string
  classId: string
  studentName: string
  assessmentTitle: string
  previousTotal: number | null
  nextTotal: number | null
  changedByName: string
  changedAt: IsoDateTimeString
  note?: string
}

export interface TeachingScheduleRequestDto {
  id: string
  requestCode: string
  classId: string
  classCode: string
  className: string
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  studyDays: string
  startTime: string
  endTime: string
  startDate: IsoDateString
  teacherId: string
  teacherCode: string
  teacherName: string
  note: string
  status: TeachingRequestStatus
  requestedAt: IsoDateTimeString
  reviewedByName?: string
  reviewedAt?: IsoDateTimeString
  reviewNote?: string
}
