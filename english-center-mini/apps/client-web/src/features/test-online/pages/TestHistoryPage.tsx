import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Calendar,
  Clock,
  Flag,
} from 'lucide-react'
import { formatDateTimeVi } from '@english-center/utils'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useTestHistory } from '@/features/test-online/hooks/useTestHistory'
import { useTests } from '@/features/test-online/hooks/useTests'
import { formatHms } from '@/features/test-online/hooks/useTestTimer'
import type { AttemptStatus } from '@/features/test-online/types/test.types'

function formatOptionalDateTimeVi(iso: string | undefined): string {
  return iso ? formatDateTimeVi(iso) : '—'
}

export default function TestHistoryPage() {
  const { data: testsList } = useTests()
  const { data: allHistoryData } = useTestHistory()

  const [selectedTestSlug, setSelectedTestSlug] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AttemptStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [appliedFilters, setAppliedFilters] = useState<{
    testSlug: string
    status: 'all' | AttemptStatus
    fromDate: string
    toDate: string
  }>({
    testSlug: '',
    status: 'all',
    fromDate: '',
    toDate: '',
  })

  const { data, loading, error, retry } = useTestHistory({
    testSlug: appliedFilters.testSlug || undefined,
    status: appliedFilters.status,
    fromDate: appliedFilters.fromDate || undefined,
    toDate: appliedFilters.toDate || undefined,
    sortOrder: 'newest',
  })

  const records = useMemo(() => data ?? [], [data])
  const allRecords = useMemo(() => allHistoryData ?? [], [allHistoryData])

  const hasActiveFilters = Boolean(
    appliedFilters.testSlug ||
      appliedFilters.status !== 'all' ||
      appliedFilters.fromDate ||
      appliedFilters.toDate,
  )

  const testFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of testsList ?? []) {
      if (t.slug) {
        map.set(t.slug, t.title)
      }
    }
    for (const item of allRecords) {
      if (item.attempt.testSlug && !map.has(item.attempt.testSlug)) {
        map.set(item.attempt.testSlug, item.attempt.testTitle)
      }
    }
    for (const item of records) {
      if (item.attempt.testSlug && !map.has(item.attempt.testSlug)) {
        map.set(item.attempt.testSlug, item.attempt.testTitle)
      }
    }
    return Array.from(map.entries()).map(([slug, title]) => ({ slug, title }))
  }, [testsList, allRecords, records])

  const groupedByTest = useMemo(() => {
    const map = new Map<
      string,
      {
        testSlug: string
        testTitle: string
        totalAttempts: number
        latestRecord: (typeof records)[number]
      }
    >()

    for (const item of records) {
      const slug = item.attempt.testSlug
      const existing = map.get(slug)
      if (!existing) {
        map.set(slug, {
          testSlug: slug,
          testTitle: item.attempt.testTitle,
          totalAttempts: 1,
          latestRecord: item,
        })
      } else {
        existing.totalAttempts += 1
      }
    }

    return Array.from(map.values())
  }, [records])

  const handleApplyFilter = () => {
    setAppliedFilters({
      testSlug: selectedTestSlug,
      status: statusFilter,
      fromDate,
      toDate,
    })
  }

  const handleResetFilters = () => {
    setSelectedTestSlug('')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
    setAppliedFilters({
      testSlug: '',
      status: 'all',
      fromDate: '',
      toDate: '',
    })
  }

  const handleDrillDownTest = (testSlug: string) => {
    setSelectedTestSlug(testSlug)
    setAppliedFilters((prev) => ({
      ...prev,
      testSlug,
    }))
  }

  const handleBackToGroupedView = () => {
    setSelectedTestSlug('')
    setAppliedFilters((prev) => ({
      ...prev,
      testSlug: '',
    }))
  }

  const isSingleTestView = Boolean(appliedFilters.testSlug)
  const isCompletelyEmpty = !hasActiveFilters && allRecords.length === 0

  return (
    <div className="ec-reading-font min-h-screen bg-white pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-8 lg:px-6">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-[#111827] sm:text-3xl">
            Lịch sử làm bài
          </h1>
          <p className="mt-1 text-sm text-[#4A5568]">
            Xem lại các lần thi Listening &amp; Reading của bạn.
          </p>
        </div>

        <section className="mt-5 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-5">
          <div className="grid grid-cols-1 items-end gap-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_180px_160px_160px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#243B53]">
                Bài thi
              </label>
              <select
                value={selectedTestSlug}
                onChange={(e) => setSelectedTestSlug(e.target.value)}
                className="w-full rounded-md border border-[#DCEAF3] bg-white px-3 py-2.5 text-xs font-medium text-[#243B53] outline-none focus:border-[#75BDEB]"
              >
                <option value="">Tất cả bài thi</option>
                {testFilterOptions.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#243B53]">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | AttemptStatus)}
                className="w-full rounded-md border border-[#DCEAF3] bg-white px-3 py-2.5 text-xs font-medium text-[#243B53] outline-none focus:border-[#75BDEB]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="submitted">Hoàn thành</option>
                <option value="in_progress">Đang làm</option>
                <option value="expired">Hết giờ</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#243B53]">
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-[#DCEAF3] bg-white px-3 py-2 text-xs font-medium tabular-nums text-[#243B53] outline-none focus:border-[#75BDEB]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#243B53]">
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-[#DCEAF3] bg-white px-3 py-2 text-xs font-medium tabular-nums text-[#243B53] outline-none focus:border-[#75BDEB]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyFilter}
                className="rounded-md bg-[#75BDEB] px-5 py-2.5 text-xs font-extrabold uppercase text-white shadow-2xs transition hover:bg-[#5aaee3]"
              >
                LỌC
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#243B53] hover:text-[#2878B8] hover:underline"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6">
          {loading && <LoadingBlock label="Đang tải lịch sử làm bài..." />}

          {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

          {!loading && !error && records.length === 0 && (
            isCompletelyEmpty ? (
              <EmptyBlock title="Chưa có lịch sử làm bài." />
            ) : (
              <EmptyBlock
                title="Không tìm thấy lượt thi phù hợp."
                description="Hãy thử đặt lại bộ lọc."
              />
            )
          )}

          {!loading && !error && records.length > 0 && !isSingleTestView && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {groupedByTest.map(({ testSlug, testTitle, totalAttempts, latestRecord }) => {
                const { attempt, result } = latestRecord
                const isInProgress = attempt.status === 'in_progress'
                const detailLink = isInProgress
                  ? `/test-online/attempt/${attempt.id}`
                  : `/test-history/${attempt.id}`

                return (
                  <article
                    key={testSlug}
                    className="flex flex-col justify-between rounded-2xl border border-[#EAEEF4] bg-white p-5 shadow-2xs transition hover:border-[#75BDEB] hover:shadow-md"
                  >
                    <div>
                      <h2 className="text-[16px] font-semibold tracking-tight text-[#111827]">
                        {testTitle}
                      </h2>
                      <p className="mt-0.5 text-xs tabular-nums text-[#64748B]">
                        {totalAttempts} lượt làm
                      </p>

                      <Link
                        to={detailLink}
                        className="mt-4 block rounded-xl bg-[#F8FAFC] p-4 transition hover:bg-[#EAF6FD]/70"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isInProgress
                                ? 'bg-amber-100 text-amber-800'
                                : attempt.status === 'submitted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isInProgress
                              ? 'Đang làm'
                              : attempt.status === 'submitted'
                                ? 'Hoàn thành'
                                : 'Hết giờ'}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-[#64748B]" />
                        </div>

                        <div className="mt-3.5 flex items-baseline justify-between gap-2">
                          {result ? (
                            result.isFullTestScoreEligible &&
                            result.convertedTotalScore !== null ? (
                              <span className="text-[26px] font-bold leading-none tabular-nums tracking-tight text-[#111827]">
                                {result.convertedTotalScore}
                                <span className="ml-0.5 text-xs font-normal text-[#64748B]">
                                  /990
                                </span>
                              </span>
                            ) : (
                              <span className="text-[22px] font-bold leading-none tabular-nums tracking-tight text-[#111827]">
                                {result.correctCount}
                                <span className="ml-0.5 text-xs font-normal text-[#64748B]">
                                  /{result.totalQuestions}
                                </span>
                              </span>
                            )
                          ) : (
                            <span className="text-[26px] font-bold leading-none text-[#111827]">
                              —
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-[#334155]">
                            <Clock className="h-3.5 w-3.5 text-[#64748B]" />
                            {result ? formatHms(result.actualDurationSeconds) : '00:00:00'}
                          </span>
                        </div>

                        <p className="mt-2.5 text-xs tabular-nums text-[#64748B]">
                          {formatOptionalDateTimeVi(attempt.submittedAt ?? attempt.startedAt)}
                        </p>
                      </Link>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleDrillDownTest(testSlug)}
                        className="text-xs font-bold text-[#75BDEB] hover:text-[#2878B8] hover:underline"
                      >
                        Xem tất cả →
                      </button>

                      {isInProgress ? (
                        <Link
                          to={`/test-online/attempt/${attempt.id}`}
                          className="rounded-lg bg-[#75BDEB] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5aaee3]"
                        >
                          Tiếp tục
                        </Link>
                      ) : (
                        <Link
                          to={`/test-online/${testSlug}`}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#111827] transition hover:border-[#75BDEB] hover:bg-[#F5FAFE]"
                        >
                          Làm lại
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && !error && records.length > 0 && isSingleTestView && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleBackToGroupedView}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2878B8] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Xem lịch sử theo bài thi</span>
                </button>

                <span className="text-xs font-semibold tabular-nums text-[#64748B]">
                  {records.length} lượt phù hợp
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {records.map(({ attempt, result }) => {
                  const isInProgress = attempt.status === 'in_progress'

                  return (
                    <article
                      key={attempt.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#EAEEF4] bg-white p-5 shadow-2xs"
                    >
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-[#111827]">
                          {attempt.testTitle}
                        </h3>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                            attempt.status === 'submitted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : attempt.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {attempt.status === 'submitted'
                            ? 'Hoàn thành'
                            : attempt.status === 'in_progress'
                              ? 'Đang làm'
                              : 'Hết giờ'}
                        </span>

                        <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#475569]">
                              <Award className="h-4 w-4 text-[#2878B8]" />
                              <span>Điểm</span>
                            </span>

                            {result ? (
                              result.isFullTestScoreEligible &&
                              result.convertedTotalScore !== null ? (
                                <span className="text-2xl font-bold tabular-nums tracking-tight text-[#111827]">
                                  {result.convertedTotalScore}
                                  <span className="ml-0.5 text-xs font-normal text-[#64748B]">
                                    /990
                                  </span>
                                </span>
                              ) : (
                                <span className="text-xl font-bold tabular-nums tracking-tight text-[#111827]">
                                  {result.correctCount}/{result.totalQuestions}
                                </span>
                              )
                            ) : (
                              <span className="text-xl font-bold text-[#111827]">—</span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-2.5 text-xs font-bold tabular-nums text-[#111827]">
                            <span>
                              <span className="font-normal text-[#64748B]">LC </span>
                              {result
                                ? result.convertedListeningScore !== null
                                  ? `${result.convertedListeningScore}/495`
                                  : `${result.listeningCorrect}/${result.listeningTotal}`
                                : '—'}
                            </span>
                            <span>
                              <span className="font-normal text-[#64748B]">RC </span>
                              {result
                                ? result.convertedReadingScore !== null
                                  ? `${result.convertedReadingScore}/495`
                                  : `${result.readingCorrect}/${result.readingTotal}`
                                : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 text-xs">
                          <div className="flex items-center justify-between text-[#64748B]">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              THỜI GIAN LÀM
                            </span>
                            <strong className="font-semibold tabular-nums text-[#111827]">
                              {result ? formatHms(result.actualDurationSeconds) : '00:00:00'}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between text-[#64748B]">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              BẮT ĐẦU
                            </span>
                            <strong className="font-semibold tabular-nums text-[#111827]">
                              {formatOptionalDateTimeVi(attempt.startedAt)}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between text-[#64748B]">
                            <span className="inline-flex items-center gap-1.5">
                              <Flag className="h-3.5 w-3.5" />
                              KẾT THÚC
                            </span>
                            <strong className="font-semibold tabular-nums text-[#111827]">
                              {formatOptionalDateTimeVi(attempt.submittedAt)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Link
                          to={
                            isInProgress
                              ? `/test-online/attempt/${attempt.id}`
                              : `/test-history/${attempt.id}`
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-[#75BDEB] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5aaee3]"
                        >
                          {isInProgress ? 'Tiếp tục' : 'Xem chi tiết'}
                        </Link>

                        <Link
                          to={`/test-online/${attempt.testSlug}`}
                          className="inline-flex items-center justify-center rounded-xl bg-[#F26522] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#d95314]"
                        >
                          Làm lại
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
