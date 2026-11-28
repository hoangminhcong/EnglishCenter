import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Lock,
  Send,
  X,
} from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTestAttemptSession } from '@/features/test-online/hooks/useTestAttempt'
import { useTestTimer } from '@/features/test-online/hooks/useTestTimer'
import { attemptApi } from '@/features/test-online/api/attemptApi'
import TestTimer from '@/features/test-online/components/TestTimer'
import PartIntroduction from '@/features/test-online/components/PartIntroduction'
import TestQuestionRenderer from '@/features/test-online/components/TestQuestionRenderer'
import QuestionNavigator from '@/features/test-online/components/QuestionNavigator'
import TestSubmitModal from '@/features/test-online/components/TestSubmitModal'
import ExitExamConfirmModal from '@/features/test-online/components/ExitExamConfirmModal'
import {
  isMultiQuestionSharedGroup,
  normalizeGroupMedia,
  normalizeQuestionMedia,
} from '@/features/test-online/utils/questionMedia'
import type {
  QuestionGroup,
  TestAttempt,
  TestPart,
  TestQuestion,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

interface ExamStepCursor {
  part: TestPart
  group: QuestionGroup
  /** Nếu là bài theo từng câu đơn (Part 1, Part 2, Part 5) thì mỗi bước là 1 câu riêng lẻ */
  singleQuestion?: TestQuestion
  firstQuestionId: string
  stepLabel: string
}

export default function TestTakingPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: session, loading, error, retry } = useTestAttemptSession(attemptId)

  const [localAttempt, setLocalAttempt] = useState<TestAttempt | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)

  const allowLeaveRef = useRef(false)

  const attempt =
    localAttempt && localAttempt.id === session?.attempt.id
      ? localAttempt
      : (session?.attempt ?? null)
  const test = session?.test ?? null

  const isExamInProgress = Boolean(
    attempt && attempt.status === 'in_progress' && !submitting,
  )

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isExamInProgress &&
      !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname &&
      !nextLocation.pathname.startsWith('/test-online/result/'),
  )

  useEffect(() => {
    if (!isExamInProgress) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isExamInProgress])

  useEffect(() => {
    if (attempt && attempt.status !== 'in_progress') {
      navigate(`/test-online/result/${attempt.id}`, { replace: true })
    }
  }, [attempt, navigate])

  const activeParts = useMemo(() => {
    if (!test || !attempt) return []
    const set = new Set(attempt.selectedParts)
    return test.parts
      .filter((p) => set.has(p.partNumber))
      .sort((a, b) => a.partNumber - b.partNumber)
  }, [test, attempt])

  /**
   * Chuỗi bước làm bài:
   * - Part 1, Part 2, Part 5 (câu đơn): mỗi bước là 1 câu riêng lẻ.
   * - Part 3, Part 4, Part 6, Part 7 (cụm câu dùng chung đoạn hội thoại / bài nói / đoạn văn): mỗi bước là 1 cụm câu hỏi.
   */
  const examSteps = useMemo<ExamStepCursor[]>(() => {
    const steps: ExamStepCursor[] = []
    for (const part of activeParts) {
      for (const group of part.questionGroups) {
        const isSharedMultiQuestionStimulus = isMultiQuestionSharedGroup(group)

        if (!isSharedMultiQuestionStimulus) {
          for (const q of group.questions) {
            steps.push({
              part,
              group,
              singleQuestion: q,
              firstQuestionId: q.id,
              stepLabel: `Câu ${q.questionNumber}`,
            })
          }
        } else {
          const firstNum = group.questions[0]?.questionNumber ?? 1
          const lastNum =
            group.questions[group.questions.length - 1]?.questionNumber ?? firstNum
          steps.push({
            part,
            group,
            firstQuestionId: group.questions[0]?.id ?? '',
            stepLabel: `Câu ${firstNum} – ${lastNum}`,
          })
        }
      }
    }
    return steps
  }, [activeParts])

  const totalQuestions = useMemo(
    () =>
      activeParts.reduce(
        (sum, p) =>
          sum + p.questionGroups.reduce((gSum, g) => gSum + g.questions.length, 0),
        0,
      ),
    [activeParts],
  )

  const answeredCount = useMemo(
    () => (attempt ? Object.keys(attempt.answers).length : 0),
    [attempt],
  )

  const handleAutoExpire = useCallback(async () => {
    if (!attempt || attempt.status !== 'in_progress' || submitting) return
    setSubmitting(true)
    allowLeaveRef.current = true
    try {
      await attemptApi.submitAttempt(attempt.id, 'expired')
      navigate(`/test-online/result/${attempt.id}`, { replace: true })
    } catch {
      allowLeaveRef.current = false
      setSubmitting(false)
    }
  }, [attempt, submitting, navigate])

  const timer = useTestTimer(
    attempt?.deadlineAt,
    Boolean(
      attempt &&
        attempt.status === 'in_progress' &&
        attempt.currentStage === 'questions',
    ),
    handleAutoExpire,
    attempt?.currentStage === 'part_intro'
      ? (attempt.timerPausedAt ?? attempt.startedAt)
      : undefined,
  )

  const currentPart = useMemo(() => {
    if (!attempt) return activeParts[0]
    return (
      activeParts.find((p) => p.partNumber === attempt.currentPartNumber) ?? activeParts[0]
    )
  }, [activeParts, attempt])

  // Tìm chính xác nhóm câu hỏi hiện tại theo selectedGroupId hoặc theo currentQuestionId (đảm bảo chuyển cụm câu ở Part 6, 7 và tải lại trang luôn đúng nhóm)
  const currentGroup = useMemo(() => {
    if (!currentPart) return undefined
    if (selectedGroupId) {
      const found = currentPart.questionGroups.find((g) => g.id === selectedGroupId)
      if (found) return found
    }
    const targetQId = selectedQuestionId ?? attempt?.currentQuestionId
    if (targetQId) {
      const byQuestion = currentPart.questionGroups.find((g) =>
        g.questions.some((q) => q.id === targetQId),
      )
      if (byQuestion) return byQuestion
    }
    return currentPart.questionGroups[0]
  }, [currentPart, selectedGroupId, selectedQuestionId, attempt?.currentQuestionId])

  const activeQuestionId =
    selectedQuestionId ??
    attempt?.currentQuestionId ??
    currentGroup?.questions[0]?.id ??
    ''

  /**
   * Hàm điều hướng trung tâm tuân thủ nghiêm ngặt quy chế TOEIC:
   * - Không cho vào Reading khi chưa hoàn thành Listening (`!effectiveAttempt.listeningCompleted`).
   * - Không cho quay ngược về Listening sau khi đã sang Reading (`effectiveAttempt.listeningCompleted`).
   * - Ở Reading (Part 5, 6, 7), khi bấm chọn câu/Part trực tiếp (`skipIntroIfReading = true`), mở thẳng câu/cụm câu đó mà không bị kẹt ở màn hình giới thiệu.
   */
  const moveToPartAndGroup = useCallback(
    async (
      targetPart: TestPart,
      targetGroup: QuestionGroup,
      targetQuestionId?: string,
      options?: {
        withListeningDoneNotice?: boolean
        overrideAttempt?: TestAttempt
        skipIntroIfReading?: boolean
      },
    ) => {
      const effectiveAttempt = options?.overrideAttempt ?? attempt
      if (!effectiveAttempt) return

      // Chặn nhảy vào Reading khi chưa nghe xong Listening
      if (targetPart.section === 'reading' && !effectiveAttempt.listeningCompleted) {
        return
      }

      // Chặn quay lại Listening khi đã hoàn thành Listening (đã sang Reading)
      if (targetPart.section === 'listening' && effectiveAttempt.listeningCompleted) {
        return
      }

      const qId = targetQuestionId ?? targetGroup.questions[0]?.id ?? ''
      const forceQuestions =
        Boolean(options?.skipIntroIfReading) && targetPart.section === 'reading'

      // Nếu đang đứng ở màn hình giới thiệu Part mà nhảy thẳng vào câu hỏi Reading -> bù lại thời gian tạm dừng trước khi mở câu hỏi
      if (forceQuestions && !effectiveAttempt.introducedParts.includes(targetPart.partNumber)) {
        await attemptApi.confirmPartIntroduction(
          effectiveAttempt.id,
          targetPart.partNumber,
          qId,
        )
      }

      const nextIntroduced = forceQuestions
        ? Array.from(new Set([...effectiveAttempt.introducedParts, targetPart.partNumber]))
        : effectiveAttempt.introducedParts

      const hasSeenIntro = nextIntroduced.includes(targetPart.partNumber)
      const nextStage: TestAttempt['currentStage'] = hasSeenIntro ? 'questions' : 'part_intro'

      setSelectedGroupId(targetGroup.id)
      setSelectedQuestionId(qId)

      const updated = await attemptApi.saveAttemptProgress(effectiveAttempt.id, {
        introducedParts: nextIntroduced,
        currentPartNumber: targetPart.partNumber,
        currentStage: nextStage,
        currentQuestionId: qId,
        listeningCompleted: effectiveAttempt.listeningCompleted,
        listeningJustCompletedNotice: Boolean(options?.withListeningDoneNotice),
      })
      setLocalAttempt(updated)
    },
    [attempt],
  )

  const handleConfirmPartIntro = async () => {
    if (!attempt || !currentPart) return
    const firstGroup = currentPart.questionGroups[0]
    const firstQId = firstGroup?.questions[0]?.id
    if (firstGroup) {
      setSelectedGroupId(firstGroup.id)
      setSelectedQuestionId(firstQId ?? '')
    }
    const updated = await attemptApi.confirmPartIntroduction(
      attempt.id,
      currentPart.partNumber,
      firstQId,
    )
    setLocalAttempt(updated)
  }

  const handleSelectAnswer = async (questionId: string, optionId: string) => {
    if (!attempt || attempt.status !== 'in_progress') return
    const nextAnswers = {
      ...attempt.answers,
      [questionId]: optionId,
    }
    setSelectedQuestionId(questionId)
    const updated = await attemptApi.saveAttemptProgress(attempt.id, {
      answers: nextAnswers,
      currentQuestionId: questionId,
    })
    setLocalAttempt(updated)
  }

  const handleToggleFlag = async (questionId: string) => {
    if (!attempt || attempt.status !== 'in_progress') return
    const exists = attempt.flaggedQuestionIds.includes(questionId)
    const nextFlags = exists
      ? attempt.flaggedQuestionIds.filter((id) => id !== questionId)
      : [...attempt.flaggedQuestionIds, questionId]

    const updated = await attemptApi.saveAttemptProgress(attempt.id, {
      flaggedQuestionIds: nextFlags,
    })
    setLocalAttempt(updated)
  }

  const handleAudioPlayStarted = useCallback(
    async (audioGroupId: string) => {
      if (!attempt) return
      const updated = await attemptApi.updateAudioStatus(attempt.id, audioGroupId, 'PLAYING')
      if (updated) setLocalAttempt(updated)
    },
    [attempt],
  )

  const currentStepIndex = useMemo(() => {
    if (!currentGroup) return 0
    const byQuestion = examSteps.findIndex(
      (step) =>
        step.group.id === currentGroup.id &&
        (step.singleQuestion ? step.singleQuestion.id === activeQuestionId : true),
    )
    if (byQuestion >= 0) return byQuestion
    return Math.max(
      0,
      examSteps.findIndex((step) => step.group.id === currentGroup.id),
    )
  }, [examSteps, currentGroup, activeQuestionId])

  const currentStep = examSteps[currentStepIndex]

  // Giữ tham chiếu mới nhất để callback kết thúc âm thanh luôn lấy đúng vị trí bước hiện tại (không bị stale closure khi học viên vừa bấm chọn đáp án)
  const stepContextRef = useRef({
    attempt,
    currentPart,
    currentGroup,
    currentStepIndex,
    examSteps,
  })
  useEffect(() => {
    stepContextRef.current = {
      attempt,
      currentPart,
      currentGroup,
      currentStepIndex,
      examSteps,
    }
  }, [attempt, currentPart, currentGroup, currentStepIndex, examSteps])

  // Cuộn về đầu trang khi chuyển bước làm bài / chuyển cụm câu / chuyển Part (không cuộn khi chọn đáp án câu dưới trong cùng cụm)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [
    attemptId,
    attempt?.currentPartNumber,
    attempt?.currentStage,
    currentStepIndex,
  ])

  // Ngay khi âm thanh của câu/cụm câu Listening phát xong -> Khóa lượt nghe đó và TỰ ĐỘNG chuyển luôn sang câu/cụm tiếp theo
  const handleAudioPlayCompleted = useCallback(
    async (audioGroupId: string) => {
      const {
        attempt: latestAttempt,
        currentPart: latestPart,
        currentStepIndex: latestIdx,
        examSteps: latestSteps,
      } = stepContextRef.current

      if (!latestAttempt || !latestPart) return
      const updated = await attemptApi.updateAudioStatus(
        latestAttempt.id,
        audioGroupId,
        'LOCKED',
      )
      if (!updated) return
      setLocalAttempt(updated)

      const nextStep = latestSteps[latestIdx + 1]
      if (!nextStep) {
        if (updated.listeningCompleted) {
          setSubmitModalOpen(true)
        }
        return
      }

      const isTransitionToReading =
        latestPart.section === 'listening' && nextStep.part.section === 'reading'

      await moveToPartAndGroup(
        nextStep.part,
        nextStep.group,
        nextStep.firstQuestionId,
        {
          withListeningDoneNotice: isTransitionToReading,
          overrideAttempt: updated,
        },
      )
    },
    [moveToPartAndGroup],
  )

  const isListeningSection = currentPart?.section === 'listening'

  // Kiểm tra bước hiện tại có file âm thanh hay bị khuyết âm thanh:
  // Nếu là Part 1–4 có âm thanh -> tự chuyển câu khi hết âm thanh (ẩn nút CÂU TIẾP).
  // Nếu câu ở Part 1–4 bị bỏ trống/khuyết âm thanh -> tự hiện nút CÂU TIẾP để không bao giờ kẹt bài thi.
  const currentStepAudioKey = useMemo(() => {
    if (!currentGroup) return ''
    const gMedia = normalizeGroupMedia(currentGroup)
    if (currentStep?.singleQuestion) {
      const qMedia = normalizeQuestionMedia(currentStep.singleQuestion)
      if (qMedia.audios.length > 0 && gMedia.audios.length === 0) {
        return currentStep.singleQuestion.id
      }
      if (gMedia.audios.length > 0) {
        return currentGroup.audioGroupId ?? currentGroup.id
      }
      return ''
    }
    return gMedia.audios.length > 0 ? (currentGroup.audioGroupId ?? currentGroup.id) : ''
  }, [currentGroup, currentStep])

  const isListeningWithAudio = isListeningSection && Boolean(currentStepAudioKey)

  // Ở phần Reading (Part 5, 6, 7): cho phép chuyển qua lại tự do giữa các câu và các cụm câu thuộc Reading (nhưng không lùi ngược vào Listening)
  const canGoPrevStep = useMemo(() => {
    if (!attempt || isListeningSection || currentStepIndex <= 0) return false
    const prevStep = examSteps[currentStepIndex - 1]
    if (!prevStep) return false
    return prevStep.part.section === 'reading'
  }, [attempt, isListeningSection, currentStepIndex, examSteps])

  const canGoNextStep = useMemo(() => {
    if (!attempt || isListeningWithAudio || currentStepIndex >= examSteps.length - 1) {
      return false
    }
    const nextStep = examSteps[currentStepIndex + 1]
    if (!nextStep) return false
    if (isListeningSection) {
      return true
    }
    return nextStep.part.section === 'reading'
  }, [attempt, isListeningSection, isListeningWithAudio, currentStepIndex, examSteps])

  const handleGoPrevStep = () => {
    if (!canGoPrevStep) return
    const prev = examSteps[currentStepIndex - 1]
    if (prev) {
      void moveToPartAndGroup(prev.part, prev.group, prev.firstQuestionId, {
        skipIntroIfReading: true,
      })
    }
  }

  const handleGoNextStep = () => {
    if (!canGoNextStep) return
    const next = examSteps[currentStepIndex + 1]
    if (next) {
      void moveToPartAndGroup(next.part, next.group, next.firstQuestionId)
    }
  }

  const handleJumpToQuestion = (
    partNumber: ToeicPartNumber,
    groupId: string,
    questionId: string,
  ) => {
    if (!attempt) return
    const targetPart = activeParts.find((p) => p.partNumber === partNumber)
    const targetGroup = targetPart?.questionGroups.find((g) => g.id === groupId)
    if (!targetPart || !targetGroup) return

    // Trong phần Listening: chỉ cho phép cuộn giữa các câu nằm trong ĐÚNG cụm đang phát hiện tại (Part 3, 4), cấm chuyển sang câu khác hoặc Part khác
    if (targetPart.section === 'listening') {
      const isSameActiveListeningGroup =
        !attempt.listeningCompleted &&
        attempt.currentStage === 'questions' &&
        currentPart?.partNumber === targetPart.partNumber &&
        currentGroup?.id === targetGroup.id

      if (!isSameActiveListeningGroup) {
        return
      }

      setNavDrawerOpen(false)
      setSelectedQuestionId(questionId)
      window.setTimeout(() => {
        const el = document.getElementById(`test-question-${questionId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 40)
      return
    }

    // Chặn nhảy vào Reading nếu chưa hoàn thành Listening
    if (!attempt.listeningCompleted) {
      return
    }

    // Phần Reading (Part 5, 6, 7): cho phép nhảy tự do tới bất kỳ câu đơn hoặc cụm câu nào
    setNavDrawerOpen(false)
    const isMultiQuestionGroup = isMultiQuestionSharedGroup(targetGroup)

    void moveToPartAndGroup(targetPart, targetGroup, questionId, {
      skipIntroIfReading: true,
    }).then(() => {
      if (isMultiQuestionGroup) {
        window.setTimeout(() => {
          const el = document.getElementById(`test-question-${questionId}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 60)
      }
    })
  }

  const handleConfirmSubmit = async () => {
    if (!attempt || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    allowLeaveRef.current = true
    try {
      await attemptApi.submitAttempt(attempt.id, 'submitted')
      navigate(`/test-online/result/${attempt.id}`, { replace: true })
    } catch (err) {
      setSubmitting(false)
      allowLeaveRef.current = false
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Không thể nộp bài lúc này. Bài làm của bạn vẫn được giữ nguyên, hãy thử lại.',
      )
    }
  }

  const handleConfirmExitExam = () => {
    allowLeaveRef.current = true
    setExitModalOpen(false)
    if (blocker.state === 'blocked') {
      blocker.proceed()
      return
    }
    if (test) {
      navigate(`/test-online/${test.slug}`)
    } else {
      navigate('/test-online')
    }
  }

  const handleCancelExitExam = () => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
    setExitModalOpen(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <LoadingBlock label="Đang tải phòng thi TOEIC trực tuyến..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <ErrorBlock message={error} onRetry={retry} />
      </div>
    )
  }

  if (!test || !attempt || !currentPart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyBlock
          title="Không tìm thấy phiên làm bài"
          description="Mã lượt thi không hợp lệ hoặc đã bị xóa."
        />
      </div>
    )
  }

  const currentAudioState = currentStepAudioKey
    ? attempt.audioStates[currentStepAudioKey]
    : undefined

  return (
    <div className="ec-reading-font min-h-screen bg-[#F5FAFE] pb-16">
      {/* Thanh thông tin cố định phía trên cùng của phòng thi */}
      <div className="sticky top-0 z-30 border-b border-[#DCEAF3] bg-[#75BDEB] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExitModalOpen(true)}
              title="Rời phòng thi về trang thiết lập đề (có xác nhận)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold uppercase tracking-wide text-white ec-shadow-text sm:text-base">
                HỆ THỐNG THI TRỰC TUYẾN
              </span>
              <span className="hidden text-white/60 sm:inline">•</span>
              <h1 className="hidden text-sm font-extrabold uppercase text-white ec-shadow-text sm:inline">
                {test.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-[#F26522] px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xs transition hover:bg-[#d95314] sm:px-5"
            >
              <span>NỘP BÀI</span>
            </button>

            <TestTimer timer={timer} />

            <span className="hidden text-sm font-bold text-white ec-shadow-text md:inline">
              {user?.fullName ?? 'Học viên'}
            </span>

            <button
              type="button"
              onClick={() => setNavDrawerOpen((v) => !v)}
              title="Mở bảng danh sách câu hỏi"
              aria-expanded={navDrawerOpen}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                navDrawerOpen
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'bg-white/25 text-white hover:bg-white/35'
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Ngăn danh sách câu hỏi trượt bên trái */}
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
                Danh sách câu hỏi ({answeredCount}/{totalQuestions})
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
              currentPartNumber={currentPart.partNumber}
              currentGroupId={currentGroup?.id}
              currentStage={attempt.currentStage}
              activeQuestionId={activeQuestionId}
              answers={attempt.answers}
              flaggedQuestionIds={attempt.flaggedQuestionIds}
              listeningCompleted={attempt.listeningCompleted}
              mode="exam"
              onJumpToQuestion={handleJumpToQuestion}
            />
          </aside>
        </div>
      )}

      {/* Khu vực nội dung chính của phòng thi */}
      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        {attempt.currentStage === 'part_intro' ? (
          <PartIntroduction
            part={currentPart}
            listeningJustCompletedNotice={attempt.listeningJustCompletedNotice}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            onOpenNav={() => setNavDrawerOpen(true)}
            onStartPart={handleConfirmPartIntro}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-xs sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#EAF6FD] pb-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-black uppercase tracking-tight text-[#2878B8] sm:text-2xl">
                    {currentPart.title}
                  </h2>

                  {currentStep && (
                    <span className="rounded-lg bg-[#EAF6FD] px-3 py-1 text-xs font-extrabold tabular-nums text-[#2878B8]">
                      {currentStep.stepLabel}
                    </span>
                  )}

                  {/* Thanh chọn nhanh Part: chỉ cho bấm chuyển qua lại giữa các Part Đọc (P5, P6, P7) sau khi đã xong phần Nghe */}
                  {!isListeningSection && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeParts.map((part) => {
                        const isCurrentPart = part.partNumber === currentPart.partNumber
                        const isLockedPart = part.section === 'listening'

                        return (
                          <button
                            key={part.id}
                            type="button"
                            disabled={isLockedPart}
                            onClick={() => {
                              if (isLockedPart) return
                              const firstGroup = part.questionGroups[0]
                              if (firstGroup) {
                                void moveToPartAndGroup(
                                  part,
                                  firstGroup,
                                  firstGroup.questions[0]?.id,
                                  { skipIntroIfReading: true },
                                )
                              }
                            }}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold transition ${
                              isCurrentPart
                                ? 'bg-[#75BDEB] text-white'
                                : isLockedPart
                                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                  : 'bg-[#EAF6FD] text-[#2878B8] hover:bg-[#75BDEB] hover:text-white'
                            }`}
                          >
                            {isLockedPart && <Lock className="h-3 w-3" />}
                            <span>P{part.partNumber}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Cụm điều hướng bên phải:
                    - Nếu đang làm Part 1–4 (Listening): KHÔNG hiện nút CÂU TRƯỚC / CÂU TIẾP (hết âm thanh tự chuyển câu luôn).
                    - Nếu đang làm Part 5–7 (Reading): hiện đầy đủ nút CÂU TRƯỚC / CÂU TIẾP để chuyển tự do giữa các câu và cụm câu. */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isListeningWithAudio && (
                    <>
                      {!isListeningSection && (
                        <button
                          type="button"
                          disabled={!canGoPrevStep}
                          onClick={handleGoPrevStep}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCEAF3] bg-[#F5FAFE] px-3.5 py-2 text-xs font-extrabold uppercase text-[#243B53] transition hover:border-[#75BDEB] hover:bg-[#EAF6FD] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>CÂU TRƯỚC</span>
                        </button>
                      )}

                      {currentStepIndex < examSteps.length - 1 ? (
                        <button
                          type="button"
                          disabled={!canGoNextStep}
                          onClick={handleGoNextStep}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#75BDEB] px-4 py-2 text-xs font-extrabold uppercase text-white shadow-2xs transition hover:bg-[#5aaee3] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>CÂU TIẾP</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSubmitModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F26522] px-4 py-2 text-xs font-black uppercase text-white shadow-xs transition hover:bg-[#d95314]"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>NỘP BÀI</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setNavDrawerOpen(true)}
                    title="Mở bảng danh sách câu hỏi"
                    className="rounded-lg bg-[#F26522] px-4 py-2 text-xs font-black tabular-nums text-white shadow-xs transition hover:bg-[#d95314] sm:text-sm"
                  >
                    {answeredCount}/{totalQuestions}
                  </button>
                </div>
              </div>

              {currentGroup && (
                <TestQuestionRenderer
                  part={currentPart}
                  group={currentGroup}
                  activeQuestionId={activeQuestionId}
                  singleQuestionId={currentStep?.singleQuestion?.id}
                  answers={attempt.answers}
                  flaggedQuestionIds={attempt.flaggedQuestionIds}
                  audioGroupState={currentAudioState}
                  mode="exam"
                  onSelectAnswer={handleSelectAnswer}
                  onToggleFlag={handleToggleFlag}
                  onAudioPlayStarted={handleAudioPlayStarted}
                  onAudioPlayCompleted={handleAudioPlayCompleted}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <TestSubmitModal
        open={submitModalOpen}
        examName={test.title}
        examType={
          attempt.practiceMode === 'full'
            ? 'TOEIC Listening & Reading'
            : `Luyện theo Part (${attempt.selectedParts.map((p) => `Part ${p}`).join(', ')})`
        }
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        flaggedCount={attempt.flaggedQuestionIds.length}
        submitting={submitting}
        errorMessage={submitError}
        onCancel={() => {
          setSubmitError(null)
          setSubmitModalOpen(false)
        }}
        onConfirmSubmit={handleConfirmSubmit}
      />

      <ExitExamConfirmModal
        open={exitModalOpen || blocker.state === 'blocked'}
        title="Xác nhận rời khỏi phòng thi"
        description="Bạn đang trong thời gian làm bài thi TOEIC và chưa nộp bài. Bạn có chắc chắn muốn thoát khỏi phòng thi không?"
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        onCancel={handleCancelExitExam}
        onConfirmExit={handleConfirmExitExam}
      />
    </div>
  )
}
