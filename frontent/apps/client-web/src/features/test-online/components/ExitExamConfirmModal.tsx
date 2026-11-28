import { AlertTriangle, X } from 'lucide-react'

interface ExitExamConfirmModalProps {
  open: boolean
  title?: string
  description?: string
  answeredCount: number
  totalQuestions: number
  onCancel: () => void
  onConfirmExit: () => void
}

/**
 * Hộp thoại xác nhận khi học viên đang làm bài trắc nghiệm dở (Test Online hoặc Bài tập Study Zone)
 * mà bấm nút Quay lại / Thoát khỏi phòng làm bài.
 */
export default function ExitExamConfirmModal({
  open,
  title = 'Xác nhận rời khỏi bài làm',
  description = 'Bạn đang trong quá trình làm bài trắc nghiệm và chưa nộp bài. Bạn có chắc chắn muốn thoát khỏi trang này không?',
  answeredCount,
  totalQuestions,
  onCancel,
  onConfirmExit,
}: ExitExamConfirmModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#DCEAF3] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EAF6FD] bg-[#F5FAFE] px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-black uppercase text-[#243B53]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-[#718096] hover:bg-[#EAF6FD] hover:text-[#243B53]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed text-[#243B53]">{description}</p>

          <div className="mt-4 rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-3.5 text-xs font-semibold text-[#243B53]">
            Tiến độ hiện tại của bạn:{' '}
            <strong className="text-[#2878B8]">
              Đã chọn {answeredCount} / {totalQuestions} câu hỏi
            </strong>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl bg-[#2878B8] px-5 py-2.5 text-xs font-extrabold text-white shadow-2xs transition hover:bg-[#1e639c]"
            >
              Ở lại làm tiếp
            </button>

            <button
              type="button"
              onClick={onConfirmExit}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-extrabold text-rose-700 transition hover:bg-rose-600 hover:text-white"
            >
              Thoát bài làm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
