import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CreditCard, Eye, Plus } from 'lucide-react'
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
import type { AccountingReceivableStatus } from '@english-center/contracts'
import { formatDate, formatVnd, matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { accountingApi } from '@/features/accounting/services/accountingApi'
import {
  ACCOUNTING_QUERY_KEYS,
  useAccountingActor,
} from '@/features/accounting/hooks/useAccounting'
import {
  RECEIVABLE_STATUS_META,
  type EnrichedReceivableItem,
} from '@/features/accounting/types/accounting.types'

export function AccountingReceivablesPage() {
  useDocumentTitle('Khoản phải thu & công nợ')
  const actor = useAccountingActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountingReceivableStatus>('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [discountReason, setDiscountReason] = useState('')
  const [dueDateInput, setDueDateInput] = useState(todayYmdVn)
  const [noteInput, setNoteInput] = useState('')

  const [cancelTarget, setCancelTarget] = useState<EnrichedReceivableItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const {
    data: receivables = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.receivables(todayYmdVn),
    queryFn: () => accountingApi.listReceivables(todayYmdVn),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data: unbilled = [] } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.unbilledEnrollments(),
    queryFn: () => accountingApi.listUnbilledEnrollments(),
  })

  const filtered = useMemo(() => {
    return receivables.filter((r) => {
      if (statusFilter !== 'ALL' && r.derivedStatus !== statusFilter) return false
      if (courseFilter !== 'ALL' && r.courseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && r.branchId !== branchFilter) return false
      if (search.trim()) {
        return (
          matchText(r.receivableCode, search) ||
          matchText(r.studentName, search) ||
          matchText(r.studentCode, search) ||
          matchText(r.studentPhone, search) ||
          matchText(r.classCode, search)
        )
      }
      return true
    })
  }, [receivables, statusFilter, courseFilter, branchFilter, search])

  const paged = paginate(filtered, page, 8)
  const activeOption = unbilled.find((u) => u.enrollmentId === selectedEnrollmentId) ?? unbilled[0]

  const createMutation = useMutation({
    mutationFn: () => {
      const targetEnrollmentId = selectedEnrollmentId || activeOption?.enrollmentId || ''
      return accountingApi.createReceivable(actor, {
        enrollmentId: targetEnrollmentId,
        discountAmountVnd: Number(discountInput) || 0,
        discountReason,
        dueDate: dueDateInput,
        note: noteInput,
      })
    },
    onSuccess: (created) => {
      setCreateOpen(false)
      setNoteInput('')
      setDiscountReason('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã tạo khoản phải thu ${created.receivableCode}`,
        description: `Học viên ${created.studentName} – Phải thu ${formatVnd(created.totalReceivableVnd)}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể tạo khoản phải thu',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!cancelTarget) throw new Error('Chưa chọn khoản phải thu.')
      return accountingApi.cancelReceivable(actor, {
        receivableId: cancelTarget.id,
        reason: cancelReason,
      })
    },
    onSuccess: (cancelled) => {
      setCancelTarget(null)
      setCancelReason('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã hủy khoản phải thu ${cancelled.receivableCode}`,
        description: 'Bản ghi Enrollment có thể được lập lại khoản phải thu mới nếu cần.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể hủy khoản phải thu',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const openCreateModal = () => {
    const first = unbilled[0]
    if (first) {
      setSelectedEnrollmentId(first.enrollmentId)
      setDiscountInput(String(first.suggestedDiscountVnd))
    }
    setCreateOpen(true)
  }

  const handleSubmitCreate = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleSubmitCancel = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    cancelMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách khoản phải thu & công nợ..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách khoản phải thu."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khoản phải thu & Công nợ học viên"
        description="Theo dõi khoản phải thu, chính sách ưu đãi và tiến độ đóng học phí của học viên."
        badge={<Badge tone="info">{receivables.length} khoản phải thu</Badge>}
        actions={
          <ActionGuard permission="finance.receivables.create">
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Tạo khoản phải thu ({unbilled.length} HV mới)</span>
            </Button>
          </ActionGuard>
        }
      />

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-4">
        <InputField
          id="rcv-search"
          placeholder="Tìm mã RCV, tên HV, mã HV, SĐT, lớp..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <SelectField
          id="rcv-status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | AccountingReceivableStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Mọi trạng thái công nợ' },
            { value: 'Overdue', label: 'Quá hạn công nợ' },
            { value: 'Unpaid', label: 'Chưa thanh toán' },
            { value: 'PartiallyPaid', label: 'Thanh toán một phần' },
            { value: 'Paid', label: 'Đã thanh toán đủ' },
            { value: 'Cancelled', label: 'Đã hủy nghiệp vụ' },
          ]}
        />
        <SelectField
          id="rcv-course"
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
          id="rcv-branch"
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
      </div>

      {paged.items.length === 0 ? (
        <EmptyBlock title="Không có khoản phải thu nào khớp bộ lọc" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Mã khoản thu & Học viên
                </DataTableHeaderCell>
                <DataTableHeaderCell>Khóa học / Lớp / Cơ sở</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Phải thu
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Đã thu
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Còn nợ
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Hạn đóng & Trạng thái
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Thao tác
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {paged.items.map((rcv) => {
                const stMeta = RECEIVABLE_STATUS_META[rcv.derivedStatus]
                const canCancelRcv =
                  !rcv.isCancelled &&
                  rcv.paidConfirmedVnd === 0 &&
                  rcv.pendingVerificationVnd === 0

                return (
                  <DataTableRow key={rcv.id}>
                    <DataTableCell>
                      <Link
                        to={`/accounting/receivables/${rcv.id}`}
                        className="whitespace-nowrap font-bold text-[#2878B8] hover:underline"
                      >
                        {rcv.receivableCode}
                      </Link>
                      <p className="whitespace-nowrap font-semibold text-[#243B53]">
                        {rcv.studentName}
                      </p>
                      <p className="whitespace-nowrap text-xs text-[#64748B]">
                        {rcv.studentCode} • {rcv.studentPhone}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-semibold text-[#243B53]">{rcv.courseName}</p>
                      <p className="text-[#64748B]">
                        Lớp <strong>{rcv.classCode}</strong> • {rcv.branchName}
                      </p>
                      {rcv.tuitionPolicyCode && (
                        <p className="whitespace-nowrap text-[#2878B8]">
                          CS giá: {rcv.tuitionPolicyCode}
                        </p>
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right font-semibold text-[#243B53]">
                      {formatVnd(rcv.totalReceivableVnd)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right font-semibold text-[#1F7A4C]">
                      {formatVnd(rcv.paidConfirmedVnd)}
                    </DataTableCell>
                    <DataTableCell
                      className={`whitespace-nowrap text-right font-extrabold ${
                        rcv.remainingVnd > 0 ? 'text-[#B93A2E]' : 'text-[#64748B]'
                      }`}
                    >
                      {formatVnd(rcv.remainingVnd)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                        <p className="text-xs text-[#64748B]">Hạn: {formatDate(rcv.dueDate)}</p>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Link to={`/accounting/receivables/${rcv.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-3.5 w-3.5" />
                            <span>Chi tiết</span>
                          </Button>
                        </Link>
                        {rcv.remainingVnd > 0 && !rcv.isCancelled && (
                          <ActionGuard permission="finance.payments.create">
                            <Link to={`/accounting/payments?receivableId=${rcv.id}`}>
                              <Button size="sm">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Thu</span>
                              </Button>
                            </Link>
                          </ActionGuard>
                        )}
                        {canCancelRcv && (
                          <ActionGuard permission="finance.receivables.create">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCancelTarget(rcv)
                                setCancelReason('')
                              }}
                            >
                              <Ban className="h-3.5 w-3.5 text-[#B93A2E]" />
                              <span className="text-[#B93A2E]">Hủy</span>
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
          <div className="px-4 pb-4">
            <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
          </div>
        </DataTableContainer>
      )}

      {/* Modal tạo khoản phải thu cho học viên mới ghi danh */}
      <Modal
        open={createOpen}
        title="Khởi tạo Khoản phải thu cho học viên mới ghi danh"
        onClose={() => setCreateOpen(false)}
        maxWidthClassName="max-w-xl"
      >
        {unbilled.length === 0 ? (
          <EmptyBlock
            title="Tất cả học viên thuộc diện thu phí hiện đều đã có Khoản phải thu"
            description="Khi Giáo vụ xếp lớp học viên mới ở phân hệ Academic, bản ghi Enrollment mới sẽ xuất hiện tại đây."
          />
        ) : (
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <SelectField
              id="new-rcv-enr"
              label="Chọn học viên ghi danh *"
              value={activeOption?.enrollmentId ?? ''}
              onChange={(e) => {
                const nextId = e.target.value
                setSelectedEnrollmentId(nextId)
                const opt = unbilled.find((u) => u.enrollmentId === nextId)
                if (opt) {
                  setDiscountInput(String(opt.suggestedDiscountVnd))
                }
              }}
              options={unbilled.map((u) => ({
                value: u.enrollmentId,
                label: `${u.studentName} (${u.studentCode}) – Lớp ${u.classCode} – ${u.enrollmentCode}`,
              }))}
            />

            {activeOption && (
              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
                <p>
                  <span className="text-[#64748B]">Khóa học & Cơ sở:</span>{' '}
                  <strong>
                    {activeOption.courseName} • {activeOption.branchName}
                  </strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Giá niêm yết Snapshot / Chính sách:</span>{' '}
                  <strong>{formatVnd(activeOption.listedTuitionVnd)}</strong>{' '}
                  {activeOption.suggestedPolicyCode
                    ? `(${activeOption.suggestedPolicyCode})`
                    : ''}
                </p>
                <p>
                  <span className="text-[#64748B]">Tổng phải thu dự kiến sau ưu đãi:</span>{' '}
                  <strong className="text-[#2878B8]">
                    {formatVnd(
                      Math.max(0, activeOption.listedTuitionVnd - (Number(discountInput) || 0)),
                    )}
                  </strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField
                id="new-rcv-discount"
                type="number"
                min={0}
                step={10000}
                label="Ưu đãi giảm trừ (VND)"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
              <InputField
                id="new-rcv-due"
                type="date"
                label="Hạn thanh toán *"
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                required
              />
            </div>

            <InputField
              id="new-rcv-discount-reason"
              label="Lý do áp dụng ưu đãi"
              placeholder="VD: Ưu đãi sinh viên đăng ký sớm theo chính sách hiện hành"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />

            <InputField
              id="new-rcv-note"
              label="Ghi chú công nợ"
              placeholder="VD: Đóng tối thiểu 50% trước ngày khai giảng"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Tạo khoản phải thu
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal hủy khoản phải thu chưa phát sinh thu tiền */}
      <Modal
        open={Boolean(cancelTarget)}
        title={`Hủy khoản phải thu ${cancelTarget?.receivableCode ?? ''}`}
        onClose={() => setCancelTarget(null)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleSubmitCancel} className="space-y-4">
          <p className="text-xs leading-relaxed text-[#475569]">
            Chỉ cho phép hủy nghiệp vụ đối với khoản phải thu chưa phát sinh tiền thực thu (0đ) và
            không có giao dịch chờ kiểm tra sao kê. Hồ sơ sẽ giữ nguyên trong lịch sử đối soát.
          </p>
          <InputField
            id="cancel-rcv-reason"
            label="Lý do hủy khoản phải thu *"
            placeholder="VD: Lập nhầm chính sách ưu đãi, hủy để tạo lại khoản phải thu mới"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)}>
              Đóng
            </Button>
            <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
              Xác nhận hủy khoản thu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
