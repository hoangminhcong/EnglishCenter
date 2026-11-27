import type { Branch } from '@/features/about/types'
import type { Course } from '@/features/courses/types'

export type StudyMode = 'Online' | 'Offline'

export type ScheduleStatus = 'open' | 'upcoming' | 'full' | 'started' | 'cancelled'

// Tái sử dụng trực tiếp định nghĩa chuẩn của hệ thống để tránh phân mảnh dữ liệu
export type ScheduleBranch = Branch
export type ScheduleCourse = Course

export interface Schedule {
  id: string
  courseId: string
  branchId: string
  classCode: string
  classTypeLabel: string // VD: "Cá nhân", "Cá nhân & Nhóm", "TOEIC-B01"
  startDate: string // YYYY-MM-DD
  startDateDisplay?: string // VD: "Linh hoạt"
  month: number // 1 - 12
  year: number
  studyDays: string // VD: "Thứ 2 - Thứ 4 - Thứ 6"
  startTime: string // VD: "18:00"
  endTime: string // VD: "20:00"
  studyMode: StudyMode
  maxStudents?: number // Sĩ số tối đa do Đào tạo/Admin cấu hình
  enrolledStudents?: number // Số học viên đã ghi danh
  status: ScheduleStatus
  isPublished: boolean // Chỉ hiển thị trên trang khách khi Admin bật công khai
  createdAt: string
  updatedAt: string
}

// Dữ liệu đã kết hợp thông tin Khóa học & Cơ sở để hiển thị trên bảng công khai
export interface PublicScheduleItem extends Schedule {
  courseName: string
  courseSubtitle: string
  branchName: string
  branchShortLabel: string
}

export interface ScheduleFilterParams {
  branchId: string
  month: number
  year?: number
  courseId?: string
}

export interface ScheduleConsultationPayload {
  scheduleId: string
  fullName: string
  phone: string
  email?: string
  courseName: string
  branchName: string
  note?: string
}
