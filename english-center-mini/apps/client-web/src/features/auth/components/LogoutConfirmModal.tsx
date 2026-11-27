import { useEffect, useRef } from 'react'

interface LogoutConfirmModalProps {
  open: boolean
  loggingOut?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function LogoutConfirmModal({
  open,
  loggingOut = false,
  onCancel,
  onConfirm,
}: LogoutConfirmModalProps) {
  const stayBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    stayBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loggingOut) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loggingOut, onCancel])

  if (!open) return null

  return (
    <div
      className="ec-reading-font fixed inset-0 z-50 grid place-items-center bg-[#243B53]/35 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loggingOut) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-[400px] rounded-[18px] border border-[#DCEAF3] bg-white p-6 text-[#243B53] shadow-[0_16px_44px_rgba(36,59,83,0.16)]"
      >
        <h3 id="logout-confirm-title" className="m-0 mb-1.5 text-[18px] font-bold text-[#243B53]">
          Đăng xuất khỏi tài khoản?
        </h3>
        <p className="m-0 mb-5 text-[14px] leading-[1.55] text-[#718096]">
          Bạn sẽ cần đăng nhập lại để tiếp tục theo dõi khóa học của mình và xem lịch sử bài làm.
        </p>

        <div className="flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
          <button
            ref={stayBtnRef}
            type="button"
            disabled={loggingOut}
            onClick={onCancel}
            className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] border border-[#DCEAF3] bg-white px-5 text-[14px] font-semibold text-[#2878B8] transition hover:bg-[#EAF6FD] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#A7D8F5] disabled:opacity-60 sm:w-auto"
          >
            Ở lại
          </button>

          <button
            type="button"
            disabled={loggingOut}
            onClick={onConfirm}
            className="inline-flex h-[44px] w-full items-center justify-center rounded-[10px] border border-transparent bg-[#2878B8] px-5 text-[14px] font-semibold text-white shadow-[0_2px_6px_rgba(40,120,184,0.22)] transition hover:bg-[#216aa3] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#A7D8F5] disabled:opacity-60 sm:w-auto"
          >
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      </div>
    </div>
  )
}
