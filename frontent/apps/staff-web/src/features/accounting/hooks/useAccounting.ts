import { useMemo } from 'react'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { hasPermission } from '@/services/permissions/permissions.config'
import type { AccountingActor } from '@/features/accounting/services/accountingApi'
import type { AccountingDashboardPeriod } from '@/features/accounting/types/accounting.types'

export const ACCOUNTING_QUERY_KEYS = {
  all: ['staff', 'accounting'] as const,
  dashboard: (todayYmd: string, period: AccountingDashboardPeriod = 'this_month') =>
    ['staff', 'accounting', 'dashboard', todayYmd, period] as const,
  receivables: (todayYmd: string) => ['staff', 'accounting', 'receivables', todayYmd] as const,
  receivableDetail: (id: string, todayYmd: string) =>
    ['staff', 'accounting', 'receivable-detail', id, todayYmd] as const,
  unbilledEnrollments: () => ['staff', 'accounting', 'unbilled-enrollments'] as const,
  transactions: () => ['staff', 'accounting', 'transactions'] as const,
  receipts: () => ['staff', 'accounting', 'receipts'] as const,
  refunds: () => ['staff', 'accounting', 'refunds'] as const,
  reports: (filtersKey: string) => ['staff', 'accounting', 'reports', filtersKey] as const,
}

export function useAccountingActor(): AccountingActor {
  const { user } = useStaffAuth()
  return useMemo(
    () => ({
      userId: user?.id ?? 'anonymous',
      fullName: user?.fullName ?? 'Nhân viên Kế toán',
      canApproveRefunds: hasPermission(user, 'finance.refunds.approve'),
    }),
    [user],
  )
}
