import { formatDateTimeVi } from '@english-center/utils'
import { formatHms } from '@/features/test-online/hooks/useTestTimer'
import type { TestAttemptResult } from '@/features/test-online/types/test.types'

interface TestResultSummaryProps {
  result: TestAttemptResult
  onRetakeTest: () => void
}

export default function TestResultSummary({
  result,
  onRetakeTest,
}: TestResultSummaryProps) {
  return (
    <div className="ec-reading-font flex flex-col gap-6">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${
                  result.status === 'submitted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {result.status === 'submitted' ? 'Hoàn thành' : 'Hết giờ'}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[28px]">
              {result.testTitle}
            </h1>
          </div>

          <button
            type="button"
            onClick={onRetakeTest}
            className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-lg border border-[#75BDEB] bg-white px-5 text-sm font-semibold text-[#2878B8] shadow-2xs transition hover:bg-[#EAF6FD] sm:self-center"
          >
            Làm lại
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-center rounded-xl border border-[#DCEAF3] bg-white px-5 py-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              ĐIỂM
            </p>
            {result.isFullTestScoreEligible && result.convertedTotalScore !== null ? (
              <p className="mt-1.5 flex items-baseline gap-0.5 text-xl font-bold leading-snug tabular-nums tracking-tight text-[#111827] sm:text-[22px]">
                <span>{result.convertedTotalScore}</span>
                <span className="text-base font-normal text-[#64748B]">/990</span>
              </p>
            ) : (
              <p className="mt-1.5 flex items-baseline gap-1.5 text-xl font-bold leading-snug tabular-nums tracking-tight text-[#111827] sm:text-[22px]">
                <span>
                  {result.correctCount}
                  <span className="text-base font-normal text-[#64748B]">
                    /{result.totalQuestions}
                  </span>
                </span>
                <span className="text-sm font-semibold text-[#2878B8]">
                  ({result.accuracyPercent}%)
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-[#DCEAF3] bg-white px-5 py-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              THỜI GIAN LÀM
            </p>
            <p className="mt-1.5 whitespace-nowrap text-xl font-bold leading-snug tabular-nums tracking-tight text-[#111827] sm:text-[22px]">
              {formatHms(result.actualDurationSeconds)}
            </p>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-[#DCEAF3] bg-white px-5 py-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              BẮT ĐẦU
            </p>
            <p className="mt-1.5 whitespace-nowrap text-xl font-bold leading-snug tabular-nums tracking-tight text-[#111827] sm:text-[22px]">
              {formatDateTimeVi(result.startedAt)}
            </p>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-[#DCEAF3] bg-white px-5 py-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              HOÀN THÀNH
            </p>
            <p className="mt-1.5 whitespace-nowrap text-xl font-bold leading-snug tabular-nums tracking-tight text-[#111827] sm:text-[22px]">
              {formatDateTimeVi(result.submittedAt)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#111827]">Số câu đúng theo từng Part</h2>

        <div className="mt-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7">
          {result.partStats.map((part) => (
            <div
              key={part.partNumber}
              className="flex flex-col items-center justify-center rounded-xl border border-[#DCEAF3] bg-white px-4 py-4 text-center shadow-2xs"
            >
              <span className="text-xs font-medium text-[#64748B]">
                Part {part.partNumber}
              </span>
              <span className="mt-1 text-[22px] font-bold tabular-nums tracking-tight text-[#75BDEB]">
                {part.correctCount}/{part.totalQuestions}
              </span>
              <span className="mt-0.5 text-xs text-[#64748B]">câu đúng</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
