import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap, Headphones, History, MousePointerClick } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { CONSULTATION_SECTION_ID, centerInfo } from '@/config/center-info'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTests } from '@/features/test-online/hooks/useTests'
import { TestCollectionTimeline } from '@/features/test-online/components/TestCollectionTimeline'
import type { TestSkillCategory } from '@/features/test-online/types/test.types'

export default function TestListPage() {
  usePageTitle('Test Online – Luyện thi TOEIC trực tuyến')
  const { data, loading, error, retry } = useTests()
  const [skillTab, setSkillTab] = useState<TestSkillCategory>('listening_reading')

  const tests = useMemo(() => data ?? [], [data])

  const filteredTests = useMemo(
    () => tests.filter((t) => t.skillCategory === skillTab),
    [tests, skillTab],
  )

  const scrollToConsultation = () => {
    document
      .getElementById(CONSULTATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="ec-reading-font min-h-screen bg-white pb-16">
      <PageBanner
        title="TEST ONLINE – LUYỆN THI TOEIC TRỰC TUYẾN"
        badge={`${centerInfo.name} Testing Platform`}
        subtitle="Hệ thống thi thử TOEIC trực tuyến bám sát cấu trúc đề thi thật – Chấm điểm & giải thích chi tiết ngay sau khi nộp."
        image="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400"
      />

      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#243B53] sm:text-sm">
            ENGLISH CENTER – HỆ THỐNG LUYỆN ĐỀ TOEIC TRỰC TUYẾN CHUẨN CẤU TRÚC ĐỀ THI THẬT
          </p>

          <Link
            to="/test-history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#75BDEB] bg-[#F5FAFE] px-3.5 py-1.5 text-xs font-bold text-[#2878B8] transition hover:bg-[#75BDEB] hover:text-white"
          >
            <History className="h-3.5 w-3.5" />
            <span>Lịch sử làm bài</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div
              role="tablist"
              aria-label="Chọn kỹ năng thi TOEIC"
              className="mb-6 grid grid-cols-2 overflow-hidden border border-[#DCEAF3]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={skillTab === 'listening_reading'}
                onClick={() => setSkillTab('listening_reading')}
                className={`py-3.5 text-center text-sm font-bold tracking-wide transition sm:py-4 sm:text-lg ${
                  skillTab === 'listening_reading'
                    ? 'bg-[#F26522] text-white'
                    : 'bg-[#75BDEB] text-white hover:bg-[#5aaee3]'
                }`}
              >
                Listening &amp; Reading
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={skillTab === 'speaking_writing'}
                onClick={() => setSkillTab('speaking_writing')}
                className={`border-l border-white/60 py-3.5 text-center text-sm font-bold tracking-wide transition sm:py-4 sm:text-lg ${
                  skillTab === 'speaking_writing'
                    ? 'bg-[#F26522] text-white'
                    : 'bg-[#75BDEB] text-white hover:bg-[#5aaee3]'
                }`}
              >
                Speaking &amp; Writing
              </button>
            </div>

            {loading && <LoadingBlock label="Đang tải danh sách đề thi trực tuyến..." />}

            {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

            {!loading && !error && filteredTests.length === 0 && (
              <EmptyBlock
                title={
                  skillTab === 'speaking_writing'
                    ? 'Bộ đề TOEIC Speaking & Writing đang được cập nhật'
                    : 'Chưa có đề thi phù hợp'
                }
                description={
                  skillTab === 'speaking_writing'
                    ? 'Hệ thống đề thi Speaking & Writing đang được đội ngũ chuyên môn cập nhật. Bạn hãy chọn tab Listening & Reading để làm bài thi ngay nhé!'
                    : 'Vui lòng thử lại sau.'
                }
              />
            )}

            {!loading && !error && filteredTests.length > 0 && (
              <TestCollectionTimeline
                tests={filteredTests}
                headingTitle={
                  skillTab === 'listening_reading'
                    ? 'TOEIC LISTENING & READING - FULL TEST'
                    : 'TOEIC SPEAKING & WRITING - FULL TEST'
                }
              />
            )}
          </div>

          <aside className="flex flex-col gap-5">
            <Link
              to="/courses"
              className="group block overflow-hidden rounded-xl border border-[#DCEAF3] bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-center gap-1.5 bg-white px-3 py-2 text-xs font-extrabold uppercase italic text-[#243B53]">
                <span>CLICK THAM GIA NGAY</span>
                <MousePointerClick className="h-4 w-4 text-[#F26522]" />
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#75BDEB] to-[#2878B8] p-5 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-white/95">
                  CỘNG ĐỒNG HỌC
                </span>
                <h3 className="mt-1 text-xl font-black uppercase leading-tight text-[#FFE4D6]">
                  TOEIC ONLINE
                </h3>
                <p className="mt-0.5 text-lg font-extrabold uppercase text-white">
                  CHỈ CẦN CỐ GẮNG - HỌC LÀ ĐỖ
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Cùng {centerInfo.name}</span>
                </div>
              </div>
            </Link>

            <Link
              to="/study-zone/grammar"
              className="group block overflow-hidden rounded-xl border border-[#DCEAF3] bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-center gap-1.5 bg-white px-3 py-2 text-xs font-extrabold uppercase italic text-[#243B53]">
                <span>CLICK HỌC THỬ NGAY</span>
                <MousePointerClick className="h-4 w-4 text-[#F26522]" />
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#75BDEB] to-[#2878B8] p-5 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-white/95">
                  KHO LUYỆN TẬP STUDY ZONE
                </span>
                <h3 className="mt-1 text-2xl font-black uppercase leading-tight text-[#FFE4D6]">
                  NGỮ PHÁP &amp; TỪ VỰNG
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white">
                  TĂNG ĐIỂM NHANH TỪNG PART
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Hoàn toàn miễn phí</span>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={scrollToConsultation}
              className="group block w-full overflow-hidden rounded-xl border border-[#DCEAF3] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-center gap-1.5 bg-white px-3 py-2 text-xs font-extrabold uppercase italic text-[#243B53]">
                <span>NHẬN TƯ VẤN LỘ TRÌNH</span>
                <MousePointerClick className="h-4 w-4 text-[#F26522]" />
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#75BDEB] to-[#2878B8] p-5 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-white/95">
                  LỘ TRÌNH CÁ NHÂN HÓA
                </span>
                <h3 className="mt-1 text-2xl font-black uppercase leading-tight text-[#FFE4D6]">
                  1 KÈM 1 &amp; LỚP NHÓM
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white">
                  DÀNH CHO NGƯỜI MẤT GỐC &amp; BẬN RỘN
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F26522] px-3 py-1 text-[11px] font-bold text-white">
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Đăng ký tư vấn ngay</span>
                </div>
              </div>
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
