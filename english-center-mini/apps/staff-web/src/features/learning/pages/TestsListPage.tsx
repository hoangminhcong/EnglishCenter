import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Copy, Eye, EyeOff, FileEdit, Plus, RotateCcw } from 'lucide-react'
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
import { TEST_DIFFICULTIES, type TestDifficulty } from '@english-center/contracts'
import { matchText, paginate, slugifyVi } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  countTestQuestions,
  testAuthoringApi,
  validateTestBeforePublish,
} from '@/features/learning/api/testAuthoringApi'
import { TestPreviewModal } from '@/features/learning/components/TestPreviewModal'
import type {
  AuthoringTestStatus,
  AuthoringTestType,
  ManagedToeicTestRecord,
} from '@/features/learning/types/testAuthoring.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

const STATUS_BADGE: Record<
  AuthoringTestStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  published: { label: 'Đã xuất bản', tone: 'success' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type TestSortKey = 'updated_desc' | 'attempts_desc' | 'title_asc' | 'code_asc'

const PAGE_SIZE = 6

export function TestsListPage() {
  useDocumentTitle('Ngân hàng đề Test Online')
  const { user } = useStaffAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canUpdate = hasPermission(user, 'tests.update')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AuthoringTestStatus>('ALL')
  const [sortBy, setSortBy] = useState<TestSortKey>('updated_desc')
  const [page, setPage] = useState(1)
  const [previewTarget, setPreviewTarget] = useState<ManagedToeicTestRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [newForm, setNewForm] = useState<{
    code: string
    title: string
    slug: string
    testType: AuthoringTestType
    durationMinutes: number
    collectionGroup: string
    difficulty: TestDifficulty
  }>({
    code: '',
    title: '',
    slug: '',
    testType: 'Full Test 7 Parts',
    durationMinutes: 120,
    collectionGroup: '',
    difficulty: TEST_DIFFICULTIES[0] ?? 'Cơ bản (350+)',
  })

  const { data: tests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'learning', 'tests'],
    queryFn: () => testAuthoringApi.listTests(),
  })

  const createMutation = useMutation({
    mutationFn: () => testAuthoringApi.createDraftTest(newForm),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      setCreateOpen(false)
      notify({
        tone: 'success',
        title: 'Đã khởi tạo đề thi TOEIC nháp',
        description: `${created.title} (${created.code})`,
      })
      navigate(`/learning/tests/${created.id}`)
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo đề thi.')
    },
  })

  const cloneMutation = useMutation({
    mutationFn: (id: string) => testAuthoringApi.cloneTest(id),
    onSuccess: (cloned) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      notify({
        tone: 'success',
        title: 'Đã nhân bản đề thi sang bản nháp mới (ID mới độc lập)',
        description: `${cloned.title} (${cloned.code})`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể nhân bản đề thi',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AuthoringTestStatus }) =>
      testAuthoringApi.setTestStatus(id, status),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái đề thi',
        description: `${saved.title} -> ${STATUS_BADGE[saved.status].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Chưa thể đổi trạng thái đề thi',
        description: err instanceof Error ? err.message : 'Vui lòng mở màn hình kiểm định đề.',
      })
    },
  })

  const sortedFiltered = useMemo(() => {
    const filtered = tests.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(t.title, search) ||
          matchText(t.code, search) ||
          matchText(t.collectionGroup, search)
        )
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'attempts_desc') return b.attemptsCount - a.attemptsCount
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi')
      if (sortBy === 'code_asc') return a.code.localeCompare(b.code, 'vi')
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [tests, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(sortedFiltered, page, PAGE_SIZE),
    [sortedFiltered, page],
  )

  if (isLoading) return <LoadingBlock label="Đang tải ngân hàng đề Test Online..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách đề thi."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ngân hàng Đề thi TOEIC"
        description="Quản lý cấu trúc đề thi TOEIC Part 1–7, kiểm định và phát hành phiên bản."
        badge={<Badge tone="info">{tests.length} đề thi</Badge>}
        actions={
          <ActionGuard permission="tests.create">
            <Button
              onClick={() => {
                setCreateError(null)
                setNewForm({
                  code: '',
                  title: '',
                  slug: '',
                  testType: 'Full Test 7 Parts',
                  durationMinutes: 120,
                  collectionGroup: '',
                  difficulty: TEST_DIFFICULTIES[0] ?? 'Cơ bản (350+)',
                })
                setCreateOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Tạo đề thi L&R mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="tst-search"
            label="Tìm kiếm đề thi"
            placeholder="Nhập mã đề ETS-2026-T01, tên đề hoặc bộ sưu tập..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="tst-status"
          label="Trạng thái phát hành"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | AuthoringTestStatus)
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
          id="tst-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as TestSortKey)
            setPage(1)
          }}
          options={[
            { value: 'updated_desc', label: 'Mới cập nhật nhất' },
            { value: 'attempts_desc', label: 'Lượt thi cao nhất' },
            { value: 'title_asc', label: 'Tên đề A -> Z' },
            { value: 'code_asc', label: 'Mã đề A -> Z' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không tìm thấy đề thi phù hợp" />
      ) : (
        <div className="space-y-3">
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[200px]">
                    Mã & Tên đề thi
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[200px]">
                    Loại đề & Phiên bản
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Kiểm định câu hỏi
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Lượt thi</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((test) => {
                  const qCount = countTestQuestions(test.parts)
                  const check = validateTestBeforePublish(test, tests)
                  const st = STATUS_BADGE[test.status]
                  return (
                    <DataTableRow key={test.id}>
                      <DataTableCell>
                        <p className="font-bold text-[#243B53]">{test.title}</p>
                        <p className="text-xs text-[#64748B]">
                          Mã: <strong className="whitespace-nowrap">{test.code}</strong> • Bộ:{' '}
                          {test.collectionGroup}
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone="info">v{test.activeVersionNumber}</Badge>
                            {test.workingDraft && (
                              <Badge tone="warning">Nháp v{test.workingDraft.versionNumber}</Badge>
                            )}
                            <span className="text-xs font-semibold whitespace-nowrap text-[#243B53]">
                              {test.testType}
                            </span>
                          </div>
                          <p className="text-xs whitespace-nowrap text-[#64748B]">
                            {test.durationMinutes} phút • {test.difficulty}
                          </p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <p className="text-xs font-bold text-[#243B53]">
                            {qCount} câu đang áp dụng
                          </p>
                          {check.errors.length > 0 ? (
                            <Badge tone="danger">{check.errors.length} lỗi chặn xuất bản</Badge>
                          ) : (
                            <Badge tone="success">Đạt chuẩn xuất bản</Badge>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-xs font-semibold whitespace-nowrap">
                        {test.attemptsCount.toLocaleString('vi-VN')}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTarget(test)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem thử</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/learning/tests/${test.id}`)}
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                            <span>{canUpdate ? 'Soạn thảo' : 'Chi tiết'}</span>
                          </Button>

                          <ActionGuard permission="tests.create">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Nhân bản đề thi"
                              onClick={() => cloneMutation.mutate(test.id)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </ActionGuard>

                          <ActionGuard permission="tests.publish">
                            {test.status === 'published' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Tạm ẩn đề thi khỏi Website"
                                onClick={() =>
                                  statusMutation.mutate({ id: test.id, status: 'hidden' })
                                }
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {(test.status === 'hidden' || test.status === 'archived') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Khôi phục xuất bản"
                                onClick={() =>
                                  statusMutation.mutate({ id: test.id, status: 'published' })
                                }
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {test.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Lưu trữ đề thi"
                                onClick={() =>
                                  statusMutation.mutate({ id: test.id, status: 'archived' })
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

      {/* Modal Tạo đề mới */}
      <Modal
        open={createOpen}
        title="Khởi tạo Đề thi TOEIC mới"
        onClose={() => setCreateOpen(false)}
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={createMutation.isPending}
              disabled={!newForm.code.trim() || !newForm.title.trim() || !newForm.slug.trim()}
              onClick={() => createMutation.mutate()}
            >
              Khởi tạo & Mở trình soạn thảo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              label="Mã đề thi *"
              placeholder="VD: TOEIC-2026-T01"
              value={newForm.code}
              onChange={(e) => setNewForm({ ...newForm, code: e.target.value })}
            />
            <InputField
              label="Đường dẫn Slug *"
              placeholder="toeic-test-01"
              value={newForm.slug}
              onChange={(e) => setNewForm({ ...newForm, slug: slugifyVi(e.target.value) })}
            />
            <div className="sm:col-span-2">
              <InputField
                label="Tên đề thi hiển thị *"
                placeholder="Nhập tên đề thi"
                value={newForm.title}
                onChange={(e) => {
                  const title = e.target.value
                  setNewForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug ? prev.slug : slugifyVi(title),
                  }))
                }}
              />
            </div>
            <SelectField
              label="Loại cấu trúc đề"
              value={newForm.testType}
              onChange={(e) =>
                setNewForm({
                  ...newForm,
                  testType: e.target.value as AuthoringTestType,
                  durationMinutes: e.target.value === 'Full Test 7 Parts' ? 120 : 60,
                })
              }
              options={[
                { value: 'Full Test 7 Parts', label: 'Full Test 7 Parts (120 phút)' },
                { value: 'Mini Test', label: 'Mini Test rút gọn (45–60 phút)' },
                { value: 'Luyện chuyên sâu', label: 'Luyện chuyên sâu theo nhóm Part' },
              ]}
            />
            <InputField
              label="Thời gian làm bài (Phút)"
              type="number"
              min={5}
              max={180}
              value={newForm.durationMinutes}
              onChange={(e) =>
                setNewForm({
                  ...newForm,
                  durationMinutes: Math.max(5, Number(e.target.value) || 60),
                })
              }
            />
            <InputField
              label="Bộ sưu tập"
              placeholder="VD: Bộ đề luyện thi"
              value={newForm.collectionGroup}
              onChange={(e) => setNewForm({ ...newForm, collectionGroup: e.target.value })}
            />
            <SelectField
              label="Mức độ khó"
              value={newForm.difficulty}
              onChange={(e) =>
                setNewForm({ ...newForm, difficulty: e.target.value as TestDifficulty })
              }
              options={TEST_DIFFICULTIES.map((d) => ({ value: d, label: d }))}
            />
          </div>
        </div>
      </Modal>

      <TestPreviewModal
        open={Boolean(previewTarget)}
        test={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  )
}
