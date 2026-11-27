import { authSessionStore } from '@/features/auth/services/authService'
import { getMockTestAnswerKeys } from '@/features/test-online/api/testApi'
import { mockTests, serverTestAnswerKeys } from '@/features/test-online/mocks/testMockData'
import { gradeTestAttempt } from '@/features/test-online/services/scoringService'
import {
  isMultiQuestionSharedGroup,
  normalizeGroupMedia,
  normalizeQuestionMedia,
} from '@/features/test-online/utils/questionMedia'
import type {
  AudioGroupState,
  AudioPlaybackStatus,
  ServerTestAnswerKey,
  StartAttemptPayload,
  Test,
  TestAttempt,
  TestAttemptResult,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

export const ATTEMPTS_STORAGE_KEY = 'ec_toeic_test_attempts_v3'
export const RESULTS_STORAGE_KEY = 'ec_toeic_test_results_v3'
const LEGACY_SEEDED_FLAG_KEY = 'ec_toeic_test_seeded_v5'
const SEED_PURGED_FLAG_KEY = 'ec_toeic_seed_purged_v1'
const REVIEW_HISTORY_SEED_KEY = 'ec_toeic_review_seed_v1'

const LEGACY_FAKE_SEED_IDS: readonly string[] = [
  'ATT-20261112-101',
  'ATT-20261120-202',
  'ATT-20261118-301',
  'ATT-20261119-601',
  'ATT-20261115-401',
  'ATT-20261110-501',
]

const memoryAttemptsFallback: Record<string, TestAttempt> = {}
const memoryResultsFallback: Record<string, TestAttemptResult> = {}
let useAttemptsMemoryFallback = false
let useResultsMemoryFallback = false

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidAttempt(value: unknown): value is TestAttempt {
  if (!isPlainRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.testId === 'string' &&
    typeof value.testSlug === 'string' &&
    typeof value.testTitle === 'string' &&
    typeof value.status === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.deadlineAt === 'string' &&
    Array.isArray(value.selectedParts) &&
    isPlainRecord(value.answers)
  )
}

function normalizeAttemptRecord(raw: TestAttempt): TestAttempt {
  return {
    ...raw,
    flaggedQuestionIds: Array.isArray(raw.flaggedQuestionIds) ? raw.flaggedQuestionIds : [],
    audioStates: isPlainRecord(raw.audioStates)
      ? (raw.audioStates as Record<string, AudioGroupState>)
      : {},
    introducedParts: Array.isArray(raw.introducedParts) ? raw.introducedParts : [],
  }
}

function isValidResult(value: unknown): value is TestAttemptResult {
  if (!isPlainRecord(value)) return false
  return (
    typeof value.attemptId === 'string' &&
    typeof value.testId === 'string' &&
    typeof value.testSlug === 'string' &&
    typeof value.testTitle === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.partStats) &&
    isPlainRecord(value.reviews)
  )
}

function replaceMemoryMap<T>(target: Record<string, T>, next: Record<string, T>): void {
  for (const key of Object.keys(target)) {
    delete target[key]
  }
  Object.assign(target, next)
}

function safeReadAttemptsMap(): Record<string, TestAttempt> {
  if (typeof window === 'undefined') {
    return { ...memoryAttemptsFallback }
  }
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (!raw) {
      return useAttemptsMemoryFallback ? { ...memoryAttemptsFallback } : {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainRecord(parsed)) {
      return useAttemptsMemoryFallback ? { ...memoryAttemptsFallback } : {}
    }
    const validated: Record<string, TestAttempt> = {}
    for (const [key, item] of Object.entries(parsed)) {
      if (isValidAttempt(item)) {
        validated[key] = normalizeAttemptRecord(item)
      }
    }
    return useAttemptsMemoryFallback ? { ...validated, ...memoryAttemptsFallback } : validated
  } catch {
    return useAttemptsMemoryFallback ? { ...memoryAttemptsFallback } : {}
  }
}

function safeWriteAttemptsMap(value: Record<string, TestAttempt>): void {
  replaceMemoryMap(memoryAttemptsFallback, value)
  if (typeof window === 'undefined') {
    useAttemptsMemoryFallback = true
    return
  }
  try {
    window.localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(value))
    useAttemptsMemoryFallback = false
  } catch {
    try {
      window.localStorage.removeItem(ATTEMPTS_STORAGE_KEY)
      window.localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(value))
      useAttemptsMemoryFallback = false
    } catch {
      useAttemptsMemoryFallback = true
    }
  }
}

