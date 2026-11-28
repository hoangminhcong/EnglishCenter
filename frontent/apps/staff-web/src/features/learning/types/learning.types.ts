import type { StudyLevel } from '@english-center/contracts'
import type { MediaRef } from '@/shared/types/media.types'

export type MaterialFormat = 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'Audio' | 'Video' | 'Image'

export type MaterialAccessScope =
  | 'public_web'
  | 'all_students'
  | 'by_course'
  | 'by_class'

export type LearningContentStatus = 'draft' | 'published' | 'hidden' | 'archived'

export interface ManagedMaterialRecord {
  id: string
  code: string
  slug: string
  title: string
  description: string
  publicCategory: 'listening-reading' | 'exam-review' | 'internal-only'
  format: MaterialFormat
  accessScope: MaterialAccessScope
  courseId?: string
  classId?: string
  targetRefLabel: string
  media: MediaRef | null
  status: LearningContentStatus
  updatedAt: string
}

/**
 * 3 danh mục cố định gắn chặt với route hiện có của Client Web:
 * /study-zone/grammar, /study-zone/vocabulary, /study-zone/listening
 */
export type LockedStudyZoneCategorySlug = 'grammar' | 'vocabulary' | 'listening'

export interface StudyZoneCategoryMeta {
  slug: LockedStudyZoneCategorySlug
  clientRoute: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean
  topicsCount?: number
  exercisesCount?: number
}

export interface ManagedStudyTopicRecord {
  id: string
  slug: string
  category: LockedStudyZoneCategorySlug
  title: string
  shortDescription: string
  level: StudyLevel
  orderNumber: number
  isPublished: boolean
}

export interface StudyOptionItem {
  id: string
  label: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface StudyQuestionPublicItem {
  id: string
  displayOrder: number
  questionText: string
  imageUrl: string
  audioUrl: string
  audioDurationSeconds?: number
  options: StudyOptionItem[]
}

export interface StudyQuestionAnswerKeyItem {
  questionId: string
  correctOptionId: string
  explanation: string
  audioTranscript?: string
  audioTranslation?: string
}

export interface ManagedStudyExerciseRecord {
  id: string
  code: string
  slug: string
  category: LockedStudyZoneCategorySlug
  topicId: string
  topicSlug?: string
  topicTitle: string
  title: string
  subtitle: string
  description?: string
  level: StudyLevel
  durationMinutes: number
  instructions: string
  status: LearningContentStatus
  questions: StudyQuestionPublicItem[]
  /** Lưu tách biệt logic đáp án để khi xuất API public cho học viên không lộ đáp án trước khi nộp */
  answerKeys: Record<string, StudyQuestionAnswerKeyItem>
  updatedAt: string
}
