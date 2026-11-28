import { Bookmark } from 'lucide-react'
import ImageViewer from '@/features/study-zone/components/ImageViewer'
import TestAudioPlayer from '@/features/test-online/components/AudioPlayer'
import AnswerOption from '@/features/test-online/components/AnswerOption'
import {
  normalizeGroupMedia,
  normalizeQuestionMedia,
  type NormalizedAudioItem,
  type NormalizedImageItem,
  type NormalizedTextItem,
} from '@/features/test-online/utils/questionMedia'
import type {
  AudioGroupState,
  QuestionGroup,
  QuestionReviewDetail,
  TestPart,
} from '@/features/test-online/types/test.types'

interface TestQuestionRendererProps {
  part: TestPart
  group: QuestionGroup
  activeQuestionId?: string
  /** Khi truyền singleQuestionId (Part 1, 2, 5 hoặc Xem kết quả "Theo câu"), chỉ hiển thị 1 câu hỏi đó trên khung chuẩn 2 cột */
  singleQuestionId?: string
  answers: Record<string, string>
  flaggedQuestionIds: string[]
  audioGroupState?: AudioGroupState
  mode: 'exam' | 'review'
  reviewsMap?: Record<string, QuestionReviewDetail>
  onSelectAnswer: (questionId: string, optionId: string) => void
  onToggleFlag: (questionId: string) => void
  onAudioPlayStarted?: (audioGroupId: string) => void
  onAudioPlayCompleted?: (audioGroupId: string) => void
}

