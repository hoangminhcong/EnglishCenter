import { Lock } from 'lucide-react'
import type {
  QuestionReviewDetail,
  TestPart,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

interface QuestionNavigatorProps {
  activeParts: TestPart[]
  currentPartNumber: ToeicPartNumber
  currentGroupId?: string
  currentStage?: 'part_intro' | 'questions'
  activeQuestionId?: string
  answers: Record<string, string>
  flaggedQuestionIds: string[]
  listeningCompleted: boolean
  mode: 'exam' | 'review'
  reviewsMap?: Record<string, QuestionReviewDetail>
  onJumpToQuestion: (
    partNumber: ToeicPartNumber,
    groupId: string,
    questionId: string,
  ) => void
}

/**
 * Bảng danh sách câu hỏi dạng nút tròn chia theo từng Part (6 câu / hàng):
 * - Ở chế độ `exam` (đang thi):
 *   + Các Part Nghe (Part 1, 2, 3, 4) KHÔNG cho phép bấm chuyển qua lại giữa các câu hay các Part;
 *     chỉ cho phép cuộn xem trong cùng 1 cụm hội thoại đang phát hiện tại (nếu có nhiều câu trên cùng màn hình).
 *   + Các Part Đọc (Part 5, 6, 7) bị khóa cho tới khi hoàn thành xong toàn bộ phần Nghe (`listeningCompleted === true`).
 *   + Khi đã sang phần Đọc (`listeningCompleted === true`), Part 1–4 khóa vĩnh viễn không cho quay lại,
 *     còn Part 5–7 mở hoàn toàn để học viên bấm chuyển tự do giữa mọi câu hỏi và cụm câu.
 * - Ở chế độ `review` (chữa bài): mở toàn bộ các câu để xem lại tự do.
 */
export default function QuestionNavigator({
  activeParts,
  currentPartNumber,
  currentGroupId,
  currentStage = 'questions',
  activeQuestionId,
  answers,
  flaggedQuestionIds,
  listeningCompleted,
  mode,
  reviewsMap,
  onJumpToQuestion,
}: QuestionNavigatorProps) {
  const flaggedSet = new Set(flaggedQuestionIds)

  return (
    <div className="ec-reading-font flex flex-col gap-5">
      {activeParts.map((part) => {
        const isPartActive = part.partNumber === currentPartNumber
        const isReadingLocked =
          mode === 'exam' && part.section === 'reading' && !listeningCompleted
        const isListeningFinishedLocked =
          mode === 'exam' && part.section === 'listening' && listeningCompleted

        const partQuestions = part.questionGroups.flatMap((g) =>
          g.questions.map((q) => ({ question: q, group: g })),
        )

        return (
          <div key={part.id}>
            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span
                className={`font-semibold ${
                  isPartActive ? 'text-[#2878B8]' : 'text-[#243B53]'
                }`}
              >
                Part {part.partNumber}
              </span>

              {(isReadingLocked || isListeningFinishedLocked) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#718096]">
                  <Lock className="h-3 w-3" />
                  <span>Khóa</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-6 gap-2">
              {partQuestions.map(({ question, group }) => {
                const isCurrent = activeQuestionId === question.id
                const isAnswered = Boolean(answers[question.id])
                const isFlagged = flaggedSet.has(question.id)
                const review = mode === 'review' ? reviewsMap?.[question.id] : undefined

                // Trong phần Nghe (Part 1–4) khi đang thi: chỉ cho bấm nếu câu đó nằm trong đúng nhóm đang phát trên màn hình hiện tại
                const isInCurrentActiveListeningGroup =
                  !listeningCompleted &&
                  currentStage === 'questions' &&
                  part.partNumber === currentPartNumber &&
                  Boolean(currentGroupId) &&
                  group.id === currentGroupId

                const isListeningNavigationBlocked =
                  mode === 'exam' &&
                  part.section === 'listening' &&
                  !isInCurrentActiveListeningGroup

                const isDisabled = isReadingLocked || isListeningNavigationBlocked

                let circleClass = 'bg-[#B0B7C3] text-white hover:bg-[#94A3B8]'
                if (review) {
                  if (review.isCorrect) {
                    circleClass = 'bg-emerald-500 text-white'
                  } else if (review.selectedOptionId) {
                    circleClass = 'bg-rose-500 text-white'
                  } else {
                    circleClass = 'bg-[#B0B7C3] text-white'
                  }
                } else if (isCurrent) {
                  circleClass = 'bg-[#F26522] text-white ring-2 ring-[#F26522]/35'
                } else if (isAnswered) {
                  circleClass = 'bg-[#75BDEB] text-white'
                }

                const ariaStatus = review
                  ? review.isCorrect
                    ? 'Trả lời đúng'
                    : review.selectedOptionId
                      ? 'Trả lời sai'
                      : 'Bỏ trống'
                  : isAnswered
                    ? 'Đã chọn đáp án'
                    : 'Chưa trả lời'

                return (
                  <button
                    key={question.id}
                    type="button"
                    disabled={isDisabled}
                    aria-label={`Câu ${question.questionNumber} – ${ariaStatus}${isFlagged ? ' (Đã đánh dấu)' : ''}`}
                    title={`Câu ${question.questionNumber}: ${ariaStatus}`}
                    onClick={() => {
                      if (isDisabled) return
                      onJumpToQuestion(part.partNumber, group.id, question.id)
                    }}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums transition ${circleClass} ${
                      isDisabled ? 'cursor-not-allowed opacity-55 hover:bg-[#B0B7C3]' : ''
                    }`}
                  >
                    <span>{question.questionNumber}</span>
                    {isFlagged && (
                      <span
                        aria-label="Đã đánh dấu"
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-400"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
