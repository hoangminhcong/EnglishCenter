import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pause, Play, Volume2, VolumeX } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  showLabel?: boolean
  labelText?: string
  defaultDurationSeconds?: number
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5]

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const total = Math.floor(sec)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Trình phát âm thanh dạng thanh viên thuốc (pill bar) tối giản giống ảnh mẫu 1 & 2:
 * - Chỉ hiển thị tại Study Zone và chế độ Xem lại / Lịch sử làm bài để học viên nghe lại.
 * - Tuyệt đối không tự động phát khi vừa vào trang hay chuyển câu.
 */
export default function AudioPlayer({
  src,
  showLabel = false,
  labelText = 'Âm thanh:',
  defaultDurationSeconds = 0,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(defaultDurationSeconds)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  // Dừng phát và đặt về 0:00 khi chuyển sang câu hỏi / file âm thanh khác
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }, [src])

  // Đóng menu tốc độ khi bấm ra ngoài
  useEffect(() => {
    if (!menuOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      audio.playbackRate = speed
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const handleSeek = (nextValue: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = nextValue
    setCurrentTime(nextValue)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    const nextMuted = !muted
    audio.muted = nextMuted
    setMuted(nextMuted)
  }

  const handleSelectSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
    setMenuOpen(false)
  }

  const effectiveDuration = duration > 0 ? duration : defaultDurationSeconds
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
      : 0

  return (
    <div className="ec-reading-font w-full">
      {showLabel && (
        <p className="mb-2.5 text-[14px] font-bold text-[#111827]">{labelText}</p>
      )}

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => {
          setPlaying(false)
          setCurrentTime(0)
        }}
      />

      {/* Thanh pill xám nhạt bo tròn 2 đầu giống hệt ảnh mẫu 1 */}
      <div className="relative flex h-[54px] w-full select-none items-center gap-3.5 rounded-full bg-[#F1F3F4] px-4 sm:px-5">
        {/* Nút Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Tạm dừng' : 'Phát âm thanh'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1F1F1F] transition hover:bg-black/8"
        >
          {playing ? (
            <Pause className="h-[18px] w-[18px] fill-current stroke-[2.2]" />
          ) : (
            <Play className="ml-0.5 h-[18px] w-[18px] fill-current stroke-[2.2]" />
          )}
        </button>

        {/* Thời gian hiện tại / Tổng thời lượng */}
        <span className="shrink-0 text-[14px] font-normal tabular-nums tracking-tight text-[#1F1F1F]">
          {formatSeconds(currentTime)} / {formatSeconds(effectiveDuration)}
        </span>

        {/* Thanh kéo tiến trình âm thanh */}
        <div className="group relative mx-1 flex h-6 min-w-[80px] flex-1 items-center">
          <div className="relative h-[4px] w-full rounded-full bg-[#5F6368]/75">
            <div
              className="h-full rounded-full bg-[#1F1F1F]"
              style={{ width: `${progressPercent}%` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1F1F1F]/25 transition group-hover:scale-110"
              style={{ left: `${progressPercent}%` }}
            >
              <span className="block h-full w-full scale-50 rounded-full bg-[#1F1F1F]" />
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={effectiveDuration || 1}
            step={0.05}
            value={Math.min(currentTime, effectiveDuration || 1)}
            aria-label="Thanh tiến trình âm thanh"
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Nút Loa bật / tắt tiếng */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1F1F1F] transition hover:bg-black/8"
        >
          {muted ? (
            <VolumeX className="h-[18px] w-[18px]" />
          ) : (
            <Volume2 className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* Nút 3 chấm dọc (Tốc độ phát) */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Tùy chọn tốc độ phát"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F1F1F] transition hover:bg-black/8"
          >
            <MoreVertical className="h-[18px] w-[18px]" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 z-30 mb-2 w-36 overflow-hidden rounded-xl border border-[#DCEAF3] bg-white py-1.5 shadow-lg">
              <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#718096]">
                Tốc độ phát
              </p>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectSpeed(opt)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold transition hover:bg-[#EAF6FD] ${
                    speed === opt ? 'bg-[#EAF6FD]/70 font-bold text-[#2878B8]' : 'text-[#243B53]'
                  }`}
                >
                  <span>{opt === 1 ? 'Chuẩn (1x)' : `${opt}x`}</span>
                  {speed === opt && <span className="text-[#2878B8]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
