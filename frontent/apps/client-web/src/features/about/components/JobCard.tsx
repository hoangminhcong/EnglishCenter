import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, Wallet } from 'lucide-react'
import ImageBox from '@/components/ui/ImageBox'
import { formatJobDeadlineLabel } from '@/features/about/api/careerApi'
import type { JobPost } from '@/features/about/types'

export default function JobCard({ job }: { job: JobPost }) {
  const to = `/about/careers/${job.id}`
  const isClosed = job.status === 'closed'

  return (
    <article className="group flex flex-col gap-5 rounded-xl border border-[#DCEAF3] bg-white p-4 shadow-sm transition hover:shadow-md md:flex-row">
      <Link to={to} className="w-full shrink-0 md:w-72">
        <ImageBox
          src={job.image}
          alt={job.title}
          label="We are hiring"
          className="aspect-[16/10] w-full rounded-lg"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-[#EAF6FD] px-2.5 py-1 text-[#2878B8]">{job.type}</span>
          <span className="rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[#F26522]">
            {job.position}
          </span>
          {isClosed && (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
              Đã đóng nhận hồ sơ
            </span>
          )}
        </div>

        <h2 className="mt-2 text-lg font-bold leading-snug text-[#243B53] transition group-hover:text-[#2878B8]">
          <Link to={to}>{job.title}</Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm text-[#718096]">{job.excerpt}</p>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#243B53]">
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-[#2878B8]" /> {job.salary}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[#2878B8]" /> {job.location}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-xs text-[#718096]">
            Hạn nộp: {formatJobDeadlineLabel(job.deadline)}
          </span>
          <Link
            to={to}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2878B8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1f5f94]"
          >
            Xem chi tiết <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
