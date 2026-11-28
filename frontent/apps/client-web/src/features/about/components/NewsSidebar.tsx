import { Link } from 'react-router-dom'
import ImageBox from '@/components/ui/ImageBox'
import { formatDate } from '@/utils/format'
import type { NewsPost } from '@/features/about/types'

export default function NewsSidebar({ posts }: { posts: NewsPost[] }) {
  if (posts.length === 0) return null

  return (
    <aside className="ec-reading-font rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm">
      <div className="relative mb-4 pb-3">
        <h2 className="text-base font-bold uppercase tracking-wide text-[#2878B8]">Tin tức mới nhất</h2>
        <span className="absolute bottom-0 left-0 h-1 w-24 rounded-full bg-[#2878B8]" />
        <span className="absolute bottom-0 left-24 right-0 h-px bg-[#DCEAF3]" />
      </div>

      <ul className="flex flex-col divide-y divide-[#DCEAF3]">
        {posts.map((p) => (
          <li key={p.id}>
            <Link to={`/about/news/${p.id}`} className="group flex items-start gap-3 py-3">
              <ImageBox src={p.image} alt={p.title} className="h-14 w-20 shrink-0 rounded-md" />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.48] text-[#1E293B] transition group-hover:text-[#2878B8]">
                  {p.title}
                </h3>
                <span className="mt-1 block text-xs text-[#64748B]">{formatDate(p.date)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
