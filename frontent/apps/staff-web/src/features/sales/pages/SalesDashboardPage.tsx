import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  MessageSquarePlus,
  PhoneOff,
  Plus,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  LEAD_STATUSES,
  type FollowUpStatus,
  type LeadStatus,
  type SalesLeadDto,
} from '@english-center/contracts'
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
  InputField,
  LoadingBlock,
  Pagination,
  SelectField,
} from '@english-center/ui'
import { formatDateTimeVi, matchText, paginate, shiftIsoYmd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  CreateOrEditLeadModal,
  LogConsultationModal,
  ScheduleFollowUpModal,
  TransitionLeadStatusModal,
} from '@/features/sales/components/LeadModals'
import {
  useSalesActor,
  useSalesDashboardData,
  useSalesLeadMutations,
  useSalesReferenceCatalogs,
} from '@/features/sales/hooks/useSalesCrm'
import {
  FOLLOW_UP_STATUS_META,
  LEAD_STATUS_META,
  isFollowUpOverdue,
  type SalesLeadSortKey,
  type SalesPeriodFilter,
} from '@/features/sales/types/sales.types'
import { DATA_SCOPE_LABELS, hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { toVietnamYmd } from '@/shared/utils/staffFormatters'

export function SalesDashboardPage() {
  useDocumentTitle('Sales CRM – Dashboard')
  const { session, user } = useStaffAuth()
  const actor = useSalesActor()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { nowIso, todayYmdVn } = useCurrentTime()

  const canViewConsultations = hasPermission(session, 'sales.consultations.view')
  const canViewFollowUps = hasPermission(session, 'sales.followups.view')

  const [period, setPeriod] = useState<SalesPeriodFilter>('7d')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [createdRangeFilter, setCreatedRangeFilter] = useState<'ALL' | 'today' | '7d' | '30d'>(
    'ALL',
  )
  const [leadSortBy, setLeadSortBy] = useState<SalesLeadSortKey>('updated_desc')
  const [page, setPage] = useState(1)
  const [followUpTab, setFollowUpTab] = useState<'overdue' | 'today' | 'upcoming' | 'done'>(
    'overdue',
  )

  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [statusModalLead, setStatusModalLead] = useState<SalesLeadDto | null>(null)
  const [consultModalLead, setConsultModalLead] = useState<SalesLeadDto | null>(null)
  const [followUpModalLead, setFollowUpModalLead] = useState<SalesLeadDto | null>(null)

  const { data, isLoading, error, refetch } = useSalesDashboardData(period)
  const { courses, branches, classes, saleEmployees } = useSalesReferenceCatalogs()
  const { updateFollowUpStatus } = useSalesLeadMutations()

  const courseNameMap = useMemo(
    () => new Map(courses.map((c) => [c.id, c.name])),
    [courses],
  )
  const branchNameMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b.shortLabel || b.name])),
    [branches],
  )
  const saleNameMap = useMemo(
    () => new Map(saleEmployees.map((s) => [s.id, s.fullName])),
    [saleEmployees],
  )

  const filteredLeads = useMemo(() => {
    const list = data?.leads ?? []
    const matchedList = list.filter((lead) => {
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false
      if (courseFilter !== 'ALL' && !lead.interestedCourseIds.includes(courseFilter)) {
        return false
      }
      if (createdRangeFilter !== 'ALL') {
        const createdYmd = toVietnamYmd(lead.createdAt)
        if (createdRangeFilter === 'today' && createdYmd !== todayYmdVn) return false
        if (createdRangeFilter === '7d') {
          if (createdYmd < shiftIsoYmd(todayYmdVn, -6)) return false
        }
        if (createdRangeFilter === '30d') {
          if (createdYmd < shiftIsoYmd(todayYmdVn, -29)) return false
        }
      }
      if (search.trim()) {
        const matched =
          matchText(lead.fullName, search) ||
          matchText(lead.phone, search) ||
          matchText(lead.email ?? '', search) ||
          matchText(lead.learningNeed, search)
        if (!matched) return false
      }
      return true
    })

    return [...matchedList].sort((a, b) => {
      if (leadSortBy === 'created_desc') {
        return b.createdAt.localeCompare(a.createdAt)
      }
      if (leadSortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName, 'vi')
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [
    data?.leads,
    statusFilter,
    courseFilter,
    createdRangeFilter,
    todayYmdVn,
    search,
    leadSortBy,
  ])

  const paginatedLeads = paginate(filteredLeads, page, 6)

  const categorizedFollowUps = useMemo(() => {
    const all = data?.followUps ?? []

    const overdue = all.filter((f) => isFollowUpOverdue(f, nowIso))
    const today = all.filter(
      (f) =>
        f.status === 'Scheduled' &&
        f.dueAt >= nowIso &&
        toVietnamYmd(f.dueAt) === todayYmdVn,
    )
    const upcoming = all.filter(
      (f) =>
        f.status === 'Scheduled' &&
        f.dueAt >= nowIso &&
        toVietnamYmd(f.dueAt) > todayYmdVn,
    )
    const done = all.filter((f) => f.status !== 'Scheduled')

    return { overdue, today, upcoming, done }
  }, [data?.followUps, nowIso, todayYmdVn])

  const visibleActivities = useMemo(() => {
    const list = data?.recentActivities ?? []
    return list.filter((act) => {
      if (act.kind === 'consultation' && !canViewConsultations) return false
      if (act.kind === 'followup' && !canViewFollowUps) return false
      return true
    })
  }, [data?.recentActivities, canViewConsultations, canViewFollowUps])

  const handleFollowUpTransition = (
    followUpId: string,
    nextStatus: Exclude<FollowUpStatus, 'Scheduled'>,
    leadName: string,
  ) => {
    updateFollowUpStatus.mutate(
      { followUpId, status: nextStatus },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: `Đã cập nhật lịch gọi lại: ${FOLLOW_UP_STATUS_META[nextStatus].label}`,
            description: leadName,
          })
        },
        onError: (err) => {
          notify({
            tone: 'error',
            title: 'Không thể cập nhật lịch liên hệ lại',
            description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
          })
        },
      },
    )
  }

  if (isLoading) return <LoadingBlock label="Đang tải dữ liệu Sales CRM..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải Bảng điều khiển Sales CRM."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const activeFollowUpList = categorizedFollowUps[followUpTab]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tư vấn Tuyển sinh – Xin chào, ${user?.fullName ?? 'Nhân viên Sale'}`}
        description="Theo dõi khách hàng tiềm năng, lịch sử tư vấn, lịch hẹn gọi lại và chuyển đổi hồ sơ đăng ký khóa học."
        badge={
          <Badge tone="info">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {DATA_SCOPE_LABELS[actor.scope]}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
              {(
                [
                  { key: 'today', label: 'Hôm nay' },
                  { key: '7d', label: '7 ngày' },
                  { key: '30d', label: '30 ngày' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriod(opt.key)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    period === opt.key
                      ? 'bg-white text-[#2878B8] shadow-2xs'
                      : 'text-[#64748B]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <ActionGuard permission="sales.leads.create">
              <Button onClick={() => setCreateLeadOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Thêm khách hàng</span>
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* 5 KPI Cards tính đồng bộ từ cùng nguồn dữ liệu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
              Khách hàng mới
            </span>
            <Badge tone="info">
              {period === 'today' ? 'Hôm nay' : period === '7d' ? '7 ngày' : '30 ngày'}
            </Badge>
          </div>
          <div>
            <p className="mt-3 text-2xl font-black tabular-nums text-[#243B53] sm:text-3xl">
              {data.kpis.newLeadsInPeriod}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Chưa xử lý (Mới tiếp nhận):{' '}
              <strong className="text-[#2878B8]">{data.kpis.untouchedNewLeadsCount}</strong> Lead
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
              Đang tư vấn
            </span>
            <Badge tone="warning">Đang mở</Badge>
          </div>
          <div>
            <p className="mt-3 text-2xl font-black tabular-nums text-[#2878B8] sm:text-3xl">
              {data.kpis.activeConsultingCount}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Trạng thái Liên hệ, Tư vấn, Hẹn gọi lại & Quan tâm cao
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
              Chờ liên hệ lại
            </span>
            {data.kpis.overdueFollowUpsCount > 0 ? (
              <Badge tone="danger">{data.kpis.overdueFollowUpsCount} quá hạn</Badge>
            ) : (
              <Badge tone="success">Đúng hạn</Badge>
            )}
          </div>
          <div>
            <p className="mt-3 text-2xl font-black tabular-nums text-[#F26522] sm:text-3xl">
              {data.kpis.followUpsDueOrOverdueToday}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Lịch hẹn sắp tới (sau hôm nay):{' '}
              <strong className="text-[#243B53]">{data.kpis.upcomingFollowUpsCount}</strong> lịch
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
              Đăng ký & Ghi danh
            </span>
            <Badge tone="success">Đã duyệt</Badge>
          </div>
          <div>
            <p className="mt-3 text-2xl font-black tabular-nums text-[#1F7A4C] sm:text-3xl">
              {data.kpis.approvedOrConvertedInPeriod}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Đã ĐK: <strong>{data.kpis.registeredLeadsCount}</strong> • Đã chuyển HV:{' '}
              <strong className="text-[#1F7A4C]">{data.kpis.convertedRegistrationsCount}</strong> • Chờ
              duyệt: <strong>{data.kpis.pendingReviewRegistrationsCount}</strong>
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
              Tỷ lệ chuyển đổi
            </span>
            <Badge tone="info">Toàn phễu</Badge>
          </div>
          <div>
            <p className="mt-3 text-2xl font-black tabular-nums text-[#243B53] sm:text-3xl">
              {data.kpis.conversionRatePercent}%
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Tỷ lệ khách hàng đăng ký khóa học thành công
            </p>
          </div>
        </div>
      </div>

      {/* Khu vực 1: Bảng Khách hàng cần xử lý */}
      <section className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#243B53]">
              Danh sách Khách hàng cần xử lý ({filteredLeads.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              Chọn khách hàng để xem hồ sơ chi tiết, lịch sử tư vấn và đăng ký khóa học.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <InputField
            id="sales-lead-search"
            label="Tìm kiếm"
            placeholder="Tên, SĐT, email, nhu cầu..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />

          <SelectField
            id="sales-lead-status"
            label="Trạng thái Lead"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | LeadStatus)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              ...LEAD_STATUSES.map((st) => ({
                value: st,
                label: LEAD_STATUS_META[st].label,
              })),
            ]}
          />

          <SelectField
            id="sales-lead-course"
            label="Khóa học quan tâm"
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả khóa học' },
              ...courses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <SelectField
            id="sales-lead-date"
            label="Ngày tiếp nhận"
            value={createdRangeFilter}
            onChange={(e) => {
              setCreatedRangeFilter(e.target.value as 'ALL' | 'today' | '7d' | '30d')
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Mọi thời điểm' },
              { value: 'today', label: 'Tiếp nhận hôm nay' },
              { value: '7d', label: 'Trong 7 ngày qua' },
              { value: '30d', label: 'Trong 30 ngày qua' },
            ]}
          />

          <SelectField
            id="sales-lead-sort"
            label="Sắp xếp"
            value={leadSortBy}
            onChange={(e) => {
              setLeadSortBy(e.target.value as SalesLeadSortKey)
              setPage(1)
            }}
            options={[
              { value: 'updated_desc', label: 'Cập nhật gần nhất' },
              { value: 'created_desc', label: 'Mới tiếp nhận gần nhất' },
              { value: 'name_asc', label: 'Tên khách hàng (A–Z)' },
            ]}
          />
        </div>

        {paginatedLeads.items.length === 0 ? (
          <EmptyBlock
            title="Không có khách hàng phù hợp bộ lọc"
            description="Thử mở rộng bộ lọc trạng thái hoặc thêm khách hàng tiềm năng mới."
          />
        ) : (
          <>
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Khách hàng
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Khóa & Cơ sở quan tâm</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Sale phụ trách
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Liên hệ gần nhất / Tiếp theo
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Tác nghiệp
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {paginatedLeads.items.map((lead) => {
                    const stMeta = LEAD_STATUS_META[lead.status]
                    const courseLabels = lead.interestedCourseIds
                      .map((cid) => courseNameMap.get(cid) ?? cid)
                      .join(', ')
                    const branchLabel = lead.preferredBranchId
                      ? (branchNameMap.get(lead.preferredBranchId) ?? lead.preferredBranchId)
                      : 'Chưa chọn cơ sở'
                    const nextOverdue =
                      lead.nextFollowUp && isFollowUpOverdue(lead.nextFollowUp, nowIso)

                    return (
                      <DataTableRow key={lead.id}>
                        <DataTableCell>
                          <Link
                            to={`/sales/leads/${lead.id}`}
                            className="whitespace-nowrap font-bold text-[#243B53] hover:text-[#2878B8] hover:underline"
                          >
                            {lead.fullName}
                          </Link>
                          <p className="whitespace-nowrap text-xs font-semibold text-[#475569]">
                            {lead.phone}
                          </p>
                          {lead.email && (
                            <p className="text-[11px] text-[#64748B]">{lead.email}</p>
                          )}
                        </DataTableCell>

                        <DataTableCell className="max-w-xs">
                          <p className="truncate text-xs font-bold text-[#2878B8]">
                            {courseLabels || 'Chưa chọn khóa'}
                          </p>
                          <p className="mt-0.5 text-xs text-[#64748B]">{branchLabel}</p>
                        </DataTableCell>

                        <DataTableCell className="whitespace-nowrap text-xs font-semibold text-[#243B53]">
                          {saleNameMap.get(lead.assignedSaleId) ??
                            (lead.assignedSaleId === user?.id ? user.fullName : lead.assignedSaleId)}
                        </DataTableCell>

                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                        </DataTableCell>

                        <DataTableCell className="whitespace-nowrap text-xs">
                          <p className="text-[#475569]">
                            Gần nhất:{' '}
                            <strong>
                              {lead.lastContactedAt
                                ? formatDateTimeVi(lead.lastContactedAt)
                                : 'Chưa tư vấn'}
                            </strong>
                          </p>
                          {lead.nextFollowUp ? (
                            <p
                              className={`mt-0.5 font-semibold ${
                                nextOverdue ? 'text-[#B93A2E]' : 'text-[#2878B8]'
                              }`}
                            >
                              Hẹn gọi: {formatDateTimeVi(lead.nextFollowUp.dueAt)}
                              {nextOverdue ? ' (Quá hạn)' : ''}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[#94A3B8]">Chưa đặt lịch gọi lại</p>
                          )}
                        </DataTableCell>

                        <DataTableCell className="whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/sales/leads/${lead.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
                            </Button>

                            <ActionGuard permission="sales.consultations.create">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setConsultModalLead(lead)}
                              >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                <span>Tư vấn</span>
                              </Button>
                            </ActionGuard>

                            <ActionGuard permission="sales.followups.create">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Đặt lịch liên hệ lại"
                                onClick={() => setFollowUpModalLead(lead)}
                              >
                                <CalendarClock className="h-3.5 w-3.5" />
                              </Button>
                            </ActionGuard>

                            <ActionGuard permission="sales.leads.update">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Chuyển trạng thái"
                                onClick={() => setStatusModalLead(lead)}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </ActionGuard>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>

            <Pagination
              page={paginatedLeads.page}
              totalPages={paginatedLeads.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </section>

      {/* Khu vực 2 & 3: Lịch liên hệ lại + Hoạt động gần đây */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Lịch liên hệ lại */}
        <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#243B53]">Lịch liên hệ lại</h2>
          </div>

          {!canViewFollowUps ? (
            <div className="mt-4">
              <EmptyBlock title="Bạn không có quyền xem lịch liên hệ lại" />
            </div>
          ) : (
            <>
              <div className="mt-3 inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFollowUpTab('overdue')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    followUpTab === 'overdue' ? 'bg-[#B93A2E] text-white' : 'text-[#475569]'
                  }`}
                >
                  Quá hạn ({categorizedFollowUps.overdue.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpTab('today')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    followUpTab === 'today' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
                  }`}
                >
                  Hôm nay ({categorizedFollowUps.today.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpTab('upcoming')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    followUpTab === 'upcoming' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
                  }`}
                >
                  Sắp tới ({categorizedFollowUps.upcoming.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpTab('done')}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    followUpTab === 'done' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
                  }`}
                >
                  Đã xử lý ({categorizedFollowUps.done.length})
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {activeFollowUpList.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#DCEAF3] p-6 text-center text-xs text-[#64748B]">
                    Không có lịch liên hệ nào trong nhóm này.
                  </p>
                ) : (
                  activeFollowUpList.map((fup) => {
                    const overdue = isFollowUpOverdue(fup, nowIso)
                    return (
                      <div
                        key={fup.id}
                        className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center ${
                          overdue
                            ? 'border-[#FECACA] bg-[#FDECE9]/50'
                            : 'border-[#DCEAF3] bg-[#F8FBFD]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/sales/leads/${fup.leadId}`}
                              className="text-sm font-bold text-[#243B53] hover:text-[#2878B8] hover:underline"
                            >
                              {fup.leadName}
                            </Link>
                            <span className="text-xs font-semibold text-[#64748B]">
                              {fup.leadPhone}
                            </span>
                            {overdue ? (
                              <Badge tone="danger">Quá hạn gọi lại</Badge>
                            ) : (
                              <Badge tone={FOLLOW_UP_STATUS_META[fup.status].tone}>
                                {FOLLOW_UP_STATUS_META[fup.status].label}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#243B53]">{fup.note}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
                            Hẹn lúc: {formatDateTimeVi(fup.dueAt)}
                          </p>
                        </div>

                        {fup.status === 'Scheduled' && (
                          <ActionGuard permission="sales.followups.update">
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <Button
                                size="sm"
                                loading={updateFollowUpStatus.isPending}
                                onClick={() =>
                                  handleFollowUpTransition(fup.id, 'Completed', fup.leadName)
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Hoàn thành</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={updateFollowUpStatus.isPending}
                                onClick={() =>
                                  handleFollowUpTransition(fup.id, 'Missed', fup.leadName)
                                }
                              >
                                <PhoneOff className="h-3.5 w-3.5" />
                                <span>Không bắt máy</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={updateFollowUpStatus.isPending}
                                onClick={() =>
                                  handleFollowUpTransition(fup.id, 'Cancelled', fup.leadName)
                                }
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Hủy lịch</span>
                              </Button>
                            </div>
                          </ActionGuard>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </section>

        {/* Hoạt động gần đây */}
        <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
          <h2 className="text-base font-extrabold text-[#243B53]">Hoạt động tư vấn gần đây</h2>
          <p className="text-xs text-[#64748B]">
            Tổng hợp thời gian thực từ nhật ký tư vấn, lịch hẹn, trạng thái Lead và hồ sơ đăng ký.
          </p>

          <div className="mt-4 space-y-3">
            {visibleActivities.length === 0 ? (
              <p className="text-xs text-[#64748B]">Chưa có hoạt động nào được ghi nhận.</p>
            ) : (
              visibleActivities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/sales/leads/${act.leadId}`}
                      className="min-w-0 font-extrabold text-[#2878B8] hover:underline"
                    >
                      {act.leadName}
                    </Link>
                    <span className="text-[11px] text-[#64748B]">
                      {formatDateTimeVi(act.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-[#243B53]">{act.description}</p>
                  <p className="mt-0.5 text-[11px] text-[#64748B]">Bởi: {act.actorName}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Hộp thoại tác nghiệp */}
      {createLeadOpen && (
        <CreateOrEditLeadModal
          open={createLeadOpen}
          actor={actor}
          courses={courses}
          branches={branches}
          saleEmployees={saleEmployees}
          onClose={() => setCreateLeadOpen(false)}
        />
      )}

      {statusModalLead && (
        <TransitionLeadStatusModal
          open={Boolean(statusModalLead)}
          lead={statusModalLead}
          canAdminReopenLead={actor.canAdminReopenLead}
          onClose={() => setStatusModalLead(null)}
        />
      )}

      {consultModalLead && (
        <LogConsultationModal
          open={Boolean(consultModalLead)}
          lead={consultModalLead}
          courses={courses}
          classes={classes}
          onClose={() => setConsultModalLead(null)}
        />
      )}

      {followUpModalLead && (
        <ScheduleFollowUpModal
          open={Boolean(followUpModalLead)}
          lead={followUpModalLead}
          defaultDateYmd={todayYmdVn}
          onClose={() => setFollowUpModalLead(null)}
        />
      )}
    </div>
  )
}
