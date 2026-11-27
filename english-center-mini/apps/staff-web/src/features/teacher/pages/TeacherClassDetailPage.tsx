import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpenCheck,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  TrendingUp,
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
import { formatDate, toSafeHttpUrl } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { toVietnamYmd } from '@/shared/utils/staffFormatters'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import { CLASS_STATUS_META } from '@/features/academic/types/academic.types'
import {
  ASSESSMENT_CATEGORY_LABELS,
  LESSON_ACTIVITY_META,
  TARGET_SCOPE_LABELS,
} from '@/features/teacher/types/teacher.types'

export function TeacherClassDetailPage() {
  const { classId = '' } = useParams()
  useDocumentTitle(`Chi tiết lớp giảng dạy ${classId}`)
  const actor = useTeacherActor()
  const { todayYmdVn } = useCurrentTime()

  const [tab, setTab] = useState<'students' | 'sessions' | 'assignments' | 'grades'>('students')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classDetail(actor.userId, classId),
    queryFn: () => teacherApi.getClassDetail(actor, classId),
    enabled: Boolean(classId),
    retry: false,
  })

  const planBySessionId = useMemo(
    () => new Map((data?.teachingPlans ?? []).map((p) => [p.sessionId, p])),
    [data],
  )

  if (isLoading) return <LoadingBlock label="Đang kiểm tra phân quyền và tải dữ liệu lớp..." />

  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }

  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy lớp học."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { classInfo, sessions, assignments, grades, progressRows } = data
  const st = CLASS_STATUS_META[classInfo.status]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lớp ${classInfo.classCode} – ${classInfo.className}`}
        description={`${classInfo.courseName} • ${classInfo.branchName} • ${
          classInfo.endTime
            ? `${classInfo.studyDays} (${classInfo.startTime}–${classInfo.endTime})`
            : classInfo.studyDays
        }`}
        badge={<Badge tone={st.tone}>{st.label}</Badge>}
        actions={
          <>
            <Link to="/teacher/classes">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                <span>Lớp của tôi</span>
              </Button>
            </Link>
            <Link to={`/teacher/attendance?classId=${classInfo.id}`}>
              <Button size="sm">
                <CheckSquare className="h-4 w-4" />
                <span>Điểm danh</span>
              </Button>
            </Link>
          </>
        }
      />

      {/* Thông tin Metadata lớp đồng bộ */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 text-xs shadow-2xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <span className="text-[#64748B]">Ngày khai giảng</span>
          <p className="mt-0.5 font-extrabold text-[#243B53]">
            {classInfo.startDateDisplay ?? formatDate(classInfo.startDate)}
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-[#64748B]">Hình thức & Phòng học</span>
          <p className="mt-0.5 font-extrabold text-[#243B53]">
            {classInfo.studyMode} • {classInfo.roomLabel ?? 'Theo lịch ca'}
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-[#64748B]">Sĩ số đang theo học</span>
          <p className="mt-0.5 font-extrabold tabular-nums text-[#2878B8]">
            {classInfo.activeEnrolledCount}/{classInfo.maxStudents ?? '—'} học viên
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-[#64748B]">Bài nộp chờ chấm</span>
          <p className="mt-0.5 font-extrabold tabular-nums text-[#D97706]">
            {classInfo.ungradedCount} bài nộp
          </p>
        </div>
      </div>

      {/* Chuyển tab chi tiết lớp & Quick Links có gắn ?classId= */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('students')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'students' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            1. Học viên & Chuyên cần ({progressRows.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('sessions')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'sessions' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            2. Buổi học & Kế hoạch ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('assignments')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'assignments' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            3. Bài tập lớp ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('grades')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'grades' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            4. Bảng điểm ({grades.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Link to={`/teacher/teaching-plans?classId=${classInfo.id}`}>
            <Button size="sm" variant="ghost">
              <BookOpenCheck className="h-3.5 w-3.5" />
              <span>Kế hoạch bài dạy</span>
            </Button>
          </Link>
          <Link to={`/teacher/assignments?classId=${classInfo.id}`}>
            <Button size="sm" variant="ghost">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Quản lý bài tập</span>
            </Button>
          </Link>
          <Link to={`/teacher/gradebook?classId=${classInfo.id}`}>
            <Button size="sm" variant="ghost">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Mở sổ điểm</span>
            </Button>
          </Link>
          <Link to={`/teacher/progress?classId=${classInfo.id}`}>
            <Button size="sm" variant="ghost">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Tiến độ lớp</span>
            </Button>
          </Link>
        </div>
      </div>

      {tab === 'students' &&
        (progressRows.length === 0 ? (
          <EmptyBlock title="Lớp hiện chưa có học viên ghi danh chi tiết" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã HV & Họ tên
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Đầu vào → Mục tiêu
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Chuyên cần</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Bài tập hoàn thành
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    ĐTB Trọng số
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái theo dõi
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {progressRows.map((row) => (
                  <DataTableRow key={row.student.id}>
                    <DataTableCell className="whitespace-nowrap">
                      <p className="font-bold text-[#243B53]">{row.student.fullName}</p>
                      <p className="text-xs text-[#64748B]">
                        {row.student.studentCode} • {row.student.phone}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      {row.student.entryScore.total} →{' '}
                      <strong className="text-[#1F7A4C]">{row.student.goalScore.total}</strong>
                    </DataTableCell>
                    <DataTableCell className="text-xs font-semibold whitespace-nowrap">
                      {row.attendanceRatePercent === null
                        ? 'Chưa có buổi điểm danh'
                        : `${row.attendanceRatePercent}% (${row.presentCount + row.lateCount}/${row.markedSessionsCount} buổi${row.lateCount > 0 ? `, muộn ${row.lateCount}` : ''})`}
                    </DataTableCell>
                    <DataTableCell className="text-xs font-semibold whitespace-nowrap">
                      {row.assignmentCompletionPercent === null
                        ? 'Chưa giao bài'
                        : `${row.assignmentCompletionPercent}% (${row.submittedOrGradedCount}/${row.assignedCount})`}
                    </DataTableCell>
                    <DataTableCell className="text-xs font-bold whitespace-nowrap text-[#243B53]">
                      {row.weightedAveragePercent === null ? '—' : `${row.weightedAveragePercent}%`}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {row.needsSupport ? (
                        <Badge tone="danger">Cần hỗ trợ kèm sát</Badge>
                      ) : (
                        <Badge tone="success">Đảm bảo tiến độ</Badge>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {tab === 'sessions' &&
        (sessions.length === 0 ? (
          <EmptyBlock title="Chưa có lịch buổi học chi tiết cho lớp này" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="w-44 whitespace-nowrap">
                    Buổi & Ngày học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Chủ đề & Kế hoạch giảng dạy</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Tiến độ soạn giảng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Phòng & Giờ học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {sessions.map((ses) => {
                  const plan = planBySessionId.get(ses.id)
                  const isFuture = ses.sessionDate > todayYmdVn
                  const actMeta = LESSON_ACTIVITY_META[ses.activityType]
                  return (
                    <DataTableRow key={ses.id}>
                      <DataTableCell className="w-44 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          <p className="font-bold text-[#243B53]">
                            Buổi {String(ses.sessionNumber).padStart(2, '0')}
                          </p>
                          <Badge tone={actMeta.tone}>{actMeta.label}</Badge>
                          <p className="text-xs text-[#64748B]">{formatDate(ses.sessionDate)}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="max-w-sm text-xs">
                        <p className="font-semibold text-[#243B53]">
                          {plan?.topicTitle ?? ses.officialTitle}
                        </p>
                        {plan ? (
                          <>
                            <p className="mt-0.5 text-[#475569]">{plan.learningObjectives}</p>
                            {plan.homeworkBrief && (
                              <p className="mt-0.5 text-[#2878B8]">BTVN: {plan.homeworkBrief}</p>
                            )}
                          </>
                        ) : (
                          <p className="mt-0.5 text-[#94A3B8]">
                            Chưa cập nhật kế hoạch giảng dạy chi tiết
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        {plan ? (
                          <Badge
                            tone={
                              plan.completionStatus === 'completed'
                                ? 'success'
                                : plan.completionStatus === 'in_progress'
                                  ? 'info'
                                  : 'neutral'
                            }
                          >
                            {plan.completionStatus === 'completed'
                              ? 'Đã dạy xong'
                              : plan.completionStatus === 'in_progress'
                                ? 'Đang triển khai'
                                : 'Dự kiến'}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Chưa soạn</Badge>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap text-[#64748B]">
                        {ses.roomLabel} (
                        {ses.endTime ? `${ses.startTime}–${ses.endTime}` : ses.startTime})
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {isFuture ? (
                            <Button size="sm" variant="secondary" disabled>
                              Chưa mở ĐD
                            </Button>
                          ) : (
                            <Link to={`/teacher/attendance?sessionId=${ses.id}`}>
                              <Button size="sm" variant="secondary">
                                Điểm danh
                              </Button>
                            </Link>
                          )}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {tab === 'assignments' &&
        (assignments.length === 0 ? (
          <EmptyBlock title="Chưa giao bài tập nào cho lớp này" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Mã & Tiêu đề bài tập</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Đối tượng & Buổi giao
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Hạn nộp & Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thang điểm
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {assignments.map((asg) => {
                  const dueYmd = toVietnamYmd(asg.dueAt)
                  const safeAtt = asg.attachmentUrl ? toSafeHttpUrl(asg.attachmentUrl) : null
                  return (
                    <DataTableRow key={asg.id}>
                      <DataTableCell>
                        <p className="font-bold whitespace-nowrap text-[#243B53]">{asg.code}</p>
                        <p className="text-xs text-[#64748B]">{asg.title}</p>
                        {safeAtt && (
                          <a
                            href={safeAtt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap text-[#2878B8] hover:underline"
                          >
                            <span>Đề bài đính kèm</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">
                          Buổi {String(asg.sessionNumber).padStart(2, '0')}
                        </p>
                        <p className="text-[#64748B]">
                          {asg.targetScope === 'group' && asg.targetGroupLabel
                            ? `Nhóm: ${asg.targetGroupLabel}`
                            : TARGET_SCOPE_LABELS[asg.targetScope]}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <p>{formatDate(dueYmd)}</p>
                          {asg.status === 'closed' ? (
                            <Badge tone="neutral">Đã đóng</Badge>
                          ) : dueYmd < todayYmdVn ? (
                            <Badge tone="warning">Quá hạn</Badge>
                          ) : (
                            <Badge tone="success">Đang mở</Badge>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-right font-bold whitespace-nowrap text-[#243B53]">
                        {asg.maxScore} điểm
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {tab === 'grades' &&
        (grades.length === 0 ? (
          <EmptyBlock title="Chưa có dữ liệu bảng điểm cho lớp này" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">Học viên</DataTableHeaderCell>
                  <DataTableHeaderCell>Loại bài kiểm tra</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Điểm tổng
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {grades.map((g) => (
                  <DataTableRow key={g.id}>
                    <DataTableCell className="font-semibold whitespace-nowrap text-[#243B53]">
                      {g.studentName} ({g.studentCode})
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-semibold text-[#243B53]">
                        {ASSESSMENT_CATEGORY_LABELS[g.category]}
                      </p>
                      <p className="text-[#64748B]">{g.assessmentTitle}</p>
                    </DataTableCell>
                    <DataTableCell className="text-right font-extrabold whitespace-nowrap">
                      {g.totalScore === null ? (
                        <span className="text-[#64748B]">Chưa đánh giá</span>
                      ) : (
                        <span className="text-[#1F7A4C]">
                          {g.totalScore}/{g.maxTotalScore}
                        </span>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}
    </div>
  )
}
