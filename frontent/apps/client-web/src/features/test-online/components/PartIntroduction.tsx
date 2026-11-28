import ImageViewer from '@/features/study-zone/components/ImageViewer'
import type { TestPart } from '@/features/test-online/types/test.types'

interface PartIntroductionProps {
  part: TestPart
  listeningJustCompletedNotice?: boolean
  answeredCount?: number
  totalQuestions?: number
  onOpenNav?: () => void
  onStartPart: () => void
}

/**
 * Màn hình giới thiệu Part cho tất cả các Part (Part 1 – Part 7):
 * - Phía trên bên trái là tiêu đề PART, bên phải là huy hiệu tiến độ màu cam.
 * - Khung đọc hướng dẫn đặt cân đối và nút "BẮT ĐẦU" căn chính giữa ngay bên dưới.
 */
export default function PartIntroduction({
  part,
  listeningJustCompletedNotice = false,
  answeredCount = 0,
  totalQuestions = 200,
  onOpenNav,
  onStartPart,
}: PartIntroductionProps) {
  const isListening = part.section === 'listening'
  const sampleImageBlock = part.introductionBlocks?.find((b) => b.type === 'image')

  return (
    <div className="ec-reading-font rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-2xs sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#2878B8] sm:text-2xl">
          {part.title}
        </h2>

        <button
          type="button"
          onClick={onOpenNav}
          className="min-w-[96px] rounded-md bg-[#F26522] px-5 py-2.5 text-center text-sm font-bold tabular-nums text-white shadow-2xs transition hover:bg-[#d95314]"
        >
          {answeredCount}/{totalQuestions}
        </button>
      </div>

      {listeningJustCompletedNotice && (
        <div className="mx-auto mb-5 max-w-3xl rounded-lg border border-[#75BDEB] bg-[#EAF6FD] px-4 py-3 text-center text-sm font-semibold text-[#243B53]">
          Bạn đã hoàn thành phần Nghe (Listening). Hãy xem hướng dẫn bên dưới và bắt đầu phần Đọc (Reading).
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <div className="max-h-[62vh] overflow-y-auto rounded-sm border border-[#CBD5E0] bg-white p-5 text-[14.5px] leading-[1.72] text-[#243B53] [scrollbar-color:#75BDEB_#EDF2F7] [scrollbar-width:thin] sm:p-6">
          <p className="mb-5 text-center text-base font-medium uppercase tracking-wide text-[#4A5568]">
            {isListening ? 'HƯỚNG DẪN PHẦN NGHE (LISTENING)' : 'HƯỚNG DẪN PHẦN ĐỌC (READING)'}
          </p>

          <p className="mb-4 text-[#243B53]">{part.description}</p>

          <p className="font-bold uppercase text-[#243B53]">
            {part.title} – {part.vietnameseTitle}:
          </p>

          <ul className="mt-2 list-disc space-y-2 pl-5 text-[#243B53]">
            {part.instructions.map((inst, idx) => (
              <li key={idx}>{inst}</li>
            ))}
          </ul>

          {part.importantNotes.length > 0 && (
            <div className="mt-4 rounded-md bg-[#F5FAFE] p-3.5 text-xs text-[#4A5568]">
              {part.importantNotes.map((note, idx) => (
                <p key={idx} className="mt-1 first:mt-0">
                  • {note}
                </p>
              ))}
            </div>
          )}

          {sampleImageBlock && sampleImageBlock.type === 'image' && (
            <div className="mt-5">
              <ImageViewer
                src={sampleImageBlock.url}
                alt={sampleImageBlock.alt ?? part.title}
                caption={sampleImageBlock.caption}
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onStartPart}
            className="rounded-lg bg-[#75BDEB] px-10 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-xs transition hover:bg-[#5aaee3]"
          >
            BẮT ĐẦU
          </button>
        </div>
      </div>
    </div>
  )
}
