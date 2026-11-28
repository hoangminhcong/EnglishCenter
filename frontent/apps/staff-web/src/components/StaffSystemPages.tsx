import { useState } from 'react'
import { Link, useLocation, useNavigate, useRouteError } from 'react-router-dom'
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldOff,
} from 'lucide-react'
import { Button } from '@english-center/ui'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { resolveStaffDefaultHomePath } from '@/services/permissions/permissions.config'
import { resolveClientPortalUrl } from '@/services/portal/portalResolver'
import type { PermissionCode } from '@/types/rbac.types'

interface ForbiddenPageProps {
  missingPermission?: PermissionCode
  missingPermissions?: readonly PermissionCode[]
}

export function ForbiddenPage({ missingPermission, missingPermissions }: ForbiddenPageProps) {
  useDocumentTitle('403 – Không đủ quyền truy cập')
  const { session } = useStaffAuth()
  const homePath = resolveStaffDefaultHomePath(session)
  const displayedMissing =
    missingPermissions && missingPermissions.length > 0
      ? missingPermissions
      : missingPermission
        ? [missingPermission]
        : []

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#DCEAF3] bg-white px-6 py-12 text-center shadow-2xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDECE9] text-[#B93A2E]">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <span className="mt-4 rounded-full bg-[#FDECE9] px-3 py-0.5 text-xs font-extrabold text-[#B93A2E]">
        403 – Hạn chế truy cập
      </span>
      <h1 className="mt-3 text-xl font-bold text-[#243B53]">
        Bạn không có quyền truy cập khu vực này
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
        Tài khoản hiện tại không được cấp quyền thực hiện chức năng này.
      </p>
      {displayedMissing.length > 0 && (
        <div className="mt-3 rounded-lg border border-[#DCEAF3] bg-[#F5FAFE] px-3 py-1.5 text-xs text-[#243B53]">
          Quyền yêu cầu:{' '}
          {displayedMissing.map((code, index) => (
            <span key={code}>
              {index > 0 ? ', ' : ''}
              <code className="font-bold text-[#2878B8]">{code}</code>
            </span>
          ))}
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={homePath}
          className="rounded-xl bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f6399]"
        >
          Về trang làm việc
        </Link>
      </div>
    </div>
  )
}

export function NoAccessPage() {
  useDocumentTitle('Chưa được cấp quyền truy cập')
  const { session, logout, refreshPermissionsSession } = useStaffAuth()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  const handleRecheck = async () => {
    setRefreshing(true)
    try {
      const updated = await refreshPermissionsSession()
      const nextHome = resolveStaffDefaultHomePath(updated)
      if (nextHome !== '/no-access') {
        navigate(nextHome, { replace: true })
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#DCEAF3] bg-white px-6 py-12 text-center shadow-2xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF4E6] text-[#B86A00]">
        <ShieldOff className="h-7 w-7" />
      </div>
      <span className="mt-4 rounded-full bg-[#FEF4E6] px-3 py-0.5 text-xs font-extrabold text-[#B86A00]">
        Chưa phân quyền
      </span>
      <h1 className="mt-3 text-xl font-bold text-[#243B53]">
        Tài khoản chưa được cấp quyền truy cập hệ thống
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
        Vui lòng liên hệ Quản trị viên để được gán vai trò phù hợp.
      </p>

      {session && (
        <div className="mt-4 w-full rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 text-left text-xs text-[#243B53]">
          <p>
            <span className="text-[#64748B]">Tài khoản:</span>{' '}
            <strong>{session.user.username}</strong> ({session.user.email})
          </p>
          <p className="mt-1">
            <span className="text-[#64748B]">Mã nhân sự:</span>{' '}
            <strong>{session.employee.employeeCode}</strong> – {session.user.displayName}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" loading={refreshing} onClick={() => void handleRecheck()}>
          <RefreshCw className="h-4 w-4" />
          <span>Kiểm tra lại quyền</span>
        </Button>
        <Button variant="danger" onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </Button>
      </div>
    </div>
  )
}

export function StaffNotFoundPage() {
  useDocumentTitle('404 – Không tìm thấy trang')
  const { session } = useStaffAuth()
  const homePath = session ? resolveStaffDefaultHomePath(session) : '/login'

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#DCEAF3] bg-white px-6 py-12 text-center shadow-2xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF6FD] text-[#2878B8]">
          <Compass className="h-7 w-7" />
        </div>
        <span className="mt-4 rounded-full bg-[#EAF6FD] px-3 py-0.5 text-xs font-extrabold text-[#2878B8]">
          404 – Không tìm thấy
        </span>
        <h1 className="mt-3 text-xl font-bold text-[#243B53]">
          Đường dẫn quản trị không tồn tại
        </h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          to={homePath}
          className="mt-6 rounded-xl bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f6399]"
        >
          Quay về trang làm việc
        </Link>
      </div>
    </div>
  )
}

export function StudentPortalRedirectPage() {
  useDocumentTitle('Điều hướng sang Cổng Học viên')
  const location = useLocation()
  const { session } = useStaffAuth()
  const homePath = session ? resolveStaffDefaultHomePath(session) : '/login'
  const targetSubPath = `${location.pathname}${location.search}`
  const clientTargetUrl = resolveClientPortalUrl(targetSubPath)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5FAFE] px-4 py-12">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#DCEAF3] bg-white px-6 py-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF6FD] text-[#2878B8]">
          <ExternalLink className="h-7 w-7" />
        </div>
        <span className="mt-4 rounded-full bg-[#EAF6FD] px-3 py-0.5 text-xs font-extrabold text-[#2878B8]">
          Cổng Học viên
        </span>
        <h1 className="mt-3 text-xl font-bold text-[#243B53]">
          Đường dẫn này thuộc Cổng Học viên English Center
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          Đường dẫn <code className="font-semibold text-[#2878B8]">{location.pathname}</code> dành
          cho Học viên theo dõi lịch học, bài tập và kết quả học tập, không thuộc Cổng Nhân sự.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {clientTargetUrl ? (
            <a
              href={clientTargetUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f6399]"
            >
              <span>Mở trên Cổng Học viên</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-xs font-semibold text-[#B93A2E]">
              Chưa cấu hình địa chỉ ứng dụng Cổng Học viên.
            </span>
          )}
          <Link
            to={homePath}
            className="rounded-xl border border-[#DCEAF3] bg-white px-5 py-2.5 text-sm font-bold text-[#243B53] transition hover:bg-[#F5FAFE]"
          >
            Quay về Cổng Nhân sự
          </Link>
        </div>
      </div>
    </div>
  )
}

export function StaffRouteErrorPage() {
  const err = useRouteError()
  const message =
    err instanceof Error ? err.message : 'Đã xảy ra sự cố không mong muốn khi tải trang quản trị.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5FAFE] px-4 py-12">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#DCEAF3] bg-white px-6 py-10 text-center shadow-sm">
        <AlertTriangle className="h-10 w-10 text-[#F26522]" />
        <h1 className="mt-3 text-xl font-bold text-[#243B53]">Không thể hiển thị trang</h1>
        <p className="mt-2 text-sm text-[#64748B]">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            <span>Tải lại trang</span>
          </Button>
          <Link
            to="/"
            className="rounded-xl border border-[#DCEAF3] bg-white px-5 py-2.5 text-sm font-bold text-[#243B53] transition hover:bg-[#F5FAFE]"
          >
            Về trang mặc định
          </Link>
        </div>
      </div>
    </div>
  )
}
