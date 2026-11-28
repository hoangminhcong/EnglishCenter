export type BranchStudyMode = 'Online' | 'Offline'

export interface Branch {
  id: string
  name: string
  shortLabel: string
  address: string
  phone: string
  city: string
  district: string
  lat: number
  lng: number
  mapUrl?: string
  image?: string
  studyMode: BranchStudyMode
  isActive: boolean
  showOnMap: boolean
  showInSchedule: boolean
  displayOrder: number
}

export type PublishStatus = 'draft' | 'published' | 'archived'

export type JobStatus = 'draft' | 'published' | 'closed' | 'archived'

export interface NewsPost {
  id: string
  title: string
  excerpt: string
  content: string[]
  category: string
  date: string
  image: string
  status?: PublishStatus
}

export type JobType = 'Toàn thời gian' | 'Bán thời gian'

export interface JobPost {
  id: string
  title: string
  excerpt: string
  position: string
  type: JobType
  salary: string
  branchId?: string
  location: string
  deadline: string
  image: string
  description: string[]
  requirements: string[]
  benefits: string[]
  status?: JobStatus
}
