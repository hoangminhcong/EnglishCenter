import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import {
  JOB_EMPLOYMENT_TYPES,
  type JobEmploymentType,
  type JobPostStatus,
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
  Modal,
  Pagination,
  SelectField,
} from '@english-center/ui'
import {
  isIsoDateExpiredInVietnam,
  isValidEmail,
  isValidSlug,
  matchText,
  paginate,
  slugifyVi,
  toSafeHttpUrl,
} from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { cmsApi } from '@/features/content/api/cmsApi'
import type { ManagedJobRecord } from '@/features/content/types/cms.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

type JobSortKey = 'deadline_desc' | 'updated_desc' | 'title_asc' | 'quantity_desc'

const PAGE_SIZE = 6

export function JobsPage() {
  useDocumentTitle('Tin tuyển dụng')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canPublish = hasPermission(user, 'jobs.publish')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobPostStatus>('ALL')
  const [sortBy, setSortBy] = useState<JobSortKey>('deadline_desc')
  const [page, setPage] = useState(1)

  const [previewTarget, setPreviewTarget] = useState<ManagedJobRecord | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [descText, setDescText] = useState('')
  const [reqText, setReqText] = useState('')
  const [benText, setBenText] = useState('')

  const [formState, setFormState] = useState<
    Omit<ManagedJobRecord, 'id' | 'updatedAt'> & { id?: string }
  >({
    slug: '',
    title: '',
    position: '',
    type: 'Toàn thời gian',
    quantity: 1,
    branchId: '',
    branchLabel: '',
    salary: '',
    deadline: '',
    applicationEmail: '',
    image: '',
    excerpt: '',
    description: [],
    requirements: [],
    benefits: [],
    status: 'draft',
  })

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'cms', 'jobs'],
    queryFn: () => cmsApi.listJobs(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<ManagedJobRecord, 'id' | 'updatedAt'> & { id?: string }) =>
      cmsApi.upsertJob(payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'jobs'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: 'Đã lưu tin tuyển dụng',
        description: saved.title,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu tin tuyển dụng.')
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({ job, status }: { job: ManagedJobRecord; status: JobPostStatus }) =>
      cmsApi.upsertJob({ ...job, status }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'jobs'] })
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái tin tuyển dụng',
        description: saved.title,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Chưa thể đổi trạng thái tin tuyển dụng',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra hạn nộp hồ sơ.',
      })
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = jobs.filter((j) => {
      if (statusFilter !== 'ALL' && j.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(j.title, search) ||
          matchText(j.position, search) ||
          matchText(j.branchLabel, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi')
      if (sortBy === 'quantity_desc') return b.quantity - a.quantity
      if (sortBy === 'updated_desc') return b.updatedAt.localeCompare(a.updatedAt)
      return b.deadline.localeCompare(a.deadline)
    })
  }, [jobs, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  const openCreate = () => {
    setFormError(null)
    setDescText('')
    setReqText('')
    setBenText('')
    setFormState({
      slug: '',
      title: '',
      position: '',
      type: 'Toàn thời gian',
      quantity: 1,
      branchId: branches[0]?.id ?? '',
      branchLabel: branches[0]?.name ?? '',
      salary: '',
      deadline: '',
      applicationEmail: '',
      image: '',
      excerpt: '',
      description: [],
      requirements: [],
      benefits: [],
      status: 'draft',
    })
    setEditorOpen(true)
  }

  const openEdit = (job: ManagedJobRecord) => {
    setFormError(null)
    setDescText(job.description.join('\n'))
    setReqText(job.requirements.join('\n'))
    setBenText(job.benefits.join('\n'))
    setFormState({
      id: job.id,
      slug: job.slug,
      title: job.title,
      position: job.position,
      type: job.type,
      quantity: job.quantity,
      branchId: job.branchId,
      branchLabel: job.branchLabel,
      salary: job.salary,
      deadline: job.deadline,
      applicationEmail: job.applicationEmail,
      image: job.image ?? '',
      excerpt: job.excerpt,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      status: canPublish ? job.status : 'draft',
    })
    setEditorOpen(true)
  }

  const handleSave = () => {
    const normalizedSlug = slugifyVi(formState.slug || formState.title)
    if (!formState.title.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      setFormError('Vui lòng nhập Chức danh tuyển dụng và Đường dẫn Slug hợp lệ.')
      return
    }
    if (!formState.branchId.trim()) {
      setFormError('Vui lòng chọn địa điểm làm việc.')
      return
    }
    if (!isValidEmail(formState.applicationEmail.trim())) {
      setFormError('Email nhận hồ sơ không hợp lệ.')
      return
    }
    const cleanImage = formState.image?.trim() ?? ''
    if (
      cleanImage &&
      !toSafeHttpUrl(cleanImage) &&
      !cleanImage.startsWith('/') &&
      !cleanImage.startsWith('data:image/')
    ) {
      setFormError('Ảnh minh họa tin tuyển dụng phải là URL http/https hợp lệ.')
      return
    }

    const parsedDescription = descText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const parsedRequirements = reqText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const parsedBenefits = benText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    if (parsedDescription.length === 0 || parsedRequirements.length === 0) {
      setFormError('Bắt buộc nhập ít nhất 1 dòng Mô tả công việc và 1 dòng Yêu cầu ứng viên.')
      return
    }

    const effectiveStatus: JobPostStatus = canPublish ? formState.status : 'draft'
    if (
      effectiveStatus === 'published' &&
      (!formState.deadline || isIsoDateExpiredInVietnam(formState.deadline))
    ) {
      setFormError(
        'Hạn nộp hồ sơ đã qua theo giờ Việt Nam: không thể đăng công khai khi chưa gia hạn deadline.',
      )
      return
    }

    saveMutation.mutate({
      ...formState,
      slug: normalizedSlug,
      applicationEmail: formState.applicationEmail.trim(),
      image: cleanImage || undefined,
      excerpt: formState.excerpt.trim() || parsedDescription[0] || '',
      description: parsedDescription,
      requirements: parsedRequirements,
      benefits: parsedBenefits,
      status: effectiveStatus,
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách tin tuyển dụng..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải tin tuyển dụng."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tin Tuyển dụng"
        description="Quản lý vị trí tuyển dụng nhân sự, giảng viên và hạn nộp hồ sơ."
        badge={<Badge tone="info">{jobs.length} vị trí</Badge>}
        actions={
          <ActionGuard permission="jobs.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Đăng tin tuyển dụng</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="job-search"
            label="Tìm kiếm vị trí"
            placeholder="Nhập chức danh, bộ phận hoặc cơ sở..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="job-status"
          label="Trạng thái tin đăng"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | JobPostStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'published', label: 'Đang đăng tuyển' },
            { value: 'draft', label: 'Bản nháp' },
            { value: 'closed', label: 'Đã đóng nhận hồ sơ' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
        />
        <SelectField
          id="job-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as JobSortKey)
            setPage(1)
          }}
          options={[
            { value: 'deadline_desc', label: 'Hạn nộp mới nhất' },
            { value: 'updated_desc', label: 'Cập nhật gần nhất' },
            { value: 'quantity_desc', label: 'Chỉ tiêu cao nhất' },
            { value: 'title_asc', label: 'Chức danh A -> Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không có tin tuyển dụng phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Vị trí tuyển dụng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Cơ sở & Hình thức
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Số lượng & Mức lương
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Hạn nộp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái hiển thị
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((job) => {
                  const isExpired = isIsoDateExpiredInVietnam(job.deadline)
                  return (
                    <DataTableRow key={job.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{job.title}</p>
                        <p className="text-xs text-[#64748B]">
                          Bộ phận: {job.position} • <code>/{job.slug}</code>
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-medium text-[#243B53]">{job.branchLabel}</p>
                        <p className="text-xs text-[#64748B]">{job.type}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{job.quantity} nhân sự</p>
                        <p className="text-[#64748B]">{job.salary}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold text-[#243B53]">
                            {job.deadline}
                          </span>
                          {isExpired && (
                            <Badge tone="danger">Quá hạn nộp (Tự khóa ứng tuyển)</Badge>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge
                          tone={
                            job.status === 'published' && !isExpired
                              ? 'success'
                              : job.status === 'draft'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {job.status === 'published'
                            ? 'Đã xuất bản'
                            : job.status === 'draft'
                              ? 'Bản nháp'
                              : job.status === 'closed'
                                ? 'Đã đóng'
                                : 'Lưu trữ'}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTarget(job)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem trước</span>
                          </Button>

                          <ActionGuard permission="jobs.update">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(job)}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>

                          <ActionGuard permission="jobs.publish">
                            {job.status !== 'published' && !isExpired && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Đăng công khai"
                                onClick={() =>
                                  quickStatusMutation.mutate({ job, status: 'published' })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A4C]" />
                              </Button>
                            )}
                            {job.status === 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Đóng nhận hồ sơ"
                                onClick={() =>
                                  quickStatusMutation.mutate({ job, status: 'closed' })
                                }
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {job.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Lưu trữ tin tuyển dụng"
                                onClick={() =>
                                  quickStatusMutation.mutate({ job, status: 'archived' })
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

      {/* Modal Xem trước Tin tuyển dụng */}
      <Modal
        open={Boolean(previewTarget)}
        title={previewTarget ? `Xem trước tin tuyển dụng – ${previewTarget.title}` : ''}
        onClose={() => setPreviewTarget(null)}
        maxWidthClassName="max-w-2xl"
        footer={<Button onClick={() => setPreviewTarget(null)}>Đóng</Button>}
      >
        {previewTarget && (
          <div className="space-y-4 text-sm text-[#243B53]">
            {previewTarget.image && (
              <img
                src={previewTarget.image}
                alt={previewTarget.title}
                className="max-h-44 w-full rounded-xl border border-[#DCEAF3] object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{previewTarget.position}</Badge>
              <Badge tone="neutral">{previewTarget.type}</Badge>
              {isIsoDateExpiredInVietnam(previewTarget.deadline) ? (
                <Badge tone="danger">Quá hạn nộp ({previewTarget.deadline})</Badge>
              ) : (
                <Badge tone="success">Hạn nộp: {previewTarget.deadline}</Badge>
              )}
            </div>

            <div className="rounded-xl bg-[#F8FBFD] p-3.5 text-xs">
              <p>
                <strong>Địa điểm làm việc:</strong> {previewTarget.branchLabel}
              </p>
              <p className="mt-1">
                <strong>Số lượng:</strong> {previewTarget.quantity} nhân sự •{' '}
                <strong>Mức lương:</strong> {previewTarget.salary}
              </p>
              <p className="mt-1">
                <strong>Email nhận CV:</strong> {previewTarget.applicationEmail}
              </p>
            </div>

            {previewTarget.excerpt && (
              <p className="text-xs italic text-[#475569]">{previewTarget.excerpt}</p>
            )}

            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-[#2878B8]">
                  1. Mô tả công việc
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                  {previewTarget.description.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase text-[#2878B8]">
                  2. Yêu cầu ứng viên
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                  {previewTarget.requirements.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              {previewTarget.benefits.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-[#2878B8]">
                    3. Quyền lợi & Đãi ngộ
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {previewTarget.benefits.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editorOpen}
        title={formState.id ? 'Cập nhật tin tuyển dụng' : 'Tạo tin tuyển dụng mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {canPublish ? 'Lưu tin tuyển dụng' : 'Lưu về Bản nháp'}
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
              id="jf-title"
              label="Chức danh tuyển dụng"
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
              id="jf-slug"
              label="Đường dẫn Slug"
              value={formState.slug}
              onChange={(e) =>
                setFormState({ ...formState, slug: slugifyVi(e.target.value) })
              }
            />
            <InputField
              id="jf-pos"
              label="Bộ phận chuyên môn"
              value={formState.position}
              onChange={(e) => setFormState({ ...formState, position: e.target.value })}
            />
            <SelectField
              id="jf-type"
              label="Loại hình làm việc"
              value={formState.type}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  type: e.target.value as JobEmploymentType,
                })
              }
              options={JOB_EMPLOYMENT_TYPES.map((typeOption) => ({
                value: typeOption,
                label: typeOption,
              }))}
            />
            <SelectField
              id="jf-branch"
              label="Địa điểm làm việc"
              value={formState.branchId}
              placeholder={branches.length === 0 ? '-- Chưa có cơ sở --' : '-- Chọn cơ sở --'}
              onChange={(e) => {
                const bId = e.target.value
                const found = branches.find((b) => b.id === bId)
                setFormState({
                  ...formState,
                  branchId: bId,
                  branchLabel: found?.name ?? formState.branchLabel,
                })
              }}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <InputField
              id="jf-qty"
              label="Số lượng cần tuyển"
              type="number"
              min={1}
              value={formState.quantity}
              onChange={(e) =>
                setFormState({ ...formState, quantity: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <InputField
              id="jf-salary"
              label="Mức lương hiển thị"
              value={formState.salary}
              onChange={(e) => setFormState({ ...formState, salary: e.target.value })}
            />
            <InputField
              id="jf-deadline"
              label="Hạn nộp hồ sơ"
              type="date"
              value={formState.deadline}
              onChange={(e) => setFormState({ ...formState, deadline: e.target.value })}
            />
            <InputField
              id="jf-email"
              label="Email tiếp nhận CV"
              value={formState.applicationEmail}
              onChange={(e) =>
                setFormState({ ...formState, applicationEmail: e.target.value })
              }
              placeholder="tuyendung@englishcenter.edu.vn"
            />
            <SelectField
              id="jf-status"
              label="Trạng thái"
              value={canPublish ? formState.status : 'draft'}
              disabled={!canPublish}
              onChange={(e) =>
                setFormState({ ...formState, status: e.target.value as JobPostStatus })
              }
              options={[
                { value: 'draft', label: 'Bản nháp' },
                { value: 'published', label: 'Đăng công khai' },
                { value: 'closed', label: 'Đóng nhận hồ sơ' },
                { value: 'archived', label: 'Lưu trữ' },
              ]}
            />
          </div>

          <InputField
            id="jf-image"
            label="Ảnh minh họa tin tuyển dụng (URL tùy chọn)"
            value={formState.image ?? ''}
            onChange={(e) => setFormState({ ...formState, image: e.target.value })}
            placeholder="https://images.unsplash.com/..."
          />

          <InputField
            id="jf-excerpt"
            label="Tóm tắt vị trí hiển thị ở danh sách (Excerpt)"
            value={formState.excerpt}
            onChange={(e) => setFormState({ ...formState, excerpt: e.target.value })}
            placeholder="Nhập 1–2 câu giới thiệu tổng quan vị trí tuyển dụng..."
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Mô tả công việc (Bắt buộc)
              </label>
              <textarea
                rows={3}
                value={descText}
                onChange={(e) => setDescText(e.target.value)}
                className="w-full rounded-xl border border-[#DCEAF3] p-2.5 text-xs outline-none focus:border-[#75BDEB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Yêu cầu ứng viên (Bắt buộc)
              </label>
              <textarea
                rows={3}
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                className="w-full rounded-xl border border-[#DCEAF3] p-2.5 text-xs outline-none focus:border-[#75BDEB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Quyền lợi
              </label>
              <textarea
                rows={3}
                value={benText}
                onChange={(e) => setBenText(e.target.value)}
                className="w-full rounded-xl border border-[#DCEAF3] p-2.5 text-xs outline-none focus:border-[#75BDEB]"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
