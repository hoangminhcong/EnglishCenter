import type { IsoDateString, IsoDateTimeString, VndAmount } from '../common/api.types'
import type { AccountingReceivableStatus, PaymentMethodCode } from '../operations/operations.types'
import type { LeadSource } from '../sales/sales.types'

/* ============================================================================
 * 1. SHARED LEVEL, DIFFICULTY & EMPLOYMENT TAXONOMIES (CLIENT <-> STAFF)
 * ============================================================================ */

export const STUDY_LEVELS = [
  'Cơ bản (350+)',
  'Trung cấp (450–600+)',
  'Nâng cao (700+)',
  'Chuyên sâu (800+)',
] as const
export type StudyLevel = (typeof STUDY_LEVELS)[number]

export const TEST_DIFFICULTIES = [
  'Cơ bản (350+)',
  'Trung cấp (550+)',
  'Khá (650+)',
  'Nâng cao (750+)',
  'Nâng cao (850+)',
  'Chuyên sâu (850+)',
] as const
export type TestDifficulty = (typeof TEST_DIFFICULTIES)[number]

export const JOB_EMPLOYMENT_TYPES = [
  'Toàn thời gian',
  'Bán thời gian',
  'Thực tập',
  'Cộng tác viên',
] as const
export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number]

/* ============================================================================
 * 2. PUBLIC CMS & LEAD CAPTURE CONTRACTS (ADMIN CMS -> PUBLIC CLIENT WEB)
 * ============================================================================ */

export interface PublicCenterSocialLinksDto {
  facebook: string
  zalo: string
  messenger?: string
  instagram?: string
  youtube?: string
  tiktok?: string
}

export interface PublicCenterInfoDto {
  name: string
  slogan: string
  hotline: string
  hotlineHref: string
  email: string
  address: string
  workingHours: readonly {
    label: string
    hours: string
  }[]
  social: PublicCenterSocialLinksDto
  fanpage: {
    coverTitle: string
    coverSubtitle: string
    coverImage?: string
    activityImage?: string
  }
  copyrightText: string
}

export interface PublicBranchDto {
  id: string
  name: string
  shortLabel: string
  address: string
  district: string
  city: string
  phone: string
  email?: string
  workingHours?: string
  lat: number
  lng: number
  mapUrl?: string
  image?: string
  isOnline?: boolean
  isActive: boolean
  displayOrder?: number
}

export interface PublicAchievementDto {
  id: string
  slug: string
  displayStudentName: string
  courseId: string
  courseName: string
  examYear: number
  listeningScore: number
  readingScore: number
  totalScore: number
  certificateImageUrl?: string
  shareQuote: string
  publishedDate: IsoDateString
}

export interface PublicConsultationCreateDto {
  fullName: string
  phone: string
  email?: string
  facebookUrl?: string
  schoolOrWork?: string
  learningNeed?: string
  currentLevelNote?: string
  targetGoalNote?: string
  preferredContactTime?: string
  courseId?: string
  courseName?: string
  branchId?: string
  branchName?: string
  classId?: string
  source: LeadSource
}

/* ============================================================================
 * 3. PUBLIC TEST ONLINE PROJECTION CONTRACT (STAFF BUILDER -> CLIENT ENGINE)
 * - Khớp 100% cấu trúc Test Engine trên Client Web (Parts 1-7, questionGroups,
 *   instructions[], importantNotes[], scoreConversionTable) và loại bỏ sạch answerKeys.
 * ============================================================================ */

export interface PublicScoreConversionPointDto {
  minRatio: number
  listeningScore: number
  readingScore: number
}

export interface PublicTestOptionDto {
  id: string
  label: 'A' | 'B' | 'C' | 'D'
  text?: string
  imageUrl?: string
  audioUrl?: string
}

export interface PublicTestQuestionDto {
  id: string
  questionNumber: number
  questionText?: string
  imageUrl?: string
  audioUrl?: string
  audioDurationSeconds?: number
  options: readonly PublicTestOptionDto[]
  displayOrder: number
}

export interface PublicTestQuestionGroupDto {
  id: string
  partNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7
  groupTitle?: string
  passageTitle?: string
  passage?: string
  passages?: readonly string[]
  imageUrl?: string
  audioUrl?: string
  audioDurationSeconds?: number
  questions: readonly PublicTestQuestionDto[]
  displayOrder: number
}

export interface PublicTestPartDto {
  id: string
  partNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7
  section: 'listening' | 'reading'
  title: string
  englishTitle: string
  vietnameseTitle: string
  description: string
  contentTypesLabel: string
  questionCount: number
  standardToeicCount: number
  suggestedMinutes: number
  allowStandaloneSelection: boolean
  instructions: readonly string[]
  importantNotes: readonly string[]
  questionGroups: readonly PublicTestQuestionGroupDto[]
  displayOrder: number
}

export interface PublicStudentTestDto {
  id: string
  code: string
  slug: string
  title: string
  collectionGroup: string
  testType: 'full_test' | 'mini_test' | 'part_practice' | 'placement_test'
  difficulty: TestDifficulty
  duration: number
  totalQuestions: number
  standardTotalQuestions: number
  allowPartSelection: boolean
  availableDurationOptions: readonly number[]
  thumbnail?: string
  description: string
  generalInstructions: readonly string[]
  sampleCheckAudioUrl?: string
  status: 'published' | 'draft' | 'hidden'
  attemptsCount: number
  activeVersionNumber: number
  scoreScaleVersionCode: string
  scoreConversionTable?: readonly PublicScoreConversionPointDto[]
  parts: readonly PublicTestPartDto[]
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

/* ============================================================================
 * 4. STUDENT PORTAL FINANCIAL READ-ONLY VIEW CONTRACT (WORKFLOW 7)
 * - Chỉ trả dữ liệu thuộc học viên đang xác thực (không lộ dữ liệu tài chính người khác).
 * ============================================================================ */

export interface StudentReceiptViewDto {
  id: string
  receiptNumber: string
  transactionCode: string
  amountVnd: VndAmount
  paymentMethod: PaymentMethodCode
  paidAt: IsoDateTimeString
  issuedAt: IsoDateTimeString
  reasonContent: string
}

export interface StudentTuitionItemDto {
  receivableId: string
  receivableCode: string
  courseId: string
  courseName: string
  classId: string
  classCode: string
  branchName: string
  listedTuitionVnd: VndAmount
  discountAmountVnd: VndAmount
  discountReason?: string
  totalReceivableVnd: VndAmount
  paidConfirmedVnd: VndAmount
  pendingVerificationVnd: VndAmount
  remainingVnd: VndAmount
  dueDate: IsoDateString
  status: AccountingReceivableStatus
  receipts: readonly StudentReceiptViewDto[]
}

export interface StudentTuitionOverviewDto {
  studentId: string
  studentCode: string
  totalReceivableVnd: VndAmount
  totalPaidConfirmedVnd: VndAmount
  totalRemainingVnd: VndAmount
  items: readonly StudentTuitionItemDto[]
}
