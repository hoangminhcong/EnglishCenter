import { AlertTriangle, Clock, PauseCircle } from 'lucide-react'
import type { TestTimerState } from '@/features/test-online/hooks/useTestTimer'

interface TestTimerProps {
  timer: TestTimerState
}

export default function TestTimer({ timer }: TestTimerProps) {
  const { formattedTime, isPaused, isWarningFiveMinutes, isDangerOneMinute } = timer

  const styleClass = isPaused
    ? 'bg-white/25 text-white border border-white/40'
    : isDangerOneMinute
      ? 'bg-rose-600 text-white animate-pulse'
      : isWarningFiveMinutes
        ? 'bg-amber-500 text-white'
        : 'bg-white/25 text-white border border-white/40'

  return (
    <div
      title={
        isPaused
          ? 'Đang ở màn hình giới thiệu Part (Chưa tính giờ làm bài cho đến khi bạn nhấn Bắt đầu)'
          : isDangerOneMinute
            ? 'Còn dưới 1 phút! Hệ thống sẽ tự động thu bài khi hết giờ.'
            : isWarningFiveMinutes
              ? 'Còn dưới 5 phút làm bài.'
              : 'Thời gian làm bài còn lại'
      }
      className={`ec-reading-font inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tabular-nums tracking-tight shadow-2xs transition sm:text-sm ${styleClass}`}
    >
      {isPaused ? (
        <PauseCircle className="h-3.5 w-3.5 shrink-0 text-white" />
      ) : isDangerOneMinute || isWarningFiveMinutes ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{formattedTime}</span>
    </div>
  )
}
