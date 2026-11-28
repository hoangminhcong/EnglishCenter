import type {
  ClassRecruitmentStatus,
  ConsultationChannel,
  CourseRegistrationDto,
  CourseRegistrationStatus,
  FollowUpStatus,
  LeadSource,
  LeadStatus,
  LeadStatusHistoryDto,
  RegistrationCommitmentDto,
  RegistrationEstimatedTuitionDto,
  RegistrationScoreGoalDto,
  RegistrationStatusHistoryDto,
  SalesConsultationDto,
  SalesFollowUpDto,
  SalesLeadDto,
} from '@english-center/contracts'
import type { DataScope, StaffRole } from '@/types/rbac.types'

export type SalesPeriodFilter = 'today' | '7d' | '30d'

export type SalesLeadSortKey = 'updated_desc' | 'created_desc' | 'name_asc'

export interface SalesActorContext {
  userId: string
  fullName: string
  role: StaffRole
  scope: DataScope
  branchId?: string
  canReviewRegistrations: boolean
  canAdminReopenLead: boolean
}

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  New: { label: 'Mới tiếp nhận', tone: 'info' },
  Contacting: { label: 'Đang liên hệ', tone: 'info' },
  Consulting: { label: 'Đang tư vấn', tone: 'warning' },
  FollowUp: { label: 'Hẹn liên hệ lại', tone: 'warning' },
  Interested: { label: 'Quan tâm cao', tone: 'success' },
  Registered: { label: 'Đã nộp đăng ký', tone: 'success' },
  NotInterested: { label: 'Chưa có nhu cầu', tone: 'neutral' },
  Lost: { label: 'Không liên lạc được / Mất khách', tone: 'danger' },
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  'website-consultation': 'Form tư vấn Website',
  'schedule-modal': 'Đăng ký từ Lịch khai giảng',
  'course-page': 'Trang chi tiết khóa học',
  manual: 'Nhập thủ công (Hotline / Quầy)',
}

export const CONSULTATION_CHANNEL_LABELS: Record<ConsultationChannel, string> = {
  phone: 'Điện thoại',
  in_person: 'Trực tiếp tại cơ sở',
  message: 'Tin nhắn (Fanpage / Zalo)',
  other: 'Kênh khác',
}

export const FOLLOW_UP_STATUS_META: Record<
  FollowUpStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'neutral' }
> = {
  Scheduled: { label: 'Đang hẹn', tone: 'info' },
  Completed: { label: 'Đã hoàn thành', tone: 'success' },
  Missed: { label: 'Không bắt máy / Bỏ lỡ', tone: 'warning' },
  Cancelled: { label: 'Đã hủy lịch', tone: 'neutral' },
}

export const REGISTRATION_STATUS_META: Record<
  CourseRegistrationStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  Submitted: { label: 'Đã nộp – Chờ tiếp nhận', tone: 'info' },
  Reviewing: { label: 'Đang xét duyệt', tone: 'warning' },
  NeedAdditionalInfo: { label: 'Cần bổ sung thông tin', tone: 'danger' },
  Approved: { label: 'Đã duyệt đăng ký', tone: 'success' },
  Rejected: { label: 'Từ chối hồ sơ', tone: 'danger' },
  Cancelled: { label: 'Đã hủy', tone: 'neutral' },
  Converted: { label: 'Đã chuyển Ghi danh (Enrollment)', tone: 'success' },
}

export const CLASS_RECRUITMENT_STATUS_META: Record<
  ClassRecruitmentStatus,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; selectable: boolean }
> = {
  open: { label: 'Đang tuyển sinh', tone: 'success', selectable: true },
  upcoming: { label: 'Sắp khai giảng', tone: 'info', selectable: true },
  full: { label: 'Đã đủ sĩ số', tone: 'warning', selectable: false },
  ongoing: { label: 'Đang học', tone: 'neutral', selectable: false },
  completed: { label: 'Đã kết thúc', tone: 'neutral', selectable: false },
  cancelled: { label: 'Đã hủy', tone: 'danger', selectable: false },
}

