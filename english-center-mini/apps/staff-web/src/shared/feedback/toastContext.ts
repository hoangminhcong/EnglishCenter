import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

export interface ToastContextValue {
  notify: (input: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
