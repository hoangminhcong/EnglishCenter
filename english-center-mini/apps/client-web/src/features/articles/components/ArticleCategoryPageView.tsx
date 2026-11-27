import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageBanner from '@/components/ui/PageBanner'
import FilterBar from '@/components/ui/FilterBar'
import Pagination from '@/components/ui/Pagination'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { usePublicArticles } from '@/features/articles/hooks/useArticles'
import ArticleCard from '@/features/articles/components/ArticleCard'
import LearningMaterialsSidebar from '@/features/articles/components/LearningMaterialsSidebar'
import { matchText, paginate } from '@/utils/format'
import type { ArticleCategory } from '@/features/articles/types'

interface ArticleCategoryPageViewProps {
  category: ArticleCategory
  bannerTitle: string
  bannerBadge?: string
  bannerSubtitle: string
  bannerImage?: string
  breadcrumbLabel: string
  searchPlaceholder: string
}

const PAGE_SIZE = 4

export default function ArticleCategoryPageView({
  category,
  bannerTitle,
  bannerBadge,
  bannerSubtitle,
  bannerImage = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400',
  breadcrumbLabel,
  searchPlaceholder,
}: ArticleCategoryPageViewProps) {
  const { data, loading, error, retry } = usePublicArticles(category)
  const [keyword, setKeyword] = useState('')
  const [subTag, setSubTag] = useState('')
  const [page, setPage] = useState(1)

  const articles = useMemo(() => data ?? [], [data])

  const subTags = useMemo(
    () => Array.from(new Set(articles.map((a) => a.subCategoryTag).filter(Boolean) as string[])),
    [articles],
  )

  const filtered = useMemo(
    () =>
      articles.filter(
        (a) =>
          (!subTag || a.subCategoryTag === subTag) &&
          matchText(`${a.title} ${a.shortDescription}`, keyword),
      ),
    [articles, subTag, keyword],
  )

  const paged = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page])
  const emptyTitle = category === 'listening-reading' ? 'Chưa có tài liệu.' : 'Chưa có bài viết.'

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <div className="border-b border-[#DCEAF3] bg-white py-2 text-xs text-[#64748B]">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="hover:text-[#2878B8] hover:underline">
            Trang chủ
          </Link>
          <span>»</span>
          <span className="font-semibold text-[#243B53]">{breadcrumbLabel}</span>
        </div>
      </div>

      <PageBanner
        title={bannerTitle}
        badge={bannerBadge}
        subtitle={bannerSubtitle}
        image={bannerImage}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {articles.length > 0 && (
          <div className="relative z-10 -mt-6">
            <FilterBar
              keyword={keyword}
              onKeywordChange={(v) => {
                setKeyword(v)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
              selects={
                subTags.length > 0
                  ? [
                      {
                        id: 'subTag',
                        value: subTag,
                        placeholder: 'Tất cả chủ đề',
                        options: subTags,
                        onChange: (v) => {
                          setSubTag(v)
                          setPage(1)
                        },
                      },
                    ]
                  : []
              }
            />
          </div>
        )}

        <div
          className={`${articles.length > 0 ? 'mt-8' : 'pt-10'} grid grid-cols-1 items-start gap-8 ${
            articles.length > 0 ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]' : ''
          }`}
        >
          <main className="flex flex-col gap-6">
            {loading && <LoadingBlock label="Đang tải danh sách bài viết..." />}
            {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

            {!loading && !error && articles.length === 0 && (
              <EmptyBlock title={emptyTitle} />
            )}

            {!loading && !error && articles.length > 0 && filtered.length === 0 && (
              <EmptyBlock
                title="Không tìm thấy bài viết phù hợp"
                description="Hãy thử đổi từ khóa hoặc chọn chủ đề khác."
              />
            )}

            {!loading &&
              !error &&
              paged.items.map((article) => <ArticleCard key={article.id} article={article} />)}

            {!loading && !error && articles.length > 0 && (
              <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
            )}
          </main>

          {articles.length > 0 && (
            <div className="flex flex-col gap-6">
              <LearningMaterialsSidebar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
