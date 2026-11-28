import { Link, useNavigate } from 'react-router-dom';
import type { StudentAttendanceViewStatus } from '@english-center/contracts';
import { ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { formatDateTimeVi } from '@/utils/format';
import { useStudentPortalData } from '../hooks/useStudentPortal';
import { NoEnrollmentCard } from '../components/NoEnrollmentCard';
import {
  AssignmentStatusChip,
  LearningStatusChip,
  LessonTypeChip,
  PortalChip,
  PortalProgressBar,
  ResourceDocChip,
} from '../components/PortalUiBits';
import { resolveStudentAttendanceStatus } from '../model/studentPortal.schema';
import {
  ATTENDANCE_STATUS_LABELS,
  LESSON_ACTIVITY_LABELS,
} from '../model/studentPortal.types';
import {
  formatFullDateVi,
  formatShortWeekdayDate,
  getWeekIndexFromStart,
} from '../utils/portalDateUtils';

const ATTENDANCE_SQUARE_STYLES: Record<StudentAttendanceViewStatus, string> = {
  on: 'bg-[#2878B8] border-[#2878B8]',
  late: 'bg-[#A7D8F5] border-[#75BDEB]',
  excused: 'bg-[#EAF6FD] border-[#75BDEB]',
  absent: 'bg-[#B93A2E] border-[#B93A2E]',
  none: 'bg-white border-[#DCEAF3]',
};

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStudentPortalData();

  if (isLoading) {
    return <LoadingBlock label="Đang tải dữ liệu học tập của bạn..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu Cổng học viên. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data.hasEnrollment || !data.classInfo) {
    return <NoEnrollmentCard studentName={data.student.fullName} />;
  }

  const {
    student,
    classInfo,
    lessons,
    assignments,
    attendance,
    examResults,
    referenceToday,
  } = data;

  const unlockedAssignments = assignments.filter((a) => a.isUnlocked);
  const completedLessonsCount = lessons.filter(
    (s) =>
      s.sessionStatus === 'completed' ||
      (s.sessionStatus !== 'cancelled' && s.date <= referenceToday)
  ).length;

  const todoList = unlockedAssignments
    .filter((a) => a.submission.status === 'todo')
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  const updatedList = unlockedAssignments
    .filter((a) => a.submission.status !== 'todo')
    .sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  const recentAssignments = [...todoList, ...updatedList].slice(0, 5);

  const passedCount = unlockedAssignments.filter(
    (a) => a.submission.status === 'passed'
  ).length;
  const submittedCount = unlockedAssignments.filter(
    (a) => a.submission.status !== 'todo'
  ).length;
  const failedCount = unlockedAssignments.filter(
    (a) => a.submission.status === 'failed'
  ).length;
  const missingOverdueCount = unlockedAssignments.filter(
    (a) => a.isOverdue
  ).length;

  const normalizedAttendanceStatuses = attendance.map((item) =>
    resolveStudentAttendanceStatus(item.status, item.teacherStatus)
  );

  const countAttendance = (st: StudentAttendanceViewStatus) =>
    normalizedAttendanceStatuses.filter((status) => status === st).length;

  const maxWeekIndex = Math.max(0, ...lessons.map((l) => l.weekIndex));
  const rawCurrentWeek = getWeekIndexFromStart(
    classInfo.startDate,
    referenceToday
  );
  const currentWeekIndex = Math.min(
    Math.max(rawCurrentWeek, 0),
    maxWeekIndex
  );

  const weeklyTimelineItems: Array<{
    timeMs: number;
    label: string;
    isDeadline: boolean;
    lessonType?: (typeof lessons)[number]['type'];
  }> = [];

  lessons
    .filter((s) => s.weekIndex === currentWeekIndex)
    .forEach((s) => {
      const startClock = s.startTime ?? classInfo.scheduleTime.slice(0, 5);
      weeklyTimelineItems.push({
        timeMs: new Date(s.date).getTime(),
        label: `${formatShortWeekdayDate(s.date)} ${startClock}: ${s.title}`,
        isDeadline: false,
        lessonType: s.type,
      });
    });

  assignments
    .filter(
      (a) =>
        getWeekIndexFromStart(classInfo.startDate, a.dueDate.slice(0, 10)) ===
        currentWeekIndex
    )
    .forEach((a) => {
      weeklyTimelineItems.push({
        timeMs: new Date(a.dueDate).getTime(),
        label: `Hạn ${a.code}: ${formatDateTimeVi(a.dueDate)}`,
        isDeadline: true,
      });
    });

  weeklyTimelineItems.sort((x, y) => x.timeMs - y.timeMs);

  const latestLessonWithDocs = [...lessons]
    .reverse()
    .find((s) => s.date <= referenceToday && s.resources.length > 0);

  const entryTotal = student.entryScore.total;
  const goalTotal = student.goalScore.total;
  const midTotal = examResults.midTerm?.totalScore ?? null;
  const finalTotal = examResults.finalTerm?.totalScore ?? null;

  return (
    <div>
      {/* 1. Banner chào mừng */}
      <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[25px] font-bold leading-[1.3] text-[#243B53]">
            Chào {student.fullName}
          </h1>
          {student.learningStatus ? (
            <LearningStatusChip status={student.learningStatus} />
          ) : null}
        </div>
        <p className="mt-1 text-[15px] text-[#64748B]">
          Mục tiêu: LC {student.goalScore.lc}, RC {student.goalScore.rc}, tổng{' '}
          {goalTotal}/990
        </p>

        <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Khóa học', classInfo.courseName],
            ['Lớp', classInfo.classCode],
            ['Giảng viên', classInfo.teacherName],
            ['Cơ sở', classInfo.branchName],
            ['Lịch học', `${classInfo.scheduleDays}, ${classInfo.scheduleTime}`],
            ['Khai giảng', formatFullDateVi(classInfo.startDate)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <div className="text-[13px] text-[#64748B]">{label}</div>
              <b className="block break-words text-[15px] font-bold text-[#243B53]">
                {value}
              </b>
            </div>
          ))}
        </div>

        <h2 className="mb-2 mt-[18px] text-[17px] font-bold text-[#243B53]">
          Tiến độ khóa học: {completedLessonsCount}/{lessons.length} buổi
        </h2>

        {/* Session Ribbon */}
        <div className="flex flex-wrap gap-1">
          {lessons.map((lesson, idx) => {
            const matchedAtt =
              attendance.find(
                (item) =>
                  item.lessonId === lesson.id ||
                  item.sessionNumber === lesson.sessionNumber
              ) ?? attendance[idx];
            const attStatus = resolveStudentAttendanceStatus(
              matchedAtt?.status,
              matchedAtt?.teacherStatus
            );
            const isTestSession =
              lesson.type !== 'class' && lesson.type !== 'review';

            return (
              <i
                key={lesson.id}
                title={`Buổi ${lesson.sessionNumber}, ${formatShortWeekdayDate(lesson.date)}: ${ATTENDANCE_STATUS_LABELS[attStatus]}${isTestSession ? ` (${LESSON_ACTIVITY_LABELS[lesson.type]})` : ''}`}
                className={`block h-[22px] w-[22px] border-2 ${
                  ATTENDANCE_SQUARE_STYLES[attStatus]
                } ${
                  isTestSession
                    ? 'rounded-full !border-[#F26522]'
                    : 'rounded-[6px]'
                }`}
              />
            );
          })}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-[3px] border border-[#2878B8] bg-[#2878B8]" />
            Đúng giờ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-[3px] border border-[#75BDEB] bg-[#A7D8F5]" />
            Đi muộn
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-[3px] border border-[#75BDEB] bg-[#EAF6FD]" />
            Có phép
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-[3px] border border-[#B93A2E] bg-[#B93A2E]" />
            Vắng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-[3px] border border-[#DCEAF3] bg-white" />
            Chưa học
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block h-3 w-3 rounded-full border-2 border-[#F26522] bg-white" />
            Kiểm tra
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Link
            to="/student/learning-plan"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2878B8] px-4 py-[9px] text-[15px] font-semibold text-white transition hover:bg-[#1F6399]"
          >
            Kế hoạch &amp; Học liệu
          </Link>
          <Link
            to="/student/assignments"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#EAF6FD] px-4 py-[9px] text-[15px] font-semibold text-[#2878B8] transition hover:brightness-95"
          >
            Bài tập &amp; Điểm danh
          </Link>
          <Link
            to="/student/tuition"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DCEAF3] bg-white px-4 py-[9px] text-[15px] font-semibold text-[#243B53] transition hover:bg-[#EAF6FD]"
          >
            Học phí &amp; Phiếu thu
          </Link>
        </div>
      </section>

      {/* 2. Bốn thẻ KPI */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Điểm đầu vào và lộ trình
          </span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {entryTotal}/{goalTotal}
          </b>
          <span className="text-[13px] text-[#243B53]">
            Đầu vào {entryTotal}, mục tiêu {goalTotal}
          </span>
          <PortalProgressBar
            percent={
              lessons.length
                ? Math.round((completedLessonsCount / lessons.length) * 100)
                : 0
            }
          />
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">Hoàn thành bài tập</span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {submittedCount}/{unlockedAssignments.length}
          </b>
          <span className="text-[13px] text-[#243B53]">
            Đạt {passedCount}, chưa đạt {failedCount}, còn thiếu{' '}
            {missingOverdueCount}
          </span>
          <PortalProgressBar
            percent={
              unlockedAssignments.length
                ? Math.round((passedCount / unlockedAssignments.length) * 100)
                : 0
            }
          />
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">Chuyên cần</span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {countAttendance('on') + countAttendance('late')} buổi
          </b>
          <span className="text-[13px] text-[#243B53]">
            Nghỉ {countAttendance('excused') + countAttendance('absent')}, muộn{' '}
            {countAttendance('late')}
          </span>
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">Kết quả thi</span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {midTotal !== null ? `Mid ${midTotal}` : 'Chưa có'}
          </b>
          <span className="text-[13px] text-[#243B53]">
            Final: {finalTotal !== null ? finalTotal : 'chưa có'}. Mục tiêu{' '}
            {goalTotal}
          </span>
        </div>
      </div>

      {/* 3. Khu vực hai cột */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <h2 className="text-[17px] font-bold text-[#243B53]">
            Bài tập cần nộp và cập nhật gần đây
          </h2>

          {recentAssignments.length > 0 ? (
            <div className="divide-y divide-[#DCEAF3]">
              {recentAssignments.map((assignment) => {
                const feedback =
                  assignment.submission.teacherFeedback ??
                  assignment.submission.teacherComment;
                return (
                  <div key={assignment.id} className="py-3 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-[15px] font-bold text-[#243B53]">
                        {assignment.title}
                      </b>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignment.isClosed ? (
                          <PortalChip label="Đã đóng nhận bài" variant="muted" />
                        ) : null}
                        <AssignmentStatusChip
                          status={assignment.submission.status}
                        />
                      </div>
                    </div>
                    <div className="mt-0.5 text-[13px] text-[#64748B]">
                      Hạn: {formatDateTimeVi(assignment.dueDate)}
                      {feedback ? ` | Nhận xét: ${feedback}` : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/student/assignments?open=${assignment.id}`)
                      }
                      className="mt-1.5 inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95"
                    >
                      Mở bài
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-[#64748B]">Chưa có bài tập.</p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4">
          <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
            <h2 className="text-[17px] font-bold text-[#243B53]">
              Lịch học và hạn nộp tuần này
            </h2>

            {weeklyTimelineItems.length > 0 ? (
              <div className="divide-y divide-[#DCEAF3]">
                {weeklyTimelineItems.map((item, idx) => (
                  <div
                    key={`${item.label}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px] last:pb-0"
                  >
                    <span>{item.label}</span>
                    {item.isDeadline ? (
                      <PortalChip label="Hạn nộp" variant="or" />
                    ) : item.lessonType ? (
                      <LessonTypeChip type={item.lessonType} />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-[#64748B]">
                Tuần này không có lịch.
              </p>
            )}

            <Link
              to="/student/schedule"
              className="mt-2.5 inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95"
            >
              Xem thời khóa biểu
            </Link>
          </section>

          <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
            <h2 className="text-[17px] font-bold text-[#243B53]">
              Tài liệu mới
            </h2>
            {latestLessonWithDocs ? (
              <>
                <p className="mb-2 mt-1 text-[13px] text-[#64748B]">
                  Buổi {latestLessonWithDocs.sessionNumber}:{' '}
                  {latestLessonWithDocs.title}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {latestLessonWithDocs.resources.map((doc) => (
                    <ResourceDocChip key={doc.id} resource={doc} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-[#64748B]">
                Chưa có tài liệu.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
