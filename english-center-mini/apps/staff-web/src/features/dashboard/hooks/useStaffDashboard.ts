import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/features/dashboard/api/dashboardApi'

export function useStaffDashboard(period: '3m' | '6m' = '6m') {
  return useQuery({
    queryKey: ['staff', 'dashboard', 'overview', period],
    queryFn: () => dashboardApi.getOverview(period),
  })
}
