export type CourseStatus = 'active' | 'paused' | 'draft' | 'archived'

export interface CourseIntroItem {
  id: string
  lead?: string // Cụm từ in đậm đầu dòng (nếu có)
  text: string
}

export interface CourseIntroductionSection {
  heading?: string // Mặc định: "GIỚI THIỆU KHÓA HỌC"
  paragraphs: string[] // Hỗ trợ không giới hạn số lượng đoạn văn
  bullets?: CourseIntroItem[] // Danh sách các ý giải thích phương pháp học
  images?: { src: string; alt: string; caption?: string }[] // Hỗ trợ 1 hoặc nhiều ảnh bên cột phải
}

export interface CourseBenefitItem {
  id: string
  title: string // VD: "Ngữ âm", "Từ vựng", "Nghe hiểu", "Thói quen học tập"
  description: string
}

export interface CourseBenefitsSection {
  heading?: string // Mặc định: "LỢI ÍCH CỦA HỌC VIÊN"
  image?: string
  imageAlt?: string
  items: CourseBenefitItem[]
}

export interface CourseVideoMedia {
  thumbnailUrl: string
  videoUrl?: string // Link YouTube embed / MP4 do Admin cấu hình (nếu trống thì chỉ hiển thị ảnh minh họa)
  title?: string
  durationLabel?: string
}

export interface CourseOutcomesSection {
  heading?: string // Mặc định: "ĐẦU RA KỲ VỌNG CỦA KHÓA"
  items: string[]
  media?: CourseVideoMedia
}

export interface CourseCurriculumModule {
  id: string
  title: string
  sessions?: string
  topics: string[]
}

export interface CourseFaqItem {
  id: string
  question: string
  answer: string
}

export interface CourseTestimonialItem {
  id: string
  studentName: string
  score: string
  schoolOrWork?: string
  avatar?: string
  comment: string
}

export interface Course {
  id: string
  slug: string // Đường dẫn động: /courses/:slug
  code: string
  name: string // Tên khóa học hiển thị trên Card & Hero (VD: "FOUNDATION TOEIC (Xây nền)")
  scheduleTitle: string // Tên hiển thị trên bảng Lịch khai giảng
  scheduleSubtitle: string // Mô tả ngắn ở bảng Lịch khai giảng
  targetScore: string // Mức điểm mục tiêu (VD: "Xây dựng nền tảng", "350+ TOEIC", "450+ TOEIC", "700+ TOEIC")
  target: string // Giữ tương thích với các component cũ
  shortDescription?: string // Mô tả ngắn hiển thị trên Card & Hero (nếu Admin đã nhập)
  description: string // Mô tả tổng quan (có thể rỗng nếu Admin chưa nhập)
  highlights: string[] // Điểm nổi bật ngắn gọn trên Card (có thể rỗng)
  thumbnail: string // Ảnh đại diện trên Card
  image: string // Bí danh tương thích ngược với thumbnail
  bannerImage?: string // Ảnh nền Hero trang chi tiết
  tuitionFee: number // 0 = Liên hệ tư vấn
  duration?: string // VD: "2 tháng (24 buổi)"
  sessionsCount?: number
  level?: string

  // Các section nội dung chi tiết động do Admin quản lý (có dữ liệu mới hiển thị, không có tự động ẩn)
  introduction?: CourseIntroductionSection
  benefits?: CourseBenefitsSection
  expectedOutcomes?: CourseOutcomesSection
  teachingMethod?: {
    heading?: string
    paragraphs: string[]
    highlights?: string[]
  }
  curriculum?: CourseCurriculumModule[]
  gallery?: { src: string; caption?: string }[] // Hình ảnh hoạt động lớp học & kết quả học viên
  testimonials?: CourseTestimonialItem[]
  faqs?: CourseFaqItem[]

  status: CourseStatus // 'active' (Đang mở đăng ký), 'paused' (Tạm ngừng), 'draft' | 'archived' (Ẩn trên trang công khai)
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}
