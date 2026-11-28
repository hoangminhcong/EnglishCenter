import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import {
  initialStudyExercises,
  initialStudyTopics,
  serverAnswerKeys,
} from '@/features/study-zone/mocks/studyZoneMockData'
import type {
  ExerciseAttemptResult,
  QuestionAnswerKey,
  QuestionReviewItem,
  StudyExercise,
  StudyTopic,
  StudyZoneCategory,
  SubmitExercisePayload,
} from '@/features/study-zone/types'

export interface StudyZoneMockAdapterConfig {
  topics?: StudyTopic[]
  exercises?: StudyExercise[]
  answerKeys?: Record<string, QuestionAnswerKey>
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let mockTopicsStore: StudyTopic[] = clone(initialStudyTopics)
let mockExercisesStore: StudyExercise[] = clone(initialStudyExercises)
let mockAnswerKeysStore: Record<string, QuestionAnswerKey> = clone(serverAnswerKeys)

export function configureStudyZoneMockAdapter(config: StudyZoneMockAdapterConfig): void {
  if (config.topics !== undefined) {
    mockTopicsStore = clone(config.topics)
  }
  if (config.exercises !== undefined) {
    mockExercisesStore = clone(config.exercises)
  }
  if (config.answerKeys !== undefined) {
    mockAnswerKeysStore = clone(config.answerKeys)
  }
}

export function resetStudyZoneMockAdapter(): void {
  mockTopicsStore = clone(initialStudyTopics)
  mockExercisesStore = clone(initialStudyExercises)
  mockAnswerKeysStore = clone(serverAnswerKeys)
}

export const studyZoneApi = {
  async getTopics(category?: StudyZoneCategory): Promise<StudyTopic[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<StudyTopic[]>(API_ENDPOINTS.studyZone.topicsList, {
        category,
      })
      return list
        .filter((t) => t.isPublished && (!category || t.category === category))
        .sort((a, b) => a.orderNumber - b.orderNumber)
    }

    await mockDelay(180)
    return clone(
      mockTopicsStore
        .filter((t) => t.isPublished && (!category || t.category === category))
        .sort((a, b) => a.orderNumber - b.orderNumber),
    )
  },

  async getExerciseById(exerciseId: string): Promise<StudyExercise | null> {
    if (!USE_MOCK_API) {
      try {
        return await httpClient.get<StudyExercise | null>(
          API_ENDPOINTS.studyZone.exerciseDetail(exerciseId),
        )
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }

    await mockDelay(180)
    const found = mockExercisesStore.find((ex) => ex.id === exerciseId)
    if (!found) return null

    const cloned = clone(found)
    return {
      ...cloned,
      questions: [...cloned.questions].sort((a, b) => a.displayOrder - b.displayOrder),
    }
  },

  async submitExercise(payload: SubmitExercisePayload): Promise<ExerciseAttemptResult> {
    if (!USE_MOCK_API) {
      return httpClient.post<ExerciseAttemptResult>(
        API_ENDPOINTS.studyZone.submitExercise(payload.exerciseId),
        payload,
      )
    }

    await mockDelay(320)
    const exercise = mockExercisesStore.find((ex) => ex.id === payload.exerciseId)
    if (!exercise) {
      throw new Error('Không tìm thấy bài tập để chấm điểm.')
    }

    const totalQuestions = exercise.questions.length
    let answeredCount = 0
    let correctCount = 0
    let incorrectCount = 0
    let unansweredCount = 0
    const reviews: Record<string, QuestionReviewItem> = {}

    for (const q of exercise.questions) {
      const selectedOptionId = payload.answers[q.id] ?? null
      const key = mockAnswerKeysStore[q.id]
      const correctOptionId = key?.correctOptionId ?? q.options[0]?.id ?? ''
      const isAnswered = Boolean(selectedOptionId)
      const isCorrect = Boolean(isAnswered && selectedOptionId === correctOptionId)

      if (!isAnswered) {
        unansweredCount += 1
      } else {
        answeredCount += 1
        if (isCorrect) {
          correctCount += 1
        } else {
          incorrectCount += 1
        }
      }

      reviews[q.id] = {
        questionId: q.id,
        selectedOptionId,
        correctOptionId,
        isCorrect,
        explanation:
          key?.explanation ??
          'Đáp án đúng được xác định dựa trên ngữ cảnh và quy tắc ngữ pháp/từ vựng chuẩn TOEIC.',
        audioTranscript: key?.audioTranscript,
        audioTranslation: key?.audioTranslation,
      }
    }

    const accuracyPercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const scoreTen =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) / 10 : 0

    return {
      attemptId: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: payload.exerciseId,
      submittedAt: new Date().toISOString(),
      totalQuestions,
      answeredCount,
      unansweredCount,
      correctCount,
      incorrectCount,
      scoreTen,
      accuracyPercent,
      durationSeconds: payload.durationSeconds,
      reviews,
    }
  },
}
