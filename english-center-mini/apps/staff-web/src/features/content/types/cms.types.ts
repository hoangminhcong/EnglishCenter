import type { JobEmploymentType, JobPostStatus } from '@english-center/contracts'
import type { CenterInfoSettings } from '@/config/center.config'

export type { CenterInfoSettings, JobEmploymentType, JobPostStatus }

export interface ManagedBranchRecord {
  id: string
  name: string
  shortLabel: string
  studyMode: 'Offline' | 'Online'
  city: string
  district: string
  address: string
  phone: string
  email: string
  workingHours: string
  lat: number
  lng: number
  image?: string
  mapUrl: string
  isActive: boolean
  showOnMap: boolean
  showInSchedule: boolean
  displayOrder: number
}

export type NewsPublishStatus = 'draft' | 'scheduled' | 'published' | 'hidden' | 'archived'

export type StructuredContentBlock =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'list'; items: string[] }
  | { id: string; type: 'image'; src: string; alt: string; caption?: string }
  | { id: string; type: 'link'; label: string; href: string }

export interface ManagedNewsRecord {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string
  thumbnail: string
  blocks: StructuredContentBlock[]
  status: NewsPublishStatus
  publishedDate: string
  author: string
  updatedAt: string
}

export interface ManagedJobRecord {
  id: string
  slug: string
  title: string
  position: string
  type: JobEmploymentType
  quantity: number
  branchId: string
  branchLabel: string
  salary: string
  deadline: string
  applicationEmail: string
  image?: string
  excerpt: string
  description: string[]
  requirements: string[]
  benefits: string[]
  status: JobPostStatus
  updatedAt: string
}

export type AchievementVisibilityStatus = 'draft' | 'published' | 'hidden' | 'archived'

export interface ManagedAchievementRecord {
  id: string
  slug: string
  studentFullName: string
  anonymizeName: boolean
  courseId: string
  courseName: string
  examYear: number
  listeningScore: number
  readingScore: number
  totalScore: number
  certificateImageUrl: string
  shareQuote: string
  publicConsentGranted: boolean
  consentNote: string
  status: AchievementVisibilityStatus
  publishedDate: string
  updatedAt: string
}
