import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckSquare, LayoutGrid, Square } from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTestDetailBySlug } from '@/features/test-online/hooks/useTests'
import { attemptApi } from '@/features/test-online/api/attemptApi'
import type {
  TestAttempt,
  TestPart,
  TestPracticeMode,
  ToeicPartNumber,
} from '@/features/test-online/types/test.types'

export default function TestDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: test, loading, error, retry } = useTestDetailBySlug(slug)

  const [practiceMode, setPracticeMode] = useState<TestPracticeMode>('full')
  const [customSelectedParts, setCustomSelectedParts] = useState<ToeicPartNumber[] | null>(null)
  const [userDurationOverride, setUserDurationOverride] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const [resumeAttempt, setResumeAttempt] = useState<TestAttempt | null>(null)

  useEffect(() => {
    if (!slug) return
    let active = true
    attemptApi
      .findInProgressAttemptByTestSlug(slug, user?.id)
      .then((found) => {
        if (active) {
          setResumeAttempt(found)
        }
      })
      .catch(() => {
        // ignore
      })
    return () => {
      active = false
    }
  }, [slug, user?.id])

  const selectedParts = useMemo<ToeicPartNumber[]>(() => {
    if (!test) return []
    if (practiceMode === 'full' || customSelectedParts === null) {
      return test.parts.map((p) => p.partNumber)
    }
    return customSelectedParts
  }, [test, practiceMode, customSelectedParts])

  const selectedDuration = userDurationOverride ?? test?.duration ?? 120

  const handleToggleCustomMode = () => {
    if (!test) return
    if (practiceMode === 'full') {
      setPracticeMode('custom_parts')
      setCustomSelectedParts(test.parts.map((p) => p.partNumber))
    } else {
      setPracticeMode('full')
      setCustomSelectedParts(test.parts.map((p) => p.partNumber))
      setUserDurationOverride(test.duration)
    }
  }

  const handleTogglePart = (partNumber: ToeicPartNumber) => {
    if (!test) return
    const partObj = test.parts.find((p) => p.partNumber === partNumber)
    if (!partObj || !partObj.allowStandaloneSelection) return

    const current =
      practiceMode === 'full' || customSelectedParts === null
        ? test.parts.map((p) => p.partNumber)
        : customSelectedParts

    if (practiceMode === 'full') {
      setPracticeMode('custom_parts')
    }

    const exists = current.includes(partNumber)
    const next = exists ? current.filter((p) => p !== partNumber) : [...current, partNumber]
    setCustomSelectedParts([...next].sort((a, b) => a - b))
  }

  const handleStartExam = async () => {
    if (!test || selectedParts.length === 0 || starting) return
    setStarting(true)
    setStartError(null)
    try {
      const attempt = await attemptApi.startAttempt({
        testId: test.id,
        testSlug: test.slug,
        practiceMode,
        selectedParts,
        selectedDuration,
      })
      navigate(`/test-online/attempt/${attempt.id}`)
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : 'Không thể khởi tạo lượt thi. Vui lòng thử lại.',
      )
      setStarting(false)
    }
  }

  const handleContinueResumeAttempt = () => {
    if (!resumeAttempt) return
    navigate(`/test-online/attempt/${resumeAttempt.id}`)
  }

  const handleDiscardResumeAttempt = async () => {
    if (!resumeAttempt) return
    await attemptApi.discardInProgressAttempt(resumeAttempt.id)
    setResumeAttempt(null)
  }

  const listeningParts = useMemo(
    () => (test ? test.parts.filter((p) => p.section === 'listening') : []),
    [test],
  )
  const readingParts = useMemo(
    () => (test ? test.parts.filter((p) => p.section === 'reading') : []),
    [test],
  )
  const selectedSet = useMemo(() => new Set(selectedParts), [selectedParts])
  const canStart = selectedParts.length > 0 && !starting

  const renderPartRow = (part: TestPart, rowIndex: number) => {
    const isChecked = selectedSet.has(part.partNumber)
    const isCustom = practiceMode === 'custom_parts'
    const canToggleThisPart = isCustom && part.allowStandaloneSelection

    return (
      <div
        key={part.id}
        onClick={() => {
          if (canToggleThisPart) {
            handleTogglePart(part.partNumber)
          }
        }}
        className={`grid grid-cols-[44px_minmax(0,1fr)_96px] items-center border-b border-[#F2D5B8] last:border-b-0 sm:grid-cols-[52px_minmax(0,1fr)_220px] ${
          canToggleThisPart ? 'cursor-pointer' : ''
        } ${isChecked ? 'bg-white' : 'bg-slate-50/70 opacity-60'}`}
      >
        <div className="flex h-full items-center justify-center border-r border-[#F2D5B8] bg-[#F5D3B0] py-3 text-sm font-black text-[#243B53]">
          {rowIndex + 1}
        </div>

        <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#4A5568]">
          {isCustom && (
            <span className="text-[#75BDEB]">
              {isChecked ? (
                <CheckSquare className="h-4 w-4 text-[#75BDEB]" />
              ) : (
                <Square className="h-4 w-4 text-[#718096]" />
              )}
            </span>
          )}
          <span>{part.title}</span>
        </div>

        <div className="border-l border-[#F2D5B8] px-4 py-3 text-sm font-medium text-[#4A5568]">
          {part.standardToeicCount} CÂU
        </div>
      </div>
    )
  }

  return (
    <div className="ec-reading-font min-h-screen bg-[#F0F2F5] pb-16">
      <header className="sticky top-0 z-30 border-b border-[#DCEAF3] bg-[#75BDEB] text-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/test-online"
              title="Quay lại danh sách đề thi"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-base font-medium uppercase tracking-wide text-white ec-shadow-text sm:text-lg">
              HỆ THỐNG THI TRỰC TUYẾN
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white ec-shadow-text">
              {user?.fullName ?? 'Học viên'}
            </span>
            <Link
              to="/test-history"
              title="Xem lịch sử làm bài"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/25 text-white transition hover:bg-white/35"
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-6">
        {loading && <LoadingBlock label="Đang tải cấu trúc đề thi..." />}

        {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

        {!loading && !error && !test && (
          <EmptyBlock
            title="Không tìm thấy đề thi"
            description="Đề thi này không tồn tại hoặc đang được quản trị viên tạm ẩn."
            action={
              <Link
                to="/test-online"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#75BDEB] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#5aaee3]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại danh sách đề thi</span>
              </Link>
            }
          />
        )}

        {!loading && !error && test && (
          <div className="rounded-lg border border-[#DCEAF3] bg-[#F8F9FA] p-4 shadow-2xs sm:p-6">
            <div className="mb-3">
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-[#2878B8] sm:text-2xl">
                {test.title}
              </h1>
            </div>

            <div className="rounded-md bg-white p-6 shadow-2xs sm:p-9">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm text-[#4A5568] sm:text-[15px]">
                  <p>
                    Thời gian làm bài thi:{' '}
                    <strong className="font-bold text-[#243B53]">
                      {selectedDuration === 120
                        ? '2 giờ'
                        : `${selectedDuration} phút`}
                    </strong>
                  </p>
                  <p className="mt-1">Cấu trúc đề thi</p>
                </div>

                {practiceMode === 'custom_parts' && (
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <label className="flex items-center gap-1.5 font-semibold text-[#4A5568]">
                      <span>Thời gian:</span>
                      <select
                        value={selectedDuration}
                        onChange={(e) => setUserDurationOverride(Number(e.target.value))}
                        className="rounded-md border border-[#DCEAF3] bg-[#F5FAFE] px-2.5 py-1.5 font-bold text-[#243B53] outline-none focus:border-[#75BDEB]"
                      >
                        {test.availableDurationOptions.map((m) => (
                          <option key={m} value={m}>
                            {m === 120 ? '120 phút (2 giờ)' : `${m} phút`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="mx-auto mt-5 max-w-xl">
                {test.allowPartSelection && (
                  <div className="mb-4 flex items-center justify-between">
                    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-bold text-[#243B53]">
                      <input
                        type="checkbox"
                        checked={practiceMode === 'custom_parts'}
                        onChange={handleToggleCustomMode}
                        className="h-4 w-4 accent-[#75BDEB]"
                      />
                      <span>Chọn từng part</span>
                    </label>
                  </div>
                )}

                {listeningParts.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-[#111827]">
                      LISTENING
                    </h2>
                    <div className="overflow-hidden border border-[#F2D5B8]">
                      {listeningParts.map((part, idx) => renderPartRow(part, idx))}
                    </div>
                  </div>
                )}

                {readingParts.length > 0 && (
                  <div className={listeningParts.length > 0 ? 'mt-6' : ''}>
                    <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-[#111827]">
                      READING
                    </h2>
                    <div className="overflow-hidden border border-[#F2D5B8]">
                      {readingParts.map((part, idx) => renderPartRow(part, idx))}
                    </div>
                  </div>
                )}

                {startError && (
                  <div className="mt-4">
                    <ErrorBlock message={startError} />
                  </div>
                )}

                {!canStart && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Vui lòng tích chọn ít nhất 1 Part để bắt đầu làm bài.</span>
                  </div>
                )}

                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    disabled={!canStart}
                    onClick={handleStartExam}
                    className="inline-flex items-center justify-center rounded-lg bg-[#75BDEB] px-10 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#5aaee3] disabled:cursor-not-allowed disabled:opacity-45 sm:text-base"
                  >
                    {starting ? 'ĐANG MỞ ĐỀ...' : 'BẮT ĐẦU'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {resumeAttempt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-test-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4"
        >
          <div className="w-full max-w-[380px] overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-2xl">
            <div className="bg-[#75BDEB] px-4 py-3 text-white">
              <h2
                id="resume-test-modal-title"
                className="text-sm font-bold uppercase tracking-wide"
              >
                THÔNG BÁO
              </h2>
            </div>

            <div className="px-4 py-5">
              <p className="text-sm text-[#243B53]">
                Bạn có muốn tiếp tục làm bài test đang thực hiện?
              </p>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleContinueResumeAttempt}
                  className="rounded-md bg-[#75BDEB] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5aaee3]"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDiscardResumeAttempt()
                  }}
                  className="rounded-md bg-[#E05252] px-4 py-2 text-xs font-bold uppercase text-white transition hover:bg-[#c93f3f]"
                >
                  HỦY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
