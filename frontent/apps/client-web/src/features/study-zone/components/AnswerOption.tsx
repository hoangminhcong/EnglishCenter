import { CheckCircle2, XCircle } from 'lucide-react'
import ImageViewer from '@/features/study-zone/components/ImageViewer'
import AudioPlayer from '@/features/study-zone/components/AudioPlayer'
import type { QuestionOption } from '@/features/study-zone/types'

interface AnswerOptionProps {
  option: QuestionOption
  selected: boolean
  submitted: boolean
  isCorrectOption?: boolean
  onSelect: (optionId: string) => void
}

function normalizeStudyOption(option: QuestionOption) {
  const texts: string[] = []
  const images: Array<{ id: string; url: string; alt?: string; caption?: string }> = []
  const audios: Array<{ id: string; url: string; durationSeconds?: number }> = []

  if (option.text && option.text.trim().length > 0) {
    texts.push(option.text.trim())
  }
  if (option.imageUrl && option.imageUrl.trim().length > 0) {
    images.push({ id: `${option.id}-img`, url: option.imageUrl.trim() })
  }
  if (option.audioUrl && option.audioUrl.trim().length > 0) {
    audios.push({ id: `${option.id}-aud`, url: option.audioUrl.trim() })
  }

  for (const block of option.content ?? []) {
    if (block.type === 'text' && block.content.trim().length > 0) {
      texts.push(block.content.trim())
    } else if (block.type === 'image' && block.url.trim().length > 0) {
      images.push({
        id: block.id,
        url: block.url.trim(),
        alt: block.alt,
        caption: block.caption,
      })
    } else if (block.type === 'audio' && block.url.trim().length > 0) {
      audios.push({
        id: block.id,
        url: block.url.trim(),
        durationSeconds: block.durationSeconds,
      })
    }
  }

  return { texts, images, audios }
}

export default function AnswerOption({
  option,
  selected,
  submitted,
  isCorrectOption = false,
  onSelect,
}: AnswerOptionProps) {
  const isWrongSelection = submitted && selected && !isCorrectOption
  const isRightAnswer = submitted && isCorrectOption
  const { texts, images, audios } = normalizeStudyOption(option)

  if (submitted) {
    let boxClass = 'border-[#E2E8F0] bg-white text-[#243B53]'
    let badgeClass = 'border-[#CBD5E1] bg-white text-[#475569]'

    if (isRightAnswer) {
      boxClass = 'border-emerald-400 bg-emerald-50/75 text-[#14532D]'
      badgeClass = 'border-emerald-500 bg-emerald-500 text-white'
    } else if (isWrongSelection) {
      boxClass = 'border-rose-400 bg-rose-50/75 text-[#881337]'
      badgeClass = 'border-rose-500 bg-rose-500 text-white'
    }

    return (
      <div
        className={`ec-reading-font flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${boxClass}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${badgeClass}`}
          >
            {option.label}
          </span>

          {(texts.length > 0 || images.length > 0 || audios.length > 0) && (
            <div className="min-w-0 flex-1 space-y-2">
              {texts.map((txt, idx) => (
                <p
                  key={idx}
                  className={`text-[15px] leading-[1.55] ${
                    isRightAnswer ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {txt}
                </p>
              ))}

              {images.map((img) => (
                <div key={img.id}>
                  <ImageViewer src={img.url} alt={img.alt} caption={img.caption} compact />
                </div>
              ))}

              {audios.map((aud) => (
                <div key={aud.id}>
                  <AudioPlayer src={aud.url} defaultDurationSeconds={aud.durationSeconds} />
                </div>
              ))}
            </div>
          )}
        </div>

        {isRightAnswer && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{selected ? 'Đúng' : 'Đáp án đúng'}</span>
          </span>
        )}

        {isWrongSelection && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
            <XCircle className="h-3.5 w-3.5" />
            <span>Bạn chọn</span>
          </span>
        )}
      </div>
    )
  }

  const containerStyle = selected
    ? 'border-[#75BDEB] bg-[#EAF6FD]'
    : 'border-transparent bg-transparent hover:bg-[#EAF6FD]/60'

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(option.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(option.id)
        }
      }}
      className={`relative flex cursor-pointer flex-col gap-2 rounded-lg border px-3 py-2.5 transition ${containerStyle}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected
              ? 'border-[#75BDEB] bg-[#75BDEB] text-white'
              : 'border-[#75BDEB] bg-white'
          }`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF2F7] text-xs font-extrabold text-[#243B53]">
          {option.label}
        </span>

        {(texts.length > 0 || images.length > 0 || audios.length > 0) && (
          <div className="ec-reading-font min-w-0 flex-1 space-y-2">
            {texts.map((txt, idx) => (
              <p
                key={idx}
                className="text-[15.5px] font-semibold leading-[1.5] text-[#243B53]"
              >
                {txt}
              </p>
            ))}

            {images.map((img) => (
              <div key={img.id} onClick={(e) => e.stopPropagation()}>
                <ImageViewer src={img.url} alt={img.alt} caption={img.caption} compact />
              </div>
            ))}

            {audios.map((aud) => (
              <div key={aud.id} onClick={(e) => e.stopPropagation()}>
                <AudioPlayer src={aud.url} defaultDurationSeconds={aud.durationSeconds} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
