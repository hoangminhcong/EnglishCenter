import ImageBox from '@/components/ui/ImageBox'
import CourseSectionTitle from '@/features/courses/components/CourseSectionTitle'
import type { CourseIntroductionSection } from '@/features/courses/types'

interface CourseIntroductionProps {
  courseName: string
  fallbackImage?: string
  introduction?: CourseIntroductionSection
}

export default function CourseIntroduction({
  courseName,
  fallbackImage,
  introduction,
}: CourseIntroductionProps) {
  if (!introduction) return null

  const hasParagraphs = introduction.paragraphs.length > 0
  const hasBullets = (introduction.bullets?.length ?? 0) > 0

  if (!hasParagraphs && !hasBullets) return null

  const images =
    introduction.images && introduction.images.length > 0
      ? introduction.images
      : fallbackImage
        ? [{ src: fallbackImage, alt: courseName }]
        : []

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <CourseSectionTitle variant="on-white">
            {introduction.heading || 'GIỚI THIỆU KHÓA HỌC'}
          </CourseSectionTitle>
        </div>

        <div
          className={`grid grid-cols-1 items-center gap-10 lg:gap-14 ${
            images.length > 0 ? 'lg:grid-cols-12' : ''
          }`}
        >
          {/* Cột trái: Đoạn văn giới thiệu & các gạch đầu dòng giải thích phương pháp */}
          <div className={images.length > 0 ? 'lg:col-span-6' : 'mx-auto max-w-4xl'}>
            {hasParagraphs && (
              <div className="space-y-4">
                {introduction.paragraphs.map((p, index) => (
                  <p
                    key={p}
                    className={
                      index === 0
                        ? 'text-base font-bold leading-relaxed text-[#243B53] sm:text-lg'
                        : 'text-[15px] leading-relaxed text-[#243B53] sm:text-base'
                    }
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}

            {hasBullets && (
              <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-[#243B53] sm:text-base">
                {introduction.bullets?.map((bullet) => (
                  <li key={bullet.id} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2878B8]" />
                    <span>
                      {bullet.lead && <strong className="font-bold text-[#243B53]">{bullet.lead} </strong>}
                      {bullet.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cột phải: Hỗ trợ 1 hoặc nhiều ảnh do Admin cấu hình */}
          {images.length > 0 && (
            <div className="lg:col-span-6">
              {images.length === 1 ? (
                <figure className="overflow-hidden rounded-2xl border-4 border-[#DCEAF3] bg-white shadow-xl">
                  <ImageBox
                    src={images[0].src}
                    alt={images[0].alt}
                    label={courseName}
                    className="aspect-[16/11] w-full"
                  />
                  {images[0].caption && (
                    <figcaption className="bg-[#F8FAFC] px-4 py-2.5 text-center text-xs font-semibold text-[#555555]">
                      {images[0].caption}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {images.map((img, idx) => (
                    <figure
                      key={img.src}
                      className={`overflow-hidden rounded-xl border-2 border-[#DCEAF3] bg-white shadow-md ${
                        idx === 0 && images.length % 2 === 1 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <ImageBox
                        src={img.src}
                        alt={img.alt}
                        label={courseName}
                        className="aspect-[16/10] w-full"
                      />
                      {img.caption && (
                        <figcaption className="px-3 py-2 text-center text-xs text-[#718096]">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
