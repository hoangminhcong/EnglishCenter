import {
  TEACHER_ATTENDANCE_STATUSES,
  mapTeacherToStudentAttendanceStatus,
  type AcademicRequestStatus,
  type StudentAssessmentGradeDto,
  type StudentAttendanceViewStatus,
  type TeacherAttendanceStatus,
} from '@english-center/contracts';
import { toSafeHttpUrl } from '@english-center/utils';
import type {
  AssignmentItem,
  LegacySupportRequestStatus,
  SubmitDemoScoreInput,
  SubmitHomeworkInput,
  SupportRequestCategoryConfig,
  SupportRequestType,
} from './studentPortal.types';

export const SUPPORT_REQUEST_CATEGORIES: Record<
  SupportRequestType,
  SupportRequestCategoryConfig
> = {
  retake: {
    type: 'retake',
    title: 'Học lại',
    description: 'Đã hoàn thành khóa, đủ chuyên cần nhưng chưa đạt mục tiêu.',
    reasons: ['Chưa đạt mục tiêu đầu ra', 'Muốn ôn lại kiến thức'],
  },
  hold: {
    type: 'hold',
    title: 'Bảo lưu',
    description: 'Tạm dừng học vì lý do chính đáng.',
    reasons: [
      'Sức khỏe',
      'Công việc hoặc học tập bận',
      'Lý do gia đình',
      'Lý do khác',
    ],
  },
  resume: {
    type: 'resume',
    title: 'Bảo lưu quay lại học',
    description: 'Đã có đơn bảo lưu và muốn xếp lớp học tiếp.',
    reasons: ['Đã sẵn sàng học lại', 'Cần đổi ca khi quay lại'],
  },
  transfer: {
    type: 'transfer',
    title: 'Chuyển lớp',
    description: 'Đổi ca học, đổi lớp hoặc đổi cơ sở.',
    reasons: ['Trùng lịch học', 'Đổi cơ sở', 'Đổi ca học'],
  },
};

