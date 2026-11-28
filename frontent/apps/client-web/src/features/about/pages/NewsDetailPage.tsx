import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import ImageBox from '@/components/ui/ImageBox'
import NewsSidebar from '@/features/about/components/NewsSidebar'
import LearningMaterialsSidebar from '@/features/articles/components/LearningMaterialsSidebar'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useNews, useNewsDetail } from '@/features/about/hooks/useAboutData'
import { formatDate } from '@/utils/format'

export default function NewsDetailPage() {
  const { id = '' } = useParams()
  const post = useNewsDetail(id)
  const list = useNews()

  const latest = (list.data ?? []).filter((p) => p.id !== id).slice(0, 5)

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <PageBanner title="TIN TỨC" />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link to="/about/news" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2878B8] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách tin tức
        </Link>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div>
            {post.loading && <LoadingBlock label="Đang tải bài viết..." />}
            {!post.loading && post.error && <ErrorBlock message={post.error} onRetry={post.retry} />}
            {!post.loading && !post.error && !post.data && (
              <EmptyBlock
                title="Không tìm thấy bài viết"
                action={
                  <Link to="/about/news" className="mt-2 rounded-md bg-[#2878B8] px-5 py-2 text-sm font-bold text-white">
                    Về trang Tin tức
                  </Link>
                }
              />
            )}
            {post.data && (
              <article className="ec-reading-font rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748B]">
                  <CalendarDays className="h-4 w-4 text-[#2878B8]" />
                  <span>{formatDate(post.data.date)}</span>
                  <span>•</span>
                  <span className="font-semibold text-[#2878B8]">{post.data.category}</span>
                </div>
                <h1 className="mt-3 text-2xl font-bold leading-[1.38] text-[#1E293B] sm:text-[28px]">{post.data.title}</h1>
                <ImageBox src={post.data.image} alt={post.data.title} label="English Center" className="my-6 aspect-[16/8] w-full rounded-lg" />
                <div className="space-y-4 text-[16px] leading-[1.78] text-[#1E293B]">
                  {post.data.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {latest.length > 0 && <NewsSidebar posts={latest} />}
            <LearningMaterialsSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
