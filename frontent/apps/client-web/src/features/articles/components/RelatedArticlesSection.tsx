import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import { formatDate } from '@/utils/format'
import { getArticleDetailPath, type Article } from '@/features/articles/types'

export default function RelatedArticlesSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null

  return (
    <section className="mt-8 rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 border-l-4 border-[#75BDEB] pl-3 text-lg font-extrabold uppercase text-[#243B53]">
        Bài viết liên quan
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((item) => {
          const to = getArticleDetailPath(item)
          return (
            <Link
              key={item.id}
              to={to}
              className="group flex items-start gap-3 rounded-lg border border-[#DCEAF3] p-3 transition hover:border-[#75BDEB] hover:bg-[#F5FAFE]"
            >
              <ImageBox
                src={item.thumbnail}
                alt={item.title}
                label="TOEIC"
                className="h-16 w-24 shrink-0 rounded-md"
              />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#243B53] transition group-hover:text-[#2878B8]">
                  {item.title}
                </h3>
                <span className="mt-1.5 flex items-center gap-1 text-xs text-[#64748B]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#2878B8]" />
                  {formatDate(item.publishedDate)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
