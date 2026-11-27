import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock, GraduationCap, Target } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import type { Course } from '@/features/courses/types'

interface CourseCardProps {
  course: Course
  onConsultClick: (course: Course) => void
}

export default function CourseCard({ course, onConsultClick }: CourseCardProps) {
  const detailPath = `/courses/${course.slug}`
  const isOpen = course.status === 'active'
  const summaryText = course.shortDescription?.trim() || course.description?.trim() || ''

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCEAF3] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Ảnh đại diện khóa học */}
      <Link to={detailPath} className="relative block overflow-hidden">
        <ImageBox
          src={course.thumbnail || course.image}
          alt={course.name}
          label={course.code}
          className="aspect-[16/9] w-full transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Trạng thái mở đăng ký / tạm ngừng */}
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
            isOpen
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {isOpen ? 'Đang mở đăng ký' : 'Tạm ngừng nhận lớp'}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        {/* Mã khóa học & Mức điểm mục tiêu */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-lg bg-[#EAF6FD] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#2878B8]">
            {course.code}
          </span>

          {course.targetScore && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-bold text-[#F26522]">
              <Target className="h-3.5 w-3.5" />
              Mục tiêu: {course.targetScore}
            </span>
          )}
        </div>

        {/* Tên khóa học */}
        <h2 className="mt-3.5 text-xl font-extrabold leading-snug text-[#243B53] transition-colors group-hover:text-[#2878B8]">
          <Link to={detailPath}>{course.name}</Link>
        </h2>

        {/* Mô tả ngắn (Chỉ hiển thị khi Admin đã nhập dữ liệu) */}
        {summaryText && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#718096]">
            {summaryText}
          </p>
        )}

        {/* Thời lượng & Trình độ (Chỉ hiển thị khi có dữ liệu) */}
        {(course.duration || course.level) && (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-[#DCEAF3] pt-3 text-xs font-semibold text-[#243B53]">
            {course.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#2878B8]" />
                Thời lượng: {course.duration}
              </span>
            )}
            {course.level && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-[#2878B8]" />
                Trình độ: {course.level}
              </span>
            )}
          </div>
        )}

        {/* Đầu ra hoặc mục tiêu nổi bật (Chỉ hiển thị khi Admin đã nhập) */}
        {course.highlights.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-[#DCEAF3] pt-3.5 text-sm text-[#243B53]">
            {course.highlights.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2878B8]" />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Cụm nút hành động */}
        <div className="mt-auto flex flex-col gap-2.5 pt-6 sm:flex-row">
          <Link
            to={detailPath}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2878B8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f5f94]"
          >
            Xem chi tiết <ChevronRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            disabled={!isOpen}
            onClick={() => onConsultClick(course)}
            className="inline-flex flex-1 items-center justify-center rounded-lg border-2 border-[#2878B8] bg-white px-4 py-2.5 text-sm font-bold text-[#2878B8] transition hover:bg-[#EAF6FD] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
          >
            Đăng ký tư vấn
          </button>
        </div>
      </div>
    </article>
  )
}
