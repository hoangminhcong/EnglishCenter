import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  FileEdit,
  Home,
  Receipt,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { centerInfo } from '@/config/center-info';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/features/auth/hooks/useAuth';
import UserAccountDropdown from '@/features/auth/components/UserAccountDropdown';
import { useStudentPortalData } from '@/features/student-portal/hooks/useStudentPortal';
import { PortalToastProvider } from '@/features/student-portal/components/PortalToast';

const PORTAL_NAV_ITEMS = [
  {
    to: '/student/dashboard',
    label: 'Trang chủ',
    icon: Home,
    key: 'dashboard',
  },
  {
    to: '/student/learning-plan',
    label: 'Kế hoạch & Học liệu',
    icon: BookOpen,
    key: 'learning-plan',
  },
  {
    to: '/student/schedule',
    label: 'Thời khóa biểu',
    icon: Calendar,
    key: 'schedule',
  },
  {
    to: '/student/assignments',
    label: 'Bài tập & Điểm danh',
    icon: FileEdit,
    key: 'assignments',
  },
  {
    to: '/student/exam-results',
    label: 'Bảng điểm & Học vụ',
    icon: Trophy,
    key: 'exam-results',
  },
  {
    to: '/student/tuition',
    label: 'Học phí & Phiếu thu',
    icon: Receipt,
    key: 'tuition',
  },
  {
    to: '/student/profile',
    label: 'Hồ sơ học viên',
    icon: UserCheck,
    key: 'profile',
  },
] as const;

export default function StudentLayout() {
  const { user, isAuthenticated, isStudent } = useAuth();
  const location = useLocation();
  const { data } = useStudentPortalData();
  usePageTitle('Cổng học viên');

  if (!isAuthenticated || !isStudent || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  const todoAssignmentsCount =
    data?.assignments.filter(
      (a) => a.isUnlocked && !a.isClosed && a.submission.status === 'todo'
    ).length ?? 0;

  const classSubtitle = data?.classInfo
    ? `Lớp ${data.classInfo.classCode}, ${data.classInfo.courseName}`
    : 'Chưa xếp lớp chính thức';

  return (
    <PortalToastProvider>
      <div className="ec-reading-font min-h-screen bg-[#F5FAFE] text-[#243B53]">
        {/* Top Header + Top Navigation */}
        <header className="no-print sticky top-0 z-20 border-b border-[#DCEAF3] bg-white">
          <div className="mx-auto max-w-[1180px] px-4">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                <Link to="/student/dashboard" className="block select-none">
                  <b className="block text-[20px] font-extrabold uppercase leading-tight tracking-tight text-[#2878B8]">
                    <span className="text-[#F26522]">E</span>NGLISH CENTER
                  </b>
                  <small className="block text-[11px] font-medium text-[#718096]">
                    {centerInfo.slogan}
                  </small>
                </Link>

                <Link
                  to="/"
                  className="inline-flex items-center rounded-[8px] border border-[#DCEAF3] bg-[#F5FAFE] px-2.5 py-1 text-[12px] font-medium text-[#718096] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                >
                  ← Trang chủ Website
                </Link>
              </div>

              {/* Thông tin học viên & Menu tài khoản */}
              <div className="flex items-center gap-3">
                <div className="hidden text-right text-[13px] leading-snug sm:block">
                  <b className="font-semibold text-[#243B53]">{user.fullName}</b>
                  <br />
                  <span className="text-[#718096]">{classSubtitle}</span>
                </div>

                <UserAccountDropdown />
              </div>
            </div>

            {/* 7-Tab Top Navigation */}
            <nav
              aria-label="Điều hướng học viên"
              className="flex gap-1 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {PORTAL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 py-[11px] text-[14px] transition-colors ${
                        isActive
                          ? 'border-[#75BDEB] font-semibold text-[#2878B8]'
                          : 'border-transparent font-medium text-[#718096] hover:text-[#2878B8]'
                      }`
                    }
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    <span>{item.label}</span>
                    {item.key === 'assignments' && todoAssignmentsCount > 0 ? (
                      <span
                        title="Bài cần nộp"
                        className="rounded-full bg-[#F26522] px-[7px] text-[11px] font-bold leading-[18px] text-white"
                      >
                        {todoAssignmentsCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-[1180px] px-4 pb-12 pt-5">
          <Outlet />
        </main>
      </div>
    </PortalToastProvider>
  );
}
