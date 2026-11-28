export type ConfigVersionStatus = 'draft' | 'active' | 'archived'

export interface ToeicScoreScaleVersion {
  id: string
  versionCode: string
  name: string
  listeningMin: number
  listeningMax: number
  readingMin: number
  readingMax: number
  totalMin: number
  totalMax: number
  speakingMin: number
  speakingMax: number
  writingMin: number
  writingMax: number
  effectiveFrom: string
  effectiveTo: string | null
  verifiedSource: string
  changeReason: string
  status: ConfigVersionStatus
  updatedAt: string
}

export interface VerifiedConversionRow {
  rawCorrectCount?: number
  correctCountLabel: string
  listeningScaledScore: number
  readingScaledScore: number
}

export interface ScoreConversionTableVersion {
  id: string
  versionCode: string
  title: string
  scaleVersionId: string
  verifiedSourceUrlOrCitation: string
  effectiveFrom: string
  status: ConfigVersionStatus
  rows: VerifiedConversionRow[]
}

export type MilestoneApplicabilityScope = 'new_courses_only' | 'new_enrollments_only'

export interface ToeicMilestoneRecord {
  id: string
  code: string
  label: string
  minScore: number
  maxScore: number
  description: string
  applicabilityScope: MilestoneApplicabilityScope
  linkedCourseIds: string[]
  isActive: boolean
  updatedAt: string
}
