import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  LoadingBlock,
  SelectField,
} from '@english-center/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { cmsApi } from '@/features/content/api/cmsApi'
import { reportsApi } from '@/features/reports/api/reportsApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import {
  AreaLineChart,
  DonutBreakdownChart,
  VerticalBarChart,
} from '@/shared/components/SvgCharts'

type ReportTab = 'admissions' | 'finance' | 'training' | 'test_online'

function parseReportTab(raw: string | null): ReportTab {
  if (raw === 'finance' || raw === 'training' || raw === 'test_online') return raw
  return 'admissions'
}

export function ReportsPage() {
  useDocumentTitle('Báo cáo thống kê')
  const { user } = useStaffAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseReportTab(searchParams.get('tab'))
  const canViewTests = hasPermission(user, 'tests.view')

  const [period, setPeriod] = useState<'3m' | '6m'>('6m')
  const [branchFilter, setBranchFilter] = useState('ALL')

  const switchTab = (nextTab: ReportTab) => {
    setSearchParams({ tab: nextTab }, { replace: true })
  }

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'reports', branchFilter, period],
    queryFn: () => reportsApi.getSummary(branchFilter, period),
  })

  if (isLoading) return <LoadingBlock label="Đang tổng hợp báo cáo thống kê..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu báo cáo."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const enrollSeries =
    period === '3m' ? data.enrollmentTrend6M.slice(-3) : data.enrollmentTrend6M
  const revSeries =
    period === '3m' ? data.revenueByMonth6M.slice(-3) : data.revenueByMonth6M

  return (
    <div className="space-y-5">
      <PageHeader
        title="Báo cáo Thống kê"
        description="Thống kê ghi danh, thực thu ròng, chuyên cần và hoạt động luyện đề."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => switchTab('admissions')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'admissions' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            1. Tuyển sinh & Ghi danh
          </button>
          <button
            type="button"
            onClick={() => switchTab('finance')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'finance' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            2. Doanh thu thực thu ròng
          </button>
          <button
            type="button"
            onClick={() => switchTab('training')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'training' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            3. Đào tạo & Chuyên cần
          </button>
          <button
            type="button"
            onClick={() => switchTab('test_online')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'test_online' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            4. Luyện đề Test Online
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SelectField
            id="rep-branch"
            aria-label="Lọc theo cơ sở"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Toàn hệ thống English Center' },
              ...branches.map((b) => ({ value: b.id, label: b.shortLabel || b.name })),
            ]}
          />
          <SelectField
            id="rep-period"
            aria-label="Chọn kỳ thống kê"
            value={period}
            onChange={(e) => setPeriod(e.target.value as '3m' | '6m')}
            options={[
              { value: '3m', label: 'Kỳ 3 tháng gần nhất' },
              { value: '6m', label: 'Kỳ 6 tháng gần nhất' },
            ]}
          />
        </div>
      </div>

      {tab === 'admissions' && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#243B53]">
                Số lượt ghi danh chính thức theo tháng
              </h2>
              <p className="text-xs text-[#64748B]">
                Tổng hợp học viên đã xếp lớp chính thức theo kỳ.
              </p>
            </div>
          </div>
          <AreaLineChart
            title="Ghi danh học viên mới"
            points={enrollSeries}
            fillId="rep-enroll-grad"
            unitSuffix=" HV"
          />
        </div>
      )}

      {tab === 'finance' && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#243B53]">
                Thực thu ròng theo tháng (Triệu VNĐ)
              </h2>
              <p className="text-xs text-[#64748B]">
                Tổng hợp các giao dịch học phí đã xác nhận sau khi trừ hoàn tiền.
              </p>
            </div>
          </div>
          <VerticalBarChart
            title="Doanh thu thực thu ròng"
            points={revSeries}
            barColor="#1F7A4C"
          />
        </div>
      )}

      {tab === 'training' && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#243B53]">
                Tỷ lệ chuyên cần thực tế theo cơ sở (%)
              </h2>
              <p className="text-xs text-[#64748B]">
                Tính từ các bản ghi điểm danh thực tế của Giảng viên tại từng cơ sở.
              </p>
            </div>
          </div>
          {data.attendanceByBranch.length === 0 ? (
            <EmptyBlock title="Không có dữ liệu cơ sở phù hợp" />
          ) : (
            <VerticalBarChart
              title="Tỷ lệ chuyên cần theo cơ sở"
              points={data.attendanceByBranch}
              barColor="#2878B8"
            />
          )}
        </div>
      )}

      {tab === 'test_online' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#243B53]">
                Phân bổ lượt thi theo Bộ đề
              </h2>
              <p className="text-xs text-[#64748B]">
                Tổng hợp trực tiếp từ ngân hàng đề Test Online hiện có.
              </p>
            </div>
            <DonutBreakdownChart
              title="Phân bổ lượt luyện tập"
              centerLabel="Tổng lượt"
              slices={data.testOnlineAttemptsByCollection}
            />
          </div>

          <div className="lg:col-span-7">
            {data.topTestsTable.length === 0 ? (
              <EmptyBlock title="Chưa có đề thi nào trong ngân hàng Test Online" />
            ) : (
              <DataTableContainer>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell>Mã & Đề thi</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Tổng lượt làm bài
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Số câu soạn thảo
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Phiên bản & Trạng thái
                      </DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {data.topTestsTable.map((row) => (
                      <DataTableRow key={row.id}>
                        <DataTableCell>
                          {canViewTests ? (
                            <Link
                              to={`/learning/tests/${row.id}`}
                              className="font-bold text-[#2878B8] hover:underline"
                            >
                              {row.title}
                            </Link>
                          ) : (
                            <p className="font-bold text-[#243B53]">{row.title}</p>
                          )}
                          <code className="block text-xs whitespace-nowrap text-[#64748B]">
                            {row.code}
                          </code>
                        </DataTableCell>
                        <DataTableCell className="font-semibold whitespace-nowrap">
                          {row.attempts.toLocaleString('vi-VN')}
                        </DataTableCell>
                        <DataTableCell className="font-bold whitespace-nowrap text-[#2878B8]">
                          {row.totalQuestions} câu
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={row.status === 'published' ? 'success' : 'neutral'}>
                            v{row.versionNumber} • {row.status}
                          </Badge>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
