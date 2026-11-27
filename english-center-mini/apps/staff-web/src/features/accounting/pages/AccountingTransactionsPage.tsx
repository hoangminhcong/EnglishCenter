import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, History, RotateCcw, XCircle } from 'lucide-react'
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
import type {
  PaymentMethodCode,
  PaymentTransactionDto,
  PaymentTransactionStatus,
  RefundRequestDto,
  RefundStatus,
} from '@english-center/contracts'
import { formatDateTimeVi, formatVnd, matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import {
  accountingApi,
  computeRefundableCeilingForTransaction,
} from '@/features/accounting/services/accountingApi'
import {
  ACCOUNTING_QUERY_KEYS,
  useAccountingActor,
} from '@/features/accounting/hooks/useAccounting'
import {
  PAYMENT_METHOD_LABELS,
  REFUND_STATUS_META,
  TRANSACTION_STATUS_META,
} from '@/features/accounting/types/accounting.types'

export function AccountingTransactionsPage() {
  useDocumentTitle('Lịch sử giao dịch & Hoàn tiền')
  const { user } = useStaffAuth()
  const actor = useAccountingActor()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canViewRefunds = hasPermission(user, 'finance.refunds.view')

  const [tab, setTab] = useState<'transactions' | 'refunds' | 'audit'>('transactions')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethodCode>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentTransactionStatus>('ALL')
  const [txPage, setTxPage] = useState(1)
  const [refundPage, setRefundPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)

  const [voidTarget, setVoidTarget] = useState<PaymentTransactionDto | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const [refundSourceTx, setRefundSourceTx] = useState<PaymentTransactionDto | null>(null)
  const [refundAmountInput, setRefundAmountInput] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethodCode>('bank_transfer')
  const [refundReason, setRefundReason] = useState('')

  const [reviewRefundTarget, setReviewRefundTarget] = useState<{
    refund: RefundRequestDto
    nextStatus: RefundStatus
  } | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const {
    data: txBundle,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.transactions(),
    queryFn: () => accountingApi.listTransactions(),
  })

  const { data: refunds = [] } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.refunds(),
    queryFn: () => accountingApi.listRefunds(),
    enabled: canViewRefunds,
  })

  const filteredTxs = useMemo(() => {
    const list = txBundle?.transactions ?? []
    return list.filter((tx) => {
      if (methodFilter !== 'ALL' && tx.paymentMethod !== methodFilter) return false
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(tx.transactionCode, search) ||
          matchText(tx.studentName, search) ||
          matchText(tx.studentCode, search) ||
          matchText(tx.receivableCode, search) ||
          matchText(tx.recordedByName, search) ||
          matchText(tx.bankTransferMeta?.referenceCode ?? '', search)
        )
      }
      return true
    })
  }, [txBundle, methodFilter, statusFilter, search])

  const pagedTxs = paginate(filteredTxs, txPage, 8)
  const pagedRefunds = paginate(refunds, refundPage, 8)
  const pagedAuditLogs = paginate(txBundle?.auditLogs ?? [], auditPage, 10)

  const confirmMutation = useMutation({
    mutationFn: (txId: string) => accountingApi.confirmBankTransfer(actor, txId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã xác nhận giao dịch ${updated.transactionCode}`,
        description: 'Số dư khoản phải thu và thực thu đã tự động cập nhật.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể xác nhận chuyển khoản',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const voidMutation = useMutation({
    mutationFn: () => {
      if (!voidTarget) throw new Error('Chưa chọn giao dịch.')
      return accountingApi.voidTransaction(actor, voidTarget.id, voidReason)
    },
    onSuccess: (updated) => {
      setVoidTarget(null)
      setVoidReason('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã hủy nghiệp vụ (Void) ${updated.transactionCode}`,
        description:
          'Giao dịch gốc và Phiếu thu đi kèm (nếu có) đã được đánh dấu hủy nghiệp vụ trong sổ kiểm toán.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể hủy giao dịch',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const createRefundMutation = useMutation({
    mutationFn: () => {
      if (!refundSourceTx) throw new Error('Chưa chọn giao dịch gốc.')
      return accountingApi.createRefundRequest(actor, {
        originalTransactionId: refundSourceTx.id,
        amountVnd: Number(refundAmountInput),
        paymentMethod: refundMethod,
        reason: refundReason,
      })
    },
    onSuccess: (created) => {
      setRefundSourceTx(null)
      setRefundAmountInput('')
      setRefundReason('')
      if (canViewRefunds) {
        setTab('refunds')
      }
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã tạo yêu cầu hoàn tiền ${created.refundCode}`,
        description: `Trạng thái: Chờ duyệt hoàn (${formatVnd(created.amountVnd)}).`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể tạo yêu cầu hoàn tiền',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const transitionRefundMutation = useMutation({
    mutationFn: () => {
      if (!reviewRefundTarget) throw new Error('Chưa chọn yêu cầu hoàn tiền.')
      return accountingApi.transitionRefundStatus(actor, {
        refundId: reviewRefundTarget.refund.id,
        toStatus: reviewRefundTarget.nextStatus,
        reviewNote,
      })
    },
    onSuccess: (updated) => {
      setReviewRefundTarget(null)
      setReviewNote('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã cập nhật ${updated.refundCode}`,
        description: `Trạng thái mới: ${REFUND_STATUS_META[updated.status].label}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật trạng thái hoàn tiền',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleOpenRefundModal = (tx: PaymentTransactionDto) => {
    const ceiling = computeRefundableCeilingForTransaction(tx, refunds)
    setRefundSourceTx(tx)
    setRefundAmountInput(String(ceiling))
    setRefundReason('')
  }

  const handleVoidSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    voidMutation.mutate()
  }

  const handleCreateRefundSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createRefundMutation.mutate()
  }

  const handleReviewRefundSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    transitionRefundMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải lịch sử giao dịch tài chính..." />
  if (error || !txBundle) {
    return (
      <ErrorBlock
        message="Không thể tải sổ cái giao dịch."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const ceilingForModal = refundSourceTx
    ? computeRefundableCeilingForTransaction(refundSourceTx, refunds)
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch sử giao dịch & Quản lý hoàn tiền"
        description="Tra cứu sổ giao dịch, đối chiếu chuyển khoản, hủy giao dịch và xử lý hoàn tiền."
        badge={<Badge tone="info">{txBundle.transactions.length} giao dịch</Badge>}
      />

      {/* Chuyển tab */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('transactions')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'transactions'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            1. Sổ cái giao dịch ({txBundle.transactions.length})
          </button>
          {canViewRefunds && (
            <button
              type="button"
              onClick={() => setTab('refunds')}
              className={`rounded-lg px-3.5 py-2 transition ${
                tab === 'refunds'
                  ? 'bg-[#2878B8] text-white'
                  : 'text-[#475569] hover:text-[#2878B8]'
              }`}
            >
              2. Yêu cầu hoàn tiền ({refunds.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('audit')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'audit'
                ? 'bg-[#2878B8] text-white'
                : 'text-[#475569] hover:text-[#2878B8]'
            }`}
          >
            3. Nhật ký kiểm toán ({txBundle.auditLogs.length})
          </button>
        </div>

        {tab === 'transactions' && (
          <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3 lg:max-w-2xl">
            <InputField
              id="tx-search"
              placeholder="Tìm mã GD, HV, mã UNC, người thu..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setTxPage(1)
              }}
            />
            <SelectField
              id="tx-method"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as 'ALL' | PaymentMethodCode)
                setTxPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi phương thức' },
                { value: 'cash', label: 'Tiền mặt' },
                { value: 'bank_transfer', label: 'Chuyển khoản' },
              ]}
            />
            <SelectField
              id="tx-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | PaymentTransactionStatus)
                setTxPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                { value: 'Confirmed', label: 'Đã xác nhận' },
                { value: 'PendingVerification', label: 'Chờ kiểm tra sao kê' },
                { value: 'Voided', label: 'Đã hủy (Void)' },
              ]}
            />
          </div>
        )}
      </div>

      {tab === 'transactions' &&
        (pagedTxs.items.length === 0 ? (
          <EmptyBlock title="Không có giao dịch nào khớp điều kiện tìm kiếm" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã GD & Thời gian
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Học viên & Khoản phải thu</DataTableHeaderCell>
                  <DataTableHeaderCell>Phương thức & Thu ngân</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Nghiệp vụ
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {pagedTxs.items.map((tx) => {
                  const st = TRANSACTION_STATUS_META[tx.status]
                  const refundableCeiling = computeRefundableCeilingForTransaction(tx, refunds)
                  return (
                    <DataTableRow key={tx.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{tx.transactionCode}</p>
                        <p className="text-xs text-[#64748B]">{formatDateTimeVi(tx.paidAt)}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-bold text-[#243B53]">
                          {tx.studentName} ({tx.studentCode})
                        </p>
                        <p className="whitespace-nowrap text-[#64748B]">
                          {tx.receivableCode} • Lớp {tx.classCode}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-medium text-[#243B53]">
                          {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                        </p>
                        {tx.bankTransferMeta && (
                          <p className="whitespace-nowrap text-[#2878B8]">
                            {tx.bankTransferMeta.bankName} – UNC:{' '}
                            {tx.bankTransferMeta.referenceCode}
                          </p>
                        )}
                        <p className="text-[#64748B]">Thu ngân: {tx.recordedByName}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#243B53]">
                        {formatVnd(tx.amountVnd)}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {tx.voidReason && (
                            <p className="max-w-[200px] text-[11px] text-[#B93A2E]">
                              Lý do hủy: {tx.voidReason}
                            </p>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {tx.status === 'PendingVerification' && (
                            <ActionGuard permission="finance.payments.update">
                              <Button
                                size="sm"
                                onClick={() => confirmMutation.mutate(tx.id)}
                                loading={confirmMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Xác nhận CK</span>
                              </Button>
                            </ActionGuard>
                          )}
                          {tx.status === 'Confirmed' && refundableCeiling > 0 && (
                            <ActionGuard permission="finance.refunds.create">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenRefundModal(tx)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Hoàn tiền</span>
                              </Button>
                            </ActionGuard>
                          )}
                          {tx.status !== 'Voided' && (
                            <ActionGuard permission="finance.payments.update">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setVoidTarget(tx)
                                  setVoidReason('')
                                }}
                              >
                                <Ban className="h-3.5 w-3.5 text-[#B93A2E]" />
                                <span className="text-[#B93A2E]">Hủy (Void)</span>
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
              <Pagination
                page={pagedTxs.page}
                totalPages={pagedTxs.totalPages}
                onChange={setTxPage}
              />
            </div>
          </DataTableContainer>
        ))}

      {tab === 'refunds' &&
        canViewRefunds &&
        (pagedRefunds.items.length === 0 ? (
          <EmptyBlock title="Chưa có yêu cầu hoàn tiền nào" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã hoàn & Thời gian
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Học viên & Giao dịch gốc</DataTableHeaderCell>
                  <DataTableHeaderCell>Lý do hoàn tiền & Ghi chú duyệt</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền hoàn
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Xử lý
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {pagedRefunds.items.map((rf) => {
                  const meta = REFUND_STATUS_META[rf.status]
                  return (
                    <DataTableRow key={rf.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{rf.refundCode}</p>
                        <p className="text-xs text-[#64748B]">{formatDateTimeVi(rf.requestedAt)}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-bold text-[#243B53]">
                          {rf.studentName} ({rf.studentCode})
                        </p>
                        <p className="whitespace-nowrap text-[#64748B]">
                          GD gốc: <strong>{rf.originalTransactionCode}</strong> •{' '}
                          {rf.receivableCode}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="max-w-xs text-xs text-[#475569]">
                        <p>{rf.reason}</p>
                        {rf.reviewNote && (
                          <p className="mt-1 font-semibold text-[#2878B8]">
                            Ghi chú duyệt: {rf.reviewNote}
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#B93A2E]">
                        {formatVnd(rf.amountVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {(rf.status === 'PendingApproval' || rf.status === 'Requested') && (
                            <>
                              <ActionGuard permission="finance.refunds.approve">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setReviewRefundTarget({ refund: rf, nextStatus: 'Approved' })
                                    setReviewNote('')
                                  }}
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setReviewRefundTarget({ refund: rf, nextStatus: 'Rejected' })
                                    setReviewNote('')
                                  }}
                                >
                                  Từ chối
                                </Button>
                              </ActionGuard>
                              <ActionGuard permission="finance.refunds.create">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReviewRefundTarget({ refund: rf, nextStatus: 'Cancelled' })
                                    setReviewNote('')
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 text-[#64748B]" />
                                  <span>Hủy yêu cầu</span>
                                </Button>
                              </ActionGuard>
                            </>
                          )}
                          {rf.status === 'Approved' && (
                            <ActionGuard permission="finance.refunds.approve">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewRefundTarget({ refund: rf, nextStatus: 'Completed' })
                                  setReviewNote('')
                                }}
                              >
                                Xác nhận đã chi hoàn
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
              <Pagination
                page={pagedRefunds.page}
                totalPages={pagedRefunds.totalPages}
                onChange={setRefundPage}
              />
            </div>
          </DataTableContainer>
        ))}

      {tab === 'audit' &&
        (pagedAuditLogs.items.length === 0 ? (
          <EmptyBlock title="Chưa có nhật ký kiểm toán." />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">Thời điểm</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Người thao tác
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Hành động</DataTableHeaderCell>
                  <DataTableHeaderCell>Chi tiết lưu vết</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {pagedAuditLogs.items.map((log) => (
                  <DataTableRow key={log.id}>
                    <DataTableCell className="whitespace-nowrap text-xs">
                      {formatDateTimeVi(log.occurredAt)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap font-semibold text-[#243B53]">
                      {log.actorName}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={log.action === 'voided' ? 'danger' : 'info'}>
                        <History className="mr-1 inline h-3 w-3" />
                        {log.action}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-xs text-[#475569]">{log.detail}</DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
            <div className="px-4 pb-4">
              <Pagination
                page={pagedAuditLogs.page}
                totalPages={pagedAuditLogs.totalPages}
                onChange={setAuditPage}
              />
            </div>
          </DataTableContainer>
        ))}

      {/* Modal Hủy nghiệp vụ (Void) */}
      <Modal
        open={Boolean(voidTarget)}
        title={`Hủy nghiệp vụ (Void) giao dịch ${voidTarget?.transactionCode ?? ''}`}
        onClose={() => setVoidTarget(null)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleVoidSubmit} className="space-y-4">
          <p className="text-xs leading-relaxed text-[#475569]">
            Giao dịch sẽ chuyển sang trạng thái <strong>Đã hủy (Voided)</strong>, đồng thời đánh dấu
            hủy lên Phiếu thu đi kèm (nếu đã cấp) và hoàn trả lại dư địa thu cho khoản phải thu{' '}
            <strong>{voidTarget?.receivableCode}</strong>.
          </p>
          <InputField
            id="void-reason"
            label="Lý do hủy giao dịch *"
            placeholder="VD: Nhập nhầm số tiền hoặc nhầm mã khoản phải thu"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVoidTarget(null)}>
              Đóng
            </Button>
            <Button type="submit" variant="danger" loading={voidMutation.isPending}>
              Xác nhận hủy giao dịch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tạo yêu cầu hoàn tiền */}
      <Modal
        open={Boolean(refundSourceTx)}
        title={`Lập yêu cầu hoàn tiền từ ${refundSourceTx?.transactionCode ?? ''}`}
        onClose={() => setRefundSourceTx(null)}
        maxWidthClassName="max-w-lg"
      >
        {refundSourceTx && (
          <form onSubmit={handleCreateRefundSubmit} className="space-y-4">
            <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
              <p>
                <span className="text-[#64748B]">Học viên:</span>{' '}
                <strong>
                  {refundSourceTx.studentName} ({refundSourceTx.studentCode})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Số tiền giao dịch gốc:</span>{' '}
                <strong>{formatVnd(refundSourceTx.amountVnd)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Hạn mức tối đa được phép hoàn:</span>{' '}
                <strong className="text-[#B93A2E]">{formatVnd(ceilingForModal)}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField
                id="rf-amount"
                type="number"
                min={1000}
                max={ceilingForModal}
                step={1000}
                label="Số tiền hoàn (VND) *"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                required
              />
              <SelectField
                id="rf-method"
                label="Hình thức chi hoàn *"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethodCode)}
                options={[
                  { value: 'bank_transfer', label: 'Chuyển khoản hoàn trả' },
                  { value: 'cash', label: 'Tiền mặt tại quầy' },
                ]}
              />
            </div>

            <InputField
              id="rf-reason"
              label="Lý do hoàn tiền *"
              placeholder="VD: Hoàn ưu đãi bổ sung thẻ sinh viên hợp lệ theo chính sách"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRefundSourceTx(null)}>
                Hủy
              </Button>
              <Button type="submit" loading={createRefundMutation.isPending}>
                Gửi yêu cầu hoàn tiền
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Duyệt / Từ chối / Hủy / Hoàn tất yêu cầu hoàn tiền */}
      <Modal
        open={Boolean(reviewRefundTarget)}
        title={`Xử lý yêu cầu hoàn tiền ${reviewRefundTarget?.refund.refundCode ?? ''}`}
        onClose={() => setReviewRefundTarget(null)}
        maxWidthClassName="max-w-md"
      >
        {reviewRefundTarget && (
          <form onSubmit={handleReviewRefundSubmit} className="space-y-4">
            <p className="text-xs text-[#475569]">
              Chuyển trạng thái sang:{' '}
              <strong>{REFUND_STATUS_META[reviewRefundTarget.nextStatus].label}</strong> – Số tiền:{' '}
              <strong>{formatVnd(reviewRefundTarget.refund.amountVnd)}</strong>.
            </p>
            {reviewRefundTarget.nextStatus === 'Completed' &&
              reviewRefundTarget.refund.reviewNote && (
                <div className="rounded-xl bg-[#F8FBFD] p-3 text-xs text-[#243B53]">
                  <span className="text-[#64748B]">Ghi chú phê duyệt gốc (được bảo toàn):</span>{' '}
                  <strong>{reviewRefundTarget.refund.reviewNote}</strong>
                </div>
              )}
            <InputField
              id="rf-review-note"
              label={
                reviewRefundTarget.nextStatus === 'Rejected'
                  ? 'Lý do từ chối hoàn tiền *'
                  : reviewRefundTarget.nextStatus === 'Completed'
                    ? 'Ghi chú chứng từ chi hoàn bổ sung (Tùy chọn)'
                    : 'Ghi chú phê duyệt / hủy yêu cầu'
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              required={reviewRefundTarget.nextStatus === 'Rejected'}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReviewRefundTarget(null)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                variant={reviewRefundTarget.nextStatus === 'Rejected' ? 'danger' : 'primary'}
                loading={transitionRefundMutation.isPending}
              >
                Xác nhận
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
