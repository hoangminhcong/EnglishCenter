import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MessageSquarePlus, Target } from 'lucide-react'
import { SCHEDULE_PATH } from '@/config/center-info'
import type { Course } from '@/features/courses/types'

interface CourseHeroProps {
  course: Course
  onConsultClick: () => void
}

export default function CourseHero({ course, onConsultClick }: CourseHeroProps) {
  const heroBg = course.bannerImage || course.thumbnail || course.image
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showBgImage = Boolean(heroBg) && failedSrc !== heroBg

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#2878B8] to-[#75BDEB] py-14 text-white sm:py-20">
      {showBgImage && (
        <img
          src={heroBg}
          alt=""
          loading="eager"
          onError={() => setFailedSrc(heroBg)}
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
        />
      )}

      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 rounded-full bg-cyan-400/15 blur-2xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/courses"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/90 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách khóa học
        </Link>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5">
            {course.targetScore && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white backdrop-blur-sm">
                <Target className="h-3.5 w-3.5" />
                Mục tiêu: {course.targetScore}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                course.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-300/40'
                  : 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-300/40'
              }`}
            >
              {course.status === 'active' ? 'Đang mở đăng ký' : 'Tạm ngừng nhận lớp'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
            {course.name}
          </h1>

          {course.shortDescription && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
              {course.shortDescription}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onConsultClick}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F26522] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#d95314]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Đăng ký tư vấn khóa học
            </button>

            <Link
              to={SCHEDULE_PATH}
              className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <CalendarDays className="h-4 w-4" />
              Xem lịch khai giảng
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