function safeReadResultsMap(): Record<string, TestAttemptResult> {
  if (typeof window === 'undefined') {
    return { ...memoryResultsFallback }
  }
  try {
    const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY)
    if (!raw) {
      return useResultsMemoryFallback ? { ...memoryResultsFallback } : {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainRecord(parsed)) {
      return useResultsMemoryFallback ? { ...memoryResultsFallback } : {}
    }
    const validated: Record<string, TestAttemptResult> = {}
    for (const [key, item] of Object.entries(parsed)) {
      if (isValidResult(item)) {
        validated[key] = item
      }
    }
    return useResultsMemoryFallback ? { ...validated, ...memoryResultsFallback } : validated
  } catch {
    return useResultsMemoryFallback ? { ...memoryResultsFallback } : {}
  }
}

function safeWriteResultsMap(value: Record<string, TestAttemptResult>): void {
  replaceMemoryMap(memoryResultsFallback, value)
  if (typeof window === 'undefined') {
    useResultsMemoryFallback = true
    return
  }
  try {
    window.localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(value))
    useResultsMemoryFallback = false
  } catch {
    try {
      window.localStorage.removeItem(RESULTS_STORAGE_KEY)
      window.localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(value))
      useResultsMemoryFallback = false
    } catch {
      useResultsMemoryFallback = true
    }
  }
}

/**
 * Dọn một lần duy nhất 6 bản ghi seed mẫu cũ (`ATT-202611...`),
 * giữ nguyên 100% mọi lượt làm bài thật của người dùng trong `ec_toeic_test_attempts_v3` & `ec_toeic_test_results_v3`.
 */
function purgeLegacySeededHistoryOnce(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(SEED_PURGED_FLAG_KEY) === '1') {
      return
    }
  } catch {
    return
  }

  const attemptsMap = safeReadAttemptsMap()
  let attemptsChanged = false
  for (const seedId of LEGACY_FAKE_SEED_IDS) {
    if (seedId in attemptsMap) {
      delete attemptsMap[seedId]
      attemptsChanged = true
    }
  }
  if (attemptsChanged) {
    safeWriteAttemptsMap(attemptsMap)
  }

  const resultsMap = safeReadResultsMap()
  let resultsChanged = false
  for (const seedId of LEGACY_FAKE_SEED_IDS) {
    if (seedId in resultsMap) {
      delete resultsMap[seedId]
      resultsChanged = true
    }
  }
  if (resultsChanged) {
    safeWriteResultsMap(resultsMap)
  }

  try {
    window.localStorage.removeItem(LEGACY_SEEDED_FLAG_KEY)
    window.localStorage.setItem(SEED_PURGED_FLAG_KEY, '1')
  } catch {
    // ignore storage write errors
  }
}

function seedReviewTestHistoryOnce(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(REVIEW_HISTORY_SEED_KEY) === '1') {
      return
    }
    const rawExisting = window.localStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (rawExisting && rawExisting.trim() !== '' && rawExisting.trim() !== '{}') {
      return
    }
  } catch {
    return
  }

  const attemptsMap: Record<string, TestAttempt> = {}
  const resultsMap: Record<string, TestAttemptResult> = {}

  const specs: ReadonlyArray<{
    attemptId: string
    studentId: string
    testIndex: number
    correctModulo: number
    startedAt: string
    submittedAt: string
  }> = [
    {
      attemptId: 'ATT-REV-GUEST-01',
      studentId: 'guest',
      testIndex: 0,
      correctModulo: 5,
      startedAt: '2026-11-25T13:00:00.000Z',
      submittedAt: '2026-11-25T14:40:00.000Z',
    },
    {
      attemptId: 'ATT-REV-GUEST-02',
      studentId: 'guest',
      testIndex: 1,
      correctModulo: 4,
      startedAt: '2026-11-19T08:00:00.000Z',
      submittedAt: '2026-11-19T09:35:00.000Z',
    },
    {
      attemptId: 'ATT-REV-2026-001',
      studentId: 'stu-hv-001',
      testIndex: 0,
      correctModulo: 6,
      startedAt: '2026-11-24T13:00:00.000Z',
      submittedAt: '2026-11-24T14:42:00.000Z',
    },
    {
      attemptId: 'ATT-REV-2026-002',
      studentId: 'stu-hv-001',
      testIndex: 1,
      correctModulo: 4,
      startedAt: '2026-11-18T08:00:00.000Z',
      submittedAt: '2026-11-18T09:38:00.000Z',
    },
    {
      attemptId: 'ATT-REV-HV02-001',
      studentId: 'stu-hv-002',
      testIndex: 0,
      correctModulo: 4,
      startedAt: '2026-11-22T14:00:00.000Z',
      submittedAt: '2026-11-22T15:45:00.000Z',
    },
  ]

  for (const spec of specs) {
    const targetTest = mockTests[spec.testIndex]
    if (!targetTest) continue

    const allQuestions = targetTest.parts.flatMap((p) =>
      p.questionGroups.flatMap((g) => g.questions),
    )
    const answers: Record<string, string> = {}
    allQuestions.forEach((q, idx) => {
      const key = serverTestAnswerKeys[q.id]
      if (!key) return
      if ((idx + 1) % spec.correctModulo === 0) {
        const wrongOpt = q.options.find((o) => o.id !== key.correctOptionId)
        if (wrongOpt) answers[q.id] = wrongOpt.id
      } else {
        answers[q.id] = key.correctOptionId
      }
    })

    const attempt: TestAttempt = {
      id: spec.attemptId,
      studentId: spec.studentId,
      testId: targetTest.id,
      testSlug: targetTest.slug,
      testCode: targetTest.code,
      testTitle: targetTest.title,
      practiceMode: 'full',
      selectedParts: targetTest.parts.map((p) => p.partNumber),
      selectedDuration: targetTest.duration,
      startedAt: spec.startedAt,
      deadlineAt: spec.submittedAt,
      submittedAt: spec.submittedAt,
      status: 'submitted',
      answers,
      flaggedQuestionIds: allQuestions[2] ? [allQuestions[2].id] : [],
      audioStates: buildInitialAudioStates(
        targetTest,
        targetTest.parts.map((p) => p.partNumber),
        'LOCKED',
      ),
      introducedParts: targetTest.parts.map((p) => p.partNumber),
      currentPartNumber: 7,
      currentStage: 'questions',
      listeningCompleted: true,
    }

    const result = gradeTestAttempt(
      targetTest,
      attempt,
      'submitted',
      spec.submittedAt,
      serverTestAnswerKeys,
    )
    attemptsMap[attempt.id] = attempt
    resultsMap[attempt.id] = result
  }

  if (Object.keys(attemptsMap).length > 0) {
    safeWriteAttemptsMap(attemptsMap)
    safeWriteResultsMap(resultsMap)
  }

  try {
    window.localStorage.setItem(REVIEW_HISTORY_SEED_KEY, '1')
  } catch {
    // ignore storage write errors
  }
}

