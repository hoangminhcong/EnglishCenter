import { useEffect, useState } from 'react'
import { Play, X } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import { toSafeEmbedUrl, toSafeVideoFileUrl } from '@/utils/safeUrl'
import type { CourseVideoMedia } from '@/features/courses/types'

interface CourseVideoProps {
  courseName: string
  media: CourseVideoMedia
}

export default function CourseVideo({ courseName, media }: CourseVideoProps) {
  const [openModal, setOpenModal] = useState(false)
  // Chỉ phát video từ nguồn tin cậy (YouTube/Vimeo hoặc tệp .mp4/.webm); URL khác bị bỏ qua
  const embedUrl = toSafeEmbedUrl(media.videoUrl)
  const fileUrl = toSafeVideoFileUrl(media.videoUrl)
  const hasVideo = Boolean(embedUrl || fileUrl)

  useEffect(() => {
    if (!openModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border-4 border-white/90 bg-slate-900 shadow-2xl">
        {hasVideo ? (
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            aria-label={media.title ? `Phát video: ${media.title}` : `Phát video giới thiệu ${courseName}`}
            className="group relative block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300"
          >
            <ImageBox
              src={media.thumbnailUrl}
              alt={media.title || `Video giới thiệu ${courseName}`}
              label={courseName}
              className="aspect-[16/9] w-full transition-transform duration-300 group-hover:scale-[1.03]"
            />

            <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/15">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-red-600 text-white shadow-2xl transition-transform group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
            </div>

            {media.title && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 py-3 text-xs text-white sm:text-sm">
                <span className="line-clamp-1 font-semibold">{media.title}</span>
                {media.durationLabel && (
                  <span className="ml-2 shrink-0 font-mono text-cyan-300">{media.durationLabel}</span>
                )}
              </div>
            )}
          </button>
        ) : (
          <ImageBox
            src={media.thumbnailUrl}
            alt={media.title || `Minh họa đầu ra ${courseName}`}
            label={courseName}
            className="aspect-[16/9] w-full"
          />
        )}
      </div>

      {/* Modal trình phát Video khi người dùng nhấn nút Play */}
      {openModal && hasVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={media.title || `Video khóa học ${courseName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenModal(false)
          }}
        >
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
              <p className="line-clamp-1 text-sm font-bold">{media.title || courseName}</p>
              <button
                type="button"
                aria-label="Đóng video"
                onClick={() => setOpenModal(false)}
                className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="aspect-video w-full">
              {fileUrl ? (
                <video src={fileUrl} controls autoPlay className="h-full w-full" />
              ) : (
                <iframe
                  title={media.title || courseName}
                  src={embedUrl ?? undefined}
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
