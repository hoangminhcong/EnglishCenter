import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
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
  InputField,
  LoadingBlock,
  Modal,
  Pagination,
  SelectField,
} from '@english-center/ui'
import { matchText, paginate, slugifyVi, toSafeHttpUrl } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { learningApi } from '@/features/learning/api/learningApi'
import type {
  LearningContentStatus,
  ManagedMaterialRecord,
  MaterialAccessScope,
  MaterialFormat,
} from '@/features/learning/types/learning.types'
import { trainingApi } from '@/features/training/api/trainingApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

const SCOPE_LABELS: Record<MaterialAccessScope, string> = {
  public_web: 'Công khai trên Website',
  all_students: 'Tất cả học viên nội bộ',
  by_course: 'Theo khóa học',
  by_class: 'Theo lớp đào tạo (Kế hoạch học tập)',
}

const PUBLIC_CATEGORY_LABELS: Record<ManagedMaterialRecord['publicCategory'], string> = {
  'listening-reading': 'Luyện thi L&R (/tai-lieu/listening-reading)',
  'exam-review': 'Review đề thi (/tai-lieu/review-de-thi)',
  'internal-only': 'Tài liệu nội bộ LMS (Không đăng trang công khai)',
}

const STATUS_BADGE: Record<
  LearningContentStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  published: { label: 'Đã xuất bản', tone: 'success' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type MaterialSortKey = 'updated_desc' | 'title_asc' | 'code_asc'

const PAGE_SIZE = 6

export function MaterialsPage() {
  useDocumentTitle('Tài liệu học tập')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canPublish = hasPermission(user, 'materials.publish')

  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'ALL' | MaterialAccessScope>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LearningContentStatus>('ALL')
  const [formatFilter, setFormatFilter] = useState<'ALL' | MaterialFormat>('ALL')
  const [sortBy, setSortBy] = useState<MaterialSortKey>('updated_desc')
  const [page, setPage] = useState(1)

  const [editorOpen, setEditorOpen] = useState(false)
  const [previewMediaTarget, setPreviewMediaTarget] = useState<ManagedMaterialRecord | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [formState, setFormState] = useState<
    Omit<ManagedMaterialRecord, 'id' | 'updatedAt'> & { id?: string }
  >({
    code: '',
    slug: '',
    title: '',
    description: '',
    publicCategory: 'listening-reading',
    format: 'PDF',
    accessScope: 'public_web',
    courseId: '',
    classId: '',
    targetRefLabel: 'Công khai Website (/tai-lieu/listening-reading)',
    media: null,
    status: 'draft',
  })

  const { data: materials = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'learning', 'materials'],
    queryFn: () => learningApi.listMaterials(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: centerClasses = [] } = useQuery({
    queryKey: ['staff', 'training', 'classes'],
    queryFn: () => trainingApi.listAllCenterClasses(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<ManagedMaterialRecord, 'id' | 'updatedAt'> & { id?: string }) =>
      learningApi.upsertMaterial(payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'materials'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: `Đã lưu học liệu (${STATUS_BADGE[saved.status].label})`,
        description: `${saved.title} (${saved.format})`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu tài liệu.')
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({
      item,
      nextStatus,
    }: {
      item: ManagedMaterialRecord
      nextStatus: LearningContentStatus
    }) =>
      learningApi.upsertMaterial({
        ...item,
        status: nextStatus,
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'materials'] })
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái học liệu',
        description: `${saved.title} -> ${STATUS_BADGE[saved.status].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Chưa thể đổi trạng thái học liệu',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra tệp đính kèm.',
      })
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = materials.filter((m) => {
      if (scopeFilter !== 'ALL' && m.accessScope !== scopeFilter) return false
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false
      if (formatFilter !== 'ALL' && m.format !== formatFilter) return false
      if (search.trim()) {
        return (
          matchText(m.title, search) ||
          matchText(m.code, search) ||
          matchText(m.targetRefLabel, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi')
      if (sortBy === 'code_asc') return a.code.localeCompare(b.code, 'vi')
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [materials, scopeFilter, statusFilter, formatFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  const openCreate = () => {
    setFormError(null)
    setFormState({
      code: '',
      slug: '',
      title: '',
      description: '',
      publicCategory: 'listening-reading',
      format: 'PDF',
      accessScope: 'public_web',
      courseId: courses[0]?.id ?? '',
      classId: centerClasses[0]?.id ?? '',
      targetRefLabel: 'Công khai Website (/tai-lieu/listening-reading)',
      media: null,
      status: 'draft',
    })
    setEditorOpen(true)
  }

  const openEdit = (record: ManagedMaterialRecord) => {
    setFormError(null)
    setFormState({
      id: record.id,
      code: record.code,
      slug: record.slug,
      title: record.title,
      description: record.description,
      publicCategory: record.publicCategory,
      format: record.format,
      accessScope: record.accessScope,
      courseId: record.courseId ?? courses[0]?.id ?? '',
      classId: record.classId ?? centerClasses[0]?.id ?? '',
      targetRefLabel: record.targetRefLabel,
      media: record.media,
      status: canPublish ? record.status : 'draft',
    })
    setEditorOpen(true)
  }

  const handleScopeChange = (nextScope: MaterialAccessScope) => {
    if (nextScope === 'by_course') {
      const selectedCourse = courses.find((c) => c.id === formState.courseId) ?? courses[0]
      setFormState({
        ...formState,
        accessScope: nextScope,
        publicCategory: 'internal-only',
        courseId: selectedCourse?.id ?? '',
        targetRefLabel: selectedCourse ? `Khóa học: ${selectedCourse.name}` : '',
      })
      return
    }
    if (nextScope === 'by_class') {
      const selectedCls =
        centerClasses.find((cls) => cls.id === formState.classId) ?? centerClasses[0]
      setFormState({
        ...formState,
        accessScope: nextScope,
        publicCategory: 'internal-only',
        classId: selectedCls?.id ?? '',
        targetRefLabel: selectedCls
          ? `Lớp ${selectedCls.classCode} (${selectedCls.className})`
          : '',
      })
      return
    }
    if (nextScope === 'public_web') {
      const cat =
        formState.publicCategory === 'internal-only'
          ? 'listening-reading'
          : formState.publicCategory
      setFormState({
        ...formState,
        accessScope: nextScope,
        publicCategory: cat,
        targetRefLabel:
          cat === 'exam-review'
            ? 'Công khai Website (/tai-lieu/review-de-thi)'
            : 'Công khai Website (/tai-lieu/listening-reading)',
      })
      return
    }
    setFormState({
      ...formState,
      accessScope: nextScope,
      publicCategory: 'internal-only',
      targetRefLabel: 'Tất cả học viên nội bộ',
    })
  }

  const handleSave = () => {
    const normalizedCode = formState.code.trim().toUpperCase()
    const normalizedSlug = slugifyVi(
      formState.slug || formState.title || formState.code,
    )

    if (!formState.title.trim() || !normalizedCode || !normalizedSlug) {
      setFormError('Vui lòng nhập đầy đủ Mã học liệu, Tiêu đề và Đường dẫn Slug hợp lệ.')
      return
    }

    if (
      materials.some(
        (m) => m.id !== formState.id && m.code.trim().toUpperCase() === normalizedCode,
      )
    ) {
      setFormError(`Mã học liệu "${normalizedCode}" đã tồn tại.`)
      return
    }
    if (
      materials.some(
        (m) => m.id !== formState.id && m.slug.trim().toLowerCase() === normalizedSlug,
      )
    ) {
      setFormError(`Đường dẫn Slug "${normalizedSlug}" đã tồn tại.`)
      return
    }

    if (formState.accessScope === 'by_course' && !formState.courseId?.trim()) {
      setFormError('Vui lòng chọn Khóa học áp dụng.')
      return
    }
    if (formState.accessScope === 'by_class' && !formState.classId?.trim()) {
      setFormError('Vui lòng chọn Lớp đào tạo áp dụng.')
      return
    }

    const effectiveStatus: LearningContentStatus = canPublish ? formState.status : 'draft'
    if (effectiveStatus === 'published') {
      if (!formState.media || !formState.media.url.trim() || formState.media.status === 'failed') {
        setFormError('Bắt buộc đính kèm tệp học liệu hợp lệ trước khi chuyển sang Xuất bản.')
        return
      }
    }

    saveMutation.mutate({
      ...formState,
      code: normalizedCode,
      slug: normalizedSlug,
      status: effectiveStatus,
      courseId: formState.accessScope === 'by_course' ? formState.courseId : undefined,
      classId: formState.accessScope === 'by_class' ? formState.classId : undefined,
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải kho học liệu..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách học liệu."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tài liệu Học tập"
        description="Quản lý tài liệu học tập công khai và kho học liệu theo khóa, lớp."
        badge={<Badge tone="info">{materials.length} học liệu</Badge>}
        actions={
          <ActionGuard permission="materials.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Thêm học liệu</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <InputField
          id="mat-search"
          label="Tìm kiếm học liệu"
          placeholder="Mã, tiêu đề, lớp/khóa..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <SelectField
          id="mat-scope"
          label="Phạm vi phân quyền"
          value={scopeFilter}
          onChange={(e) => {
            setScopeFilter(e.target.value as 'ALL' | MaterialAccessScope)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả phạm vi' },
            { value: 'public_web', label: 'Công khai trên Website' },
            { value: 'all_students', label: 'Toàn bộ học viên' },
            { value: 'by_course', label: 'Theo khóa học' },
            { value: 'by_class', label: 'Theo lớp học' },
          ]}
        />
        <SelectField
          id="mat-format"
          label="Định dạng tệp"
          value={formatFilter}
          onChange={(e) => {
            setFormatFilter(e.target.value as 'ALL' | MaterialFormat)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả định dạng' },
            { value: 'PDF', label: 'PDF' },
            { value: 'DOCX', label: 'DOCX' },
            { value: 'PPTX', label: 'PPTX' },
            { value: 'XLSX', label: 'XLSX' },
            { value: 'Audio', label: 'Audio' },
            { value: 'Video', label: 'Video' },
            { value: 'Image', label: 'Image' },
          ]}
        />
        <SelectField
          id="mat-status"
          label="Trạng thái"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | LearningContentStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'published', label: 'Đã xuất bản' },
            { value: 'draft', label: 'Bản nháp' },
            { value: 'hidden', label: 'Đang ẩn' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
        />
        <SelectField
          id="mat-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as MaterialSortKey)
            setPage(1)
          }}
          options={[
            { value: 'updated_desc', label: 'Mới cập nhật nhất' },
            { value: 'title_asc', label: 'Tiêu đề A -> Z' },
            { value: 'code_asc', label: 'Mã học liệu A -> Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không tìm thấy học liệu phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Mã & Tên học liệu
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Định dạng & Tệp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Phạm vi & Chuyên mục
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((item) => {
                  const badge = STATUS_BADGE[item.status]
                  const safeHttpLink = item.media?.url ? toSafeHttpUrl(item.media.url) : null
                  return (
                    <DataTableRow key={item.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{item.title}</p>
                        <p className="text-xs text-[#64748B]">
                          Mã: <strong className="whitespace-nowrap">{item.code}</strong> •{' '}
                          <code>/{item.slug}</code>
                        </p>
                        <p className="mt-0.5 text-xs text-[#64748B]">{item.description}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone="info">{item.format}</Badge>
                          {item.media ? (
                            <div className="flex items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setPreviewMediaTarget(item)}
                                className="inline-flex items-center gap-1 font-bold text-[#2878B8] hover:underline"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Xem thử</span>
                              </button>
                              {safeHttpLink && (
                                <a
                                  href={safeHttpLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[#1F7A4C] hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Mở tệp</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] font-semibold text-[#B93A2E]">
                              Chưa đính kèm tệp
                            </p>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <p className="text-xs font-bold text-[#243B53]">
                          {SCOPE_LABELS[item.accessScope]}
                        </p>
                        <p className="text-xs text-[#64748B]">{item.targetRefLabel}</p>
                        <p className="mt-0.5 text-[11px] text-[#2878B8]">
                          {PUBLIC_CATEGORY_LABELS[item.publicCategory]}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <ActionGuard permission="materials.update">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>

                          <ActionGuard permission="materials.publish">
                            {item.status !== 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Xuất bản học liệu"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, nextStatus: 'published' })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A4C]" />
                              </Button>
                            )}
                            {item.status === 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Tạm ẩn học liệu"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, nextStatus: 'hidden' })
                                }
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {item.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Lưu trữ học liệu"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, nextStatus: 'archived' })
                                }
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
        </div>
      )}

      {/* Modal Xem thử Tệp Học liệu An toàn */}
      <Modal
        open={Boolean(previewMediaTarget)}
        title={previewMediaTarget ? `Xem trước học liệu – ${previewMediaTarget.title}` : ''}
        onClose={() => setPreviewMediaTarget(null)}
        maxWidthClassName="max-w-xl"
        footer={<Button onClick={() => setPreviewMediaTarget(null)}>Đóng</Button>}
      >
        {previewMediaTarget?.media && (
          <div className="space-y-3 text-xs text-[#243B53]">
            <div className="rounded-xl bg-[#F8FBFD] p-3">
              <p className="font-bold">{previewMediaTarget.media.fileName}</p>
              <p className="mt-0.5 text-[#64748B]">
                Định dạng: {previewMediaTarget.format} ({previewMediaTarget.media.mimeType})
              </p>
            </div>
            {previewMediaTarget.media.kind === 'audio' && (
              <audio controls src={previewMediaTarget.media.url} className="h-10 w-full">
                Trình duyệt không hỗ trợ phát âm thanh.
              </audio>
            )}
            {previewMediaTarget.media.kind === 'image' && (
              <img
                src={previewMediaTarget.media.url}
                alt={previewMediaTarget.title}
                className="max-h-72 w-full rounded-xl object-contain"
              />
            )}
            {toSafeHttpUrl(previewMediaTarget.media.url) && (
              <p>
                <a
                  href={toSafeHttpUrl(previewMediaTarget.media.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-[#2878B8] underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Mở liên kết tệp trong tab mới an toàn</span>
                </a>
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={editorOpen}
        title={formState.id ? 'Chỉnh sửa học liệu' : 'Thêm học liệu số mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {canPublish ? 'Lưu học liệu' : 'Lưu về Bản nháp'}
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
              id="mf-code"
              label="Mã học liệu"
              value={formState.code}
              placeholder="VD: DOC-TOEIC-01"
              onChange={(e) => setFormState({ ...formState, code: e.target.value })}
            />
            <InputField
              id="mf-slug"
              label="Đường dẫn Slug"
              value={formState.slug}
              onChange={(e) =>
                setFormState({ ...formState, slug: slugifyVi(e.target.value) })
              }
              placeholder="Tự động tạo từ tiêu đề/mã nếu để trống"
            />
            <div className="sm:col-span-2">
              <InputField
                id="mf-title"
                label="Tiêu đề học liệu"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              />
            </div>
            <SelectField
              id="mf-format"
              label="Định dạng tệp"
              value={formState.format}
              onChange={(e) =>
                setFormState({ ...formState, format: e.target.value as MaterialFormat })
              }
              options={[
                { value: 'PDF', label: 'Tài liệu PDF' },
                { value: 'DOCX', label: 'Tài liệu Word (DOCX)' },
                { value: 'PPTX', label: 'Bài giảng Slide (PPTX)' },
                { value: 'XLSX', label: 'Bảng từ vựng Excel (XLSX)' },
                { value: 'Audio', label: 'Âm thanh luyện nghe (Audio)' },
                { value: 'Video', label: 'Video bài giảng' },
                { value: 'Image', label: 'Infographic / Hình ảnh' },
              ]}
            />
            <SelectField
              id="mf-pub-cat"
              label="Chuyên mục học liệu"
              value={formState.publicCategory}
              onChange={(e) => {
                const pubCat = e.target.value as ManagedMaterialRecord['publicCategory']
                setFormState({
                  ...formState,
                  publicCategory: pubCat,
                  targetRefLabel:
                    formState.accessScope === 'public_web'
                      ? pubCat === 'exam-review'
                        ? 'Công khai Website (/tai-lieu/review-de-thi)'
                        : pubCat === 'listening-reading'
                          ? 'Công khai Website (/tai-lieu/listening-reading)'
                          : formState.targetRefLabel
                      : formState.targetRefLabel,
                })
              }}
              options={[
                {
                  value: 'listening-reading',
                  label: 'Tài liệu L&R (/tai-lieu/listening-reading)',
                },
                {
                  value: 'exam-review',
                  label: 'Review đề thi (/tai-lieu/review-de-thi)',
                },
                {
                  value: 'internal-only',
                  label: 'Chỉ lưu hành nội bộ',
                },
              ]}
            />
            <SelectField
              id="mf-scope"
              label="Phạm vi phân quyền"
              value={formState.accessScope}
              onChange={(e) => handleScopeChange(e.target.value as MaterialAccessScope)}
              options={[
                { value: 'public_web', label: 'Công khai trên Website' },
                { value: 'all_students', label: 'Tất cả học viên nội bộ' },
                { value: 'by_course', label: 'Theo khóa học' },
                { value: 'by_class', label: 'Theo lớp đào tạo' },
              ]}
            />

            {formState.accessScope === 'by_course' && (
              <SelectField
                id="mf-course"
                label="Chọn Khóa học áp dụng"
                value={formState.courseId ?? ''}
                onChange={(e) => {
                  const cId = e.target.value
                  const matched = courses.find((c) => c.id === cId)
                  setFormState({
                    ...formState,
                    courseId: cId,
                    targetRefLabel: matched ? `Khóa học: ${matched.name}` : formState.targetRefLabel,
                  })
                }}
                options={[
                  { value: '', label: '-- Chọn khóa học --' },
                  ...courses.map((c) => ({ value: c.id, label: `${c.name}` })),
                ]}
              />
            )}

            {formState.accessScope === 'by_class' && (
              <SelectField
                id="mf-class"
                label="Chọn Lớp đào tạo áp dụng"
                value={formState.classId ?? ''}
                onChange={(e) => {
                  const clsId = e.target.value
                  const matched = centerClasses.find((cls) => cls.id === clsId)
                  setFormState({
                    ...formState,
                    classId: clsId,
                    targetRefLabel: matched
                      ? `Lớp ${matched.classCode} (${matched.className})`
                      : formState.targetRefLabel,
                  })
                }}
                options={[
                  { value: '', label: '-- Chọn lớp đào tạo --' },
                  ...centerClasses.map((cls) => ({
                    value: cls.id,
                    label: `${cls.classCode} – ${cls.className}`,
                  })),
                ]}
              />
            )}

            <InputField
              id="mf-target"
              label="Nhãn đối tượng áp dụng hiển thị"
              value={formState.targetRefLabel}
              onChange={(e) =>
                setFormState({ ...formState, targetRefLabel: e.target.value })
              }
              placeholder="VD: Lớp EC-S01 hoặc /tai-lieu/listening-reading"
            />
            <SelectField
              id="mf-status"
              label="Trạng thái xuất bản"
              value={canPublish ? formState.status : 'draft'}
              disabled={!canPublish}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  status: e.target.value as LearningContentStatus,
                })
              }
              options={[
                { value: 'draft', label: 'Bản nháp' },
                { value: 'published', label: 'Xuất bản (Yêu cầu có tệp đính kèm)' },
                { value: 'hidden', label: 'Đang ẩn' },
                { value: 'archived', label: 'Lưu trữ' },
              ]}
            />
          </div>

          <InputField
            id="mf-desc"
            label="Mô tả tóm tắt nội dung"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
          />

          <MediaUploadBox
            label="Tệp đính kèm học liệu (Bắt buộc trước khi Xuất bản)"
            kind={
              formState.format === 'Audio'
                ? 'audio'
                : formState.format === 'Image'
                  ? 'image'
                  : 'document'
            }
            value={formState.media}
            onChange={(media) => setFormState({ ...formState, media })}
          />
        </div>
      </Modal>
    </div>
  )
}
