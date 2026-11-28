import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Eye, Plus, Printer } from 'lucide-react'
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
  SelectField,
} from '@english-center/ui'
import type { PaymentReceiptDto } from '@english-center/contracts'
import { formatDateTimeVi, formatVnd, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { accountingApi } from '@/features/accounting/services/accountingApi'
import {
  ACCOUNTING_QUERY_KEYS,
  useAccountingActor,
} from '@/features/accounting/hooks/useAccounting'
import { PAYMENT_METHOD_LABELS } from '@/features/accounting/types/accounting.types'

export function AccountingReceiptsPage() {
  useDocumentTitle('Phiếu thu học phí')
  const actor = useAccountingActor()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceiptDto | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState('')
  const [reasonContent, setReasonContent] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.receipts(),
    queryFn: () => accountingApi.listReceipts(),
  })

  const filteredReceipts = useMemo(() => {
    const list = data?.receipts ?? []
    if (!search.trim()) return list
    return list.filter(
      (r) =>
        matchText(r.receiptNumber, search) ||
        matchText(r.payerName, search) ||
        matchText(r.studentName ?? '', search) ||
        matchText(r.studentCode, search) ||
        matchText(r.transactionCode, search) ||
        matchText(r.receivableCode, search),
    )
  }, [data, search])

  const eligibleTxs = data?.eligibleConfirmedTransactions ?? []
  const activeEligibleTx = eligibleTxs.find((t) => t.id === selectedTxId) ?? eligibleTxs[0]

  const createMutation = useMutation({
    mutationFn: () => {
      const txId = selectedTxId || activeEligibleTx?.id || ''
      return accountingApi.createReceiptFromTransaction(actor, {
        transactionId: txId,
        reasonContent,
      })
    },
    onSuccess: (created) => {
      setCreateOpen(false)
      setReasonContent('')
      setViewingReceipt(created)
      void queryClient.invalidateQueries({ queryKey: ACCOUNTING_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã lập phiếu thu ${created.receiptNumber}`,
        description: `Gắn với giao dịch xác nhận ${created.transactionCode}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lập phiếu thu',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleSubmitCreate = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách phiếu thu học phí..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu phiếu thu."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý & In Phiếu thu học phí"
        description="Quản lý và in phiếu thu cho các giao dịch đã xác nhận."
        badge={<Badge tone="success">{data.receipts.length} phiếu thu</Badge>}
        actions={
          <ActionGuard permission="finance.receipts.create">
            <Button
              size="sm"
              onClick={() => {
                setSelectedTxId(eligibleTxs[0]?.id ?? '')
                setCreateOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Lập phiếu thu ({eligibleTxs.length} GD chờ cấp phiếu)</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <InputField
          id="rcp-search"
          placeholder="Tìm theo số phiếu thu, tên người nộp, học viên, mã HV, mã giao dịch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredReceipts.length === 0 ? (
        <EmptyBlock title="Không tìm thấy phiếu thu phù hợp" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Số phiếu & Trạng thái
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">Ngày lập</DataTableHeaderCell>
                <DataTableHeaderCell>Người nộp & Học viên</DataTableHeaderCell>
                <DataTableHeaderCell>Nội dung & Mã đối chiếu</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">Người thu</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Số tiền
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap text-right">
                  Xem / In
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {filteredReceipts.map((rcp) => (
                <DataTableRow key={rcp.id}>
                  <DataTableCell className="whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1.5">
                      <p
                        className={`font-extrabold ${
                          rcp.isVoided ? 'line-through text-[#94A3B8]' : 'text-[#2878B8]'
                        }`}
                      >
                        {rcp.receiptNumber}
                      </p>
                      {rcp.isVoided ? (
                        <Badge tone="danger">Đã hủy (Voided)</Badge>
                      ) : (
                        <Badge tone="success">Hợp lệ</Badge>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-xs">
                    {formatDateTimeVi(rcp.issuedAt)}
                  </DataTableCell>
                  <DataTableCell>
                    <p className="font-semibold text-[#243B53]">{rcp.payerName}</p>
                    <p className="whitespace-nowrap text-xs text-[#64748B]">
                      {rcp.studentName ? `${rcp.studentName} • ` : ''}
                      {rcp.studentCode}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    <p className="font-medium text-[#243B53]">{rcp.reasonContent}</p>
                    <p className="text-[#64748B]">
                      GD: <strong>{rcp.transactionCode}</strong> • Khoản thu:{' '}
                      <strong>{rcp.receivableCode}</strong> •{' '}
                      {PAYMENT_METHOD_LABELS[rcp.paymentMethod]}
                    </p>
                    {rcp.isVoided && rcp.voidReason && (
                      <p className="mt-0.5 font-semibold text-[#B93A2E]">
                        Lý do hủy: {rcp.voidReason}
                      </p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-xs font-medium text-[#243B53]">
                    {rcp.cashierName}
                  </DataTableCell>
                  <DataTableCell
                    className={`whitespace-nowrap text-right font-extrabold ${
                      rcp.isVoided ? 'line-through text-[#94A3B8]' : 'text-[#1F7A4C]'
                    }`}
                  >
                    {formatVnd(rcp.amountVnd)}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-right">
                    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewingReceipt(rcp)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{rcp.isVoided ? 'Xem vết hủy' : 'Xem & In'}</span>
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableContainer>
      )}

      {/* Modal Lập phiếu thu từ giao dịch Confirmed */}
      <Modal
        open={createOpen}
        title="Lập Phiếu thu từ giao dịch đã xác nhận"
        onClose={() => setCreateOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        {eligibleTxs.length === 0 ? (
          <EmptyBlock
            title="Không còn giao dịch Đã xác nhận nào chưa xuất phiếu thu"
            description="Các giao dịch Chờ kiểm tra sao kê hoặc Đã hủy (Void) không được phép xuất phiếu thu."
          />
        ) : (
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <SelectField
              id="new-rcp-tx"
              label="Chọn giao dịch đã xác nhận *"
              value={activeEligibleTx?.id ?? ''}
              onChange={(e) => setSelectedTxId(e.target.value)}
              options={eligibleTxs.map((t) => ({
                value: t.id,
                label: `${t.transactionCode} – ${t.studentName} (${formatVnd(t.amountVnd)})`,
              }))}
            />
            {activeEligibleTx && (
              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
                <p>
                  <span className="text-[#64748B]">Người nộp:</span>{' '}
                  <strong>{activeEligibleTx.payerName}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Khoản phải thu:</span>{' '}
                  <strong>{activeEligibleTx.receivableCode}</strong> • Lớp{' '}
                  <strong>{activeEligibleTx.classCode}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Số tiền ghi trên phiếu:</span>{' '}
                  <strong className="text-[#1F7A4C]">{formatVnd(activeEligibleTx.amountVnd)}</strong>
                </p>
              </div>
            )}
            <InputField
              id="new-rcp-reason"
              label="Nội dung thu tiền in trên phiếu"
              placeholder="Để trống để tự động sinh theo tên khóa học & mã lớp"
              value={reasonContent}
              onChange={(e) => setReasonContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Xuất phiếu thu
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Xem chi tiết & In trình duyệt (Khóa in & đóng dấu VOIDED nếu phiếu đã hủy) */}
      <Modal
        open={Boolean(viewingReceipt)}
        title={`Phiếu thu ${viewingReceipt?.receiptNumber ?? ''}${viewingReceipt?.isVoided ? ' — ĐÃ HỦY (VOIDED)' : ''}`}
        onClose={() => setViewingReceipt(null)}
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewingReceipt(null)}>
              Đóng
            </Button>
            <Button
              disabled={Boolean(viewingReceipt?.isVoided)}
              onClick={() => {
                if (viewingReceipt?.isVoided) return
                window.print()
              }}
            >
              {viewingReceipt?.isVoided ? (
                <>
                  <Ban className="h-4 w-4" />
                  <span>Đã khóa in (Phiếu đã hủy)</span>
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  <span>In phiếu thu (Trình duyệt)</span>
                </>
              )}
            </Button>
          </>
        }
      >
        {viewingReceipt && (
          <div
            className={`relative overflow-hidden space-y-4 rounded-2xl border-2 bg-white p-6 text-sm text-[#243B53] ${
              viewingReceipt.isVoided ? 'border-[#B93A2E]' : 'border-[#2878B8]'
            }`}
          >
            {viewingReceipt.isVoided && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="-rotate-12 rounded-2xl border-4 border-[#B93A2E]/35 px-6 py-2 text-4xl font-black uppercase tracking-widest text-[#B93A2E]/25">
                    ĐÃ HỦY / VOIDED
                  </span>
                </div>
                <div className="relative rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
                  <p className="font-extrabold uppercase">
                    PHIẾU THU ĐÃ HỦY NGHIỆP VỤ (VOIDED) – KHÔNG CÓ GIÁ TRỊ CHỨNG TỪ THU TIỀN
                  </p>
                  <p className="mt-1">
                    Lý do hủy: <strong>{viewingReceipt.voidReason ?? 'Giao dịch gốc đã hủy'}</strong>
                    {viewingReceipt.voidedAt
                      ? ` • Thời điểm hủy: ${formatDateTimeVi(viewingReceipt.voidedAt)}`
                      : ''}
                  </p>
                </div>
              </>
            )}

            <div className="relative flex flex-wrap items-start justify-between gap-3 border-b border-[#DCEAF3] pb-4">
              <div>
                <p className="text-base font-black uppercase text-[#2878B8]">
                  <span className="text-[#F26522]">E</span>NGLISH CENTER – TRUNG TÂM ANH NGỮ
                </p>
                <p className="text-xs text-[#64748B]">
                  Chứng từ thu học phí nội bộ (Lưu hành đối chiếu học vụ – kế toán)
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-extrabold text-[#243B53]">
                  Số phiếu: {viewingReceipt.receiptNumber}
                </p>
                <p className="text-[#64748B]">
                  Ngày lập: {formatDateTimeVi(viewingReceipt.issuedAt)}
                </p>
              </div>
            </div>

            <div className="relative text-center">
              <h3 className="text-lg font-black uppercase tracking-wide text-[#243B53]">
                PHIẾU THU HỌC PHÍ
              </h3>
              <p className="text-xs text-[#64748B]">
                Mã giao dịch: <strong>{viewingReceipt.transactionCode}</strong> • Mã khoản phải thu:{' '}
                <strong>{viewingReceipt.receivableCode}</strong>
              </p>
            </div>

            <div className="relative space-y-2 rounded-xl bg-[#F8FBFD] p-4 text-xs sm:text-sm">
              <p>
                <span className="text-[#64748B]">Họ và tên người nộp tiền:</span>{' '}
                <strong>{viewingReceipt.payerName}</strong> (Mã học viên:{' '}
                <strong>{viewingReceipt.studentCode}</strong>
                {viewingReceipt.studentName ? ` – ${viewingReceipt.studentName}` : ''})
              </p>
              <p>
                <span className="text-[#64748B]">Lý do nộp:</span>{' '}
                <strong>{viewingReceipt.reasonContent}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Phương thức thanh toán:</span>{' '}
                <strong>{PAYMENT_METHOD_LABELS[viewingReceipt.paymentMethod]}</strong>
              </p>
              <p className="text-base">
                <span className="text-[#64748B]">Số tiền ghi nhận:</span>{' '}
                <strong
                  className={`text-lg font-black ${
                    viewingReceipt.isVoided ? 'line-through text-[#B93A2E]' : 'text-[#1F7A4C]'
                  }`}
                >
                  {formatVnd(viewingReceipt.amountVnd)}
                </strong>
              </p>
            </div>

            <div className="relative grid grid-cols-2 gap-4 pt-4 text-center text-xs">
              <div>
                <p className="font-bold text-[#243B53]">Người nộp tiền</p>
                <p className="text-[11px] italic text-[#64748B]">(Ký, ghi rõ họ tên)</p>
                <p className="mt-10 font-semibold text-[#243B53]">{viewingReceipt.payerName}</p>
              </div>
              <div>
                <p className="font-bold text-[#243B53]">Kế toán / Người lập phiếu</p>
                <p className="text-[11px] italic text-[#64748B]">(Ký, ghi rõ họ tên)</p>
                <p className="mt-10 font-semibold text-[#243B53]">{viewingReceipt.cashierName}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
