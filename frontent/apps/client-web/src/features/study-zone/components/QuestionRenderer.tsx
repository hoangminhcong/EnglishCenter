import AudioPlayer from '@/features/study-zone/components/AudioPlayer'
import ImageViewer from '@/features/study-zone/components/ImageViewer'
import AnswerOption from '@/features/study-zone/components/AnswerOption'
import type {
  Question,
  QuestionReviewItem,
} from '@/features/study-zone/types'

interface QuestionRendererProps {
  question: Question
  questionIndex: number
  selectedOptionId: string | null
  submitted: boolean
  review?: QuestionReviewItem
  onSelectOption: (optionId: string) => void
}

function normalizeStudyQuestion(question: Question) {
  const texts: Array<{ id: string; content: string; variant?: string }> = []
  const images: Array<{ id: string; url: string; alt?: string; caption?: string }> = []
  const audios: Array<{ id: string; url: string; durationSeconds?: number }> = []

  if (question.questionText && question.questionText.trim().length > 0) {
    texts.push({
      id: `${question.id}-qtext`,
      content: question.questionText.trim(),
      variant: 'prompt',
    })
  }

  if (question.imageUrl && question.imageUrl.trim().length > 0) {
    images.push({
      id: `${question.id}-qimg`,
      url: question.imageUrl.trim(),
      alt: question.imageAlt,
    })
  }

  if (question.audioUrl && question.audioUrl.trim().length > 0) {
    audios.push({
      id: `${question.id}-qaud`,
      url: question.audioUrl.trim(),
      durationSeconds: question.audioDurationSeconds,
    })
  }

  for (const block of question.content ?? []) {
    if (block.type === 'text' && block.content.trim().length > 0) {
      texts.push({
        id: block.id,
        content: block.content.trim(),
        variant: block.variant,
      })
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

function renderTranscriptLines(
  rawText: string,
  questionNumber: number,
  correctLabel?: string,
) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const startsWithChoice = lines[0]?.startsWith('(A)')

  return (
    <div className="space-y-1">
      {startsWithChoice && (
        <p className="font-normal text-[#1E293B]">{questionNumber}.</p>
      )}
      {lines.map((line, idx) => {
        const isCorrectChoiceLine =
          Boolean(correctLabel) && line.startsWith(`(${correctLabel})`)
        return (
          <p
            key={idx}
            className={
              isCorrectChoiceLine
                ? 'font-bold text-[#111827]'
                : 'font-normal text-[#334155]'
            }
          >
            {line}
          </p>
        )
      })}
    </div>
  )
}

export default function QuestionRenderer({
  question,
  questionIndex,
  selectedOptionId,
  submitted,
  review,
  onSelectOption,
}: QuestionRendererProps) {
  const { texts, images, audios } = normalizeStudyQuestion(question)

  const correctLabel = question.options.find(
    (o) => o.id === review?.correctOptionId,
  )?.label

  const reviewBorderClass = submitted
    ? review?.isCorrect
      ? 'border-[#BBF7D0]'
      : selectedOptionId
        ? 'border-[#FECDD3]'
        : 'border-[#DCEAF3]'
    : 'border-transparent'

  return (
    <div className="ec-reading-font border-t border-[#EAF6FD] pt-5">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        {/* CỘT TRÁI: Giữ nguyên khung cố định (Ảnh + Câu hỏi + Âm thanh; khuyết thành phần nào tự ẩn thành phần đó) */}
        <section
          className={`relative flex min-h-[220px] flex-col gap-4 rounded-2xl p-5 sm:p-6 ${
            submitted
              ? 'border border-[#DCEAF3] bg-white pr-7 shadow-2xs sm:pr-8'
              : 'bg-[#FAFBFD]'
          }`}
        >
          {submitted && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-1.5 top-4 w-[5px] rounded-full bg-[#75BDEB]"
            />
          )}

          <h2 className="text-[16px] font-bold text-[#243B53]">
            Câu {questionIndex + 1}
          </h2>

          <div className="space-y-4">
            {images.map((img) => (
              <ImageViewer
                key={img.id}
                src={img.url}
                alt={img.alt}
                caption={submitted ? undefined : img.caption}
              />
            ))}

            {texts.map((txt) =>
              txt.variant === 'instruction' ? (
                <p key={txt.id} className="text-sm font-semibold text-[#2878B8] sm:text-base">
                  {txt.content}
                </p>
              ) : (
                <p
                  key={txt.id}
                  className="whitespace-pre-line text-[15.5px] font-normal leading-[1.72] text-[#243B53] sm:text-[16px]"
                >
                  {txt.content}
                </p>
              ),
            )}

            {audios.map((aud) => (
              <AudioPlayer
                key={aud.id}
                src={aud.url}
                showLabel
                labelText="Âm thanh:"
                defaultDurationSeconds={aud.durationSeconds}
              />
            ))}
          </div>
        </section>

        {/* CỘT PHẢI: Giữ nguyên khung phương án A, B, C, D + Giải thích */}
        <section
          className={`relative flex min-h-[220px] flex-col justify-between rounded-2xl ${
            submitted
              ? 'border border-[#DCEAF3] bg-white p-4 pr-6 shadow-2xs sm:p-5 sm:pr-7'
              : 'bg-[#FAFBFD] p-5 sm:p-6'
          }`}
        >
          {submitted && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-1.5 top-4 w-[5px] rounded-full bg-[#75BDEB]"
            />
          )}

          <div
            className={
              submitted
                ? `rounded-xl border bg-white p-4 sm:p-5 ${reviewBorderClass}`
                : ''
            }
          >
            <div
              role="radiogroup"
              aria-label={`Các phương án câu ${questionIndex + 1}`}
              className="space-y-2.5"
            >
              {question.options.map((option) => (
                <AnswerOption
                  key={option.id}
                  option={option}
                  selected={selectedOptionId === option.id}
                  submitted={submitted}
                  isCorrectOption={
                    submitted && review ? review.correctOptionId === option.id : false
                  }
                  onSelect={onSelectOption}
                />
              ))}
            </div>

            {submitted && review && (
              <div className="mt-4 rounded-xl bg-[#F0F7FF] p-5 text-[14.5px] leading-[1.72] text-[#1E293B]">
                <h3 className="text-[15px] font-bold text-[#111827]">Giải thích:</h3>

                {review.audioTranscript && (
                  <div className="mt-2.5">
                    {renderTranscriptLines(
                      review.audioTranscript,
                      questionIndex + 1,
                      correctLabel,
                    )}
                  </div>
                )}

                {review.audioTranslation && (
                  <div className="mt-4">
                    {renderTranscriptLines(
                      review.audioTranslation,
                      questionIndex + 1,
                      correctLabel,
                    )}
                  </div>
                )}

                {review.explanation && (
                  <div
                    className={`whitespace-pre-line font-normal text-[#334155] ${
                      review.audioTranscript || review.audioTranslation
                        ? 'mt-3.5 border-t border-[#DCEAF3] pt-3 text-[14px]'
                        : 'mt-2'
                    }`}
                  >
                    {review.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
