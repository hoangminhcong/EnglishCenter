import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { scheduleApi } from '@/features/schedules/api/scheduleApi'
import type { ScheduleFilterParams } from '@/features/schedules/types'

export function useScheduleBranches() {
  return useAsync(scheduleApi.getBranches, [], {
    queryKey: CLIENT_QUERY_KEYS.branches.byScope('schedule'),
  })
}

export function usePublicSchedules(filters: ScheduleFilterParams, enabled = true) {
  const { branchId, month, year, courseId } = filters

  const fetcher = useCallback(async () => {
    if (!enabled || !branchId) return []
    return scheduleApi.getPublicSchedules({ branchId, month, year, courseId })
  }, [enabled, branchId, month, year, courseId])

  return useAsync(fetcher, [enabled, branchId, month, year, courseId], {
    queryKey: CLIENT_QUERY_KEYS.schedules.publicList({ branchId, month, year, courseId }),
    enabled: enabled && Boolean(branchId),
  })
}