function buildInitialAudioStates(
  test: Test,
  selectedParts: ToeicPartNumber[],
  initialStatus: AudioPlaybackStatus = 'NOT_PLAYED',
): Record<string, AudioGroupState> {
  const states: Record<string, AudioGroupState> = {}
  const selectedSet = new Set(selectedParts)

  for (const part of test.parts) {
    if (!selectedSet.has(part.partNumber) || part.section !== 'listening') continue
    for (const group of part.questionGroups) {
      if (isMultiQuestionSharedGroup(group)) {
        const gMedia = normalizeGroupMedia(group)
        if (gMedia.audios.length > 0) {
          const groupId = group.audioGroupId ?? group.id
          states[groupId] = {
            audioGroupId: groupId,
            partNumber: part.partNumber,
            audioUrl: '',
            status: initialStatus,
          }
        }
      } else {
        for (const q of group.questions) {
          const qMedia = normalizeQuestionMedia(q)
          const gMedia = normalizeGroupMedia(group)
          if (qMedia.audios.length > 0 || gMedia.audios.length > 0) {
            const audioKey =
              qMedia.audios.length > 0 && gMedia.audios.length === 0
                ? q.id
                : (group.audioGroupId ?? group.id)
            states[audioKey] = {
              audioGroupId: audioKey,
              partNumber: part.partNumber,
              audioUrl: '',
              status: initialStatus,
            }
          }
        }
      }
    }
  }

  return states
}

