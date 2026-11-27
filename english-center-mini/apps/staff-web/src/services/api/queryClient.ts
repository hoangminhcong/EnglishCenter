import { QueryClient } from '@tanstack/react-query'
import { StaffApiClientError } from '@/services/api/httpClient'

/** QueryClient độc lập riêng cho Staff Web, không chia sẻ cache với Client Web */
export const staffQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof StaffApiClientError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
  },
})
