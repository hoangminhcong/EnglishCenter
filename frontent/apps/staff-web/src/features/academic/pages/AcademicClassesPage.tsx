import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Edit3, Eye, Plus, X } from 'lucide-react'
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
import type {
  ClassRecruitmentStatus,
  TeachingScheduleRequestDto,
} from '@english-center/contracts'
import { formatDate, formatDateTimeVi, matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'
import {
  CLASS_STATUS_META,
  type EnrichedAcademicClassItem,
} from '@/features/academic/types/academic.types'

type ClassSortOption = 'start_asc' | 'start_desc' | 'code_asc' | 'seats_asc'

export function AcademicClassesPage() {
  useDocumentTitle('Quản lý lớp học')
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'classes' | 'teaching_requests'>('classes')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassRecruitmentStatus>('ALL')
  const [sortBy, setSortBy] = useState<ClassSortOption>('start_asc')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [classCode, setClassCode] = useState('')
  const [className, setClassName] = useState('')
  const [courseId, setCourseId] = useState('foundation-toeic')
  const [branchId, setBranchId] = useState('cs-ha-dong')
  const [studyMode, setStudyMode] = useState<'Offline' | 'Online'>('Offline')
  const [startDate, setStartDate] = useState(todayYmdVn)
  const [endDate, setEndDate] = useState('')
  const [studyDays, setStudyDays] = useState('Thứ 2 - Thứ 4 - Thứ 6')
  const [startTime, setStartTime] = useState('18:30')
  const [endTime, setEndTime] = useState('20:30')
  const [teacherId, setTeacherId] = useState('')
  const [roomLabel, setRoomLabel] = useState('Phòng P.201')
  const [maxStudents, setMaxStudents] = useState('25')
  const [classStatus, setClassStatus] = useState<ClassRecruitmentStatus>('open')
  const [isPublishedOnWeb, setIsPublishedOnWeb] = useState(true)

  const [reviewTarget, setReviewTarget] = useState<{
    req: TeachingScheduleRequestDto
    decision: 'Approved' | 'Rejected'
  } | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const {
    data: classes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.classes(),
    queryFn: () => academicApi.listClasses(),
  })

  const { data: teachingRequests = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.teachingRequests(),
    queryFn: () => academicApi.listAllTeachingRequests(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['staff', 'accounts'],
    queryFn: () => accountsApi.listAccounts(),
  })

  const activeTeachers = useMemo(
    () =>
      accounts.filter(
        (a) => (a.category === 'TEACHER' || a.roles.includes('TEACHER')) && a.status === 'active',
      ),
    [accounts],
  )

  const filteredAndSortedClasses = useMemo(() => {
    const list = classes.filter((c) => {
      if (courseFilter !== 'ALL' && c.courseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && c.branchId !== branchFilter) return false
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(c.classCode, search) ||
          matchText(c.className, search) ||
          matchText(c.teacherName ?? '', search) ||
          matchText(c.branchName, search)
        )
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'start_desc') return b.startDate.localeCompare(a.startDate)
      if (sortBy === 'code_asc') return a.classCode.localeCompare(b.classCode)
      if (sortBy === 'seats_asc') {
        const remA = a.remainingSeats ?? 999
        const remB = b.remainingSeats ?? 999
        return remA - remB
      }
      return a.startDate.localeCompare(b.startDate)
    })
  }, [classes, courseFilter, branchFilter, statusFilter, search, sortBy])

  const pagedClasses = paginate(filteredAndSortedClasses, page, 8)

  const pendingReqCount = teachingRequests.filter(
    (r) => r.status === 'Requested' || r.status === 'UnderReview',
  ).length

  const upsertMutation = useMutation({
    mutationFn: () =>
      academicApi.upsertClass({
        id: editingId,
        classCode,
        className,
        courseId,
        branchId,
        studyMode,
        startDate,
        endDate: endDate || undefined,
        studyDays,
        startTime,
        endTime,
        teacherId: teacherId || undefined,
        roomLabel,
        maxStudents: Number(maxStudents) || 25,
        status: classStatus,
        isPublishedOnWeb,
      }),
    onSuccess: (saved) => {
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: editingId ? `Đã cập nhật lớp ${saved.classCode}` : `Đã mở lớp mới ${saved.classCode}`,
        description: 'Dữ liệu lớp đã được đồng bộ cho cả Sales, Kế toán và Giảng viên.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu thông tin lớp học',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!reviewTarget) throw new Error('Chưa chọn yêu cầu.')
      return academicApi.reviewTeachingRequest(actor, {
        requestId: reviewTarget.req.id,
        decision: reviewTarget.decision,
        reviewNote,
      })
    },
    onSuccess: (updated) => {
      setReviewTarget(null)
      setReviewNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'teacher'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title:
          updated.status === 'Approved'
            ? `Đã phân công ${updated.teacherName} phụ trách lớp ${updated.classCode}`
            : `Đã từ chối nguyện vọng ${updated.requestCode}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể xử lý nguyện vọng',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const openCreateModal = () => {
    setEditingId(undefined)
    setClassCode('')
    setClassName('')
    setCourseId('foundation-toeic')
    setBranchId('cs-ha-dong')
    setStudyMode('Offline')
    setStartDate(todayYmdVn)
    setEndDate('')
    setStudyDays('Thứ 2 - Thứ 4 - Thứ 6')
    setStartTime('18:30')
    setEndTime('20:30')
    setTeacherId('')
    setRoomLabel('Phòng P.201')
    setMaxStudents('25')
    setClassStatus('open')
    setIsPublishedOnWeb(true)
    setModalOpen(true)
  }

  const openEditModal = (cls: EnrichedAcademicClassItem) => {
    setEditingId(cls.id)
    setClassCode(cls.classCode)
    setClassName(cls.className)
    setCourseId(cls.courseId)
    setBranchId(cls.branchId)
    setStudyMode(cls.studyMode)
    setStartDate(cls.startDate)
    setEndDate(cls.endDate ?? '')
    setStudyDays(cls.studyDays)
    setStartTime(cls.startTime)
    setEndTime(cls.endTime)
    setTeacherId(cls.teacherId ?? '')
    setRoomLabel(cls.roomLabel ?? '')
    setMaxStudents(String(cls.maxStudents ?? 25))
    setClassStatus(cls.status)
    setIsPublishedOnWeb(cls.isPublishedOnWeb)
    setModalOpen(true)
  }

  const handleClassSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    upsertMutation.mutate()
  }

  const handleReviewSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    reviewMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách lớp đào tạo..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách lớp học."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Lớp học & Phân công Giảng viên"
        description="Quản lý lịch lớp, sĩ số và phân công giảng viên phụ trách."
        badge={<Badge tone="info">{classes.length} lớp học</Badge>}
        actions={
          <ActionGuard permission="classes.create">
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Tạo lớp học mới</span>
            </Button>
          </ActionGuard>
        }
      />

      {/* Tabs + Bộ lọc & Sắp xếp */}
      <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('classes')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'classes'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            1. Danh sách lớp học ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('teaching_requests')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'teaching_requests'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            2. Duyệt nguyện vọng dạy lớp ({pendingReqCount} chờ duyệt)
          </button>
        </div>

        {tab === 'classes' && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <InputField
              id="cls-search"
              placeholder="Mã lớp, tên lớp, GV..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <SelectField
              id="cls-course"
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi khóa học' },
                ...courses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <SelectField
              id="cls-branch"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi cơ sở' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <SelectField
              id="cls-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | ClassRecruitmentStatus)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                { value: 'open', label: 'Đang mở ghi danh' },
                { value: 'upcoming', label: 'Sắp khai giảng' },
                { value: 'ongoing', label: 'Đang giảng dạy' },
                { value: 'full', label: 'Đã đủ sĩ số' },
                { value: 'completed', label: 'Đã kết thúc' },
                { value: 'cancelled', label: 'Đã hủy lớp' },
              ]}
            />
            <SelectField
              id="cls-sort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as ClassSortOption)
                setPage(1)
              }}
              options={[
                { value: 'start_asc', label: 'Sắp xếp: Khai giảng sớm nhất' },
                { value: 'start_desc', label: 'Sắp xếp: Khai giảng mới nhất' },
                { value: 'code_asc', label: 'Sắp xếp: Mã lớp (A → Z)' },
                { value: 'seats_asc', label: 'Sắp xếp: Chỗ trống ít nhất' },
              ]}
            />
          </div>
        )}
      </div>

      {tab === 'classes' ? (
        pagedClasses.items.length === 0 ? (
          <EmptyBlock title="Không tìm thấy lớp học phù hợp" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[180px]">
                    Mã lớp & Tên lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[160px]">
                    Khóa học & Cơ sở
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Lịch học & Khai giảng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Giảng viên
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Sĩ số</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {pagedClasses.items.map((cls) => {
                  const st = CLASS_STATUS_META[cls.status]
                  const scheduleText = cls.endTime
                    ? `${cls.studyDays} (${cls.startTime}–${cls.endTime})`
                    : cls.studyDays === cls.startTime
                      ? cls.studyDays
                      : `${cls.studyDays} (${cls.startTime})`
                  return (
                    <DataTableRow key={cls.id}>
                      <DataTableCell>
                        <Link
                          to={`/academic/classes/${cls.id}`}
                          className="font-extrabold whitespace-nowrap text-[#2878B8] hover:underline"
                        >
                          {cls.classCode}
                        </Link>
                        <p className="text-xs text-[#243B53]">{cls.className}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">{cls.courseName}</p>
                        <p className="text-[#64748B]">
                          {cls.branchName} ({cls.studyMode})
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">
                          KG: {cls.startDateDisplay ?? formatDate(cls.startDate)}
                        </p>
                        <p className="text-[#64748B]">{scheduleText}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        {cls.teacherName ? (
                          <span className="font-semibold text-[#243B53]">{cls.teacherName}</span>
                        ) : (
                          <Badge tone="warning">Chưa có GV</Badge>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs font-bold whitespace-nowrap">
                        {typeof cls.maxStudents === 'number' ? (
                          <span>
                            {cls.enrolledStudents ?? 0}/{cls.maxStudents} HV
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Chưa đặt chỉ tiêu</span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Link to={`/academic/classes/${cls.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-3.5 w-3.5" />
                              <span>Học viên</span>
                            </Button>
                          </Link>
                          <ActionGuard permission="classes.update">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditModal(cls)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
            <div className="px-4 pb-4">
              <Pagination
                page={pagedClasses.page}
                totalPages={pagedClasses.totalPages}
                onChange={setPage}
              />
            </div>
          </DataTableContainer>
        )
      ) : teachingRequests.length === 0 ? (
        <EmptyBlock title="Chưa có nguyện vọng giảng dạy nào từ phía Giảng viên" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Mã yêu cầu & Thời gian
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Giảng viên đăng ký
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Lớp nguyện vọng & Lịch
                </DataTableHeaderCell>
                <DataTableHeaderCell>Ghi chú nguyện vọng</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Phê duyệt
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {teachingRequests.map((req) => (
                <DataTableRow key={req.id}>
                  <DataTableCell className="whitespace-nowrap">
                    <p className="font-bold text-[#243B53]">{req.requestCode}</p>
                    <p className="text-xs text-[#64748B]">{formatDateTimeVi(req.requestedAt)}</p>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <p className="font-semibold text-[#243B53]">{req.teacherName}</p>
                    <p className="text-xs text-[#64748B]">{req.teacherCode}</p>
                  </DataTableCell>
                  <DataTableCell className="text-xs whitespace-nowrap">
                    <p className="font-bold text-[#2878B8]">{req.classCode}</p>
                    <p className="text-[#475569]">
                      {req.studyDays} ({req.startTime}
                      {req.endTime ? `–${req.endTime}` : ''}) • KG: {formatDate(req.startDate)}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="max-w-xs text-xs text-[#475569]">
                    <p>{req.note}</p>
                    {req.reviewNote && (
                      <p className="mt-1 font-semibold text-[#2878B8]">
                        Phản hồi Giáo vụ: {req.reviewNote}
                      </p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <Badge
                      tone={
                        req.status === 'Approved'
                          ? 'success'
                          : req.status === 'Rejected'
                            ? 'danger'
                            : req.status === 'Cancelled'
                              ? 'neutral'
                              : 'warning'
                      }
                    >
                      {req.status === 'Approved'
                        ? 'Đã duyệt'
                        : req.status === 'Rejected'
                          ? 'Từ chối'
                          : req.status === 'Cancelled'
                            ? 'Đã hủy'
                            : req.status === 'UnderReview'
                              ? 'Đang xem xét'
                              : 'Chờ duyệt'}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right whitespace-nowrap">
                    {(req.status === 'Requested' || req.status === 'UnderReview') && (
                      <ActionGuard permission="classes.update">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewTarget({ req, decision: 'Approved' })
                              setReviewNote('Đồng ý phân công giảng dạy chính thức.')
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Duyệt dạy</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setReviewTarget({ req, decision: 'Rejected' })
                              setReviewNote('')
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Từ chối</span>
                          </Button>
                        </div>
                      </ActionGuard>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableContainer>
      )}

      {/* Modal Tạo / Sửa lớp học */}
      <Modal
        open={modalOpen}
        title={editingId ? `Cập nhật lớp học ${classCode}` : 'Mở lớp đào tạo mới'}
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-2xl"
      >
        <form onSubmit={handleClassSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InputField
              id="cls-code"
              label="Mã lớp (Duy nhất) *"
              placeholder="VD: HD-SB05"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <InputField
                id="cls-name"
                label="Tên lớp hiển thị *"
                placeholder="Submarine 700+ – Tối 2-4-6 (Hà Đông)"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField
              id="cls-f-course"
              label="Khóa học *"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              id="cls-f-branch"
              label="Cơ sở *"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <SelectField
              id="cls-f-mode"
              label="Hình thức *"
              value={studyMode}
              onChange={(e) => setStudyMode(e.target.value as 'Offline' | 'Online')}
              options={[
                { value: 'Offline', label: 'Offline tại cơ sở' },
                { value: 'Online', label: 'Online trực tuyến' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <InputField
              id="cls-start-date"
              type="date"
              label="Ngày khai giảng *"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <InputField
              id="cls-end-date"
              type="date"
              label="Ngày kết thúc dự kiến"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <InputField
              id="cls-start-time"
              type={/^\d{2}:\d{2}$/.test(startTime) || startTime === '' ? 'time' : 'text'}
              label="Giờ bắt đầu *"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <InputField
              id="cls-end-time"
              type={/^\d{2}:\d{2}$/.test(startTime) ? 'time' : 'text'}
              label={/^\d{2}:\d{2}$/.test(startTime) ? 'Giờ kết thúc *' : 'Giờ kết thúc'}
              placeholder="Để trống nếu lịch Linh hoạt"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required={/^\d{2}:\d{2}$/.test(startTime)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InputField
              id="cls-days"
              label="Thứ học trong tuần (VD: T2 - T4 - T6) *"
              placeholder="Thứ 2 - Thứ 4 - Thứ 6"
              value={studyDays}
              onChange={(e) => setStudyDays(e.target.value)}
              required
            />
            <InputField
              id="cls-room"
              label="Phòng học / Link Zoom"
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
            />
            <InputField
              id="cls-max"
              type="number"
              min={1}
              max={100}
              label="Sĩ số tối đa *"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="cls-teacher"
              label="Phân công Giảng viên (Kiểm tra trùng lịch tự động)"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              options={[
                { value: '', label: '— Chưa phân công (Cho phép GV gửi nguyện vọng) —' },
                ...activeTeachers.map((t) => ({
                  value: t.id,
                  label: `${t.teacherProfile?.fullName ?? t.email} (${t.teacherProfile?.teacherCode ?? 'GV'})`,
                })),
              ]}
            />
            <SelectField
              id="cls-f-status"
              label="Trạng thái lớp *"
              value={classStatus}
              onChange={(e) => setClassStatus(e.target.value as ClassRecruitmentStatus)}
              options={[
                { value: 'open', label: 'Đang mở ghi danh' },
                { value: 'upcoming', label: 'Sắp khai giảng' },
                { value: 'ongoing', label: 'Đang giảng dạy' },
                { value: 'full', label: 'Đã đủ sĩ số' },
                { value: 'completed', label: 'Đã kết thúc' },
                { value: 'cancelled', label: 'Đã hủy lớp (Chặn nếu còn HV)' },
              ]}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#243B53]">
            <input
              type="checkbox"
              checked={isPublishedOnWeb}
              onChange={(e) => setIsPublishedOnWeb(e.target.checked)}
              className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
            />
            <span>Hiển thị trên bảng Lịch khai giảng công khai Website & Sales CRM</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={upsertMutation.isPending}>
              {editingId ? 'Lưu cập nhật lớp' : 'Tạo lớp học'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Duyệt nguyện vọng giảng dạy */}
      <Modal
        open={Boolean(reviewTarget)}
        title={`Phê duyệt nguyện vọng ${reviewTarget?.req.requestCode ?? ''}`}
        onClose={() => setReviewTarget(null)}
        maxWidthClassName="max-w-md"
      >
        {reviewTarget && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <p className="text-xs leading-relaxed text-[#475569]">
              {reviewTarget.decision === 'Approved' ? (
                <>
                  Phân công chính thức giảng viên <strong>{reviewTarget.req.teacherName}</strong>{' '}
                  phụ trách lớp <strong>{reviewTarget.req.classCode}</strong>.
                </>
              ) : (
                <>
                  Từ chối nguyện vọng dạy lớp <strong>{reviewTarget.req.classCode}</strong> của{' '}
                  <strong>{reviewTarget.req.teacherName}</strong>.
                </>
              )}
            </p>
            <InputField
              id="rev-trq-note"
              label={
                reviewTarget.decision === 'Rejected' ? 'Lý do từ chối *' : 'Ghi chú phân công'
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              required={reviewTarget.decision === 'Rejected'}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReviewTarget(null)}>
                Đóng
              </Button>
              <Button
                type="submit"
                variant={reviewTarget.decision === 'Rejected' ? 'danger' : 'primary'}
                loading={reviewMutation.isPending}
              >
                Xác nhận
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
