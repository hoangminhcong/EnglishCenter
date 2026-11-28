import { useState, type SyntheticEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CreditCard, Receipt } from 'lucide-react'
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
} from '@english-center/ui'
import { formatDate, formatDateTimeVi, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { accountingApi } from '@/features/accounting/services/accountingApi'
import {
  ACCOUNTING_QUERY_KEYS,
  useAccountingActor,
} from '@/features/accounting/hooks/useAccounting'
import {
  PAYMENT_METHOD_LABELS,
  RECEIVABLE_STATUS_META,
  REFUND_STATUS_META,
  TRANSACTION_STATUS_META,
} from '@/features/accounting/types/accounting.types'

export function AccountingReceivableDetailPage() {
  const { id = '' } = useParams()
  useDocumentTitle(`Chi tiết khoản phải thu ${id}`)
  const actor = useAccountingActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.receivableDetail(id, todayYmdVn),
    queryFn: () => accountingApi.getReceivableDetail(id, todayYmdVn),
    enabled: Boolean(id),
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      accountingApi.cancelReceivable(actor, {
        receivableId: id,
        reason: cancelReason,
      }),
    onSuccess: (cancelled) => {
      setCancelOpen(false)
      setCancelReason('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã hủy khoản phải thu ${cancelled.receivableCode}`,
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

  if (isLoading) return <LoadingBlock label="Đang tải chi tiết khoản phải thu..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy hồ sơ khoản phải thu."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { receivable, transactions, receipts, refunds } = data
  const stMeta = RECEIVABLE_STATUS_META[receivable.derivedStatus]
  const canCancelReceivable =
    !receivable.isCancelled &&
    receivable.paidConfirmedVnd === 0 &&
    receivable.pendingVerificationVnd === 0

  const handleCancelSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    cancelMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Khoản phải thu ${receivable.receivableCode}`}
        description={`${receivable.studentName} (${receivable.studentCode}) • Lớp ${receivable.classCode}`}
        badge={<Badge tone={stMeta.tone}>{stMeta.label}</Badge>}
        actions={
          <>
            <Link to="/accounting/receivables">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại</span>
              </Button>
            </Link>
            {canCancelReceivable && (
              <ActionGuard permission="finance.receivables.create">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setCancelReason('')
                    setCancelOpen(true)
                  }}
                >
                  <Ban className="h-4 w-4" />
                  <span>Hủy khoản phải thu</span>
                </Button>
              </ActionGuard>
            )}
            {receivable.remainingVnd > 0 && !receivable.isCancelled && (
              <ActionGuard permission="finance.payments.create">
                <Link to={`/accounting/payments?receivableId=${receivable.id}`}>
                  <Button size="sm">
                    <CreditCard className="h-4 w-4" />
                    <span>Ghi nhận thanh toán đợt tiếp</span>
                  </Button>
                </Link>
              </ActionGuard>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#64748B]">Học phí niêm yết</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#243B53] sm:text-2xl">
            {formatVnd(receivable.listedTuitionVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#64748B]">Ưu đãi giảm trừ</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#2878B8] sm:text-2xl">
            -{formatVnd(receivable.discountAmountVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#64748B]">Tổng khoản phải thu</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#243B53] sm:text-2xl">
            {formatVnd(receivable.totalReceivableVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#1F7A4C]">Đã thanh toán xác nhận</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#1F7A4C] sm:text-2xl">
            {formatVnd(receivable.paidConfirmedVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#B93A2E]">Còn phải thu</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#B93A2E] sm:text-2xl">
            {formatVnd(receivable.remainingVnd)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs text-sm">
        <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
          Thông tin đối chiếu hồ sơ học vụ & chính sách học phí
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <p>
            <span className="text-[#64748B]">Mã ghi danh:</span>{' '}
            <strong>{receivable.enrollmentId}</strong>
          </p>
          <p>
            <span className="text-[#64748B]">Cơ sở đào tạo:</span>{' '}
            <strong>{receivable.branchName}</strong>
          </p>
          <p>
            <span className="text-[#64748B]">Hạn thanh toán:</span>{' '}
            <strong>{formatDate(receivable.dueDate)}</strong>
          </p>
          <p>
            <span className="text-[#64748B]">Chính sách giá áp dụng:</span>{' '}
            <strong>{receivable.tuitionPolicyCode ?? 'Không áp dụng'}</strong>
          </p>
          <p>
            <span className="text-[#64748B]">Đã hoàn tiền:</span>{' '}
            <strong>{formatVnd(receivable.refundedCompletedVnd)}</strong>
          </p>
          <p>
            <span className="text-[#64748B]">Thực thu ròng:</span>{' '}
            <strong className="text-[#1F7A4C]">{formatVnd(receivable.netCollectedVnd)}</strong>
          </p>
        </div>
        {receivable.discountReason && (
          <p className="mt-2 text-xs text-[#64748B]">
            Lý do ưu đãi: <strong className="text-[#243B53]">{receivable.discountReason}</strong>
          </p>
        )}
        {receivable.note && (
          <p className="mt-1 text-xs text-[#64748B]">
            Ghi chú kế toán: <strong className="text-[#243B53]">{receivable.note}</strong>
          </p>
        )}
      </div>

      {/* Lịch sử giao dịch của khoản phải thu */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
            Lịch sử các đợt thanh toán ({transactions.length})
          </h2>
          <Link to="/accounting/receipts" className="text-xs font-bold text-[#2878B8] hover:underline">
            Mở danh sách phiếu thu ({receipts.length})
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyBlock title="Chưa phát sinh giao dịch nào cho khoản phải thu này" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã GD & Thời gian
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Người nộp & Thu ngân</DataTableHeaderCell>
                  <DataTableHeaderCell>Phương thức</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái / Phiếu thu
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {transactions.map((tx) => {
                  const st = TRANSACTION_STATUS_META[tx.status]
                  return (
                    <DataTableRow key={tx.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{tx.transactionCode}</p>
                        <p className="text-xs text-[#64748B]">{formatDateTimeVi(tx.paidAt)}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">Nộp: {tx.payerName}</p>
                        <p className="text-[#64748B]">Thu ngân: {tx.recordedByName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p>{PAYMENT_METHOD_LABELS[tx.paymentMethod]}</p>
                        {tx.bankTransferMeta && (
                          <p className="whitespace-nowrap text-[#64748B]">
                            {tx.bankTransferMeta.bankName} • {tx.bankTransferMeta.referenceCode}
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {tx.receiptNumber && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2878B8]">
                              <Receipt className="h-3 w-3" />
                              {tx.receiptNumber}
                              {tx.status === 'Voided' ? ' (Đã hủy)' : ''}
                            </span>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#243B53]">
                        {formatVnd(tx.amountVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>

      {/* Lịch sử hoàn tiền nếu có */}
      {refunds.length > 0 && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            Yêu cầu hoàn tiền liên quan ({refunds.length})
          </h2>
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã hoàn tiền
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Giao dịch gốc & Lý do</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền hoàn
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {refunds.map((rf) => {
                  const meta = REFUND_STATUS_META[rf.status]
                  return (
                    <DataTableRow key={rf.id}>
                      <DataTableCell className="whitespace-nowrap font-bold text-[#243B53]">
                        {rf.refundCode}
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="whitespace-nowrap font-semibold text-[#243B53]">
                          GD gốc: {rf.originalTransactionCode}
                        </p>
                        <p className="text-[#64748B]">{rf.reason}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-bold text-[#B93A2E]">
                        {formatVnd(rf.amountVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        </div>
      )}

      {/* Modal hủy khoản phải thu */}
      <Modal
        open={cancelOpen}
        title={`Hủy khoản phải thu ${receivable.receivableCode}`}
        onClose={() => setCancelOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-xs text-[#475569]">
            Khoản phải thu chưa phát sinh tiền thực thu sẽ được chuyển sang trạng thái{' '}
            <strong>Đã hủy nghiệp vụ</strong> kèm lý do lưu vết.
          </p>
          <InputField
            id="dtl-cancel-rcv-reason"
            label="Lý do hủy khoản phải thu *"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              Đóng
            </Button>
            <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
              Xác nhận hủy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