export interface UpsertCourseRegistrationInput {
  registrationId?: string
  mode: 'draft' | 'submit'
  leadId: string
  courseId: string
  branchId: string
  classId: string
  scoreGoal: RegistrationScoreGoalDto
  commitment: RegistrationCommitmentDto
  estimatedTuition: RegistrationEstimatedTuitionDto
  submitNote?: string
}

export interface TransitionRegistrationStatusInput {
  registrationId: string
  toStatus: CourseRegistrationStatus
  note?: string
}

export interface PreRegistrationValidationReport {
  blockingErrors: string[]
  warnings: string[]
}

export interface AttachCourseInterestInput {
  leadId: string
  courseId: string
  classId?: string
  identifiedNeed: string
  targetGoalNote: string
  proposalReason: string
}

export interface DuplicateLeadWarning {
  leadId: string
  matchedBy: 'phone' | 'email'
  fullName: string
  status: LeadStatus
  assignedSaleId: string
  isAccessibleByCurrentActor: boolean
}

export interface CreateLeadInput {
  fullName: string
  phone: string
  email?: string
  facebookUrl?: string
  schoolOrWork?: string
  learningNeed: string
  currentLevelNote?: string
  targetGoalNote?: string
  preferredContactTime?: string
  interestedCourseIds: string[]
  preferredBranchId?: string
  interestedClassId?: string
  source: LeadSource
  consentSummary: string
  assignedSaleId: string
  allowDuplicateOverride?: boolean
}

export interface UpdateLeadInput {
  leadId: string
  fullName: string
  phone: string
  email?: string
  facebookUrl?: string
  schoolOrWork?: string
  learningNeed: string
  currentLevelNote?: string
  targetGoalNote?: string
  preferredContactTime?: string
  interestedCourseIds: string[]
  preferredBranchId?: string
  interestedClassId?: string
  assignedSaleId: string
  allowDuplicateOverride?: boolean
}

export interface TransitionLeadStatusInput {
  leadId: string
  toStatus: LeadStatus
  reason?: string
}

export interface CreateConsultationInput {
  leadId: string
  channel: ConsultationChannel
  summary: string
  identifiedNeed: string
  advisedCourseId?: string
  advisedClassId?: string
  outcome: string
  note?: string
}

export interface CreateFollowUpInput {
  leadId: string
  dueAt: string
  note: string
}

export interface UpdateFollowUpStatusInput {
  followUpId: string
  status: Exclude<FollowUpStatus, 'Scheduled'>
}

export interface EnrichedLeadSummary extends SalesLeadDto {
  lastContactedAt?: string
  nextFollowUp?: SalesFollowUpDto
}

export interface SalesActivityEvent {
  id: string
  occurredAt: string
  kind: 'consultation' | 'status_change' | 'followup' | 'registration'
  leadId: string
  leadName: string
  actorName: string
  description: string
}

export interface SalesDashboardData {
  kpis: {
    newLeadsInPeriod: number
    untouchedNewLeadsCount: number
    activeConsultingCount: number
    followUpsDueOrOverdueToday: number
    overdueFollowUpsCount: number
    upcomingFollowUpsCount: number
    registeredLeadsCount: number
    approvedOrConvertedInPeriod: number
    convertedRegistrationsCount: number
    pendingReviewRegistrationsCount: number
    conversionRatePercent: number
  }
  leads: EnrichedLeadSummary[]
  followUps: (SalesFollowUpDto & { leadName: string; leadPhone: string })[]
  recentActivities: SalesActivityEvent[]
}

export interface SalesLeadDetailBundle {
  lead: SalesLeadDto
  consultations: SalesConsultationDto[]
  followUps: SalesFollowUpDto[]
  statusHistory: LeadStatusHistoryDto[]
  registrations: CourseRegistrationDto[]
}

export interface RegistrationDetailBundle {
  registration: CourseRegistrationDto
  lead: SalesLeadDto | null
  statusHistory: RegistrationStatusHistoryDto[]
  relatedConsultations: SalesConsultationDto[]
}

export function isFollowUpOverdue(followUp: Pick<SalesFollowUpDto, 'status' | 'dueAt'>, nowIso: string): boolean {
  return followUp.status === 'Scheduled' && followUp.dueAt < nowIso
}
