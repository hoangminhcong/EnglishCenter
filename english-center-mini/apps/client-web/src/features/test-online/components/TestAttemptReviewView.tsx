import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LayoutGrid, X } from 'lucide-react'
import { EmptyBlock } from '@/components/ui/StateViews'
import TestResultSummary from '@/features/test-online/components/TestResultSummary'
import TestQuestionRenderer from '@/features/test-online/components/TestQuestionRenderer'
import QuestionNavigator from '@/features/test-online/components/QuestionNavigator'
import type {
  QuestionGroup,
  Test,
  TestAttempt,
  TestAttemptResult,
  TestPart,
  TestQuestion,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

interface SingleQuestionCursor {
  part: TestPart
  group: QuestionGroup
  question: TestQuestion
}

interface TestAttemptReviewViewProps {
  result: TestAttemptResult
  test: Test | null
  attempt: TestAttempt | null
  onRetakeTest: () => void
}

export default function TestAttemptReviewView({
  result,
  test,
  attempt,
  onRetakeTest,
}: TestAttemptReviewViewProps) {
  const [viewStyle, setViewStyle] = useState<'list' | 'single'>('single')
  const [activeQuestionCursor, setActiveQuestionCursor] = useState(0)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)

  const activeParts = useMemo(() => {
    if (!test) return []
    const selected = attempt?.selectedParts ?? result.selectedParts
    const set = new Set(selected)
    return test.parts
      .filter((p) => set.has(p.partNumber))
      .sort((a, b) => a.partNumber - b.partNumber)
  }, [test, attempt, result])

  const flatGroups = useMemo(() => {
    return activeParts.flatMap((part) =>
      part.questionGroups.map((group) => ({ part, group })),
    )
  }, [activeParts])

  const flatSingleQuestions = useMemo<SingleQuestionCursor[]>(() => {
    return activeParts.flatMap((part) =>
      part.questionGroups.flatMap((group) =>
        group.questions.map((question) => ({ part, group, question })),
      ),
    )
  }, [activeParts])

  const effectiveAnswers = useMemo(() => {
    if (attempt) return attempt.answers
    const fallback: Record<string, string> = {}
    for (const rev of Object.values(result.reviews)) {
      if (rev.selectedOptionId) {
        fallback[rev.questionId] = rev.selectedOptionId
      }
    }
    return fallback
  }, [attempt, result])

  const effectiveFlags = useMemo(() => {
    if (attempt) return attempt.flaggedQuestionIds
    return Object.values(result.reviews)
      .filter((rev) => rev.isFlagged)
      .map((rev) => rev.questionId)
  }, [attempt, result])

  const currentQuestionItem =
    flatSingleQuestions[activeQuestionCursor] ?? flatSingleQuestions[0]

  useEffect(() => {
    if (viewStyle === 'single') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [activeQuestionCursor, viewStyle])

  const handleJumpToQuestion = (
    _partNumber: ToeicPartNumber,
    _groupId: string,
    questionId: string,
  ) => {
    setNavDrawerOpen(false)
    const idx = flatSingleQuestions.findIndex((item) => item.question.id === questionId)
    if (idx >= 0) {
      setActiveQuestionCursor(idx)
    }
    window.setTimeout(() => {
      const el = document.getElementById(`test-question-${questionId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  return (
    <div className="flex flex-col gap-6">
      <TestResultSummary result={result} onRetakeTest={onRetakeTest} />

      {!test || activeParts.length === 0 ? (
        <EmptyBlock title="Đề thi gốc hiện không khả dụng để xem lại chi tiết từng câu." />
      ) : (
        <>
          <div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-[#DCEAF3] bg-[#EFF4F8] p-1 text-xs font-bold">
              <span className="px-3 py-1.5 text-[#718096]">Kiểu xem</span>
              <button
                type="button"
                onClick={() => setViewStyle('list')}
                className={`rounded-lg px-4 py-1.5 transition ${
                  viewStyle === 'list'
                    ? 'bg-white font-extrabold text-[#2878B8] shadow-2xs'
                    : 'text-[#243B53] hover:text-[#2878B8]'
                }`}
              >
                Danh sách
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('single')}
                className={`rounded-lg px-4 py-1.5 transition ${
                  viewStyle === 'single'
                    ? 'bg-white font-extrabold text-[#2878B8] shadow-2xs'
                    : 'text-[#243B53] hover:text-[#2878B8]'
                }`}
              >
                Theo câu
              </button>
            </div>
          </div>

          {viewStyle === 'single' && currentQuestionItem ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCEAF3] bg-white px-5 py-3.5 shadow-2xs">
                <span className="text-base font-black text-[#243B53]">
                  Câu {currentQuestionItem.question.questionNumber}
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={activeQuestionCursor <= 0}
                    onClick={() => setActiveQuestionCursor((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCEAF3] bg-white px-4 py-2 text-xs font-extrabold uppercase text-[#718096] transition hover:border-[#75BDEB] hover:text-[#243B53] disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>CÂU TRƯỚC</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionCursor >= flatSingleQuestions.length - 1}
                    onClick={() =>
                      setActiveQuestionCursor((i) =>
                        Math.min(flatSingleQuestions.length - 1, i + 1),
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#75BDEB] px-4 py-2 text-xs font-extrabold uppercase text-white transition hover:bg-[#5aaee3] disabled:opacity-40"
                  >
                    <span>CÂU TIẾP THEO</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <TestQuestionRenderer
                part={currentQuestionItem.part}
                group={currentQuestionItem.group}
                activeQuestionId={currentQuestionItem.question.id}
                singleQuestionId={currentQuestionItem.question.id}
                answers={effectiveAnswers}
                flaggedQuestionIds={effectiveFlags}
                mode="review"
                reviewsMap={result.reviews}
                onSelectAnswer={() => {}}
                onToggleFlag={() => {}}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {flatGroups.map(({ part, group }) => (
                <div key={group.id}>
                  <TestQuestionRenderer
                    part={part}
                    group={group}
                    answers={effectiveAnswers}
                    flaggedQuestionIds={effectiveFlags}
                    mode="review"
                    reviewsMap={result.reviews}
                    onSelectAnswer={() => {}}
                    onToggleFlag={() => {}}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setNavDrawerOpen((v) => !v)}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-[#75BDEB] px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-xl transition hover:bg-[#5aaee3]"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>DANH SÁCH CÂU</span>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px]">
              {result.totalQuestions}
            </span>
          </button>

          {navDrawerOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/25"
              onClick={(e) => {
                if (e.target === e.currentTarget) setNavDrawerOpen(false)
              }}
            >
              <aside className="fixed bottom-0 left-0 top-0 z-50 w-[280px] overflow-y-auto border-r border-[#DCEAF3] bg-[#F4F5F7] p-4 shadow-2xl sm:w-[300px]">
                <div className="mb-3 flex items-center justify-between border-b border-[#DCEAF3] pb-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#243B53]">
                    Danh sách câu hỏi ({result.totalQuestions})
                  </span>
                  <button
                    type="button"
                    onClick={() => setNavDrawerOpen(false)}
                    aria-label="Đóng bảng câu hỏi"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#718096] transition hover:bg-[#EAF6FD] hover:text-[#243B53]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <QuestionNavigator
                  activeParts={activeParts}
                  currentPartNumber={
                    currentQuestionItem?.part.partNumber ?? activeParts[0]?.partNumber ?? 1
                  }
                  activeQuestionId={currentQuestionItem?.question.id}
                  answers={effectiveAnswers}
                  flaggedQuestionIds={effectiveFlags}
                  listeningCompleted
                  mode="review"
                  reviewsMap={result.reviews}
                  onJumpToQuestion={handleJumpToQuestion}
                />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  )
}
