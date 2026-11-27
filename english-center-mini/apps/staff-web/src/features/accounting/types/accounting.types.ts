import type {
  AccountingReceivableDto,
  AccountingReceivableStatus,
  PaymentMethodCode,
  PaymentReceiptDto,
  PaymentTransactionDto,
  PaymentTransactionStatus,
  RefundRequestDto,
  RefundStatus,
  TransactionAuditLogDto,
} from '@english-center/contracts'
import type { BadgeTone } from '@english-center/ui'

export const RECEIVABLE_STATUS_META: Record<
  AccountingReceivableStatus,
  { label: string; tone: BadgeTone }
> = {
  Unpaid: { label: 'Chưa thanh toán', tone: 'warning' },
  PartiallyPaid: { label: 'Thanh toán một phần', tone: 'info' },
  Paid: { label: 'Đã thanh toán đủ', tone: 'success' },
  Overdue: { label: 'Quá hạn công nợ', tone: 'danger' },
  Cancelled: { label: 'Đã hủy nghiệp vụ', tone: 'neutral' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  cash: 'Tiền mặt tại quầy',
  bank_transfer: 'Chuyển khoản ngân hàng (đối chiếu thủ công)',
}

export const TRANSACTION_STATUS_META: Record<
  PaymentTransactionStatus,
  { label: string; tone: BadgeTone }
> = {
  Confirmed: { label: 'Đã xác nhận', tone: 'success' },
  PendingVerification: { label: 'Chờ kiểm tra sao kê', tone: 'warning' },
  Voided: { label: 'Đã hủy giao dịch (Void)', tone: 'danger' },
}

export const REFUND_STATUS_META: Record<RefundStatus, { label: string; tone: BadgeTone }> = {
  Requested: { label: 'Mới yêu cầu', tone: 'info' },
  PendingApproval: { label: 'Chờ duyệt hoàn', tone: 'warning' },
  Approved: { label: 'Đã duyệt hoàn', tone: 'info' },
  Rejected: { label: 'Từ chối hoàn', tone: 'danger' },
  Completed: { label: 'Đã hoàn tiền xong', tone: 'success' },
  Cancelled: { label: 'Đã hủy yêu cầu', tone: 'neutral' },
}

export interface EnrichedReceivableItem extends AccountingReceivableDto {
  paidConfirmedVnd: number
  pendingVerificationVnd: number
  refundedCompletedVnd: number
  remainingVnd: number
  netCollectedVnd: number
  derivedStatus: AccountingReceivableStatus
  transactionsCount: number
}

export interface ReceivableDetailBundle {
  receivable: EnrichedReceivableItem
  transactions: PaymentTransactionDto[]
  receipts: PaymentReceiptDto[]
  refunds: RefundRequestDto[]
}

export interface UnbilledEnrollmentOption {
  enrollmentId: string
  enrollmentCode: string
  studentId: string
  studentCode: string
  studentName: string
  studentPhone: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchId: string
  branchName: string
  agreedTuitionVnd: number
  suggestedPolicyId?: string
  suggestedPolicyCode?: string
  listedTuitionVnd: number
  suggestedDiscountVnd: number
}

export interface CreateReceivableInput {
  enrollmentId: string
  discountAmountVnd: number
  discountReason?: string
  dueDate: string
  note?: string
}

export interface RecordPaymentInput {
  receivableId: string
  amountVnd: number
  paymentMethod: PaymentMethodCode
  payerName: string
  paidDate?: string
  markAsConfirmed: boolean
  issueReceiptImmediately: boolean
  bankName?: string
  referenceCode?: string
  transferContent?: string
  note?: string
}

export interface CreateRefundInput {
  originalTransactionId: string
  amountVnd: number
  paymentMethod: PaymentMethodCode
  reason: string
}

export type AccountingDashboardPeriod = 'today' | 'this_month' | '30d' | 'all'

export interface AccountingDashboardData {
  period: AccountingDashboardPeriod
  kpis: {
    collectedTodayVnd: number
    collectedThisMonthVnd: number
    collectedInPeriodVnd: number
    totalReceivablesVnd: number
    totalOutstandingDebtVnd: number
    overdueDebtVnd: number
    transactionsTodayCount: number
    transactionsThisMonthCount: number
    transactionsInPeriodCount: number
    pendingVerificationCount: number
    overdueReceivablesCount: number
  }
  dailyRevenueSeries: { label: string; value: number; formattedValue: string }[]
  monthlyRevenueSeries: { label: string; value: number; formattedValue: string }[]
  revenueByCourseSeries: { label: string; value: number; formattedValue: string }[]
  revenueByClassSeries: { label: string; value: number; formattedValue: string }[]
  debtBreakdownSlices: { label: string; value: number; color: string }[]
  recentTransactions: PaymentTransactionDto[]
  upcomingDueReceivables: EnrichedReceivableItem[]
  overdueReceivables: EnrichedReceivableItem[]
  pendingTransactions: PaymentTransactionDto[]
}

export interface FinancialReportFilters {
  fromDate: string
  toDate: string
  courseId: string
  classId: string
  branchId: string
  paymentMethod: 'ALL' | PaymentMethodCode
  transactionStatus: 'ALL' | PaymentTransactionStatus
}

export interface FinancialReportSummary {
  totalReceivableVnd: number
  totalCollectedVnd: number
  totalRefundedVnd: number
  netCollectedVnd: number
  outstandingDebtVnd: number
  collectionRatePercent: number
  byCourseRows: {
    courseId: string
    courseName: string
    receivableVnd: number
    collectedVnd: number
    refundedVnd: number
    netVnd: number
    debtVnd: number
  }[]
  byBranchRows: {
    branchId: string
    branchName: string
    receivableVnd: number
    collectedVnd: number
    refundedVnd: number
    netVnd: number
    debtVnd: number
  }[]
  filteredTransactions: PaymentTransactionDto[]
  filteredRefunds: RefundRequestDto[]
  auditLogs: TransactionAuditLogDto[]
}
