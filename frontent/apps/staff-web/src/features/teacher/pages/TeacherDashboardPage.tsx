import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  DataTable,
  DataTableCell,
  DataTableContainer,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from '@english-center/ui'
import { formatDate, formatDateTimeVi } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { CLASS_STATUS_META } from '@/features/academic/types/academic.types'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import {
  LESSON_ACTIVITY_META,
  SUBMISSION_STATUS_META,
} from '@/features/teacher/types/teacher.types'

export function TeacherDashboardPage() {
  useDocumentTitle('Dashboard Giảng viên')
  const actor = useTeacherActor()
  const { todayYmdVn } = useCurrentTime()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.dashboard(actor.userId, todayYmdVn),
    queryFn: () => teacherApi.getDashboardData(actor, todayYmdVn),
  })

  if (isLoading) return <LoadingBlock label="Đang tải dữ liệu lớp giảng dạy của bạn..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải Dashboard Giảng viên."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { kpis } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào, ${actor.fullName}`}
        description="Tổng quan lịch dạy hôm nay, tình hình điểm danh, chấm bài và tiến độ học viên."
        badge={<Badge tone="info">{kpis.assignedClassesCount} lớp phụ trách</Badge>}
        actions={
          <>
            <Link to="/teacher/attendance">
              <Button size="sm">
                <CheckSquare className="h-4 w-4" />
                <span>Điểm danh hôm nay</span>
              </Button>
            </Link>
            <Link to="/teacher/assignments">
              <Button size="sm" variant="secondary">
                <ClipboardList className="h-4 w-4" />
                <span>Chấm bài nộp ({kpis.ungradedSubmissionsCount})</span>
              </Button>
            </Link>
          </>
        }
      />

      {/* Cảnh báo buổi học đã qua / hôm nay chưa điểm danh đủ */}
      {data.unmarkedSessions.length > 0 && (
        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#92400E]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />
              <span>
                Cảnh báo {data.unmarkedSessions.length} buổi học đã/đang diễn ra còn học viên chưa
                điểm danh
              </span>
            </div>
            <Link
              to="/teacher/attendance"
              className="text-xs font-bold text-[#B45309] hover:underline"
            >
              Mở sổ điểm danh →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {data.unmarkedSessions.slice(0, 4).map((ses) => (
              <div
                key={ses.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FDE68A] bg-white px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-extrabold text-[#243B53]">
                    {ses.classCode} • Buổi {ses.sessionNumber} ({formatDate(ses.sessionDate)})
                  </p>
                  <p className="text-[#92400E]">
                    Còn <strong>{ses.unmarkedCount}</strong>/{ses.totalStudents} học viên ở trạng
                    thái Chưa điểm danh
                  </p>
                </div>
                <Link to={`/teacher/attendance?sessionId=${ses.id}`}>
                  <Button size="sm">Điểm danh ngay</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 KPI Giảng viên */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#64748B]">Lớp được giao</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#243B53]">
            {kpis.assignedClassesCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#2878B8]">Ca dạy hôm nay</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#2878B8]">
            {kpis.todaySessionsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#1F7A4C]">Buổi dạy sắp tới</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#1F7A4C]">
            {kpis.upcomingSessionsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#D97706]">Bài nộp chờ chấm</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#D97706]">
            {kpis.ungradedSubmissionsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#B93A2E]">Bài tập quá hạn chấm</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#B93A2E]">
            {kpis.overdueGradingCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#B93A2E]">HV cần lưu ý</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#B93A2E]">
            {kpis.studentsNeedingSupportCount}
          </p>
        </div>
      </div>

      {/* Lịch dạy hôm nay & Bài tập cần chấm */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#2878B8]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Lịch giảng dạy hôm nay ({formatDate(todayYmdVn)})
              </h2>
            </div>
            <Link
              to="/teacher/schedule"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Lịch tuần / tháng</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.todaySessions.length === 0 ? (
            <EmptyBlock title="Hôm nay bạn không có ca giảng dạy nào" />
          ) : (
            <div className="space-y-3">
              {data.todaySessions.map((ses) => (
                <div
                  key={ses.id}
                  className="rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge tone="info">
                        {ses.classCode} •{' '}
                        {ses.endTime ? `${ses.startTime} – ${ses.endTime}` : ses.startTime}
                      </Badge>
                      <Badge tone={LESSON_ACTIVITY_META[ses.activityType].tone}>
                        {LESSON_ACTIVITY_META[ses.activityType].label}
                      </Badge>
                    </div>
                    <span className="font-semibold text-[#64748B]">{ses.roomLabel}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-[#243B53]">{ses.officialTitle}</p>
                  <p className="mt-0.5 text-[#64748B]">
                    {ses.courseName} • {ses.branchName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/teacher/attendance?sessionId=${ses.id}`}>
                      <Button size="sm">Điểm danh buổi này</Button>
                    </Link>
                    <Link to={`/teacher/classes/${ses.classId}`}>
                      <Button size="sm" variant="secondary">
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>Mở lớp</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
              Bài tập học viên đang chờ chấm ({data.pendingSubmissions.length})
            </h2>
            <Link
              to="/teacher/assignments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Mở chấm bài</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.pendingSubmissions.length === 0 ? (
            <EmptyBlock title="Tất cả bài tập đã nộp đều đã được chấm xong" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Học viên & Lớp
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Bài tập</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái nộp
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.pendingSubmissions.map((sub) => {
                    const st = SUBMISSION_STATUS_META[sub.status]
                    return (
                      <DataTableRow key={sub.id}>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-bold text-[#243B53]">{sub.studentName}</p>
                          <p className="text-xs text-[#64748B]">
                            {sub.studentCode} • Lớp {sub.classCode}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-xs">
                          <Link
                            to={`/teacher/assignments?classId=${sub.classId}`}
                            className="font-semibold text-[#2878B8] hover:underline"
                          >
                            {sub.assignmentCode}: {sub.assignmentTitle}
                          </Link>
                          <p className="whitespace-nowrap text-[#64748B]">
                            Nộp: {sub.submittedAt ? formatDateTimeVi(sub.submittedAt) : '—'}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      </div>

      {/* Buổi dạy sắp tới & Lớp đang phụ trách */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-[#1F7A4C]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Buổi dạy sắp tới ({data.upcomingSessions.length})
              </h2>
            </div>
            <Link
              to="/teacher/teaching-plans"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Soạn kế hoạch bài dạy</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.upcomingSessions.length === 0 ? (
            <EmptyBlock title="Chưa có buổi dạy tiếp theo trong lịch" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Ngày & Giờ
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Lớp & Chủ đề</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">Phòng</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.upcomingSessions.map((ses) => (
                    <DataTableRow key={ses.id}>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{formatDate(ses.sessionDate)}</p>
                        <p className="text-[#64748B]">
                          {ses.endTime ? `${ses.startTime}–${ses.endTime}` : ses.startTime}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to={`/teacher/classes/${ses.classId}`}
                            className="font-extrabold whitespace-nowrap text-[#2878B8] hover:underline"
                          >
                            {ses.classCode} • B.{String(ses.sessionNumber).padStart(2, '0')}
                          </Link>
                          <Badge tone={LESSON_ACTIVITY_META[ses.activityType].tone}>
                            {LESSON_ACTIVITY_META[ses.activityType].label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[#475569]">{ses.officialTitle}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap text-[#64748B]">
                        {ses.roomLabel}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-[#2878B8]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Lớp phụ trách của tôi ({data.assignedClasses.length})
              </h2>
            </div>
            <Link
              to="/teacher/classes"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Tất cả lớp</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.assignedClasses.length === 0 ? (
            <EmptyBlock title="Bạn chưa được phân công lớp giảng dạy nào" />
          ) : (
            <div className="space-y-3">
              {data.assignedClasses.map((cls) => {
                const st = CLASS_STATUS_META[cls.status]
                return (
                  <div
                    key={cls.id}
                    className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/teacher/classes/${cls.id}`}
                          className="text-sm font-extrabold text-[#2878B8] hover:underline"
                        >
                          {cls.classCode} – {cls.className}
                        </Link>
                        <p className="text-[#64748B]">
                          {cls.courseName} •{' '}
                          {cls.endTime
                            ? `${cls.studyDays} (${cls.startTime}–${cls.endTime})`
                            : cls.studyDays}
                        </p>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2EDF5] pt-2.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#243B53]">
                        <Users className="h-3.5 w-3.5 text-[#2878B8]" />
                        {cls.activeEnrolledCount}/{cls.maxStudents ?? '—'} HV • Chờ chấm:{' '}
                        <strong className="text-[#D97706]">{cls.ungradedCount}</strong>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Link to={`/teacher/attendance?classId=${cls.id}`}>
                          <Button size="sm" variant="secondary">
                            Điểm danh
                          </Button>
                        </Link>
                        <Link to={`/teacher/gradebook?classId=${cls.id}`}>
                          <Button size="sm" variant="ghost">
                            Sổ điểm
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Học viên cần lưu ý hỗ trợ */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#B93A2E]" />
            <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
              Học viên cần lưu ý hỗ trợ theo bộ tiêu chí ({data.studentsNeedingSupport.length})
            </h2>
          </div>
          <Link
            to="/teacher/progress"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
          >
            <span>Xem toàn bộ tiến độ</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data.studentsNeedingSupport.length === 0 ? (
          <EmptyBlock title="Chưa có học viên nào chạm ngưỡng cảnh báo chuyên cần / bài tập" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Học viên & Lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Chuyên cần
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Hoàn thành BTVN
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Nguyên nhân cảnh báo</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {data.studentsNeedingSupport.map((row) => (
                  <DataTableRow key={`${row.classId}-${row.student.id}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <p className="font-bold text-[#243B53]">{row.student.fullName}</p>
                      <p className="text-xs text-[#64748B]">
                        {row.student.studentCode} •{' '}
                        <Link
                          to={`/teacher/progress?classId=${row.classId}`}
                          className="font-semibold text-[#2878B8] hover:underline"
                        >
                          Lớp {row.classCode}
                        </Link>
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-xs font-bold whitespace-nowrap text-[#B93A2E]">
                      {row.attendanceRatePercent === null ? '—' : `${row.attendanceRatePercent}%`}{' '}
                      (Vắng KP: {row.unexcusedCount})
                    </DataTableCell>
                    <DataTableCell className="text-xs font-bold whitespace-nowrap text-[#D97706]">
                      {row.assignmentCompletionPercent === null
                        ? '—'
                        : `${row.assignmentCompletionPercent}%`}{' '}
                      ({row.submittedOrGradedCount}/{row.assignedCount})
                    </DataTableCell>
                    <DataTableCell className="text-xs text-[#B93A2E]">
                      {row.supportReasons.join(' • ')}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>
    </div>
  )
}
