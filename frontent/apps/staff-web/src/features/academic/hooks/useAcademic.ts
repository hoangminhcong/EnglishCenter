import { useMemo } from 'react'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import type { AcademicActor } from '@/features/academic/services/academicApi'

export const ACADEMIC_QUERY_KEYS = {
  all: ['staff', 'academic'] as const,
  dashboard: (todayYmd: string) => ['staff', 'academic', 'dashboard', todayYmd] as const,
  students: () => ['staff', 'academic', 'students'] as const,
  studentDetail: (id: string) => ['staff', 'academic', 'student-detail', id] as const,
  classes: () => ['staff', 'academic', 'classes'] as const,
  classDetail: (id: string) => ['staff', 'academic', 'class-detail', id] as const,
  teachingRequests: () => ['staff', 'academic', 'teaching-requests'] as const,
  placement: (todayYmd: string) => ['staff', 'academic', 'placement', todayYmd] as const,
  requests: () => ['staff', 'academic', 'requests'] as const,
  syllabi: () => ['staff', 'academic', 'syllabi'] as const,
}

export function useAcademicActor(): AcademicActor {
  const { user } = useStaffAuth()
  return useMemo(
    () => ({
      userId: user?.id ?? 'anonymous',
      fullName: user?.fullName ?? 'Giáo vụ Đào tạo',
    }),
    [user],
  )
}
