import {
  deriveAccountingReceivableStatus,
  type AccountingReceivableDto,
  type PaymentReceiptDto,
  type PaymentTransactionDto,
  type RefundRequestDto,
  type RefundStatus,
  type TransactionAuditLogDto,
} from '@english-center/contracts'
import { formatVnd, getTodayIsoInVietnam, shiftIsoYmd } from '@english-center/utils'
import { tuitionApi } from '@/features/tuition/api/tuitionApi'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/mock/mockStorage'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
  shiftIsoYearMonth,
  writeAccountingOpsStore,
  type AccountingOpsMockState,
} from '@/services/mock/operationsMockStore'
import { createUniqueId, toVietnamYmd } from '@/shared/utils/staffFormatters'
import type {
  AccountingDashboardData,
  AccountingDashboardPeriod,
  CreateReceivableInput,
  CreateRefundInput,
  EnrichedReceivableItem,
  FinancialReportFilters,
  FinancialReportSummary,
  ReceivableDetailBundle,
  RecordPaymentInput,
  UnbilledEnrollmentOption,
} from '@/features/accounting/types/accounting.types'

export interface AccountingActor {
  userId: string
  fullName: string
  canApproveRefunds: boolean
}

function formatMillionShort(vnd: number): string {
  if (vnd === 0) return '0đ'
  if (vnd >= 1_000_000) {
    return `${(vnd / 1_000_000).toFixed(1)}tr`
  }
  return `${Math.round(vnd / 1_000)}k`
}

function enrichReceivable(
  rcv: AccountingReceivableDto,
  store: AccountingOpsMockState,
  todayYmdVn: string,
): EnrichedReceivableItem {
  const rcvTxs = store.transactions.filter((t) => t.receivableId === rcv.id)
  const paidConfirmedVnd = rcvTxs
    .filter((t) => t.status === 'Confirmed')
    .reduce((sum, t) => sum + t.amountVnd, 0)
  const pendingVerificationVnd = rcvTxs
    .filter((t) => t.status === 'PendingVerification')
    .reduce((sum, t) => sum + t.amountVnd, 0)
  const refundedCompletedVnd = store.refunds
    .filter((rf) => rf.receivableId === rcv.id && rf.status === 'Completed')
    .reduce((sum, rf) => sum + rf.amountVnd, 0)

  const remainingVnd = rcv.isCancelled
    ? 0
    : Math.max(0, rcv.totalReceivableVnd - paidConfirmedVnd)

  const derivedStatus = deriveAccountingReceivableStatus({
    isCancelled: rcv.isCancelled,
    totalReceivableVnd: rcv.totalReceivableVnd,
    paidConfirmedVnd,
    dueDate: rcv.dueDate,
    todayYmdVn,
  })

  return {
    ...rcv,
    paidConfirmedVnd,
    pendingVerificationVnd,
    refundedCompletedVnd,
    remainingVnd,
    netCollectedVnd: Math.max(0, paidConfirmedVnd - refundedCompletedVnd),
    derivedStatus,
    transactionsCount: rcvTxs.length,
  }
}

export function computeRefundableCeilingForTransaction(
  tx: PaymentTransactionDto,
  allRefunds: readonly RefundRequestDto[],
): number {
  if (tx.status !== 'Confirmed') return 0
  const committedRefunds = allRefunds
    .filter(
      (r) =>
        r.originalTransactionId === tx.id &&
        r.status !== 'Rejected' &&
        r.status !== 'Cancelled',
    )
    .reduce((sum, r) => sum + r.amountVnd, 0)
  return Math.max(0, tx.amountVnd - committedRefunds)
}

const REFUND_ALLOWED_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  Requested: ['PendingApproval', 'Cancelled'],
  PendingApproval: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Completed', 'Cancelled'],
  Rejected: [],
  Completed: [],
  Cancelled: [],
}

