/**
 * Domain Models & DTOs cho English Center Student Portal
 * Đồng bộ trực tiếp 1-1 với Staff Web thông qua `@english-center/contracts`.
 */
import {
  TOEIC_EXAM_PART_KEYS,
  mapTeacherToStudentAttendanceStatus,
  type AcademicRequestStatus,
  type AcademicRequestType,
  type AccountingReceivableStatus,
  type AssessmentCategory,
  type LessonActivityType,
  type PaymentMethodCode,
  type StudentAssessmentGradeDto,
  type StudentAttendanceViewStatus,
  type StudentEnrollmentRecordDto,
  type StudentLearningStatus,
  type StudentReceiptViewDto,
  type StudentTuitionItemDto,
  type StudentTuitionOverviewDto,
  type TeacherAttendanceStatus,
  type ToeicExamPartKey,
} from '@english-center/contracts';

export {
  TOEIC_EXAM_PART_KEYS,
  mapTeacherToStudentAttendanceStatus,
  type AcademicRequestStatus,
  type AcademicRequestType,
  type AccountingReceivableStatus,
  type AssessmentCategory,
  type LessonActivityType,
  type PaymentMethodCode,
  type StudentAssessmentGradeDto,
  type StudentAttendanceViewStatus,
  type StudentEnrollmentRecordDto,
  type StudentLearningStatus,
  type StudentReceiptViewDto,
  type StudentTuitionItemDto,
  type StudentTuitionOverviewDto,
  type TeacherAttendanceStatus,
  type ToeicExamPartKey,
};

export const LESSON_ACTIVITY_LABELS: Record<LessonActivityType, string> = {
  class: 'Học trên lớp',
  review: 'Ôn tập',
  demo: 'Demo Test',
  mid: 'Middle Test',
  final: 'Final Test',
};

export type LessonSessionStatus =
  | 'scheduled'
  | 'completed'
  | 'rescheduled'
  | 'cancelled';

export const LESSON_SESSION_STATUS_LABELS: Record<LessonSessionStatus, string> = {
  scheduled: 'Theo lịch',
  completed: 'Đã học',
  rescheduled: 'Đổi lịch / Học bù',
  cancelled: 'Tạm hoãn',
};

export const STUDENT_LEARNING_STATUS_LABELS: Record<
  StudentLearningStatus,
  string
> = {
  waiting_placement: 'Chờ xếp lớp',
  studying: 'Đang theo học',
  hold: 'Đang bảo lưu',
  completed: 'Đã hoàn thành',
  dropped: 'Đã thôi học',
};

export const ENROLLMENT_STATUS_LABELS: Record<
  StudentEnrollmentRecordDto['status'],
  string
> = {
  active: 'Đang theo học',
  hold: 'Đang bảo lưu',
  transferred: 'Đã chuyển lớp',
  completed: 'Đã hoàn thành',
  dropped: 'Đã thôi học',
};

export const BILLING_EXEMPTION_REASON_LABELS: Record<
  NonNullable<StudentEnrollmentRecordDto['billingExemptionReason']>,
  string
> = {
  transfer: 'Chuyển lớp',
  retake: 'Học lại',
  return_from_hold: 'Quay lại sau bảo lưu',
};

export const RECEIVABLE_STATUS_LABELS: Record<
  AccountingReceivableStatus,
  string
> = {
  Unpaid: 'Chưa thanh toán',
  PartiallyPaid: 'Đã đóng một phần',
  Paid: 'Đã hoàn tất',
  Overdue: 'Quá hạn',
  Cancelled: 'Đã hủy',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  cash: 'Tiền mặt tại quầy',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

export const ASSESSMENT_CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  homework: 'Bài tập về nhà (15%)',
  quiz: 'Kiểm tra ngắn / Quiz (15%)',
  regular: 'Đánh giá thường xuyên (15%)',
  mid: 'Thi giữa khóa – Mid (30%)',
  final: 'Thi cuối khóa – Final (40%)',
  toeic_mock: 'TOEIC Mock / Demo Test',
};

