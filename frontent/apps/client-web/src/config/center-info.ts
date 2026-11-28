export const CONSULTATION_SECTION_ID = 'consultation-form'
export const STUDENTS_PATH = '/hoc-vien'
export const LISTENING_READING_PATH = '/tai-lieu/listening-reading'
export const EXAM_REVIEW_PATH = '/tai-lieu/review-de-thi'
export const DOCUMENTS_PATH = LISTENING_READING_PATH
export const SCHEDULE_PATH = '/schedule'
export const STUDY_ZONE_GRAMMAR_PATH = '/study-zone/grammar'
export const STUDY_ZONE_VOCABULARY_PATH = '/study-zone/vocabulary'
export const STUDY_ZONE_LISTENING_PATH = '/study-zone/listening'
export const TEST_ONLINE_PATH = '/test-online'
export const TEST_HISTORY_PATH = '/test-history'

export const centerInfo = {
  name: 'English Center',
  slogan: 'Chỉ cần cố gắng - Học là đỗ',
  intro:
    'English Center đồng hành cùng học viên trên hành trình chinh phục TOEIC với lộ trình rõ ràng, giáo viên tận tâm và môi trường học tập hiệu quả.',
  hotline: '0989 688 990',
  hotlineHref: 'tel:0989688990',
  email: 'tuvan@englishcenter.edu.vn',
  address: 'Số 141, đường Chiến Thắng, Thanh Liệt, Hà Nội',
  workingHours: [
    { label: 'Sáng', time: '08:00 – 12:00', note: 'Thứ Hai - Thứ Bảy' },
    { label: 'Chiều', time: '13:30 – 17:30', note: 'Thứ Hai - Thứ Bảy' },
    { label: 'Tối', time: '18:00 – 21:45', note: 'Thứ Hai - Thứ Bảy' },
  ],
  social: {
    facebook: 'https://www.facebook.com/share/1KGEuqJYcZ/',
    zalo: 'https://zalo.me/0989688990',
    messenger: 'https://m.me/englishcenter.toeic',
    instagram: 'https://instagram.com/englishcenter.toeic',
  },
  fanpage: {
    name: 'English Center',
    followers: '15.400 người theo dõi',
    description: 'Chia sẻ lộ trình, tài liệu và hoạt động của học viên English Center.',
    coverTitle: 'Chỉ cần cố gắng - Học là đỗ',
    coverSubtitle: 'Luyện thi TOEIC cùng English Center',
    coverImage: '',
    activityImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600',
  },
  consultationImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=720',
}

export const consultationHighlights = [
  'Học đúng lộ trình, đạt mục tiêu',
  'Cam kết chất lượng đào tạo',
  'Đồng hành và hỗ trợ học viên',
]

export const consultationOptions = {
  levels: ['Mất gốc', 'Chưa rõ nền', '350–400 LR', '450–600 LR', '600–700 LR'],
  goals: ['450–600 LR', '700–900 LR', '250–300 SW'],
  routes: [
    'FOUNDATION TOEIC (Xây dựng nền tảng)',
    "BEGINNER'S TOEIC (350+ TOEIC)",
    'CAMP BOMB TOEIC (450+ TOEIC)',
    'SUBMARINE TOEIC (700+ TOEIC)',
  ],
  times: ['Buổi sáng', 'Buổi chiều', 'Buổi tối', 'Bất kỳ thời gian nào'],
}

export interface NavChild {
  label: string
  to: string
}

export interface NavItem {
  label: string
  to?: string
  dropdown?: boolean
  children?: NavChild[]
}

export const navItems: NavItem[] = [
  {
    label: 'Về chúng tôi',
    dropdown: true,
    children: [
      { label: 'Hệ thống cơ sở', to: '/about/branches' },
      { label: 'Tin tức', to: '/about/news' },
      { label: 'Tuyển dụng', to: '/about/careers' },
    ],
  },
  { label: 'Lịch khai giảng', to: SCHEDULE_PATH },
  { label: 'Khóa học', to: '/courses' },
  { label: 'Học viên', to: STUDENTS_PATH },
  {
    label: 'Tài liệu TOEIC',
    dropdown: true,
    children: [
      { label: 'Listening & Reading', to: LISTENING_READING_PATH },
      { label: 'Review đề thi', to: EXAM_REVIEW_PATH },
    ],
  },
  {
    label: 'Study Zone',
    dropdown: true,
    children: [
      { label: 'Ngữ pháp', to: STUDY_ZONE_GRAMMAR_PATH },
      { label: 'Từ vựng', to: STUDY_ZONE_VOCABULARY_PATH },
      { label: 'Luyện nghe', to: STUDY_ZONE_LISTENING_PATH },
    ],
  },
  { label: 'Liên hệ', to: '/contact' },
]
