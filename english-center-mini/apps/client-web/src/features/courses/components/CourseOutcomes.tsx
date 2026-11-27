import CourseSectionTitle from '@/features/courses/components/CourseSectionTitle'
import CourseVideo from '@/features/courses/components/CourseVideo'
import type { CourseOutcomesSection } from '@/features/courses/types'

interface CourseOutcomesProps {
  courseName: string
  expectedOutcomes?: CourseOutcomesSection
}

export default function CourseOutcomes({ courseName, expectedOutcomes }: CourseOutcomesProps) {
  if (!expectedOutcomes || expectedOutcomes.items.length === 0) return null

  const hasMedia = Boolean(expectedOutcomes.media?.thumbnailUrl || expectedOutcomes.media?.videoUrl)

  return (
    <section className="border-t border-white/25 bg-[#75BDEB] py-14 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề căn giữa bám sát hình tham khảo số 3 */}
        <div className="mb-12 text-center">
          <CourseSectionTitle variant="on-blue">
            {expectedOutcomes.heading || 'ĐẦU RA KỲ VỌNG CỦA KHÓA'}
          </CourseSectionTitle>
        </div>

        <div
          className={`grid grid-cols-1 items-center gap-10 lg:gap-14 ${
            hasMedia ? 'lg:grid-cols-12' : ''
          }`}
        >
          {/* Cột trái: Danh sách các mục tiêu sau khi hoàn thành khóa học */}
          <div className={hasMedia ? 'lg:col-span-6' : 'mx-auto max-w-3xl'}>
            <ul className="space-y-4 text-base leading-relaxed text-white sm:text-lg">
              {expectedOutcomes.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-white" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột phải: Video giới thiệu có nút Play hoặc hình ảnh minh họa */}
          {hasMedia && expectedOutcomes.media && (
            <div className="lg:col-span-6">
              <CourseVideo courseName={courseName} media={expectedOutcomes.media} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
