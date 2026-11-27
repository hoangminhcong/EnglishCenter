import { useState } from 'react'
import { CheckCircle2, ChevronDown, Quote } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import CourseSectionTitle from '@/features/courses/components/CourseSectionTitle'
import type { Course } from '@/features/courses/types'

/**
 * Hiển thị linh hoạt các section mở rộng khi Admin bổ sung dữ liệu trong tương lai:
 * - Phương pháp giảng dạy (teachingMethod)
 * - Nội dung chương trình học (curriculum)
 * - Hình ảnh hoạt động lớp học & kết quả học viên (gallery)
 * - Đánh giá của học viên (testimonials)
 * - Câu hỏi thường gặp (faqs)
 * Section nào không có dữ liệu sẽ tự động ẩn hoàn toàn.
 */
export default function CourseExtraSections({ course }: { course: Course }) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const hasTeachingMethod = (course.teachingMethod?.paragraphs.length ?? 0) > 0
  const hasCurriculum = (course.curriculum?.length ?? 0) > 0
  const hasGallery = (course.gallery?.length ?? 0) > 0
  const hasTestimonials = (course.testimonials?.length ?? 0) > 0
  const hasFaqs = (course.faqs?.length ?? 0) > 0

  if (!hasTeachingMethod && !hasCurriculum && !hasGallery && !hasTestimonials && !hasFaqs) {
    return null
  }

  return (
    <div className="divide-y divide-[#DCEAF3]">
      {/* 1. Phương pháp giảng dạy */}
      {hasTeachingMethod && course.teachingMethod && (
        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <CourseSectionTitle variant="on-white">
                {course.teachingMethod.heading || 'PHƯƠNG PHÁP GIẢNG DẠY'}
              </CourseSectionTitle>
            </div>

            <div className="space-y-4 text-base leading-relaxed text-[#374151]">
              {course.teachingMethod.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            {course.teachingMethod.highlights && course.teachingMethod.highlights.length > 0 && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {course.teachingMethod.highlights.map((hl) => (
                  <div
                    key={hl}
                    className="flex items-start gap-3 rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2878B8]" />
                    <span className="text-sm font-semibold text-[#243B53]">{hl}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Nội dung chương trình học (Lộ trình chi tiết) */}
      {hasCurriculum && course.curriculum && (
        <section className="bg-[#F5FAFE] py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <CourseSectionTitle variant="on-white">NỘI DUNG CHƯƠNG TRÌNH HỌC</CourseSectionTitle>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {course.curriculum.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#EAF6FD] px-2.5 py-1 text-xs font-extrabold uppercase text-[#2878B8]">
                      Chặng {idx + 1}
                    </span>
                    {mod.sessions && (
                      <span className="text-xs font-semibold text-[#718096]">{mod.sessions}</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold text-[#243B53]">{mod.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#555555]">
                    {mod.topics.map((topic) => (
                      <li key={topic} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2878B8]" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Hình ảnh hoạt động lớp học & thành tích học viên */}
      {hasGallery && course.gallery && (
        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <CourseSectionTitle variant="on-white">HÌNH ẢNH LỚP HỌC & HỌC VIÊN</CourseSectionTitle>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {course.gallery.map((item) => (
                <figure
                  key={item.src}
                  className="overflow-hidden rounded-2xl border border-[#DCEAF3] bg-white shadow-sm"
                >
                  <ImageBox
                    src={item.src}
                    alt={item.caption || course.name}
                    label={course.code}
                    className="aspect-[4/3] w-full"
                  />
                  {item.caption && (
                    <figcaption className="p-3 text-center text-xs font-semibold text-[#555555]">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Đánh giá của học viên */}
      {hasTestimonials && course.testimonials && (
        <section className="bg-[#F5FAFE] py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <CourseSectionTitle variant="on-white">CẢM NHẬN HỌC VIÊN</CourseSectionTitle>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {course.testimonials.map((t) => (
                <article
                  key={t.id}
                  className="flex flex-col rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-sm"
                >
                  <Quote className="h-7 w-7 text-[#75BDEB]" />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#374151]">“{t.comment}”</p>
                  <div className="mt-5 flex items-center justify-between border-t border-[#DCEAF3] pt-4">
                    <div>
                      <p className="text-sm font-extrabold text-[#243B53]">{t.studentName}</p>
                      {t.schoolOrWork && (
                        <p className="text-xs text-[#718096]">{t.schoolOrWork}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-extrabold text-[#F26522]">
                      {t.score}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Câu hỏi thường gặp (FAQ) */}
      {hasFaqs && course.faqs && (
        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <CourseSectionTitle variant="on-white">CÂU HỎI THƯỜNG GẶP</CourseSectionTitle>
            </div>

            <div className="space-y-3">
              {course.faqs.map((faq) => {
                const isOpen = openFaqId === faq.id
                return (
                  <div
                    key={faq.id}
                    className="overflow-hidden rounded-xl border border-[#DCEAF3] bg-[#F8FAFC]"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-[#243B53] transition hover:bg-[#EAF6FD]/60 sm:text-base"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#2878B8] transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#DCEAF3] bg-white px-5 py-4 text-sm leading-relaxed text-[#555555]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
