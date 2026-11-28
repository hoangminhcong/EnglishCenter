import { CalendarX2 } from 'lucide-react'

interface ScheduleEmptyStateProps {
  branchLabel?: string
  month: number
  defaultMonth: number
  onResetToDefault?: () => void
}

export default function ScheduleEmptyState({
  branchLabel,
  month,
  defaultMonth,
  onResetToDefault,
}: ScheduleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF6FD] text-[#2878B8]">
        <CalendarX2 className="h-6 w-6" />
      </div>
      <p className="mt-3 font-bold text-[#243B53]">Chưa có lịch khai giảng.</p>
      {branchLabel && (
        <p className="mt-1 max-w-md text-sm text-[#64748B]">
          Chưa có lớp khai giảng tại {branchLabel} trong tháng {month}. Hãy chọn tháng hoặc cơ sở khác.
        </p>
      )}
      {onResetToDefault && (
        <button
          type="button"
          onClick={onResetToDefault}
          className="mt-4 rounded-lg bg-[#2878B8] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1F6399]"
        >
          Xem lịch tháng {defaultMonth}
        </button>
      )}
    </div>
  )
}
