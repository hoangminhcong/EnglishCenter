import type { ReactNode } from 'react'

export type BadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: 'border-[#CBE4F9] bg-[#EAF6FD] text-[#2878B8]',
  success: 'border-[#BFE8D3] bg-[#E3F5EC] text-[#1F7A4C]',
  warning: 'border-[#F8DF9C] bg-[#FFF3D6] text-[#9E6300]',
  danger: 'border-[#F7C7C1] bg-[#FDECE9] text-[#B93A2E]',
  neutral: 'border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]',
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'info', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-center text-xs font-bold leading-none ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
