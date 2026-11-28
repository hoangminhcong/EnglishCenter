import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { courseApi } from '@/features/courses/api/courseApi'

export function useCourses(options?: { featured?: boolean }) {
  const featured = options?.featured
  const fetcher = useCallback(() => courseApi.getPublicCourses({ featured }), [featured])

  return useAsync(fetcher, [featured], {
    queryKey: CLIENT_QUERY_KEYS.courses.list(featured),
  })
}
