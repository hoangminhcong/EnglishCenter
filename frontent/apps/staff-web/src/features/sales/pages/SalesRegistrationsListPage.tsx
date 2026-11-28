import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, FilePlus2 } from 'lucide-react'
import {
  COURSE_REGISTRATION_STATUSES,
  type CourseRegistrationStatus,
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
import { formatDate, formatDateTimeVi, formatVnd, matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  useAccessibleSalesLeads,
  useSalesActor,
  useSalesReferenceCatalogs,
  useSalesRegistrationsList,
} from '@/features/sales/hooks/useSalesCrm'
import { REGISTRATION_STATUS_META } from '@/features/sales/types/sales.types'
import { PageHeader } from '@/shared/components/PageHeader'

type RegSortKey = 'newest' | 'start_date' | 'tuition_desc'

export function SalesRegistrationsListPage() {
  useDocumentTitle('Danh sách Hồ sơ đăng ký – Sales CRM')
  const actor = useSalesActor()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | CourseRegistrationStatus>('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [saleFilter, setSaleFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<RegSortKey>('newest')
  const [page, setPage] = useState(1)

  const { data: registrations = [], isLoading, error, refetch } = useSalesRegistrationsList()
  const { data: leads = [] } = useAccessibleSalesLeads()
  const { courses, branches, saleEmployees } = useSalesReferenceCatalogs()

  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads])
  const saleMap = useMemo(
    () => new Map(saleEmployees.map((s) => [s.id, s.fullName])),
    [saleEmployees],
  )

  const statusCounts = useMemo(() => {
    const counts: Record<CourseRegistrationStatus, number> = {
      Draft: 0,
      Submitted: 0,
      Reviewing: 0,
      NeedAdditionalInfo: 0,
      Approved: 0,
      Rejected: 0,
      Cancelled: 0,
      Converted: 0,
    }
    for (const reg of registrations) {
      counts[reg.status] += 1
    }
    return counts
  }, [registrations])

  const filteredAndSorted = useMemo(() => {
    const filtered = registrations.filter((reg) => {
      if (statusFilter !== 'ALL' && reg.status !== statusFilter) return false
      if (courseFilter !== 'ALL' && reg.courseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && reg.branchId !== branchFilter) return false
      if (saleFilter !== 'ALL' && reg.saleId !== saleFilter) return false

      if (search.trim()) {
        const customer = leadMap.get(reg.leadId)
        const ok =
          matchText(reg.registrationCode, search) ||
          matchText(reg.snapshot.classCode, search) ||
          matchText(reg.snapshot.courseName, search) ||
          matchText(customer?.fullName ?? '', search) ||
          matchText(customer?.phone ?? '', search)
        if (!ok) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'start_date') {
        return a.snapshot.classStartDate.localeCompare(b.snapshot.classStartDate)
      }
      if (sortBy === 'tuition_desc') {
        return b.snapshot.netEstimatedTuitionVnd - a.snapshot.netEstimatedTuitionVnd
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [registrations, statusFilter, courseFilter, branchFilter, saleFilter, search, leadMap, sortBy])

  const paginated = paginate(filteredAndSorted, page, 8)

  if (isLoading) return <LoadingBlock label="Đang tải danh sách hồ sơ đăng ký..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách hồ sơ đăng ký."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Danh sách Hồ sơ Đăng ký Khóa học"
        description="Theo dõi trạng thái tiếp nhận và xét duyệt hồ sơ đăng ký khóa học."
        badge={<Badge tone="info">{registrations.length} hồ sơ</Badge>}
        actions={
          <ActionGuard permission="sales.registrations.create">
            <Button onClick={() => navigate('/sales/registrations/new')}>
              <FilePlus2 className="h-4 w-4" />
              <span>Tạo hồ sơ đăng ký mới</span>
            </Button>
          </ActionGuard>
        }
      />

      {/* Thống kê nhanh theo trạng thái */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COURSE_REGISTRATION_STATUSES.map((st) => {
          const active = statusFilter === st
          return (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(active ? 'ALL' : st)
                setPage(1)
              }}
              className={`min-w-0 rounded-xl border p-3 text-left transition ${
                active
                  ? 'border-[#2878B8] bg-[#EAF6FD]'
                  : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
              }`}
            >
              <p className="text-xl font-black tabular-nums text-[#243B53]">{statusCounts[st]}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-bold text-[#64748B]">
                {REGISTRATION_STATUS_META[st].label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Bộ lọc & Sắp xếp */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <InputField
          id="reg-list-search"
          label="Tìm kiếm"
          placeholder="Mã REG-..., tên khách, SĐT, mã lớp..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />

        <SelectField
          id="reg-list-course"
          label="Khóa học"
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
          id="reg-list-branch"
          label="Cơ sở"
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả cơ sở' },
            ...branches.map((b) => ({ value: b.id, label: b.shortLabel || b.name })),
          ]}
        />

        {actor.scope !== 'own' ? (
          <SelectField
            id="reg-list-sale"
            label="Sale phụ trách"
            value={saleFilter}
            onChange={(e) => {
              setSaleFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Mọi nhân viên Sale' },
              ...saleEmployees.map((s) => ({ value: s.id, label: s.fullName })),
            ]}
          />
        ) : (
          <SelectField
            id="reg-list-status"
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | CourseRegistrationStatus)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              ...COURSE_REGISTRATION_STATUSES.map((st) => ({
                value: st,
                label: REGISTRATION_STATUS_META[st].label,
              })),
            ]}
          />
        )}

        <SelectField
          id="reg-list-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as RegSortKey)}
          options={[
            { value: 'newest', label: 'Mới tạo gần nhất' },
            { value: 'start_date', label: 'Ngày khai giảng lớp' },
            { value: 'tuition_desc', label: 'Học phí dự kiến giảm dần' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock
          title="Không tìm thấy hồ sơ đăng ký nào"
          description="Thử xóa bộ lọc hoặc tạo hồ sơ đăng ký mới."
        />
      ) : (
        <>
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã hồ sơ & Ngày tạo
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Khách hàng</DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học & Lớp đã chọn</DataTableHeaderCell>
                  <DataTableHeaderCell>Cơ sở & Lịch học</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mục tiêu & Học phí dự kiến
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Sale phụ trách
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái xử lý
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Chi tiết
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((reg) => {
                  const customer = leadMap.get(reg.leadId)
                  const stMeta = REGISTRATION_STATUS_META[reg.status]
                  return (
                    <DataTableRow key={reg.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <Link
                          to={`/sales/registrations/${reg.id}`}
                          className="font-extrabold text-[#2878B8] hover:underline"
                        >
                          {reg.registrationCode}
                        </Link>
                        <p className="text-[11px] text-[#64748B]">
                          {formatDateTimeVi(reg.createdAt)}
                        </p>
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">
                          {customer?.fullName ?? 'Khách hàng'}
                        </p>
                        <p className="text-xs text-[#64748B]">{customer?.phone ?? '—'}</p>
                      </DataTableCell>

                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <p className="text-xs font-bold text-[#243B53]">
                            {reg.snapshot.courseName}
                          </p>
                          <Badge tone="info">Lớp {reg.snapshot.classCode}</Badge>
                        </div>
                      </DataTableCell>

                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">{reg.snapshot.branchName}</p>
                        <p className="whitespace-nowrap text-[#64748B]">
                          {reg.snapshot.classScheduleSummary}
                        </p>
                        <p className="whitespace-nowrap text-[11px] text-[#2878B8]">
                          KG: {formatDate(reg.snapshot.classStartDate)}
                        </p>
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap text-xs">
                        <p className="font-bold text-[#243B53]">
                          Mục tiêu: {reg.scoreGoal.targetScore}+ TOEIC
                        </p>
                        <p className="mt-0.5 font-extrabold text-[#1F7A4C]">
                          {reg.estimatedTuition.hasPricingData
                            ? formatVnd(reg.snapshot.netEstimatedTuitionVnd)
                            : 'Chưa có dữ liệu học phí'}
                        </p>
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap text-xs font-semibold">
                        {saleMap.get(reg.saleId) ?? reg.saleId}
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                      </DataTableCell>

                      <DataTableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/sales/registrations/${reg.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Mở</span>
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>

          <Pagination
            page={paginated.page}
            totalPages={paginated.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
