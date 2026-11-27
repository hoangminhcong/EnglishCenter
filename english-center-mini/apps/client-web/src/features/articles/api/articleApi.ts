import { USE_MOCK_API } from '@/services/api/apiConfig'
import { API_ENDPOINTS } from '@/services/api/endpoints'
import { ApiClientError, httpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/api/mockUtils'
import { initialArticles as articles } from '@/features/articles/mocks'
import type { Article, ArticleCategory } from '@/features/articles/types'

interface ArticleQueryParams {
  category?: ArticleCategory
  categories?: ArticleCategory[]
  featured?: boolean
  limit?: number
}

function applyPublicQuery(list: Article[], params?: ArticleQueryParams): Article[] {
  const filtered = list
    .filter((a) => {
      if (a.status !== 'published') return false
      if (params?.category && a.category !== params.category) return false
      if (
        params?.categories &&
        params.categories.length > 0 &&
        !params.categories.includes(a.category)
      ) {
        return false
      }
      if (params?.featured !== undefined && a.featured !== params.featured) return false
      return true
    })
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))

  return params?.limit ? filtered.slice(0, params.limit) : filtered
}

export const articleApi = {
  /** Chỉ bài viết đã xuất bản (status = 'published'), mới nhất trước */
  async getPublicArticles(params?: ArticleQueryParams): Promise<Article[]> {
    if (!USE_MOCK_API) {
      const list = await httpClient.get<Article[]>(API_ENDPOINTS.articles.publicList, {
        category: params?.category,
        categories: params?.categories?.join(','),
        featured: params?.featured,
        limit: params?.limit,
      })
      return applyPublicQuery(list, params)
    }

    await mockDelay()
    return applyPublicQuery(articles, params)
  },

  async getPublicArticleBySlug(
    slug: string,
    expectedCategory?: ArticleCategory,
  ): Promise<Article | null> {
    const accept = (a: Article | null | undefined): Article | null =>
      a && a.status === 'published' && (!expectedCategory || a.category === expectedCategory)
        ? a
        : null

    if (!USE_MOCK_API) {
      try {
        return accept(
          await httpClient.get<Article | null>(API_ENDPOINTS.articles.publicDetailBySlug(slug), {
            category: expectedCategory,
          }),
        )
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null
        throw err
      }
    }

    await mockDelay(150)
    return accept(articles.find((a) => a.slug === slug))
  },
}
