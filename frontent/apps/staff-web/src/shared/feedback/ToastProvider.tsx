import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  ToastContext,
  type ToastItem,
  type ToastTone,
} from '@/shared/feedback/toastContext'

const TONE_STYLES: Record<
  ToastTone,
  { border: string; bg: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    border: 'border-[#A7F3D0]',
    bg: 'bg-white',
    iconColor: 'text-[#1F7A4C]',
    Icon: CheckCircle2,
  },
  error: {
    border: 'border-[#FECACA]',
    bg: 'bg-white',
    iconColor: 'text-[#B93A2E]',
    Icon: XCircle,
  },
  warning: {
    border: 'border-[#FDE68A]',
    bg: 'bg-white',
    iconColor: 'text-[#9E6300]',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-[#BAE6FD]',
    bg: 'bg-white',
    iconColor: 'text-[#2878B8]',
    Icon: Info,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seqRef = useRef(0)
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timerId = timersRef.current.get(id)
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const timersMap = timersRef.current
    return () => {
      for (const timerId of timersMap.values()) {
        window.clearTimeout(timerId)
      }
      timersMap.clear()
    }
  }, [])

  const notify = useCallback(
    (input: Omit<ToastItem, 'id'>) => {
      seqRef.current += 1
      const id = `toast-${seqRef.current}`
      setItems((prev) => [...prev.slice(-3), { ...input, id }])
      const timerId = window.setTimeout(() => {
        timersRef.current.delete(id)
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 4200)
      timersRef.current.set(id, timerId)
    },
    [],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-full max-w-sm flex-col gap-2.5"
      >
        {items.map((item) => {
          const style = TONE_STYLES[item.tone]
          const IconComp = style.Icon
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${style.border} ${style.bg} p-4 text-sm text-[#243B53] shadow-lg`}
            >
              <IconComp className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#243B53]">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Đóng thông báo"
                className="rounded-lg p-1 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#243B53]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
