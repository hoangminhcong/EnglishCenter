import { useEffect, useRef, useState } from 'react'

export interface TestTimerState {
  remainingSeconds: number
  formattedTime: string
  isPaused: boolean
  isWarningFiveMinutes: boolean
  isDangerOneMinute: boolean
  isExpired: boolean
}

export function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

function calcRemainingFromDeadline(
  deadlineAt: string | undefined,
  pausedAt?: string,
): number {
  if (!deadlineAt) return 0
  const referenceNowMs = pausedAt ? new Date(pausedAt).getTime() : Date.now()
  const diffMs = new Date(deadlineAt).getTime() - referenceNowMs
  return Math.max(0, Math.ceil(diffMs / 1000))
}

/**
 * Đồng hồ đếm ngược chuẩn thời gian thực dựa trên `deadlineAt` (ISO timestamp):
 * - Khi đang ở màn hình giới thiệu Part (`pausedAt` tồn tại), đồng hồ đứng yên và không trừ giờ làm bài.
 * - Chỉ bắt đầu đếm ngược khi học viên đã nhấn "BẮT ĐẦU PART".
 * - Khi tải lại trang (F5), thời gian còn lại vẫn được giữ nguyên chính xác từ `deadlineAt`.
 */
export function useTestTimer(
  deadlineAt: string | undefined,
  enabled: boolean,
  onExpire?: () => void,
  pausedAt?: string,
): TestTimerState {
  const expiredCalledRef = useRef(false)
  const isPaused = Boolean(pausedAt)

  const [liveSeconds, setLiveSeconds] = useState<number>(() =>
    calcRemainingFromDeadline(deadlineAt, pausedAt),
  )

  useEffect(() => {
    expiredCalledRef.current = false
  }, [deadlineAt])

  useEffect(() => {
    if (!deadlineAt || isPaused || !enabled) return

    const tick = () => {
      const next = calcRemainingFromDeadline(deadlineAt)
      setLiveSeconds(next)
      if (next <= 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true
        onExpire?.()
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [deadlineAt, enabled, isPaused, onExpire])

  // Khi đang tạm dừng ở màn hình giới thiệu Part, tính trực tiếp từ pausedAt để đồng hồ đứng yên tuyệt đối
  const remainingSeconds =
    isPaused || !enabled
      ? calcRemainingFromDeadline(deadlineAt, pausedAt)
      : liveSeconds

  return {
    remainingSeconds,
    formattedTime: formatHms(remainingSeconds),
    isPaused,
    isWarningFiveMinutes: !isPaused && remainingSeconds > 60 && remainingSeconds <= 300,
    isDangerOneMinute: !isPaused && remainingSeconds > 0 && remainingSeconds <= 60,
    isExpired: !isPaused && Boolean(deadlineAt) && remainingSeconds <= 0,
  }
}
