import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Headset,
  History,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  Newspaper,
  Receipt,
  RefreshCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  STAFF_NAVIGATION_ITEMS,
  STAFF_NAV_GROUPS_ORDER,
  type MenuDefinition,
  type StaffNavIconName,
} from '@/services/permissions/navigation.config'
import {
  hasAllPermissions,
  hasAnyPermission,
} from '@/services/permissions/permissions.config'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import type { StaffRole } from '@/types/rbac.types'

const ICON_MAP: Record<StaffNavIconName, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  accounts: Users,
  roles: KeyRound,
  courses: BookOpen,
  tuition: Wallet,
  training: GraduationCap,
  cms_hub: Globe,
  center_info: Landmark,
  branches: Building2,
  news: Newspaper,
  jobs: Briefcase,
  achievements: Award,
  learning_hub: Layers,
  materials: FolderOpen,
  study_zone: Sparkles,
  tests: FileCheck2,
  toeic_config: SlidersHorizontal,
  reports: BarChart3,
  sales_dashboard: Headset,
  sales_courses: BookOpen,
  sales_new_reg: FilePlus2,
  sales_registrations: ClipboardCheck,
  acc_dashboard: LayoutDashboard,
  acc_payments: CreditCard,
  acc_receivables: Wallet,
  acc_transactions: History,
  acc_receipts: Receipt,
  acc_reports: BarChart3,
  aca_dashboard: LayoutDashboard,
  aca_students: Users,
  aca_classes: GraduationCap,
  aca_placement: UserCheck,
  aca_requests: RefreshCcw,
  aca_course_content: BookMarked,
  tea_dashboard: LayoutDashboard,
  tea_classes: GraduationCap,
  tea_plans: FileText,
  tea_attendance: CheckSquare,
  tea_assignments: ClipboardList,
  tea_gradebook: FileSpreadsheet,
  tea_progress: TrendingUp,
  tea_schedule: CalendarDays,
}

const PORTAL_SUBTITLE_BY_ROLE: Record<StaffRole, string> = {
  ADMIN: 'Admin Portal',
  SALES: 'Sales CRM Portal',
  ACCOUNTANT: 'Accounting Portal',
  ACADEMIC: 'Academic Portal',
  TEACHER: 'Teacher Portal',
}

