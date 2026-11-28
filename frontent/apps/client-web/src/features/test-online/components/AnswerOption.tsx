import { CheckCircle2, XCircle } from 'lucide-react'
import ImageViewer from '@/features/study-zone/components/ImageViewer'
import { normalizeOptionMedia } from '@/features/test-online/utils/questionMedia'
import type { TestOption } from '@/features/test-online/types/test.types'

interface AnswerOptionProps {
  option: TestOption
  isSelected: boolean
  disabled?: boolean
  reviewState?: {
    isCorrectOption: boolean
    isUserWrongSelection: boolean
  }
  onSelect: (optionId: string) => void
}

export default function AnswerOption({
  option,
  isSelected,
  disabled = false,
  reviewState,
  onSelect,
}: AnswerOptionProps) {
  const { texts, images } = normalizeOptionMedia(option)

  // Chế độ Chữa bài / Xem lại đáp án
  if (reviewState) {
    let boxClass = 'border-[#E2E8F0] bg-white text-[#243B53]'
    let badgeClass = 'border-[#CBD5E1] bg-white text-[#475569]'

    if (reviewState.isCorrectOption) {
      boxClass = 'border-emerald-400 bg-emerald-50/75 text-[#14532D]'
      badgeClass = 'border-emerald-500 bg-emerald-500 text-white'
    } else if (reviewState.isUserWrongSelection) {
      boxClass = 'border-rose-400 bg-rose-50/75 text-[#881337]'
      badgeClass = 'border-rose-500 bg-rose-500 text-white'
    }

    return (
      <div
        className={`ec-reading-font flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${boxClass}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${badgeClass}`}
          >
            {option.label}
          </span>

          {(texts.length > 0 || images.length > 0) && (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {texts.map((txt, idx) => (
                <span
                  key={idx}
                  className={`text-[15px] leading-[1.6] ${
                    reviewState.isCorrectOption ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {txt}
                </span>
              ))}

              {images.map((img) => (
                <div key={img.id} className="mt-1 w-full">
                  <ImageViewer src={img.url} alt={img.alt} compact />
                </div>
              ))}
            </div>
          )}
        </div>

        {reviewState.isCorrectOption && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Đáp án đúng</span>
          </span>
        )}

        {reviewState.isUserWrongSelection && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
            <XCircle className="h-3.5 w-3.5" />
            <span>Bạn chọn</span>
          </span>
        )}
      </div>
    )
  }

  // Chế độ đang làm bài thi trực tuyến
  const containerClass = isSelected
    ? 'border-[#75BDEB] bg-[#EAF6FD]/70 text-[#243B53]'
    : 'border-transparent bg-transparent text-[#243B53] hover:bg-[#F5FAFE]'
  const radioCircleClass = isSelected
    ? 'border-[#2878B8] bg-[#2878B8]'
    : 'border-[#CBD5E0] bg-white'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option.id)}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${containerClass} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${radioCircleClass}`}
      >
        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>

      <div className="ec-reading-font flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2 text-[15.5px] leading-[1.6] text-[#1E293B]">
          <span className="font-semibold text-[#243B53]">{option.label}.</span>
          {texts.map((txt, idx) => (
            <span key={idx} className="font-normal leading-[1.6]">
              {txt}
            </span>
          ))}
        </div>

        {images.map((img) => (
          <div key={img.id} className="mt-1 w-full">
            <ImageViewer src={img.url} alt={img.alt} compact />
          </div>
        ))}
      </div>
    </button>
  )
}
