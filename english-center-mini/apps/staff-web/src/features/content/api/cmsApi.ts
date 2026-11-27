import {
  getTodayIsoInVietnam,
  isIsoDateExpiredInVietnam,
  isValidEmail,
  isValidSlug,
  slugifyVi,
  toSafeHttpUrl,
} from '@english-center/utils'
import {
  INITIAL_CENTER_INFO_SETTINGS,
  type CenterInfoSettings,
} from '@/config/center.config'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import type {
  ManagedAchievementRecord,
  ManagedBranchRecord,
  ManagedJobRecord,
  ManagedNewsRecord,
} from '@/features/content/types/cms.types'

export const CENTER_INFO_MOCK_KEY = 'ec_staff_mock_center_info_v6'
export const BRANCHES_MOCK_KEY = 'ec_staff_mock_branches_v6'
export const NEWS_MOCK_KEY = 'ec_staff_mock_news_v6'
export const JOBS_MOCK_KEY = 'ec_staff_mock_jobs_v6'
export const ACHIEVEMENTS_MOCK_KEY = 'ec_staff_mock_achievements_v6'

function buildSeedBranches(): ManagedBranchRecord[] {
  return [
    {
      id: 'toeic-online',
      name: 'TOEIC Online (Trực tuyến tương tác)',
      shortLabel: 'TOEIC Online',
      studyMode: 'Online',
      city: 'Trực tuyến',
      district: 'Toàn quốc',
      address: 'Học trực tuyến qua nền tảng Zoom & Hệ thống LMS English Center',
      phone: '0989 688 990',
      email: 'online@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.0285,
      lng: 105.8542,
      mapUrl: '',
      isActive: true,
      showOnMap: false,
      showInSchedule: true,
      displayOrder: 1,
    },
    {
      id: 'cs-ha-dong',
      name: 'Cơ sở 1 – Hà Đông',
      shortLabel: 'Cs. Hà Đông',
      studyMode: 'Offline',
      city: 'Hà Nội',
      district: 'Hà Đông',
      address: 'Số 18, Đường Trần Phú, Quận Hà Đông, Hà Nội',
      phone: '0989 688 901',
      email: 'hadong@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 20.971,
      lng: 105.777,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=20.971,105.777',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: 2,
    },
    {
      id: 'cs-nam-tu-liem',
      name: 'Cơ sở 2 – Nam Từ Liêm',
      shortLabel: 'Cs. Nam Từ Liêm',
      studyMode: 'Offline',
      city: 'Hà Nội',
      district: 'Nam Từ Liêm',
      address: 'Số 56, Phố Nhổn, Quận Nam Từ Liêm, Hà Nội',
      phone: '0989 688 902',
      email: 'namtuliem@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.0537,
      lng: 105.7351,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=21.0537,105.7351',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: 3,
    },
    {
      id: 'cs-hai-ba-trung',
      name: 'Cơ sở 3 – Hai Bà Trưng',
      shortLabel: 'Cs. Hai Bà Trưng',
      studyMode: 'Offline',
      city: 'Hà Nội',
      district: 'Hai Bà Trưng',
      address: 'Số 102, Phố Tạ Quang Bửu, Quận Hai Bà Trưng, Hà Nội',
      phone: '0989 688 903',
      email: 'haibatrung@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.005,
      lng: 105.857,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=21.005,105.857',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: 4,
    },
    {
      id: 'cs-tay-son',
      name: 'Cơ sở 4 – Tây Sơn',
      shortLabel: 'Cs. Tây Sơn',
      studyMode: 'Offline',
      city: 'Hà Nội',
      district: 'Đống Đa',
      address: 'Số 229, Phố Tây Sơn, Quận Đống Đa, Hà Nội',
      phone: '0989 688 904',
      email: 'tayson@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.0068,
      lng: 105.8239,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=21.0068,105.8239',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: 5,
    },
    {
      id: 'cs-kim-ma',
      name: 'Cơ sở 5 – Kim Mã',
      shortLabel: 'Cs. Kim Mã',
      studyMode: 'Offline',
      city: 'Hà Nội',
      district: 'Ba Đình',
      address: 'Số 88, Phố Kim Mã, Quận Ba Đình, Hà Nội',
      phone: '0989 688 905',
      email: 'kimma@englishcenter.edu.vn',
      workingHours: '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      lat: 21.0327,
      lng: 105.8266,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=21.0327,105.8266',
      isActive: true,
      showOnMap: true,
      showInSchedule: true,
      displayOrder: 6,
    },
  ]
}

