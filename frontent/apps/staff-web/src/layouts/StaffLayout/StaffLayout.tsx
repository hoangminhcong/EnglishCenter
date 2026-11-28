import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { StaffBreadcrumb } from '@/layouts/StaffLayout/StaffBreadcrumb'
import { StaffHeader } from '@/layouts/StaffLayout/StaffHeader'
import { StaffSidebar } from '@/layouts/StaffLayout/StaffSidebar'

export function StaffLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#F5FAFE] text-[#243B53]">
      <StaffSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <StaffHeader
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <StaffBreadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
