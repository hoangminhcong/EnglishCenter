import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-[#243B53] sm:text-2xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-[#64748B]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
