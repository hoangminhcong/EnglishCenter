import type {
  PartPerformanceStat,
  QuestionReviewDetail,
  ScoreConversionPoint,
  ServerTestAnswerKey,
  Test,
  TestAttempt,
  TestAttemptResult,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

export const DEFAULT_TOEIC_SCORE_CONVERSION_TABLE: ScoreConversionPoint[] = [
  { minRatio: 0.95, listeningScore: 495, readingScore: 495 },
  { minRatio: 0.85, listeningScore: 450, readingScore: 430 },
  { minRatio: 0.75, listeningScore: 400, readingScore: 380 },
  { minRatio: 0.65, listeningScore: 350, readingScore: 330 },
  { minRatio: 0.5, listeningScore: 310, readingScore: 290 },
  { minRatio: 0.35, listeningScore: 220, readingScore: 200 },
  { minRatio: 0.2, listeningScore: 130, readingScore: 110 },
  { minRatio: 0.01, listeningScore: 50, readingScore: 40 },
  { minRatio: 0, listeningScore: 5, readingScore: 5 },
]

function lookupConvertedScores(
  table: ScoreConversionPoint[],
  listeningRatio: number,
  readingRatio: number,
): { listening: number; reading: number } | null {
  if (table.length === 0) return null
  const sorted = [...table].sort((a, b) => b.minRatio - a.minRatio)

  const lMatch = sorted.find((row) => listeningRatio >= row.minRatio) ?? sorted[sorted.length - 1]
  const rMatch = sorted.find((row) => readingRatio >= row.minRatio) ?? sorted[sorted.length - 1]

  return {
    listening: lMatch.listeningScore,
    reading: rMatch.readingScore,
  }
}

/**
 * Dịch vụ chấm điểm bài thi TOEIC (mô phỏng tầng chấm điểm của Backend).
 * - Không bao giờ tự suy đoán điểm 990 nếu học viên chỉ làm một số Part (chỉ tính điểm quy đổi theo bảng khi làm Full Test).
 * - Tính chính xác số câu đúng, sai, bỏ trống, tỷ lệ chính xác và đánh giá từng Part.
 */
export function gradeTestAttempt(
  test: Test,
  attempt: TestAttempt,
  finalStatus: 'submitted' | 'expired',
  submittedAtIso: string,
  answerKeys: Record<string, ServerTestAnswerKey> = {},
): TestAttemptResult {
  const selectedPartsSet = new Set<ToeicPartNumber>(attempt.selectedParts)
  const activeParts = test.parts
    .filter((p) => selectedPartsSet.has(p.partNumber))
    .sort((a, b) => a.partNumber - b.partNumber)

  const reviews: Record<string, QuestionReviewDetail> = {}
  const partStats: PartPerformanceStat[] = []
  const flaggedSet = new Set(attempt.flaggedQuestionIds)

  let totalQuestions = 0
  let answeredCount = 0
  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  let listeningCorrect = 0
  let listeningTotal = 0
  let readingCorrect = 0
  let readingTotal = 0

  for (const part of activeParts) {
    let pTotal = 0
    let pCorrect = 0
    let pIncorrect = 0
    let pUnanswered = 0

    for (const group of part.questionGroups) {
      for (const question of group.questions) {
        pTotal += 1
        totalQuestions += 1

        if (part.section === 'listening') {
          listeningTotal += 1
        } else {
          readingTotal += 1
        }

        const selectedOptionId = attempt.answers[question.id] ?? null
        const answerKey = answerKeys[question.id]
        const correctOptionId = answerKey?.correctOptionId ?? question.options[0]?.id ?? ''
        const isAnswered = Boolean(selectedOptionId)
        const isCorrect = isAnswered && selectedOptionId === correctOptionId

        if (!isAnswered) {
          pUnanswered += 1
          unansweredCount += 1
        } else {
          answeredCount += 1
          if (isCorrect) {
            pCorrect += 1
            correctCount += 1
            if (part.section === 'listening') {
              listeningCorrect += 1
            } else {
              readingCorrect += 1
            }
          } else {
            pIncorrect += 1
            incorrectCount += 1
          }
        }

        reviews[question.id] = {
          questionId: question.id,
          questionNumber: question.questionNumber,
          partNumber: part.partNumber,
          selectedOptionId,
          correctOptionId,
          isCorrect,
          isFlagged: flaggedSet.has(question.id),
          explanation:
            answerKey?.explanation ??
            'Đáp án được đối chiếu theo bộ tiêu chuẩn chấm thi TOEIC của hệ thống.',
          transcript: answerKey?.transcript,
          translation: answerKey?.translation,
        }
      }
    }

    const pAccuracy = pTotal > 0 ? Math.round((pCorrect / pTotal) * 100) : 0
    const evaluation: PartPerformanceStat['evaluation'] =
      pAccuracy >= 75 ? 'Tốt' : pAccuracy >= 50 ? 'Khá' : 'Cần cải thiện'

    partStats.push({
      partNumber: part.partNumber,
      partTitle: part.title,
      englishTitle: part.englishTitle,
      section: part.section,
      totalQuestions: pTotal,
      correctCount: pCorrect,
      incorrectCount: pIncorrect,
      unansweredCount: pUnanswered,
      accuracyPercent: pAccuracy,
      evaluation,
    })
  }

  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  // Kiểm tra học viên có làm đầy đủ tất cả các Part của đề không
  const allTestPartNumbers = test.parts.map((p) => p.partNumber)
  const isFullTestScoreEligible =
    attempt.practiceMode === 'full' ||
    (allTestPartNumbers.length > 0 &&
      allTestPartNumbers.every((pNum) => selectedPartsSet.has(pNum)))

  let convertedListeningScore: number | null = null
  let convertedReadingScore: number | null = null
  let convertedTotalScore: number | null = null

  if (isFullTestScoreEligible && listeningTotal > 0 && readingTotal > 0) {
    const effectiveConversionTable = test.scoreConversionTable?.length
      ? test.scoreConversionTable
      : DEFAULT_TOEIC_SCORE_CONVERSION_TABLE
    const converted = lookupConvertedScores(
      effectiveConversionTable,
      listeningCorrect / listeningTotal,
      readingCorrect / readingTotal,
    )
    if (converted) {
      convertedListeningScore = converted.listening
      convertedReadingScore = converted.reading
      convertedTotalScore = converted.listening + converted.reading
    }
  }

  const startedMs = new Date(attempt.startedAt).getTime()
  const deadlineMs = new Date(attempt.deadlineAt).getTime()
  const submittedMs = new Date(submittedAtIso).getTime()
  const maxAllowedSeconds = attempt.selectedDuration * 60
  // Tổng thời gian đã dừng ở các màn hình giới thiệu Part được cộng vào deadlineAt
  const totalIntroPausedSeconds = Math.max(
    0,
    Math.round((deadlineMs - startedMs) / 1000) - maxAllowedSeconds,
  )
  const rawSeconds = Math.max(
    1,
    Math.round((submittedMs - startedMs) / 1000) - totalIntroPausedSeconds,
  )
  const actualDurationSeconds = Math.min(maxAllowedSeconds, rawSeconds)

  const strongParts = partStats.filter((p) => p.accuracyPercent >= 70).map((p) => p.partNumber)
  const improvementParts = partStats.filter((p) => p.accuracyPercent < 70).map((p) => p.partNumber)

  return {
    attemptId: attempt.id,
    testId: test.id,
    testSlug: test.slug,
    testCode: test.code,
    testTitle: test.title,
    practiceMode: attempt.practiceMode,
    isFullTestScoreEligible,
    selectedParts: attempt.selectedParts,
    selectedDuration: attempt.selectedDuration,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: submittedAtIso,
    actualDurationSeconds,
    status: finalStatus,
    totalQuestions,
    answeredCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracyPercent,
    listeningCorrect,
    listeningTotal,
    readingCorrect,
    readingTotal,
    convertedListeningScore,
    convertedReadingScore,
    convertedTotalScore,
    partStats,
    strongParts,
    improvementParts,
    reviews,
  }
}
