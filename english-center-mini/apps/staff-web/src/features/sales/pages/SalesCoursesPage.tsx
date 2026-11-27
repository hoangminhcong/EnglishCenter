import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, FilePlus2, GitCompareArrows, RotateCcw } from 'lucide-react'
import {
  CLASS_RECRUITMENT_STATUSES,
  computeRemainingClassSeats,
  isClassOpenForRegistration,
  type CenterClassOfferingDto,
  type ClassRecruitmentStatus,
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
  InputField,
  LoadingBlock,
  Modal,
  SelectField,
} from '@english-center/ui'
import { formatDate, formatVnd, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { ClassOfferingDetailModal } from '@/features/sales/components/ClassOfferingDetailModal'
import { useSalesReferenceCatalogs } from '@/features/sales/hooks/useSalesCrm'
import { CLASS_RECRUITMENT_STATUS_META } from '@/features/sales/types/sales.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'

function matchesTimeSlotFilter(
  startTime: string,
  slot: 'ALL' | 'morning' | 'afternoon' | 'evening',
): boolean {
  if (slot === 'ALL') return true
  const hour = Number(startTime.split(':')[0])
  if (!Number.isFinite(hour)) return true
  if (slot === 'morning') return hour < 12
  if (slot === 'afternoon') return hour >= 12 && hour < 18
  return hour >= 18
}

export function SalesCoursesPage() {
  useDocumentTitle('Khóa học & Lớp đang mở để tư vấn')
  const { session } = useStaffAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const canCreateReg = hasPermission(session, 'sales.registrations.create')
  const canViewClasses = hasPermission(session, 'sales.classes.view')
  const activeTab = searchParams.get('tab') === 'open-classes' ? 'open-classes' : 'courses'

  const {
    courses,
    branches,
    classes,
    tuitionPolicies,
    milestones,
    isLoadingCatalogs,
  } = useSalesReferenceCatalogs()

  // Bộ lọc Tab Khóa học
  const [courseSearch, setCourseSearch] = useState('')
  const [courseBranchFilter, setCourseBranchFilter] = useState('ALL')
  const [courseMilestoneFilter, setCourseMilestoneFilter] = useState('ALL')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  // Bộ lọc Tab Lớp đang mở toàn hệ thống
  const [classSearch, setClassSearch] = useState('')
  const [classCourseFilter, setClassCourseFilter] = useState('ALL')
  const [classBranchFilter, setClassBranchFilter] = useState('ALL')
  const [classStartFrom, setClassStartFrom] = useState('')
  const [classDayFilter, setClassDayFilter] = useState('ALL')
  const [classTimeSlot, setClassTimeSlot] = useState<'ALL' | 'morning' | 'afternoon' | 'evening'>(
    'ALL',
  )
  const [classTeacherFilter, setClassTeacherFilter] = useState('ALL')
  const [classStatusFilter, setClassStatusFilter] = useState<
    'OPEN_DEFAULT' | 'ALL' | ClassRecruitmentStatus
  >('OPEN_DEFAULT')
  const [onlyAvailableSeats, setOnlyAvailableSeats] = useState(false)
  const [detailClass, setDetailClass] = useState<CenterClassOfferingDto | null>(null)

  const handleResetClassFilters = () => {
    setClassSearch('')
    setClassCourseFilter('ALL')
    setClassBranchFilter('ALL')
    setClassStartFrom('')
    setClassDayFilter('ALL')
    setClassTimeSlot('ALL')
    setClassTeacherFilter('ALL')
    setClassStatusFilter('OPEN_DEFAULT')
    setOnlyAvailableSeats(false)
  }

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches])
  const activePolicyByCourse = useMemo(() => {
    const map = new Map<string, (typeof tuitionPolicies)[number]>()
    for (const pol of tuitionPolicies) {
      if (pol.status === 'active' && !map.has(pol.courseId)) {
        map.set(pol.courseId, pol)
      }
    }
    return map
  }, [tuitionPolicies])

  const openCourses = useMemo(
    () => courses.filter((c) => c.status === 'active'),
    [courses],
  )

  const filteredCourses = useMemo(() => {
    return openCourses.filter((course) => {
      if (courseMilestoneFilter !== 'ALL' && course.milestoneId !== courseMilestoneFilter) {
        return false
      }
      if (courseBranchFilter !== 'ALL') {
        const hasClassAtBranch = classes.some(
          (cls) => cls.courseId === course.id && cls.branchId === courseBranchFilter,
        )
        if (!hasClassAtBranch) return false
      }
      if (courseSearch.trim()) {
        const ok =
          matchText(course.name, courseSearch) ||
          matchText(course.code, courseSearch) ||
          matchText(course.level, courseSearch) ||
          matchText(course.targetScoreLabel, courseSearch)
        if (!ok) return false
      }
      return true
    })
  }, [openCourses, courseMilestoneFilter, courseBranchFilter, classes, courseSearch])

  const teacherOptions = useMemo(() => {
    const names = Array.from(
      new Set(classes.map((c) => c.teacherName).filter((n): n is string => Boolean(n))),
    )
    return [
      { value: 'ALL', label: 'Tất cả giảng viên' },
      ...names.map((n) => ({ value: n, label: n })),
      { value: 'UNASSIGNED', label: 'Chưa phân công giảng viên' },
    ]
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (classStatusFilter === 'OPEN_DEFAULT') {
        if (cls.status !== 'open' && cls.status !== 'upcoming') return false
      } else if (classStatusFilter !== 'ALL' && cls.status !== classStatusFilter) {
        return false
      }

      if (onlyAvailableSeats) {
        const rem = computeRemainingClassSeats(cls)
        if (rem === null || rem <= 0 || !isClassOpenForRegistration(cls)) return false
      }

      if (classCourseFilter !== 'ALL' && cls.courseId !== classCourseFilter) return false
      if (classBranchFilter !== 'ALL' && cls.branchId !== classBranchFilter) return false
      if (classStartFrom && cls.startDate < classStartFrom) return false
      if (classDayFilter !== 'ALL' && !matchText(cls.studyDays, classDayFilter)) return false
      if (!matchesTimeSlotFilter(cls.startTime, classTimeSlot)) return false

      if (classTeacherFilter === 'UNASSIGNED' && cls.teacherName) return false
      if (
        classTeacherFilter !== 'ALL' &&
        classTeacherFilter !== 'UNASSIGNED' &&
        cls.teacherName !== classTeacherFilter
      ) {
        return false
      }

      if (classSearch.trim()) {
        const ok =
          matchText(cls.id, classSearch) ||
          matchText(cls.classCode, classSearch) ||
          matchText(cls.className, classSearch) ||
          matchText(courseMap.get(cls.courseId)?.name ?? '', classSearch)
        if (!ok) return false
      }

      return true
    })
  }, [
    classes,
    classStatusFilter,
    onlyAvailableSeats,
    classCourseFilter,
    classBranchFilter,
    classStartFrom,
    classDayFilter,
    classTimeSlot,
    classTeacherFilter,
    classSearch,
    courseMap,
  ])

  const toggleCompare = (courseId: string) => {
    setCompareIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : prev.length < 4
          ? [...prev, courseId]
          : prev,
    )
  }

  if (isLoadingCatalogs) {
    return <LoadingBlock label="Đang tải danh mục Khóa học & Lớp đang mở..." />
  }

  const comparedCourses = openCourses.filter((c) => compareIds.includes(c.id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Xem Khóa học & Lớp đang mở để tư vấn"
        description="Tra cứu thông tin khóa học, chính sách ưu đãi và các lớp đang mở tuyển sinh."
        badge={
          <Badge tone="info">
            {openCourses.length} khóa học
            {canViewClasses
              ? ` • ${classes.filter((c) => isClassOpenForRegistration(c)).length} lớp đang nhận đăng ký`
              : ''}
          </Badge>
        }
        actions={
          compareIds.length >= 2 ? (
            <Button variant="secondary" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows className="h-4 w-4" />
              <span>So sánh {compareIds.length} khóa đã chọn</span>
            </Button>
          ) : undefined
        }
      />

      {/* Thanh chuyển Tab */}
      <div className="inline-flex flex-wrap rounded-2xl border border-[#DCEAF3] bg-white p-1.5 text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'courses' })}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'courses' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          1. Toàn bộ Khóa học ({openCourses.length})
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'open-classes' })}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'open-classes' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          2. Lớp đang mở tại tất cả cơ sở ({canViewClasses ? filteredClasses.length : 0})
        </button>
      </div>

      {/* TAB 1: DANH MỤC KHÓA HỌC */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs md:grid-cols-3">
            <InputField
              id="sc-search"
              label="Tìm kiếm khóa học"
              placeholder="Tên khóa, mã FOUNDATION / SUBMARINE, trình độ..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            <SelectField
              id="sc-branch"
              label="Cơ sở đang tổ chức"
              value={courseBranchFilter}
              onChange={(e) => setCourseBranchFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'Tất cả cơ sở' },
                ...branches
                  .filter((b) => b.isActive)
                  .map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <SelectField
              id="sc-milestone"
              label="Mục tiêu điểm đầu ra"
              value={courseMilestoneFilter}
              onChange={(e) => setCourseMilestoneFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'Mọi mốc mục tiêu' },
                ...milestones.map((m) => ({
                  value: m.id,
                  label: `${m.code} – ${m.label}`,
                })),
              ]}
            />
          </div>

          {filteredCourses.length === 0 ? (
            <EmptyBlock title="Không có khóa học nào khớp điều kiện lọc" />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredCourses.map((course) => {
                const courseClasses = classes.filter((c) => c.courseId === course.id)
                const openCourseClasses = courseClasses.filter((c) =>
                  isClassOpenForRegistration(c),
                )
                const organizingBranchNames = Array.from(
                  new Set(
                    openCourseClasses.map(
                      (c) => branchMap.get(c.branchId)?.shortLabel ?? c.branchId,
                    ),
                  ),
                )
                const policy = activePolicyByCourse.get(course.id)
                const checkedCompare = compareIds.includes(course.id)

                return (
                  <div
                    key={course.id}
                    className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Badge tone="info">{course.code}</Badge>
                          <Badge tone="success">{course.targetScoreLabel}</Badge>
                        </div>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#2878B8]">
                          <input
                            type="checkbox"
                            checked={checkedCompare}
                            onChange={() => toggleCompare(course.id)}
                          />
                          <span>Chọn so sánh</span>
                        </label>
                      </div>

                      <h2 className="mt-2.5 text-lg font-extrabold text-[#243B53]">
                        {course.name}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                        {course.shortDescription ||
                          'Chương trình đào tạo chuẩn lộ trình English Center.'}
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-[#F8FBFD] p-3 text-xs sm:grid-cols-2">
                        <p>
                          <span className="text-[#64748B]">Đầu vào:</span>{' '}
                          <strong>{course.level}</strong>
                        </p>
                        <p>
                          <span className="text-[#64748B]">Thời lượng:</span>{' '}
                          <strong>
                            {course.duration} ({course.sessionsCount} buổi)
                          </strong>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-[#64748B]">Niêm yết:</span>{' '}
                          <strong>{formatVnd(course.listedTuitionVnd)}</strong>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-[#64748B]">Chính sách ưu đãi:</span>{' '}
                          <strong className="text-[#1F7A4C]">
                            {policy ? formatVnd(policy.netTuitionVnd) : 'Theo niêm yết'}
                          </strong>
                        </p>
                      </div>

                      {canViewClasses && (
                        <p className="mt-2.5 text-xs text-[#475569]">
                          <strong className="text-[#2878B8]">
                            {openCourseClasses.length} lớp đang nhận đăng ký
                          </strong>{' '}
                          tại:{' '}
                          {organizingBranchNames.length > 0
                            ? organizingBranchNames.join(', ')
                            : 'Chưa có đợt mở mới'}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF4F8] pt-3.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/sales/courses/${course.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Chi tiết & Gắn vào Lead</span>
                      </Button>

                      <ActionGuard permission="sales.registrations.create">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/sales/registrations/new?courseId=${course.id}`)
                          }
                        >
                          <FilePlus2 className="h-3.5 w-3.5" />
                          <span>Đăng ký khóa này</span>
                        </Button>
                      </ActionGuard>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOÀN BỘ LỚP ĐANG MỞ TẠI TẤT CẢ CƠ SỞ */}
      {activeTab === 'open-classes' &&
        (!canViewClasses ? (
          <EmptyBlock title="Bạn không có quyền xem danh sách lớp đang mở" />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InputField
                  id="cls-search"
                  label="Tìm mã lớp / tên lớp"
                  placeholder="VD: TOEIC-FD01, ONL-SB01..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                />

                <SelectField
                  id="cls-course"
                  label="Khóa học"
                  value={classCourseFilter}
                  onChange={(e) => setClassCourseFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'Tất cả khóa học' },
                    ...openCourses.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />

                <SelectField
                  id="cls-branch"
                  label="Cơ sở đào tạo"
                  value={classBranchFilter}
                  onChange={(e) => setClassBranchFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'Tất cả cơ sở' },
                    ...branches
                      .filter((b) => b.isActive)
                      .map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />

                <SelectField
                  id="cls-status"
                  label="Trạng thái tuyển sinh"
                  value={classStatusFilter}
                  onChange={(e) =>
                    setClassStatusFilter(
                      e.target.value as 'OPEN_DEFAULT' | 'ALL' | ClassRecruitmentStatus,
                    )
                  }
                  options={[
                    {
                      value: 'OPEN_DEFAULT',
                      label: 'Đang nhận đăng ký (Mặc định)',
                    },
                    { value: 'ALL', label: 'Tất cả trạng thái lớp' },
                    ...CLASS_RECRUITMENT_STATUSES.map((st) => ({
                      value: st,
                      label: CLASS_RECRUITMENT_STATUS_META[st].label,
                    })),
                  ]}
                />

                <InputField
                  id="cls-start-date"
                  label="Khai giảng từ ngày"
                  type="date"
                  value={classStartFrom}
                  onChange={(e) => setClassStartFrom(e.target.value)}
                />

                <SelectField
                  id="cls-day"
                  label="Thứ học trong tuần"
                  value={classDayFilter}
                  onChange={(e) => setClassDayFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'Mọi ngày trong tuần' },
                    { value: 'Thứ 2', label: 'Có Thứ 2' },
                    { value: 'Thứ 3', label: 'Có Thứ 3' },
                    { value: 'Thứ 4', label: 'Có Thứ 4' },
                    { value: 'Thứ 5', label: 'Có Thứ 5' },
                    { value: 'Thứ 6', label: 'Có Thứ 6' },
                    { value: 'Thứ 7', label: 'Có Thứ 7' },
                    { value: 'Chủ nhật', label: 'Có Chủ nhật' },
                  ]}
                />

                <SelectField
                  id="cls-slot"
                  label="Khung giờ học"
                  value={classTimeSlot}
                  onChange={(e) =>
                    setClassTimeSlot(
                      e.target.value as 'ALL' | 'morning' | 'afternoon' | 'evening',
                    )
                  }
                  options={[
                    { value: 'ALL', label: 'Mọi khung giờ' },
                    { value: 'morning', label: 'Ca sáng (< 12:00)' },
                    { value: 'afternoon', label: 'Ca chiều (12:00 – 17:59)' },
                    { value: 'evening', label: 'Ca tối (>= 18:00)' },
                  ]}
                />

                <SelectField
                  id="cls-teacher"
                  label="Giảng viên phụ trách"
                  value={classTeacherFilter}
                  onChange={(e) => setClassTeacherFilter(e.target.value)}
                  options={teacherOptions}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF4F8] pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#243B53]">
                  <input
                    type="checkbox"
                    checked={onlyAvailableSeats}
                    onChange={(e) => setOnlyAvailableSeats(e.target.checked)}
                  />
                  <span>Chỉ hiển thị lớp đã xác định sĩ số và còn chỗ trống</span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-[#64748B]">
                    Chỉ các lớp ở trạng thái <strong>Đang tuyển sinh / Sắp khai giảng</strong> và
                    chưa đầy sĩ số mới cho phép chọn đăng ký.
                  </span>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleResetClassFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Đặt lại bộ lọc</span>
                  </Button>
                </div>
              </div>
            </div>

            {filteredClasses.length === 0 ? (
              <EmptyBlock
                title="Không có lớp học nào khớp bộ lọc"
                description="Thử nhấn 'Đặt lại bộ lọc' hoặc chuyển bộ lọc trạng thái sang 'Tất cả trạng thái lớp'."
                action={
                  <Button size="sm" variant="secondary" onClick={handleResetClassFilters}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Đặt lại bộ lọc</span>
                  </Button>
                }
              />
            ) : (
              <DataTableContainer>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Mã & Tên lớp
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>Khóa học & Cơ sở</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Lịch học & Khai giảng
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Giảng viên
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Sĩ số & Chỗ trống
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Trạng thái
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap text-right">
                        Thao tác
                      </DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {filteredClasses.map((cls) => {
                      const course = courseMap.get(cls.courseId)
                      const branch = branchMap.get(cls.branchId)
                      const remaining = computeRemainingClassSeats(cls)
                      const selectable = isClassOpenForRegistration(cls)
                      const stMeta = CLASS_RECRUITMENT_STATUS_META[cls.status]
                      const scheduleText = cls.endTime
                        ? `${cls.studyDays} (${cls.startTime} – ${cls.endTime})`
                        : cls.studyDays === cls.startTime
                          ? cls.studyDays
                          : `${cls.studyDays} (${cls.startTime})`

                      return (
                        <DataTableRow key={cls.id}>
                          <DataTableCell>
                            <p className="whitespace-nowrap font-bold text-[#243B53]">
                              {cls.classCode}
                            </p>
                            <p className="text-xs text-[#64748B]">{cls.className}</p>
                          </DataTableCell>

                          <DataTableCell>
                            <p className="text-xs font-bold text-[#2878B8]">
                              {course?.name ?? cls.courseId}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {branch?.shortLabel ?? branch?.name ?? cls.branchId} ({cls.studyMode})
                            </p>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap text-xs">
                            <p className="font-semibold text-[#243B53]">{scheduleText}</p>
                            <p className="text-[#64748B]">
                              KG: <strong>{cls.startDateDisplay ?? formatDate(cls.startDate)}</strong>
                              {cls.endDate ? ` – KT: ${formatDate(cls.endDate)}` : ''}
                            </p>
                            {cls.registrationDeadline && (
                              <p className="text-[11px] text-[#9E6300]">
                                Hạn ĐK: {formatDate(cls.registrationDeadline)}
                              </p>
                            )}
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap text-xs font-medium">
                            {cls.teacherName ?? (
                              <span className="text-[#94A3B8]">Chưa phân công</span>
                            )}
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap text-xs">
                            {remaining === null ? (
                              <span className="font-semibold text-[#9E6300]">
                                Chưa cấu hình sĩ số
                              </span>
                            ) : (
                              <>
                                <p className="font-bold text-[#243B53]">
                                  {cls.enrolledStudents}/{cls.maxStudents} HV
                                </p>
                                <p
                                  className={`font-semibold ${
                                    remaining > 0 ? 'text-[#1F7A4C]' : 'text-[#B93A2E]'
                                  }`}
                                >
                                  {remaining > 0 ? `Còn ${remaining} chỗ` : 'Hết chỗ'}
                                </p>
                              </>
                            )}
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailClass(cls)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Chi tiết</span>
                              </Button>

                              <ActionGuard permission="sales.registrations.create">
                                <Button
                                  size="sm"
                                  variant={selectable ? 'primary' : 'secondary'}
                                  disabled={!selectable}
                                  onClick={() =>
                                    navigate(
                                      `/sales/registrations/new?courseId=${cls.courseId}&branchId=${cls.branchId}&classId=${cls.id}`,
                                    )
                                  }
                                >
                                  Chọn đăng ký
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
            )}
          </div>
        ))}

      {/* Modal So sánh Khóa học */}
      <Modal
        open={compareOpen}
        title="Bảng So sánh Khóa học Tư vấn"
        onClose={() => setCompareOpen(false)}
        maxWidthClassName="max-w-4xl"
      >
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="whitespace-nowrap">Tiêu chí</DataTableHeaderCell>
                {comparedCourses.map((c) => (
                  <DataTableHeaderCell key={c.id}>{c.name}</DataTableHeaderCell>
                ))}
              </tr>
            </DataTableHead>
            <tbody>
              <DataTableRow>
                <DataTableCell className="whitespace-nowrap font-bold">
                  Mục tiêu đầu ra
                </DataTableCell>
                {comparedCourses.map((c) => (
                  <DataTableCell key={c.id} className="whitespace-nowrap">
                    <Badge tone="success">{c.targetScoreLabel}</Badge>
                  </DataTableCell>
                ))}
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="whitespace-nowrap font-bold">
                  Trình độ đầu vào
                </DataTableCell>
                {comparedCourses.map((c) => (
                  <DataTableCell key={c.id} className="whitespace-nowrap">
                    {c.level}
                  </DataTableCell>
                ))}
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="whitespace-nowrap font-bold">
                  Thời lượng & Số buổi
                </DataTableCell>
                {comparedCourses.map((c) => (
                  <DataTableCell key={c.id} className="whitespace-nowrap">
                    {c.duration} ({c.sessionsCount} buổi)
                  </DataTableCell>
                ))}
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="whitespace-nowrap font-bold">
                  Học phí niêm yết
                </DataTableCell>
                {comparedCourses.map((c) => (
                  <DataTableCell key={c.id} className="whitespace-nowrap font-bold text-[#2878B8]">
                    {formatVnd(c.listedTuitionVnd)}
                  </DataTableCell>
                ))}
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="whitespace-nowrap font-bold">
                  Sau ưu đãi hiện hành
                </DataTableCell>
                {comparedCourses.map((c) => {
                  const pol = activePolicyByCourse.get(c.id)
                  return (
                    <DataTableCell
                      key={c.id}
                      className="whitespace-nowrap font-extrabold text-[#1F7A4C]"
                    >
                      {pol ? formatVnd(pol.netTuitionVnd) : formatVnd(c.listedTuitionVnd)}
                    </DataTableCell>
                  )
                })}
              </DataTableRow>
            </tbody>
          </DataTable>
        </DataTableContainer>
      </Modal>

      <ClassOfferingDetailModal
        open={Boolean(detailClass)}
        classItem={detailClass}
        course={detailClass ? courseMap.get(detailClass.courseId) : undefined}
        branch={detailClass ? branchMap.get(detailClass.branchId) : undefined}
        activePolicy={detailClass ? activePolicyByCourse.get(detailClass.courseId) : undefined}
        canCreateRegistration={canCreateReg}
        onClose={() => setDetailClass(null)}
      />
    </div>
  )
}
