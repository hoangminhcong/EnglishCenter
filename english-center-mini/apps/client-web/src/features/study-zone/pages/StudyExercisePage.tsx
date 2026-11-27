import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  CircleArrowLeft,
  CircleArrowRight,
  LayoutGrid,
  X,
} from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { studyZoneApi } from '@/features/study-zone/api/studyZoneApi'
import { useStudyExercise } from '@/features/study-zone/hooks/useStudyZone'
import QuestionRenderer from '@/features/study-zone/components/QuestionRenderer'
import QuestionNavigator from '@/features/study-zone/components/QuestionNavigator'
import SubmissionModal from '@/features/study-zone/components/SubmissionModal'
import ExitExamConfirmModal from '@/features/test-online/components/ExitExamConfirmModal'
import {
  STUDY_CATEGORY_PATHS,
  type ExerciseAttemptResult,
} from '@/features/study-zone/types'

/**
 * Trang Làm bài tập trắc nghiệm Study Zone (/study-zone/practice/:exerciseId)
 * Thiết kế đồng bộ theo ảnh mẫu 2 với bảng màu xanh dương nhạt English Center (#75BDEB).
 */
export default function StudyExercisePage() {
  const { exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: exercise, loading, error, retry } = useStudyExercise(exerciseId)

  usePageTitle(exercise ? `${exercise.title} – ${exercise.subtitle}` : 'Làm bài tập Study Zone')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)

  const allowLeaveRef = useRef(false)

  const [activeResult, setActiveResult] = useState<ExerciseAttemptResult | null>(null)
  const isSubmitted = Boolean(activeResult)

  const isDoingExercise = Boolean(exercise && !isSubmitted && !submitting)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDoingExercise &&
      !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!isDoingExercise) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDoingExercise])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [exerciseId, currentIndex, isSubmitted])

  useEffect(() => {
    if (!exercise || isSubmitted) return
    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [exercise, isSubmitted])

  if (loading) {
    return (
      <div className="ec-font min-h-screen bg-[#F5FAFE] pb-16">
        <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <LoadingBlock label="Đang tải đề bài tập..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ec-font min-h-screen bg-[#F5FAFE] pb-16">
        <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <ErrorBlock message={error} onRetry={retry} />
        </div>
      </div>
    )
  }

  if (!exercise || exercise.questions.length === 0) {
    return (
      <div className="ec-font min-h-screen bg-[#F5FAFE] pb-16">
        <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
          <EmptyBlock
            title="Không tìm thấy bài tập hoặc câu hỏi"
            description="Bài tập bạn truy cập không tồn tại hoặc đang được cập nhật câu hỏi."
            action={
              <Link
                to="/study-zone/grammar"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#75BDEB] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5aaee3]"
              >
                <ArrowLeft className="h-4 w-4" /> Về Study Zone
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const questions = exercise.questions
  const totalQuestions = questions.length
  const safeIndex = Math.min(Math.max(0, currentIndex), totalQuestions - 1)
  const currentQuestion = questions[safeIndex]
  const answeredCount = Object.keys(answers).length

  const categoryPath = STUDY_CATEGORY_PATHS[exercise.category]

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
  }

  const handleConfirmSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await studyZoneApi.submitExercise({
        exerciseId: exercise.id,
        answers,
        durationSeconds: Math.max(1, elapsedSeconds),
      })
      setActiveResult(result)
      setConfirmOpen(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Không thể nộp bài lúc này. Bài làm của bạn vẫn được giữ nguyên, hãy thử lại.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartNewAttempt = () => {
    setActiveResult(null)
    setAnswers({})
    setCurrentIndex(0)
    setElapsedSeconds(0)
    setSubmitError(null)
    window.scrollTo({ top: 0 })
  }

  const handleRequestExit = () => {
    if (isSubmitted) {
      navigate(categoryPath)
      return
    }
    setExitModalOpen(true)
  }

  const handleConfirmExit = () => {
    allowLeaveRef.current = true
    setExitModalOpen(false)
    if (blocker.state === 'blocked') {
      blocker.proceed()
      return
    }
    navigate(categoryPath)
  }

  const handleCancelExit = () => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
    setExitModalOpen(false)
  }

  const currentReview = activeResult?.reviews[currentQuestion.id]
  const selectedForDisplay = isSubmitted
    ? (currentReview?.selectedOptionId ?? null)
    : (answers[currentQuestion.id] ?? null)

  const displayTitle =
    exercise.title.toUpperCase().startsWith('TEST')
      ? `Test ${exercise.title.replace(/test\s*/i, '')}`
      : exercise.title

  return (
    <div className="ec-reading-font min-h-screen bg-[#F4F6F8] pb-16">
      {/* Thanh Topbar màu xanh dương nhạt English Center */}
      <div className="sticky top-0 z-30 border-b border-[#DCEAF3] bg-[#75BDEB] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
          {/* Bên trái: Nút quay lại + Logo thương hiệu English Center */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleRequestExit}
              title="Quay về danh sách bài học"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-col leading-none select-none">
              <span className="text-base font-black uppercase tracking-tight text-white ec-shadow-text sm:text-xl">
                <span className="text-[#F26522]">E</span>NGLISH CENTER
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/95">
                STUDY ZONE – LUYỆN TẬP TOEIC
              </span>
            </div>
          </div>

          {/* Bên phải: LÀM LẠI (khi đã nộp) + NỘP BÀI (khi đang làm) + Tên học viên + Nút lưới câu hỏi */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {isSubmitted ? (
              <button
                type="button"
                onClick={handleStartNewAttempt}
                className="rounded-lg bg-[#F26522] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-2xs transition hover:bg-[#d95314] sm:px-5"
              >
                LÀM LẠI
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="rounded-lg bg-[#F26522] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-2xs transition hover:bg-[#d95314] sm:px-5"
              >
                NỘP BÀI
              </button>
            )}

            <span className="hidden text-sm font-semibold text-white ec-shadow-text sm:inline">
              {user?.fullName ?? 'Học viên'}
            </span>

            <button
              type="button"
              onClick={() => setNavDrawerOpen((v) => !v)}
              title="Mở danh sách câu hỏi"
              aria-expanded={navDrawerOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/25 text-white transition hover:bg-white/35"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar danh sách câu hỏi trượt bên trái giống ảnh mẫu 5 */}
      {navDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/25"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNavDrawerOpen(false)
          }}
        >
          <aside className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto border-r border-[#DCEAF3] bg-[#F8FAFC] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#DCEAF3] pb-3">
              <span className="text-sm font-bold text-[#243B53]">{displayTitle}</span>
              <button
                type="button"
                onClick={() => setNavDrawerOpen(false)}
                className="rounded-lg p-1 text-[#718096] hover:bg-[#EAF6FD] hover:text-[#243B53]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <QuestionNavigator
              questions={questions}
              currentIndex={safeIndex}
              answers={answers}
              result={activeResult}
              onSelectIndex={(idx) => {
                setCurrentIndex(idx)
                setNavDrawerOpen(false)
              }}
            />
          </aside>
        </div>
      )}

      {/* Khu vực khung trắng làm bài chính giống ảnh mẫu 2 */}
      <main className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        {submitError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            <CircleAlert className="h-5 w-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-xs sm:p-7">
          {/* Hàng điều khiển trên cùng: Test 1 (trái) | CÂU TRƯỚC - CÂU TIẾP (giữa) | 0/10 (cam bên phải) */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-medium text-[#243B53] sm:text-2xl">
              {displayTitle}
            </h1>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-2 rounded-md bg-[#94A9B9] px-4 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-[#7e96a8] disabled:cursor-not-allowed disabled:opacity-65 sm:px-5"
              >
                <CircleArrowLeft className="h-4 w-4" />
                <span>CÂU TRƯỚC</span>
              </button>

              <button
                type="button"
                disabled={safeIndex === totalQuestions - 1}
                onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                className="inline-flex items-center gap-2 rounded-md bg-[#75BDEB] px-4 py-2.5 text-xs font-bold uppercase text-white shadow-2xs transition hover:bg-[#5aaee3] disabled:cursor-not-allowed disabled:opacity-55 sm:px-5"
              >
                <span>CÂU TIẾP</span>
                <CircleArrowRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              title="Mở bảng câu hỏi"
              className="min-w-[84px] rounded-md bg-[#F26522] px-5 py-2.5 text-center text-sm font-bold text-white shadow-2xs transition hover:bg-[#d95314]"
            >
              {isSubmitted
                ? `${activeResult?.correctCount}/${totalQuestions}`
                : `${answeredCount}/${totalQuestions}`}
            </button>
          </div>

          <QuestionRenderer
            question={currentQuestion}
            questionIndex={safeIndex}
            selectedOptionId={selectedForDisplay}
            submitted={isSubmitted}
            review={currentReview}
            onSelectOption={handleSelectOption}
          />
        </div>
      </main>

      <SubmissionModal
        open={confirmOpen}
        exerciseTitle={`${displayTitle} · ${exercise.subtitle}`}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        submitting={submitting}
        errorMessage={submitError}
        onCancel={() => {
          setSubmitError(null)
          setConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmit}
      />

      <ExitExamConfirmModal
        open={exitModalOpen || blocker.state === 'blocked'}
        title="Xác nhận thoát bài tập"
        description="Bạn đang làm bài tập trắc nghiệm và chưa nộp bài. Nếu thoát bây giờ, các câu trả lời chưa nộp sẽ không được lưu. Bạn có chắc chắn muốn thoát?"
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onCancel={handleCancelExit}
        onConfirmExit={handleConfirmExit}
      />
    </div>
  )
}
