import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Mail, MapPin, Wallet } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import ImageBox from '@/components/ui/ImageBox'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { formatJobDeadlineLabel } from '@/features/about/api/careerApi'
import { useCareerDetail } from '@/features/about/hooks/useAboutData'
import { centerInfo } from '@/config/center-info'

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-extrabold uppercase text-[#2878B8]">{title}</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#243B53]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default function CareerDetailPage() {
  const { id = '' } = useParams()
  const { data: job, loading, error, retry } = useCareerDetail(id)

  const isJobClosed = job?.status === 'closed'
  const contactEmail = centerInfo.email.trim()
  const applyMailtoHref =
    job && !isJobClosed && contactEmail
      ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Ứng tuyển: ${job.title}`)}`
      : null

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <PageBanner title="TUYỂN DỤNG" />

      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          to="/about/careers"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách tuyển dụng
        </Link>

        {loading && <LoadingBlock label="Đang tải tin tuyển dụng..." />}
        {!loading && error && <ErrorBlock message={error} onRetry={retry} />}
        {!loading && !error && !job && (
          <EmptyBlock
            title="Không tìm thấy tin tuyển dụng"
            action={
              <Link
                to="/about/careers"
                className="mt-2 rounded-md bg-[#2878B8] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#1F6399]"
              >
                Về trang Tuyển dụng
              </Link>
            }
          />
        )}

        {job && (
          <article className="rounded-xl border border-[#DCEAF3] bg-white p-5 shadow-sm sm:p-8">
            <ImageBox
              src={job.image}
              alt={job.title}
              label="We are hiring"
              className="mb-6 aspect-[16/7] w-full rounded-lg"
            />

            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-[#EAF6FD] px-2.5 py-1 text-[#2878B8]">
                {job.type}
              </span>
              <span className="rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[#F26522]">
                {job.position}
              </span>
              {isJobClosed && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
                  Đã đóng nhận hồ sơ
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-snug text-[#243B53] sm:text-3xl">
              {job.title}
            </h1>

            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-[#F5FAFE] p-4 text-sm text-[#243B53] sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 shrink-0 text-[#2878B8]" /> {job.salary}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#2878B8]" /> {job.location}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#2878B8]" /> Hạn nộp:{' '}
                {formatJobDeadlineLabel(job.deadline)}
              </span>
            </div>

            {job.excerpt && (
              <p className="mt-5 text-[15px] leading-relaxed text-[#243B53]">{job.excerpt}</p>
            )}
            <Section title="Mô tả công việc" items={job.description} />
            <Section title="Yêu cầu" items={job.requirements} />
            <Section title="Quyền lợi" items={job.benefits} />

            <div className="mt-8 flex justify-center">
              {isJobClosed ? (
                <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-8 py-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Đã ngừng nhận hồ sơ ứng tuyển
                </span>
              ) : applyMailtoHref ? (
                <a
                  href={applyMailtoHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F26522] px-8 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d95314]"
                >
                  <Mail className="h-4 w-4" /> Ứng tuyển ngay
                </a>
              ) : (
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F26522] px-8 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d95314]"
                >
                  <Mail className="h-4 w-4" /> Liên hệ ứng tuyển
                </Link>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
