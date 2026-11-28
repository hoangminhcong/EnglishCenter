import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
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
  Modal,
  Pagination,
  SelectField,
} from '@english-center/ui'
import { matchText, paginate } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { trainingApi } from '@/features/training/api/trainingApi'
import type { ActualTrainingClassRecord } from '@/features/training/types/training.types'
import { PageHeader } from '@/shared/components/PageHeader'

export function TrainingSupervisionPage() {
  useDocumentTitle('Tổng quan đào tạo')
  const [activeTab, setActiveTab] = useState<'actual_classes' | 'public_schedules'>(
    'actual_classes',
  )
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Offline' | 'Online'>('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ongoing' | 'upcoming' | 'completed'>(
    'ALL',
  )
  const [page, setPage] = useState(1)
  const [selectedClass, setSelectedClass] = useState<ActualTrainingClassRecord | null>(null)

  const {
    data: actualClasses = [],
    isLoading: loadingClasses,
    error: errorClasses,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['staff', 'training', 'actual-classes'],
    queryFn: () => trainingApi.listActualClasses(),
  })

  const {
    data: publicSchedules = [],
    isLoading: loadingSchedules,
    error: errorSchedules,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['staff', 'training', 'public-schedules'],
    queryFn: () => trainingApi.listPublicSchedules(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const filteredClasses = useMemo(() => {
    return actualClasses.filter((cls) => {
      if (modeFilter !== 'ALL' && cls.studyMode !== modeFilter) return false
      if (branchFilter !== 'ALL' && cls.branchId !== branchFilter) return false
      if (courseFilter !== 'ALL' && cls.courseId !== courseFilter) return false
      if (statusFilter !== 'ALL' && cls.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(cls.classCode, search) ||
          matchText(cls.courseName, search) ||
          matchText(cls.teacherName, search) ||
          matchText(cls.branchName, search)
        )
      }
      return true
    })
  }, [actualClasses, modeFilter, branchFilter, courseFilter, statusFilter, search])

  const filteredSchedules = useMemo(() => {
    return publicSchedules.filter((sch) => {
      if (modeFilter !== 'ALL' && sch.studyMode !== modeFilter) return false
      if (branchFilter !== 'ALL' && sch.branchId !== branchFilter) return false
      if (courseFilter !== 'ALL' && sch.courseId !== courseFilter) return false
      if (search.trim()) {
        return (
          matchText(sch.classCode, search) ||
          matchText(sch.courseName, search) ||
          matchText(sch.branchName, search)
        )
      }
      return true
    })
  }, [publicSchedules, modeFilter, branchFilter, courseFilter, search])

  const paginatedClasses = useMemo(
    () => paginate(filteredClasses, page, 8),
    [filteredClasses, page],
  )
  const paginatedSchedules = useMemo(
    () => paginate(filteredSchedules, page, 8),
    [filteredSchedules, page],
  )

  if (loadingClasses || loadingSchedules) {
    return <LoadingBlock label="Đang tải dữ liệu giám sát đào tạo..." />
  }

  if (errorClasses || errorSchedules) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu lớp đào tạo và lịch khai giảng."
        onRetry={() => {
          void refetchClasses()
          void refetchSchedules()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan Đào tạo & Lịch khai giảng"
        description="Theo dõi tiến độ các lớp đào tạo và lịch khai giảng công khai."
        badge={<Badge tone="warning">Chỉ xem</Badge>}
      />

      {/* Tabs + Bộ lọc */}
      <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('actual_classes')
              setPage(1)
            }}
            className={`rounded-lg px-3.5 py-2 transition ${
              activeTab === 'actual_classes'
                ? 'bg-[#2878B8] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            1. Lớp đào tạo toàn trung tâm ({actualClasses.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('public_schedules')
              setPage(1)
            }}
            className={`rounded-lg px-3.5 py-2 transition ${
              activeTab === 'public_schedules'
                ? 'bg-[#2878B8] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            2. Lịch khai giảng công khai Website ({publicSchedules.length})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <InputField
            id="trn-search"
            placeholder="Tìm mã lớp, khóa học, giảng viên..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <SelectField
            id="trn-branch"
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
          <SelectField
            id="trn-course"
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả khóa học' },
              ...courses.map((c) => ({ value: c.id, label: c.code })),
            ]}
          />
          <SelectField
            id="trn-mode"
            value={modeFilter}
            onChange={(e) => {
              setModeFilter(e.target.value as 'ALL' | 'Offline' | 'Online')
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Mọi hình thức' },
              { value: 'Offline', label: 'Tại cơ sở (Offline)' },
              { value: 'Online', label: 'Trực tuyến (Online)' },
            ]}
          />
          {activeTab === 'actual_classes' && (
            <SelectField
              id="trn-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as 'ALL' | 'ongoing' | 'upcoming' | 'completed',
                )
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái lớp' },
                { value: 'ongoing', label: 'Đang học (Ongoing)' },
                { value: 'upcoming', label: 'Đang tuyển / Sắp mở' },
                { value: 'completed', label: 'Đã kết thúc' },
              ]}
            />
          )}
        </div>
      </div>

      {activeTab === 'actual_classes' ? (
        paginatedClasses.items.length === 0 ? (
          <EmptyBlock title="Không tìm thấy lớp đào tạo phù hợp" />
        ) : (
          <>
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="min-w-[180px]">
                      Mã lớp & Khóa học
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[200px]">
                      Cơ sở & Phòng học
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Giảng viên phụ trách
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Sĩ số & Tiến độ
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Chuyên cần
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Giám sát
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {paginatedClasses.items.map((cls) => {
                    const pct =
                      cls.totalSessions > 0
                        ? Math.min(100, Math.round((cls.completedSessions / cls.totalSessions) * 100))
                        : 0
                    const scheduleDisplay =
                      cls.scheduleDays === cls.timeSlot
                        ? cls.scheduleDays
                        : `${cls.scheduleDays} (${cls.timeSlot})`
                    return (
                      <DataTableRow key={cls.id}>
                        <DataTableCell>
                          <p className="font-bold whitespace-nowrap text-[#243B53]">
                            {cls.classCode}
                          </p>
                          <p className="text-xs text-[#64748B]">{cls.courseName}</p>
                        </DataTableCell>
                        <DataTableCell>
                          <p className="font-medium text-[#243B53]">{cls.branchName}</p>
                          <p className="text-xs text-[#64748B]">
                            {cls.roomLabel} • {scheduleDisplay}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-semibold text-[#243B53]">{cls.teacherName}</p>
                          <p className="text-xs text-[#64748B]">{cls.teacherCode}</p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="text-xs font-bold text-[#243B53]">
                            {cls.enrolledCount}/{cls.maxCapacity} HV • Buổi {cls.completedSessions}/
                            {cls.totalSessions}
                          </p>
                          <div className="mt-1.5 h-2 w-28 overflow-hidden rounded-full bg-[#EAF6FD]">
                            <div
                              className="h-full rounded-full bg-[#2878B8]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          {cls.status === 'upcoming' ? (
                            <span className="text-xs text-[#64748B]">Chưa khai giảng</span>
                          ) : cls.attendanceRatePercent > 0 ? (
                            <span className="text-xs font-bold text-[#1F7A4C]">
                              {cls.attendanceRatePercent}% đi học
                            </span>
                          ) : (
                            <span className="text-xs text-[#64748B]">Chưa điểm danh</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge
                            tone={
                              cls.status === 'ongoing'
                                ? 'success'
                                : cls.status === 'upcoming'
                                  ? 'info'
                                  : 'neutral'
                            }
                          >
                            {cls.status === 'ongoing'
                              ? 'Đang học'
                              : cls.status === 'upcoming'
                                ? 'Đang tuyển / Sắp mở'
                                : 'Đã kết thúc'}
                          </Badge>
                        </DataTableCell>
                        <DataTableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedClass(cls)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
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
              page={paginatedClasses.page}
              totalPages={paginatedClasses.totalPages}
              onChange={setPage}
            />
          </>
        )
      ) : paginatedSchedules.items.length === 0 ? (
        <EmptyBlock title="Không tìm thấy lịch khai giảng công khai phù hợp" />
      ) : (
        <>
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã lịch lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[200px]">
                    Khóa học & Hình thức
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Cơ sở</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Lịch học & Khai giảng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Đăng ký / Chỉ tiêu
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Hiển thị Website
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginatedSchedules.items.map((sch) => (
                  <DataTableRow key={sch.id}>
                    <DataTableCell className="font-bold whitespace-nowrap">
                      {sch.classCode}
                    </DataTableCell>
                    <DataTableCell>
                      <p className="font-semibold text-[#243B53]">{sch.courseName}</p>
                      <p className="text-xs text-[#64748B]">
                        {sch.studyMode} • {sch.classTypeLabel}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{sch.branchName}</DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      <p className="font-semibold text-[#243B53]">KG: {sch.startDate}</p>
                      <p className="text-[#64748B]">
                        {sch.studyDays === sch.timeSlot
                          ? sch.studyDays
                          : `${sch.studyDays} • ${sch.timeSlot}`}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="font-bold whitespace-nowrap">
                      {sch.enrolledStudents}/{sch.maxStudents} HV
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            sch.status === 'open'
                              ? 'success'
                              : sch.status === 'full'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {sch.status === 'open'
                            ? 'Đang nhận đăng ký'
                            : sch.status === 'full'
                              ? 'Đã đủ sĩ số'
                              : 'Sắp khai giảng'}
                        </Badge>
                        {!sch.isPublished && <Badge tone="neutral">Ẩn trên Web</Badge>}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
          <Pagination
            page={paginatedSchedules.page}
            totalPages={paginatedSchedules.totalPages}
            onChange={setPage}
          />
        </>
      )}

      {/* Modal chi tiết lớp học (Read-only) */}
      <Modal
        open={Boolean(selectedClass)}
        title={`Hồ sơ giám sát lớp ${selectedClass?.classCode ?? ''}`}
        onClose={() => setSelectedClass(null)}
        maxWidthClassName="max-w-xl"
      >
        {selectedClass && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
              <p>
                <span className="text-[#64748B]">Khóa học:</span>{' '}
                <strong>{selectedClass.courseName}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Giảng viên:</span>{' '}
                <strong>
                  {selectedClass.teacherName} ({selectedClass.teacherCode})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Cơ sở:</span>{' '}
                <strong>{selectedClass.branchName}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Phòng học:</span>{' '}
                <strong>{selectedClass.roomLabel}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Thời gian khóa:</span>{' '}
                <strong>
                  {selectedClass.startDate} {'->'} {selectedClass.endDate}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Hoàn thành BTVN:</span>{' '}
                <strong>{selectedClass.homeworkCompletionPercent}%</strong>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
