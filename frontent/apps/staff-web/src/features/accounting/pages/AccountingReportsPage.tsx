import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
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
import type { PaymentMethodCode, PaymentTransactionStatus } from '@english-center/contracts'
import { formatDateTimeVi, formatVnd, getTodayIsoInVietnam } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { trainingApi } from '@/features/training/api/trainingApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { accountingApi } from '@/features/accounting/services/accountingApi'
import { ACCOUNTING_QUERY_KEYS } from '@/features/accounting/hooks/useAccounting'
import {
  PAYMENT_METHOD_LABELS,
  REFUND_STATUS_META,
  TRANSACTION_STATUS_META,
  type FinancialReportFilters,
} from '@/features/accounting/types/accounting.types'

export function AccountingReportsPage() {
  useDocumentTitle('Báo cáo tài chính')
  const { todayYmdVn } = useCurrentTime()

  const [filters, setFilters] = useState<FinancialReportFilters>({
    fromDate: `${getTodayIsoInVietnam().slice(0, 4)}-01-01`,
    toDate: todayYmdVn,
    courseId: 'ALL',
    classId: 'ALL',
    branchId: 'ALL',
    paymentMethod: 'ALL',
    transactionStatus: 'ALL',
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data: classes = [] } = useQuery({
    queryKey: ['staff', 'training', 'center-classes'],
    queryFn: () => trainingApi.listAllCenterClasses(),
  })

  const filtersKey = JSON.stringify(filters)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.reports(filtersKey),
    queryFn: () => accountingApi.getFinancialReport(filters, todayYmdVn),
  })

  if (isLoading) return <LoadingBlock label="Đang tổng hợp báo cáo tài chính..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải báo cáo tài chính."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo Tài chính – Thực thu, Hoàn tiền & Công nợ"
        description="Đối soát khoản phải thu, thực thu, hoàn tiền và công nợ theo kỳ."
      />

      {/* Bộ lọc đa chiều (gồm transactionStatus) */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-4">
        <InputField
          id="rep-from"
          type="date"
          label="Từ ngày"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
        />
        <InputField
          id="rep-to"
          type="date"
          label="Đến ngày"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
        />
        <SelectField
          id="rep-course"
          label="Khóa học"
          value={filters.courseId}
          onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}
          options={[
            { value: 'ALL', label: 'Tất cả khóa học' },
            ...courses.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SelectField
          id="rep-class"
          label="Lớp học"
          value={filters.classId}
          onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value }))}
          options={[
            { value: 'ALL', label: 'Tất cả lớp học' },
            ...classes.map((c) => ({ value: c.id, label: c.classCode })),
          ]}
        />
        <SelectField
          id="rep-branch"
          label="Cơ sở"
          value={filters.branchId}
          onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
          options={[
            { value: 'ALL', label: 'Tất cả cơ sở' },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <SelectField
          id="rep-method"
          label="Phương thức"
          value={filters.paymentMethod}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              paymentMethod: e.target.value as 'ALL' | PaymentMethodCode,
            }))
          }
          options={[
            { value: 'ALL', label: 'Mọi phương thức' },
            { value: 'cash', label: 'Tiền mặt' },
            { value: 'bank_transfer', label: 'Chuyển khoản' },
          ]}
        />
        <SelectField
          id="rep-tx-status"
          label="Trạng thái GD"
          value={filters.transactionStatus}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              transactionStatus: e.target.value as 'ALL' | PaymentTransactionStatus,
            }))
          }
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'Confirmed', label: 'Đã xác nhận' },
            { value: 'PendingVerification', label: 'Chờ kiểm tra CK' },
            { value: 'Voided', label: 'Đã hủy' },
          ]}
        />
      </div>

      {/* 6 thẻ tổng hợp tách bạch */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#64748B]">1. Tổng khoản phải thu</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#243B53] sm:text-xl">
            {formatVnd(data.totalReceivableVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#1F7A4C]">2. Tổng tiền thực thu</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#1F7A4C] sm:text-xl">
            {formatVnd(data.totalCollectedVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#B93A2E]">3. Tổng tiền đã hoàn</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#B93A2E] sm:text-xl">
            {formatVnd(data.totalRefundedVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-[#EEFBF3] p-4 shadow-2xs">
          <span className="text-xs font-bold text-[#1F7A4C]">4. Tiền thu ròng</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#1F7A4C] sm:text-xl">
            {formatVnd(data.netCollectedVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#B45309]">5. Công nợ còn phải thu</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#B45309] sm:text-xl">
            {formatVnd(data.outstandingDebtVnd)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-[#2878B8]">6. Tỷ lệ thu thực tế</span>
          <p className="mt-1.5 text-lg font-extrabold tabular-nums text-[#2878B8] sm:text-xl">
            {data.collectionRatePercent}%
          </p>
        </div>
      </div>

      {/* Tổng hợp theo Khóa học & Cơ sở */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            Đối soát theo Khóa học
          </h2>
          {data.byCourseRows.length === 0 ? (
            <EmptyBlock title="Không có dữ liệu trong kỳ lọc" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Khóa học</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Phải thu
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thực thu
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Hoàn
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thu ròng
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.byCourseRows.map((row) => (
                    <DataTableRow key={row.courseId}>
                      <DataTableCell className="font-semibold text-[#243B53]">
                        {row.courseName}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs">
                        {formatVnd(row.receivableVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs font-semibold text-[#1F7A4C]">
                        {formatVnd(row.collectedVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs text-[#B93A2E]">
                        {formatVnd(row.refundedVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#243B53]">
                        {formatVnd(row.netVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">Đối soát theo Cơ sở</h2>
          {data.byBranchRows.length === 0 ? (
            <EmptyBlock title="Không có dữ liệu trong kỳ lọc" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Cơ sở đào tạo</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Phải thu
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thực thu
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Còn nợ
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thu ròng
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.byBranchRows.map((row) => (
                    <DataTableRow key={row.branchId}>
                      <DataTableCell className="font-semibold text-[#243B53]">
                        {row.branchName}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs">
                        {formatVnd(row.receivableVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs font-semibold text-[#1F7A4C]">
                        {formatVnd(row.collectedVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right text-xs text-[#B93A2E]">
                        {formatVnd(row.debtVnd)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#243B53]">
                        {formatVnd(row.netVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      </div>

      {/* Bảng chi tiết các giao dịch thanh toán trong kỳ lọc (filteredTransactions) */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
            Chi tiết giao dịch thanh toán theo bộ lọc ({data.filteredTransactions.length})
          </h2>
          <Badge tone="info">Lọc theo múi giờ Việt Nam</Badge>
        </div>

        {data.filteredTransactions.length === 0 ? (
          <EmptyBlock title="Không có giao dịch thanh toán nào trong kỳ lọc" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã GD & Thời gian
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Học viên & Khoản phải thu</DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học / Lớp / Cơ sở</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Phương thức
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {data.filteredTransactions.map((tx) => {
                  const st = TRANSACTION_STATUS_META[tx.status]
                  return (
                    <DataTableRow key={tx.id}>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        <p className="font-bold text-[#243B53]">{tx.transactionCode}</p>
                        <p className="text-[#64748B]">{formatDateTimeVi(tx.paidAt)}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">
                          {tx.studentName} ({tx.studentCode})
                        </p>
                        <p className="whitespace-nowrap text-[#64748B]">{tx.receivableCode}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-medium text-[#243B53]">{tx.courseName}</p>
                        <p className="text-[#64748B]">
                          Lớp {tx.classCode} • {tx.branchName}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell
                        className={`whitespace-nowrap text-right font-extrabold ${
                          tx.status === 'Voided'
                            ? 'line-through text-[#94A3B8]'
                            : tx.status === 'Confirmed'
                              ? 'text-[#1F7A4C]'
                              : 'text-[#D97706]'
                        }`}
                      >
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

      {/* Bảng chi tiết hoàn tiền đã hoàn tất trong kỳ lọc (filteredRefunds) */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
          Chi tiết các khoản hoàn tiền đã hoàn tất trong kỳ ({data.filteredRefunds.length})
        </h2>

        {data.filteredRefunds.length === 0 ? (
          <EmptyBlock title="Không có khoản hoàn tiền hoàn tất nào trong kỳ lọc" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã hoàn & Ngày chi hoàn
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Học viên & GD gốc</DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học / Lớp</DataTableHeaderCell>
                  <DataTableHeaderCell>Lý do & Ghi chú duyệt</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Số tiền hoàn
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {data.filteredRefunds.map((rf) => {
                  const st = REFUND_STATUS_META[rf.status]
                  return (
                    <DataTableRow key={rf.id}>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        <p className="font-bold text-[#243B53]">{rf.refundCode}</p>
                        <p className="text-[#64748B]">
                          {formatDateTimeVi(rf.completedAt ?? rf.requestedAt)}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">
                          {rf.studentName} ({rf.studentCode})
                        </p>
                        <p className="whitespace-nowrap text-[#64748B]">
                          GD gốc: {rf.originalTransactionCode}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-medium text-[#243B53]">{rf.courseName}</p>
                        <p className="whitespace-nowrap text-[#64748B]">Lớp {rf.classCode}</p>
                      </DataTableCell>
                      <DataTableCell className="max-w-xs text-xs text-[#475569]">
                        <p>{rf.reason}</p>
                        {rf.reviewNote && (
                          <p className="mt-0.5 font-semibold text-[#2878B8]">
                            Duyệt: {rf.reviewNote}
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#B93A2E]">
                        -{formatVnd(rf.amountVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>
    </div>
  )
}
