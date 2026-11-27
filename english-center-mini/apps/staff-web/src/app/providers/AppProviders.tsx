import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { staffQueryClient } from '@/services/api/queryClient'
import { StaffAuthProvider } from '@/features/auth/context/StaffAuthProvider'
import { ToastProvider } from '@/shared/feedback/ToastProvider'
import { CurrentTimeProvider } from '@/shared/time/CurrentTimeProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={staffQueryClient}>
      <CurrentTimeProvider>
        <ToastProvider>
          <StaffAuthProvider>{children}</StaffAuthProvider>
        </ToastProvider>
      </CurrentTimeProvider>
    </QueryClientProvider>
  )
}
