import type { CourseVisibilityStatus } from '@english-center/contracts'

export interface ManagedCourseRecord {
  id: string
  slug: string
  code: string
  name: string
  scheduleTitle: string
  scheduleSubtitle: string
  milestoneId: string
  targetScoreLabel: string
  level: string
  duration: string
  sessionsCount: number
  listedTuitionVnd: number
  shortDescription: string
  description: string
  highlights: string[]
  thumbnail: string
  status: CourseVisibilityStatus
  isFeatured: boolean
  displayOrder: number
  updatedAt: string
}

export interface UpsertCourseInput {
  id?: string
  slug: string
  code: string
  name: string
  scheduleTitle: string
  scheduleSubtitle: string
  milestoneId: string
  targetScoreLabel: string
  level: string
  duration: string
  sessionsCount: number
  listedTuitionVnd: number
  shortDescription: string
  description: string
  highlights: string[]
  thumbnail: string
  status: CourseVisibilityStatus
  isFeatured: boolean
}