interface StaffSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function StaffSidebar({ collapsed, mobileOpen, onCloseMobile }: StaffSidebarProps) {
  const { session, user } = useStaffAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, onCloseMobile])

  const isMenuPermitted = (item: MenuDefinition): boolean => {
    if (item.anyOfPermissions && item.anyOfPermissions.length > 0) {
      return hasAnyPermission(session, item.anyOfPermissions)
    }
    return hasAllPermissions(session, item.requiredPermissions)
  }

  const allowedItems = STAFF_NAVIGATION_ITEMS.filter(isMenuPermitted)

  const isChildRouteActive = (childPath: string): boolean =>
    location.pathname === childPath || location.pathname.startsWith(`${childPath}/`)

  const toggleParentExpand = (key: string, currentlyOpen: boolean) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !currentlyOpen,
    }))
  }

  const portalSubtitle = session
    ? PORTAL_SUBTITLE_BY_ROLE[session.role]
    : 'Staff & Operations Portal'

  const isProfileInfoActive =
    location.pathname === '/profile' && !location.search.includes('tab=password')
  const isProfilePwdActive =
    location.pathname === '/profile' && location.search.includes('tab=password')

  const renderSidebarBody = (isCollapsedDesktop: boolean) => (
    <div className="flex h-full flex-col border-r border-[#DCEAF3] bg-white">
      <div
        className={`flex h-16 items-center border-b border-[#DCEAF3] ${
          isCollapsedDesktop ? 'justify-center px-2' : 'justify-between px-5'
        }`}
      >
        {isCollapsedDesktop ? (
          <span
            title={`English Center – ${portalSubtitle}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF6FD] text-sm font-black text-[#2878B8]"
          >
            <span className="text-[#F26522]">E</span>C
          </span>
        ) : (
          <div>
            <span className="block text-lg font-black uppercase tracking-tight text-[#2878B8]">
              <span className="text-[#F26522]">E</span>NGLISH CENTER
            </span>
            <span className="mt-0.5 inline-block rounded-full bg-[#EAF6FD] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#2878B8]">
              {portalSubtitle}
            </span>
          </div>
        )}

        {!isCollapsedDesktop && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng menu"
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EAF6FD] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav
        aria-label="Điều hướng nghiệp vụ theo vai trò"
        className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4"
      >
        {STAFF_NAV_GROUPS_ORDER.map((groupName) => {
          const groupItems = allowedItems.filter((item) => item.group === groupName)
          if (groupItems.length === 0) return null

          return (
            <div key={groupName}>
              {!isCollapsedDesktop && (
                <p className="mb-1.5 px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                  {groupName}
                </p>
              )}
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const Icon = ICON_MAP[item.icon]
                  const permittedChildren = item.children
                    ? item.children.filter((c) => hasAllPermissions(session, c.requiredPermissions))
                    : []

                  if (permittedChildren.length > 0) {
                    const hasActiveChild = permittedChildren.some((c) => isChildRouteActive(c.path))
                    const isOpen = expandedKeys[item.key] ?? hasActiveChild

                    if (isCollapsedDesktop) {
                      return (
                        <button
                          key={item.key}
                          type="button"
                          title={item.label}
                          onClick={() => {
                            const firstChild = permittedChildren[0]
                            if (firstChild) navigate(firstChild.path)
                          }}
                          className={`flex w-full items-center justify-center rounded-xl px-2 py-2 text-sm transition ${
                            hasActiveChild
                              ? 'bg-[#EAF6FD] font-bold text-[#2878B8]'
                              : 'font-medium text-[#243B53] hover:bg-[#F5FAFE] hover:text-[#2878B8]'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                        </button>
                      )
                    }

                    return (
                      <div key={item.key} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleParentExpand(item.key, isOpen)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                            hasActiveChild
                              ? 'bg-[#EAF6FD]/70 font-bold text-[#2878B8]'
                              : 'font-medium text-[#243B53] hover:bg-[#F5FAFE] hover:text-[#2878B8]'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="ml-4 space-y-0.5 border-l border-[#DCEAF3] pl-2.5">
                            {permittedChildren.map((child) => {
                              const ChildIcon = ICON_MAP[child.icon]
                              return (
                                <NavLink
                                  key={child.key}
                                  to={child.path}
                                  end={child.end}
                                  onClick={onCloseMobile}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                      isActive
                                        ? 'bg-[#EAF6FD] font-bold text-[#2878B8]'
                                        : 'font-medium text-[#475569] hover:bg-[#F5FAFE] hover:text-[#2878B8]'
                                    }`
                                  }
                                >
                                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                </NavLink>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <NavLink
                      key={item.key}
                      to={item.path}
                      end={item.end}
                      title={isCollapsedDesktop ? item.label : undefined}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center rounded-xl py-2 text-sm transition ${
                          isCollapsedDesktop ? 'justify-center px-2' : 'gap-2.5 px-3'
                        } ${
                          isActive
                            ? 'bg-[#EAF6FD] font-bold text-[#2878B8]'
                            : 'font-medium text-[#243B53] hover:bg-[#F5FAFE] hover:text-[#2878B8]'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsedDesktop && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Khu vực Tài khoản cá nhân & Đổi mật khẩu dùng chung cho mọi nhân sự */}
      {user && (
        <div className="border-t border-[#DCEAF3] bg-[#F8FBFD] p-2.5">
          {!isCollapsedDesktop && (
            <p className="mb-1 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
              Tài khoản của tôi
            </p>
          )}
          <div className="space-y-0.5">
            <Link
              to="/profile"
              title={isCollapsedDesktop ? 'Thông tin tài khoản' : undefined}
              onClick={onCloseMobile}
              className={`flex items-center rounded-xl py-1.5 text-xs transition ${
                isCollapsedDesktop ? 'justify-center px-2' : 'gap-2.5 px-2.5'
              } ${
                isProfileInfoActive
                  ? 'bg-[#EAF6FD] font-bold text-[#2878B8]'
                  : 'font-semibold text-[#243B53] hover:bg-[#EAF6FD]/60 hover:text-[#2878B8]'
              }`}
            >
              <UserCog className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop && <span className="truncate">Thông tin tài khoản</span>}
            </Link>
            <Link
              to="/profile?tab=password"
              title={isCollapsedDesktop ? 'Đổi mật khẩu' : undefined}
              onClick={onCloseMobile}
              className={`flex items-center rounded-xl py-1.5 text-xs transition ${
                isCollapsedDesktop ? 'justify-center px-2' : 'gap-2.5 px-2.5'
              } ${
                isProfilePwdActive
                  ? 'bg-[#EAF6FD] font-bold text-[#2878B8]'
                  : 'font-semibold text-[#243B53] hover:bg-[#EAF6FD]/60 hover:text-[#2878B8]'
              }`}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop && <span className="truncate">Đổi mật khẩu</span>}
            </Link>
          </div>

          {!isCollapsedDesktop && (
            <div className="mt-2 rounded-xl border border-[#DCEAF3] bg-white px-3 py-2 text-[11px]">
              <span className="block truncate font-bold text-[#243B53]">{user.branchName}</span>
              <span className="mt-0.5 block truncate text-[#2878B8]">
                @{user.username} • {user.employeeCode}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarBody(collapsed)}</div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-[#243B53]/40 backdrop-blur-[1px] lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseMobile()
          }}
        >
          <aside className="h-full w-72 max-w-[86vw] shadow-2xl">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}
    </>
  )
}
