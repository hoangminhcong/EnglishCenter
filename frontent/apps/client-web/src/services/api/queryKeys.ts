/**
 * Hệ thống Query Keys tập trung cho Client Web.
 */
export const CLIENT_QUERY_KEYS = {
  branches: {
    byScope: (scope: string) => ['branches', scope] as const,
  },
  courses: {
    list: (featured?: boolean) => ['courses', 'list', { featured: Boolean(featured) }] as const,
    detail: (slug: string) => ['courses', 'detail', slug] as const,
  },
  schedules: {
    publicList: (params: {
      branchId: string
      month: number
      year?: number
      courseId?: string
    }) => ['schedules', 'public', params] as const,
  },
  news: {
    publicList: () => ['news', 'public'] as const,
    detail: (id: string) => ['news', 'detail', id] as const,
  },
  careers: {
    publicList: () => ['careers', 'public'] as const,
    detail: (id: string) => ['careers', 'detail', id] as const,
  },
  articles: {
    byCategory: (category: string) => ['articles', 'public', category] as const,
    sidebar: (excludeSlug?: string) => ['articles', 'sidebar', excludeSlug ?? 'all'] as const,
    detail: (category: string, slug: string) => ['articles', 'detail', category, slug] as const,
  },
  studyZone: {
    topics: (category: string) => ['study-zone', 'topics', category] as const,
    exercise: (exerciseId: string) => ['study-zone', 'exercise', exerciseId] as const,
  },
  testOnline: {
    all: ['test-online'] as const,
    tests: () => ['test-online', 'tests'] as const,
    testBySlug: (slug: string) => ['test-online', 'test-slug', slug] as const,
    attemptSession: (attemptId: string) => ['test-online', 'attempt-session', attemptId] as const,
    attemptResult: (attemptId: string) => ['test-online', 'attempt-result', attemptId] as const,
    history: (
      studentScope: string,
      filters: {
        keyword: string
        testSlug: string
        status: string
        fromDate: string
        toDate: string
        sortOrder: string
      },
    ) => ['test-online', 'history', studentScope, filters] as const,
    historyDetail: (attemptId: string) => ['test-online', 'history-detail', attemptId] as const,
  },
  studentPortal: {
    dataset: (studentId: string) => ['student-portal', 'dataset', studentId] as const,
    tuition: (userId: string) => ['student-portal', 'tuition', userId] as const,
  },
} as const
