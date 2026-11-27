export type TuitionPolicyStatus = 'draft' | 'active' | 'expired' | 'archived'

export interface PolicyHistoryEntry {
  id: string
  versionNumber: number
  changedAt: string
  changedBy: string
  note: string
  listedTuitionVnd: number
  netTuitionVnd: number
}

/**
 * Admin chỉ quản lý Chính sách học phí (Course Price & Tuition Policy).
 * Không chứa trường nhập thủ công "Đã thu" hay "Chưa thu" (thuộc phân hệ giao dịch Kế toán).
 */
export interface TuitionPolicyRecord {
  id: string
  policyCode: string
  courseId: string
  courseName: string
  listedTuitionVnd: number
  discountProgramName: string
  discountPercent: number
  discountFixedVnd: number
  netTuitionVnd: number
  effectiveFrom: string
  effectiveTo: string | null
  status: TuitionPolicyStatus
  applicabilityNote: string
  updatedAt: string
  history: PolicyHistoryEntry[]
}

export interface UpsertTuitionPolicyInput {
  id?: string
  policyCode: string
  courseId: string
  courseName: string
  listedTuitionVnd: number
  discountProgramName: string
  discountPercent: number
  discountFixedVnd: number
  effectiveFrom: string
  effectiveTo: string | null
  status: TuitionPolicyStatus
  applicabilityNote: string
  changeReason: string
}
