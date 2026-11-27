import { useMemo } from 'react'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import type { TeacherActor } from '@/features/teacher/services/teacherApi'

export const TEACHER_QUERY_KEYS = {
  all: ['staff', 'teacher'] as const,
  dashboard: (userId: string, todayYmd: string) =>
    ['staff', 'teacher', 'dashboard', userId, todayYmd] as const,
  classes: (userId: string) => ['staff', 'teacher', 'classes', userId] as const,
  classDetail: (userId: string, classId: string) =>
    ['staff', 'teacher', 'class-detail', userId, classId] as const,
  teachingPlans: (userId: string, classId: string) =>
    ['staff', 'teacher', 'teaching-plans', userId, classId] as const,
  attendanceSheet: (userId: string, sessionId: string, todayYmd: string) =>
    ['staff', 'teacher', 'attendance', userId, sessionId, todayYmd] as const,
  assignments: (userId: string, classId: string) =>
    ['staff', 'teacher', 'assignments', userId, classId] as const,
  gradebook: (userId: string, classId: string, category: string) =>
    ['staff', 'teacher', 'gradebook', userId, classId, category] as const,
  progress: (userId: string, classId: string) =>
    ['staff', 'teacher', 'progress', userId, classId] as const,
  schedule: (userId: string) => ['staff', 'teacher', 'schedule', userId] as const,
}

export function useTeacherActor(): TeacherActor {
  const { user } = useStaffAuth()
  return useMemo(
    () => ({
      userId: user?.id ?? 'anonymous',
      employeeCode: user?.employeeCode ?? 'GV',
      fullName: user?.fullName ?? 'Giảng viên',
      scope: user?.scope ?? 'assigned_classes_only',
    }),
    [user],
  )
}
