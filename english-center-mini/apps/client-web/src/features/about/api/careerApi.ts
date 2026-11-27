import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { centerInfo } from '@/config/center-info'
import { jobPosts } from '@/features/about/mocks/jobs'
import type { JobPost } from '@/features/about/types'
import {
  formatDate,
  getTodayIsoInVietnam,
  isIsoDateExpiredInVietnam,
} from '@/utils/format'

const isPubliclyVisibleJob = (j: JobPost) => {
  const st = j.status ?? 'published'
  return st === 'published' || st === 'closed'
}

export function formatJobDeadlineLabel(deadline?: string | null): string {
  const trimmed = deadline?.trim() ?? ''
  if (!trimmed) return 'Liên hệ trung tâm'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Đang cập nhật'
  return formatDate(trimmed)
}

function normalizeJobForDisplay(job: JobPost, todayInVietnam: string): JobPost {
  const isExpired = isIsoDateExpiredInVietnam(job.deadline, todayInVietnam)
  const effectiveStatus =
    job.status === 'closed' || isExpired ? 'closed' : (job.status ?? 'published')

  return {
    ...job,
    location: job.location || `Các cơ sở ${centerInfo.name}`,
    status: effectiveStatus,
  }
}

export const careerApi = {
  async getPublicJobs(): Promise<JobPost[]> {
    const todayInVietnam = getTodayIsoInVietnam()

    if (!USE_MOCK_API) {
      const list = await httpClient.get<JobPost[]>(API_ENDPOINTS.careers.publicList)
      return list
        .filter(isPubliclyVisibleJob)
        .map((job) => normalizeJobForDisplay(job, todayInVietnam))
    }

    await mockDelay()
    return jobPosts
      .filter(isPubliclyVisibleJob)
      .map((job) => normalizeJobForDisplay(job, todayInVietnam))
  },

  async getPublicJobById(id: string): Promise<JobPost | null> {
    const todayInVietnam = getTodayIsoInVietnam()

    if (!USE_MOCK_API) {
      try {
        const job = await httpClient.get<JobPost | null>(API_ENDPOINTS.careers.publicDetail(id))
        return job && isPubliclyVisibleJob(job)
          ? normalizeJobForDisplay(job, todayInVietnam)
          : null
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }

    await mockDelay(150)
    const found = jobPosts.find((j) => j.id === id && isPubliclyVisibleJob(j))
    return found ? normalizeJobForDisplay(found, todayInVietnam) : null
  },
}
