import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { testApi } from '@/features/test-online/api/testApi'

export function useTests() {
  const fetcher = useCallback(() => testApi.getTests(), [])
  return useAsync(fetcher, [], { queryKey: CLIENT_QUERY_KEYS.testOnline.tests() })
}

export function useTestDetailBySlug(slug: string) {
  const fetcher = useCallback(() => testApi.getTestBySlug(slug), [slug])
  return useAsync(fetcher, [slug], {
    queryKey: CLIENT_QUERY_KEYS.testOnline.testBySlug(slug),
    enabled: Boolean(slug),
  })
}
