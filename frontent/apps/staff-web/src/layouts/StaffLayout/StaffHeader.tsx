import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { getTodayIsoInVietnam } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
  readTeacherOpsStore,
} from '@/services/mock/operationsMockStore'
import { STAFF_ROLE_LABELS, hasPermission } from '@/services/permissions/permissions.config'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { cmsApi } from '@/features/content/api/cmsApi'
import { testAuthoringApi } from '@/features/learning/api/testAuthoringApi'
import { readSalesMockStore } from '@/features/sales/services/salesApi'
import { readCenterClassesStore } from '@/features/training/api/trainingApi'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { getInitials, toVietnamYmd } from '@/shared/utils/staffFormatters'

interface StaffHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenMobileSidebar: () => void
}

interface HeaderNotificationItem {
  id: string
  title: string
  detail: string
  to: string
}

export function StaffHeader({
  collapsed,
  onToggleCollapse,
  onOpenMobileSidebar,
}: StaffHeaderProps) {
  const { session, user, logout } = useStaffAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const notifRef = useRef<HTMLDivElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false)
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const { data: visibleNotifications = [] } = useQuery({
    queryKey: ['staff', 'header-notifications', session?.user.id, session?.role],
    enabled: Boolean(session && USE_STAFF_MOCK_API),
    queryFn: async (): Promise<HeaderNotificationItem[]> => {
      if (!session) return []
      const items: HeaderNotificationItem[] = []
      const todayYmd = getTodayIsoInVietnam()

      if (hasPermission(session, 'tests.publish')) {
        const tests = await testAuthoringApi.listTests()
        const draftCount = tests.filter((t) => t.status === 'draft').length
        if (draftCount > 0) {
          items.push({
            id: 'ntf-admin-tests',
            title: `${draftCount} đề thi đang ở trạng thái Bản nháp`,
            detail: 'Kiểm định điều kiện câu hỏi và xuất bản tại ngân hàng Test Online.',
            to: '/learning/tests',
          })
        }
      }

      if (hasPermission(session, 'achievements.publish')) {
        const achievements = await cmsApi.listAchievements()
        const pendingConsent = achievements.filter((a) => !a.publicConsentGranted).length
        if (pendingConsent > 0) {
          items.push({
            id: 'ntf-admin-consent',
            title: `${pendingConsent} hồ sơ vinh danh chờ xác nhận Consent`,
            detail: 'Cần xác nhận đồng ý công khai trước khi xuất bản lên Website.',
            to: '/content/achievements',
          })
        }
      }

      if (hasPermission(session, 'sales.followups.view')) {
        const salesStore = readSalesMockStore()
        const dueFollowUps = salesStore.followUps.filter(
          (f) =>
            f.status === 'Scheduled' &&
            f.assignedSaleId === session.user.id &&
            toVietnamYmd(f.dueAt) <= todayYmd,
        ).length
        if (dueFollowUps > 0) {
          items.push({
            id: 'ntf-sales-fup',
            title: `${dueFollowUps} lịch liên hệ đến hạn / quá hạn`,
            detail: 'Mở Sales Dashboard để gọi chăm sóc khách hàng đúng cam kết.',
            to: '/sales/dashboard',
          })
        }
      }

      if (hasPermission(session, 'finance.payments.update')) {
        const accStore = readAccountingOpsStore()
        const pendingBank = accStore.transactions.filter(
          (t) => t.status === 'PendingVerification',
        ).length
        if (pendingBank > 0) {
          items.push({
            id: 'ntf-acc-pending',
            title: `${pendingBank} giao dịch chuyển khoản chờ đối chiếu`,
            detail: 'Kiểm tra sao kê và xác nhận tại Sổ lịch sử giao dịch.',
            to: '/accounting/transactions',
          })
        }
      }

      if (hasPermission(session, 'sales.registrations.review')) {
        const salesStore = readSalesMockStore()
        const pendingRegs = salesStore.registrations.filter(
          (r) => r.status === 'Submitted' || r.status === 'Reviewing',
        ).length
        if (pendingRegs > 0) {
          items.push({
            id: 'ntf-aca-regs',
            title: `${pendingRegs} hồ sơ đăng ký từ Sale chờ Giáo vụ duyệt`,
            detail: 'Xét duyệt hồ sơ đăng ký khóa học để chuyển vào hàng đợi xếp lớp.',
            to: '/academic/placement?tab=review',
          })
        }
      }

      if (hasPermission(session, 'student-status.manage')) {
        const acaStore = readAcademicOpsStore()
        const pendingReq = acaStore.academicRequests.filter(
          (r) => r.status === 'Pending' || r.status === 'Reviewing',
        ).length
        if (pendingReq > 0) {
          items.push({
            id: 'ntf-aca-req',
            title: `${pendingReq} yêu cầu học vụ đang chờ xử lý`,
            detail: 'Xem và phê duyệt yêu cầu Bảo lưu / Khôi phục / Chuyển lớp / Học lại.',
            to: '/academic/requests',
          })
        }
      }

      if (hasPermission(session, 'assignments.grade')) {
        const teacherStore = readTeacherOpsStore()
        const myClassIds = new Set(
          readCenterClassesStore()
            .filter((c) => c.teacherId === session.user.id)
            .map((c) => c.id),
        )
        const ungraded = teacherStore.submissions.filter(
          (s) =>
            myClassIds.has(s.classId) &&
            (s.status === 'Submitted' || s.status === 'LateSubmitted' || s.status === 'Grading'),
        ).length
        if (ungraded > 0) {
          items.push({
            id: 'ntf-tea-grade',
            title: `${ungraded} bài nộp học viên đang chờ chấm`,
            detail: 'Mở quản lý Bài tập để chấm điểm và gửi nhận xét cho học viên.',
            to: '/teacher/assignments',
          })
        }
      }

      return items
    },
  })

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      setConfirmLogoutOpen(false)
      navigate('/login', { replace: true, state: null })
    } finally {
      setLoggingOut(false)
    }
  }

  const roleSummary = user
    ? user.roles.length > 0
      ? user.roles.map((r) => STAFF_ROLE_LABELS[r]).join(' • ')
      : 'Nhân sự'
    : ''

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#DCEAF3] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Mở menu điều hướng"
            className="rounded-xl border border-[#DCEAF3] p-2 text-[#243B53] hover:bg-[#EAF6FD] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className="hidden rounded-xl border border-[#DCEAF3] p-2 text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8] lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-bold text-[#243B53] md:inline">
              English Center – Cổng Quản trị & Vận hành
            </span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 sm:gap-3">
            {visibleNotifications.length > 0 && (
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false)
                    setNotifOpen((prev) => !prev)
                  }}
                  aria-label="Thông báo nhắc việc"
                  className="relative rounded-xl border border-[#DCEAF3] bg-white p-2 text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F26522] text-[10px] font-extrabold text-white">
                    {visibleNotifications.length}
                  </span>
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#DCEAF3] bg-white p-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#DCEAF3] pb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#243B53]">
                        Nhắc việc trực tuyến theo vai trò
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-semibold text-[#2878B8] hover:underline"
                      >
                        Đóng
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {visibleNotifications.map((item) => (
                        <Link
                          key={item.id}
                          to={item.to}
                          onClick={() => setNotifOpen(false)}
                          className="block rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-2.5 transition hover:border-[#75BDEB] hover:bg-[#EAF6FD]"
                        >
                          <p className="text-xs font-bold text-[#243B53]">{item.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#64748B]">{item.detail}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false)
                  setAccountMenuOpen((prev) => !prev)
                }}
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2.5 rounded-xl border border-[#DCEAF3] bg-white py-1.5 pr-2.5 pl-2 transition hover:border-[#75BDEB] hover:bg-[#F5FAFE]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF6FD] text-xs font-extrabold text-[#2878B8]">
                  {getInitials(user.fullName)}
                </span>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold leading-tight text-[#243B53]">{user.fullName}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2878B8]">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{roleSummary}</span>
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#64748B]" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#DCEAF3] bg-white p-2 shadow-xl">
                  <div className="border-b border-[#EEF4F8] px-3 py-2.5">
                    <p className="truncate text-sm font-extrabold text-[#243B53]">
                      {user.fullName}
                    </p>
                    <p className="truncate text-xs text-[#64748B]">
                      @{user.username} • {user.employeeCode}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#2878B8]">{user.email}</p>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                    >
                      <UserCog className="h-4 w-4 text-[#2878B8]" />
                      <span>Thông tin tài khoản</span>
                    </Link>

                    <Link
                      to="/profile?tab=password"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                    >
                      <KeyRound className="h-4 w-4 text-[#2878B8]" />
                      <span>Đổi mật khẩu</span>
                    </Link>
                  </div>

                  <div className="my-1 border-t border-[#EEF4F8]" />

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      setConfirmLogoutOpen(true)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#B93A2E] transition hover:bg-[#FDECE9]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất hệ thống</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Xác nhận đăng xuất"
        description="Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại trên cổng nhân sự English Center?"
        confirmLabel="Đăng xuất ngay"
        variant="danger"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setConfirmLogoutOpen(false)}
      />
    </>
  )
}
