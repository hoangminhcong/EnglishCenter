import type { ReactNode } from 'react'
import { CircleAlert, LoaderCircle, Search } from 'lucide-react'

const stateBoxClass =
  'flex flex-col items-center justify-center gap-2 rounded-xl border border-[#DCEAF3] bg-white px-4 py-12 text-center'

export function LoadingBlock({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <div className={stateBoxClass} role="status">
      <LoaderCircle className="h-7 w-7 animate-spin text-[#2878B8]" />
      <p className="text-sm text-[#64748B]">{label}</p>
    </div>
  )
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className={stateBoxClass}>
      <Search className="h-7 w-7 text-[#75BDEB]" />
      <p className="font-bold text-[#243B53]">{title}</p>
      {description && <p className="text-sm text-[#64748B]">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className={stateBoxClass} role="alert">
      <CircleAlert className="h-7 w-7 text-[#F26522]" />
      <p className="font-bold text-[#243B53]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg bg-[#2878B8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1F6399]"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}
