import { useCallback } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { CLIENT_QUERY_KEYS } from '@/services/api/queryKeys'
import { studyZoneApi } from '@/features/study-zone/api/studyZoneApi'
import type { StudyZoneCategory } from '@/features/study-zone/types'

export function useStudyTopics(category: StudyZoneCategory) {
  const fetcher = useCallback(() => studyZoneApi.getTopics(category), [category])
  return useAsync(fetcher, [category], {
    queryKey: CLIENT_QUERY_KEYS.studyZone.topics(category),
  })
}

export function useStudyExercise(exerciseId: string) {
  const fetcher = useCallback(() => studyZoneApi.getExerciseById(exerciseId), [exerciseId])
  return useAsync(fetcher, [exerciseId], {
    queryKey: CLIENT_QUERY_KEYS.studyZone.exercise(exerciseId),
    enabled: Boolean(exerciseId),
  })
}
