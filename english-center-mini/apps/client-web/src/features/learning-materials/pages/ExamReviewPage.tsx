import ArticleCategoryPageView from '@/features/articles/components/ArticleCategoryPageView'

export default function ExamReviewPage() {
  return (
    <ArticleCategoryPageView
      category="exam-review"
      bannerTitle="REVIEW ĐỀ THI"
      bannerBadge="Cập nhật đề thi thật"
      bannerSubtitle="Tổng hợp review chi tiết đề thi TOEIC thực tế theo từng ngày, phân tích độ khó, từ vựng xuất hiện và kinh nghiệm phòng thi."
      breadcrumbLabel="Review đề thi"
      searchPlaceholder="Tìm bài review đề thi theo ngày, chủ đề..."
    />
  )
}
