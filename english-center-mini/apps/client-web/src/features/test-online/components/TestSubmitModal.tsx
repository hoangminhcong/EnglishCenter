import { useEffect } from 'react'

interface TestSubmitModalProps {
  open: boolean
  examName?: string
  examType?: string
  totalQuestions: number
  answeredCount: number
  flaggedCount?: number
  submitting: boolean
  errorMessage?: string | null
  onCancel: () => void
  onConfirmSubmit: () => void
}

/**
 * Hộp thoại xác nhận nộp bài kiểm tra trực tuyến.
 */
export default function TestSubmitModal({
  open,
  examName,
  examType,
  totalQuestions,
  answeredCount,
  flaggedCount = 0,
  submitting,
  errorMessage,
  onCancel,
  onConfirmSubmit,
}: TestSubmitModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, submitting, onCancel])

  if (!open) return null

  const total = Math.max(0, Math.floor(totalQuestions))
  const answered = Math.min(total, Math.max(0, Math.floor(answeredCount)))
  const unanswered = Math.max(0, total - answered)
  const safeFlagged = Math.max(0, Math.floor(flaggedCount))
  const metaLine = [examName, examType].filter(Boolean).join(' • ')

  return (
    <div
      className="ec-reading-font fixed inset-0 z-50 flex items-start justify-center bg-slate-900/35 px-4 pt-16 sm:pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onCancel()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-submit-modal-title"
        className="w-full max-w-[640px] overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-2xl"
      >
        <div className="bg-[#75BDEB] px-5 py-4 text-white">
          <h2
            id="exam-submit-modal-title"
            className="text-lg font-bold uppercase tracking-wide text-white ec-shadow-text sm:text-xl"
          >
            HOÀN THÀNH BÀI KIỂM TRA
          </h2>
          {metaLine && (
            <p className="mt-0.5 text-xs font-medium text-white/95">{metaLine}</p>
          )}
        </div>

        <div className="border-b border-[#DCEAF3] px-5 py-5 text-[#111827]">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-[#DCEAF3] bg-[#F5FAFE] px-3.5 py-2.5">
              <div className="text-xs font-medium text-[#64748B]">Đã trả lời</div>
              <div className="mt-0.5 text-base font-bold text-[#243B53] sm:text-lg">
                {answered}/{total}
              </div>
            </div>

            <div className="rounded-md border border-[#DCEAF3] bg-[#F5FAFE] px-3.5 py-2.5">
              <div className="text-xs font-medium text-[#64748B]">Chưa trả lời</div>
              <div className="mt-0.5 text-base font-bold text-[#243B53] sm:text-lg">
                {unanswered} câu
              </div>
            </div>

            <div className="rounded-md border border-[#DCEAF3] bg-[#F5FAFE] px-3.5 py-2.5">
              <div className="text-xs font-medium text-[#64748B]">Đã gắn cờ</div>
              <div className="mt-0.5 text-base font-bold text-[#243B53] sm:text-lg">
                {safeFlagged} câu
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#334155] sm:text-[15px]">
            {unanswered > 0
              ? `Bạn vẫn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn gửi bài kiểm tra ngay bây giờ không?`
              : 'Bạn đã hoàn thành tất cả câu hỏi và sẵn sàng gửi bài kiểm tra.'}
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirmSubmit}
            className="rounded-md bg-[#75BDEB] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-2xs transition hover:bg-[#5aaee3] disabled:opacity-60"
          >
            {submitting ? 'ĐANG GỬI...' : 'GỬI BÀI NGAY'}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-md bg-[#E05252] px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-2xs transition hover:bg-[#c93f3f] disabled:opacity-60"
          >
            ĐÓNG
          </button>
        </div>
      </div>
    </div>
  )
}
