import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { courseApi } from '@/features/courses/api/courseApi'

export function useCourseDetail(slug: string) {
  const fetcher = useCallback(() => courseApi.getPublicCourseBySlug(slug), [slug])

  return useAsync(fetcher, [slug], {
    queryKey: CLIENT_QUERY_KEYS.courses.detail(slug),
    enabled: Boolean(slug),
  })
}
