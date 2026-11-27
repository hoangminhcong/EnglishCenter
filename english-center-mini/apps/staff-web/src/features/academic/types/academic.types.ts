import type {
  AcademicRequestStatus,
  AcademicRequestType,
  AcademicStudentDto,
  CenterClassOfferingDto,
  ClassRecruitmentStatus,
  ClassTransferHistoryDto,
  PlacementContactLogDto,
  StudentAcademicRequestDto,
  StudentAssessmentGradeDto,
  StudentEnrollmentRecordDto,
  StudentLearningStatus,
  TeachingScheduleRequestDto,
} from '@english-center/contracts'
import type { BadgeTone } from '@english-center/ui'

export const STUDENT_LEARNING_STATUS_META: Record<
  StudentLearningStatus,
  { label: string; tone: BadgeTone }
> = {
  waiting_placement: { label: 'Chờ xếp lớp', tone: 'warning' },
  studying: { label: 'Đang theo học', tone: 'success' },
  hold: { label: 'Đang bảo lưu', tone: 'info' },
  completed: { label: 'Đã hoàn thành khóa', tone: 'neutral' },
  dropped: { label: 'Thôi học', tone: 'danger' },
}

export const CLASS_STATUS_META: Record<
  ClassRecruitmentStatus,
  { label: string; tone: BadgeTone }
> = {
  upcoming: { label: 'Sắp khai giảng', tone: 'info' },
  open: { label: 'Đang mở ghi danh', tone: 'success' },
  full: { label: 'Đã đủ sĩ số', tone: 'warning' },
  ongoing: { label: 'Đang giảng dạy', tone: 'success' },
  completed: { label: 'Đã kết thúc', tone: 'neutral' },
  cancelled: { label: 'Đã hủy lớp', tone: 'danger' },
}

export const ACADEMIC_REQUEST_TYPE_LABELS: Record<AcademicRequestType, string> = {
  hold: 'Bảo lưu khóa học',
  resume: 'Khôi phục học sau Bảo lưu',
  transfer: 'Chuyển lớp học',
  retake: 'Đăng ký học lại',
}

export const ACADEMIC_REQUEST_STATUS_META: Record<
  AcademicRequestStatus,
  { label: string; tone: BadgeTone }
> = {
  Pending: { label: 'Chờ tiếp nhận', tone: 'warning' },
  Reviewing: { label: 'Đang thẩm định', tone: 'info' },
  Approved: { label: 'Đã phê duyệt', tone: 'success' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
  Cancelled: { label: 'Đã hủy đơn', tone: 'neutral' },
  Completed: { label: 'Đã hoàn tất xử lý', tone: 'success' },
}

export type SalesRegistrationReviewDecision =
  | 'Reviewing'
  | 'Approved'
  | 'NeedAdditionalInfo'
  | 'Rejected'

export interface PendingSalesRegistrationItem {
  id: string
  registrationCode: string
  status: 'Submitted' | 'Reviewing' | 'NeedAdditionalInfo'
  leadId: string
  leadFullName: string
  leadPhone: string
  leadEmail?: string
  saleOwnerId?: string
  saleOwnerName: string
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  classId: string
  classCode: string
  classStartDate: string
  classScheduleSummary?: string
  entryScoreTotal: number
  targetScoreTotal: number
  listedTuitionVnd: number
  discountAmountVnd: number
  netEstimatedTuitionVnd: number
  tuitionPolicyId?: string
  tuitionPolicyCode?: string
  discountReason?: string
  advisedOutcomeLabel: string
  commitmentConditionsText: string
  consultationNote?: string
  reviewerNote?: string
  submittedAt: string
  updatedAt: string
}

export interface PlacementQueueCandidate {
  candidateKey: string
  sourceType: 'approved_sales_registration' | 'waiting_student'
  registrationId?: string
  registrationCode?: string
  studentId?: string
  studentCode?: string
  fullName: string
  phone: string
  email?: string
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  preferredClassId?: string
  preferredClassCode?: string
  expectedMonth: string // YYYY-MM
  waitingSinceIso: string
  waitingDays: number
  entryScoreTotal: number
  targetScoreTotal: number
  agreedTuitionVnd: number
  commitmentLabel?: string
  saleOwnerName?: string
  statusLabel: string
  notes?: string
  latestContactLog?: PlacementContactLogDto
}

export interface AcademicDashboardData {
  kpis: {
    totalStudentsCount: number
    studyingStudentsCount: number
    activeClassesCount: number
    totalClassesCount: number
    waitingPlacementCount: number
    holdStudentsCount: number
    completedStudentsCount: number
    droppedStudentsCount: number
    droppedOrCompletedCount: number
    pendingRequestsCount: number
    pendingSalesRegistrationsCount: number
    upcomingClassesCount: number
  }
  waitingPlacementItems: PlacementQueueCandidate[]
  upcomingClasses: (CenterClassOfferingDto & { courseName: string; branchName: string })[]
  nearCapacityClasses: (CenterClassOfferingDto & {
    courseName: string
    branchName: string
    remainingSeats: number
  })[]
  pendingRequests: StudentAcademicRequestDto[]
  pendingTeachingRequestsCount: number
  pendingSalesRegistrationsCount: number
  recentActivities: {
    id: string
    occurredAt: string
    actorName: string
    summary: string
  }[]
}

export interface AcademicStudentDetailBundle {
  student: AcademicStudentDto
  enrollments: StudentEnrollmentRecordDto[]
  transferHistory: ClassTransferHistoryDto[]
  academicRequests: StudentAcademicRequestDto[]
  gradesReadOnly: StudentAssessmentGradeDto[]
}

export interface EnrichedAcademicClassItem extends CenterClassOfferingDto {
  courseName: string
  branchName: string
  remainingSeats: number | null
}

export interface AcademicClassDetailBundle {
  classInfo: EnrichedAcademicClassItem
  roster: {
    enrollment: StudentEnrollmentRecordDto
    student: AcademicStudentDto
  }[]
  transferHistory: ClassTransferHistoryDto[]
  teachingRequests: TeachingScheduleRequestDto[]
}

export interface UpsertAcademicClassInput {
  id?: string
  classCode: string
  className: string
  courseId: string
  branchId: string
  studyMode: 'Offline' | 'Online'
  startDate: string
  endDate?: string
  studyDays: string
  startTime: string
  endTime: string
  teacherId?: string
  roomLabel?: string
  maxStudents: number
  status: ClassRecruitmentStatus
  isPublishedOnWeb: boolean
}
