import { useQuery } from '@tanstack/react-query'
import { ApiClientError } from '@/services/api/httpClient'

export interface UseQueryOptions {
  /** Khóa cache chuẩn hóa (hỗ trợ cả mảng phân cấp chuẩn TanStack Query lẫn chuỗi tương thích ngược) */
  queryKey: string | readonly unknown[]
  enabled?: boolean
  staleTimeMs?: number
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError || err instanceof Error) {
    if (err.message) return err.message
  }
  return 'Không thể tải dữ liệu. Vui lòng thử lại.'
}

/**
 * Lớp bọc mỏng trên TanStack Query, giữ giao diện { data, loading, error, retry }
 * để các trang không phụ thuộc trực tiếp vào thư viện.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], options: UseQueryOptions) {
  const resolvedKey = Array.isArray(options.queryKey)
    ? options.queryKey
    : [options.queryKey, ...deps]

  const query = useQuery<T, unknown>({
    queryKey: resolvedKey,
    queryFn: fn,
    enabled: options.enabled ?? true,
    staleTime: options.staleTimeMs,
  })

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    retry: () => {
      void query.refetch()
    },
  }
}