function isTeacherAttendanceStatus(
  value: unknown
): value is TeacherAttendanceStatus {
  return (
    typeof value === 'string' &&
    (TEACHER_ATTENDANCE_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Quy đổi đồng bộ 1-1 trạng thái điểm danh giữa Giảng viên (Staff Web) và Học viên (Client Web).
 */
export function resolveStudentAttendanceStatus(
  status?: StudentAttendanceViewStatus | TeacherAttendanceStatus,
  teacherStatus?: TeacherAttendanceStatus
): StudentAttendanceViewStatus {
  if (teacherStatus && isTeacherAttendanceStatus(teacherStatus)) {
    return mapTeacherToStudentAttendanceStatus(teacherStatus);
  }
  if (isTeacherAttendanceStatus(status)) {
    return mapTeacherToStudentAttendanceStatus(status);
  }
  return status ?? 'none';
}

/**
 * Chuẩn hóa trạng thái đơn học vụ khớp `AcademicRequestStatus` (tương thích ngược chữ thường cũ nếu có).
 */
export function normalizeAcademicRequestStatus(
  status: AcademicRequestStatus | LegacySupportRequestStatus
): AcademicRequestStatus {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Reviewing';
    case 'resolved':
      return 'Completed';
    default:
      return status;
  }
}

/**
 * Kiểm tra dữ liệu nộp BTVN (hỗ trợ các định dạng của Giảng viên: drive_link, file_url, lc_rc_sheet, note).
 */
export function validateHomeworkSubmission(
  assignment: AssignmentItem,
  input: SubmitHomeworkInput
): string | null {
  const format = assignment.submissionFormat ?? 'drive_link';
  const link = input.driveLink.trim();
  const note = input.studentAnswerNote?.trim() ?? '';

  if (format === 'drive_link') {
    if (!link) {
      return 'Hãy nhập link bài nộp.';
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(link);
    } catch {
      return 'Link không hợp lệ. Hãy dán đầy đủ, bắt đầu bằng https://';
    }
    if (
      parsedUrl.protocol !== 'https:' ||
      !/^(drive|docs)\.google\.com$/i.test(parsedUrl.hostname)
    ) {
      return 'Chỉ nhận link Google Drive hoặc Google Docs.';
    }
  } else if (format === 'file_url') {
    if (!link) {
      return 'Hãy nhập đường dẫn tệp bài nộp.';
    }
    const safe = toSafeHttpUrl(link);
    if (!safe || (!safe.startsWith('https://') && !safe.startsWith('http://'))) {
      return 'Đường dẫn bài nộp phải bắt đầu bằng https:// hoặc http://';
    }
  } else if (format === 'note') {
    if (note.length < 3 && !link) {
      return 'Hãy nhập nội dung ghi chú trả lời bài tập (ít nhất 3 ký tự).';
    }
    if (link && !toSafeHttpUrl(link)) {
      return 'Đường dẫn đính kèm không hợp lệ.';
    }
  } else if (format === 'lc_rc_sheet' && link) {
    if (!toSafeHttpUrl(link)) {
      return 'Đường dẫn đính kèm không hợp lệ.';
    }
  }

  const lcPart = assignment.parts?.find((p) => p.key === 'lc');
  const rcPart = assignment.parts?.find((p) => p.key === 'rc');

  if (lcPart) {
    if (
      !Number.isInteger(input.lcCorrect) ||
      input.lcCorrect < 0 ||
      input.lcCorrect > lcPart.maxQuestions
    ) {
      return `${lcPart.label}: nhập số nguyên từ 0 đến ${lcPart.maxQuestions}.`;
    }
  }

  if (rcPart) {
    if (
      !Number.isInteger(input.rcCorrect) ||
      input.rcCorrect < 0 ||
      input.rcCorrect > rcPart.maxQuestions
    ) {
      return `${rcPart.label}: nhập số nguyên từ 0 đến ${rcPart.maxQuestions}.`;
    }
  }

  return null;
}

/**
 * Kiểm tra điểm tự nhập Demo Test (0–495 cho từng kỹ năng LC và RC)
 */
export function validateDemoScoreSubmission(
  input: SubmitDemoScoreInput
): string | null {
  if (
    !Number.isInteger(input.lcScore) ||
    !Number.isInteger(input.rcScore) ||
    input.lcScore < 0 ||
    input.rcScore < 0 ||
    input.lcScore > 495 ||
    input.rcScore > 495
  ) {
    return 'Điểm mỗi phần là số nguyên từ 0 đến 495.';
  }
  return null;
}

/**
 * Tính tổng điểm Demo Test tham khảo từ LC và RC.
 */
export function calculateReferenceDemoTotal(
  lcScore: number,
  rcScore: number
): {
  lc: number;
  rc: number;
  total: number;
} {
  const lc = Math.min(495, Math.max(0, Math.round(lcScore)));
  const rc = Math.min(495, Math.max(0, Math.round(rcScore)));
  return {
    lc,
    rc,
    total: lc + rc,
  };
}

/**
 * Kiểm tra form gửi yêu cầu học vụ
 */
export function validateSupportRequestInput(input: {
  reason: string;
  content: string;
}): string | null {
  if (!input.reason.trim()) {
    return 'Hãy chọn lý do.';
  }
  if (input.content.trim().length < 10) {
    return 'Nội dung cần ít nhất 10 ký tự.';
  }
  return null;
}

function averageGradePercentages(
  grades: readonly StudentAssessmentGradeDto[]
): number | null {
  const valid = grades.filter(
    (g): g is StudentAssessmentGradeDto & { totalScore: number } =>
      g.totalScore !== null && g.maxTotalScore > 0
  );
  if (valid.length === 0) return null;
  const sumPct = valid.reduce(
    (acc, g) => acc + (g.totalScore / g.maxTotalScore) * 100,
    0
  );
  return Math.round((sumPct / valid.length) * 10) / 10;
}

export interface PortalWeightedGradeSummary {
  homeworkPercent: number | null;
  quizRegularPercent: number | null;
  midPercent: number | null;
  finalPercent: number | null;
  weightedAveragePercent: number | null;
  gradedBucketsCount: number;
  totalBucketsCount: number;
  completionState: 'none' | 'partial' | 'complete';
  completionLabel: string;
}

/**
 * Tính điểm trung bình trọng số khớp 1-1 với `TeacherGradebookPage` trên Staff Web:
 * BTVN 15% • Quiz/TX 15% • Mid 30% • Final 40% (bỏ qua các nhóm chưa chấm `null`, không biến `null` thành 0).
 */
export function computePortalWeightedGrades(
  grades: readonly StudentAssessmentGradeDto[]
): PortalWeightedGradeSummary {
  const hwGrades = grades.filter((g) => g.category === 'homework');
  const qrGrades = grades.filter(
    (g) => g.category === 'quiz' || g.category === 'regular'
  );
  const midGrades = grades.filter((g) => g.category === 'mid');
  const finalGrades = grades.filter((g) => g.category === 'final');

  const homeworkPercent = averageGradePercentages(hwGrades);
  const quizRegularPercent = averageGradePercentages(qrGrades);
  const midPercent = averageGradePercentages(midGrades);
  const finalPercent = averageGradePercentages(finalGrades);

  const buckets: Array<{ pct: number | null; weight: number }> = [
    { pct: homeworkPercent, weight: 0.15 },
    { pct: quizRegularPercent, weight: 0.15 },
    { pct: midPercent, weight: 0.3 },
    { pct: finalPercent, weight: 0.4 },
  ];

  let weightedSum = 0;
  let gradedWeightSum = 0;
  let gradedBucketsCount = 0;

  for (const bucket of buckets) {
    if (bucket.pct !== null) {
      weightedSum += bucket.pct * bucket.weight;
      gradedWeightSum += bucket.weight;
      gradedBucketsCount += 1;
    }
  }

  const weightedAveragePercent =
    gradedWeightSum > 0
      ? Math.round((weightedSum / gradedWeightSum) * 10) / 10
      : null;

  const completionState: 'none' | 'partial' | 'complete' =
    gradedBucketsCount === 0
      ? 'none'
      : gradedBucketsCount < buckets.length
        ? 'partial'
        : 'complete';

  const completionLabel =
    completionState === 'none'
      ? 'Chưa có điểm'
      : completionState === 'partial'
        ? 'Tạm tính (còn thiếu đầu điểm)'
        : 'Đủ đầu điểm';

  return {
    homeworkPercent,
    quizRegularPercent,
    midPercent,
    finalPercent,
    weightedAveragePercent,
    gradedBucketsCount,
    totalBucketsCount: buckets.length,
    completionState,
    completionLabel,
  };
}
