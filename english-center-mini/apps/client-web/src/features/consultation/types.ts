export type ConsultationSource = 'footer-form' | 'schedule-modal' | 'course-page'

export type ConsultationStatus = 'pending' | 'contacted' | 'enrolled' | 'closed'

export interface CreateConsultationRequest {
  source: ConsultationSource
  fullName: string
  phone: string
  email?: string
  facebook?: string
  school?: string
  purpose?: string
  currentLevel?: string
  targetGoal?: string
  courseName: string
  branchName?: string
  preferredTime?: string
  scheduleId?: string
  note?: string
}

export interface ConsultationRecord extends CreateConsultationRequest {
  id: string
  status: ConsultationStatus
  createdAt: string
}
