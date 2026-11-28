export type ArticleCategory = 'student' | 'listening-reading' | 'exam-review'

export type ArticleStatus = 'draft' | 'published'

export interface ArticleAttachment {
  id: string
  name: string
  url: string
  fileType?: string // VD: "PDF", "MP3", "DOCX", "ZIP"
  fileSize?: string // VD: "4.2 MB"
}

export type ArticleContentBlock =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'paragraph'; text: string; boldPrefix?: string }
  | { id: string; type: 'list'; items: string[] }
  | { id: string; type: 'image'; src: string; alt: string; caption?: string }

export interface Article {
  id: string
  title: string
  slug: string
  thumbnail: string
  shortDescription: string
  contentBlocks: ArticleContentBlock[]
  category: ArticleCategory
  subCategoryTag?: string // Nhãn phụ hiển thị nhỏ trên Card (VD: "Chuẩn đầu ra ĐH", "Tài liệu 2 Kỹ năng", "Đề thi ngày 31/03")
  author: string
  publishedDate: string // YYYY-MM-DD
  status: ArticleStatus
  featured: boolean
  attachments: ArticleAttachment[]
  createdAt: string
  updatedAt: string
}

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  student: 'Học viên',
  'listening-reading': 'Listening & Reading',
  'exam-review': 'Review đề thi',
}

export function getArticleDetailPath(article: Pick<Article, 'category' | 'slug'>): string {
  switch (article.category) {
    case 'student':
      return `/hoc-vien/${article.slug}`
    case 'listening-reading':
      return `/tai-lieu/listening-reading/${article.slug}`
    case 'exam-review':
      return `/tai-lieu/review-de-thi/${article.slug}`
  }
}

export function getArticleCategoryPath(category: ArticleCategory): string {
  switch (category) {
    case 'student':
      return '/hoc-vien'
    case 'listening-reading':
      return '/tai-lieu/listening-reading'
    case 'exam-review':
      return '/tai-lieu/review-de-thi'
  }
}
