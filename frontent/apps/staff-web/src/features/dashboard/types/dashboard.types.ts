import type { PermissionCode } from '@/types/rbac.types'

export interface DashboardKpiItem {
  id: string
  label: string
  value: string
  subLabel: string
  targetPath: string
  requiredPermission: PermissionCode
}

export interface StaffDashboardOverview {
  kpis: DashboardKpiItem[]
  monthlyEnrollments6M: { label: string; value: number }[]
  monthlyRevenueMln6M: { label: string; value: number; formattedValue: string }[]
  studentsByCourse: { label: string; value: number; color: string }[]
  classStatusBreakdown: { statusLabel: string; count: number; tone: 'info' | 'success' | 'warning' | 'neutral' }[]
}
