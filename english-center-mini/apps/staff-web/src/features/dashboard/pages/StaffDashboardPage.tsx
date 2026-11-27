import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { Badge, ErrorBlock, LoadingBlock } from '@english-center/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { useStaffDashboard } from '@/features/dashboard/hooks/useStaffDashboard'
import { STAFF_ROLE_LABELS, hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import {
  AreaLineChart,
  DonutBreakdownChart,
  VerticalBarChart,
} from '@/shared/components/SvgCharts'

export function StaffDashboardPage() {
  useDocumentTitle('Bảng điều khiển')
  const { user } = useStaffAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<'3m' | '6m'>('6m')
  const { data, isLoading, error, refetch } = useStaffDashboard(period)

  if (isLoading) return <LoadingBlock label="Đang tải tổng quan vận hành..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu Bảng điều khiển."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const enrollmentSeries =
    period === '3m' ? data.monthlyEnrollments6M.slice(-3) : data.monthlyEnrollments6M
  const revenueSeries =
    period === '3m' ? data.monthlyRevenueMln6M.slice(-3) : data.monthlyRevenueMln6M

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? 'Nhân sự'}`}
        description="Tổng quan chỉ số tuyển sinh, đào tạo và doanh thu trung tâm."
        badge={
          user ? (
            <Badge tone="info">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {user.roles.map((r) => STAFF_ROLE_LABELS[r]).join(' • ') || 'Nhân sự'}
            </Badge>
          ) : undefined
        }
        actions={
          <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('3m')}
              className={`rounded-lg px-3 py-1.5 transition ${
                period === '3m' ? 'bg-white text-[#2878B8] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              3 tháng gần nhất
            </button>
            <button
              type="button"
              onClick={() => setPeriod('6m')}
              className={`rounded-lg px-3 py-1.5 transition ${
                period === '6m' ? 'bg-white text-[#2878B8] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              6 tháng gần nhất
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => {
          const canOpen = hasPermission(user, kpi.requiredPermission)
          return (
            <div
              key={kpi.id}
              onClick={() => {
                if (canOpen) navigate(kpi.targetPath)
              }}
              onKeyDown={(e) => {
                if (canOpen && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  navigate(kpi.targetPath)
                }
              }}
              role={canOpen ? 'button' : undefined}
              tabIndex={canOpen ? 0 : undefined}
              className={`flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs transition ${
                canOpen ? 'cursor-pointer hover:border-[#75BDEB] hover:shadow-sm' : 'opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-xs leading-snug font-bold tracking-wide text-[#64748B] uppercase">
                  {kpi.label}
                </span>
                {canOpen && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ArrowUpRight className="h-4 w-4 text-[#2878B8]" />
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="text-2xl font-black tracking-tight tabular-nums text-[#243B53]">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">{kpi.subLabel}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3">
            <h2 className="text-base font-bold text-[#243B53]">Xu hướng tuyển sinh theo tháng</h2>
            <p className="text-xs text-[#64748B]">Số lượng học viên ghi danh mới</p>
          </div>
          <AreaLineChart
            title="Xu hướng tuyển sinh theo tháng"
            points={enrollmentSeries}
            fillId="dash-enroll-grad"
            unitSuffix=" HV"
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <div className="mb-3">
            <h2 className="text-base font-bold text-[#243B53]">Doanh thu theo tháng (Triệu VNĐ)</h2>
            <p className="text-xs text-[#64748B]">Thực thu ròng theo kỳ</p>
          </div>
          <VerticalBarChart
            title="Doanh thu thực thu theo tháng"
            points={revenueSeries}
            barColor="#2878B8"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#243B53]">Cơ cấu học viên theo khóa học</h2>
            <p className="text-xs text-[#64748B]">Phân bổ học viên theo chương trình đào tạo</p>
          </div>
          <DonutBreakdownChart
            title="Cơ cấu học viên theo khóa học"
            centerLabel="Học viên"
            slices={data.studentsByCourse}
          />
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
          <h2 className="text-base font-bold text-[#243B53]">Tình trạng lớp đào tạo</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">Tổng hợp theo trạng thái vận hành</p>

          <div className="mt-4 space-y-3">
            {data.classStatusBreakdown.map((row) => (
              <div
                key={row.statusLabel}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] px-4 py-3"
              >
                <span className="min-w-0 text-sm font-semibold text-[#243B53]">
                  {row.statusLabel}
                </span>
                <Badge tone={row.tone}>{row.count} lớp</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
