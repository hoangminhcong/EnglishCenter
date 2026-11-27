import { toSafeHttpUrl } from '@english-center/utils';
import {
  normalizeAcademicRequestStatus,
  resolveStudentAttendanceStatus,
} from '../model/studentPortal.schema';
import type {
  AcademicRequestStatus,
  AccountingReceivableStatus,
  AssignmentSubmissionStatus,
  LearningResource,
  LessonActivityType,
  LessonSessionStatus,
  StudentAttendanceViewStatus,
  StudentEnrollmentRecordDto,
  StudentLearningStatus,
  SupportRequestRecord,
  TeacherAttendanceStatus,
} from '../model/studentPortal.types';
import {
  ACADEMIC_REQUEST_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
  LESSON_ACTIVITY_LABELS,
  LESSON_SESSION_STATUS_LABELS,
  RECEIVABLE_STATUS_LABELS,
  STUDENT_LEARNING_STATUS_LABELS,
} from '../model/studentPortal.types';

export type PortalChipVariant = 'ok' | 'wn' | 'bad' | 'bl' | 'or' | 'muted';

const CHIP_STYLES: Record<PortalChipVariant, string> = {
  ok: 'bg-[#E4F4EC] text-[#25805A]',
  wn: 'bg-[#FDF1D6] text-[#9A6700]',
  bad: 'bg-[#FBE7E4] text-[#B93A2E]',
  bl: 'bg-[#EAF6FD] text-[#2878B8]',
  or: 'bg-[#FDE9DD] text-[#B34510]',
  muted: 'bg-[#F5FAFE] text-[#718096] border border-[#DCEAF3]',
};

export function PortalChip({
  label,
  variant,
}: {
  label: string;
  variant: PortalChipVariant;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${CHIP_STYLES[variant]}`}
    >
      {label}
    </span>
  );
}

export function LessonTypeChip({ type }: { type: LessonActivityType }) {
  const variant: PortalChipVariant =
    type === 'class' || type === 'review' ? 'bl' : 'or';
  return <PortalChip label={LESSON_ACTIVITY_LABELS[type]} variant={variant} />;
}

export function LessonSessionStatusChip({
  status,
}: {
  status: LessonSessionStatus;
}) {
  const variantMap: Record<LessonSessionStatus, PortalChipVariant> = {
    scheduled: 'bl',
    completed: 'ok',
    rescheduled: 'wn',
    cancelled: 'bad',
  };
  return (
    <PortalChip
      label={LESSON_SESSION_STATUS_LABELS[status]}
      variant={variantMap[status]}
    />
  );
}

export function AssignmentStatusChip({
  status,
}: {
  status: AssignmentSubmissionStatus;
}) {
  const variantMap: Record<AssignmentSubmissionStatus, PortalChipVariant> = {
    todo: 'wn',
    submitted: 'bl',
    passed: 'ok',
    failed: 'bad',
  };
  return (
    <PortalChip
      label={ASSIGNMENT_STATUS_LABELS[status]}
      variant={variantMap[status]}
    />
  );
}

export function AttendanceStatusChip({
  status,
  teacherStatus,
}: {
  status: StudentAttendanceViewStatus | TeacherAttendanceStatus;
  teacherStatus?: TeacherAttendanceStatus;
}) {
  const normalized = resolveStudentAttendanceStatus(status, teacherStatus);
  const variantMap: Record<StudentAttendanceViewStatus, PortalChipVariant> = {
    on: 'ok',
    late: 'wn',
    excused: 'bl',
    absent: 'bad',
    none: 'muted',
  };
  return (
    <PortalChip
      label={ATTENDANCE_STATUS_LABELS[normalized]}
      variant={variantMap[normalized]}
    />
  );
}

export function LearningStatusChip({
  status,
}: {
  status: StudentLearningStatus;
}) {
  const variantMap: Record<StudentLearningStatus, PortalChipVariant> = {
    waiting_placement: 'wn',
    studying: 'ok',
    hold: 'bl',
    completed: 'muted',
    dropped: 'bad',
  };
  return (
    <PortalChip
      label={STUDENT_LEARNING_STATUS_LABELS[status]}
      variant={variantMap[status]}
    />
  );
}

export function EnrollmentStatusChip({
  status,
}: {
  status: StudentEnrollmentRecordDto['status'];
}) {
  const variantMap: Record<
    StudentEnrollmentRecordDto['status'],
    PortalChipVariant
  > = {
    active: 'ok',
    hold: 'bl',
    transferred: 'wn',
    completed: 'muted',
    dropped: 'bad',
  };
  return (
    <PortalChip
      label={ENROLLMENT_STATUS_LABELS[status]}
      variant={variantMap[status]}
    />
  );
}

export function ReceivableStatusChip({
  status,
}: {
  status: AccountingReceivableStatus;
}) {
  const variantMap: Record<AccountingReceivableStatus, PortalChipVariant> = {
    Unpaid: 'wn',
    PartiallyPaid: 'bl',
    Paid: 'ok',
    Overdue: 'bad',
    Cancelled: 'muted',
  };
  return (
    <PortalChip
      label={RECEIVABLE_STATUS_LABELS[status]}
      variant={variantMap[status]}
    />
  );
}

export function AcademicRequestStatusChip({
  status,
}: {
  status: SupportRequestRecord['status'];
}) {
  const normalized = normalizeAcademicRequestStatus(status);
  const variantMap: Record<AcademicRequestStatus, PortalChipVariant> = {
    Pending: 'wn',
    Reviewing: 'bl',
    Approved: 'ok',
    Rejected: 'bad',
    Cancelled: 'muted',
    Completed: 'ok',
  };
  return (
    <PortalChip
      label={ACADEMIC_REQUEST_STATUS_LABELS[normalized]}
      variant={variantMap[normalized]}
    />
  );
}

export function PortalProgressBar({ percent }: { percent: number }) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-[9px] bg-[#EAF6FD]">
      <div
        className="h-full bg-[#75BDEB] transition-all duration-300"
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}

export function ResourceDocChip({ resource }: { resource: LearningResource }) {
  const safeUrl = toSafeHttpUrl(resource.url);
  if (!safeUrl) {
    return (
      <span
        title="Chưa có đường dẫn hợp lệ"
        className="inline-block rounded-full border border-[#DCEAF3] bg-[#EAF6FD] px-3 py-1 text-[12.5px] font-semibold text-[#718096]"
      >
        {resource.kind}: {resource.title}
      </span>
    );
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Mở ${resource.title} trong tab mới`}
      className="inline-block rounded-full border border-[#DCEAF3] bg-[#EAF6FD] px-3 py-1 text-[12.5px] font-semibold text-[#2878B8] transition-colors hover:border-[#75BDEB] hover:bg-[#A7D8F5]"
    >
      {resource.kind}: {resource.title}
    </a>
  );
}
