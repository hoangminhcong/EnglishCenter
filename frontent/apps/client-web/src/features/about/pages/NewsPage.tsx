import { useMemo, useState } from 'react'
import PageBanner from '@/components/ui/PageBanner'
import FilterBar from '@/components/ui/FilterBar'
import Pagination from '@/components/ui/Pagination'
import NewsCard from '@/features/about/components/NewsCard'
import NewsSidebar from '@/features/about/components/NewsSidebar'
import LearningMaterialsSidebar from '@/features/articles/components/LearningMaterialsSidebar'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useNews } from '@/features/about/hooks/useAboutData'
import { matchText, paginate } from '@/utils/format'

const PAGE_SIZE = 4

export default function NewsPage() {
  const { data, loading, error, retry } = useNews()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const posts = useMemo(() => data ?? [], [data])
  const categories = useMemo(() => Array.from(new Set(posts.map((p) => p.category))), [posts])

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) => (!category || p.category === category) && matchText(`${p.title} ${p.excerpt}`, keyword),
      ),
    [posts, category, keyword],
  )
  const paged = paginate(filtered, page, PAGE_SIZE)

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <PageBanner
        title="TIN TỨC"
        badge="Bản tin English Center"
        subtitle="Cập nhật thông tin tuyển sinh, kinh nghiệm học và hoạt động mới nhất của trung tâm."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {posts.length > 0 && (
          <div className="relative z-10 -mt-6">
            <FilterBar
              keyword={keyword}
              onKeywordChange={(v) => {
                setKeyword(v)
                setPage(1)
              }}
              placeholder="Tìm bài viết..."
              selects={[
                {
                  id: 'category',
                  value: category,
                  placeholder: 'Tất cả danh mục',
                  options: categories,
                  onChange: (v) => {
                    setCategory(v)
                    setPage(1)
                  },
                },
              ]}
            />
          </div>
        )}

        <div
          className={`${posts.length > 0 ? 'mt-8' : 'pt-10'} grid grid-cols-1 items-start gap-8 ${
            posts.length > 0 ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]' : ''
          }`}
        >
          <main className="flex flex-col gap-6">
            {loading && <LoadingBlock label="Đang tải bài viết..." />}
            {!loading && error && <ErrorBlock message={error} onRetry={retry} />}
            {!loading && !error && posts.length === 0 && (
              <EmptyBlock title="Chưa có tin tức." />
            )}
            {!loading && !error && posts.length > 0 && filtered.length === 0 && (
              <EmptyBlock
                title="Không tìm thấy tin tức phù hợp"
                description="Hãy thử từ khóa hoặc danh mục khác."
              />
            )}
            {!loading && !error && paged.items.map((p) => <NewsCard key={p.id} post={p} />)}
            {!loading && !error && posts.length > 0 && (
              <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
            )}
          </main>

          {!loading && !error && posts.length > 0 && (
            <div className="flex flex-col gap-6">
              <NewsSidebar posts={posts.slice(0, 5)} />
              <LearningMaterialsSidebar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
