import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { branchApi } from '@/features/about/api/branchApi'
import { consultationApi } from '@/features/consultation/api/consultationApi'
import { courseApi } from '@/features/courses/api/courseApi'
import { initialSchedules } from '@/features/schedules/mocks/scheduleMockData'
import type {
  PublicScheduleItem,
  Schedule,
  ScheduleBranch,
  ScheduleConsultationPayload,
  ScheduleCourse,
  ScheduleFilterParams,
} from '@/features/schedules/types'

async function enrichForMock(items: Schedule[]): Promise<PublicScheduleItem[]> {
  const [courses, branches] = await Promise.all([
    courseApi.getPublicCourses(),
    branchApi.getPublicBranches({ scope: 'schedule' }),
  ])
  const courseMap = new Map(courses.map((c) => [c.id, c]))
  const branchMap = new Map(branches.map((b) => [b.id, b]))

  return items
    .filter((item) => courseMap.has(item.courseId) && branchMap.has(item.branchId))
    .map((item) => {
      const course = courseMap.get(item.courseId)
      const branch = branchMap.get(item.branchId)
      return {
        ...item,
        courseName: course?.scheduleTitle ?? course?.name ?? '',
        courseSubtitle: course?.scheduleSubtitle ?? '',
        branchName: branch?.name ?? '',
        branchShortLabel: branch?.shortLabel ?? '',
      }
    })
}

export const scheduleApi = {
  async getBranches(): Promise<ScheduleBranch[]> {
    return branchApi.getPublicBranches({ scope: 'schedule' })
  },

  async getCourses(): Promise<ScheduleCourse[]> {
    return courseApi.getPublicCourses()
  },

  /** Chỉ lịch được công khai (isPublished = true), thuộc khóa học/cơ sở đang hoạt động */
  async getPublicSchedules(params: ScheduleFilterParams): Promise<PublicScheduleItem[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<PublicScheduleItem[]>(API_ENDPOINTS.schedules.publicList, {
        branchId: params.branchId,
        month: params.month,
        year: params.year,
        courseId: params.courseId,
      })
      return list
        .filter((s) => s.isPublished)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    }

    await mockDelay()
    const matched = initialSchedules
      .filter((s) => {
        if (!s.isPublished) return false
        if (params.branchId && s.branchId !== params.branchId) return false
        if (s.month !== params.month) return false
        if (params.year !== undefined && s.year !== params.year) return false
        if (params.courseId && s.courseId !== params.courseId) return false
        return true
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))

    return enrichForMock(matched)
  },

  async submitConsultation(payload: ScheduleConsultationPayload): Promise<{ message: string }> {
    return consultationApi.submit({
      source: 'schedule-modal',
      scheduleId: payload.scheduleId,
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      courseName: payload.courseName,
      branchName: payload.branchName,
      note: payload.note,
    })
  },
}
