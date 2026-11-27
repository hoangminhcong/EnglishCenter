import { Link } from 'react-router-dom'
import { Award, BookOpen, ChevronRight, Compass, Users } from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { centerInfo, CONSULTATION_SECTION_ID, DOCUMENTS_PATH } from '@/config/center-info'
import { useCourses } from '@/features/courses/hooks/useCourses'

const features = [
  {
    icon: Users,
    title: 'Giảng viên tận tâm & giàu kinh nghiệm',
    description:
      'Đội ngũ giảng viên chuyên môn cao, đồng hành sửa lỗi chi tiết và truyền cảm hứng học tập mỗi giờ lên lớp.',
  },
  {
    icon: Compass,
    title: 'Lộ trình cá nhân hóa rõ ràng',
    description:
      'Kiểm tra đầu vào miễn phí, xếp lớp đúng trình độ và tối ưu thời gian ôn luyện theo mục tiêu điểm số.',
  },
  {
    icon: Award,
    title: 'Cam kết chất lượng đầu ra',
    description:
      'Giáo trình tinh gọn bám sát đề thi thật cùng hệ thống bài tập, thi thử định kỳ đánh giá năng lực.',
  },
]

export default function HomePage() {
  const { data, loading, error, retry } = useCourses({ featured: true })
  const featuredCourses = (data ?? []).slice(0, 3)

  const scrollToForm = () => {
    document
      .getElementById(CONSULTATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="ec-font">
      <section className="bg-gradient-to-br from-[#EAF6FD] via-white to-[#F5FAFE] py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6">
            <span className="inline-block rounded-full bg-[#EAF6FD] px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#2878B8]">
              {centerInfo.name} – {centerInfo.slogan}
            </span>

            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-[#243B53] sm:text-4xl lg:text-5xl">
              Chinh phục tiếng Anh, <span className="text-[#2878B8]">mở rộng tương lai</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#64748B]">
              {centerInfo.intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2878B8] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1F6399]"
              >
                Khám phá khóa học <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F26522] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d95314]"
              >
                Tư vấn lộ trình miễn phí
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900"
                alt="Học viên luyện thi tiếng Anh tại trung tâm"
                className="aspect-[16/11] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#2878B8]">
            VỀ CHÚNG TÔI
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-[#243B53] sm:text-3xl">
            Chào mừng đến với {centerInfo.name}
          </h2>
          <p className="mt-2 text-sm text-[#64748B] sm:text-base">
            Môi trường học tiếng Anh hiện đại, thân thiện và thực chiến cho sinh viên và người đi làm.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[#DCEAF3] bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF6FD] text-[#2878B8]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-[#243B53]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#2878B8]">
                LỘ TRÌNH ĐÀO TẠO
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-[#243B53] sm:text-3xl">
                Các khóa học nổi bật
              </h2>
            </div>
            <div className="flex gap-4">
              <Link
                to={DOCUMENTS_PATH}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2878B8] hover:underline"
              >
                <BookOpen className="h-4 w-4" /> Kho tài liệu miễn phí
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center gap-1 text-sm font-bold text-[#F26522] hover:underline"
              >
                Xem tất cả khóa học <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8">
            {loading && <LoadingBlock label="Đang tải các khóa học nổi bật..." />}
            {!loading && error && <ErrorBlock message={error} onRetry={retry} />}
            {!loading && !error && featuredCourses.length === 0 && (
              <EmptyBlock title="Chưa có khóa học." />
            )}

            {!loading && !error && featuredCourses.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {featuredCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    className="group flex flex-col rounded-2xl border border-[#DCEAF3] bg-[#F5FAFE] p-6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-fit rounded-lg bg-[#2878B8] px-3 py-1 text-xs font-extrabold text-white">
                        {course.code}
                      </span>
                      {course.targetScore && (
                        <span className="rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-bold text-[#F26522]">
                          {course.targetScore}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold text-[#243B53] transition-colors group-hover:text-[#2878B8]">
                      {course.name}
                    </h3>
                    {(course.shortDescription || course.description) && (
                      <p className="mt-2 line-clamp-3 text-sm text-[#64748B]">
                        {course.shortDescription || course.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-1 pt-5 text-xs font-bold text-[#2878B8]">
                      Xem chi tiết khóa học <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
