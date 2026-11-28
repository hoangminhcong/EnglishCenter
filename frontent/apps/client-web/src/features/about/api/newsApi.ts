import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { newsPosts } from '@/features/about/mocks/news'
import type { NewsPost } from '@/features/about/types'

const isPublished = (p: NewsPost) => (p.status ?? 'published') === 'published'

export const newsApi = {
  async getPublicNews(): Promise<NewsPost[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<NewsPost[]>(API_ENDPOINTS.news.publicList)
      return list.filter(isPublished).sort((a, b) => b.date.localeCompare(a.date))
    }

    await mockDelay()
    return newsPosts.filter(isPublished).sort((a, b) => b.date.localeCompare(a.date))
  },

  async getPublicNewsById(id: string): Promise<NewsPost | null> {
    if (!USE_MOCK_API) {
      try {
        const post = await httpClient.get<NewsPost | null>(API_ENDPOINTS.news.publicDetail(id))
        return post && isPublished(post) ? post : null
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }

    await mockDelay(150)
    return newsPosts.find((p) => p.id === id && isPublished(p)) ?? null
  },
}
