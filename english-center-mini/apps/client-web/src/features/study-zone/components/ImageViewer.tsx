import { useEffect, useState } from 'react'
import { Image as ImageIcon, ZoomIn, X } from 'lucide-react'

interface ImageViewerProps {
  src: string
  alt?: string
  caption?: string
  compact?: boolean
}

/**
 * Hiển thị hình ảnh câu hỏi / phương án trả lời giữ đúng tỷ lệ (không làm méo ảnh)
 * và hỗ trợ phóng to (Zoom Lightbox) khi học viên muốn quan sát chi tiết tranh TOEIC Part 1 / biểu đồ Part 3-4.
 */
export default function ImageViewer({
  src,
  alt = 'Hình minh họa câu hỏi',
  caption,
  compact = false,
}: ImageViewerProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const failed = !src || failedSrc === src

  useEffect(() => {
    if (!zoomed) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [zoomed])

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-xl border border-[#DCEAF3] bg-[#EAF6FD] p-4 text-[#2878B8]">
        <ImageIcon className="h-8 w-8" />
        <span className="text-xs font-semibold">{alt}</span>
      </div>
    )
  }

  return (
    <>
      <figure className="group relative overflow-hidden rounded-xl border border-[#DCEAF3] bg-[#F5FAFE]">
        <div className="relative flex items-center justify-center bg-slate-900/5">
          <img
            src={src}
            alt={alt}
            onError={() => setFailedSrc(src)}
            className={`w-full object-contain ${compact ? 'max-h-40' : 'max-h-[380px]'}`}
          />

          {!compact && (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Phóng to hình ảnh"
              className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-black/80"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Phóng to
            </button>
          )}
        </div>

        {caption && (
          <figcaption className="border-t border-[#DCEAF3] bg-white px-3 py-2 text-center text-xs text-[#718096]">
            {caption}
          </figcaption>
        )}
      </figure>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomed(false)
          }}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Đóng ảnh phóng to"
              className="absolute right-4 top-4 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={src} alt={alt} className="max-h-[84vh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
