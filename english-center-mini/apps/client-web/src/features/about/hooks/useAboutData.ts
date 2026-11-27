import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { branchApi, type BranchQueryOptions } from '@/features/about/api/branchApi'
import { newsApi } from '@/features/about/api/newsApi'
import { careerApi } from '@/features/about/api/careerApi'

export function useBranches(options?: BranchQueryOptions) {
  const scope = options?.scope ?? 'all-active'
  const fetcher = useCallback(() => branchApi.getPublicBranches({ scope }), [scope])
  return useAsync(fetcher, [scope], { queryKey: CLIENT_QUERY_KEYS.branches.byScope(scope) })
}

export function useNews() {
  return useAsync(newsApi.getPublicNews, [], { queryKey: CLIENT_QUERY_KEYS.news.publicList() })
}

export function useNewsDetail(id: string) {
  const fetcher = useCallback(() => newsApi.getPublicNewsById(id), [id])
  return useAsync(fetcher, [id], {
    queryKey: CLIENT_QUERY_KEYS.news.detail(id),
    enabled: Boolean(id),
  })
}

export function useCareers() {
  return useAsync(careerApi.getPublicJobs, [], {
    queryKey: CLIENT_QUERY_KEYS.careers.publicList(),
  })
}

export function useCareerDetail(id: string) {
  const fetcher = useCallback(() => careerApi.getPublicJobById(id), [id])
  return useAsync(fetcher, [id], {
    queryKey: CLIENT_QUERY_KEYS.careers.detail(id),
    enabled: Boolean(id),
  })
}
