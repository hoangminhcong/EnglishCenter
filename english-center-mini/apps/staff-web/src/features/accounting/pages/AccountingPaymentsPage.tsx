import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Receipt } from 'lucide-react'
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
  SelectField,
} from '@english-center/ui'
import type { PaymentMethodCode } from '@english-center/contracts'
import { formatDate, formatDateTimeVi, formatVnd, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { hasPermission } from '@/services/permissions/permissions.config'
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
  TRANSACTION_STATUS_META,
} from '@/features/accounting/types/accounting.types'

export function AccountingPaymentsPage() {
  useDocumentTitle('Quản lý tiền học của học viên')
  const { user } = useStaffAuth()
  const actor = useAccountingActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const canCreatePayment = hasPermission(user, 'finance.payments.create')
  const canCreateReceipt = hasPermission(user, 'finance.receipts.create')

  const [searchText, setSearchText] = useState('')
  const [selectedIdOverride, setSelectedIdOverride] = useState<string | null>(null)
  const queryReceivableId = searchParams.get('receivableId')

  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash')
  const [payerNameInput, setPayerNameInput] = useState('')
  const [paidDateInput, setPaidDateInput] = useState(todayYmdVn)
  const [bankName, setBankName] = useState('Vietcombank')
  const [referenceCode, setReferenceCode] = useState('')
  const [transferContent, setTransferContent] = useState('')
  const [markAsConfirmed, setMarkAsConfirmed] = useState(true)
  const [issueReceiptImmediately, setIssueReceiptImmediately] = useState(canCreateReceipt)
  const [note, setNote] = useState('')

  const {
    data: receivables = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.receivables(todayYmdVn),
    queryFn: () => accountingApi.listReceivables(todayYmdVn),
  })

  const { data: txBundle } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.transactions(),
    queryFn: () => accountingApi.listTransactions(),
  })

  const payableReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (r.isCancelled) return false
      if (!searchText.trim()) return true
      return (
        matchText(r.studentName, searchText) ||
        matchText(r.studentCode, searchText) ||
        matchText(r.studentPhone, searchText) ||
        matchText(r.receivableCode, searchText) ||
        matchText(r.classCode, searchText)
      )
    })
  }, [receivables, searchText])

  const activeReceivableId =
    selectedIdOverride ??
    queryReceivableId ??
    payableReceivables.find((r) => r.remainingVnd > 0)?.id ??
    payableReceivables[0]?.id ??
    ''

  const selectedReceivable = receivables.find((r) => r.id === activeReceivableId) ?? null

  const maxAllowedThisTurn = selectedReceivable
    ? Math.max(0, selectedReceivable.remainingVnd - selectedReceivable.pendingVerificationVnd)
    : 0

  const selectedReceivableTxs = useMemo(() => {
    if (!selectedReceivable || !txBundle) return []
    return txBundle.transactions.filter((t) => t.receivableId === selectedReceivable.id)
  }, [selectedReceivable, txBundle])

  const paymentMutation = useMutation({
    mutationFn: () => {
      if (!selectedReceivable) {
        throw new Error('Vui lòng chọn khoản phải thu của học viên.')
      }
      return accountingApi.recordPayment(actor, {
        receivableId: selectedReceivable.id,
        amountVnd: Number(amountInput),
        paymentMethod,
        payerName: payerNameInput.trim() || selectedReceivable.studentName,
        paidDate: paidDateInput,
        markAsConfirmed: paymentMethod === 'cash' ? true : markAsConfirmed,
        issueReceiptImmediately: canCreateReceipt ? issueReceiptImmediately : false,
        bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
        referenceCode: paymentMethod === 'bank_transfer' ? referenceCode : undefined,
        transferContent: paymentMethod === 'bank_transfer' ? transferContent : undefined,
        note,
      })
    },
    onSuccess: (res) => {
      setAmountInput('')
      setReferenceCode('')
      setTransferContent('')
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: res.receipt
          ? `Đã thu tiền & xuất phiếu ${res.receipt.receiptNumber}`
          : `Đã ghi nhận giao dịch ${res.transaction.transactionCode}`,
        description: `Số tiền ${formatVnd(res.transaction.amountVnd)} – Trạng thái: ${TRANSACTION_STATUS_META[res.transaction.status].label}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể ghi nhận thanh toán',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu nhập.',
      })
    },
  })

  const handleSelectReceivable = (id: string) => {
    setSelectedIdOverride(id)
    setSearchParams({ receivableId: id }, { replace: true })
    const found = receivables.find((r) => r.id === id)
    if (found) {
      const suggested = Math.max(0, found.remainingVnd - found.pendingVerificationVnd)
      setAmountInput(suggested > 0 ? String(suggested) : '')
      setPayerNameInput(found.studentName)
    }
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canCreatePayment) return
    paymentMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách khoản phải thu học viên..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu học phí."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý tiền học của học viên"
        description="Ghi nhận thanh toán học phí tiền mặt hoặc chuyển khoản theo từng đợt."
        actions={
          <Link to="/accounting/receipts">
            <Button size="sm" variant="secondary">
              <Receipt className="h-4 w-4" />
              <span>Danh sách phiếu thu</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột chọn học viên / khoản phải thu */}
        <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs lg:col-span-5">
          <h2 className="text-sm font-extrabold text-[#243B53]">
            1. Chọn học viên & Khoản phải thu ({payableReceivables.length})
          </h2>
          <InputField
            id="pay-search-rcv"
            placeholder="Tìm tên HV, mã HV, SĐT, mã RCV, mã lớp..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {payableReceivables.length === 0 ? (
              <EmptyBlock title="Không tìm thấy khoản phải thu phù hợp" />
            ) : (
              payableReceivables.map((item) => {
                const isSelected = item.id === selectedReceivable?.id
                const stMeta = RECEIVABLE_STATUS_META[item.derivedStatus]
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectReceivable(item.id)}
                    className={`w-full min-w-0 rounded-xl border p-3.5 text-left transition ${
                      isSelected
                        ? 'border-[#2878B8] bg-[#EAF6FD]/70 shadow-2xs'
                        : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 text-xs font-extrabold text-[#2878B8]">
                        {item.receivableCode} • Lớp {item.classCode}
                      </span>
                      <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#243B53]">
                      {item.studentName}{' '}
                      <span className="text-xs font-normal text-[#64748B]">
                        ({item.studentCode})
                      </span>
                    </p>
                    <p className="text-xs text-[#64748B]">{item.courseName}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-2 text-xs">
                      <span className="tabular-nums text-[#64748B]">
                        Đã thu: <strong>{formatVnd(item.paidConfirmedVnd)}</strong> /{' '}
                        {formatVnd(item.totalReceivableVnd)}
                      </span>
                      <span
                        className={`font-extrabold tabular-nums ${
                          item.remainingVnd > 0 ? 'text-[#B93A2E]' : 'text-[#1F7A4C]'
                        }`}
                      >
                        Còn nợ: {formatVnd(item.remainingVnd)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Cột biểu mẫu thu học phí từng đợt */}
        <div className="space-y-5 lg:col-span-7">
          {!selectedReceivable ? (
            <EmptyBlock title="Chọn một khoản phải thu bên trái để bắt đầu thu học phí" />
          ) : (
            <>
              {/* Thẻ đối soát tự động Tổng phải thu - Đã thu - Còn phải thu */}
              <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-[#243B53]">
                      2. Bảng tính công nợ tự động – {selectedReceivable.studentName}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Mã khoản phải thu: <strong>{selectedReceivable.receivableCode}</strong> • Hạn
                      đóng: <strong>{formatDate(selectedReceivable.dueDate)}</strong> • Cơ sở:{' '}
                      {selectedReceivable.branchName}
                    </p>
                  </div>
                  <Link to={`/accounting/receivables/${selectedReceivable.id}`}>
                    <Button size="sm" variant="ghost">
                      Xem hồ sơ công nợ
                    </Button>
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="min-w-0 rounded-xl bg-[#F8FBFD] p-3">
                    <span className="block text-[11px] font-semibold text-[#64748B]">
                      Tổng phải thu
                    </span>
                    <strong className="mt-1 block text-sm font-extrabold tabular-nums text-[#243B53]">
                      {formatVnd(selectedReceivable.totalReceivableVnd)}
                    </strong>
                  </div>
                  <div className="min-w-0 rounded-xl bg-[#EEFBF3] p-3">
                    <span className="block text-[11px] font-semibold text-[#1F7A4C]">
                      Đã thu xác nhận
                    </span>
                    <strong className="mt-1 block text-sm font-extrabold tabular-nums text-[#1F7A4C]">
                      {formatVnd(selectedReceivable.paidConfirmedVnd)}
                    </strong>
                  </div>
                  <div className="min-w-0 rounded-xl bg-[#FFFBEB] p-3">
                    <span className="block text-[11px] font-semibold text-[#B45309]">
                      Chờ kiểm tra CK
                    </span>
                    <strong className="mt-1 block text-sm font-extrabold tabular-nums text-[#B45309]">
                      {formatVnd(selectedReceivable.pendingVerificationVnd)}
                    </strong>
                  </div>
                  <div className="min-w-0 rounded-xl bg-[#FDECE9] p-3">
                    <span className="block text-[11px] font-semibold text-[#B93A2E]">
                      Còn được thu tối đa
                    </span>
                    <strong className="mt-1 block text-sm font-extrabold tabular-nums text-[#B93A2E]">
                      {formatVnd(maxAllowedThisTurn)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Biểu mẫu thu tiền */}
              <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
                <h3 className="text-base font-extrabold text-[#243B53]">
                  3. Ghi nhận đợt thanh toán mới
                </h3>

                {!canCreatePayment ? (
                  <div className="mt-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
                    Tài khoản của bạn đang ở chế độ chỉ xem, không có quyền ghi nhận thanh toán.
                  </div>
                ) : maxAllowedThisTurn <= 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 text-xs text-[#166534]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Khoản phải thu này đã được thanh toán đủ hoặc đang có giao dịch chuyển khoản
                      chờ xác nhận phủ hết số dư còn lại. Hệ thống tự động khóa thu thêm để chống
                      thu vượt.
                    </span>
                  </div>
                ) : (
                  <ActionGuard permission="finance.payments.create">
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <InputField
                            id="pay-amount"
                            type="number"
                            min={1000}
                            max={maxAllowedThisTurn}
                            step={1000}
                            label="Số tiền thu đợt này (VND) *"
                            placeholder={`Tối đa ${maxAllowedThisTurn}`}
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            required
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAmountInput(String(maxAllowedThisTurn))}
                              className="rounded-lg bg-[#EAF6FD] px-2.5 py-1 text-[11px] font-bold text-[#2878B8] hover:bg-[#D5ECFA]"
                            >
                              Thu đủ còn lại ({formatVnd(maxAllowedThisTurn)})
                            </button>
                            {maxAllowedThisTurn >= 1_000_000 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAmountInput(String(Math.round(maxAllowedThisTurn / 2)))
                                }
                                className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#E2E8F0]"
                              >
                                Thu 50% ({formatVnd(Math.round(maxAllowedThisTurn / 2))})
                              </button>
                            )}
                          </div>
                        </div>

                        <SelectField
                          id="pay-method"
                          label="Phương thức thanh toán *"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodCode)}
                          options={[
                            { value: 'cash', label: 'Tiền mặt tại quầy' },
                            {
                              value: 'bank_transfer',
                              label: 'Chuyển khoản ngân hàng',
                            },
                          ]}
                        />

                        <InputField
                          id="pay-payer"
                          label="Họ tên người nộp tiền *"
                          placeholder={selectedReceivable.studentName}
                          value={payerNameInput}
                          onChange={(e) => setPayerNameInput(e.target.value)}
                        />

                        <InputField
                          id="pay-date"
                          type="date"
                          label="Ngày thanh toán *"
                          value={paidDateInput}
                          onChange={(e) => setPaidDateInput(e.target.value)}
                          required
                        />
                      </div>

                      {paymentMethod === 'bank_transfer' && (
                        <div className="space-y-3 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InputField
                              id="pay-bank"
                              label="Ngân hàng thụ hưởng *"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              required
                            />
                            <InputField
                              id="pay-ref"
                              label="Mã tham chiếu / Ủy nhiệm chi *"
                              placeholder="VD: FT26330998888"
                              value={referenceCode}
                              onChange={(e) => setReferenceCode(e.target.value)}
                              required
                            />
                          </div>
                          <InputField
                            id="pay-transfer-content"
                            label="Nội dung chuyển khoản"
                            placeholder="VD: DONG HOC PHI DOT 1"
                            value={transferContent}
                            onChange={(e) => setTransferContent(e.target.value)}
                          />
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#243B53]">
                            <input
                              type="checkbox"
                              checked={markAsConfirmed}
                              onChange={(e) => setMarkAsConfirmed(e.target.checked)}
                              className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                            />
                            <span>
                              Đã đối chiếu khớp sao kê ngân hàng (Xác nhận ngay — bỏ chọn nếu cần lưu
                              trạng thái Chờ kiểm tra)
                            </span>
                          </label>
                        </div>
                      )}

                      <InputField
                        id="pay-note"
                        label="Nội dung / Ghi chú đợt thu"
                        placeholder="VD: Thu học phí đợt 1 tại quầy cơ sở Hà Đông"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />

                      {(paymentMethod === 'cash' || markAsConfirmed) && (
                        <ActionGuard permission="finance.receipts.create">
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#243B53]">
                            <input
                              type="checkbox"
                              checked={issueReceiptImmediately}
                              onChange={(e) => setIssueReceiptImmediately(e.target.checked)}
                              className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                            />
                            <span>Xuất Phiếu thu chính thức ngay sau khi ghi nhận thanh toán</span>
                          </label>
                        </ActionGuard>
                      )}

                      <div className="flex justify-end">
                        <Button type="submit" loading={paymentMutation.isPending}>
                          <CreditCard className="h-4 w-4" />
                          <span>Ghi nhận thanh toán</span>
                        </Button>
                      </div>
                    </form>
                  </ActionGuard>
                )}
              </div>

              {/* Lịch sử các đợt đã đóng của học viên đang chọn */}
              <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
                <h3 className="mb-3 text-sm font-extrabold text-[#243B53]">
                  Các đợt giao dịch của {selectedReceivable.receivableCode} (
                  {selectedReceivableTxs.length})
                </h3>
                {selectedReceivableTxs.length === 0 ? (
                  <EmptyBlock title="Chưa có giao dịch thanh toán nào cho khoản phải thu này" />
                ) : (
                  <DataTableContainer>
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <DataTableHeaderCell className="whitespace-nowrap">
                            Mã GD & Thời gian
                          </DataTableHeaderCell>
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
                        {selectedReceivableTxs.map((tx) => {
                          const st = TRANSACTION_STATUS_META[tx.status]
                          return (
                            <DataTableRow key={tx.id}>
                              <DataTableCell className="whitespace-nowrap">
                                <p className="font-bold text-[#243B53]">{tx.transactionCode}</p>
                                <p className="text-xs text-[#64748B]">
                                  {formatDateTimeVi(tx.paidAt)}
                                </p>
                              </DataTableCell>
                              <DataTableCell className="text-xs">
                                <p className="font-medium text-[#243B53]">
                                  {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                                </p>
                                {tx.bankTransferMeta && (
                                  <p className="whitespace-nowrap text-[#64748B]">
                                    {tx.bankTransferMeta.bankName} •{' '}
                                    {tx.bankTransferMeta.referenceCode}
                                  </p>
                                )}
                              </DataTableCell>
                              <DataTableCell className="whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1.5">
                                  <Badge tone={st.tone}>{st.label}</Badge>
                                  {tx.receiptNumber && (
                                    <p className="text-xs font-semibold text-[#2878B8]">
                                      Phiếu: {tx.receiptNumber}
                                      {tx.status === 'Voided' ? ' (Đã hủy)' : ''}
                                    </p>
                                  )}
                                </div>
                              </DataTableCell>
                              <DataTableCell className="whitespace-nowrap text-right font-bold text-[#243B53]">
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
