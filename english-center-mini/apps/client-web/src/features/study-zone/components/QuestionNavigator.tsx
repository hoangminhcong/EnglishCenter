import type { ExerciseAttemptResult, Question } from '@/features/study-zone/types'

interface QuestionNavigatorProps {
  questions: Question[]
  currentIndex: number
  answers: Record<string, string>
  result: ExerciseAttemptResult | null
  onSelectIndex: (index: number) => void
}

/**
 * Bảng số thứ tự câu hỏi (1..N) cho phép học viên chuyển nhanh tới bất kỳ câu nào:
 * - Khi đang làm bài: phân biệt rõ câu đang xem, câu đã trả lời và câu chưa trả lời.
 * - Sau khi nộp bài: tô màu xanh lá cho câu đúng, màu đỏ cho câu sai/chưa làm để học viên bấm vào xem lại lời giải.
 */
export default function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  result,
  onSelectIndex,
}: QuestionNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-bold uppercase text-[#718096]">Bảng câu hỏi:</span>
      {questions.map((q, idx) => {
        const isCurrent = idx === currentIndex
        const isAnswered = Boolean(answers[q.id])
        const review = result?.reviews[q.id]

        let colorClass = 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
        if (result && review) {
          colorClass = review.isCorrect
            ? 'border-emerald-600 bg-emerald-500 text-white'
            : review.selectedOptionId
              ? 'border-rose-600 bg-rose-500 text-white'
              : 'border-slate-300 bg-slate-100 text-[#475569]'
        } else if (isCurrent) {
          colorClass = 'border-[#2878B8] bg-[#2878B8] text-white'
        } else if (isAnswered) {
          colorClass = 'border-[#75BDEB] bg-[#EAF6FD] text-[#2878B8]'
        }

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelectIndex(idx)}
            aria-label={`Câu ${idx + 1}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition ${colorClass} ${
              isCurrent ? 'ring-2 ring-[#2878B8] ring-offset-1' : ''
            }`}
          >
            {idx + 1}
          </button>
        )
      })}
    </div>
  )
}
