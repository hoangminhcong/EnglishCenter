import ArticleCategoryPageView from '@/features/articles/components/ArticleCategoryPageView'

export default function StudentsPage() {
  return (
    <ArticleCategoryPageView
      category="student"
      bannerTitle="HỌC VIÊN"
      bannerBadge="Góc học viên English Center"
      bannerSubtitle="Cập nhật chuẩn đầu ra ngoại ngữ các trường đại học, câu chuyện thành công và kinh nghiệm chinh phục TOEIC từ học viên."
      breadcrumbLabel="Học viên"
      searchPlaceholder="Tìm bài viết học viên, chuẩn đầu ra..."
    />
  )
}