function renderFormattedLines(
  rawText: string,
  questionNumber: number,
  correctLabel?: string,
) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const startsWithOptionChoice = lines[0]?.startsWith('(A)')

  return (
    <div className="space-y-1">
      {startsWithOptionChoice && (
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

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

/**
 * Bộ hiển thị câu hỏi giữ nguyên KHUNG 2 CỘT đồng nhất ở tất cả các Part (Part 1 – Part 7):
 * - Mỗi câu hỏi đều hỗ trợ 3 thành phần: `questionText` (câu hỏi) + `audioUrl` (âm thanh) + `imageUrl` (ảnh), kèm `passageText` nếu là đoạn văn nhóm.
 * - Câu nào khuyết phần nào (không có chữ câu hỏi, không có ảnh hoặc không có âm thanh) sẽ tự động ẩn phần khuyết đó mà VẪN GIỮ NGUYÊN KHUNG 2 CỘT, không làm vỡ hay co giật bố cục.
 */
export default function TestQuestionRenderer({
  part,
  group,
  activeQuestionId,
  singleQuestionId,
  answers,
  flaggedQuestionIds,
  audioGroupState,
  mode,
  reviewsMap,
  onSelectAnswer,
  onToggleFlag,
  onAudioPlayStarted,
  onAudioPlayCompleted,
}: TestQuestionRendererProps) {
  const flaggedSet = new Set(flaggedQuestionIds)

  const visibleQuestions = singleQuestionId
    ? group.questions.filter((q) => q.id === singleQuestionId)
    : group.questions
  const questionsToRender = visibleQuestions.length > 0 ? visibleQuestions : group.questions
  const isSingleQuestionFrame = questionsToRender.length === 1
  const singleQuestion = isSingleQuestionFrame ? questionsToRender[0] : undefined

  const groupMedia = normalizeGroupMedia(group)
  const singleQMedia = singleQuestion ? normalizeQuestionMedia(singleQuestion) : null

  // Tổng hợp dữ liệu cho KHUNG CỘT TRÁI:
  // - Nếu là khung 1 câu (Part 1, 2, 5 hoặc xem "Theo câu"): gộp cả ảnh, đoạn văn, chữ câu hỏi và âm thanh của nhóm + câu đơn vào khung bên trái.
  // - Nếu là khung cụm nhiều câu (Part 3, 4, 6, 7): khung trái hiển thị ảnh / đoạn văn / âm thanh dùng chung của cụm; từng câu bên phải hiển thị câu hỏi/ảnh/âm thanh riêng của câu đó.
  const leftImages: NormalizedImageItem[] = dedupeByUrl(
    isSingleQuestionFrame && singleQMedia
      ? [...groupMedia.images, ...singleQMedia.images]
      : groupMedia.images,
  )

  const leftPassages: NormalizedTextItem[] = groupMedia.passages
  const leftQuestionTexts: NormalizedTextItem[] =
    isSingleQuestionFrame && singleQMedia ? singleQMedia.texts : []

  const leftAudios: NormalizedAudioItem[] = dedupeByUrl(
    isSingleQuestionFrame && singleQMedia
      ? [...groupMedia.audios, ...singleQMedia.audios]
      : groupMedia.audios,
  )

  // Khóa định danh audio cho chế độ thi 1 lần: ưu tiên audio riêng của câu đơn (nếu câu đơn có audio riêng), ngược lại dùng audioGroupId của nhóm
  const effectiveExamAudioKey =
    isSingleQuestionFrame && singleQuestion && (singleQMedia?.audios.length ?? 0) > 0 && groupMedia.audios.length === 0
      ? singleQuestion.id
      : (group.audioGroupId ?? group.id)

  const hasVisibleLeftContent =
    leftImages.length > 0 ||
    leftPassages.length > 0 ||
    leftQuestionTexts.length > 0 ||
    (mode === 'review' && leftAudios.length > 0)

  const sharedGroupTranscript =
    mode === 'review' && reviewsMap
      ? group.questions.map((q) => reviewsMap[q.id]).find((r) => Boolean(r?.transcript))
      : undefined

  // =========================================================================
  // 1. CHẾ ĐỘ CHỮA BÀI / XEM LẠI KẾT QUẢ (`mode === 'review'`) - KHUNG 2 CỘT ĐỒNG NHẤT
  // =========================================================================
  if (mode === 'review') {
    return (
      <div className="ec-reading-font">
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          {/* KHUNG TRÁI: Ảnh + Đoạn văn / Câu hỏi + Âm thanh (giữ nguyên khung kể cả khi khuyết thành phần) */}
          <div className="relative flex min-h-[220px] flex-col gap-5 rounded-2xl border border-[#DCEAF3] bg-white p-5 pr-7 shadow-2xs sm:p-6 sm:pr-8 lg:sticky lg:top-24 lg:max-h-[78vh] lg:overflow-y-auto">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-1.5 top-4 w-[5px] rounded-full bg-[#75BDEB]"
            />

            {singleQuestion ? (
              <p className="text-[16px] font-bold text-[#1E293B]">
                Câu {singleQuestion.questionNumber}.
              </p>
            ) : (
              group.groupTitle && (
                <p className="text-[15px] font-bold text-[#1E293B]">{group.groupTitle}</p>
              )
            )}

            {leftImages.map((img) => (
              <ImageViewer key={img.id} src={img.url} alt={img.alt} />
            ))}

            {leftPassages.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border border-[#DCEAF3] p-5 text-[15.5px] leading-[1.78] text-[#1E293B] sm:p-6 ${
                  p.variant === 'instruction'
                    ? 'bg-[#EAF6FD]/70 font-semibold text-[#2878B8]'
                    : 'whitespace-pre-line bg-[#F8FAFC] font-normal'
                }`}
              >
                {p.content}
              </div>
            ))}

            {leftQuestionTexts.map((qt) => (
              <p
                key={qt.id}
                className="whitespace-pre-line text-[16px] font-medium leading-[1.72] text-[#1E293B]"
              >
                {qt.content}
              </p>
            ))}

            {leftAudios.map((aud) => (
              <TestAudioPlayer
                key={aud.id}
                audioGroupId={effectiveExamAudioKey}
                src={aud.url}
                durationSeconds={aud.durationSeconds}
                status="LOCKED"
                mode="review"
              />
            ))}

            {!hasVisibleLeftContent && (
              <p className="text-sm text-[#94A3B8]">
                {singleQuestion
                  ? `Nội dung câu hỏi số ${singleQuestion.questionNumber}`
                  : part.title}
              </p>
            )}
          </div>

          {/* KHUNG PHẢI: Phương án trả lời A, B, C, D + Giải thích chi tiết */}
          <div className="relative flex min-h-[220px] flex-col gap-5 rounded-2xl border border-[#DCEAF3] bg-white p-4 pr-6 shadow-2xs sm:p-5 sm:pr-7">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-1.5 top-4 w-[5px] rounded-full bg-[#75BDEB]"
            />

            {questionsToRender.map((question) => {
              const selectedOptionId = answers[question.id]
              const review = reviewsMap?.[question.id]
              const correctLabel = question.options.find(
                (o) => o.id === review?.correctOptionId,
              )?.label

              const qMedia = isSingleQuestionFrame ? null : normalizeQuestionMedia(question)

              const effectiveTranscript =
                review?.transcript ?? sharedGroupTranscript?.transcript
              const effectiveTranslation =
                review?.translation ?? sharedGroupTranscript?.translation

              const questionBorderClass = review?.isCorrect
                ? 'border-[#BBF7D0]'
                : review?.selectedOptionId
                  ? 'border-[#FECDD3]'
                  : 'border-[#DCEAF3]'

              return (
                <div
                  key={question.id}
                  id={`test-question-${question.id}`}
                  className={`rounded-xl border bg-white p-4 sm:p-5 ${questionBorderClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[16px] font-bold text-[#1E293B]">
                      Câu {question.questionNumber}.
                    </span>

                    {review && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          review.isCorrect
                            ? 'bg-emerald-100 text-emerald-700'
                            : review.selectedOptionId
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {review.isCorrect
                          ? 'Trả lời đúng'
                          : review.selectedOptionId
                            ? 'Trả lời sai'
                            : 'Bỏ trống'}
                      </span>
                    )}
                  </div>

                  {/* Ở chế độ Danh sách cụm câu (Part 3, 4, 6, 7): hiển thị thêm câu hỏi / ảnh / audio riêng của từng câu nếu câu đó có */}
                  {qMedia &&
                    (qMedia.images.length > 0 ||
                      qMedia.texts.length > 0 ||
                      qMedia.audios.length > 0) && (
                      <div className="mt-2.5 flex flex-col gap-3">
                        {qMedia.images.map((img) => (
                          <ImageViewer key={img.id} src={img.url} alt={img.alt} />
                        ))}

                        {qMedia.texts.map((txt) => (
                          <p
                            key={txt.id}
                            className="whitespace-pre-line text-[15.5px] font-semibold leading-[1.68] text-[#1E293B]"
                          >
                            {txt.content}
                          </p>
                        ))}

                        {qMedia.audios.map((aud) => (
                          <TestAudioPlayer
                            key={aud.id}
                            audioGroupId={question.id}
                            src={aud.url}
                            durationSeconds={aud.durationSeconds}
                            status="LOCKED"
                            mode="review"
                          />
                        ))}
                      </div>
                    )}

                  <div className="mt-3.5 flex flex-col gap-2.5">
                    {question.options.map((opt) => {
                      const isOptSelected = selectedOptionId === opt.id
                      const reviewState = review
                        ? {
                            isCorrectOption: review.correctOptionId === opt.id,
                            isUserWrongSelection:
                              review.selectedOptionId === opt.id && !review.isCorrect,
                          }
                        : undefined

                      return (
                        <AnswerOption
                          key={opt.id}
                          option={opt}
                          isSelected={isOptSelected}
                          disabled
                          reviewState={reviewState}
                          onSelect={() => {}}
                        />
                      )
                    })}
                  </div>

                  {review && (
                    <div className="mt-4 rounded-xl bg-[#F0F7FF] p-5 text-[14.5px] leading-[1.72] text-[#1E293B]">
                      <p className="text-[15px] font-bold text-[#111827]">Giải thích:</p>

                      {effectiveTranscript && (
                        <div className="mt-2.5">
                          {renderFormattedLines(
                            effectiveTranscript,
                            question.questionNumber,
                            correctLabel,
                          )}
                        </div>
                      )}

                      {effectiveTranslation && (
                        <div className="mt-4">
                          {renderFormattedLines(
                            effectiveTranslation,
                            question.questionNumber,
                            correctLabel,
                          )}
                        </div>
                      )}

                      {review.explanation && (
                        <p
                          className={`font-normal text-[#334155] ${
                            effectiveTranscript || effectiveTranslation
                              ? 'mt-3.5 border-t border-[#DCEAF3] pt-3 text-[14px]'
                              : 'mt-2'
                          }`}
                        >
                          {review.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 2. CHẾ ĐỘ ĐANG LÀM BÀI THI (`mode === 'exam'`) - KHUNG 2 CỘT ĐỒNG NHẤT CHO MỌI PART
  // =========================================================================
  return (
    <div className="ec-reading-font">
      {/* Thẻ phát âm thanh ẩn cho câu/nhóm có audioUrl */}
      {leftAudios.map((aud) => (
        <TestAudioPlayer
          key={aud.id}
          audioGroupId={effectiveExamAudioKey}
          src={aud.url}
          durationSeconds={aud.durationSeconds}
          status={audioGroupState?.status ?? 'NOT_PLAYED'}
          mode="exam_strict_once"
          onPlayStarted={onAudioPlayStarted}
          onPlayCompleted={onAudioPlayCompleted}
        />
      ))}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)]">
        {/* KHUNG TRÁI: Luôn giữ nguyên khung ở mọi Part 1–7 kể cả khi câu khuyết chữ / khuyết ảnh */}
        <div className="flex min-h-[240px] flex-col gap-4 rounded-lg border border-[#EEF4F8] border-r-4 border-r-[#75BDEB] bg-[#FAFBFD] p-5 lg:sticky lg:top-20 lg:max-h-[74vh] lg:overflow-y-auto">
          {singleQuestion ? (
            <span className="text-[16px] font-bold text-[#1E293B]">
              Câu {singleQuestion.questionNumber}.
            </span>
          ) : (
            group.groupTitle && (
              <span className="text-[15px] font-semibold text-[#1E293B]">
                {group.groupTitle}
              </span>
            )
          )}

          {leftImages.map((img) => (
            <ImageViewer
              key={img.id}
              src={img.url}
              alt={img.alt}
              caption={img.caption}
            />
          ))}

          {leftPassages.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border border-[#DCEAF3] p-5 text-[15.5px] leading-[1.78] text-[#1E293B] sm:p-6 ${
                p.variant === 'instruction'
                  ? 'bg-[#EAF6FD]/70 font-semibold text-[#2878B8]'
                  : 'whitespace-pre-line bg-white font-normal'
              }`}
            >
              {p.content}
            </div>
          ))}

          {leftQuestionTexts.map((qt) => (
            <p
              key={qt.id}
              className="whitespace-pre-line text-[16px] font-normal leading-[1.72] text-[#1E293B] sm:text-[16.5px]"
            >
              {qt.content}
            </p>
          ))}
        </div>

        {/* KHUNG PHẢI: Danh sách phương án lựa chọn A, B, C, D */}
        <div className="flex min-h-[240px] flex-col gap-5">
          {questionsToRender.map((question) => {
            const selectedOptionId = answers[question.id]
            const isFlagged = flaggedSet.has(question.id)
            const isCurrent = activeQuestionId === question.id
            const qMedia = isSingleQuestionFrame ? null : normalizeQuestionMedia(question)

            return (
              <div
                key={question.id}
                id={`test-question-${question.id}`}
                className={`rounded-xl border p-4 transition sm:p-5 ${
                  isCurrent
                    ? 'border-[#75BDEB] bg-[#F5FAFE]/70'
                    : 'border-[#DCEAF3] bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-bold text-[#1E293B]">
                    {question.questionNumber}.
                  </span>

                  <button
                    type="button"
                    onClick={() => onToggleFlag(question.id)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      isFlagged
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-[#DCEAF3] bg-white text-[#64748B] hover:border-[#75BDEB] hover:text-[#1E293B]'
                    }`}
                  >
                    <Bookmark
                      className={`h-3.5 w-3.5 ${isFlagged ? 'fill-amber-500 text-amber-600' : ''}`}
                    />
                    <span>{isFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                  </button>
                </div>

                {/* Trong cụm nhiều câu (Part 3, 4, 6, 7): hiển thị câu hỏi / ảnh riêng của từng câu nếu có */}
                {qMedia && (qMedia.images.length > 0 || qMedia.texts.length > 0) && (
                  <div className="mt-3 flex flex-col gap-3">
                    {qMedia.images.map((img) => (
                      <ImageViewer
                        key={img.id}
                        src={img.url}
                        alt={img.alt}
                        caption={img.caption}
                      />
                    ))}

                    {qMedia.texts.map((txt) => (
                      <p
                        key={txt.id}
                        className="whitespace-pre-line text-[16px] font-semibold leading-[1.68] text-[#1E293B] sm:text-[16.5px]"
                      >
                        {txt.content}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2.5">
                  {question.options.map((opt) => (
                    <AnswerOption
                      key={opt.id}
                      option={opt}
                      isSelected={selectedOptionId === opt.id}
                      onSelect={(optId) => onSelectAnswer(question.id, optId)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
