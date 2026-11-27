import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { authSessionStore } from '@/features/auth/services/authService'
import { testApi } from '@/features/test-online/api/testApi'
import { attemptStorageService } from '@/features/test-online/services/attemptService'
import type {
  Test,
  TestAttempt,
  TestAttemptResult,
  TestHistoryFilterParams,
} from '@/features/test-online/types/test.types'
import { matchText } from '@/utils/format'

export interface TestHistoryRecord {
  attempt: TestAttempt
  result: TestAttemptResult | null
  attemptSequenceNumber: number // Lần 1, Lần 2, Lần 3 của cùng đề đó
}

export interface TestHistoryDetailPayload {
  attempt: TestAttempt
  result: TestAttemptResult | null
  test: Test | null
}

export const historyApi = {
  /**
   * Lấy toàn bộ lịch sử làm bài của học viên (mỗi lần thi là một bản ghi độc lập có Attempt ID riêng).
   */
  async getHistory(params?: TestHistoryFilterParams): Promise<TestHistoryRecord[]> {
    if (!USE_MOCK_API) {
      return httpClient.get<TestHistoryRecord[]>(API_ENDPOINTS.testOnline.historyList, {
        keyword: params?.keyword,
        testSlug: params?.testSlug,
        status: params?.status,
        fromDate: params?.fromDate,
        toDate: params?.toDate,
        sortOrder: params?.sortOrder,
      })
    }
    await mockDelay(100)
    const attemptsMap = attemptStorageService.getAllAttemptsMap()
    const resultsMap = attemptStorageService.getAllResultsMap()
    const currentUserId = authSessionStore.getCurrentUser()?.id ?? 'guest'

    const chronological = Object.values(attemptsMap)
      .filter((att) => {
        const ownerId = att.studentId ?? 'guest'
        return ownerId === currentUserId
      })
      .sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      )

    const countPerTest: Record<string, number> = {}
    const records: TestHistoryRecord[] = chronological.map((attempt) => {
      const nextCount = (countPerTest[attempt.testId] ?? 0) + 1
      countPerTest[attempt.testId] = nextCount
      return {
        attempt,
        result: resultsMap[attempt.id] ?? null,
        attemptSequenceNumber: nextCount,
      }
    })

    const filtered = records.filter((item) => {
      if (params?.keyword) {
        const text = `${item.attempt.id} ${item.attempt.testTitle} ${item.attempt.testCode}`
        if (!matchText(text, params.keyword)) return false
      }
      if (params?.testSlug && item.attempt.testSlug !== params.testSlug) {
        return false
      }
      if (params?.status && params.status !== 'all' && item.attempt.status !== params.status) {
        return false
      }
      if (params?.fromDate) {
        const fromMs = new Date(`${params.fromDate}T00:00:00`).getTime()
        if (new Date(item.attempt.startedAt).getTime() < fromMs) return false
      }
      if (params?.toDate) {
        const toMs = new Date(`${params.toDate}T23:59:59`).getTime()
        if (new Date(item.attempt.startedAt).getTime() > toMs) return false
      }
      return true
    })

    const sortOrder = params?.sortOrder ?? 'newest'
    filtered.sort((a, b) => {
      const diff =
        new Date(b.attempt.startedAt).getTime() - new Date(a.attempt.startedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

    return filtered
  },

  /**
   * Lấy chi tiết một lượt thi trong lịch sử kèm dữ liệu đề thi (nếu còn khả dụng) để xem lại kết quả.
   */
  async getHistoryDetail(attemptId: string): Promise<TestHistoryDetailPayload | null> {
    if (!USE_MOCK_API) {
      try {
        return await httpClient.get<TestHistoryDetailPayload>(
          API_ENDPOINTS.testOnline.historyDetail(attemptId),
        )
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }
    await mockDelay(100)
    const attempt = attemptStorageService.getAttemptById(attemptId)
    const currentUserId = authSessionStore.getCurrentUser()?.id ?? 'guest'
    const ownerId = attempt?.studentId ?? 'guest'
    if (!attempt || ownerId !== currentUserId) return null

    const test =
      (await testApi.getTestById(attempt.testId)) ??
      (await testApi.getTestBySlug(attempt.testSlug))
    const result = attemptStorageService.getResultByAttemptId(attemptId)
    return {
      attempt,
      result,
      test,
    }
  },
}
