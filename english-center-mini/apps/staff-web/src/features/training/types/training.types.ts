export type ActualClassStatus = 'ongoing' | 'upcoming' | 'completed' | 'paused'

export interface ActualTrainingClassRecord {
  id: string
  classCode: string
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  studyMode: 'Offline' | 'Online'
  teacherName: string
  teacherCode: string
  roomLabel: string
  scheduleDays: string
  timeSlot: string
  startDate: string
  endDate: string
  completedSessions: number
  totalSessions: number
  enrolledCount: number
  maxCapacity: number
  attendanceRatePercent: number
  homeworkCompletionPercent: number
  status: ActualClassStatus
}

export type PublicScheduleStatus = 'open' | 'upcoming' | 'full' | 'started' | 'cancelled'

export interface PublicOpeningScheduleRecord {
  id: string
  classCode: string
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  studyMode: 'Offline' | 'Online'
  classTypeLabel: string
  studyDays: string
  timeSlot: string
  startDate: string
  enrolledStudents: number
  maxStudents: number
  status: PublicScheduleStatus
  isPublished: boolean
}
