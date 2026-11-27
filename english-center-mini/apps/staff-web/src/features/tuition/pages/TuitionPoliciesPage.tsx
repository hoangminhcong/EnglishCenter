import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, History, Pencil, Plus } from 'lucide-react'
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
import { formatDateTimeVi, formatVnd, matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { calculateNetTuition, tuitionApi } from '@/features/tuition/api/tuitionApi'
import type {
  TuitionPolicyRecord,
  TuitionPolicyStatus,
  UpsertTuitionPolicyInput,
} from '@/features/tuition/types/tuition.types'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'

const POLICY_STATUS_META: Record<
  TuitionPolicyStatus,
  { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' }
> = {
  active: { label: 'Đang hiệu lực', tone: 'success' },
  draft: { label: 'Dự thảo', tone: 'info' },
  expired: { label: 'Hết hiệu lực', tone: 'warning' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

type PolicySortKey = 'updated_desc' | 'net_asc' | 'net_desc'

export function TuitionPoliciesPage() {
  useDocumentTitle('Chính sách học phí')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | TuitionPolicyStatus>('ALL')
  const [sortBy, setSortBy] = useState<PolicySortKey>('updated_desc')
  const [page, setPage] = useState(1)
  const [historyTarget, setHistoryTarget] = useState<TuitionPolicyRecord | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<TuitionPolicyRecord | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formState, setFormState] = useState<UpsertTuitionPolicyInput>({
    policyCode: '',
    courseId: '',
    courseName: '',
    listedTuitionVnd: 0,
    discountProgramName: '',
    discountPercent: 0,
    discountFixedVnd: 0,
    effectiveFrom: todayYmdVn,
    effectiveTo: null,
    status: 'draft',
    applicabilityNote: '',
    changeReason: '',
  })

  const { data: policies = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'tuition-policies'],
    queryFn: () => tuitionApi.listPolicies(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const actorLabel = user ? `${user.fullName} (${user.employeeCode})` : 'Quản trị viên'

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertTuitionPolicyInput) =>
      tuitionApi.upsertPolicy(payload, actorLabel),
    onSuccess: (saved, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'tuition-policies'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sales'] })
      setEditorOpen(false)
      notify({
        tone: 'success',
        title: vars.id ? 'Đã cập nhật chính sách học phí' : 'Đã ban hành chính sách học phí mới',
        description: `${saved.policyCode} – ${saved.courseName}`,
      })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu chính sách học phí.')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => tuitionApi.setPolicyStatus(id, 'archived', actorLabel),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'tuition-policies'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] })
      setArchiveTarget(null)
      notify({
        tone: 'info',
        title: 'Đã chuyển chính sách vào kho lưu trữ',
        description: saved.policyCode,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu trữ chính sách',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const filteredAndSorted = useMemo(() => {
    const list = policies.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(p.policyCode, search) ||
          matchText(p.courseName, search) ||
          matchText(p.discountProgramName, search)
        )
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'net_asc') return a.netTuitionVnd - b.netTuitionVnd
      if (sortBy === 'net_desc') return b.netTuitionVnd - a.netTuitionVnd
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [policies, statusFilter, search, sortBy])

  const paginated = useMemo(
    () => paginate(filteredAndSorted, page, 8),
    [filteredAndSorted, page],
  )

  const openCreateModal = () => {
    const firstCourse = courses[0]
    setFormError(null)
    setFormState({
      policyCode: '',
      courseId: firstCourse?.id ?? '',
      courseName: firstCourse?.name ?? '',
      listedTuitionVnd: firstCourse?.listedTuitionVnd ?? 0,
      discountProgramName: '',
      discountPercent: 0,
      discountFixedVnd: 0,
      effectiveFrom: todayYmdVn,
      effectiveTo: null,
      status: 'draft',
      applicabilityNote: '',
      changeReason: '',
    })
    setEditorOpen(true)
  }

  const openEditModal = (policy: TuitionPolicyRecord) => {
    setFormError(null)
    setFormState({
      id: policy.id,
      policyCode: policy.policyCode,
      courseId: policy.courseId,
      courseName: policy.courseName,
      listedTuitionVnd: policy.listedTuitionVnd,
      discountProgramName: policy.discountProgramName,
      discountPercent: policy.discountPercent,
      discountFixedVnd: policy.discountFixedVnd,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
      status: policy.status,
      applicabilityNote: policy.applicabilityNote,
      changeReason: '',
    })
    setEditorOpen(true)
  }

  const previewNet = calculateNetTuition(
    formState.listedTuitionVnd,
    formState.discountPercent,
    formState.discountFixedVnd,
  )

  if (isLoading) return <LoadingBlock label="Đang tải chính sách học phí..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách chính sách học phí."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chính sách Học phí & Ưu đãi"
        description="Quản lý bảng giá niêm yết, chương trình ưu đãi và thời hạn áp dụng theo từng khóa học."
        badge={<Badge tone="info">{policies.length} chính sách</Badge>}
        actions={
          <ActionGuard permission="tuition.create">
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Ban hành chính sách mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <InputField
            id="tp-search"
            label="Tìm kiếm chính sách"
            placeholder="Nhập mã chính sách, tên khóa học hoặc tên chương trình ưu đãi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SelectField
          id="tp-status"
          label="Trạng thái hiệu lực"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | TuitionPolicyStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Đang hiệu lực' },
            { value: 'draft', label: 'Dự thảo' },
            { value: 'expired', label: 'Hết hiệu lực' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
        />
        <SelectField
          id="tp-sort"
          label="Sắp xếp"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as PolicySortKey)}
          options={[
            { value: 'updated_desc', label: 'Cập nhật mới nhất' },
            { value: 'net_asc', label: 'Mức sau ưu đãi tăng dần' },
            { value: 'net_desc', label: 'Mức sau ưu đãi giảm dần' },
          ]}
        />
      </div>

      {paginated.items.length === 0 ? (
        <EmptyBlock title="Không có chính sách học phí phù hợp" />
      ) : (
        <>
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[200px]">
                    Mã chính sách & Khóa học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Học phí niêm yết
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[180px]">
                    Chương trình ưu đãi
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mức áp dụng sau ưu đãi
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Thời gian hiệu lực
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {paginated.items.map((policy) => {
                  const st = POLICY_STATUS_META[policy.status]
                  return (
                    <DataTableRow key={policy.id}>
                      <DataTableCell>
                        <p className="font-bold whitespace-nowrap text-[#243B53]">
                          {policy.policyCode}
                        </p>
                        <p className="text-xs text-[#64748B]">{policy.courseName}</p>
                      </DataTableCell>
                      <DataTableCell className="font-semibold whitespace-nowrap">
                        {formatVnd(policy.listedTuitionVnd)}
                      </DataTableCell>
                      <DataTableCell>
                        <p className="font-medium text-[#243B53]">
                          {policy.discountProgramName || 'Không áp dụng giảm giá'}
                        </p>
                        <p className="text-xs whitespace-nowrap text-[#64748B]">
                          {policy.discountPercent > 0 ? `-${policy.discountPercent}% ` : ''}
                          {policy.discountFixedVnd > 0
                            ? `-${formatVnd(policy.discountFixedVnd)}`
                            : ''}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <span className="font-extrabold text-[#1F7A4C]">
                          {formatVnd(policy.netTuitionVnd)}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <span className="font-semibold text-[#243B53]">{policy.effectiveFrom}</span>
                        {' → '}
                        <span>{policy.effectiveTo ?? 'Không thời hạn'}</span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryTarget(policy)}
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Lịch sử ({policy.history.length})</span>
                          </Button>
                          <ActionGuard permission="tuition.update">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditModal(policy)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </Button>
                          </ActionGuard>
                          {policy.status !== 'archived' && (
                            <ActionGuard permission="tuition.update">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Lưu trữ chính sách học phí"
                                aria-label={`Lưu trữ chính sách ${policy.policyCode}`}
                                onClick={() => setArchiveTarget(policy)}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </ActionGuard>
                          )}
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

      {/* Modal Lịch sử phiên bản chính sách */}
      <Modal
        open={Boolean(historyTarget)}
        title={`Lịch sử thay đổi – ${historyTarget?.policyCode ?? ''}`}
        onClose={() => setHistoryTarget(null)}
        maxWidthClassName="max-w-xl"
      >
        {historyTarget && (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-[#F5FAFE] p-3 text-xs text-[#64748B]">
              <strong>Điều kiện áp dụng:</strong>{' '}
              {historyTarget.applicabilityNote || 'Áp dụng cho học viên đăng ký mới.'}
            </p>
            {historyTarget.history.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-[#DCEAF3] bg-white p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="info">Phiên bản v{h.versionNumber}</Badge>
                  <span className="text-xs text-[#64748B]">{formatDateTimeVi(h.changedAt)}</span>
                </div>
                <p className="mt-2 font-semibold text-[#243B53]">{h.note}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Niêm yết: <strong>{formatVnd(h.listedTuitionVnd)}</strong> • Áp dụng sau ưu đãi:{' '}
                  <strong className="text-[#1F7A4C]">{formatVnd(h.netTuitionVnd)}</strong> • Thực
                  hiện bởi: {h.changedBy}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal Tạo / Sửa chính sách */}
      <Modal
        open={editorOpen}
        title={formState.id ? 'Cập nhật chính sách học phí' : 'Ban hành chính sách học phí mới'}
        onClose={() => setEditorOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={upsertMutation.isPending}
              onClick={() => {
                if (!formState.policyCode.trim()) {
                  setFormError('Vui lòng nhập mã chính sách.')
                  return
                }
                if (!formState.courseId.trim()) {
                  setFormError('Vui lòng chọn khóa học áp dụng.')
                  return
                }
                if (!formState.effectiveFrom.trim()) {
                  setFormError('Vui lòng chọn ngày bắt đầu hiệu lực.')
                  return
                }
                upsertMutation.mutate(formState)
              }}
            >
              Lưu chính sách
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
              id="tp-code"
              label="Mã chính sách *"
              placeholder="VD: HP-2026-01"
              value={formState.policyCode}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, policyCode: e.target.value }))
              }
            />
            <SelectField
              id="tp-course"
              label="Khóa học áp dụng *"
              value={formState.courseId}
              placeholder={
                courses.length === 0 ? '-- Chưa có khóa học --' : '-- Chọn khóa học --'
              }
              onChange={(e) => {
                const cId = e.target.value
                const found = courses.find((c) => c.id === cId)
                setFormState((prev) => ({
                  ...prev,
                  courseId: cId,
                  courseName: found?.name ?? prev.courseName,
                  listedTuitionVnd: found?.listedTuitionVnd ?? prev.listedTuitionVnd,
                }))
              }}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
            <InputField
              id="tp-listed"
              label="Học phí niêm yết (VNĐ) *"
              type="number"
              min={1}
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
              id="tp-prog"
              label="Tên chương trình ưu đãi"
              value={formState.discountProgramName}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, discountProgramName: e.target.value }))
              }
            />
            <InputField
              id="tp-pct"
              label="Mức giảm theo tỷ lệ (%)"
              type="number"
              min={0}
              max={100}
              value={formState.discountPercent}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                }))
              }
            />
            <InputField
              id="tp-fix"
              label="Giảm trừ trực tiếp thêm (VNĐ)"
              type="number"
              min={0}
              step={50000}
              value={formState.discountFixedVnd}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  discountFixedVnd: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <InputField
              id="tp-from"
              label="Hiệu lực từ ngày *"
              type="date"
              value={formState.effectiveFrom}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, effectiveFrom: e.target.value }))
              }
            />
            <InputField
              id="tp-to"
              label="Hiệu lực đến ngày"
              type="date"
              value={formState.effectiveTo ?? ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  effectiveTo: e.target.value || null,
                }))
              }
            />
            <SelectField
              id="tp-st"
              label="Trạng thái"
              value={formState.status}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  status: e.target.value as TuitionPolicyStatus,
                }))
              }
              options={[
                { value: 'draft', label: 'Dự thảo' },
                { value: 'active', label: 'Đang hiệu lực' },
                { value: 'expired', label: 'Hết hiệu lực' },
                { value: 'archived', label: 'Lưu trữ' },
              ]}
            />
            <InputField
              id="tp-reason"
              label="Lý do ban hành / cập nhật"
              value={formState.changeReason}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, changeReason: e.target.value }))
              }
              placeholder="Ghi vào nhật ký phiên bản..."
            />
          </div>

          <div>
            <label
              htmlFor="tp-app-note"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
            >
              Điều kiện & Ghi chú áp dụng chính sách
            </label>
            <textarea
              id="tp-app-note"
              rows={2}
              value={formState.applicabilityNote}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, applicabilityNote: e.target.value }))
              }
              placeholder="VD: Áp dụng kèm thẻ sinh viên chính quy còn hạn hoặc đăng ký sớm trước khai giảng..."
              className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
            />
          </div>

          <div className="rounded-xl border border-[#A7F3D0] bg-[#E3F5EC]/60 p-3.5 text-sm">
            Mức học phí chuẩn sau ưu đãi dự kiến:{' '}
            <strong className="text-base font-extrabold text-[#1F7A4C]">
              {formatVnd(previewNet)}
            </strong>{' '}
            <span className="text-xs text-[#475569]">
              (Chỉ áp dụng cho ghi danh mới, giữ nguyên học phí đã chốt của các lớp trước đó)
            </span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Lưu trữ chính sách học phí"
        description={
          archiveTarget
            ? `Chuyển chính sách ${archiveTarget.policyCode} vào trạng thái Lưu trữ? Lịch sử phiên bản vẫn được giữ nguyên để đối soát.`
            : ''
        }
        loading={archiveMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate(archiveTarget.id)
        }}
      />
    </div>
  )
}
