import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
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
import {
  getTodayIsoInVietnam,
  isValidSlug,
  matchText,
  paginate,
  slugifyVi,
  toSafeHttpUrl,
} from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { cmsApi } from '@/features/content/api/cmsApi'
import type {
  ManagedNewsRecord,
  NewsPublishStatus,
  StructuredContentBlock,
} from '@/features/content/types/cms.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { createUniqueId } from '@/shared/utils/staffFormatters'

const NEWS_STATUS_META: Record<
  NewsPublishStatus,
  { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' }
> = {
  published: { label: 'Đã xuất bản', tone: 'success' },
  scheduled: { label: 'Hẹn giờ đăng', tone: 'info' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type NewsSortKey = 'date_desc' | 'updated_desc' | 'title_asc'

const PAGE_SIZE = 6

export function NewsPage() {
  useDocumentTitle('Tin tức & Thông báo')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canPublish = hasPermission(user, 'news.publish')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | NewsPublishStatus>('ALL')
  const [sortBy, setSortBy] = useState<NewsSortKey>('date_desc')
  const [page, setPage] = useState(1)

  const [previewTarget, setPreviewTarget] = useState<ManagedNewsRecord | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formState, setFormState] = useState<
    Omit<ManagedNewsRecord, 'id' | 'updatedAt'> & { id?: string }
  >({
    slug: '',
    title: '',
    excerpt: '',
    category: 'Tuyển sinh',
    thumbnail: '',
    blocks: [{ id: 'blk-init', type: 'paragraph', text: '' }],
    status: 'draft',
    publishedDate: getTodayIsoInVietnam(),
    author: user?.fullName ?? '',
  })

  const { data: newsList = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'cms', 'news'],
    queryFn: () => cmsApi.listNews(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<ManagedNewsRecord, 'id' | 'updatedAt'> & { id?: string }) =>
      cmsApi.upsertNews(payload),
    onSuccess: (saved, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'news'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: vars.id ? 'Đã lưu bài viết tin tức' : 'Đã tạo bài tin tức mới',
        description: `${saved.title} (${NEWS_STATUS_META[saved.status].label})`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu bài viết.')
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({ item, status }: { item: ManagedNewsRecord; status: NewsPublishStatus }) =>
      cmsApi.upsertNews({ ...item, status }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'news'] })
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái tin tức',
        description: `${saved.title} -> ${NEWS_STATUS_META[saved.status].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật trạng thái',
        description: err instanceof Error ? err.message : 'Vui lòng mở trình biên tập kiểm tra.',
      })
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = newsList.filter((n) => {
      if (statusFilter !== 'ALL' && n.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(n.title, search) ||
          matchText(n.slug, search) ||
          matchText(n.category, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi')
      if (sortBy === 'updated_desc') return b.updatedAt.localeCompare(a.updatedAt)
      return b.publishedDate.localeCompare(a.publishedDate)
    })
  }, [newsList, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  const openCreate = () => {
    setFormError(null)
    setFormState({
      slug: '',
      title: '',
      excerpt: '',
      category: 'Tuyển sinh',
      thumbnail: '',
      blocks: [{ id: createUniqueId('blk'), type: 'paragraph', text: '' }],
      status: 'draft',
      publishedDate: getTodayIsoInVietnam(),
      author: user?.fullName ?? '',
    })
    setEditorOpen(true)
  }

  const openEdit = (record: ManagedNewsRecord) => {
    setFormError(null)
    setFormState({
      id: record.id,
      slug: record.slug,
      title: record.title,
      excerpt: record.excerpt,
      category: record.category,
      thumbnail: record.thumbnail,
      blocks: record.blocks,
      status: canPublish ? record.status : 'draft',
      publishedDate: record.publishedDate,
      author: record.author,
    })
    setEditorOpen(true)
  }

  const addBlock = (type: StructuredContentBlock['type']) => {
    const id = createUniqueId('blk')
    const newBlock: StructuredContentBlock =
      type === 'heading'
        ? { id, type: 'heading', text: '' }
        : type === 'paragraph'
          ? { id, type: 'paragraph', text: '' }
          : type === 'list'
            ? { id, type: 'list', items: [''] }
            : type === 'image'
              ? { id, type: 'image', src: '', alt: '', caption: '' }
              : { id, type: 'link', label: '', href: '' }

    setFormState((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }))
  }

  const moveBlock = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir
    if (targetIdx < 0 || targetIdx >= formState.blocks.length) return
    const next = [...formState.blocks]
    const currentItem = next[index]
    const swapItem = next[targetIdx]
    if (!currentItem || !swapItem) return
    next[index] = swapItem
    next[targetIdx] = currentItem
    setFormState((prev) => ({ ...prev, blocks: next }))
  }

  const handleSave = () => {
    const normalizedSlug = slugifyVi(formState.slug || formState.title)
    if (!formState.title.trim() || !normalizedSlug) {
      setFormError('Vui lòng nhập Tiêu đề và Đường dẫn Slug hợp lệ.')
      return
    }
    if (!isValidSlug(normalizedSlug)) {
      setFormError('Slug chỉ được chứa chữ thường a-z, số 0-9 và dấu gạch ngang (-).')
      return
    }
    if (
      formState.thumbnail.trim() &&
      !toSafeHttpUrl(formState.thumbnail.trim()) &&
      !formState.thumbnail.startsWith('data:image/')
    ) {
      setFormError('Ảnh đại diện (thumbnail) phải là URL http/https hợp lệ hoặc ảnh tải lên.')
      return
    }
    if (formState.blocks.length === 0) {
      setFormError('Bài viết tin tức bắt buộc có ít nhất 1 khối nội dung.')
      return
    }
    for (const blk of formState.blocks) {
      if ((blk.type === 'heading' || blk.type === 'paragraph') && !blk.text.trim()) {
        setFormError('Không được để trống nội dung của khối Tiêu đề mục hoặc Đoạn văn.')
        return
      }
      if (blk.type === 'list' && blk.items.map((i) => i.trim()).filter(Boolean).length === 0) {
        setFormError('Khối Danh sách ý phải có ít nhất 1 dòng nội dung.')
        return
      }
      if (blk.type === 'link' && (!blk.label.trim() || !toSafeHttpUrl(blk.href.trim()))) {
        setFormError('Mọi khối Liên kết phải có nhãn hiển thị và URL an toàn http/https.')
        return
      }
      if (
        blk.type === 'image' &&
        (!blk.src.trim() ||
          (!toSafeHttpUrl(blk.src.trim()) && !blk.src.startsWith('data:image/')))
      ) {
        setFormError('Khối Hình ảnh phải có đường dẫn URL ảnh hợp lệ.')
        return
      }
    }

    const effectiveStatus: NewsPublishStatus = canPublish ? formState.status : 'draft'
    if (effectiveStatus === 'scheduled') {
      const todayYmdVn = getTodayIsoInVietnam()
      if (!formState.publishedDate || formState.publishedDate <= todayYmdVn) {
        setFormError(
          `Chế độ Hẹn giờ đăng (Scheduled) bắt buộc chọn ngày đăng lớn hơn ngày hiện tại (${todayYmdVn}).`,
        )
        return
      }
    }

    saveMutation.mutate({
      ...formState,
      slug: normalizedSlug,
      status: effectiveStatus,
      blocks: formState.blocks.map((blk) =>
        blk.type === 'list'
          ? { ...blk, items: blk.items.map((i) => i.trim()).filter(Boolean) }
          : blk,
      ),
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải bài viết tin tức..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách tin tức."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tin tức & Thông báo"
        description="Quản lý bài viết tin tức và thông báo hiển thị trên Website."
        badge={<Badge tone="info">{newsList.length} bài tin</Badge>}
        actions={
          <ActionGuard permission="news.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Soạn tin tức mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="nw-search"
            label="Tìm kiếm bài tin"
            placeholder="Nhập tiêu đề, chuyên mục hoặc slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="nw-status"
          label="Trạng thái xuất bản"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | NewsPublishStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'published', label: 'Đã xuất bản' },
            { value: 'scheduled', label: 'Hẹn giờ đăng' },
            { value: 'draft', label: 'Bản nháp' },
            { value: 'hidden', label: 'Đang ẩn' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
        />
        <SelectField
          id="nw-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as NewsSortKey)
            setPage(1)
          }}
          options={[
            { value: 'date_desc', label: 'Ngày đăng mới nhất' },
            { value: 'updated_desc', label: 'Cập nhật gần nhất' },
            { value: 'title_asc', label: 'Tiêu đề A -> Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không có bài tin tức nào phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[240px]">
                    Tiêu đề & Slug
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Chuyên mục
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Ngày đăng</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((item) => {
                  const st = NEWS_STATUS_META[item.status]
                  return (
                    <DataTableRow key={item.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{item.title}</p>
                        <p className="text-xs text-[#64748B]">
                          <code>/about/news/{item.slug}</code> • {item.blocks.length} khối nội dung
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone="info">{item.category}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-xs font-medium whitespace-nowrap">
                        {item.publishedDate}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTarget(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem trước</span>
                          </Button>

                          <ActionGuard permission="news.update">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Biên tập</span>
                            </Button>
                          </ActionGuard>

                          <ActionGuard permission="news.publish">
                            {item.status !== 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Xuất bản ngay"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, status: 'published' })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A4C]" />
                              </Button>
                            )}
                            {item.status === 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Tạm ẩn bài viết"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, status: 'hidden' })
                                }
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {item.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Lưu trữ bài viết"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, status: 'archived' })
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

      {/* Modal Xem trước an toàn */}
      <Modal
        open={Boolean(previewTarget)}
        title="Xem trước bài tin tức trên Client Web"
        onClose={() => setPreviewTarget(null)}
        maxWidthClassName="max-w-2xl"
      >
        {previewTarget && (
          <article className="space-y-4 text-sm text-[#243B53]">
            <div className="flex items-center gap-2">
              <Badge tone="info">{previewTarget.category}</Badge>
              <span className="text-xs text-[#64748B]">
                {previewTarget.publishedDate} • {previewTarget.author}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[#243B53]">{previewTarget.title}</h1>
            {previewTarget.thumbnail &&
              (toSafeHttpUrl(previewTarget.thumbnail) ||
                previewTarget.thumbnail.startsWith('data:image/')) && (
                <img
                  src={previewTarget.thumbnail}
                  alt={previewTarget.title}
                  className="max-h-60 w-full rounded-xl object-cover"
                />
              )}
            <p className="font-medium text-[#475569]">{previewTarget.excerpt}</p>
            <div className="space-y-3 border-t border-[#DCEAF3] pt-3">
              {previewTarget.blocks.map((blk) => {
                if (blk.type === 'heading') {
                  return (
                    <h2 key={blk.id} className="text-base font-bold text-[#2878B8]">
                      {blk.text}
                    </h2>
                  )
                }
                if (blk.type === 'paragraph') {
                  return (
                    <p key={blk.id} className="leading-relaxed">
                      {blk.text}
                    </p>
                  )
                }
                if (blk.type === 'list') {
                  return (
                    <ul key={blk.id} className="list-disc space-y-1 pl-5">
                      {blk.items.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  )
                }
                if (blk.type === 'image') {
                  const safeSrc = blk.src.startsWith('data:image/')
                    ? blk.src
                    : toSafeHttpUrl(blk.src)
                  return safeSrc ? (
                    <figure key={blk.id} className="space-y-1">
                      <img
                        src={safeSrc}
                        alt={blk.alt}
                        className="max-h-64 w-full rounded-xl object-cover"
                      />
                      {blk.caption && (
                        <figcaption className="text-center text-xs text-[#64748B]">
                          {blk.caption}
                        </figcaption>
                      )}
                    </figure>
                  ) : null
                }
                const safeHref = toSafeHttpUrl(blk.href)
                return safeHref ? (
                  <p key={blk.id}>
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#2878B8] underline"
                    >
                      {blk.label}
                    </a>
                  </p>
                ) : null
              })}
            </div>
          </article>
        )}
      </Modal>

      {/* Modal Biên tập khối có cấu trúc */}
      <Modal
        open={editorOpen}
        title={formState.id ? 'Biên tập bài tin tức' : 'Soạn bài tin tức mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {canPublish ? 'Lưu bài viết' : 'Lưu về Bản nháp'}
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
              id="nf-title"
              label="Tiêu đề bài viết"
              value={formState.title}
              onChange={(e) => {
                const title = e.target.value
                setFormState({
                  ...formState,
                  title,
                  slug: formState.id ? formState.slug : slugifyVi(title),
                })
              }}
            />
            <InputField
              id="nf-slug"
              label="Đường dẫn Slug (duy nhất)"
              value={formState.slug}
              onChange={(e) =>
                setFormState({ ...formState, slug: slugifyVi(e.target.value) })
              }
            />
            <SelectField
              id="nf-cat"
              label="Chuyên mục"
              value={formState.category}
              onChange={(e) => setFormState({ ...formState, category: e.target.value })}
              options={[
                { value: 'Tuyển sinh', label: 'Tuyển sinh' },
                { value: 'Kinh nghiệm học', label: 'Kinh nghiệm học' },
                { value: 'Mẹo thi', label: 'Mẹo thi' },
                { value: 'Hoạt động trung tâm', label: 'Hoạt động trung tâm' },
              ]}
            />
            <SelectField
              id="nf-status"
              label="Trạng thái xuất bản"
              value={canPublish ? formState.status : 'draft'}
              disabled={!canPublish}
              onChange={(e) =>
                setFormState({ ...formState, status: e.target.value as NewsPublishStatus })
              }
              options={[
                { value: 'draft', label: 'Bản nháp (Draft)' },
                { value: 'scheduled', label: 'Hẹn giờ đăng (Scheduled – Ngày tương lai)' },
                { value: 'published', label: 'Xuất bản công khai (Published)' },
                { value: 'hidden', label: 'Ẩn tạm thời (Hidden)' },
                { value: 'archived', label: 'Lưu trữ (Archived)' },
              ]}
            />
            <InputField
              id="nf-date"
              label={
                formState.status === 'scheduled'
                  ? 'Ngày hẹn đăng (Phải lớn hơn hôm nay)'
                  : 'Ngày hiển thị bài đăng'
              }
              type="date"
              value={formState.publishedDate}
              onChange={(e) => setFormState({ ...formState, publishedDate: e.target.value })}
            />
            <InputField
              id="nf-author"
              label="Tác giả hiển thị"
              value={formState.author}
              onChange={(e) => setFormState({ ...formState, author: e.target.value })}
            />
          </div>

          <InputField
            id="nf-excerpt"
            label="Tóm tắt ngắn (Excerpt)"
            value={formState.excerpt}
            onChange={(e) => setFormState({ ...formState, excerpt: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MediaUploadBox
              label="Ảnh đại diện bài viết (Thumbnail)"
              kind="image"
              value={
                formState.thumbnail
                  ? {
                      id: 'nf-thumb',
                      kind: 'image',
                      fileName: 'news-thumbnail.jpg',
                      mimeType: 'image/jpeg',
                      url: formState.thumbnail,
                      status: 'ready',
                    }
                  : null
              }
              onChange={(media) =>
                setFormState({ ...formState, thumbnail: media?.url ?? '' })
              }
            />
            <InputField
              id="nf-thumb-url"
              label="Hoặc nhập trực tiếp URL ảnh đại diện (https://...)"
              value={formState.thumbnail}
              onChange={(e) => setFormState({ ...formState, thumbnail: e.target.value })}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          {/* Structured Block Editor */}
          <div className="rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#243B53]">
                Các khối nội dung bài viết ({formState.blocks.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => addBlock('heading')}>
                  + Tiêu đề mục
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('paragraph')}>
                  + Đoạn văn
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('list')}>
                  + Danh sách ý
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('image')}>
                  + Hình ảnh
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addBlock('link')}>
                  + Liên kết an toàn
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {formState.blocks.map((blk, idx) => (
                <div
                  key={blk.id}
                  className="rounded-xl border border-[#DCEAF3] bg-white p-3 shadow-2xs"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="info">
                      Khối #{idx + 1} – {blk.type.toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Đưa khối lên"
                        className="rounded p-1 text-[#64748B] hover:bg-[#EAF6FD] disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 1)}
                        disabled={idx === formState.blocks.length - 1}
                        aria-label="Đưa khối xuống"
                        className="rounded p-1 text-[#64748B] hover:bg-[#EAF6FD] disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={formState.blocks.length <= 1}
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            blocks: prev.blocks.filter((b) => b.id !== blk.id),
                          }))
                        }
                        aria-label="Xóa khối"
                        className="rounded p-1 text-[#B93A2E] hover:bg-[#FDECE9] disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {(blk.type === 'heading' || blk.type === 'paragraph') && (
                    <textarea
                      rows={blk.type === 'heading' ? 1 : 2}
                      value={blk.text}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormState((prev) => ({
                          ...prev,
                          blocks: prev.blocks.map((b) =>
                            b.id === blk.id ? ({ ...b, text: val } as StructuredContentBlock) : b,
                          ),
                        }))
                      }}
                      className="w-full rounded-lg border border-[#DCEAF3] px-3 py-2 text-xs outline-none focus:border-[#75BDEB]"
                    />
                  )}

                  {blk.type === 'list' && (
                    <textarea
                      rows={3}
                      value={blk.items.join('\n')}
                      placeholder="Mỗi dòng một gạch đầu dòng..."
                      onChange={(e) => {
                        const items = e.target.value.split('\n')
                        setFormState((prev) => ({
                          ...prev,
                          blocks: prev.blocks.map((b) =>
                            b.id === blk.id ? { ...blk, items } : b,
                          ),
                        }))
                      }}
                      className="w-full rounded-lg border border-[#DCEAF3] px-3 py-2 text-xs outline-none focus:border-[#75BDEB]"
                    />
                  )}

                  {blk.type === 'image' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <InputField
                        label="URL ảnh (https://...)"
                        value={blk.src}
                        onChange={(e) => {
                          const src = e.target.value
                          setFormState((prev) => ({
                            ...prev,
                            blocks: prev.blocks.map((b) =>
                              b.id === blk.id ? { ...blk, src } : b,
                            ),
                          }))
                        }}
                      />
                      <InputField
                        label="Chú thích ảnh"
                        value={blk.caption ?? ''}
                        onChange={(e) => {
                          const caption = e.target.value
                          setFormState((prev) => ({
                            ...prev,
                            blocks: prev.blocks.map((b) =>
                              b.id === blk.id ? { ...blk, caption } : b,
                            ),
                          }))
                        }}
                      />
                    </div>
                  )}

                  {blk.type === 'link' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <InputField
                        label="Nhãn hiển thị"
                        value={blk.label}
                        onChange={(e) => {
                          const label = e.target.value
                          setFormState((prev) => ({
                            ...prev,
                            blocks: prev.blocks.map((b) =>
                              b.id === blk.id ? { ...blk, label } : b,
                            ),
                          }))
                        }}
                      />
                      <InputField
                        label="URL đích (https://...)"
                        value={blk.href}
                        onChange={(e) => {
                          const href = e.target.value
                          setFormState((prev) => ({
                            ...prev,
                            blocks: prev.blocks.map((b) =>
                              b.id === blk.id ? { ...blk, href } : b,
                            ),
                          }))
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
