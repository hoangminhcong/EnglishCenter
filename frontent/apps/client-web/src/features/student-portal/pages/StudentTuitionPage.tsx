import { useEffect, useState } from 'react';
import { Clock, Eye, Printer, Receipt } from 'lucide-react';
import type {
  StudentReceiptViewDto,
  StudentTuitionItemDto,
} from '@english-center/contracts';
import {
  formatDate,
  formatDateTimeVi,
  formatVnd,
} from '@english-center/utils';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useStudentPortalData,
  useStudentTuitionOverview,
} from '../hooks/useStudentPortal';
import { ReceivableStatusChip } from '../components/PortalUiBits';
import { PAYMENT_METHOD_LABELS } from '../model/studentPortal.types';

interface SelectedReceiptContext {
  item: StudentTuitionItemDto;
  receipt: StudentReceiptViewDto;
}

export function StudentTuitionPage() {
  const { user } = useAuth();
  const {
    data: tuitionData,
    isLoading,
    isError,
    refetch,
  } = useStudentTuitionOverview();
  const { data: portalData } = useStudentPortalData();

  const [selectedReceiptCtx, setSelectedReceiptCtx] =
    useState<SelectedReceiptContext | null>(null);

  useEffect(() => {
    if (!selectedReceiptCtx) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedReceiptCtx(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReceiptCtx]);

  if (isLoading) {
    return <LoadingBlock label="Đang tải thông tin học phí và phiếu thu..." />;
  }

  if (isError || !tuitionData) {
    return (
      <ErrorBlock
        message="Không thể tải thông tin học phí. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const studentDisplayName =
    portalData?.student.fullName || user?.fullName || 'Học viên';
  const studentDisplayCode =
    tuitionData.studentCode.trim() ||
    portalData?.student.studentCode.trim() ||
    'Chưa cấp mã';

  const handlePrintReceipt = () => {
    try {
      window.print();
    } catch {
      // ignore print error
    }
  };

  return (
    <div>
      {/* 1. Ba thẻ KPI tổng hợp công nợ & thanh toán */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Tổng học phí phải thu
          </span>
          <b className="mt-0.5 block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {formatVnd(tuitionData.totalReceivableVnd)}
          </b>
          <span className="text-[13px] text-[#64748B]">
            Mã học viên: {studentDisplayCode}
          </span>
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Đã thanh toán xác nhận
          </span>
          <b className="mt-0.5 block text-[26px] font-bold leading-[1.25] text-[#25805A] tabular-nums">
            {formatVnd(tuitionData.totalPaidConfirmedVnd)}
          </b>
          <span className="text-[13px] text-[#64748B]">
            Các khoản đã được Kế toán xác nhận
          </span>
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">Còn phải thu</span>
          <b
            className={`mt-0.5 block text-[26px] font-bold leading-[1.25] tabular-nums ${
              tuitionData.totalRemainingVnd > 0
                ? 'text-[#B93A2E]'
                : 'text-[#243B53]'
            }`}
          >
            {formatVnd(tuitionData.totalRemainingVnd)}
          </b>
          <span className="text-[13px] text-[#64748B]">
            {tuitionData.totalRemainingVnd > 0
              ? 'Số dư học phí cần hoàn tất'
              : 'Không còn công nợ tồn đọng'}
          </span>
        </div>
      </div>

      {/* 2. Danh sách khoản học phí theo từng đợt ghi danh */}
      <div className="mt-4 space-y-4">
        {tuitionData.items.length === 0 ? (
          <EmptyBlock title="Chưa có khoản học phí phát sinh." />
        ) : (
          tuitionData.items.map((item) => (
            <section
              key={item.receivableId}
              className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-[#DCEAF3] pb-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Mã khoản thu: <b>{item.receivableCode}</b> • {item.branchName}
                  </div>
                  <h2 className="mt-0.5 text-[17px] font-bold text-[#243B53]">
                    {item.courseName} — Lớp {item.classCode}
                  </h2>
                </div>
                <ReceivableStatusChip status={item.status} />
              </div>

              {/* Chi tiết học phí của lớp */}
              <div className="mt-3.5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Học phí niêm yết
                  </div>
                  <b className="text-[15px] font-bold text-[#243B53] tabular-nums">
                    {formatVnd(item.listedTuitionVnd)}
                  </b>
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Ưu đãi / Học bổng
                  </div>
                  <b className="text-[15px] font-bold text-[#2878B8] tabular-nums">
                    {item.discountAmountVnd > 0
                      ? `-${formatVnd(item.discountAmountVnd)}`
                      : formatVnd(0)}
                  </b>
                  {item.discountReason ? (
                    <div className="mt-0.5 text-[12px] text-[#64748B]">
                      {item.discountReason}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Tổng phải thu
                  </div>
                  <b className="text-[15px] font-bold text-[#243B53] tabular-nums">
                    {formatVnd(item.totalReceivableVnd)}
                  </b>
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Đã thanh toán xác nhận
                  </div>
                  <b className="text-[15px] font-bold text-[#25805A] tabular-nums">
                    {formatVnd(item.paidConfirmedVnd)}
                  </b>
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] text-[#64748B]">
                    Còn phải thu (Hạn {formatDate(item.dueDate)})
                  </div>
                  <b
                    className={`text-[15px] font-bold tabular-nums ${
                      item.remainingVnd > 0
                        ? 'text-[#B93A2E]'
                        : 'text-[#243B53]'
                    }`}
                  >
                    {formatVnd(item.remainingVnd)}
                  </b>
                </div>
              </div>

              {/* Thông báo giao dịch đang chờ Kế toán đối chiếu sao kê */}
              {item.pendingVerificationVnd > 0 ? (
                <div className="mt-3.5 flex items-start gap-2 rounded-[10px] border border-[#F5D487] bg-[#FDF8E8] px-3.5 py-2.5 text-[13px] text-[#9A6700]">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Đang có khoản thanh toán{' '}
                    <b className="tabular-nums">
                      {formatVnd(item.pendingVerificationVnd)}
                    </b>{' '}
                    chờ bộ phận Kế toán kiểm tra sao kê và xác nhận chính thức.
                  </span>
                </div>
              ) : null}

              {/* Danh sách phiếu thu chính thức */}
              <div className="mt-4 border-t border-[#DCEAF3] pt-3.5">
                <h3 className="flex items-center gap-1.5 text-[14.5px] font-bold text-[#243B53]">
                  <Receipt className="h-4 w-4 text-[#2878B8]" />
                  <span>Phiếu thu chính thức ({item.receipts.length})</span>
                </h3>

                {item.receipts.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-[#64748B]">
                    Chưa có phiếu thu được cấp cho khoản học phí này.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-left text-[13.5px]">
                      <thead>
                        <tr className="border-b border-[#DCEAF3] text-[#243B53]">
                          <th className="p-2.5 font-bold">Số phiếu thu</th>
                          <th className="p-2.5 font-bold">Mã giao dịch</th>
                          <th className="p-2.5 font-bold">Phương thức</th>
                          <th className="p-2.5 font-bold">Ngày cấp</th>
                          <th className="p-2.5 text-right font-bold">Số tiền</th>
                          <th className="p-2.5 text-right font-bold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.receipts.map((rcp) => (
                          <tr
                            key={rcp.id}
                            className="border-b border-[#DCEAF3] align-middle last:border-b-0"
                          >
                            <td className="p-2.5 font-semibold text-[#243B53]">
                              {rcp.receiptNumber}
                            </td>
                            <td className="p-2.5 text-[#64748B]">
                              {rcp.transactionCode}
                            </td>
                            <td className="p-2.5">
                              {PAYMENT_METHOD_LABELS[rcp.paymentMethod]}
                            </td>
                            <td className="p-2.5 text-[#64748B]">
                              {formatDateTimeVi(rcp.issuedAt)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-[#25805A] tabular-nums">
                              {formatVnd(rcp.amountVnd)}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedReceiptCtx({ item, receipt: rcp })
                                }
                                className="no-print inline-flex items-center gap-1.5 rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#2878B8] transition hover:brightness-95"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Xem phiếu thu</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Modal chi tiết Phiếu thu chính thức */}
      {selectedReceiptCtx ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedReceiptCtx(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#243B53]/45 p-4"
        >
          <div className="max-h-[calc(100vh-32px)] w-full max-w-[540px] overflow-auto rounded-[14px] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#DCEAF3] pb-3">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[#2878B8]">
                  Chứng từ thu học phí xác nhận
                </span>
                <h2
                  id="receipt-modal-title"
                  className="text-[18px] font-bold text-[#243B53]"
                >
                  Phiếu thu {selectedReceiptCtx.receipt.receiptNumber}
                </h2>
              </div>
              <ReceivableStatusChip status={selectedReceiptCtx.item.status} />
            </div>

            <div className="mt-3.5 space-y-2.5 text-[14px]">
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Học viên:</span>
                <b className="text-right text-[#243B53]">
                  {studentDisplayName} ({studentDisplayCode})
                </b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Khóa học &amp; Lớp:</span>
                <b className="text-right text-[#243B53]">
                  {selectedReceiptCtx.item.courseName} —{' '}
                  {selectedReceiptCtx.item.classCode}
                </b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Cơ sở:</span>
                <span className="text-right text-[#243B53]">
                  {selectedReceiptCtx.item.branchName}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Mã khoản phải thu:</span>
                <span className="text-right font-medium text-[#243B53]">
                  {selectedReceiptCtx.item.receivableCode}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Mã giao dịch:</span>
                <span className="text-right font-medium text-[#243B53]">
                  {selectedReceiptCtx.receipt.transactionCode}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Phương thức thanh toán:</span>
                <span className="text-right text-[#243B53]">
                  {PAYMENT_METHOD_LABELS[selectedReceiptCtx.receipt.paymentMethod]}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Thời điểm thanh toán:</span>
                <span className="text-right text-[#243B53]">
                  {formatDateTimeVi(selectedReceiptCtx.receipt.paidAt)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Thời điểm lập phiếu:</span>
                <span className="text-right text-[#243B53]">
                  {formatDateTimeVi(selectedReceiptCtx.receipt.issuedAt)}
                </span>
              </div>
              <div className="rounded-[10px] bg-[#F5FAFE] p-3">
                <div className="text-[12.5px] text-[#64748B]">Nội dung thu</div>
                <div className="mt-0.5 font-medium text-[#243B53]">
                  {selectedReceiptCtx.receipt.reasonContent}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-[#DCEAF3] bg-[#E4F4EC]/50 px-3.5 py-2.5">
                <span className="font-semibold text-[#243B53]">
                  Số tiền đã thu xác nhận
                </span>
                <b className="text-[18px] font-extrabold text-[#25805A] tabular-nums">
                  {formatVnd(selectedReceiptCtx.receipt.amountVnd)}
                </b>
              </div>
            </div>

            <div className="no-print mt-4 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2878B8] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#1F6399]"
              >
                <Printer className="h-4 w-4" />
                <span>In phiếu thu</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceiptCtx(null)}
                className="inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-4 py-2 text-[14px] font-semibold text-[#2878B8] transition hover:brightness-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
