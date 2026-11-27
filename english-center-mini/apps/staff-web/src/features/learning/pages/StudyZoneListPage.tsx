import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileEdit, Lock, Pencil, Plus, Power } from 'lucide-react'
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
import { STUDY_LEVELS, type StudyLevel } from '@english-center/contracts'
import { matchText, paginate, slugifyVi } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { learningApi } from '@/features/learning/api/learningApi'
import type {
  LearningContentStatus,
  LockedStudyZoneCategorySlug,
  ManagedStudyTopicRecord,
  StudyZoneCategoryMeta,
} from '@/features/learning/types/learning.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

const CATEGORY_LABELS: Record<LockedStudyZoneCategorySlug, string> = {
  grammar: 'Ngữ pháp (Grammar)',
  vocabulary: 'Từ vựng (Vocabulary)',
  listening: 'Luyện nghe (Listening)',
}

const EXERCISE_STATUS_BADGE: Record<
  LearningContentStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  published: { label: 'Đã xuất bản', tone: 'success' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type ExerciseSortKey = 'updated_desc' | 'title_asc' | 'code_asc' | 'questions_desc'

const PAGE_SIZE = 6

export function StudyZoneListPage() {
  useDocumentTitle('Quản lý Study Zone')
  const { user } = useStaffAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canUpdate = hasPermission(user, 'study_zone.update')

  const [tab, setTab] = useState<'exercises' | 'topics' | 'categories'>('exercises')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<'ALL' | LockedStudyZoneCategorySlug>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LearningContentStatus>('ALL')
  const [sortBy, setSortBy] = useState<ExerciseSortKey>('updated_desc')
  const [exPage, setExPage] = useState(1)
  const [topicPage, setTopicPage] = useState(1)

  const [createExOpen, setCreateExOpen] = useState(false)
  const [createExError, setCreateExError] = useState<string | null>(null)
  const [newExTitle, setNewExTitle] = useState('')
  const [newExCode, setNewExCode] = useState('')
  const [newExCategory, setNewExCategory] = useState<LockedStudyZoneCategorySlug>('grammar')
  const [newExTopicId, setNewExTopicId] = useState('')

  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [topicError, setTopicError] = useState<string | null>(null)
  const [topicForm, setTopicForm] = useState<Omit<ManagedStudyTopicRecord, 'id'> & { id?: string }>({
    slug: '',
    category: 'grammar',
    title: '',
    shortDescription: '',
    level: 'Cơ bản (350+)',
    orderNumber: 1,
    isPublished: true,
  })

  const [catEditTarget, setCatEditTarget] = useState<StudyZoneCategoryMeta | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['staff', 'sz', 'categories'],
    queryFn: () => learningApi.listSzCategories(),
  })

  const { data: topics = [] } = useQuery({
    queryKey: ['staff', 'sz', 'topics'],
    queryFn: () => learningApi.listSzTopics(),
  })

  const {
    data: exercises = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff', 'sz', 'exercises'],
    queryFn: () => learningApi.listSzExercises(),
  })

  const topicsForSelectedCategory = useMemo(
    () => topics.filter((t) => t.category === newExCategory),
    [topics, newExCategory],
  )

  const createExerciseMutation = useMutation({
    mutationFn: () => {
      const matchedTopic = topicsForSelectedCategory.find((t) => t.id === newExTopicId)
      if (!matchedTopic) {
        throw new Error('Danh mục đã chọn chưa có Chủ đề hợp lệ. Vui lòng tạo Chủ đề trước.')
      }
      const code = newExCode.trim() || 'SZ-NEW'
      return learningApi.saveSzExercise({
        code,
        slug: slugifyVi(newExTitle.trim() ? `${code}-${newExTitle}` : code),
        category: newExCategory,
        topicId: matchedTopic.id,
        topicSlug: matchedTopic.slug,
        topicTitle: matchedTopic.title,
        title: newExTitle.trim() || 'Bài luyện tập mới',
        subtitle: 'Bài luyện tập tự học Study Zone',
        description: matchedTopic.shortDescription,
        level: matchedTopic.level || 'Cơ bản (350+)',
        durationMinutes: 10,
        instructions: 'Chọn đáp án đúng nhất A, B, C hoặc D.',
        status: 'draft',
        questions: [],
        answerKeys: {},
      })
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sz', 'exercises'] })
      setCreateExOpen(false)
      notify({
        tone: 'success',
        title: 'Đã khởi tạo bài luyện tập nháp',
        description: 'Đang mở trình biên tập câu hỏi chi tiết...',
      })
      navigate(`/learning/study-zone/${created.id}`)
    },
    onError: (err) => {
      setCreateExError(err instanceof Error ? err.message : 'Không thể tạo bài luyện tập.')
    },
  })

  const saveTopicMutation = useMutation({
    mutationFn: (payload: Omit<ManagedStudyTopicRecord, 'id'> & { id?: string }) =>
      learningApi.upsertSzTopic(payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sz', 'topics'] })
      setTopicModalOpen(false)
      setTopicError(null)
      if (createExOpen && saved.category === newExCategory) {
        setNewExTopicId(saved.id)
      }
      notify({
        tone: 'success',
        title: 'Đã lưu chủ đề Study Zone',
        description: `${saved.title} (/study-zone/${saved.category})`,
      })
    },
    onError: (err) => {
      setTopicError(err instanceof Error ? err.message : 'Không thể lưu chủ đề.')
    },
  })

  const updateCategoryMetaMutation = useMutation({
    mutationFn: ({
      slug,
      patch,
    }: {
      slug: LockedStudyZoneCategorySlug
      patch: Pick<StudyZoneCategoryMeta, 'name' | 'description' | 'isActive'>
    }) => learningApi.updateSzCategoryMeta(slug, patch),
    onSuccess: (_next, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sz', 'categories'] })
      setCatEditTarget(null)
      notify({
        tone: 'success',
        title: 'Đã cập nhật danh mục Study Zone',
        description: `${vars.patch.name} -> ${vars.patch.isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật danh mục',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const sortedExercises = useMemo(() => {
    const filtered = exercises.filter((ex) => {
      if (catFilter !== 'ALL' && ex.category !== catFilter) return false
      if (statusFilter !== 'ALL' && ex.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(ex.title, search) ||
          matchText(ex.code, search) ||
          matchText(ex.topicTitle, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi')
      if (sortBy === 'code_asc') return a.code.localeCompare(b.code, 'vi')
      if (sortBy === 'questions_desc') return b.questions.length - a.questions.length
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [exercises, catFilter, statusFilter, search, sortBy])

  const sortedTopics = useMemo(() => {
    const filtered = topics.filter((tp) => {
      if (catFilter !== 'ALL' && tp.category !== catFilter) return false
      if (search.trim()) {
        return (
          matchText(tp.title, search) ||
          matchText(tp.slug, search) ||
          matchText(tp.shortDescription, search)
        )
      }
      return true
    })
    return [...filtered].sort(
      (a, b) => a.category.localeCompare(b.category) || a.orderNumber - b.orderNumber,
    )
  }, [topics, catFilter, search])

  const paginatedExercises = useMemo(
    () => paginate(sortedExercises, exPage, PAGE_SIZE),
    [sortedExercises, exPage],
  )
  const paginatedTopics = useMemo(
    () => paginate(sortedTopics, topicPage, PAGE_SIZE),
    [sortedTopics, topicPage],
  )

  if (isLoading) return <LoadingBlock label="Đang tải dữ liệu Study Zone..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu Study Zone."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khu vực Tự học (Study Zone)"
        description="Quản lý danh mục, chủ đề và bài luyện tập tự học Study Zone."
        badge={<Badge tone="info">{exercises.length} bài luyện tập</Badge>}
        actions={
          <ActionGuard permission="study_zone.create">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setTopicError(null)
                  setTopicForm({
                    slug: '',
                    category: 'grammar',
                    title: '',
                    shortDescription: '',
                    level: 'Cơ bản (350+)',
                    orderNumber: topics.length + 1,
                    isPublished: true,
                  })
                  setTopicModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Thêm chủ đề</span>
              </Button>
              <Button
                onClick={() => {
                  const defaultCat: LockedStudyZoneCategorySlug = 'grammar'
                  const firstTopic = topics.find((t) => t.category === defaultCat)
                  setCreateExError(null)
                  setNewExTitle('')
                  setNewExCode('')
                  setNewExCategory(defaultCat)
                  setNewExTopicId(firstTopic?.id ?? '')
                  setCreateExOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Tạo bài luyện tập</span>
              </Button>
            </div>
          </ActionGuard>
        }
      />

      {/* Thanh chuyển Tab + Bộ lọc */}
      <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('exercises')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'exercises' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            Bài luyện tập ({exercises.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('topics')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'topics' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            Chủ đề ({topics.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('categories')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'categories' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            3 Danh mục Route cố định
          </button>
        </div>

        {(tab === 'exercises' || tab === 'topics') && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InputField
              placeholder="Tìm mã bài, tên bài hoặc chủ đề..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setExPage(1)
                setTopicPage(1)
              }}
            />
            <SelectField
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value as 'ALL' | LockedStudyZoneCategorySlug)
                setExPage(1)
                setTopicPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Tất cả kỹ năng' },
                { value: 'grammar', label: 'Ngữ pháp' },
                { value: 'vocabulary', label: 'Từ vựng' },
                { value: 'listening', label: 'Luyện nghe' },
              ]}
            />
            {tab === 'exercises' && (
              <>
                <SelectField
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'ALL' | LearningContentStatus)
                    setExPage(1)
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
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as ExerciseSortKey)
                    setExPage(1)
                  }}
                  options={[
                    { value: 'updated_desc', label: 'Mới cập nhật nhất' },
                    { value: 'title_asc', label: 'Tiêu đề A -> Z' },
                    { value: 'code_asc', label: 'Mã bài A -> Z' },
                    { value: 'questions_desc', label: 'Nhiều câu hỏi nhất' },
                  ]}
                />
              </>
            )}
          </div>
        )}
      </div>

      {tab === 'exercises' &&
        (paginatedExercises.items.length === 0 ? (
          <EmptyBlock title="Không tìm thấy bài luyện tập Study Zone" />
        ) : (
          <div className="space-y-3">
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="min-w-[220px]">
                      Mã & Tiêu đề bài luyện tập
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[180px]">
                      Danh mục & Chủ đề
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Số câu & Thời lượng
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Biên tập câu hỏi
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {paginatedExercises.items.map((ex) => {
                    const badge = EXERCISE_STATUS_BADGE[ex.status]
                    return (
                      <DataTableRow key={ex.id}>
                        <DataTableCell>
                          <p className="font-bold text-[#243B53]">{ex.title}</p>
                          <p className="text-xs text-[#64748B]">
                            Mã: <strong className="whitespace-nowrap">{ex.code}</strong> •{' '}
                            {ex.level}
                          </p>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone="info">{CATEGORY_LABELS[ex.category]}</Badge>
                            <p className="text-xs text-[#64748B]">{ex.topicTitle}</p>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-xs font-semibold whitespace-nowrap">
                          {ex.questions.length} câu hỏi • {ex.durationMinutes} phút
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </DataTableCell>
                        <DataTableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/learning/study-zone/${ex.id}`)}
                            >
                              <FileEdit className="h-3.5 w-3.5" />
                              <span>{canUpdate ? 'Biên tập & Xem thử' : 'Xem chi tiết'}</span>
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
              page={paginatedExercises.page}
              totalPages={paginatedExercises.totalPages}
              onChange={setExPage}
            />
          </div>
        ))}

      {tab === 'topics' &&
        (paginatedTopics.items.length === 0 ? (
          <EmptyBlock title="Chưa có chủ đề Study Zone phù hợp" />
        ) : (
          <div className="space-y-3">
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="min-w-[220px]">
                      Chủ đề học tập & Mã định danh
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Danh mục
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Cấp độ & Thứ tự
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Thao tác
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {paginatedTopics.items.map((tp) => (
                    <DataTableRow key={tp.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{tp.title}</p>
                        <p className="text-xs text-[#64748B]">
                          Mã: <code>{tp.slug}</code> • {tp.shortDescription}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone="info">{CATEGORY_LABELS[tp.category]}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-xs font-semibold whitespace-nowrap">
                        {tp.level} • Thứ tự #{tp.orderNumber}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={tp.isPublished ? 'success' : 'neutral'}>
                          {tp.isPublished ? 'Hiển thị' : 'Đang ẩn'}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <ActionGuard permission="study_zone.update">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setTopicError(null)
                                setTopicForm(tp)
                                setTopicModalOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Chỉnh sửa</span>
                            </Button>
                          </div>
                        </ActionGuard>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>

            <Pagination
              page={paginatedTopics.page}
              totalPages={paginatedTopics.totalPages}
              onChange={setTopicPage}
            />
          </div>
        ))}

      {tab === 'categories' &&
        (categories.length === 0 ? (
          <EmptyBlock title="Chưa có danh mục Study Zone" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.slug}
                className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="info">
                      <Lock className="mr-1 h-3 w-3" />
                      {cat.slug}
                    </Badge>
                    <Badge tone={cat.isActive ? 'success' : 'neutral'}>
                      {cat.isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-[#243B53]">{cat.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{cat.description}</p>
                  <p className="mt-2 text-xs font-semibold text-[#2878B8]">
                    {cat.topicsCount ?? 0} chủ đề • {cat.exercisesCount ?? 0} bài luyện tập
                  </p>
                  <p className="mt-2 rounded-lg bg-[#F5FAFE] px-2.5 py-1.5 text-xs text-[#2878B8]">
                    Đường dẫn danh mục: <code>{cat.clientRoute}</code>
                  </p>
                </div>

                <ActionGuard permission="study_zone.update">
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF4F8] pt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCatEditTarget(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Sửa mô tả</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={cat.isActive ? 'ghost' : 'primary'}
                      loading={updateCategoryMetaMutation.isPending}
                      onClick={() =>
                        updateCategoryMetaMutation.mutate({
                          slug: cat.slug,
                          patch: {
                            name: cat.name,
                            description: cat.description,
                            isActive: !cat.isActive,
                          },
                        })
                      }
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{cat.isActive ? 'Tạm ẩn danh mục' : 'Bật hiển thị'}</span>
                    </Button>
                  </div>
                </ActionGuard>
              </div>
            ))}
          </div>
        ))}

      {/* Modal sửa thông tin Danh mục Route cố định */}
      <Modal
        open={Boolean(catEditTarget)}
        title={catEditTarget ? `Cập nhật danh mục /study-zone/${catEditTarget.slug}` : ''}
        onClose={() => setCatEditTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCatEditTarget(null)}>
              Hủy
            </Button>
            <Button
              loading={updateCategoryMetaMutation.isPending}
              disabled={!catEditTarget?.name.trim()}
              onClick={() => {
                if (!catEditTarget) return
                updateCategoryMetaMutation.mutate({
                  slug: catEditTarget.slug,
                  patch: {
                    name: catEditTarget.name.trim(),
                    description: catEditTarget.description.trim(),
                    isActive: catEditTarget.isActive,
                  },
                })
              }}
            >
              Lưu danh mục
            </Button>
          </>
        }
      >
        {catEditTarget && (
          <div className="space-y-3.5">
            <InputField
              label="Tên hiển thị danh mục"
              value={catEditTarget.name}
              onChange={(e) => setCatEditTarget({ ...catEditTarget, name: e.target.value })}
            />
            <InputField
              label="Mô tả danh mục"
              value={catEditTarget.description}
              onChange={(e) =>
                setCatEditTarget({ ...catEditTarget, description: e.target.value })
              }
            />
            <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-3 text-xs font-bold text-[#243B53]">
              <input
                type="checkbox"
                checked={catEditTarget.isActive}
                onChange={(e) =>
                  setCatEditTarget({ ...catEditTarget, isActive: e.target.checked })
                }
              />
              <span>Kích hoạt hiển thị danh mục trên Website</span>
            </label>
          </div>
        )}
      </Modal>

      {/* Modal khởi tạo bài luyện tập */}
      <Modal
        open={createExOpen}
        title="Tạo bài luyện tập Study Zone mới"
        onClose={() => setCreateExOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateExOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={createExerciseMutation.isPending}
              disabled={
                !newExTitle.trim() ||
                !newExCode.trim() ||
                topicsForSelectedCategory.length === 0 ||
                !topicsForSelectedCategory.some((t) => t.id === newExTopicId)
              }
              onClick={() => createExerciseMutation.mutate()}
            >
              Tạo & Mở trình biên tập câu hỏi
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {createExError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {createExError}
            </div>
          )}
          <InputField
            label="Mã bài luyện tập"
            value={newExCode}
            onChange={(e) => setNewExCode(e.target.value)}
          />
          <InputField
            label="Tiêu đề bài luyện tập"
            value={newExTitle}
            onChange={(e) => setNewExTitle(e.target.value)}
            placeholder="VD: Test 3 – Mệnh đề quan hệ rút gọn"
          />
          <SelectField
            label="Danh mục kỹ năng (Khóa theo 3 route chuẩn)"
            value={newExCategory}
            onChange={(e) => {
              const cat = e.target.value as LockedStudyZoneCategorySlug
              setNewExCategory(cat)
              const firstTopic = topics.find((t) => t.category === cat)
              setNewExTopicId(firstTopic?.id ?? '')
            }}
            options={[
              { value: 'grammar', label: 'Ngữ pháp (/study-zone/grammar)' },
              { value: 'vocabulary', label: 'Từ vựng (/study-zone/vocabulary)' },
              { value: 'listening', label: 'Luyện nghe (/study-zone/listening)' },
            ]}
          />

          {topicsForSelectedCategory.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#78350F]">
              <div className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                <span>
                  Danh mục <strong>{CATEGORY_LABELS[newExCategory]}</strong> hiện chưa có Chủ đề nào
                  (0 chủ đề). Bạn cần khởi tạo ít nhất 1 Chủ đề trước khi tạo bài luyện tập.
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setTopicError(null)
                  setTopicForm({
                    slug: '',
                    category: newExCategory,
                    title: '',
                    shortDescription: '',
                    level: 'Cơ bản (350+)',
                    orderNumber: topics.length + 1,
                    isPublished: true,
                  })
                  setTopicModalOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo chủ đề cho {CATEGORY_LABELS[newExCategory]} ngay</span>
              </Button>
            </div>
          ) : (
            <SelectField
              label="Thuộc chủ đề"
              value={newExTopicId}
              onChange={(e) => setNewExTopicId(e.target.value)}
              options={topicsForSelectedCategory.map((t) => ({
                value: t.id,
                label: t.title,
              }))}
            />
          )}
        </div>
      </Modal>

      {/* Modal thêm/sửa chủ đề */}
      <Modal
        open={topicModalOpen}
        title={topicForm.id ? 'Cập nhật chủ đề Study Zone' : 'Thêm chủ đề mới'}
        onClose={() => setTopicModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTopicModalOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={saveTopicMutation.isPending}
              disabled={!topicForm.title.trim()}
              onClick={() =>
                saveTopicMutation.mutate({
                  ...topicForm,
                  slug: slugifyVi(topicForm.slug || topicForm.title),
                })
              }
            >
              Lưu chủ đề
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {topicError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {topicError}
            </div>
          )}
          <SelectField
            label="Danh mục gốc"
            value={topicForm.category}
            onChange={(e) =>
              setTopicForm({
                ...topicForm,
                category: e.target.value as LockedStudyZoneCategorySlug,
              })
            }
            options={[
              { value: 'grammar', label: 'Ngữ pháp' },
              { value: 'vocabulary', label: 'Từ vựng' },
              { value: 'listening', label: 'Luyện nghe' },
            ]}
          />
          <InputField
            label="Tên chủ đề"
            value={topicForm.title}
            onChange={(e) => {
              const title = e.target.value
              setTopicForm({
                ...topicForm,
                title,
                slug: topicForm.id ? topicForm.slug : slugifyVi(title),
              })
            }}
          />
          <InputField
            label="Mã định danh chủ đề (Slug)"
            value={topicForm.slug}
            onChange={(e) =>
              setTopicForm({ ...topicForm, slug: slugifyVi(e.target.value) })
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Trình độ gợi ý"
              value={topicForm.level}
              onChange={(e) =>
                setTopicForm({ ...topicForm, level: e.target.value as StudyLevel })
              }
              options={STUDY_LEVELS.map((lv) => ({ value: lv, label: lv }))}
            />
            <InputField
              label="Thứ tự hiển thị"
              type="number"
              min={1}
              value={topicForm.orderNumber}
              onChange={(e) =>
                setTopicForm({
                  ...topicForm,
                  orderNumber: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>
          <InputField
            label="Mô tả ngắn"
            value={topicForm.shortDescription}
            onChange={(e) => setTopicForm({ ...topicForm, shortDescription: e.target.value })}
          />
          <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-2.5 text-xs font-bold text-[#243B53]">
            <input
              type="checkbox"
              checked={topicForm.isPublished}
              onChange={(e) => setTopicForm({ ...topicForm, isPublished: e.target.checked })}
            />
            <span>Hiển thị công khai chủ đề trên Study Zone</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