export const accountingApi = {
  async getDashboardData(
    todayYmdVn = getTodayIsoInVietnam(),
    period: AccountingDashboardPeriod = 'this_month',
  ): Promise<AccountingDashboardData> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AccountingDashboardData>(
        `${STAFF_API_ENDPOINTS.accounting.dashboard}?today=${encodeURIComponent(todayYmdVn)}&period=${period}`,
      )
    }

    await mockDelay(120)
    const store = readAccountingOpsStore()
    const enrichedReceivables = store.receivables.map((r) => enrichReceivable(r, store, todayYmdVn))
    const activeReceivables = enrichedReceivables.filter((r) => !r.isCancelled)

    const currentMonthYm = todayYmdVn.slice(0, 7)
    const thirtyDaysAgoYmd = shiftIsoYmd(todayYmdVn, -29)

    const matchesPeriod = (iso: string): boolean => {
      const ymd = toVietnamYmd(iso)
      if (period === 'today') return ymd === todayYmdVn
      if (period === 'this_month') return ymd.slice(0, 7) === currentMonthYm
      if (period === '30d') return ymd >= thirtyDaysAgoYmd && ymd <= todayYmdVn
      return true
    }

    const confirmedTxs = store.transactions.filter((t) => t.status === 'Confirmed')
    const periodConfirmedTxs = confirmedTxs.filter((t) => matchesPeriod(t.paidAt))

    const collectedTodayVnd = confirmedTxs
      .filter((t) => toVietnamYmd(t.paidAt) === todayYmdVn)
      .reduce((sum, t) => sum + t.amountVnd, 0)

    const collectedThisMonthVnd = confirmedTxs
      .filter((t) => toVietnamYmd(t.paidAt).slice(0, 7) === currentMonthYm)
      .reduce((sum, t) => sum + t.amountVnd, 0)

    const collectedInPeriodVnd = periodConfirmedTxs.reduce((sum, t) => sum + t.amountVnd, 0)

    const totalReceivablesVnd = activeReceivables.reduce((sum, r) => sum + r.totalReceivableVnd, 0)
    const totalOutstandingDebtVnd = activeReceivables.reduce((sum, r) => sum + r.remainingVnd, 0)

    const transactionsTodayCount = store.transactions.filter(
      (t) => toVietnamYmd(t.paidAt) === todayYmdVn && t.status !== 'Voided',
    ).length
    const transactionsThisMonthCount = store.transactions.filter(
      (t) => toVietnamYmd(t.paidAt).slice(0, 7) === currentMonthYm && t.status !== 'Voided',
    ).length
    const transactionsInPeriodCount = store.transactions.filter(
      (t) => matchesPeriod(t.paidAt) && t.status !== 'Voided',
    ).length

    const pendingTransactions = store.transactions
      .filter((t) => t.status === 'PendingVerification')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const overdueReceivables = activeReceivables
      .filter((r) => r.derivedStatus === 'Overdue')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    const overdueDebtVnd = overdueReceivables.reduce((sum, r) => sum + r.remainingVnd, 0)

    const upcomingDueReceivables = activeReceivables
      .filter((r) => r.remainingVnd > 0 && r.dueDate >= todayYmdVn)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    // Biểu đồ thực thu 7 ngày gần nhất (theo giờ VN)
    const dailyRevenueSeries = [-6, -5, -4, -3, -2, -1, 0].map((offset) => {
      const ymd = shiftIsoYmd(todayYmdVn, offset)
      const val = confirmedTxs
        .filter((t) => toVietnamYmd(t.paidAt) === ymd)
        .reduce((sum, t) => sum + t.amountVnd, 0)
      return {
        label: `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`,
        value: Math.round(val / 1_000),
        formattedValue: formatMillionShort(val),
      }
    })

    // Biểu đồ thực thu 6 tháng gần nhất (theo giờ VN)
    const monthlyRevenueSeries = [-5, -4, -3, -2, -1, 0].map((offset) => {
      const ym = shiftIsoYearMonth(todayYmdVn, offset)
      const val = confirmedTxs
        .filter((t) => toVietnamYmd(t.paidAt).slice(0, 7) === ym)
        .reduce((sum, t) => sum + t.amountVnd, 0)
      return {
        label: `T${Number(ym.slice(5, 7))}`,
        value: Math.round(val / 1_000),
        formattedValue: formatMillionShort(val),
      }
    })

    // Thực thu theo khóa học theo kỳ lọc
    const courseRevMap = new Map<string, { label: string; value: number }>()
    for (const tx of periodConfirmedTxs) {
      const shortLabel = tx.courseName.split(' ')[0] ?? tx.courseId
      const cur = courseRevMap.get(tx.courseId) ?? { label: shortLabel, value: 0 }
      cur.value += tx.amountVnd
      courseRevMap.set(tx.courseId, cur)
    }
    const revenueByCourseSeries = Array.from(courseRevMap.values()).map((c) => ({
      label: c.label,
      value: Math.round(c.value / 1_000),
      formattedValue: formatMillionShort(c.value),
    }))

    // Thực thu theo lớp học theo kỳ lọc
    const classRevMap = new Map<string, number>()
    for (const tx of periodConfirmedTxs) {
      classRevMap.set(tx.classCode, (classRevMap.get(tx.classCode) ?? 0) + tx.amountVnd)
    }
    const revenueByClassSeries = Array.from(classRevMap.entries()).map(([code, val]) => ({
      label: code,
      value: Math.round(val / 1_000),
      formattedValue: formatMillionShort(val),
    }))

    const countByStatus = (st: EnrichedReceivableItem['derivedStatus']) =>
      enrichedReceivables.filter((r) => r.derivedStatus === st).length

    const debtBreakdownSlices = [
      { label: 'Đã thanh toán đủ', value: countByStatus('Paid'), color: '#1F7A4C' },
      { label: 'Thanh toán một phần', value: countByStatus('PartiallyPaid'), color: '#2878B8' },
      { label: 'Quá hạn công nợ', value: countByStatus('Overdue'), color: '#D9534F' },
      { label: 'Chưa thanh toán', value: countByStatus('Unpaid'), color: '#E69F00' },
    ]

    return {
      period,
      kpis: {
        collectedTodayVnd,
        collectedThisMonthVnd,
        collectedInPeriodVnd,
        totalReceivablesVnd,
        totalOutstandingDebtVnd,
        overdueDebtVnd,
        transactionsTodayCount,
        transactionsThisMonthCount,
        transactionsInPeriodCount,
        pendingVerificationCount: pendingTransactions.length,
        overdueReceivablesCount: overdueReceivables.length,
      },
      dailyRevenueSeries,
      monthlyRevenueSeries,
      revenueByCourseSeries,
      revenueByClassSeries,
      debtBreakdownSlices,
      recentTransactions: [...store.transactions]
        .filter((t) => matchesPeriod(t.paidAt))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .slice(0, 6),
      upcomingDueReceivables: upcomingDueReceivables.slice(0, 6),
      overdueReceivables,
      pendingTransactions,
    }
  },

  async listReceivables(todayYmdVn = getTodayIsoInVietnam()): Promise<EnrichedReceivableItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<EnrichedReceivableItem[]>(
        STAFF_API_ENDPOINTS.accounting.receivables,
      )
    }
    await mockDelay(100)
    const store = readAccountingOpsStore()
    return store.receivables
      .map((r) => enrichReceivable(r, store, todayYmdVn))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getReceivableDetail(
    receivableId: string,
    todayYmdVn = getTodayIsoInVietnam(),
  ): Promise<ReceivableDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ReceivableDetailBundle>(
        STAFF_API_ENDPOINTS.accounting.receivableDetail(receivableId),
      )
    }
    await mockDelay(90)
    const store = readAccountingOpsStore()
    const found = store.receivables.find((r) => r.id === receivableId)
    if (!found) {
      throw new StaffApiClientError('Không tìm thấy khoản phải thu.', 404)
    }
    return {
      receivable: enrichReceivable(found, store, todayYmdVn),
      transactions: store.transactions
        .filter((t) => t.receivableId === receivableId)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
      receipts: store.receipts
        .filter((rcp) => rcp.receivableId === receivableId)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
      refunds: store.refunds
        .filter((rf) => rf.receivableId === receivableId)
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    }
  },

  /**
   * Liệt kê các Enrollment hợp lệ (từ Academic) chưa được tạo Khoản phải thu để Kế toán khởi tạo.
   * Loại trừ Enrollment chuyển lớp, học lại miễn phí, khôi phục sau bảo lưu đã có công nợ hoặc học phí 0đ.
   */
  async listUnbilledEnrollments(): Promise<UnbilledEnrollmentOption[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<UnbilledEnrollmentOption[]>(
        STAFF_API_ENDPOINTS.accounting.unbilledEnrollments,
      )
    }

    await mockDelay(80)
    const [academicStore, accountingStore, policies] = await Promise.all([
      Promise.resolve(readAcademicOpsStore()),
      Promise.resolve(readAccountingOpsStore()),
      tuitionApi.listPolicies(),
    ])

    const billedEnrollmentIds = new Set(
      accountingStore.receivables
        .filter((r) => !r.isCancelled)
        .map((r) => r.enrollmentId),
    )

    const options: UnbilledEnrollmentOption[] = []
    for (const enr of academicStore.enrollments) {
      if (
        enr.status === 'dropped' ||
        enr.status === 'transferred' ||
        billedEnrollmentIds.has(enr.id) ||
        enr.billingExemptionReason === 'transfer' ||
        enr.billingExemptionReason === 'retake' ||
        enr.billingExemptionReason === 'return_from_hold' ||
        enr.agreedTuitionVnd <= 0
      ) {
        continue
      }

      const student = academicStore.students.find((s) => s.id === enr.studentId)
      if (!student) continue
      const activePolicy = policies.find(
        (p) => p.courseId === enr.courseId && p.status === 'active',
      )

      const listedVnd =
        enr.listedTuitionSnapshotVnd ?? activePolicy?.listedTuitionVnd ?? enr.agreedTuitionVnd
      const suggestedDiscountVnd =
        enr.discountSnapshotVnd ?? Math.max(0, listedVnd - enr.agreedTuitionVnd)
      const suggestedPolicyId = enr.tuitionPolicyIdSnapshot ?? activePolicy?.id
      const suggestedPolicyCode = enr.tuitionPolicyCodeSnapshot ?? activePolicy?.policyCode

      options.push({
        enrollmentId: enr.id,
        enrollmentCode: enr.enrollmentCode,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        studentPhone: student.phone,
        courseId: enr.courseId,
        courseName: enr.courseName,
        classId: enr.classId,
        classCode: enr.classCode,
        branchId: enr.branchId,
        branchName: enr.branchName,
        agreedTuitionVnd: enr.agreedTuitionVnd,
        suggestedPolicyId,
        suggestedPolicyCode,
        listedTuitionVnd: listedVnd,
        suggestedDiscountVnd,
      })
    }

    return options
  },

  async createReceivable(
    actor: AccountingActor,
    input: CreateReceivableInput,
  ): Promise<EnrichedReceivableItem> {
    if (!input.enrollmentId) {
      throw new StaffApiClientError(
        'Vui lòng chọn học viên & bản ghi ghi danh (Enrollment) hợp lệ.',
        400,
      )
    }
    if (!input.dueDate) {
      throw new StaffApiClientError('Vui lòng chọn hạn thanh toán cho khoản phải thu.', 400)
    }
    if (input.discountAmountVnd < 0) {
      throw new StaffApiClientError('Mức ưu đãi giảm trừ không được là số âm.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<EnrichedReceivableItem>(
        STAFF_API_ENDPOINTS.accounting.receivables,
        input,
      )
    }

    await mockDelay()
    const unbilled = await this.listUnbilledEnrollments()
    const matched = unbilled.find((u) => u.enrollmentId === input.enrollmentId)
    if (!matched) {
      throw new StaffApiClientError(
        'Bản ghi ghi danh này không tồn tại hoặc đã có Khoản phải thu đang hiệu lực.',
        409,
      )
    }

    const totalReceivableVnd = Math.max(0, matched.listedTuitionVnd - input.discountAmountVnd)
    if (totalReceivableVnd <= 0) {
      throw new StaffApiClientError('Tổng số tiền phải thu sau ưu đãi phải lớn hơn 0đ.', 400)
    }

    const store = readAccountingOpsStore()
    const nowIso = new Date().toISOString()
    const seq = String(store.receivables.length + 1).padStart(4, '0')
    const created: AccountingReceivableDto = {
      id: createUniqueId('rcv'),
      receivableCode: `RCV-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      studentId: matched.studentId,
      studentCode: matched.studentCode,
      studentName: matched.studentName,
      studentPhone: matched.studentPhone,
      enrollmentId: matched.enrollmentId,
      courseId: matched.courseId,
      courseName: matched.courseName,
      classId: matched.classId,
      classCode: matched.classCode,
      branchId: matched.branchId,
      branchName: matched.branchName,
      tuitionPolicyId: matched.suggestedPolicyId,
      tuitionPolicyCode: matched.suggestedPolicyCode,
      listedTuitionVnd: matched.listedTuitionVnd,
      discountAmountVnd: input.discountAmountVnd,
      discountReason: input.discountReason?.trim() || undefined,
      totalReceivableVnd,
      dueDate: input.dueDate,
      isCancelled: false,
      note: input.note?.trim() || undefined,
      createdByUserId: actor.userId,
      createdByName: actor.fullName,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const nextStore: AccountingOpsMockState = {
      ...store,
      receivables: [created, ...store.receivables],
    }
    writeAccountingOpsStore(nextStore)
    return enrichReceivable(created, nextStore, getTodayIsoInVietnam())
  },

  async cancelReceivable(
    actor: AccountingActor,
    input: { receivableId: string; reason: string },
  ): Promise<EnrichedReceivableItem> {
    if (!input.reason.trim()) {
      throw new StaffApiClientError(
        'Bắt buộc nhập lý do hủy khoản phải thu để lưu vết kế toán.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<EnrichedReceivableItem>(
        STAFF_API_ENDPOINTS.accounting.receivableCancel(input.receivableId),
        { reason: input.reason.trim() },
      )
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const rcvIdx = store.receivables.findIndex((r) => r.id === input.receivableId)
    if (rcvIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy khoản phải thu.', 404)
    }
    const rcv = store.receivables[rcvIdx]!
    if (rcv.isCancelled) {
      throw new StaffApiClientError('Khoản phải thu này đã được hủy trước đó.', 400)
    }

    const rcvTxs = store.transactions.filter((t) => t.receivableId === rcv.id)
    const paidConfirmedVnd = rcvTxs
      .filter((t) => t.status === 'Confirmed')
      .reduce((sum, t) => sum + t.amountVnd, 0)
    const hasPendingVerification = rcvTxs.some((t) => t.status === 'PendingVerification')

    if (paidConfirmedVnd > 0 || hasPendingVerification) {
      throw new StaffApiClientError(
        'Chỉ được hủy khoản phải thu khi chưa phát sinh tiền thực thu (0đ) và không có giao dịch chờ kiểm tra sao kê.',
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const updatedRcv: AccountingReceivableDto = {
      ...rcv,
      isCancelled: true,
      note: [rcv.note, `Đã hủy nghiệp vụ bởi ${actor.fullName}: ${input.reason.trim()}`]
        .filter(Boolean)
        .join(' | '),
      updatedAt: nowIso,
    }

    const nextReceivables = [...store.receivables]
    nextReceivables[rcvIdx] = updatedRcv
    const nextStore: AccountingOpsMockState = {
      ...store,
      receivables: nextReceivables,
    }
    writeAccountingOpsStore(nextStore)
    return enrichReceivable(updatedRcv, nextStore, getTodayIsoInVietnam())
  },

  async listTransactions(): Promise<{
    transactions: PaymentTransactionDto[]
    auditLogs: TransactionAuditLogDto[]
  }> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<{
        transactions: PaymentTransactionDto[]
        auditLogs: TransactionAuditLogDto[]
      }>(STAFF_API_ENDPOINTS.accounting.transactions)
    }

    await mockDelay(90)
    const store = readAccountingOpsStore()
    return {
      transactions: [...store.transactions].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
      auditLogs: [...store.transactionAuditLogs].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      ),
    }
  },

  async recordPayment(
    actor: AccountingActor,
    input: RecordPaymentInput,
  ): Promise<{ transaction: PaymentTransactionDto; receipt?: PaymentReceiptDto }> {
    if (!Number.isFinite(input.amountVnd) || input.amountVnd <= 0) {
      throw new StaffApiClientError('Số tiền thanh toán phải lớn hơn 0đ (chặn số tiền âm/0đ).', 400)
    }
    if (!input.payerName.trim()) {
      throw new StaffApiClientError('Vui lòng nhập họ tên người nộp tiền.', 400)
    }
    if (input.paymentMethod === 'bank_transfer') {
      if (!input.bankName?.trim() || !input.referenceCode?.trim()) {
        throw new StaffApiClientError(
          'Thanh toán chuyển khoản bắt buộc nhập Ngân hàng nhận và Mã tham chiếu/Ủy nhiệm chi để đối chiếu thủ công.',
          400,
        )
      }
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<{
        transaction: PaymentTransactionDto
        receipt?: PaymentReceiptDto
      }>(STAFF_API_ENDPOINTS.accounting.payments, input)
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const rcvIdx = store.receivables.findIndex((r) => r.id === input.receivableId)
    if (rcvIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy khoản phải thu cần ghi nhận thanh toán.', 404)
    }
    const rcv = store.receivables[rcvIdx]!
    if (rcv.isCancelled) {
      throw new StaffApiClientError('Khoản phải thu này đã hủy, không thể thu tiền.', 400)
    }

    const committedAmount = store.transactions
      .filter(
        (t) =>
          t.receivableId === rcv.id &&
          (t.status === 'Confirmed' || t.status === 'PendingVerification'),
      )
      .reduce((sum, t) => sum + t.amountVnd, 0)

    const maxAllowedVnd = Math.max(0, rcv.totalReceivableVnd - committedAmount)
    if (input.amountVnd > maxAllowedVnd) {
      throw new StaffApiClientError(
        `Số tiền thu (${formatVnd(input.amountVnd)}) vượt quá số dư còn được phép thu (${formatVnd(maxAllowedVnd)} – đã tính các giao dịch chờ kiểm tra để chống thu vượt/cộng trùng).`,
        400,
      )
    }

    if (input.paymentMethod === 'bank_transfer' && input.referenceCode?.trim()) {
      const normalizedRef = input.referenceCode.trim().toUpperCase()
      const duplicateRef = store.transactions.find(
        (t) =>
          t.status !== 'Voided' &&
          t.bankTransferMeta?.referenceCode.toUpperCase() === normalizedRef,
      )
      if (duplicateRef) {
        throw new StaffApiClientError(
          `Mã tham chiếu chuyển khoản "${normalizedRef}" đã tồn tại ở giao dịch ${duplicateRef.transactionCode} (chặn hạch toán trùng).`,
          409,
        )
      }
    }

    const nowIso = new Date().toISOString()
    const paidIso = input.paidDate ? `${input.paidDate}T10:00:00.000Z` : nowIso
    const resolvedStatus =
      input.paymentMethod === 'cash' || input.markAsConfirmed
        ? 'Confirmed'
        : 'PendingVerification'

    const currentYear = getTodayIsoInVietnam().slice(0, 4)
    const txSeq = String(store.transactions.length + 1).padStart(4, '0')
    const txId = createUniqueId('pay')
    const txCode = `GD-${currentYear}-${txSeq}`

    let createdReceipt: PaymentReceiptDto | undefined
    let receiptId: string | undefined
    let receiptNumber: string | undefined

    if (resolvedStatus === 'Confirmed' && input.issueReceiptImmediately) {
      const rcpSeq = String(store.receipts.length + 1).padStart(4, '0')
      receiptId = createUniqueId('rcp')
      receiptNumber = `PT-${currentYear}-${rcpSeq}`
      createdReceipt = {
        id: receiptId,
        receiptNumber,
        transactionId: txId,
        transactionCode: txCode,
        receivableId: rcv.id,
        receivableCode: rcv.receivableCode,
        studentId: rcv.studentId,
        studentCode: rcv.studentCode,
        studentName: rcv.studentName,
        payerName: input.payerName.trim(),
        cashierUserId: actor.userId,
        cashierName: actor.fullName,
        amountVnd: input.amountVnd,
        paymentMethod: input.paymentMethod,
        reasonContent:
          input.note?.trim() ||
          `Thu học phí khóa ${rcv.courseName} – Lớp ${rcv.classCode} (${rcv.receivableCode})`,
        issuedAt: nowIso,
      }
    }

    const createdTx: PaymentTransactionDto = {
      id: txId,
      transactionCode: txCode,
      receivableId: rcv.id,
      receivableCode: rcv.receivableCode,
      studentId: rcv.studentId,
      studentCode: rcv.studentCode,
      studentName: rcv.studentName,
      courseId: rcv.courseId,
      courseName: rcv.courseName,
      classId: rcv.classId,
      classCode: rcv.classCode,
      branchId: rcv.branchId,
      branchName: rcv.branchName,
      amountVnd: input.amountVnd,
      paymentMethod: input.paymentMethod,
      paidAt: paidIso,
      payerName: input.payerName.trim(),
      recordedByUserId: actor.userId,
      recordedByName: actor.fullName,
      status: resolvedStatus,
      bankTransferMeta:
        input.paymentMethod === 'bank_transfer'
          ? {
              bankName: input.bankName!.trim(),
              referenceCode: input.referenceCode!.trim().toUpperCase(),
              transferContent: input.transferContent?.trim() || '',
              verifiedByName: resolvedStatus === 'Confirmed' ? actor.fullName : undefined,
              verifiedAt: resolvedStatus === 'Confirmed' ? nowIso : undefined,
            }
          : undefined,
      note: input.note?.trim() || undefined,
      receiptId,
      receiptNumber,
      createdAt: nowIso,
    }

    const nextReceivables = [...store.receivables]
    nextReceivables[rcvIdx] = { ...rcv, updatedAt: nowIso }

    writeAccountingOpsStore({
      ...store,
      receivables: nextReceivables,
      transactions: [createdTx, ...store.transactions],
      receipts: createdReceipt ? [createdReceipt, ...store.receipts] : store.receipts,
      transactionAuditLogs: [
        {
          id: createUniqueId('tal'),
          transactionId: createdTx.id,
          action: 'created',
          actorUserId: actor.userId,
          actorName: actor.fullName,
          occurredAt: nowIso,
          detail: `Ghi nhận ${formatVnd(createdTx.amountVnd)} (${createdTx.status}) cho ${rcv.receivableCode}.`,
        },
        ...store.transactionAuditLogs,
      ],
    })

    return { transaction: createdTx, receipt: createdReceipt }
  },

  async confirmBankTransfer(
    actor: AccountingActor,
    transactionId: string,
  ): Promise<PaymentTransactionDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<PaymentTransactionDto>(
        STAFF_API_ENDPOINTS.accounting.paymentConfirm(transactionId),
        {},
      )
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const idx = store.transactions.findIndex((t) => t.id === transactionId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy giao dịch.', 404)

    const tx = store.transactions[idx]!
    if (tx.status !== 'PendingVerification') {
      throw new StaffApiClientError('Chỉ giao dịch đang chờ kiểm tra sao kê mới cần xác nhận.', 400)
    }

    const nowIso = new Date().toISOString()
    const updated: PaymentTransactionDto = {
      ...tx,
      status: 'Confirmed',
      bankTransferMeta: tx.bankTransferMeta
        ? {
            ...tx.bankTransferMeta,
            verifiedByName: actor.fullName,
            verifiedAt: nowIso,
          }
        : undefined,
    }

    const nextTxs = [...store.transactions]
    nextTxs[idx] = updated

    writeAccountingOpsStore({
      ...store,
      transactions: nextTxs,
      transactionAuditLogs: [
        {
          id: createUniqueId('tal'),
          transactionId: tx.id,
          action: 'confirmed',
          actorUserId: actor.userId,
          actorName: actor.fullName,
          occurredAt: nowIso,
          detail: `Xác nhận thủ công giao dịch chuyển khoản ${tx.transactionCode} khớp sao kê ngân hàng.`,
        },
        ...store.transactionAuditLogs,
      ],
    })

    return updated
  },

  /**
   * Giao dịch tài chính KHÔNG được xóa tùy tiện. Nếu ghi sai, thực hiện Void (Hủy nghiệp vụ) kèm lý do bắt buộc,
   * đồng thời đánh dấu hủy (isVoided) lên Phiếu thu đã cấp (nếu có) và lưu Audit Log.
   */
  async voidTransaction(
    actor: AccountingActor,
    transactionId: string,
    voidReason: string,
  ): Promise<PaymentTransactionDto> {
    const trimmedReason = voidReason.trim()
    if (!trimmedReason) {
      throw new StaffApiClientError(
        'Bắt buộc nhập lý do hủy nghiệp vụ (Void) giao dịch để lưu vết kiểm toán.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<PaymentTransactionDto>(
        STAFF_API_ENDPOINTS.accounting.paymentVoid(transactionId),
        { voidReason: trimmedReason },
      )
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const idx = store.transactions.findIndex((t) => t.id === transactionId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy giao dịch.', 404)

    const tx = store.transactions[idx]!
    if (tx.status === 'Voided') {
      throw new StaffApiClientError('Giao dịch này đã ở trạng thái hủy nghiệp vụ.', 400)
    }

    const activeRefund = store.refunds.find(
      (r) =>
        r.originalTransactionId === tx.id &&
        r.status !== 'Rejected' &&
        r.status !== 'Cancelled',
    )
    if (activeRefund) {
      throw new StaffApiClientError(
        `Không thể hủy giao dịch ${tx.transactionCode} vì đang gắn với hồ sơ hoàn tiền ${activeRefund.refundCode} (${activeRefund.status}).`,
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const updated: PaymentTransactionDto = {
      ...tx,
      status: 'Voided',
      voidReason: trimmedReason,
      voidedAt: nowIso,
      voidedByName: actor.fullName,
    }

    const nextTxs = [...store.transactions]
    nextTxs[idx] = updated

    const nextReceipts = store.receipts.map((rcp) =>
      rcp.transactionId === tx.id
        ? {
            ...rcp,
            isVoided: true,
            voidReason: trimmedReason,
            voidedAt: nowIso,
          }
        : rcp,
    )

    writeAccountingOpsStore({
      ...store,
      transactions: nextTxs,
      receipts: nextReceipts,
      transactionAuditLogs: [
        {
          id: createUniqueId('tal'),
          transactionId: tx.id,
          action: 'voided',
          actorUserId: actor.userId,
          actorName: actor.fullName,
          occurredAt: nowIso,
          detail: `Hủy nghiệp vụ (Void) ${tx.transactionCode}${tx.receiptNumber ? ` (kèm hủy phiếu ${tx.receiptNumber})` : ''}: ${trimmedReason}`,
        },
        ...store.transactionAuditLogs,
      ],
    })

    return updated
  },

  async listReceipts(): Promise<{
    receipts: PaymentReceiptDto[]
    eligibleConfirmedTransactions: PaymentTransactionDto[]
  }> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<{
        receipts: PaymentReceiptDto[]
        eligibleConfirmedTransactions: PaymentTransactionDto[]
      }>(STAFF_API_ENDPOINTS.accounting.receipts)
    }

    await mockDelay(90)
    const store = readAccountingOpsStore()
    const receiptedTxIds = new Set(
      store.receipts.filter((r) => !r.isVoided).map((r) => r.transactionId),
    )
    const eligibleConfirmedTransactions = store.transactions.filter(
      (t) => t.status === 'Confirmed' && !receiptedTxIds.has(t.id),
    )
    return {
      receipts: [...store.receipts].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
      eligibleConfirmedTransactions,
    }
  },

  async createReceiptFromTransaction(
    actor: AccountingActor,
    input: { transactionId: string; reasonContent?: string; note?: string },
  ): Promise<PaymentReceiptDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<PaymentReceiptDto>(STAFF_API_ENDPOINTS.accounting.receipts, input)
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const txIdx = store.transactions.findIndex((t) => t.id === input.transactionId)
    if (txIdx === -1) {
      throw new StaffApiClientError('Không tìm thấy giao dịch gốc.', 404)
    }

    const tx = store.transactions[txIdx]!
    if (tx.status !== 'Confirmed') {
      throw new StaffApiClientError(
        'Chỉ được lập Phiếu thu chính thức cho giao dịch đã được xác nhận (Confirmed).',
        400,
      )
    }

    const existingReceipt = store.receipts.find((r) => r.transactionId === tx.id && !r.isVoided)
    if (existingReceipt) {
      throw new StaffApiClientError(
        `Giao dịch ${tx.transactionCode} đã được cấp phiếu thu ${existingReceipt.receiptNumber}.`,
        409,
      )
    }

    const nowIso = new Date().toISOString()
    const seq = String(store.receipts.length + 1).padStart(4, '0')
    const created: PaymentReceiptDto = {
      id: createUniqueId('rcp'),
      receiptNumber: `PT-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      transactionId: tx.id,
      transactionCode: tx.transactionCode,
      receivableId: tx.receivableId,
      receivableCode: tx.receivableCode,
      studentId: tx.studentId,
      studentCode: tx.studentCode,
      studentName: tx.studentName,
      payerName: tx.payerName,
      cashierUserId: actor.userId,
      cashierName: actor.fullName,
      amountVnd: tx.amountVnd,
      paymentMethod: tx.paymentMethod,
      reasonContent:
        input.reasonContent?.trim() ||
        `Thu học phí khóa ${tx.courseName} – Lớp ${tx.classCode} (${tx.receivableCode})`,
      issuedAt: nowIso,
      note: input.note?.trim() || undefined,
    }

    const nextTxs = [...store.transactions]
    nextTxs[txIdx] = {
      ...tx,
      receiptId: created.id,
      receiptNumber: created.receiptNumber,
    }

    writeAccountingOpsStore({
      ...store,
      transactions: nextTxs,
      receipts: [created, ...store.receipts],
    })

    return created
  },

  async listRefunds(): Promise<RefundRequestDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<RefundRequestDto[]>(STAFF_API_ENDPOINTS.accounting.refunds)
    }

    await mockDelay(90)
    const store = readAccountingOpsStore()
    return [...store.refunds].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  },

  async createRefundRequest(
    actor: AccountingActor,
    input: CreateRefundInput,
  ): Promise<RefundRequestDto> {
    if (!Number.isFinite(input.amountVnd) || input.amountVnd <= 0) {
      throw new StaffApiClientError('Số tiền yêu cầu hoàn phải lớn hơn 0đ.', 400)
    }
    if (!input.reason.trim()) {
      throw new StaffApiClientError('Bắt buộc nhập lý do hoàn tiền cụ thể.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<RefundRequestDto>(STAFF_API_ENDPOINTS.accounting.refunds, input)
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const tx = store.transactions.find((t) => t.id === input.originalTransactionId)
    if (!tx) {
      throw new StaffApiClientError('Không tìm thấy giao dịch gốc để liên kết hoàn tiền.', 404)
    }
    if (tx.status !== 'Confirmed') {
      throw new StaffApiClientError(
        'Chỉ được tạo yêu cầu hoàn tiền trên giao dịch gốc đã xác nhận (Confirmed).',
        400,
      )
    }

    const ceiling = computeRefundableCeilingForTransaction(tx, store.refunds)
    if (input.amountVnd > ceiling) {
      throw new StaffApiClientError(
        `Số tiền hoàn (${formatVnd(input.amountVnd)}) vượt quá hạn mức được phép hoàn của giao dịch ${tx.transactionCode} (${formatVnd(ceiling)}).`,
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const seq = String(store.refunds.length + 1).padStart(4, '0')
    const created: RefundRequestDto = {
      id: createUniqueId('rfd'),
      refundCode: `RF-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      receivableId: tx.receivableId,
      receivableCode: tx.receivableCode,
      originalTransactionId: tx.id,
      originalTransactionCode: tx.transactionCode,
      studentId: tx.studentId,
      studentCode: tx.studentCode,
      studentName: tx.studentName,
      courseId: tx.courseId,
      courseName: tx.courseName,
      classId: tx.classId,
      classCode: tx.classCode,
      branchId: tx.branchId,
      amountVnd: input.amountVnd,
      paymentMethod: input.paymentMethod,
      reason: input.reason.trim(),
      status: 'PendingApproval',
      requestedByUserId: actor.userId,
      requestedByName: actor.fullName,
      requestedAt: nowIso,
    }

    writeAccountingOpsStore({
      ...store,
      refunds: [created, ...store.refunds],
      transactionAuditLogs: [
        {
          id: createUniqueId('tal'),
          transactionId: tx.id,
          action: 'note_updated',
          actorUserId: actor.userId,
          actorName: actor.fullName,
          occurredAt: nowIso,
          detail: `Lập yêu cầu hoàn tiền ${created.refundCode} (${formatVnd(created.amountVnd)}) từ ${tx.transactionCode}: ${created.reason}`,
        },
        ...store.transactionAuditLogs,
      ],
    })

    return created
  },

  async transitionRefundStatus(
    actor: AccountingActor,
    input: { refundId: string; toStatus: RefundStatus; reviewNote?: string },
  ): Promise<RefundRequestDto> {
    if (
      (input.toStatus === 'Approved' ||
        input.toStatus === 'Rejected' ||
        input.toStatus === 'Completed') &&
      !actor.canApproveRefunds
    ) {
      throw new StaffApiClientError(
        'Bạn không có quyền phê duyệt hoặc hoàn tất yêu cầu hoàn tiền (finance.refunds.approve).',
        403,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<RefundRequestDto>(
        STAFF_API_ENDPOINTS.accounting.refundStatus(input.refundId),
        input,
      )
    }

    await mockDelay()
    const store = readAccountingOpsStore()
    const idx = store.refunds.findIndex((r) => r.id === input.refundId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy yêu cầu hoàn tiền.', 404)

    const current = store.refunds[idx]!
    const allowed = REFUND_ALLOWED_TRANSITIONS[current.status]
    if (!allowed.includes(input.toStatus)) {
      throw new StaffApiClientError(
        `Không thể chuyển trạng thái hoàn tiền từ "${current.status}" sang "${input.toStatus}".`,
        400,
      )
    }

    if (input.toStatus === 'Rejected' && !input.reviewNote?.trim()) {
      throw new StaffApiClientError('Vui lòng ghi rõ lý do từ chối yêu cầu hoàn tiền.', 400)
    }

    const nowIso = new Date().toISOString()
    const trimmedInputNote = input.reviewNote?.trim()
    const preservedReviewNote =
      input.toStatus === 'Completed' && current.reviewNote
        ? trimmedInputNote && trimmedInputNote !== current.reviewNote
          ? `${current.reviewNote} | Chi hoàn: ${trimmedInputNote}`
          : current.reviewNote
        : trimmedInputNote || current.reviewNote

    const updated: RefundRequestDto = {
      ...current,
      status: input.toStatus,
      reviewedByUserId:
        input.toStatus === 'Approved' || input.toStatus === 'Rejected'
          ? actor.userId
          : current.reviewedByUserId,
      reviewedByName:
        input.toStatus === 'Approved' || input.toStatus === 'Rejected'
          ? actor.fullName
          : current.reviewedByName,
      reviewedAt:
        input.toStatus === 'Approved' || input.toStatus === 'Rejected'
          ? nowIso
          : current.reviewedAt,
      reviewNote: preservedReviewNote,
      completedAt: input.toStatus === 'Completed' ? nowIso : current.completedAt,
    }

    const nextRefunds = [...store.refunds]
    nextRefunds[idx] = updated

    writeAccountingOpsStore({
      ...store,
      refunds: nextRefunds,
      transactionAuditLogs: [
        {
          id: createUniqueId('tal'),
          transactionId: current.originalTransactionId,
          action: 'note_updated',
          actorUserId: actor.userId,
          actorName: actor.fullName,
          occurredAt: nowIso,
          detail: `Cập nhật hồ sơ hoàn tiền ${current.refundCode}: ${current.status} → ${input.toStatus}${trimmedInputNote ? ` (${trimmedInputNote})` : ''}`,
        },
        ...store.transactionAuditLogs,
      ],
    })
    return updated
  },

  async getFinancialReport(
    filters: FinancialReportFilters,
    todayYmdVn = getTodayIsoInVietnam(),
  ): Promise<FinancialReportSummary> {
    if (!USE_STAFF_MOCK_API) {
      const qs = new URLSearchParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        courseId: filters.courseId,
        classId: filters.classId,
        branchId: filters.branchId,
        paymentMethod: filters.paymentMethod,
        transactionStatus: filters.transactionStatus,
      }).toString()
      return staffHttpClient.get<FinancialReportSummary>(
        `${STAFF_API_ENDPOINTS.accounting.reports}?${qs}`,
      )
    }

    await mockDelay(100)
    const store = readAccountingOpsStore()
    const enriched = store.receivables
      .filter((r) => !r.isCancelled)
      .map((r) => enrichReceivable(r, store, todayYmdVn))

    const matchScope = (item: {
      courseId: string
      classId: string
      branchId: string
    }) => {
      if (filters.courseId !== 'ALL' && item.courseId !== filters.courseId) return false
      if (filters.classId !== 'ALL' && item.classId !== filters.classId) return false
      if (filters.branchId !== 'ALL' && item.branchId !== filters.branchId) return false
      return true
    }

    const matchDate = (isoString: string) => {
      const ymd = toVietnamYmd(isoString)
      if (filters.fromDate && ymd < filters.fromDate) return false
      if (filters.toDate && ymd > filters.toDate) return false
      return true
    }

    const scopedReceivables = enriched.filter(
      (r) => matchScope(r) && matchDate(r.createdAt),
    )

    const filteredTransactions = store.transactions
      .filter(
        (t) =>
          (filters.transactionStatus === 'ALL' || t.status === filters.transactionStatus) &&
          matchScope(t) &&
          matchDate(t.paidAt) &&
          (filters.paymentMethod === 'ALL' || t.paymentMethod === filters.paymentMethod),
      )
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt))

    const confirmedTransactionsInPeriod = filteredTransactions.filter(
      (t) => t.status === 'Confirmed',
    )

    const filteredRefunds = store.refunds
      .filter(
        (rf) =>
          rf.status === 'Completed' &&
          matchScope(rf) &&
          matchDate(rf.completedAt ?? rf.requestedAt) &&
          (filters.paymentMethod === 'ALL' || rf.paymentMethod === filters.paymentMethod),
      )
      .sort((a, b) => (b.completedAt ?? b.requestedAt).localeCompare(a.completedAt ?? a.requestedAt))

    const totalReceivableVnd = scopedReceivables.reduce(
      (sum, r) => sum + r.totalReceivableVnd,
      0,
    )
    const totalCollectedVnd = confirmedTransactionsInPeriod.reduce(
      (sum, t) => sum + t.amountVnd,
      0,
    )
    const totalRefundedVnd = filteredRefunds.reduce((sum, rf) => sum + rf.amountVnd, 0)
    const netCollectedVnd = totalCollectedVnd - totalRefundedVnd
    const outstandingDebtVnd = scopedReceivables.reduce((sum, r) => sum + r.remainingVnd, 0)

    const confirmedCollectedOnScopedReceivablesVnd = scopedReceivables.reduce(
      (sum, r) => sum + r.paidConfirmedVnd,
      0,
    )
    const collectionRatePercent =
      totalReceivableVnd > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round((confirmedCollectedOnScopedReceivablesVnd / totalReceivableVnd) * 100),
            ),
          )
        : 0

    const courseMap = new Map<
      string,
      FinancialReportSummary['byCourseRows'][number]
    >()
    for (const r of scopedReceivables) {
      const cur = courseMap.get(r.courseId) ?? {
        courseId: r.courseId,
        courseName: r.courseName,
        receivableVnd: 0,
        collectedVnd: 0,
        refundedVnd: 0,
        netVnd: 0,
        debtVnd: 0,
      }
      cur.receivableVnd += r.totalReceivableVnd
      cur.debtVnd += r.remainingVnd
      courseMap.set(r.courseId, cur)
    }
    for (const t of confirmedTransactionsInPeriod) {
      const cur = courseMap.get(t.courseId) ?? {
        courseId: t.courseId,
        courseName: t.courseName,
        receivableVnd: 0,
        collectedVnd: 0,
        refundedVnd: 0,
        netVnd: 0,
        debtVnd: 0,
      }
      cur.collectedVnd += t.amountVnd
      courseMap.set(t.courseId, cur)
    }
    for (const rf of filteredRefunds) {
      const cur = courseMap.get(rf.courseId)
      if (cur) cur.refundedVnd += rf.amountVnd
    }
    const byCourseRows = Array.from(courseMap.values()).map((item) => ({
      ...item,
      netVnd: item.collectedVnd - item.refundedVnd,
    }))

    const branchMap = new Map<
      string,
      FinancialReportSummary['byBranchRows'][number]
    >()
    for (const r of scopedReceivables) {
      const cur = branchMap.get(r.branchId) ?? {
        branchId: r.branchId,
        branchName: r.branchName,
        receivableVnd: 0,
        collectedVnd: 0,
        refundedVnd: 0,
        netVnd: 0,
        debtVnd: 0,
      }
      cur.receivableVnd += r.totalReceivableVnd
      cur.debtVnd += r.remainingVnd
      branchMap.set(r.branchId, cur)
    }
    for (const t of confirmedTransactionsInPeriod) {
      const cur = branchMap.get(t.branchId) ?? {
        branchId: t.branchId,
        branchName: t.branchName,
        receivableVnd: 0,
        collectedVnd: 0,
        refundedVnd: 0,
        netVnd: 0,
        debtVnd: 0,
      }
      cur.collectedVnd += t.amountVnd
      branchMap.set(t.branchId, cur)
    }
    for (const rf of filteredRefunds) {
      const cur = branchMap.get(rf.branchId)
      if (cur) cur.refundedVnd += rf.amountVnd
    }
    const byBranchRows = Array.from(branchMap.values()).map((item) => ({
      ...item,
      netVnd: item.collectedVnd - item.refundedVnd,
    }))

    return {
      totalReceivableVnd,
      totalCollectedVnd,
      totalRefundedVnd,
      netCollectedVnd,
      outstandingDebtVnd,
      collectionRatePercent,
      byCourseRows,
      byBranchRows,
      filteredTransactions,
      filteredRefunds,
      auditLogs: store.transactionAuditLogs,
    }
  },
}
