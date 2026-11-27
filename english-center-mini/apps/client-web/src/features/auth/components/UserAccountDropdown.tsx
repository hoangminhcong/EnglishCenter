import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, History, Lock, LogOut, User, UserPlus } from 'lucide-react'
import { TEST_HISTORY_PATH } from '@/config/center-info'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { USER_ROLE_LABELS } from '@/features/auth/types/auth.types'
import LogoutConfirmModal from '@/features/auth/components/LogoutConfirmModal'

export default function UserAccountDropdown() {
  const { user, isAuthenticated, isStudent, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      setLogoutModalOpen(false)
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const avatarInitial = user?.fullName?.trim()?.[0]?.toUpperCase() ?? 'H'

  return (
    <>
      <div ref={containerRef} className="ec-reading-font relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-[11px] border border-[#DCEAF3] bg-white px-3 py-1.5 text-[13.5px] font-semibold text-[#243B53] transition hover:bg-[#EAF6FD] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#A7D8F5]"
        >
          {isAuthenticated && user ? (
            <>
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#A7D8F5] text-[12px] font-bold text-[#2878B8]">
                {avatarInitial}
              </span>
              <span className="hidden max-w-[140px] truncate sm:inline">{user.fullName}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-[#2878B8]" />
              <span>Tài khoản</span>
            </>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[#718096] transition ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[268px] rounded-[14px] border border-[#DCEAF3] bg-white p-1.5 shadow-[0_12px_32px_rgba(36,59,83,0.14)]"
          >
            {!isAuthenticated || !user ? (
              <>
                <Link
                  to="/login"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <User className="h-[18px] w-[18px] text-[#2878B8]" />
                  <span>Đăng nhập</span>
                </Link>

                <Link
                  to="/register"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <UserPlus className="h-[18px] w-[18px] text-[#2878B8]" />
                  <span>Đăng ký</span>
                </Link>

                <div className="my-1 h-px bg-[#DCEAF3]" />

                <Link
                  to={TEST_HISTORY_PATH}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <History className="h-[18px] w-[18px] text-[#2878B8]" />
                  <span>Lịch sử bài làm</span>
                </Link>
              </>
            ) : (
              <>
                {/* Thông tin tài khoản đang đăng nhập */}
                <div className="mb-1 border-b border-[#DCEAF3] px-3 pb-2 pt-2.5">
                  <b className="block truncate text-[14px] font-bold text-[#243B53]">
                    {user.fullName}
                  </b>
                  <span className="block truncate text-[12px] text-[#718096]">
                    {USER_ROLE_LABELS[user.role]} · {user.email}
                  </span>
                </div>

                {/* 1. Lịch sử bài làm */}
                <Link
                  to={TEST_HISTORY_PATH}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <History className="h-[18px] w-[18px] text-[#2878B8]" />
                  <span>Lịch sử bài làm</span>
                </Link>

                {/* 2. Khóa học của tôi (Dẫn vào Cổng học viên English Center Student Portal) */}
                {isStudent && (
                  <Link
                    to="/student/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                  >
                    <GraduationCap className="h-[18px] w-[18px] text-[#2878B8]" />
                    <span>Khóa học của tôi</span>
                  </Link>
                )}

                {/* 3. Đổi mật khẩu */}
                <Link
                  to="/change-password"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[14px] font-medium text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  <Lock className="h-[18px] w-[18px] text-[#2878B8]" />
                  <span>Đổi mật khẩu</span>
                </Link>

                <div className="my-1.5 h-px bg-[#DCEAF3]" />

                {/* 4. Đăng xuất (Mở hộp thoại xác nhận, không dùng alert trình duyệt) */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setLogoutModalOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[14px] font-medium text-[#9B2C2C] transition hover:bg-[#FDF0F0]"
                >
                  <LogOut className="h-[18px] w-[18px] text-[#9B2C2C]" />
                  <span>Đăng xuất</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <LogoutConfirmModal
        open={logoutModalOpen}
        loggingOut={loggingOut}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