function buildSeedNews(): ManagedNewsRecord[] {
  return [
    {
      id: 'news-001',
      slug: 'khai-giang-chuoi-lop-toeic-tang-toc-cuoi-nam-2026',
      title: 'Khai giảng chuỗi lớp TOEIC tăng tốc xét tốt nghiệp đợt cuối năm 2026',
      excerpt:
        'English Center chính thức mở đăng ký các lớp Foundation, Camp Bomb 450+ và Submarine 700+ tại 5 cơ sở Hà Nội và kênh Trực tuyến.',
      category: 'Hoạt động trung tâm',
      thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
      blocks: [
        {
          id: 'blk-n1-1',
          type: 'heading',
          text: 'Lộ trình tinh gọn bám sát cấu trúc đề thi TOEIC mới nhất',
        },
        {
          id: 'blk-n1-2',
          type: 'paragraph',
          text: 'Nhằm hỗ trợ sinh viên năm 3, năm 4 kịp hoàn thiện chứng chỉ chuẩn đầu ra ngoại ngữ trước đợt xét tốt nghiệp, trung tâm triển khai lịch học linh hoạt sáng – chiều – tối.',
        },
        {
          id: 'blk-n1-3',
          type: 'list',
          items: [
            'Kiểm tra đầu vào 4 kỹ năng miễn phí và tư vấn xếp lớp cá nhân hóa.',
            'Tặng trọn bộ giáo trình in màu và tài khoản luyện đề Test Online.',
            'Thi thử Giữa khóa và Cuối khóa trên giao diện chuẩn phòng máy.',
          ],
        },
      ],
      status: 'published',
      publishedDate: '2026-11-20',
      author: 'Ban Học thuật English Center',
      updatedAt: '2026-11-20T09:00:00.000Z',
    },
    {
      id: 'news-002',
      slug: 'workshop-chien-thuat-xu-ly-nhanh-part-7-da-doan-van',
      title: 'Workshop học thuật: Chiến thuật xử lý nhanh Part 7 Đa đoạn văn đạt 400+ Reading',
      excerpt:
        'Buổi chia sẻ chuyên sâu cùng Cô Lan Hương (975 TOEIC) giúp học viên phân bổ 55 phút cho toàn bộ 54 câu đọc hiểu Part 7.',
      category: 'Sự kiện học thuật',
      thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      blocks: [
        {
          id: 'blk-n2-1',
          type: 'paragraph',
          text: 'Hơn 120 học viên các lớp Camp Bomb và Submarine đã tham gia buổi thực hành bấm giờ trực tiếp và phân tích bẫy đồng nghĩa thường gặp trong Email, Thông báo nội bộ.',
        },
      ],
      status: 'published',
      publishedDate: '2026-11-14',
      author: 'Phòng Giáo vụ Đào tạo',
      updatedAt: '2026-11-14T15:30:00.000Z',
    },
    {
      id: 'news-003',
      slug: 'ke-hoach-thi-thu-toeic-toan-he-thong-thang-12-2026',
      title: 'Kế hoạch tổ chức kỳ thi thử TOEIC miễn phí toàn hệ thống tháng 12/2026',
      excerpt:
        'Cơ hội trải nghiệm áp lực phòng thi thật và nhận bảng phân tích điểm mạnh/yếu từng Part ngay sau buổi thi.',
      category: 'Thông báo lịch thi',
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
      blocks: [
        {
          id: 'blk-n3-1',
          type: 'paragraph',
          text: 'Đợt thi thử mở đăng ký cho cả học viên nội bộ và thí sinh tự do tại Cơ sở 1 – Hà Đông và Cơ sở 3 – Hai Bà Trưng.',
        },
      ],
      status: 'draft',
      publishedDate: '2026-12-05',
      author: 'Nguyễn Hoàng Nam',
      updatedAt: '2026-11-25T10:00:00.000Z',
    },
  ]
}

