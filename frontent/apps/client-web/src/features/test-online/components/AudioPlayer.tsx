import { useEffect, useRef, useState } from 'react'
import SharedAudioPlayer from '@/features/study-zone/components/AudioPlayer'
import type { AudioPlaybackStatus } from '@/features/test-online/types/test.types'

interface TestAudioPlayerProps {
  audioGroupId: string
  src: string
  durationSeconds?: number
  status: AudioPlaybackStatus
  mode: 'exam_strict_once' | 'review'
  onPlayStarted?: (audioGroupId: string) => void
  onPlayCompleted?: (audioGroupId: string) => void
}

/**
 * Trình phát âm thanh cho Test Online:
 * - Khi đang làm bài Test Online (`mode === 'exam_strict_once'`):
 *   + Ẩn hoàn toàn giao diện điều khiển âm thanh (học viên không nhìn thấy thanh phát, không thể tạm dừng, tua hay đổi tốc độ).
 *   + Vẫn tự động phát ngầm âm thanh đề bài 1 lần duy nhất và ngay khi kết thúc âm thanh sẽ kích hoạt tự động chuyển sang câu/nhóm tiếp theo.
 * - Khi xem lại ở Lịch sử làm bài / Kết quả bài thi (`mode === 'review'`):
 *   + Hiển thị nhãn "Âm thanh:" kèm thanh phát dạng viên thuốc để học viên nghe lại tự do.
 */
export default function TestAudioPlayer({
  audioGroupId,
  src,
  durationSeconds = 5,
  status,
  mode,
  onPlayStarted,
  onPlayCompleted,
}: TestAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onPlayStartedRef = useRef(onPlayStarted)
  const onPlayCompletedRef = useRef(onPlayCompleted)
  const completedGroupRef = useRef<string | null>(null)
  const [needsGesture, setNeedsGesture] = useState(false)

  useEffect(() => {
    onPlayStartedRef.current = onPlayStarted
    onPlayCompletedRef.current = onPlayCompleted
  }, [onPlayStarted, onPlayCompleted])

  const isLocked = status === 'LOCKED' || status === 'COMPLETED'

  // Tự động phát ngầm 1 lần duy nhất cho nhóm câu hỏi Listening hiện tại
  useEffect(() => {
    if (mode !== 'exam_strict_once' || isLocked) return
    const audio = audioRef.current
    if (!audio) return

    let cancelled = false
    audio.playbackRate = 1

    const tryPlay = async () => {
      try {
        await audio.play()
        if (!cancelled) {
          setNeedsGesture(false)
          onPlayStartedRef.current?.(audioGroupId)
        }
      } catch {
        if (!cancelled) {
          setNeedsGesture(true)
        }
      }
    }

    void tryPlay()

    return () => {
      cancelled = true
    }
  }, [audioGroupId, isLocked, mode, src])

  // Nếu người dùng vừa tải lại trang (F5) khiến trình duyệt yêu cầu 1 tương tác chuột để phát tiếp tiếng:
  // tự động bắt cú click/phím đầu tiên trên trang để phát tiếp ngay mà không hiện bất kỳ nút tua/dừng nào.
  useEffect(() => {
    if (mode !== 'exam_strict_once' || !needsGesture || isLocked) return

    const resumeOnInteraction = () => {
      const audio = audioRef.current
      if (!audio) return
      audio.playbackRate = 1
      void audio
        .play()
        .then(() => {
          setNeedsGesture(false)
          onPlayStartedRef.current?.(audioGroupId)
        })
        .catch(() => {
          // giữ trạng thái chờ thao tác tiếp theo
        })
    }

    window.addEventListener('pointerdown', resumeOnInteraction, { once: true })
    window.addEventListener('keydown', resumeOnInteraction, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resumeOnInteraction)
      window.removeEventListener('keydown', resumeOnInteraction)
    }
  }, [audioGroupId, isLocked, mode, needsGesture])

  if (mode === 'review') {
    return (
      <SharedAudioPlayer
        src={src}
        showLabel
        labelText="Âm thanh:"
        defaultDurationSeconds={durationSeconds}
      />
    )
  }

  if (isLocked) {
    return null
  }

  const finishOnce = () => {
    if (completedGroupRef.current === audioGroupId) return
    completedGroupRef.current = audioGroupId
    onPlayCompletedRef.current?.(audioGroupId)
  }

  return (
    <audio
      ref={audioRef}
      src={src}
      preload="auto"
      className="hidden"
      onRateChange={(e) => {
        if (e.currentTarget.playbackRate !== 1) {
          e.currentTarget.playbackRate = 1
        }
      }}
      onEnded={finishOnce}
      onError={() => {
        // Trường hợp đường dẫn âm thanh lỗi kỹ thuật: chờ hết thời lượng dự kiến rồi tự động chuyển câu để không làm kẹt bài thi
        window.setTimeout(finishOnce, Math.max(2, durationSeconds) * 1000)
      }}
    />
  )
}
