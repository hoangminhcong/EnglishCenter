import type {
  AcademicStudentDto,
  AssessmentCategory,
  AssignmentTargetScope,
  AttendanceAuditEntryDto,
  CenterClassOfferingDto,
  ClassScheduleSessionDto,
  GradeAuditEntryDto,
  LessonActivityType,
  StudentAssessmentGradeDto,
  TeacherAssignmentRecordDto,
  TeacherAttendanceEntryDto,
  TeacherAttendanceStatus,
  TeacherSubmissionRecordDto,
  TeacherSubmissionStatus,
  TeachingRequestStatus,
  TeachingScheduleRequestDto,
  TeachingSessionPlanDto,
} from '@english-center/contracts'
import type { BadgeTone } from '@english-center/ui'

export const ATTENDANCE_STATUS_META: Record<
  TeacherAttendanceStatus,
  { label: string; tone: BadgeTone }
> = {
  Unmarked: { label: 'Chưa điểm danh', tone: 'neutral' },
  Present: { label: 'Có mặt', tone: 'success' },
  Late: { label: 'Đi muộn', tone: 'info' },
  Excused: { label: 'Vắng có phép', tone: 'warning' },
  Unexcused: { label: 'Vắng không phép', tone: 'danger' },
}

export const SUBMISSION_STATUS_META: Record<
  TeacherSubmissionStatus,
  { label: string; tone: BadgeTone }
> = {
  NotSubmitted: { label: 'Chưa nộp', tone: 'neutral' },
  Submitted: { label: 'Đã nộp (Chờ chấm)', tone: 'info' },
  LateSubmitted: { label: 'Nộp muộn (Chờ chấm)', tone: 'warning' },
  Grading: { label: 'Đang chấm', tone: 'info' },
  Graded: { label: 'Đã chấm điểm', tone: 'success' },
  ReturnedForRevision: { label: 'Yêu cầu nộp lại', tone: 'danger' },
}

export const ASSESSMENT_CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  homework: 'Bài tập về nhà (15%)',
  quiz: 'Kiểm tra ngắn / Quiz (15%)',
  regular: 'Đánh giá thường xuyên (15%)',
  mid: 'Thi giữa khóa – Midterm (30%)',
  final: 'Thi cuối khóa – Final (40%)',
  toeic_mock: 'TOEIC Mock / Demo Test (Đối chiếu 990)',
}

export const LESSON_ACTIVITY_META: Record<
  LessonActivityType,
  { label: string; tone: BadgeTone }
> = {
  class: { label: 'Buổi học chính khóa', tone: 'info' },
  review: { label: 'Ôn tập / Chữa đề', tone: 'neutral' },
  demo: { label: 'Thi thử / Demo Test', tone: 'warning' },
  mid: { label: 'Thi Giữa khóa', tone: 'warning' },
  final: { label: 'Thi Cuối khóa', tone: 'success' },
}

export const TEACHING_REQUEST_STATUS_META: Record<
  TeachingRequestStatus,
  { label: string; tone: BadgeTone }
