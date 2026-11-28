import type { CourseVisibilityStatus } from '@english-center/contracts'
import { isValidSlug } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import type {
  ManagedCourseRecord,
  UpsertCourseInput,
} from '@/features/courses/types/courses.types'

export const COURSES_MOCK_KEY = 'ec_staff_mock_courses_v6'

function buildSeedCourses(): ManagedCourseRecord[] {
  return [
    {
      id: 'foundation-toeic',
      slug: 'foundation-toeic',
      code: 'FOUNDATION',
      name: 'FOUNDATION TOEIC (Xây nền)',
      scheduleTitle: 'FOUNDATION TOEIC',
      scheduleSubtitle: '(Xây dựng nền tảng)',
      milestoneId: 'ms-foundation',
      targetScoreLabel: 'Xây dựng nền tảng',
      level: 'Mất gốc / Xây nền (0 -> 300+)',
      duration: '2 tháng (24 buổi)',
      sessionsCount: 24,
      listedTuitionVnd: 2_800_000,
      shortDescription:
        'Khóa xây nền ngữ âm, từ vựng cốt lõi và cấu trúc câu căn bản cho người mới bắt đầu.',
      description:
        'Chương trình chuẩn hóa phát âm IPA, hệ thống ngữ pháp nền tảng và kỹ năng nghe bắt từ khóa dành cho học viên mất gốc tiếng Anh.',
      highlights: [
        'Chuẩn hóa ngữ âm & phản xạ nghe cơ bản',
        'Hệ thống 12 chủ điểm ngữ pháp trọng tâm',
        'Kèm sát bài tập về nhà sau từng buổi học',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
      status: 'active',
      isFeatured: true,
      displayOrder: 1,
      updatedAt: '2026-11-15T08:00:00.000Z',
    },
    {
      id: 'beginners-toeic',
      slug: 'beginners-toeic',
      code: 'BEGINNERS',
      name: "BEGINNER'S TOEIC 350+",
      scheduleTitle: "BEGINNER'S TOEIC",
      scheduleSubtitle: '(350+ TOEIC)',
      milestoneId: 'ms-350',
      targetScoreLabel: '350+ TOEIC',
      level: 'Sơ cấp (250 -> 400+)',
      duration: '2 tháng (24 buổi)',
      sessionsCount: 24,
      listedTuitionVnd: 3_400_000,
      shortDescription:
        'Làm quen định dạng đề thi TOEIC Listening & Reading chuẩn ETS, nắm chắc chiến thuật Part 1, 2, 5.',
      description:
        'Khóa học tập trung xây dựng từ vựng theo chủ đề công sở, phương pháp xử lý nhanh Part 1, Part 2 và ngữ pháp ứng dụng Part 5–6.',
      highlights: [
        'Nắm vững cấu trúc 7 Parts đề thi TOEIC',
        'Tích lũy 500+ từ vựng thương mại tần suất cao',
        'Thi thử Giữa khóa & Cuối khóa bấm giờ chuẩn',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      status: 'active',
      isFeatured: true,
      displayOrder: 2,
      updatedAt: '2026-11-16T08:00:00.000Z',
    },
    {
      id: 'camp-bomb-toeic',
      slug: 'camp-bomb-toeic',
      code: 'CAMPBOMB',
      name: 'CAMP BOMB TOEIC 450+',
      scheduleTitle: 'CAMP BOMB TOEIC',
      scheduleSubtitle: '(450+ TOEIC)',
      milestoneId: 'ms-450',
      targetScoreLabel: '450+ TOEIC',
      level: 'Trung cấp (350 -> 550+)',
      duration: '2.5 tháng (24 buổi)',
      sessionsCount: 24,
      listedTuitionVnd: 4_000_000,
      shortDescription:
        'Bứt phá kỹ năng nghe hội thoại Part 3–4 và đọc hiểu đoạn đơn/đôi Part 7 đạt chuẩn đầu ra đại học.',
      description:
        'Rèn luyện kỹ thuật Skimming – Scanning, nhận diện Paraphrasing trong Listening Part 3–4 và tối ưu tốc độ làm bài Reading.',
      highlights: [
        'Cam kết đầu ra bằng văn bản từ 450–550+ TOEIC',
        'Chữa chi tiết từng lỗi sai trong các đợt Demo Test',
        'Hỗ trợ học bù và giải đáp học thuật 1-1',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
      status: 'active',
      isFeatured: true,
      displayOrder: 3,
      updatedAt: '2026-11-18T08:00:00.000Z',
    },
    {
      id: 'submarine-toeic',
      slug: 'submarine-toeic',
      code: 'SUBMARINE',
      name: 'SUBMARINE TOEIC 700+',
      scheduleTitle: 'SUBMARINE TOEIC',
      scheduleSubtitle: '(700+ TOEIC)',
      milestoneId: 'ms-700',
      targetScoreLabel: '700+ TOEIC',
      level: 'Chuyên sâu (500 -> 750+)',
      duration: '3 tháng (24 buổi)',
      sessionsCount: 24,
      listedTuitionVnd: 4_800_000,
      shortDescription:
        'Luyện đề thực chiến cường độ cao, xử lý câu hỏi suy luận khó và đa đoạn văn Part 7 chinh phục 700–850+.',
      description:
        'Khóa luyện chuyên sâu dành cho học viên mục tiêu điểm cao phục vụ xét tuyển tập đoàn đa quốc gia, ngân hàng và hàng không.',
      highlights: [
        'Giải bộ đề cập nhật sát xu hướng ra đề ETS mới nhất',
        'Chiến thuật xử lý câu hỏi Bảng biểu & Đoạn ba (Triple Passages)',
        'Giảng viên 950+ TOEIC trực tiếp đồng hành sửa bài',
      ],
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
      status: 'active',
      isFeatured: true,
      displayOrder: 4,
      updatedAt: '2026-11-20T08:00:00.000Z',
    },
  ]
}

export const coursesApi = {
  async listCourses(): Promise<ManagedCourseRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedCourseRecord[]>(STAFF_API_ENDPOINTS.courses.list)
    }
    await mockDelay()
    return readMockCollection(COURSES_MOCK_KEY, buildSeedCourses)
  },

  async upsertCourse(input: UpsertCourseInput): Promise<ManagedCourseRecord> {
    const normalizedSlug = input.slug.trim().toLowerCase()
    const normalizedCode = input.code.trim().toUpperCase()
    const normalizedName = input.name.trim()

    if (!normalizedName || !normalizedCode || !normalizedSlug) {
      throw new StaffApiClientError(
        'Vui lòng nhập đầy đủ Tên khóa học, Mã khóa học và Đường dẫn slug.',
        400,
      )
    }

    if (!isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError(
        'Slug khóa học chỉ được chứa chữ thường a–z, chữ số 0–9 và dấu gạch ngang (-).',
        422,
      )
    }

    if (!Number.isFinite(input.sessionsCount) || input.sessionsCount < 1) {
      throw new StaffApiClientError('Tổng số buổi học phải từ 1 buổi trở lên.', 422)
    }

    if (!Number.isFinite(input.listedTuitionVnd) || input.listedTuitionVnd < 0) {
      throw new StaffApiClientError('Học phí niêm yết không được là số âm.', 422)
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedCourseRecord>(
          STAFF_API_ENDPOINTS.courses.detail(input.id),
          input,
        )
      }
      return staffHttpClient.post<ManagedCourseRecord>(STAFF_API_ENDPOINTS.courses.list, input)
    }

    await mockDelay()
    const current = readMockCollection(COURSES_MOCK_KEY, buildSeedCourses)

    const dupSlug = current.find(
      (c) => c.slug.toLowerCase() === normalizedSlug && c.id !== input.id,
    )
    if (dupSlug) {
      throw new StaffApiClientError('Đường dẫn slug khóa học đã tồn tại.', 409)
    }

    const dupCode = current.find(
      (c) => c.code.toUpperCase() === normalizedCode && c.id !== input.id,
    )
    if (dupCode) {
      throw new StaffApiClientError('Mã khóa học đã tồn tại.', 409)
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((c) => c.id === input.id)
      if (idx === -1) {
        throw new StaffApiClientError('Không tìm thấy khóa học.', 404)
      }
      const existing = current[idx]!
      const updated: ManagedCourseRecord = {
        ...existing,
        ...input,
        name: normalizedName,
        slug: normalizedSlug,
        code: normalizedCode,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(COURSES_MOCK_KEY, next)
      return updated
    }

    const created: ManagedCourseRecord = {
      ...input,
      id: normalizedSlug || createUniqueId('course'),
      name: normalizedName,
      slug: normalizedSlug,
      code: normalizedCode,
      displayOrder: current.length + 1,
      updatedAt: nowIso,
    }
    const next = [...current, created]
    writeMockCollection(COURSES_MOCK_KEY, next)
    return created
  },

  async setCourseStatus(
    id: string,
    status: CourseVisibilityStatus,
  ): Promise<ManagedCourseRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<ManagedCourseRecord>(STAFF_API_ENDPOINTS.courses.status(id), {
        status,
      })
    }

    await mockDelay()
    const current = readMockCollection(COURSES_MOCK_KEY, buildSeedCourses)
    const idx = current.findIndex((c) => c.id === id)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy khóa học.', 404)
    }
    const existing = current[idx]!
    const updated: ManagedCourseRecord = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    }
    const next = [...current]
    next[idx] = updated
    writeMockCollection(COURSES_MOCK_KEY, next)
    return updated
  },
}
