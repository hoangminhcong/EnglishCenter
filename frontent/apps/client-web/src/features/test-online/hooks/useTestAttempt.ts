import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { attemptApi } from '@/features/test-online/api/attemptApi'
import { testApi } from '@/features/test-online/api/testApi'
import type { Test, TestAttempt } from '@/features/test-online/types/test.types'

export interface ActiveAttemptSession {
  attempt: TestAttempt
  test: Test
}

export function useTestAttemptSession(attemptId: string) {
  const fetcher = useCallback(async (): Promise<ActiveAttemptSession | null> => {
    if (!attemptId) return null
    const attempt = await attemptApi.getAttemptById(attemptId)
    if (!attempt) return null
    const test = await testApi.getTestById(attempt.testId)
    if (!test) return null
    return { attempt, test }
  }, [attemptId])

  return useAsync(fetcher, [attemptId], {
    queryKey: CLIENT_QUERY_KEYS.testOnline.attemptSession(attemptId),
    enabled: Boolean(attemptId),
  })
}

export function useTestAttemptResult(attemptId: string) {
  const fetcher = useCallback(async () => {
    if (!attemptId) return null
    const result = await attemptApi.getAttemptResult(attemptId)
    if (!result) return null
    const test =
      (await testApi.getTestById(result.testId)) ??
      (await testApi.getTestBySlug(result.testSlug))
    const attempt = await attemptApi.getAttemptById(attemptId)
    return { result, test, attempt }
  }, [attemptId])

  return useAsync(fetcher, [attemptId], {
    queryKey: CLIENT_QUERY_KEYS.testOnline.attemptResult(attemptId),
    enabled: Boolean(attemptId),
  })
}
