import ImageBox from '@/components/ui/ImageBox'
import CourseSectionTitle from '@/features/courses/components/CourseSectionTitle'
import type { CourseBenefitsSection } from '@/features/courses/types'

interface CourseBenefitsProps {
  courseName: string
  benefits?: CourseBenefitsSection
}

export default function CourseBenefits({ courseName, benefits }: CourseBenefitsProps) {
  if (!benefits || benefits.items.length === 0) return null

  const hasImage = Boolean(benefits.image)

  return (
    <section className="bg-[#75BDEB] py-14 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 items-center gap-10 lg:gap-14 ${
            hasImage ? 'lg:grid-cols-12' : ''
          }`}
        >
          {/* Cột trái: Hình ảnh lớp học thực tế giống ảnh tham khảo */}
          {hasImage && (
            <div className="order-2 lg:order-1 lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border-[5px] border-white bg-white shadow-2xl">
                <ImageBox
                  src={benefits.image ?? ''}
                  alt={benefits.imageAlt || `Lớp học ${courseName}`}
                  label={courseName}
                  className="aspect-[4/3] w-full"
                />
              </div>
            </div>
          )}

          {/* Cột phải: Tiêu đề đóng khung trắng + danh sách lợi ích */}
          <div className={hasImage ? 'order-1 lg:order-2 lg:col-span-7' : 'mx-auto max-w-4xl'}>
            <div className="mb-8 text-center lg:text-left">
              <CourseSectionTitle variant="on-blue">
                {benefits.heading || 'LỢI ÍCH CỦA HỌC VIÊN'}
              </CourseSectionTitle>
            </div>

            <ul className="space-y-5 text-base leading-relaxed text-white/95 sm:text-[17px]">
              {benefits.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3.5">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-white" />
                  <div>
                    <strong className="font-extrabold text-white">{item.title}:</strong>{' '}
                    <span>{item.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
