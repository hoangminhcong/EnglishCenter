import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { courses as seedCourses } from '@/features/courses/mocks'
import type { Course } from '@/features/courses/types'

/** Khóa học hiển thị công khai: 'active' (đang mở) và 'paused' (tạm ngừng). 'draft'/'archived' luôn bị ẩn. */
const isPubliclyVisible = (course: Course) =>
  course.status === 'active' || course.status === 'paused'

export const courseApi = {
  async getPublicCourses(params?: { featured?: boolean }): Promise<Course[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<Course[]>(API_ENDPOINTS.courses.publicList, {
        featured: params?.featured,
      })
      return list.filter(isPubliclyVisible).sort((a, b) => a.displayOrder - b.displayOrder)
    }

    await mockDelay()
    return seedCourses
      .filter((c) => isPubliclyVisible(c) && (params?.featured === undefined || c.isFeatured === params.featured))
      .sort((a, b) => a.displayOrder - b.displayOrder)
  },

  /** Trả về null khi không tồn tại / đã ẩn (HTTP 404) để trang hiển thị "Không tìm thấy" */
  async getPublicCourseBySlug(slug: string): Promise<Course | null> {
    if (!USE_MOCK_API) {
      try {
        const course = await httpClient.get<Course | null>(
          API_ENDPOINTS.courses.publicDetailBySlug(slug),
        )
        return course && isPubliclyVisible(course) ? course : null
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }

    await mockDelay(150)
    const found = seedCourses.find((c) => c.slug === slug && isPubliclyVisible(c))
    return found ?? null
  },
}
