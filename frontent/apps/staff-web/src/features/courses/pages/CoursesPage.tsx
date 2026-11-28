import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, PauseCircle, Pencil, PlayCircle, Plus } from 'lucide-react'
import type { CourseVisibilityStatus } from '@english-center/contracts'
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
import {
  formatDate,
  formatVnd,
  isValidSlug,
  matchText,
  paginate,
  slugifyVi,
} from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { coursesApi } from '@/features/courses/api/coursesApi'
import type {
  ManagedCourseRecord,
  UpsertCourseInput,
} from '@/features/courses/types/courses.types'
import { toeicConfigApi } from '@/features/toeic-config/api/toeicConfigApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import type { MediaRef } from '@/shared/types/media.types'

const STATUS_META: Record<
  CourseVisibilityStatus,
  { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }
> = {
  active: { label: 'Đang tuyển sinh', tone: 'success' },
  paused: { label: 'Tạm dừng mở lớp', tone: 'warning' },
  draft: { label: 'Bản nháp', tone: 'info' },
  archived: { label: 'Đã lưu trữ', tone: 'neutral' },
}

type CourseSortKey = 'order_asc' | 'tuition_asc' | 'tuition_desc' | 'sessions_desc'

export function CoursesPage() {
  useDocumentTitle('Quản lý khóa học')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canPublish = hasPermission(user, 'courses.publish')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | CourseVisibilityStatus>('ALL')
  const [sortBy, setSortBy] = useState<CourseSortKey>('order_asc')
  const [page, setPage] = useState(1)
  const [detailTarget, setDetailTarget] = useState<ManagedCourseRecord | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    course: ManagedCourseRecord
    nextStatus: CourseVisibilityStatus
  } | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [thumbMedia, setThumbMedia] = useState<MediaRef | null>(null)
  const [highlightsText, setHighlightsText] = useState('')

  const [formState, setFormState] = useState<UpsertCourseInput>({
    slug: '',
    code: '',
    name: '',
    scheduleTitle: '',
    scheduleSubtitle: '',
    milestoneId: '',
    targetScoreLabel: '',
    level: '',
    duration: '',
    sessionsCount: 24,
    listedTuitionVnd: 0,
    shortDescription: '',
    description: '',
    highlights: [],
    thumbnail: '',
    status: 'draft',
    isFeatured: false,
  })

  const { data: courses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: milestones = [] } = useQuery({
    queryKey: ['staff', 'toeic-milestones'],
    queryFn: () => toeicConfigApi.listMilestones(),
  })

  const activeMilestones = useMemo(
    () => milestones.filter((m) => m.isActive !== false),
    [milestones],
  )

  const invalidateCourseDependents = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'courses'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'tuition-policies'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'sales'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
  }

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertCourseInput) => coursesApi.upsertCourse(payload),
    onSuccess: (saved, vars) => {
      invalidateCourseDependents()
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: vars.id ? 'Đã cập nhật khóa học' : 'Đã tạo khóa học mới',
        description: `${saved.name} (${saved.code})`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu khóa học.')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: CourseVisibilityStatus }) =>
      coursesApi.setCourseStatus(id, nextStatus),
    onSuccess: (saved) => {
      invalidateCourseDependents()
      setStatusTarget(null)
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái hiển thị khóa học',
        description: `${saved.name} -> ${STATUS_META[saved.status].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật trạng thái khóa học',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const filteredAndSorted = useMemo(() => {
    const list = courses.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(c.name, search) ||
          matchText(c.code, search) ||
          matchText(c.slug, search) ||
          matchText(c.targetScoreLabel, search) ||
          matchText(c.level, search)
        )
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'tuition_asc') return a.listedTuitionVnd - b.listedTuitionVnd
      if (sortBy === 'tuition_desc') return b.listedTuitionVnd - a.listedTuitionVnd
      if (sortBy === 'sessions_desc') return b.sessionsCount - a.sessionsCount
      return a.displayOrder - b.displayOrder
    })
  }, [courses, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(filteredAndSorted, page, 8),
    [filteredAndSorted, page],
  )

  const openCreateModal = () => {
    const defaultMs = activeMilestones[0] ?? milestones[0]
    setFormError(null)
    setThumbMedia(null)
    setHighlightsText('')
    setFormState({
      slug: '',
      code: '',
      name: '',
      scheduleTitle: '',
      scheduleSubtitle: defaultMs ? `(${defaultMs.label})` : '',
      milestoneId: defaultMs?.id ?? '',
      targetScoreLabel: defaultMs?.label ?? '',
      level: '',
      duration: '',
      sessionsCount: 24,
      listedTuitionVnd: 0,
      shortDescription: '',
      description: '',
      highlights: [],
      thumbnail: '',
      status: 'draft',
      isFeatured: false,
    })
    setEditorOpen(true)
  }

  const openEditModal = (course: ManagedCourseRecord) => {
    setFormError(null)
    setThumbMedia(
      course.thumbnail
        ? {
            id: `thumb-${course.id}`,
            kind: 'image',
            fileName: `${course.slug}.jpg`,
            mimeType: 'image/jpeg',
            url: course.thumbnail,
            status: 'ready',
          }
        : null,
    )
    setHighlightsText(course.highlights.join('\n'))
    setFormState({
      id: course.id,
      slug: course.slug,
      code: course.code,
      name: course.name,
      scheduleTitle: course.scheduleTitle,
      scheduleSubtitle: course.scheduleSubtitle,
      milestoneId: course.milestoneId,
      targetScoreLabel: course.targetScoreLabel,
      level: course.level,
      duration: course.duration,
      sessionsCount: course.sessionsCount,
      listedTuitionVnd: course.listedTuitionVnd,
      shortDescription: course.shortDescription,
      description: course.description,
      highlights: course.highlights,
      thumbnail: course.thumbnail,
      status: course.status,
      isFeatured: course.isFeatured,
    })
    setEditorOpen(true)
  }

  const handleSave = () => {
    const cleanSlug = slugifyVi(formState.slug || formState.name)
    if (!formState.name.trim() || !formState.code.trim() || !cleanSlug) {
      setFormError('Vui lòng nhập đầy đủ Tên khóa học, Mã khóa học và Đường dẫn slug.')
      return
    }
    if (!isValidSlug(cleanSlug)) {
      setFormError('Slug chỉ được chứa chữ thường không dấu (a–z), chữ số (0–9) và dấu gạch ngang (-).')
      return
    }
    if (formState.sessionsCount < 1) {
      setFormError('Số buổi học phải từ 1 buổi trở lên.')
      return
    }
    if (formState.listedTuitionVnd < 0) {
      setFormError('Học phí niêm yết không được nhỏ hơn 0.')
      return
    }
    const highlights = highlightsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    upsertMutation.mutate({
      ...formState,
      slug: cleanSlug,
      scheduleTitle: formState.scheduleTitle.trim() || formState.name.trim(),
      scheduleSubtitle:
        formState.scheduleSubtitle.trim() ||
        (formState.targetScoreLabel ? `(${formState.targetScoreLabel})` : ''),
      highlights,
      thumbnail: thumbMedia?.url ?? '',
      status: canPublish ? formState.status : formState.id ? formState.status : 'draft',
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh mục khóa học..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh mục khóa học."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Khóa học TOEIC"
        description="Quản lý danh mục khóa học, thời lượng đào tạo và mức học phí niêm yết."
        badge={<Badge tone="info">{courses.length} khóa học</Badge>}
        actions={
          <ActionGuard permission="courses.create">
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Thêm khóa học</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="course-search"
            label="Tìm kiếm khóa học"
            placeholder="Nhập tên khóa, mã FOUNDATION / SUBMARINE, trình độ hoặc mốc điểm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="course-status"
          label="Trạng thái hiển thị"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | CourseVisibilityStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Đang tuyển sinh (Active)' },
            { value: 'paused', label: 'Tạm dừng mở lớp (Paused)' },
            { value: 'draft', label: 'Bản nháp (Draft)' },
            { value: 'archived', label: 'Đã lưu trữ (Archived)' },
          ]}
        />
        <SelectField
          id="course-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as CourseSortKey)}
          options={[
            { value: 'order_asc', label: 'Thứ tự lộ trình chuẩn' },
            { value: 'tuition_asc', label: 'Học phí tăng dần' },
            { value: 'tuition_desc', label: 'Học phí giảm dần' },
            { value: 'sessions_desc', label: 'Số buổi học nhiều nhất' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Chưa có khóa học nào khớp bộ lọc" />
      ) : (
        <>
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Mã & Tên khóa học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trình độ & Đầu ra
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Thời lượng</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Học phí niêm yết
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((course) => {
                  const st = STATUS_META[course.status]
                  return (
                    <DataTableRow key={course.id}>
                      <DataTableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-[#243B53]">{course.name}</p>
                          {course.isFeatured && <Badge tone="info">Nổi bật</Badge>}
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Mã: <strong className="whitespace-nowrap">{course.code}</strong> • Slug:{' '}
                          <code className="whitespace-nowrap">/{course.slug}</code>
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone="info">{course.targetScoreLabel}</Badge>
                          <p className="text-xs text-[#64748B]">{course.level}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-semibold text-[#243B53]">{course.sessionsCount} buổi</p>
                        <p className="text-xs text-[#64748B]">{course.duration}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <span className="font-bold text-[#2878B8]">
                          {formatVnd(course.listedTuitionVnd)}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailTarget(course)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem</span>
                          </Button>
                          <ActionGuard permission="courses.update">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditModal(course)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>
                          <ActionGuard permission="courses.publish">
                            <Button
                              size="sm"
                              variant={course.status === 'active' ? 'secondary' : 'primary'}
                              onClick={() =>
                                setStatusTarget({
                                  course,
                                  nextStatus: course.status === 'active' ? 'paused' : 'active',
                                })
                              }
                            >
                              {course.status === 'active' ? (
                                <>
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  <span>Tạm dừng</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  <span>Mở tuyển</span>
                                </>
                              )}
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
            page={paginated.page}
            totalPages={paginated.totalPages}
            onChange={setPage}
          />
        </>
      )}

      {/* Modal chi tiết */}
      <Modal
        open={Boolean(detailTarget)}
        title={detailTarget?.name ?? 'Chi tiết khóa học'}
        onClose={() => setDetailTarget(null)}
        maxWidthClassName="max-w-2xl"
      >
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
              <p>
                <span className="text-[#64748B]">ID hệ thống:</span>{' '}
                <code className="font-bold">{detailTarget.id}</code>
              </p>
              <p>
                <span className="text-[#64748B]">Cập nhật lúc:</span>{' '}
                <strong>{formatDate(detailTarget.updatedAt)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Trình độ đầu vào:</span>{' '}
                <strong>{detailTarget.level}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Mốc đầu ra chuẩn:</span>{' '}
                <strong>{detailTarget.targetScoreLabel}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Tiêu đề lịch khai giảng:</span>{' '}
                <strong>
                  {detailTarget.scheduleTitle} {detailTarget.scheduleSubtitle}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Học phí niêm yết:</span>{' '}
                <strong>{formatVnd(detailTarget.listedTuitionVnd)}</strong>
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase text-[#64748B]">Mô tả tóm tắt</p>
              <p className="mt-1 text-[#243B53]">
                {detailTarget.shortDescription || '[Chưa cập nhật mô tả tóm tắt]'}
              </p>
            </div>
            {detailTarget.description && (
              <div>
                <p className="text-xs font-extrabold uppercase text-[#64748B]">
                  Nội dung chi tiết chương trình
                </p>
                <p className="mt-1 text-[#243B53]">{detailTarget.description}</p>
              </div>
            )}
            {detailTarget.highlights.length > 0 && (
              <div>
                <p className="text-xs font-extrabold uppercase text-[#64748B]">Điểm nổi bật</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[#243B53]">
                  {detailTarget.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal thêm / sửa */}
      <Modal
        open={editorOpen}
        title={formState.id ? 'Chỉnh sửa khóa học' : 'Thêm khóa học TOEIC mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={upsertMutation.isPending}>
              {formState.id ? 'Lưu thay đổi' : 'Tạo khóa học'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              id="cf-name"
              label="Tên khóa học *"
              value={formState.name}
              onChange={(e) => {
                const nextName = e.target.value
                setFormState((prev) => ({
                  ...prev,
                  name: nextName,
                  slug: prev.id ? prev.slug : slugifyVi(nextName),
                }))
              }}
              placeholder="Nhập tên khóa học"
            />
            <InputField
              id="cf-code"
              label="Mã khóa học *"
              value={formState.code}
              onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="VD: TOEIC-450"
            />
            <InputField
              id="cf-slug"
              label="Đường dẫn Slug (/courses/:slug) *"
              value={formState.slug}
              disabled={Boolean(formState.id)}
              hint={
                formState.id
                  ? 'Giữ cố định đường dẫn khóa học đã tạo để bảo toàn liên kết tra cứu.'
                  : undefined
              }
              onChange={(e) => setFormState((prev) => ({ ...prev, slug: slugifyVi(e.target.value) }))}
              placeholder="toeic-450"
            />
            <InputField
              id="cf-level"
              label="Trình độ đầu vào → đầu ra *"
              value={formState.level}
              onChange={(e) => setFormState((prev) => ({ ...prev, level: e.target.value }))}
              placeholder="VD: Trung cấp (350 → 450+)"
            />
            <SelectField
              id="cf-milestone"
              label="Mốc đầu ra chuẩn"
              value={formState.milestoneId}
              placeholder={
                milestones.length === 0 ? '-- Chưa có mốc đầu ra --' : '-- Chọn mốc đầu ra --'
              }
              onChange={(e) => {
                const msId = e.target.value
                const found = milestones.find((m) => m.id === msId)
                setFormState((prev) => ({
                  ...prev,
                  milestoneId: msId,
                  targetScoreLabel: found?.label ?? prev.targetScoreLabel,
                  scheduleSubtitle: found ? `(${found.label})` : prev.scheduleSubtitle,
                }))
              }}
              options={(activeMilestones.length > 0 ? activeMilestones : milestones).map((m) => ({
                value: m.id,
                label: `${m.code} – ${m.label}`,
              }))}
            />
            <InputField
              id="cf-sessions"
              label="Tổng số buổi học *"
              type="number"
              min={1}
              value={formState.sessionsCount}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  sessionsCount: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
            <InputField
              id="cf-duration"
              label="Nhãn thời lượng"
              value={formState.duration}
              onChange={(e) => setFormState((prev) => ({ ...prev, duration: e.target.value }))}
              placeholder="3 tháng (32 buổi)"
            />
            <InputField
              id="cf-tuition"
              label="Học phí niêm yết tham chiếu (VNĐ)"
              type="number"
              min={0}
              step={100000}
              value={formState.listedTuitionVnd}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  listedTuitionVnd: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <InputField
              id="cf-sch-title"
              label="Tiêu đề hiển thị trên Lịch khai giảng"
              value={formState.scheduleTitle}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, scheduleTitle: e.target.value }))
              }
              placeholder="Mặc định lấy theo Tên khóa học"
            />
            <InputField
              id="cf-sch-sub"
              label="Nhãn phụ trên Lịch khai giảng"
              value={formState.scheduleSubtitle}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, scheduleSubtitle: e.target.value }))
              }
              placeholder="(450+ TOEIC)"
            />
            <SelectField
              id="cf-status"
              label="Trạng thái hiển thị"
              value={formState.status}
              disabled={!canPublish}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  status: e.target.value as CourseVisibilityStatus,
                }))
              }
              options={[
                { value: 'draft', label: 'Bản nháp (Draft)' },
                { value: 'active', label: 'Đang tuyển sinh (Active)' },
                { value: 'paused', label: 'Tạm dừng (Paused)' },
                { value: 'archived', label: 'Lưu trữ (Archived)' },
              ]}
            />
            <div className="flex items-end pb-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#243B53]">
                <input
                  type="checkbox"
                  checked={formState.isFeatured}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, isFeatured: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                />
                <span>Đánh dấu khóa học nổi bật trên Trang chủ</span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="cf-short"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
            >
              Mô tả tóm tắt
            </label>
            <textarea
              id="cf-short"
              rows={2}
              value={formState.shortDescription}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, shortDescription: e.target.value }))
              }
              className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <div>
            <label
              htmlFor="cf-desc"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
            >
              Mô tả chi tiết chương trình đào tạo
            </label>
            <textarea
              id="cf-desc"
              rows={3}
              value={formState.description}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <div>
            <label
              htmlFor="cf-highlights"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
            >
              Điểm nổi bật (Mỗi dòng 1 ý)
            </label>
            <textarea
              id="cf-highlights"
              rows={3}
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <MediaUploadBox
            label="Ảnh đại diện khóa học"
            kind="image"
            value={thumbMedia}
            onChange={setThumbMedia}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title="Xác nhận thay đổi trạng thái khóa học"
        description={
          statusTarget ? (
            <>
              Chuyển khóa học <strong>{statusTarget.course.name}</strong> sang trạng thái{' '}
              <strong>{STATUS_META[statusTarget.nextStatus].label}</strong>? Thay đổi này chỉ áp
              dụng cho danh mục tuyển sinh mới, không ghi đè các lớp học lịch sử.
            </>
          ) : (
            ''
          )
        }
        loading={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget) return
          statusMutation.mutate({
            id: statusTarget.course.id,
            nextStatus: statusTarget.nextStatus,
          })
        }}
      />
    </div>
  )
}