export const attemptStorageService = {
  getAllAttemptsMap(): Record<string, TestAttempt> {
    purgeLegacySeededHistoryOnce()
    seedReviewTestHistoryOnce()
    const rawMap = safeReadAttemptsMap()
    let cleaned = false
    for (const att of Object.values(rawMap)) {
      for (const st of Object.values(att.audioStates)) {
        if (isPlainRecord(st) && typeof st.audioUrl === 'string' && st.audioUrl.length > 200) {
          st.audioUrl = ''
          cleaned = true
        }
      }
    }
    if (cleaned) {
      safeWriteAttemptsMap(rawMap)
    }
    return rawMap
  },

  getAllResultsMap(): Record<string, TestAttemptResult> {
    purgeLegacySeededHistoryOnce()
    return safeReadResultsMap()
  },

  getAttemptById(attemptId: string): TestAttempt | null {
    const map = this.getAllAttemptsMap()
    return map[attemptId] ?? null
  },

  saveAttempt(attempt: TestAttempt): TestAttempt {
    const map = this.getAllAttemptsMap()
    map[attempt.id] = attempt
    safeWriteAttemptsMap(map)
    return attempt
  },

  createNewAttempt(test: Test, payload: StartAttemptPayload): TestAttempt {
    purgeLegacySeededHistoryOnce()
    const sortedParts = [...payload.selectedParts].sort((a, b) => a - b)
    const firstPart = sortedParts[0] ?? 1
    const hasListening = sortedParts.some((p) => p <= 4)

    const now = new Date()
    const startedAt = now.toISOString()
    const deadlineAt = new Date(now.getTime() + payload.selectedDuration * 60 * 1000).toISOString()

    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const dateStamp = startedAt.slice(0, 10).replace(/-/g, '')
    const attemptId = `ATT-${dateStamp}-${randomSuffix}`

    const currentUser = authSessionStore.getCurrentUser()
    const attempt: TestAttempt = {
      id: attemptId,
      studentId: currentUser?.id ?? 'guest',
      testId: test.id,
      testSlug: test.slug,
      testCode: test.code,
      testTitle: test.title,
      practiceMode: payload.practiceMode,
      selectedParts: sortedParts,
      selectedDuration: payload.selectedDuration,
      startedAt,
      deadlineAt,
      timerPausedAt: startedAt,
      status: 'in_progress',
      answers: {},
      flaggedQuestionIds: [],
      audioStates: buildInitialAudioStates(test, sortedParts, 'NOT_PLAYED'),
      introducedParts: [],
      currentPartNumber: firstPart,
      currentStage: 'part_intro',
      listeningCompleted: !hasListening,
      listeningJustCompletedNotice: false,
    }

    return this.saveAttempt(attempt)
  },

  updateAudioGroupStatus(
    attemptId: string,
    audioGroupId: string,
    nextStatus: AudioPlaybackStatus,
  ): TestAttempt | null {
    const attempt = this.getAttemptById(attemptId)
    if (!attempt || attempt.status !== 'in_progress') return attempt

    const currentGroup = attempt.audioStates[audioGroupId]
    if (!currentGroup) return attempt

    if (
      (currentGroup.status === 'LOCKED' || currentGroup.status === 'COMPLETED') &&
      (nextStatus === 'PLAYING' || nextStatus === 'NOT_PLAYED')
    ) {
      return attempt
    }

    const nowIso = new Date().toISOString()
    const updatedGroup: AudioGroupState = {
      ...currentGroup,
      status: nextStatus === 'COMPLETED' ? 'LOCKED' : nextStatus,
      startedAt:
        nextStatus === 'PLAYING' && !currentGroup.startedAt ? nowIso : currentGroup.startedAt,
      completedAt:
        nextStatus === 'COMPLETED' || nextStatus === 'LOCKED'
          ? (currentGroup.completedAt ?? nowIso)
          : currentGroup.completedAt,
    }

    const nextAudioStates = {
      ...attempt.audioStates,
      [audioGroupId]: updatedGroup,
    }

    const allListeningGroups = Object.values(nextAudioStates)
    const allDone =
      allListeningGroups.length === 0 ||
      allListeningGroups.every((g) => g.status === 'LOCKED' || g.status === 'COMPLETED')

    const nextAttempt: TestAttempt = {
      ...attempt,
      audioStates: nextAudioStates,
      listeningCompleted: attempt.listeningCompleted || allDone,
    }

    return this.saveAttempt(nextAttempt)
  },

  finalizeAttempt(
    test: Test,
    attemptId: string,
    finalStatus: 'submitted' | 'expired',
    answerKeys: Record<string, ServerTestAnswerKey> = getMockTestAnswerKeys(),
  ): TestAttemptResult {
    const map = this.getAllAttemptsMap()
    const attempt = map[attemptId]
    if (!attempt) {
      throw new Error('Không tìm thấy lượt thi để chấm điểm.')
    }

    const existingResults = this.getAllResultsMap()
    if (attempt.status !== 'in_progress' && existingResults[attemptId]) {
      return existingResults[attemptId]
    }

    const submittedAtIso = new Date().toISOString()
    const lockedAudioStates: Record<string, AudioGroupState> = {}
    for (const [k, v] of Object.entries(attempt.audioStates)) {
      lockedAudioStates[k] = { ...v, status: 'LOCKED' }
    }

    const finalizedAttempt: TestAttempt = {
      ...attempt,
      status: finalStatus,
      submittedAt: submittedAtIso,
      audioStates: lockedAudioStates,
    }
    map[attemptId] = finalizedAttempt
    safeWriteAttemptsMap(map)

    const result = gradeTestAttempt(
      test,
      finalizedAttempt,
      finalStatus,
      submittedAtIso,
      answerKeys,
    )
    existingResults[attemptId] = result
    safeWriteResultsMap(existingResults)

    return result
  },

  getResultByAttemptId(attemptId: string): TestAttemptResult | null {
    const results = this.getAllResultsMap()
    return results[attemptId] ?? null
  },
}
