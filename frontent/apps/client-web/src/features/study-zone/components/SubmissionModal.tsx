import { useEffect } from 'react'

interface SubmissionModalProps {
  open: boolean
  exerciseTitle: string
  totalQuestions: number
  answeredCount: number
  submitting: boolean
  errorMessage?: string | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Hộp thoại xác nhận nộp bài luyện tập Study Zone.
 * Đồng bộ phong cách trực quan với TestSubmitModal của Test Online.
 */
export default function SubmissionModal({
  open,
  exerciseTitle,
  totalQuestions,
  answeredCount,
  submitting,
  errorMessage,
  onCancel,
  onConfirm,
}: SubmissionModalProps) {
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
        aria-labelledby="study-submit-modal-title"
        className="w-full max-w-[640px] overflow-hidden rounded-lg border border-[#DCEAF3] bg-white shadow-2xl"
      >
        <div className="bg-[#75BDEB] px-5 py-4 text-white">
          <h2
            id="study-submit-modal-title"
            className="text-lg font-bold uppercase tracking-wide text-white ec-shadow-text sm:text-xl"
          >
            HOÀN THÀNH BÀI LUYỆN TẬP
          </h2>
          {exerciseTitle && (
            <p className="mt-0.5 text-xs font-medium text-white/95">{exerciseTitle}</p>
          )}
        </div>

        <div className="border-b border-[#DCEAF3] px-5 py-5 text-[#111827]">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#334155] sm:text-[15px]">
            {unanswered > 0
              ? `Bạn vẫn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn gửi bài luyện tập ngay bây giờ không?`
              : 'Bạn đã hoàn thành tất cả câu hỏi và sẵn sàng gửi bài luyện tập.'}
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
            onClick={onConfirm}
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
