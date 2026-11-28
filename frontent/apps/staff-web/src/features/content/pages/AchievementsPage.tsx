import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, EyeOff, Pencil, Plus, ShieldCheck, ShieldOff } from 'lucide-react'
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
} from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { cmsApi, formatAnonymizedStudentName } from '@/features/content/api/cmsApi'
import type {
  AchievementVisibilityStatus,
  ManagedAchievementRecord,
} from '@/features/content/types/cms.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import type { MediaRef } from '@/shared/types/media.types'

const ACHIEVEMENT_STATUS_BADGE: Record<
  AchievementVisibilityStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' }
> = {
  published: { label: 'Đang công khai', tone: 'success' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type AchievementSortKey = 'score_desc' | 'date_desc' | 'name_asc'

const PAGE_SIZE = 6

export function AchievementsPage() {
  useDocumentTitle('Vinh danh học viên')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canPublish = hasPermission(user, 'achievements.publish')

  const [search, setSearch] = useState('')
  const [consentFilter, setConsentFilter] = useState<'ALL' | 'GRANTED' | 'PENDING'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AchievementVisibilityStatus>('ALL')
  const [sortBy, setSortBy] = useState<AchievementSortKey>('score_desc')
  const [page, setPage] = useState(1)

  const [revokeTarget, setRevokeTarget] = useState<ManagedAchievementRecord | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [certMedia, setCertMedia] = useState<MediaRef | null>(null)

  const [formState, setFormState] = useState<
    Omit<ManagedAchievementRecord, 'id' | 'updatedAt'> & { id?: string }
  >({
    slug: '',
    studentFullName: '',
    anonymizeName: false,
    courseId: '',
    courseName: '',
    examYear: Number(getTodayIsoInVietnam().slice(0, 4)),
    listeningScore: 5,
    readingScore: 5,
    totalScore: 10,
    certificateImageUrl: '',
    shareQuote: '',
    publicConsentGranted: false,
    consentNote: '',
    status: 'draft',
    publishedDate: getTodayIsoInVietnam(),
  })

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'cms', 'achievements'],
    queryFn: () => cmsApi.listAchievements(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const saveMutation = useMutation({
    mutationFn: (
      payload: Omit<ManagedAchievementRecord, 'id' | 'updatedAt'> & { id?: string },
    ) => cmsApi.upsertAchievement(payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'achievements'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: 'Đã lưu hồ sơ thành tích học viên',
        description: `${formatAnonymizedStudentName(saved.studentFullName, saved.anonymizeName)} – ${saved.totalScore} TOEIC`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ thành tích.')
    },
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({
      item,
      status,
    }: {
      item: ManagedAchievementRecord
      status: AchievementVisibilityStatus
    }) => cmsApi.upsertAchievement({ ...item, status }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'achievements'] })
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái hồ sơ vinh danh',
        description: `${saved.studentFullName} -> ${ACHIEVEMENT_STATUS_BADGE[saved.status].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Chưa thể đổi trạng thái hồ sơ',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra Consent công khai.',
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      cmsApi.revokeAchievementConsent(
        id,
        'Thu hồi đồng ý công khai theo yêu cầu học viên; tự động ẩn khỏi trang Học viên.',
      ),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'cms', 'achievements'] })
      setRevokeTarget(null)
      notify({
        tone: 'warning',
        title: 'Đã thu hồi đồng ý công khai & gỡ hiển thị',
        description: `Hồ sơ của ${saved.studentFullName} đã chuyển về trạng thái Ẩn.`,
      })
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = items.filter((a) => {
      if (consentFilter === 'GRANTED' && !a.publicConsentGranted) return false
      if (consentFilter === 'PENDING' && a.publicConsentGranted) return false
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(a.studentFullName, search) ||
          matchText(a.courseName, search) ||
          matchText(String(a.totalScore), search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc') return a.studentFullName.localeCompare(b.studentFullName, 'vi')
      if (sortBy === 'date_desc') return b.publishedDate.localeCompare(a.publishedDate)
      return b.totalScore - a.totalScore
    })
  }, [items, consentFilter, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  const openCreate = () => {
    const today = getTodayIsoInVietnam()
    setFormError(null)
    setCertMedia(null)
    setFormState({
      slug: '',
      studentFullName: '',
      anonymizeName: false,
      courseId: courses[0]?.id ?? '',
      courseName: courses[0]?.name ?? '',
      examYear: Number(today.slice(0, 4)),
      listeningScore: 5,
      readingScore: 5,
      totalScore: 10,
      certificateImageUrl: '',
      shareQuote: '',
      publicConsentGranted: false,
      consentNote: '',
      status: 'draft',
      publishedDate: today,
    })
    setEditorOpen(true)
  }

  const openEdit = (item: ManagedAchievementRecord) => {
    setFormError(null)
    setCertMedia(
      item.certificateImageUrl
        ? {
            id: `cert-${item.id}`,
            kind: 'image',
            fileName: `${item.slug}.jpg`,
            mimeType: 'image/jpeg',
            url: item.certificateImageUrl,
            status: 'ready',
          }
        : null,
    )
    setFormState({
      id: item.id,
      slug: item.slug,
      studentFullName: item.studentFullName,
      anonymizeName: item.anonymizeName,
      courseId: item.courseId,
      courseName: item.courseName,
      examYear: item.examYear,
      listeningScore: item.listeningScore,
      readingScore: item.readingScore,
      totalScore: item.totalScore,
      certificateImageUrl: item.certificateImageUrl,
      shareQuote: item.shareQuote,
      publicConsentGranted: item.publicConsentGranted,
      consentNote: item.consentNote,
      status: canPublish ? item.status : 'draft',
      publishedDate: item.publishedDate,
    })
    setEditorOpen(true)
  }

  const handleSave = () => {
    const normalizedSlug = slugifyVi(formState.slug || formState.studentFullName)
    if (!formState.studentFullName.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      setFormError('Vui lòng nhập Họ tên học viên và Đường dẫn Slug hợp lệ.')
      return
    }
    if (!formState.courseId.trim()) {
      setFormError('Vui lòng chọn khóa học đã theo học.')
      return
    }
    if (
      items.some(
        (a) => a.id !== formState.id && a.slug.trim().toLowerCase() === normalizedSlug,
      )
    ) {
      setFormError(`Slug bài vinh danh "${normalizedSlug}" đã tồn tại.`)
      return
    }
    if (
      formState.listeningScore < 5 ||
      formState.listeningScore > 495 ||
      formState.listeningScore % 5 !== 0 ||
      formState.readingScore < 5 ||
      formState.readingScore > 495 ||
      formState.readingScore % 5 !== 0
    ) {
      setFormError(
        'Điểm Listening và Reading TOEIC phải nằm trong khoảng 5–495 và là bội số của 5 (chia hết cho 5).',
      )
      return
    }
    if (formState.publicConsentGranted && !formState.consentNote.trim()) {
      setFormError(
        'Vui lòng nhập Ghi chú căn cứ đồng ý công khai (VD: email/phiếu xác nhận) khi bật Consent.',
      )
      return
    }

    const effectiveStatus: AchievementVisibilityStatus = canPublish ? formState.status : 'draft'
    if (effectiveStatus === 'published' && !formState.publicConsentGranted) {
      setFormError(
        'Bắt buộc xác nhận "Đã có sự đồng ý công khai của học viên" trước khi chuyển sang trạng thái Xuất bản.',
      )
      return
    }

    const totalScore = formState.listeningScore + formState.readingScore
    saveMutation.mutate({
      ...formState,
      slug: normalizedSlug,
      status: effectiveStatus,
      totalScore,
      publishedDate: formState.publishedDate || getTodayIsoInVietnam(),
      certificateImageUrl: certMedia?.url ?? '',
    })
  }

  if (isLoading) return <LoadingBlock label="Đang tải bảng vàng học viên..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách thành tích học viên."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vinh danh Thành tích Học viên"
        description="Quản lý bảng vàng điểm số TOEIC và trạng thái đồng ý công khai của học viên."
        badge={<Badge tone="info">{items.length} hồ sơ</Badge>}
        actions={
          <ActionGuard permission="achievements.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Thêm thành tích mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="lg:col-span-3 xl:col-span-2">
          <InputField
            id="ach-search"
            label="Tìm kiếm học viên"
            placeholder="Nhập họ tên học viên, khóa học hoặc mức điểm TOEIC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="ach-consent"
          label="Đồng ý công khai"
          value={consentFilter}
          onChange={(e) => {
            setConsentFilter(e.target.value as 'ALL' | 'GRANTED' | 'PENDING')
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả hồ sơ' },
            { value: 'GRANTED', label: 'Đã có Consent' },
            { value: 'PENDING', label: 'Chưa có / Đã thu hồi' },
          ]}
        />
        <SelectField
          id="ach-status-filter"
          label="Trạng thái hiển thị"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | AchievementVisibilityStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'published', label: 'Đang công khai' },
            { value: 'draft', label: 'Bản nháp' },
            { value: 'hidden', label: 'Đang ẩn' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
        />
        <SelectField
          id="ach-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as AchievementSortKey)
            setPage(1)
          }}
          options={[
            { value: 'score_desc', label: 'Tổng điểm cao nhất' },
            { value: 'date_desc', label: 'Ngày đăng mới nhất' },
            { value: 'name_asc', label: 'Họ tên A -> Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Chưa có hồ sơ thành tích phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[200px]">
                    Tên công khai & Khóa học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Điểm TOEIC xác minh
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Đồng ý công khai
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái & Ngày đăng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((item) => {
                  const publicName = formatAnonymizedStudentName(
                    item.studentFullName,
                    item.anonymizeName,
                  )
                  const st = ACHIEVEMENT_STATUS_BADGE[item.status]
                  return (
                    <DataTableRow key={item.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">
                          {publicName}
                          {item.anonymizeName && (
                            <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                              (Ẩn danh một phần)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {item.courseName} • Năm thi {item.examYear}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <span className="text-base font-black text-[#F26522]">
                          {item.totalScore}/990
                        </span>
                        <p className="text-xs text-[#64748B]">
                          LC {item.listeningScore} • RC {item.readingScore}
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1">
                          {item.publicConsentGranted ? (
                            <Badge tone="success">
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Đã đồng ý công khai
                            </Badge>
                          ) : (
                            <Badge tone="danger">
                              <ShieldOff className="mr-1 h-3.5 w-3.5" />
                              Chưa có Consent (Khóa đăng)
                            </Badge>
                          )}
                          <p className="max-w-xs truncate text-[11px] text-[#64748B]">
                            {item.consentNote}
                          </p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          <p className="text-[11px] text-[#64748B]">{item.publishedDate}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <ActionGuard permission="achievements.update">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>

                          <ActionGuard permission="achievements.publish">
                            {item.status !== 'published' && item.publicConsentGranted && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Công khai trên Website"
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
                                title="Tạm ẩn"
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
                                title="Lưu trữ"
                                onClick={() =>
                                  quickStatusMutation.mutate({ item, status: 'archived' })
                                }
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {item.publicConsentGranted && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setRevokeTarget(item)}
                              >
                                Thu hồi Consent
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

      <Modal
        open={editorOpen}
        title={formState.id ? 'Cập nhật hồ sơ vinh danh' : 'Thêm hồ sơ thành tích học viên'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {canPublish ? 'Lưu hồ sơ' : 'Lưu về Bản nháp'}
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
              id="af-name"
              label="Họ tên học viên"
              value={formState.studentFullName}
              onChange={(e) => {
                const name = e.target.value
                setFormState({
                  ...formState,
                  studentFullName: name,
                  slug: formState.id
                    ? formState.slug
                    : slugifyVi(
                        `${name}-${formState.listeningScore + formState.readingScore}-toeic`,
                      ),
                })
              }}
            />
            <InputField
              id="af-slug"
              label="Slug bài vinh danh"
              value={formState.slug}
              onChange={(e) =>
                setFormState({ ...formState, slug: slugifyVi(e.target.value) })
              }
            />
            <SelectField
              id="af-course"
              label="Khóa học đã theo học"
              value={formState.courseId}
              placeholder={courses.length === 0 ? '-- Chưa có khóa học --' : '-- Chọn khóa học --'}
              onChange={(e) => {
                const cId = e.target.value
                const found = courses.find((c) => c.id === cId)
                setFormState({
                  ...formState,
                  courseId: cId,
                  courseName: found?.name ?? formState.courseName,
                })
              }}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
            <InputField
              id="af-year"
              label="Năm dự thi"
              type="number"
              min={2020}
              max={2035}
              value={formState.examYear}
              onChange={(e) =>
                setFormState({ ...formState, examYear: Number(e.target.value) || 2026 })
              }
            />
            <InputField
              id="af-lc"
              label="Điểm Listening (5 – 495, bội số của 5)"
              type="number"
              min={5}
              max={495}
              step={5}
              value={formState.listeningScore}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  listeningScore: Math.min(495, Math.max(5, Number(e.target.value) || 5)),
                })
              }
            />
            <InputField
              id="af-rc"
              label="Điểm Reading (5 – 495, bội số của 5)"
              type="number"
              min={5}
              max={495}
              step={5}
              value={formState.readingScore}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  readingScore: Math.min(495, Math.max(5, Number(e.target.value) || 5)),
                })
              }
            />
          </div>

          <div className="rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3.5 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-bold text-[#243B53]">
              <input
                type="checkbox"
                checked={formState.anonymizeName}
                onChange={(e) =>
                  setFormState({ ...formState, anonymizeName: e.target.checked })
                }
              />
              <span>
                Viết tắt ẩn danh tên học viên khi hiển thị công khai:{' '}
                <strong className="text-[#2878B8]">
                  {formatAnonymizedStudentName(
                    formState.studentFullName || 'Nguyễn Minh Anh',
                    formState.anonymizeName,
                  )}
                </strong>
              </span>
            </label>

            <label className="mt-2.5 flex cursor-pointer items-center gap-2 font-bold text-[#1F7A4C]">
              <input
                type="checkbox"
                checked={formState.publicConsentGranted}
                onChange={(e) => {
                  const granted = e.target.checked
                  setFormState({
                    ...formState,
                    publicConsentGranted: granted,
                    status: !granted && formState.status === 'published' ? 'draft' : formState.status,
                  })
                }}
              />
              <span>
                Xác nhận đã có sự đồng ý công khai bằng văn bản/email của học viên (Bắt buộc để Xuất
                bản)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <InputField
                id="af-note"
                label={
                  formState.publicConsentGranted
                    ? 'Ghi chú căn cứ đồng ý công khai (Bắt buộc)'
                    : 'Ghi chú trạng thái đồng ý công khai'
                }
                value={formState.consentNote}
                onChange={(e) => setFormState({ ...formState, consentNote: e.target.value })}
                placeholder="VD: Email xác nhận ngày 20/11/2026..."
              />
            </div>
            <InputField
              id="af-pubdate"
              label="Ngày vinh danh"
              type="date"
              value={formState.publishedDate}
              onChange={(e) => setFormState({ ...formState, publishedDate: e.target.value })}
            />
            <div className="sm:col-span-3">
              <SelectField
                id="af-status"
                label="Trạng thái xuất bản"
                value={canPublish ? formState.status : 'draft'}
                disabled={!canPublish}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    status: e.target.value as AchievementVisibilityStatus,
                  })
                }
                options={[
                  { value: 'draft', label: 'Bản nháp' },
                  {
                    value: 'published',
                    label: formState.publicConsentGranted
                      ? 'Công khai trên Website'
                      : 'Công khai (Bị khóa do chưa có Consent)',
                  },
                  { value: 'hidden', label: 'Đang ẩn' },
                  { value: 'archived', label: 'Lưu trữ' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
              Cảm nhận / Chia sẻ kinh nghiệm học viên
            </label>
            <textarea
              rows={2}
              value={formState.shareQuote}
              onChange={(e) => setFormState({ ...formState, shareQuote: e.target.value })}
              className="w-full rounded-xl border border-[#DCEAF3] p-3 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <MediaUploadBox
            label="Ảnh phiếu điểm / Học viên vinh danh"
            kind="image"
            value={certMedia}
            onChange={setCertMedia}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Thu hồi sự đồng ý công khai"
        description={
          revokeTarget ? (
            <>
              Xác nhận thu hồi đồng ý công khai của học viên{' '}
              <strong>{revokeTarget.studentFullName}</strong>? Hồ sơ sẽ được chuyển sang trạng thái
              Ẩn trên Website ngay lập tức.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Xác nhận thu hồi & Ẩn ngay"
        variant="danger"
        loading={revokeMutation.isPending}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id)
        }}
      />
    </div>
  )
}
