import { Link, useLocation } from 'react-router-dom'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { resolveSafeClientPortalRedirectUrl } from '@/services/portal/portalResolver'

export default function StaffPortalRedirectPage() {
  const location = useLocation()
  const targetSubPath = location.pathname === '/staff' ? '/login' : location.pathname
  const safeStaffUrl =
    resolveSafeClientPortalRedirectUrl('STAFF', targetSubPath) ??
    resolveSafeClientPortalRedirectUrl('STAFF', '/login')

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF6FD] text-[#2878B8]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <span className="mt-4 inline-block rounded-full bg-[#EAF6FD] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#2878B8]">
          Khu vực Cổng Nhân sự
        </span>
        <h1 className="mt-3 text-xl font-bold text-[#243B53]">
          Đường dẫn dành cho nhân sự trung tâm
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          Các phân hệ quản trị, tư vấn tuyển sinh, kế toán, giáo vụ và giảng viên hoạt động trên Cổng Nhân sự riêng biệt.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {safeStaffUrl ? (
            <a
              href={safeStaffUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1F6399]"
            >
              <span>Mở Cổng Nhân sự</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-xs font-semibold text-[#B93A2E]">
              Chưa cấu hình địa chỉ Cổng Nhân sự. Vui lòng liên hệ quản trị viên.
            </span>
          )}
          <Link
            to="/"
            className="rounded-xl border border-[#DCEAF3] bg-white px-4 py-2.5 text-sm font-bold text-[#243B53] transition hover:bg-[#F5FAFE]"
          >
            Về Trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