function buildSeedJobs(): ManagedJobRecord[] {
  return [
    {
      id: 'giao-vien-toeic',
      slug: 'giao-vien-toeic',
      title: 'Giảng viên TOEIC Listening & Reading (850–950+)',
      position: 'Giảng dạy',
      type: 'Toàn thời gian',
      quantity: 3,
      branchId: 'cs-ha-dong',
      branchLabel: 'Các cơ sở Hà Nội & Online',
      salary: '18.000.000 – 28.000.000đ',
      deadline: '2027-02-28',
      applicationEmail: 'hr@englishcenter.edu.vn',
      excerpt:
        'Giảng dạy các lớp TOEIC mục tiêu 450+ và 700+, chấm chữa bài và đồng hành sát sao cùng học viên.',
      description: [
        'Trực tiếp đứng lớp các khóa Foundation, Camp Bomb 450+ hoặc Submarine 700+ theo giáo trình chuẩn của trung tâm.',
        'Theo dõi chuyên cần, chấm nhận xét bài tập định kỳ và phối hợp Giáo vụ hỗ trợ học viên yếu.',
      ],
      requirements: [
        'Sở hữu chứng chỉ TOEIC 900+ còn hiệu lực hoặc tương đương IELTS 7.5+.',
        'Kỹ năng sư phạm rõ ràng, truyền cảm hứng và tận tâm với sự tiến bộ của học viên.',
      ],
      benefits: [
        'Thu nhập cạnh tranh theo năng lực + thưởng vượt cam kết đầu ra của lớp.',
        'Được đào tạo chuyên môn định kỳ và lộ trình thăng tiến Trưởng nhóm Học thuật.',
      ],
      status: 'published',
      updatedAt: '2026-11-18T08:00:00.000Z',
    },
    {
      id: 'tu-van-tuyen-sinh',
      slug: 'chuyen-vien-tu-van-tuyen-sinh',
      title: 'Chuyên viên Tư vấn Tuyển sinh Khóa học',
      position: 'Tuyển sinh',
      type: 'Toàn thời gian',
      quantity: 2,
      branchId: 'cs-nam-tu-liem',
      branchLabel: 'Cơ sở 1 – Hà Đông & Cơ sở 2 – Nam Từ Liêm',
      salary: '10.000.000 – 18.000.000đ (Lương cứng + Thưởng KPI)',
      deadline: '2027-01-31',
      applicationEmail: 'hr@englishcenter.edu.vn',
      excerpt:
        'Tiếp nhận nhu cầu học tập, sắp xếp lịch kiểm tra đầu vào và tư vấn lộ trình học phù hợp cho học viên.',
      description: [
        'Liên hệ tư vấn học viên đăng ký qua Website, Fanpage và trực tiếp tại quầy tư vấn cơ sở.',
        'Lập hồ sơ đăng ký khóa học và phối hợp Giáo vụ – Kế toán hoàn tất thủ tục nhập học.',
      ],
      requirements: [
        'Giao tiếp tự tin, trung thực, lắng nghe và thấu hiểu nhu cầu người học.',
        'Sử dụng thành thạo công cụ quản lý CRM văn phòng.',
      ],
      benefits: [
        'Nguồn khách hàng tiềm năng chủ động từ hệ thống Marketing trung tâm.',
        'Đóng BHXH đầy đủ, tài trợ 100% học phí các khóa tiếng Anh nội bộ.',
      ],
      status: 'published',
      updatedAt: '2026-11-19T09:30:00.000Z',
    },
    {
      id: 'tro-giang-hoc-thuat',
      slug: 'tro-giang-hoc-thuat-toeic',
      title: 'Trợ giảng Học thuật TOEIC (Part-time Sinh viên)',
      position: 'Trợ giảng',
      type: 'Bán thời gian',
      quantity: 5,
      branchId: 'cs-hai-ba-trung',
      branchLabel: 'Cơ sở 3 – Hai Bà Trưng & Cơ sở 4 – Tây Sơn',
      salary: '45.000 – 75.000đ/giờ',
      deadline: '2027-02-15',
      applicationEmail: 'hr@englishcenter.edu.vn',
      excerpt:
        'Hỗ trợ giảng viên điểm danh, chữa bài tập nhóm nhỏ và kèm phụ đạo học viên trước giờ học.',
      description: [
        'Chấm bài tập về nhà trên hệ thống và giải đáp thắc mắc ngữ pháp – từ vựng cho học viên.',
        'Hỗ trợ tổ chức các buổi thi Giữa khóa và Cuối khóa tại cơ sở.',
      ],
      requirements: [
        'Sinh viên năm 2–4 đạt điểm TOEIC từ 750+ trở lên.',
        'Nhiệt tình, trách nhiệm, đảm bảo tối thiểu 3 ca tối mỗi tuần.',
      ],
      benefits: [
        'Cơ hội đào tạo trở thành Giảng viên chính thức ngay sau khi tốt nghiệp.',
        'Môi trường sư phạm trẻ trung, chuyên nghiệp.',
      ],
      status: 'published',
      updatedAt: '2026-11-21T10:00:00.000Z',
    },
  ]
}

