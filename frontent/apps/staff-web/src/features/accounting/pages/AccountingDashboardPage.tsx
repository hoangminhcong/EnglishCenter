import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
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
  LoadingBlock,
} from '@english-center/ui'
import { formatDate, formatDateTimeVi, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import {
  AreaLineChart,
  DonutBreakdownChart,
  VerticalBarChart,
} from '@/shared/components/SvgCharts'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { accountingApi } from '@/features/accounting/services/accountingApi'
import { ACCOUNTING_QUERY_KEYS } from '@/features/accounting/hooks/useAccounting'
import {
  PAYMENT_METHOD_LABELS,
  RECEIVABLE_STATUS_META,
  TRANSACTION_STATUS_META,
  type AccountingDashboardPeriod,
} from '@/features/accounting/types/accounting.types'

const PERIOD_OPTIONS: { value: AccountingDashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'this_month', label: 'Tháng này' },
  { value: '30d', label: '30 ngày qua' },
  { value: 'all', label: 'Toàn thời gian' },
]

export function AccountingDashboardPage() {
  useDocumentTitle('Dashboard Kế toán')
  const { todayYmdVn } = useCurrentTime()
  const [period, setPeriod] = useState<AccountingDashboardPeriod>('this_month')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACCOUNTING_QUERY_KEYS.dashboard(todayYmdVn, period),
    queryFn: () => accountingApi.getDashboardData(todayYmdVn, period),
  })

  if (isLoading) {
    return <LoadingBlock label="Đang tổng hợp số liệu tài chính & công nợ học viên..." />
  }

  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu Dashboard Kế toán."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { kpis } = data
  const activePeriodLabel =
    PERIOD_OPTIONS.find((opt) => opt.value === period)?.label ?? 'Tháng này'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển Kế toán & Học phí"
        description="Tổng hợp thực thu, khoản phải thu và công nợ học viên."
        actions={
          <>
            <ActionGuard permission="finance.payments.create">
              <Link to="/accounting/payments">
                <Button size="sm">
                  <CreditCard className="h-4 w-4" />
                  <span>Thu học phí</span>
                </Button>
              </Link>
            </ActionGuard>
            <Link to="/accounting/receivables">
              <Button size="sm" variant="secondary">
                <Wallet className="h-4 w-4" />
                <span>Khoản phải thu</span>
              </Button>
            </Link>
          </>
        }
      />

      {/* Bộ lọc kỳ thống kê */}
      <div className="flex items-center justify-end">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-white p-1 text-xs font-bold shadow-2xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-3 py-1.5 transition ${
                period === opt.value
                  ? 'bg-[#2878B8] text-white'
                  : 'text-[#475569] hover:text-[#2878B8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 thẻ KPI trọng tâm Kế toán (gồm Công nợ quá hạn overdueDebtVnd) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold uppercase text-[#64748B]">
              Thực thu hôm nay
            </span>
            <TrendingUp className="h-4 w-4 shrink-0 text-[#1F7A4C]" />
          </div>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#1F7A4C] sm:text-2xl">
            {formatVnd(kpis.collectedTodayVnd)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {kpis.transactionsTodayCount} giao dịch phát sinh hôm nay
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold uppercase text-[#64748B]">
              Thực thu ({activePeriodLabel})
            </span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2878B8]" />
          </div>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#243B53] sm:text-2xl">
            {formatVnd(kpis.collectedInPeriodVnd)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {kpis.transactionsInPeriodCount} giao dịch hợp lệ trong kỳ
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold uppercase text-[#64748B]">
              Tổng khoản phải thu
            </span>
            <Wallet className="h-4 w-4 shrink-0 text-[#2878B8]" />
          </div>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#243B53] sm:text-2xl">
            {formatVnd(kpis.totalReceivablesVnd)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Theo các đợt ghi danh hiện hành</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold uppercase text-[#64748B]">
              Tổng công nợ chưa thu
            </span>
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />
          </div>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#D97706] sm:text-2xl">
            {formatVnd(kpis.totalOutstandingDebtVnd)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Chờ kiểm tra sao kê: <strong>{kpis.pendingVerificationCount}</strong> GD
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#FDECE9] bg-white p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-xs leading-snug font-bold uppercase text-[#B93A2E]">
              Công nợ quá hạn
            </span>
            <AlertOctagon className="h-4 w-4 shrink-0 text-[#B93A2E]" />
          </div>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#B93A2E] sm:text-2xl">
            {formatVnd(kpis.overdueDebtVnd)}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            <strong>{kpis.overdueReceivablesCount}</strong> khoản phải thu đã quá hạn
          </p>
        </div>
      </div>

      {/* Khu vực Biểu đồ SVG thuần */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="min-w-0 text-sm font-extrabold text-[#243B53]">
              Tiền thực thu 7 ngày gần nhất
            </h2>
            <Badge tone="neutral">Đơn vị trục: nghìn VND</Badge>
          </div>
          <AreaLineChart
            title="Biểu đồ tiền thực thu theo ngày"
            points={data.dailyRevenueSeries}
            fillId="accDailyRevGrad"
            strokeColor="#1F7A4C"
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="min-w-0 text-sm font-extrabold text-[#243B53]">
              Tiền thực thu 6 tháng gần nhất
            </h2>
            <Badge tone="info">Đã xác nhận</Badge>
          </div>
          <VerticalBarChart
            title="Biểu đồ tiền thực thu theo tháng"
            points={data.monthlyRevenueSeries}
            barColor="#2878B8"
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-4">
          <h2 className="mb-3 text-sm font-extrabold text-[#243B53]">
            Thực thu theo khóa học ({activePeriodLabel})
          </h2>
          <VerticalBarChart
            title="Thực thu theo khóa học"
            points={data.revenueByCourseSeries}
            barColor="#0EA5E9"
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-4">
          <h2 className="mb-3 text-sm font-extrabold text-[#243B53]">
            Thực thu theo lớp học ({activePeriodLabel})
          </h2>
          <VerticalBarChart
            title="Thực thu theo lớp học"
            points={data.revenueByClassSeries}
            barColor="#F26522"
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-4">
          <h2 className="mb-3 text-sm font-extrabold text-[#243B53]">
            Cơ cấu trạng thái khoản phải thu
          </h2>
          <DonutBreakdownChart
            title="Cơ cấu trạng thái khoản phải thu"
            centerLabel="Khoản thu"
            slices={data.debtBreakdownSlices}
          />
        </div>
      </div>

      {/* Bảng tác nghiệp 1: Giao dịch chờ kiểm tra sao kê & Công nợ quá hạn */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-[#D97706]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Giao dịch chuyển khoản chờ kiểm tra ({data.pendingTransactions.length})
              </h2>
            </div>
            <Link
              to="/accounting/transactions"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Đối chiếu ngay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.pendingTransactions.length === 0 ? (
            <EmptyBlock title="Không có giao dịch chờ đối chiếu sao kê" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã GD & Học viên
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Ngân hàng / Tham chiếu</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Số tiền
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.pendingTransactions.map((tx) => (
                    <DataTableRow key={tx.id}>
                      <DataTableCell>
                        <p className="whitespace-nowrap font-bold text-[#243B53]">
                          {tx.transactionCode}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {tx.studentName} ({tx.studentCode})
                        </p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <p className="font-semibold text-[#243B53]">
                          {tx.bankTransferMeta?.bankName ?? '—'}
                        </p>
                        <p className="whitespace-nowrap text-[#64748B]">
                          Mã UNC: {tx.bankTransferMeta?.referenceCode ?? '—'}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#D97706]">
                        {formatVnd(tx.amountVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#B93A2E]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Công nợ quá hạn cần theo dõi ({data.overdueReceivables.length})
              </h2>
            </div>
            <Link
              to="/accounting/receivables"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Xem toàn bộ công nợ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.overdueReceivables.length === 0 ? (
            <EmptyBlock title="Không có khoản công nợ quá hạn" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Khoản thu & Học viên
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Hạn thanh toán
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Còn nợ
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.overdueReceivables.map((rcv) => (
                    <DataTableRow key={rcv.id}>
                      <DataTableCell>
                        <Link
                          to={`/accounting/receivables/${rcv.id}`}
                          className="whitespace-nowrap font-bold text-[#2878B8] hover:underline"
                        >
                          {rcv.receivableCode}
                        </Link>
                        <p className="text-xs text-[#64748B]">
                          {rcv.studentName} • Lớp {rcv.classCode}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs font-semibold text-[#B93A2E]">
                        {formatDate(rcv.dueDate)}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-extrabold text-[#B93A2E]">
                        {formatVnd(rcv.remainingVnd)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      </div>

      {/* Bảng tác nghiệp 2: Sắp đến hạn & Giao dịch trong kỳ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
              Khoản phải thu sắp đến hạn
            </h2>
            <Badge tone="info">{data.upcomingDueReceivables.length} khoản</Badge>
          </div>

          {data.upcomingDueReceivables.length === 0 ? (
            <EmptyBlock title="Không có khoản sắp đến hạn" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Học viên & Lớp</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">Hạn đóng</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Còn phải thu
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.upcomingDueReceivables.map((rcv) => {
                    const st = RECEIVABLE_STATUS_META[rcv.derivedStatus]
                    return (
                      <DataTableRow key={rcv.id}>
                        <DataTableCell>
                          <Link
                            to={`/accounting/receivables/${rcv.id}`}
                            className="font-bold text-[#243B53] hover:text-[#2878B8]"
                          >
                            {rcv.studentName}
                          </Link>
                          <p className="whitespace-nowrap text-xs text-[#64748B]">
                            {rcv.receivableCode} • {rcv.classCode}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-xs">
                          {formatDate(rcv.dueDate)}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-right font-bold text-[#243B53]">
                          {formatVnd(rcv.remainingVnd)}
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Receipt className="h-4 w-4 shrink-0 text-[#2878B8]" />
              <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
                Giao dịch gần đây ({activePeriodLabel})
              </h2>
            </div>
            <Link
              to="/accounting/receipts"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2878B8] hover:underline"
            >
              <span>Quản lý phiếu thu</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentTransactions.length === 0 ? (
            <EmptyBlock title="Chưa có giao dịch phát sinh trong kỳ đã chọn" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã GD / Thời gian
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Học viên & Phương thức</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Số tiền
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {data.recentTransactions.map((tx) => {
                    const meta = TRANSACTION_STATUS_META[tx.status]
                    return (
                      <DataTableRow key={tx.id}>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-bold text-[#243B53]">{tx.transactionCode}</p>
                          <p className="text-xs text-[#64748B]">{formatDateTimeVi(tx.paidAt)}</p>
                        </DataTableCell>
                        <DataTableCell>
                          <p className="font-medium text-[#243B53]">{tx.studentName}</p>
                          <p className="text-xs text-[#64748B]">
                            {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
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
      </div>
    </div>
  )
}