export type ResourceKind = 'PDF' | 'Audio' | 'Video' | 'Link';

export interface LearningResource {
  id: string;
  lessonId?: string;
  title: string;
  kind: ResourceKind;
  url: string;
  isCourseGeneral?: boolean;
}

export interface StudentCommitmentSummary {
  advisedOutcomeLabel: string;
  conditionsText: string;
  sourceRegistrationCode?: string;
}

export interface StudentProfile {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  schoolOrWork?: string;
  learningStatus?: StudentLearningStatus;
  branchName?: string;
  commitmentSummary?: StudentCommitmentSummary;
  entryScore: {
    lc: number;
    rc: number;
    total: number;
  };
  goalScore: {
    lc: number;
    rc: number;
    total: number;
  };
}

export interface StudentClassInfo {
  id: string;
  classCode: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  branchName: string;
  scheduleDays: string;
  scheduleTime: string;
  roomName: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  totalWeeks: number;
  totalSessions: number;
}

export interface LessonSession {
  id: string;
  learningPlanId: string;
  sessionNumber: number; // 1..24
  weekIndex: number; // 0..7 (Tuần 1..8)
  date: string; // ISO YYYY-MM-DD
  type: LessonActivityType;
  title: string;
  lcContent: string;
  rcContent: string;
  resources: LearningResource[];
  assignmentId?: string;
  startTime?: string;
  endTime?: string;
  roomName?: string;
  teacherName?: string;
  learningObjectives?: string;
  homeworkSummary?: string;
  sessionStatus?: LessonSessionStatus;
}

export interface AssignmentPartConfig {
  key: 'lc' | 'rc';
  label: string;
  maxQuestions: number;
}

export type HomeworkSubmissionFormat =
  | 'drive_link'
  | 'lc_rc_sheet'
  | 'file_url'
  | 'note';

export type AssignmentSubmissionStatus =
  | 'todo'
  | 'submitted'
  | 'passed'
  | 'failed';

export const ASSIGNMENT_STATUS_LABELS: Record<
  AssignmentSubmissionStatus,
  string
> = {
  todo: 'Cần nộp',
  submitted: 'Chờ kiểm tra',
  passed: 'Đã đạt',
  failed: 'Chưa đạt',
};

export interface AssignmentItem {
  id: string;
  lessonId: string;
  sessionNumber: number;
  weekIndex: number;
  code: string;
  title: string;
  instructions?: string;
  attachmentUrl?: string;
  submissionFormat?: HomeworkSubmissionFormat;
  maxScore?: number;
  isClosed?: boolean;
  assignedDate: string; // ISO YYYY-MM-DD
  dueDate: string; // ISO string with 23:00
  isDemoTest: boolean;
  parts: AssignmentPartConfig[] | null;
}

export interface AssignmentSubmission {
  assignmentId: string;
  studentId: string;
  status: AssignmentSubmissionStatus;
  driveLink?: string;
  studentAnswerNote?: string;
  partScores?: {
    lc: number;
    rc: number;
  };
  demoScores?: {
    lc: number;
    rc: number;
    total: number;
  };
  score?: number | null;
  isConfirmedByTeacher?: boolean;
  teacherComment?: string;
  teacherFeedback?: string;
  gradedByTeacherName?: string;
  gradedAt?: string;
  submittedAt?: string;
}

export interface AssignmentWithSubmission extends AssignmentItem {
  submission: AssignmentSubmission;
  isUnlocked: boolean;
  isOverdue: boolean;
}

export interface SubmitHomeworkInput {
  assignmentId: string;
  driveLink: string;
  studentAnswerNote?: string;
  lcCorrect: number;
  rcCorrect: number;
}

export interface SubmitDemoScoreInput {
  assignmentId: string;
  lcScore: number;
  rcScore: number;
}

export type AttendanceStatus = StudentAttendanceViewStatus;

