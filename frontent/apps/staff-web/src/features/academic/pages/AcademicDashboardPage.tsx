import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  RefreshCcw,
  UserCheck,
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
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS } from '@/features/academic/hooks/useAcademic'
import {
  ACADEMIC_REQUEST_STATUS_META,
  ACADEMIC_REQUEST_TYPE_LABELS,
  CLASS_STATUS_META,
} from '@/features/academic/types/academic.types'

export function AcademicDashboardPage() {
  useDocumentTitle('Dashboard Giáo vụ')
  const { todayYmdVn } = useCurrentTime()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.dashboard(todayYmdVn),
    queryFn: () => academicApi.getDashboardData(todayYmdVn),
  })

  if (isLoading) return <LoadingBlock label="Đang tổng hợp dữ liệu điều phối Giáo vụ..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải Dashboard Giáo vụ."
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
        title="Bảng điều khiển Giáo vụ & Quản lý học viên"
        description="Tổng quan sĩ số học viên, lịch khai giảng, xếp lớp và đơn học vụ."
        actions={
          <>
            <ActionGuard permission="sales.registrations.review">
              <Link to="/academic/placement?tab=review">
                <Button size="sm" variant="secondary">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Duyệt HS Sale ({kpis.pendingSalesRegistrationsCount})</span>
                </Button>
              </Link>
            </ActionGuard>
            <Link to="/academic/placement">
              <Button size="sm">
                <UserCheck className="h-4 w-4" />
                <span>Xếp lớp theo tháng ({kpis.waitingPlacementCount})</span>
              </Button>
            </Link>
            <Link to="/academic/classes">
              <Button size="sm" variant="secondary">
                <GraduationCap className="h-4 w-4" />
                <span>Quản lý lớp học ({kpis.totalClassesCount})</span>
              </Button>
            </Link>
          </>
        }
      />

      {/* 8 chỉ số động */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#64748B]">Tổng học viên</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#243B53]">
            {kpis.totalStudentsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#1F7A4C]">Đang theo học</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#1F7A4C]">
            {kpis.studyingStudentsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#475569]">
            Hoàn thành / Nghỉ
          </span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#243B53]">
            {kpis.droppedOrCompletedCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            {kpis.completedStudentsCount} HT • {kpis.droppedStudentsCount} thôi học
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#2878B8]">Lớp vận hành / Tổng</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#2878B8]">
            {kpis.activeClassesCount}
            <span className="text-sm font-semibold text-[#64748B]"> / {kpis.totalClassesCount}</span>
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#D97706]">Chờ xếp lớp</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#D97706]">
            {kpis.waitingPlacementCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            Chờ duyệt Sale: {kpis.pendingSalesRegistrationsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#0284C7]">Đang bảo lưu</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#0284C7]">
            {kpis.holdStudentsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#B93A2E]">Yêu cầu chờ xử lý</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#B93A2E]">
            {kpis.pendingRequestsCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-[#475569]">Lớp sắp khai giảng</span>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[#243B53]">
            {kpis.upcomingClassesCount}
          </p>
        </div>
      </div>

      {/* Các thông báo điều phối nóng */}
      {data.pendingSalesRegistrationsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[#D97706]" />
            <span>
              Đang có <strong>{data.pendingSalesRegistrationsCount} hồ sơ đăng ký khóa học từ Sale</strong>{' '}
              chờ Giáo vụ rà soát điều kiện & phê duyệt đưa vào hàng đợi xếp lớp.
            </span>
          </div>
          <Link
            to="/academic/placement?tab=review"
            className="font-bold text-[#B45309] hover:underline"
          >
            Mở tab Duyệt hồ sơ Sale ngay →
          </Link>
        </div>
      )}

      {data.pendingTeachingRequestsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BAE6FD] bg-[#F5FAFE] px-4 py-3 text-xs text-[#243B53]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#2878B8]" />
            <span>
              Đang có <strong>{data.pendingTeachingRequestsCount} nguyện vọng dạy lớp mới</strong>{' '}
              do Giảng viên gửi chờ Giáo vụ phê duyệt phân công.
            </span>
          </div>
          <Link to="/academic/classes" className="font-bold text-[#2878B8] hover:underline">
            Xem & duyệt tại Quản lý lớp học →
          </Link>
        </div>
      )}

      {/* Hàng 1: Hàng đợi chờ xếp lớp & Lớp gần đầy sĩ số */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[#D97706]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Học viên đang chờ xếp lớp ({data.waitingPlacementItems.length})
              </h2>
            </div>
            <Link
              to="/academic/placement"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Xếp lớp ngay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.waitingPlacementItems.length === 0 ? (
            <EmptyBlock title="Không có học viên nào đang chờ xếp lớp" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Họ tên & Nguồn</DataTableHeaderCell>
                    <DataTableHeaderCell>Khóa học & Cơ sở</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Chờ
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.waitingPlacementItems.map((item) => (
                    <DataTableRow key={item.candidateKey}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{item.fullName}</p>
                        <p className="text-xs whitespace-nowrap text-[#64748B]">
                          {item.phone} •{' '}
                          {item.sourceType === 'approved_sales_registration'
                            ? `Hồ sơ ${item.registrationCode}`
                            : `HV ${item.studentCode}`}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">{item.courseName}</p>
                        <p className="text-[#64748B]">
                          {item.branchName} • Tháng {item.expectedMonth}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <Badge tone={item.waitingDays >= 3 ? 'warning' : 'info'}>
                          {item.waitingDays} ngày
                        </Badge>
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
              <CalendarClock className="h-4 w-4 shrink-0 text-[#2878B8]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Lớp gần đầy sĩ số ({data.nearCapacityClasses.length})
              </h2>
            </div>
            <Link
              to="/academic/classes"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Tất cả lớp học</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.nearCapacityClasses.length === 0 ? (
            <EmptyBlock title="Chưa có lớp nào tiến sát ngưỡng sĩ số tối đa" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Mã lớp & Khóa</DataTableHeaderCell>
                    <DataTableHeaderCell>Khai giảng / Giảng viên</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Sĩ số
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.nearCapacityClasses.map((cls) => (
                    <DataTableRow key={cls.id}>
                      <DataTableCell>
                        <Link
                          to={`/academic/classes/${cls.id}`}
                          className="font-bold whitespace-nowrap text-[#2878B8] hover:underline"
                        >
                          {cls.classCode}
                        </Link>
                        <p className="text-xs text-[#64748B]">{cls.courseName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">
                          KG: {cls.startDateDisplay ?? formatDate(cls.startDate)}
                        </p>
                        <p className="text-[#64748B]">
                          {cls.teacherName ?? 'Chưa phân công GV'}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <Badge tone={cls.remainingSeats === 0 ? 'danger' : 'warning'}>
                          {cls.enrolledStudents}/{cls.maxStudents} (Còn {cls.remainingSeats})
                        </Badge>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      </div>

      {/* Bảng Lớp học sắp khai giảng */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#1F7A4C]" />
            <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
              Lịch các lớp sắp khai giảng ({data.upcomingClasses.length})
            </h2>
          </div>
          <Link
            to="/academic/classes"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
          >
            <span>Điều phối mở lớp</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data.upcomingClasses.length === 0 ? (
          <EmptyBlock title="Chưa có lớp học nào sắp khai giảng" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Mã lớp & Tên lớp</DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học & Cơ sở</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Ngày khai giảng & Ca học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Giảng viên</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Sĩ số & Trạng thái
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {data.upcomingClasses.map((cls) => {
                  const st = CLASS_STATUS_META[cls.status]
                  return (
                    <DataTableRow key={cls.id}>
                      <DataTableCell>
                        <Link
                          to={`/academic/classes/${cls.id}`}
                          className="font-bold whitespace-nowrap text-[#2878B8] hover:underline"
                        >
                          {cls.classCode}
                        </Link>
                        <p className="text-xs text-[#64748B]">{cls.className}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">{cls.courseName}</p>
                        <p className="text-[#64748B]">{cls.branchName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">
                          {cls.startDateDisplay ?? formatDate(cls.startDate)}
                        </p>
                        <p className="text-[#64748B]">
                          {cls.endTime
                            ? `${cls.studyDays} (${cls.startTime}–${cls.endTime})`
                            : cls.studyDays === cls.startTime
                              ? cls.studyDays
                              : `${cls.studyDays} (${cls.startTime})`}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        {cls.teacherName ?? <span className="text-[#D97706]">Chưa phân công</span>}
                      </DataTableCell>
                      <DataTableCell className="text-right text-xs whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          <p className="font-semibold text-[#243B53]">
                            {cls.enrolledStudents ?? 0}/{cls.maxStudents ?? '—'} HV
                          </p>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>

      {/* Hàng 3: Yêu cầu Bảo lưu/Chuyển lớp chờ xử lý & Hoạt động gần đây */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <RefreshCcw className="h-4 w-4 shrink-0 text-[#B93A2E]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Đơn Bảo lưu / Khôi phục / Chuyển lớp / Học lại chờ xử lý
              </h2>
            </div>
            <Link
              to="/academic/requests"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Xử lý đơn</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.pendingRequests.length === 0 ? (
            <EmptyBlock title="Không có đơn học vụ nào đang chờ xử lý" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã đơn & Học viên
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Loại yêu cầu</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.pendingRequests.map((req) => {
                    const st = ACADEMIC_REQUEST_STATUS_META[req.status]
                    return (
                      <DataTableRow key={req.id}>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-bold text-[#243B53]">{req.requestCode}</p>
                          <p className="text-xs text-[#64748B]">
                            {req.studentName} ({req.studentCode})
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-xs">
                          <p className="font-semibold text-[#243B53]">
                            {ACADEMIC_REQUEST_TYPE_LABELS[req.requestType]}
                          </p>
                          <p className="text-[#64748B]">{req.reason}</p>
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

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            Hoạt động học vụ gần đây
          </h2>
          {data.recentActivities.length === 0 ? (
            <EmptyBlock title="Chưa có hoạt động học vụ gần đây." />
          ) : (
            <div className="space-y-3">
              {data.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[#243B53]">{act.actorName}</strong>
                    <span className="text-[#64748B]">{formatDateTimeVi(act.occurredAt)}</span>
                  </div>
                  <p className="mt-1 text-[#475569]">{act.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
