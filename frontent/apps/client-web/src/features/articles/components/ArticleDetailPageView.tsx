import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, User } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import ImageBox from '@/components/ui/ImageBox'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { usePublicArticleDetail, usePublicArticles } from '@/features/articles/hooks/useArticles'
import ArticleContentRenderer from '@/features/articles/components/ArticleContentRenderer'
import ArticleAttachmentsBox from '@/features/articles/components/ArticleAttachmentsBox'
import RelatedArticlesSection from '@/features/articles/components/RelatedArticlesSection'
import LearningMaterialsSidebar from '@/features/articles/components/LearningMaterialsSidebar'
import { formatDate } from '@/utils/format'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  ARTICLE_CATEGORY_LABELS,
  getArticleCategoryPath,
  type ArticleCategory,
} from '@/features/articles/types'

interface ArticleDetailPageViewProps {
  category: ArticleCategory
  bannerTitle: string
  backLabel: string
}

export default function ArticleDetailPageView({
  category,
  bannerTitle,
  backLabel,
}: ArticleDetailPageViewProps) {
  const { slug = '' } = useParams()
  const detailState = usePublicArticleDetail(slug, category)
  const categoryListState = usePublicArticles(category)

  const backPath = getArticleCategoryPath(category)
  const relatedArticles = (categoryListState.data ?? [])
    .filter((item) => item.slug !== slug)
    .slice(0, 4)

  const article = detailState.data
  usePageTitle(article?.title)

  return (
    <div className="ec-reading-font bg-[#F5FAFE] pb-14">
      <PageBanner
        title={bannerTitle}
        image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400"
      />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          to={backPath}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div>
            {detailState.loading && <LoadingBlock label="Đang tải nội dung bài viết..." />}

            {!detailState.loading && detailState.error && (
              <ErrorBlock message={detailState.error} onRetry={detailState.retry} />
            )}

            {!detailState.loading && !detailState.error && !article && (
              <EmptyBlock
                title="Không tìm thấy bài viết"
                description="Liên kết không hợp lệ hoặc bài viết không còn hiển thị."
                action={
                  <Link
                    to={backPath}
                    className="mt-3 rounded-md bg-[#2878B8] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#1F6399]"
                  >
                    {backLabel}
                  </Link>
                }
              />
            )}

            {article && (
              <>
                <article className="rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm sm:p-8">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#718096]">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-[#2878B8]" />
                      {formatDate(article.publishedDate)}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-[#2878B8]">
                      {article.subCategoryTag || ARTICLE_CATEGORY_LABELS[article.category]}
                    </span>
                    {article.author && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-[#718096]" />
                          {article.author}
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="mt-3 text-2xl font-bold leading-[1.38] text-[#1E293B] sm:text-[28px]">
                    {article.title}
                  </h1>

                  <p className="mt-3.5 rounded-lg border-l-4 border-[#2878B8] bg-[#F5FAFE] px-4 py-3 text-[15px] font-medium leading-[1.68] text-[#334155]">
                    {article.shortDescription}
                  </p>

                  {article.thumbnail && (
                    <ImageBox
                      src={article.thumbnail}
                      alt={article.title}
                      label={ARTICLE_CATEGORY_LABELS[article.category]}
                      className="my-6 aspect-[16/9] w-full rounded-xl"
                    />
                  )}

                  {/* Nội dung chi tiết đa định dạng (Tiêu đề, Đoạn văn, Danh sách, Hình minh họa) */}
                  <ArticleContentRenderer blocks={article.contentBlocks} />

                  {/* Khối File đính kèm / Link tải tài liệu do Admin cung cấp */}
                  <ArticleAttachmentsBox attachments={article.attachments} />
                </article>

                {/* Bài viết liên quan cùng danh mục */}
                <RelatedArticlesSection articles={relatedArticles} />
              </>
            )}
          </div>

          {/* Sidebar Tài liệu học tập bên phải */}
          <div className="flex flex-col gap-6">
            <LearningMaterialsSidebar excludeSlug={slug} />
          </div>
        </div>
      </div>
    </div>
  )
}
