import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import { formatDate } from '@/utils/format'
import {
  ARTICLE_CATEGORY_LABELS,
  getArticleDetailPath,
  type Article,
} from '@/features/articles/types'

export default function ArticleCard({ article }: { article: Article }) {
  const detailPath = getArticleDetailPath(article)
  const tagLabel = article.subCategoryTag || ARTICLE_CATEGORY_LABELS[article.category]

  return (
    <article className="ec-reading-font group flex flex-col gap-5 rounded-xl border border-[#DCEAF3] bg-white p-4 shadow-sm transition hover:shadow-md md:flex-row">
      <Link to={detailPath} className="w-full shrink-0 md:w-[40%]">
        <ImageBox
          src={article.thumbnail}
          alt={article.title}
          label={tagLabel}
          className="aspect-[16/10] w-full rounded-lg"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748B]">
          <CalendarDays className="h-4 w-4 text-[#2878B8]" />
          <span>{formatDate(article.publishedDate)}</span>
          <span>•</span>
          <span className="font-semibold text-[#2878B8]">{tagLabel}</span>
        </div>

        <h2 className="mt-2 line-clamp-2 text-[19px] font-bold leading-[1.45] text-[#1E293B] transition group-hover:text-[#2878B8]">
          <Link to={detailPath}>{article.title}</Link>
        </h2>

        <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.68] text-[#475569]">
          {article.shortDescription}
        </p>

        <Link
          to={detailPath}
          className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-[#2878B8] hover:underline"
        >
          Xem chi tiết <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}
