import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { CONSULTATION_SECTION_ID, SCHEDULE_PATH } from '@/config/center-info'
import { useCourseDetail } from '@/features/courses/hooks/useCourseDetail'
import { usePageTitle } from '@/hooks/usePageTitle'
import CourseHero from '@/features/courses/components/CourseHero'
import CourseIntroduction from '@/features/courses/components/CourseIntroduction'
import CourseBenefits from '@/features/courses/components/CourseBenefits'
import CourseOutcomes from '@/features/courses/components/CourseOutcomes'
import CourseExtraSections from '@/features/courses/components/CourseExtraSections'

export default function CourseDetailPage() {
  const { slug = '' } = useParams()
  const { data: course, loading, error, retry } = useCourseDetail(slug)
  usePageTitle(course?.name)

  const scrollToConsultation = () => {
    document
      .getElementById(CONSULTATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="ec-font bg-[#F5FAFE] pb-16">
        <PageBanner title="CHI TIẾT KHÓA HỌC" />
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <LoadingBlock label="Đang tải thông tin khóa học..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ec-font bg-[#F5FAFE] pb-16">
        <PageBanner title="CHI TIẾT KHÓA HỌC" />
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <ErrorBlock message={error} onRetry={retry} />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="ec-font bg-[#F5FAFE] pb-16">
        <PageBanner title="KHÔNG TÌM THẤY KHÓA HỌC" />
        <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 lg:px-8">
          <EmptyBlock
            title="Không tìm thấy khóa học"
            description="Đường dẫn không hợp lệ hoặc khóa học hiện không mở đăng ký."
            action={
              <Link
                to="/courses"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1F6399]"
              >
                <ArrowLeft className="h-4 w-4" /> Xem tất cả khóa học
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const hasAnyDetailSection = Boolean(
    (course.introduction &&
      (course.introduction.paragraphs.length > 0 ||
        (course.introduction.bullets?.length ?? 0) > 0)) ||
      (course.benefits && course.benefits.items.length > 0) ||
      (course.expectedOutcomes && course.expectedOutcomes.items.length > 0) ||
      (course.teachingMethod && course.teachingMethod.paragraphs.length > 0) ||
      (course.curriculum && course.curriculum.length > 0) ||
      (course.gallery && course.gallery.length > 0) ||
      (course.testimonials && course.testimonials.length > 0) ||
      (course.faqs && course.faqs.length > 0),
  )

  return (
    <main className="ec-font bg-white">
      <CourseHero course={course} onConsultClick={scrollToConsultation} />

      <CourseIntroduction
        courseName={course.name}
        fallbackImage={course.thumbnail || course.image}
        introduction={course.introduction}
      />

      <CourseBenefits courseName={course.name} benefits={course.benefits} />

      <CourseOutcomes courseName={course.name} expectedOutcomes={course.expectedOutcomes} />

      <CourseExtraSections course={course} />

      {!hasAnyDetailSection && (
        <section className="bg-[#F5FAFE] py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="rounded-2xl border border-[#DCEAF3] bg-white p-8 shadow-sm sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF6FD] text-[#2878B8]">
                <BookOpen className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-[#243B53]">
                Nội dung chi tiết khóa học đang được cập nhật
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B] sm:text-base">
                Bạn có thể xem lịch khai giảng hoặc đăng ký nhận tư vấn khóa{' '}
                <strong className="text-[#243B53]">{course.name}</strong> bên dưới.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={scrollToConsultation}
                  className="rounded-lg bg-[#F26522] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#d95314]"
                >
                  Đăng ký nhận tư vấn
                </button>
                <Link
                  to={SCHEDULE_PATH}
                  className="rounded-lg border border-[#2878B8] bg-white px-6 py-2.5 text-sm font-bold text-[#2878B8] transition hover:bg-[#EAF6FD]"
                >
                  Tra cứu lịch khai giảng
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
