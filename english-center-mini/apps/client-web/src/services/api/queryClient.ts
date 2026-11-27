import { QueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/services/api/httpClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dữ liệu công khai: coi là "tươi" 60 giây, sau đó tự lấy lại khi người dùng quay lại tab / điều hướng
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      // Không thử lại với lỗi 4xx (sai đường dẫn, không tìm thấy...); lỗi mạng/5xx thử lại tối đa 2 lần
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})
