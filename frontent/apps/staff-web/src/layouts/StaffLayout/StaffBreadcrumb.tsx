import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { resolveBreadcrumbMeta } from '@/services/permissions/navigation.config'
import { resolveStaffDefaultHomePath } from '@/services/permissions/permissions.config'

export function StaffBreadcrumb() {
  const { pathname } = useLocation()
  const { session } = useStaffAuth()
  const matched = resolveBreadcrumbMeta(pathname)
  const homePath = resolveStaffDefaultHomePath(session)

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#64748B]"
    >
      <Link to={homePath} className="inline-flex items-center gap-1 hover:text-[#2878B8]">
        <Home className="h-3.5 w-3.5" />
        <span>English Center</span>
      </Link>

      {matched ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span>{matched.group}</span>
          {matched.parent && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
              <Link to={matched.parent.path} className="hover:text-[#2878B8]">
                {matched.parent.label}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="font-bold text-[#243B53]">{matched.label}</span>
        </>
      ) : pathname === '/403' ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="font-bold text-[#B93A2E]">403 – Hạn chế quyền truy cập</span>
        </>
      ) : null}
    </nav>
  )
}
