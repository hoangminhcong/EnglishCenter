import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243B53]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full ${maxWidthClassName} overflow-y-auto rounded-2xl border border-[#DCEAF3] bg-white p-6 text-[#243B53] shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#DCEAF3] pb-3.5">
          <h2 className="text-lg font-bold text-[#243B53]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#EAF6FD] hover:text-[#243B53]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>

        {footer && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#DCEAF3] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
