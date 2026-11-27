import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import { useSidebarLearningMaterials } from '@/features/articles/hooks/useArticles'
import { ARTICLE_CATEGORY_LABELS, getArticleDetailPath } from '@/features/articles/types'

interface LearningMaterialsSidebarProps {
  excludeSlug?: string
}

/**
 * Sidebar TÀI LIỆU HỌC TẬP hiển thị bên phải (25-30% chiều rộng) giống ảnh thiết kế mẫu.
 * Mỗi mục gồm: Ảnh thumbnail, Tiêu đề, Mô tả ngắn (hoặc nhãn danh mục) và liên kết chi tiết.
 */
export default function LearningMaterialsSidebar({ excludeSlug }: LearningMaterialsSidebarProps) {
  const { data } = useSidebarLearningMaterials(excludeSlug)
  const items = data ?? []

  if (items.length === 0) return null

  return (
    <aside className="ec-reading-font rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm">
      <div className="relative mb-4 border-l-4 border-[#2878B8] border-t-2 border-t-[#2878B8] pl-3 pt-2">
        <h2 className="text-base font-bold uppercase tracking-wide text-[#2878B8]">
          TÀI LIỆU HỌC TẬP
        </h2>
      </div>

      <ul className="flex flex-col divide-y divide-[#DCEAF3]">
        {items.map((item) => {
          const to = getArticleDetailPath(item)
          return (
            <li key={item.id}>
              <Link to={to} className="group flex items-start gap-3 py-3.5">
                <ImageBox
                  src={item.thumbnail}
                  alt={item.title}
                  label={ARTICLE_CATEGORY_LABELS[item.category]}
                  className="h-16 w-24 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.48] text-[#1E293B] transition group-hover:text-[#2878B8]">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-[1.55] text-[#64748B]">
                    {item.shortDescription}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <Link
        to="/tai-lieu/listening-reading"
        className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-[#2878B8] py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#1e639c]"
      >
        Khám phá kho tài liệu <ChevronRight className="h-4 w-4" />
      </Link>
    </aside>
  )
}