function buildSeedAchievements(): ManagedAchievementRecord[] {
  return [
    {
      id: 'ach-001',
      slug: 'tran-duc-manh-945-toeic',
      studentFullName: 'Trần Đức Mạnh',
      anonymizeName: false,
      courseId: 'submarine-toeic',
      courseName: 'SUBMARINE TOEIC 700+',
      examYear: 2026,
      listeningScore: 490,
      readingScore: 455,
      totalScore: 945,
      certificateImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600',
      shareQuote:
        'Nhờ bộ đề thực chiến và phương pháp bắt từ khóa Part 3–4 của Cô Lan Hương, mình đã tăng từ 615 lên 945 TOEIC chỉ sau 1 khóa Submarine.',
      publicConsentGranted: true,
      consentNote: 'Học viên ký phiếu đồng ý chia sẻ bảng điểm ngày 12/11/2026.',
      status: 'published',
      publishedDate: '2026-11-15',
      updatedAt: '2026-11-15T10:00:00.000Z',
    },
    {
      id: 'ach-002',
      slug: 'nguyen-khanh-linh-885-toeic',
      studentFullName: 'Nguyễn Khánh Linh',
      anonymizeName: false,
      courseId: 'submarine-toeic',
      courseName: 'SUBMARINE TOEIC 700+',
      examYear: 2026,
      listeningScore: 465,
      readingScore: 420,
      totalScore: 885,
      certificateImageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600',
      shareQuote:
        'Hệ thống bài tập trên Khóa học của tôi và kho Test Online giúp mình quản lý thời gian làm Part 7 cực kỳ hiệu quả, dư 5 phút soát lại bài.',
      publicConsentGranted: true,
      consentNote: 'Xác nhận đồng ý đăng vinh danh qua email học viên ngày 18/11/2026.',
      status: 'published',
      publishedDate: '2026-11-19',
      updatedAt: '2026-11-19T09:00:00.000Z',
    },
    {
      id: 'ach-003',
      slug: 'le-quang-huy-760-toeic',
      studentFullName: 'Lê Quang Huy',
      anonymizeName: false,
      courseId: 'camp-bomb-toeic',
      courseName: 'CAMP BOMB TOEIC 450+',
      examYear: 2026,
      listeningScore: 410,
      readingScore: 350,
      totalScore: 760,
      certificateImageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600',
      shareQuote:
        'Xuất phát điểm 380 đầu vào, sau 24 buổi lớp Camp Bomb mình đạt 760 điểm – vượt xa mục tiêu chuẩn đầu ra của trường.',
      publicConsentGranted: true,
      consentNote: 'Học viên đồng ý công khai hình ảnh chứng chỉ tại quầy Giáo vụ Cs. Hà Đông.',
      status: 'published',
      publishedDate: '2026-11-22',
      updatedAt: '2026-11-22T11:00:00.000Z',
    },
  ]
}

