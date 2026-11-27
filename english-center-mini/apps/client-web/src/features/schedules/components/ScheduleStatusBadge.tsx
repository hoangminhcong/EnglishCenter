import type { ScheduleStatus } from '@/features/schedules/types'

interface StatusConfig {
  label: string
  badgeClass: string
  dotClass: string
}

const STATUS_MAP: Record<ScheduleStatus, StatusConfig> = {
  open: {
    label: 'Đang nhận học viên',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  upcoming: {
    label: 'Sắp khai giảng',
    badgeClass: 'border-[#A7D8F5] bg-[#EAF6FD] text-[#2878B8]',
    dotClass: 'bg-[#75BDEB]',
  },
  full: {
    label: 'Đã đủ học viên',
    badgeClass: 'border-orange-200 bg-orange-50 text-[#F26522]',
    dotClass: 'bg-[#F26522]',
  },
  started: {
    label: 'Đã khai giảng',
    badgeClass: 'border-gray-200 bg-gray-100 text-gray-600',
    dotClass: 'bg-gray-400',
  },
  cancelled: {
    label: 'Đã hủy',
    badgeClass: 'border-red-200 bg-red-50 text-red-600',
    dotClass: 'bg-red-500',
  },
}

export default function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const cfg = STATUS_MAP[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  )
}
