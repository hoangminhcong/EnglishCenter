import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import type { CreateConsultationRequest } from '@/features/consultation/types'

const SUCCESS_MESSAGE = 'Đăng ký thành công! English Center sẽ liên hệ tư vấn cho bạn trong thời gian sớm nhất.'

export const consultationApi = {
  /** Khách gửi đăng ký tư vấn (Form cuối trang hoặc Modal Lịch khai giảng). Backend lưu để bộ phận Sale xử lý. */
  async submit(payload: CreateConsultationRequest): Promise<{ message: string }> {
    if (!USE_MOCK_API) {
      const result = await httpClient.post<{ message?: string } | null>(API_ENDPOINTS.consultations.submit, payload)
      return { message: result?.message ?? SUCCESS_MESSAGE }
    }

    await mockDelay(350)
    return { message: SUCCESS_MESSAGE }
  },
}