export function formatAnonymizedStudentName(fullName: string, anonymize: boolean): string {
  if (!anonymize) return fullName
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return fullName
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  const middleInitials = parts
    .slice(1, -1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ')
  return [first, middleInitials, `${last.charAt(0).toUpperCase()}.`].filter(Boolean).join(' ')
}

export const cmsApi = {
  async getCenterInfo(): Promise<CenterInfoSettings> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<CenterInfoSettings>(STAFF_API_ENDPOINTS.cms.centerInfo)
    }
    await mockDelay(100)
    return readMockCollection(CENTER_INFO_MOCK_KEY, () => INITIAL_CENTER_INFO_SETTINGS)
  },

  async updateCenterInfo(
    next: Omit<CenterInfoSettings, 'updatedAt' | 'updatedBy'>,
    actorLabel: string,
  ): Promise<CenterInfoSettings> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<CenterInfoSettings>(STAFF_API_ENDPOINTS.cms.centerInfo, next)
    }
    await mockDelay()
    const saved: CenterInfoSettings = {
      ...next,
      updatedAt: new Date().toISOString(),
      updatedBy: actorLabel,
    }
    writeMockCollection(CENTER_INFO_MOCK_KEY, saved)
    return saved
  },

  async listBranches(): Promise<ManagedBranchRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedBranchRecord[]>(STAFF_API_ENDPOINTS.cms.branches)
    }
    await mockDelay(100)
    const list = readMockCollection(BRANCHES_MOCK_KEY, buildSeedBranches)
    return [...list].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'vi'),
    )
  },

  async upsertBranch(
    input: Omit<ManagedBranchRecord, 'displayOrder'> & { displayOrder?: number },
    isEdit: boolean,
  ): Promise<ManagedBranchRecord> {
    const trimmedEmail = input.email.trim()
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      throw new StaffApiClientError('Email cơ sở không đúng định dạng hợp lệ.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      if (isEdit) {
        return staffHttpClient.put<ManagedBranchRecord>(
          STAFF_API_ENDPOINTS.cms.branchDetail(input.id),
          input,
        )
      }
      return staffHttpClient.post<ManagedBranchRecord>(STAFF_API_ENDPOINTS.cms.branches, input)
    }

    await mockDelay()
    const current = readMockCollection(BRANCHES_MOCK_KEY, buildSeedBranches)
    const normalizedId = input.id.trim().toLowerCase()

    if (isEdit) {
      const idx = current.findIndex((b) => b.id === normalizedId)
      if (idx === -1) {
        throw new StaffApiClientError('Không tìm thấy cơ sở cần cập nhật.', 404)
      }
      const updated: ManagedBranchRecord = {
        ...current[idx]!,
        ...input,
        id: normalizedId,
        email: trimmedEmail,
        workingHours: input.workingHours.trim() || '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
        displayOrder: Math.max(1, Number(input.displayOrder) || current[idx]!.displayOrder),
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(BRANCHES_MOCK_KEY, next)
      return updated
    }

    if (current.some((b) => b.id === normalizedId)) {
      throw new StaffApiClientError('Mã định danh cơ sở đã tồn tại.', 409)
    }

    const created: ManagedBranchRecord = {
      ...input,
      id: normalizedId,
      email: trimmedEmail,
      workingHours: input.workingHours.trim() || '08:00 – 21:45 (Thứ Hai - Thứ Bảy)',
      displayOrder: Math.max(1, Number(input.displayOrder) || current.length + 1),
    }
    const next = [...current, created]
    writeMockCollection(BRANCHES_MOCK_KEY, next)
    return created
  },

  async listNews(): Promise<ManagedNewsRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedNewsRecord[]>(STAFF_API_ENDPOINTS.cms.news)
    }
    await mockDelay(100)
    return readMockCollection(NEWS_MOCK_KEY, buildSeedNews)
  },

  async upsertNews(
    input: Omit<ManagedNewsRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ManagedNewsRecord> {
    const normalizedSlug = slugifyVi(input.slug || input.title)
    if (!input.title.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError('Tiêu đề và Đường dẫn Slug bài viết không hợp lệ.', 400)
    }
    if (input.blocks.length === 0) {
      throw new StaffApiClientError('Bài viết tin tức phải có ít nhất 1 khối nội dung.', 400)
    }
    for (const blk of input.blocks) {
      if ((blk.type === 'heading' || blk.type === 'paragraph') && !blk.text.trim()) {
        throw new StaffApiClientError('Không được để trống nội dung văn bản trong khối bài viết.', 400)
      }
      if (blk.type === 'list' && blk.items.map((i) => i.trim()).filter(Boolean).length === 0) {
        throw new StaffApiClientError('Khối danh sách phải có ít nhất 1 ý nội dung.', 400)
      }
      if (blk.type === 'link' && (!blk.label.trim() || !toSafeHttpUrl(blk.href.trim()))) {
        throw new StaffApiClientError('Khối liên kết phải có nhãn và URL http/https hợp lệ.', 400)
      }
      if (
        blk.type === 'image' &&
        (!blk.src.trim() || (!toSafeHttpUrl(blk.src.trim()) && !blk.src.startsWith('data:image/')))
      ) {
        throw new StaffApiClientError('Khối hình ảnh phải có URL ảnh hợp lệ.', 400)
      }
    }

    if (input.status === 'scheduled') {
      const todayVn = getTodayIsoInVietnam()
      if (!input.publishedDate || input.publishedDate <= todayVn) {
        throw new StaffApiClientError(
          `Bài viết hẹn giờ đăng phải chọn ngày đăng sau hôm nay (${todayVn}).`,
          400,
        )
      }
    }

    const sanitized = {
      ...input,
      title: input.title.trim(),
      slug: normalizedSlug,
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedNewsRecord>(
          STAFF_API_ENDPOINTS.cms.newsDetail(encodeURIComponent(input.id)),
          sanitized,
        )
      }
      return staffHttpClient.post<ManagedNewsRecord>(STAFF_API_ENDPOINTS.cms.news, sanitized)
    }

    await mockDelay()
    const current = readMockCollection(NEWS_MOCK_KEY, buildSeedNews)
    const dup = current.find(
      (n) => n.slug.toLowerCase() === normalizedSlug && n.id !== input.id,
    )
    if (dup) {
      throw new StaffApiClientError('Slug bài viết tin tức đã tồn tại.', 409)
    }

    const nowIso = new Date().toISOString()
    if (input.id) {
      const idx = current.findIndex((n) => n.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy bài viết.', 404)
      const updated: ManagedNewsRecord = {
        ...current[idx]!,
        ...sanitized,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(NEWS_MOCK_KEY, next)
      return updated
    }

    const created: ManagedNewsRecord = {
      ...sanitized,
      id: createUniqueId('news'),
      updatedAt: nowIso,
    }
    const next = [created, ...current]
    writeMockCollection(NEWS_MOCK_KEY, next)
    return created
  },

  async listJobs(): Promise<ManagedJobRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedJobRecord[]>(STAFF_API_ENDPOINTS.cms.jobs)
    }
    await mockDelay(100)
    return readMockCollection(JOBS_MOCK_KEY, buildSeedJobs)
  },

  async upsertJob(
    input: Omit<ManagedJobRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ManagedJobRecord> {
    const normalizedSlug = slugifyVi(input.slug || input.title)
    if (!input.title.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError('Chức danh tuyển dụng và Đường dẫn Slug không hợp lệ.', 400)
    }
    if (input.description.length === 0 || input.requirements.length === 0) {
      throw new StaffApiClientError(
        'Tin tuyển dụng bắt buộc có Mô tả công việc và Yêu cầu ứng viên.',
        400,
      )
    }
    if (
      input.status === 'published' &&
      (!input.deadline || isIsoDateExpiredInVietnam(input.deadline))
    ) {
      throw new StaffApiClientError(
        'Không thể đăng công khai tin tuyển dụng có hạn nộp hồ sơ đã qua.',
        400,
      )
    }

    const sanitized = {
      ...input,
      title: input.title.trim(),
      slug: normalizedSlug,
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedJobRecord>(
          STAFF_API_ENDPOINTS.cms.jobDetail(encodeURIComponent(input.id)),
          sanitized,
        )
      }
      return staffHttpClient.post<ManagedJobRecord>(STAFF_API_ENDPOINTS.cms.jobs, sanitized)
    }

    await mockDelay()
    const current = readMockCollection(JOBS_MOCK_KEY, buildSeedJobs)
    const dup = current.find(
      (j) => j.slug.toLowerCase() === normalizedSlug && j.id !== input.id,
    )
    if (dup) {
      throw new StaffApiClientError('Slug tin tuyển dụng đã tồn tại.', 409)
    }

    const nowIso = new Date().toISOString()
    if (input.id) {
      const idx = current.findIndex((j) => j.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy tin tuyển dụng.', 404)
      const updated: ManagedJobRecord = {
        ...current[idx]!,
        ...sanitized,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(JOBS_MOCK_KEY, next)
      return updated
    }

    const created: ManagedJobRecord = {
      ...sanitized,
      id: createUniqueId('job'),
      updatedAt: nowIso,
    }
    const next = [created, ...current]
    writeMockCollection(JOBS_MOCK_KEY, next)
    return created
  },

  async listAchievements(): Promise<ManagedAchievementRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedAchievementRecord[]>(STAFF_API_ENDPOINTS.cms.achievements)
    }
    await mockDelay(100)
    return readMockCollection(ACHIEVEMENTS_MOCK_KEY, buildSeedAchievements)
  },

  async upsertAchievement(
    input: Omit<ManagedAchievementRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ManagedAchievementRecord> {
    const normalizedSlug = slugifyVi(input.slug || input.studentFullName)
    if (!input.studentFullName.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError('Vui lòng nhập Họ tên học viên và Đường dẫn Slug hợp lệ.', 400)
    }

    if (
      input.listeningScore < 5 ||
      input.listeningScore > 495 ||
      input.listeningScore % 5 !== 0 ||
      input.readingScore < 5 ||
      input.readingScore > 495 ||
      input.readingScore % 5 !== 0
    ) {
      throw new StaffApiClientError(
        'Điểm Listening và Reading TOEIC phải nằm trong khoảng 5–495 và chia hết cho 5.',
        400,
      )
    }

    if (input.publicConsentGranted && !input.consentNote.trim()) {
      throw new StaffApiClientError(
        'Bắt buộc nhập ghi chú căn cứ đồng ý công khai khi bật xác nhận đồng ý.',
        400,
      )
    }

    if (input.status === 'published' && !input.publicConsentGranted) {
      throw new StaffApiClientError(
        'Không thể công khai thành tích học viên khi chưa có xác nhận đồng ý công khai.',
        400,
      )
    }

    const sanitized = {
      ...input,
      studentFullName: input.studentFullName.trim(),
      slug: normalizedSlug,
      totalScore: input.listeningScore + input.readingScore,
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedAchievementRecord>(
          STAFF_API_ENDPOINTS.cms.achievementDetail(encodeURIComponent(input.id)),
          sanitized,
        )
      }
      return staffHttpClient.post<ManagedAchievementRecord>(
        STAFF_API_ENDPOINTS.cms.achievements,
        sanitized,
      )
    }

    await mockDelay()
    const current = readMockCollection(ACHIEVEMENTS_MOCK_KEY, buildSeedAchievements)
    const dup = current.find(
      (a) => a.slug.toLowerCase() === normalizedSlug && a.id !== input.id,
    )
    if (dup) {
      throw new StaffApiClientError('Slug bài vinh danh học viên đã tồn tại.', 409)
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((a) => a.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy hồ sơ thành tích.', 404)
      const updated: ManagedAchievementRecord = {
        ...current[idx]!,
        ...sanitized,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(ACHIEVEMENTS_MOCK_KEY, next)
      return updated
    }

    const created: ManagedAchievementRecord = {
      ...sanitized,
      id: createUniqueId('ach'),
      updatedAt: nowIso,
    }
    const next = [created, ...current]
    writeMockCollection(ACHIEVEMENTS_MOCK_KEY, next)
    return created
  },

  async revokeAchievementConsent(
    id: string,
    reasonNote: string,
  ): Promise<ManagedAchievementRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedAchievementRecord>(
        STAFF_API_ENDPOINTS.cms.achievementRevokeConsent(encodeURIComponent(id)),
        { reasonNote },
      )
    }

    await mockDelay()
    const current = readMockCollection(ACHIEVEMENTS_MOCK_KEY, buildSeedAchievements)
    const idx = current.findIndex((a) => a.id === id)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy hồ sơ thành tích.', 404)

    const prev = current[idx]!
    const updated: ManagedAchievementRecord = {
      ...prev,
      publicConsentGranted: false,
      status: prev.status === 'published' ? 'hidden' : prev.status,
      consentNote: reasonNote.trim() || 'Đã thu hồi đồng ý công khai theo yêu cầu học viên.',
      updatedAt: new Date().toISOString(),
    }
    const next = [...current]
    next[idx] = updated
    writeMockCollection(ACHIEVEMENTS_MOCK_KEY, next)
    return updated
  },
}