export const ATTENDANCE_STATUS_LABELS: Record<
  StudentAttendanceViewStatus,
  string
> = {
  on: 'Đúng giờ',
  late: 'Muộn',
  excused: 'Có phép',
  absent: 'Không phép',
  none: 'Chưa học',
};

export interface AttendanceRecord {
  id: string;
  lessonId: string;
  sessionNumber: number;
  date: string; // ISO YYYY-MM-DD
  lessonTitle: string;
  lessonType: LessonActivityType;
  status: StudentAttendanceViewStatus | TeacherAttendanceStatus;
  teacherStatus?: TeacherAttendanceStatus;
  note?: string;
}

export type ToeicPartKey = ToeicExamPartKey;

export const TOEIC_PART_LABELS: Record<ToeicExamPartKey, string> = {
  p1: 'Part 1',
  p2: 'Part 2',
  p3: 'Part 3',
  p4: 'Part 4',
  p5: 'Part 5',
  p6: 'Part 6',
  p7s: 'Part 7 đoạn đơn',
  p7d: 'Part 7 đoạn đôi',
  p7t: 'Part 7 đoạn ba',
};

export interface ExamPartAccuracy {
  correct: number;
  total: number;
}

export interface OfficialExamRecord {
  id: string;
  examType: 'mid' | 'final';
  examDate: string; // ISO YYYY-MM-DD
  lcScore: number;
  rcScore: number;
  totalScore: number;
  isConfirmed: boolean;
  parts: Record<ToeicExamPartKey, ExamPartAccuracy>;
}

export interface StudentExamResultsOverview {
  entryScore: {
    lc: number;
    rc: number;
    total: number;
  };
  goalScore: {
    lc: number;
    rc: number;
    total: number;
  };
  midTerm: OfficialExamRecord | null;
  finalTerm: OfficialExamRecord | null;
  expectedFinalDate?: string;
}

export type SupportRequestType = AcademicRequestType;

export type LegacySupportRequestStatus = 'pending' | 'processing' | 'resolved';

export const ACADEMIC_REQUEST_STATUS_LABELS: Record<
  AcademicRequestStatus,
  string
> = {
  Pending: 'Chờ tiếp nhận',
  Reviewing: 'Đang thẩm định',
  Approved: 'Đã phê duyệt',
  Rejected: 'Từ chối',
  Cancelled: 'Đã hủy đơn',
  Completed: 'Đã hoàn tất',
};

export interface SupportRequestCategoryConfig {
  type: AcademicRequestType;
  title: string;
  description: string;
  reasons: string[];
}

export interface SupportRequestRecord {
  id: string;
  requestCode?: string;
  studentId: string;
  type: AcademicRequestType;
  requestType?: AcademicRequestType;
  reason: string;
  content: string;
  detailNote?: string;
  effectiveDate?: string;
  holdUntilDate?: string;
  targetClassCode?: string;
  contact?: string;
  createdAt: string;
  submittedAt?: string;
  status: AcademicRequestStatus | LegacySupportRequestStatus;
  reviewedByName?: string;
  reviewedAt?: string;
  resolutionNote?: string;
}

export interface CreateSupportRequestInput {
  type: AcademicRequestType;
  reason: string;
  content: string;
  effectiveDate?: string;
  holdUntilDate?: string;
  contact?: string;
}

export interface StudentPortalDataset {
  hasEnrollment: boolean;
  student: StudentProfile;
  classInfo: StudentClassInfo | null;
  enrollments?: StudentEnrollmentRecordDto[];
  assessmentGrades?: StudentAssessmentGradeDto[];
  generalResources: LearningResource[];
  lessons: LessonSession[];
  assignments: AssignmentWithSubmission[];
  attendance: AttendanceRecord[];
  examResults: StudentExamResultsOverview;
  supportRequests: SupportRequestRecord[];
  referenceToday: string; // ISO YYYY-MM-DD
}