> = {
  Requested: { label: 'Chờ Giáo vụ duyệt', tone: 'warning' },
  UnderReview: { label: 'Đang xem xét', tone: 'info' },
  Approved: { label: 'Đã phân công chính thức', tone: 'success' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
  Cancelled: { label: 'Đã rút nguyện vọng', tone: 'neutral' },
}

export const TARGET_SCOPE_LABELS: Record<AssignmentTargetScope, string> = {
  whole_class: 'Toàn bộ lớp học',
  group: 'Nhóm học tập trong lớp',
  individual_students: 'Học viên cụ thể cần kèm thêm',
}

export function getDefaultMaxScoresForCategory(category: AssessmentCategory): {
  maxListening: number
  maxReading: number
} {
  if (category === 'homework' || category === 'quiz') {
    return { maxListening: 50, maxReading: 50 }
  }
  return { maxListening: 495, maxReading: 495 }
}

export function isSubmissionPastDue(submittedAt: string | undefined, dueAt: string): boolean {
  if (!submittedAt || !dueAt) return false
  const subMs = Date.parse(submittedAt)
  const dueMs = Date.parse(dueAt)
  if (!Number.isNaN(subMs) && !Number.isNaN(dueMs)) {
    return subMs > dueMs
  }
  return submittedAt > dueAt
}

export function getMondaySundayWeekRange(ymd: string): {
  mondayYmd: string
  sundayYmd: string
} {
  const parts = ymd.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const anchorUtc = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = anchorUtc.getUTCDay()
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const mondayUtc = new Date(Date.UTC(year, month - 1, day + offsetToMonday))
  const sundayUtc = new Date(Date.UTC(year, month - 1, day + offsetToMonday + 6))

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return {
    mondayYmd: fmt(mondayUtc),
    sundayYmd: fmt(sundayUtc),
  }
}

export function shiftMonthYmd(ymd: string, deltaMonths: number): string {
  const parts = ymd.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const targetFirst = new Date(Date.UTC(year, month - 1 + deltaMonths, 1))
  const maxDayInMonth = new Date(
    Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const clampedDay = Math.min(day, maxDayInMonth)
  const result = new Date(
    Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth(), clampedDay),
  )
  return result.toISOString().slice(0, 10)
}

export interface AssignedTeacherClassItem extends CenterClassOfferingDto {
  courseName: string
  branchName: string
  sessionsCount: number
  ungradedCount: number
  activeEnrolledCount: number
}

export type GradeCompletionState = 'none' | 'partial' | 'complete'

export interface StudentWeightedGradeSummary {
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  classCode: string
  homeworkPercent: number | null
  quizRegularPercent: number | null
  midPercent: number | null
  finalPercent: number | null
  toeicMockScore: number | null
  weightedAveragePercent: number | null
  gradedBucketsCount: number
  totalBucketsCount: number
  completionState: GradeCompletionState
  completionLabel: string
}

export interface StudentProgressSummary {
  student: AcademicStudentDto
  classId: string
  classCode: string
  courseName: string
  markedSessionsCount: number
  presentCount: number
  lateCount: number
  excusedCount: number
  unexcusedCount: number
  attendanceRatePercent: number | null
  assignedCount: number
  submittedOrGradedCount: number
  missingCount: number
  assignmentCompletionPercent: number | null
  homeworkScore: number | null
  quizScore: number | null
  regularScore: number | null
  processAveragePercent: number | null
  midScore: number | null
  finalScore: number | null
  toeicMockScore: number | null
  weightedAveragePercent: number | null
  needsSupport: boolean
  supportReasons: string[]
}

export interface UnmarkedSessionAlertItem extends ClassScheduleSessionDto {
  unmarkedCount: number
  totalStudents: number
}

export interface TeacherDashboardData {
  kpis: {
    assignedClassesCount: number
    todaySessionsCount: number
    upcomingSessionsCount: number
    ungradedSubmissionsCount: number
    overdueGradingCount: number
    studentsNeedingSupportCount: number
    unmarkedSessionsCount: number
  }
  assignedClasses: AssignedTeacherClassItem[]
  todaySessions: ClassScheduleSessionDto[]
  upcomingSessions: ClassScheduleSessionDto[]
  unmarkedSessions: UnmarkedSessionAlertItem[]
  pendingSubmissions: (TeacherSubmissionRecordDto & {
    assignmentCode: string
    assignmentTitle: string
    classCode: string
    dueAt: string
  })[]
  studentsNeedingSupport: StudentProgressSummary[]
}

export interface TeacherClassDetailBundle {
  classInfo: AssignedTeacherClassItem
  students: AcademicStudentDto[]
  sessions: ClassScheduleSessionDto[]
  teachingPlans: TeachingSessionPlanDto[]
  assignments: TeacherAssignmentRecordDto[]
  grades: StudentAssessmentGradeDto[]
  progressRows: StudentProgressSummary[]
}

export interface SessionWithPlanItem {
  session: ClassScheduleSessionDto
  plan: TeachingSessionPlanDto | null
}

export interface AttendanceSheetBundle {
  session: ClassScheduleSessionDto
  isFutureSession: boolean
  rows: {
    student: AcademicStudentDto
    entry: TeacherAttendanceEntryDto | null
    effectiveStatus: TeacherAttendanceStatus
  }[]
  auditLogs: AttendanceAuditEntryDto[]
}

export interface AssignmentWithSubmissionsItem {
  assignment: TeacherAssignmentRecordDto
  submissions: TeacherSubmissionRecordDto[]
  submittedCount: number
  gradedCount: number
}

export interface GradebookBundle {
  grades: StudentAssessmentGradeDto[]
  studentSummaries: StudentWeightedGradeSummary[]
  auditLogs: GradeAuditEntryDto[]
}

export interface OpenClassForTeachingItem extends CenterClassOfferingDto {
  courseName: string
  branchName: string
  conflictClassCode: string | null
  existingRequest: TeachingScheduleRequestDto | null
}
