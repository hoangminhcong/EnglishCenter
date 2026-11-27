import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { mockTests, serverTestAnswerKeys } from '@/features/test-online/mocks/testMockData'
import type { ServerTestAnswerKey, Test } from '@/features/test-online/types/test.types'

export interface TestOnlineMockAdapterConfig {
  tests?: Test[]
  answerKeys?: Record<string, ServerTestAnswerKey>
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let mockTestsStore: Test[] = clone(mockTests)
let mockAnswerKeysStore: Record<string, ServerTestAnswerKey> = clone(serverTestAnswerKeys)

export function configureTestOnlineMockAdapter(config: TestOnlineMockAdapterConfig): void {
  if (config.tests !== undefined) {
    mockTestsStore = clone(config.tests)
  }
  if (config.answerKeys !== undefined) {
    mockAnswerKeysStore = clone(config.answerKeys)
  }
}

export function resetTestOnlineMockAdapter(): void {
  mockTestsStore = clone(mockTests)
  mockAnswerKeysStore = clone(serverTestAnswerKeys)
}

export function getMockTestAnswerKeys(): Record<string, ServerTestAnswerKey> {
  return clone(mockAnswerKeysStore)
}

export const testApi = {
  async getTests(): Promise<Test[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<Test[]>(API_ENDPOINTS.testOnline.testsList)
      return list.filter((t) => t.status === 'published')
    }
    await mockDelay(120)
    return clone(mockTestsStore.filter((t) => t.status === 'published'))
  },

  async getTestBySlug(slug: string): Promise<Test | null> {
    if (!USE_MOCK_API) {
      try {
        return await httpClient.get<Test>(API_ENDPOINTS.testOnline.testDetailBySlug(slug))
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }
    await mockDelay(120)
    const found = mockTestsStore.find((t) => t.slug === slug && t.status === 'published')
    return found ? clone(found) : null
  },

  async getTestById(testId: string): Promise<Test | null> {
    if (!USE_MOCK_API) {
      try {
        return await httpClient.get<Test>(API_ENDPOINTS.testOnline.testDetailById(testId))
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }
    await mockDelay(60)
    const found = mockTestsStore.find((t) => t.id === testId)
    return found ? clone(found) : null
  },
}
