import { isValidSlug, slugifyVi } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import type {
  ManagedMaterialRecord,
  ManagedStudyExerciseRecord,
  ManagedStudyTopicRecord,
  StudyZoneCategoryMeta,
} from '@/features/learning/types/learning.types'

export const MATERIALS_MOCK_KEY = 'ec_staff_mock_materials_v6'
export const SZ_CATEGORIES_MOCK_KEY = 'ec_staff_mock_sz_categories_v6'
export const SZ_TOPICS_MOCK_KEY = 'ec_staff_mock_sz_topics_v6'
export const SZ_EXERCISES_MOCK_KEY = 'ec_staff_mock_sz_exercises_v6'

function buildStaffToneWavDataUrl(freqHz = 440): string {
  const sampleRate = 8000
  const numSamples = 12000 // 1.5s
  const buffer = new ArrayBuffer(44 + numSamples)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + numSamples, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeStr(36, 'data')
  view.setUint32(40, numSamples, true)
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate
    const env = Math.min(1, (numSamples - i) / 1600)
    view.setUint8(44 + i, 128 + Math.round(55 * env * Math.sin(2 * Math.PI * freqHz * t)))
  }
  let bin = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]!)
  return `data:audio/wav;base64,${btoa(bin)}`
}

const STAFF_SZ_DEMO_AUDIO = buildStaffToneWavDataUrl(494)

function buildSeedMaterials(): ManagedMaterialRecord[] {
  return [
    {
      id: 'mat-001',
      code: 'DOC-LR-600VOCAB',
      slug: 'so-tay-600-tu-vung-thuong-mai-toeic',
      title: 'Sổ tay 600 Từ vựng Thương mại TOEIC theo 12 chủ đề trọng tâm',
      description: 'Tài liệu tổng hợp từ vựng kèm phiên âm, ví dụ ngữ cảnh thực tế trong Part 5 & Part 7.',
      publicCategory: 'listening-reading',
      format: 'PDF',
      accessScope: 'public_web',
      targetRefLabel: 'Công khai trên Website (Tài liệu L&R)',
      media: {
        id: 'med-mat-001',
        kind: 'document',
        fileName: '600-essential-toeic-words-2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4_850_000,
        url: 'https://drive.google.com/drive/folders/english-center-600-vocab',
        status: 'ready',
      },
      status: 'published',
      updatedAt: '2026-11-12T08:30:00.000Z',
    },
    {
      id: 'mat-002',
      code: 'DOC-REV-T11',
      slug: 'review-chi-tiet-xu-huong-de-thi-toeic-quy-4-2026',
      title: 'Tổng hợp & Phân tích bẫy từ vựng đề thi TOEIC thực tế Quý 4/2026',
      description: 'Bản tổng hợp các cụm collocations và cấu trúc ngữ pháp xuất hiện nhiều nhất.',
      publicCategory: 'exam-review',
      format: 'PDF',
      accessScope: 'public_web',
      targetRefLabel: 'Công khai trên Website (Review đề thi)',
      media: {
        id: 'med-mat-002',
        kind: 'document',
        fileName: 'toeic-exam-review-q4-2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 3_120_000,
        url: 'https://drive.google.com/drive/folders/english-center-review-q4',
        status: 'ready',
      },
      status: 'published',
      updatedAt: '2026-11-18T10:00:00.000Z',
    },
    {
      id: 'mat-003',
      code: 'DOC-SUB-700',
      slug: 'bo-chuyen-de-part-7-triple-passages-submarine',
      title: 'Chuyên đề giải nhanh 30 bộ Đoạn ba (Triple Passages) – Khóa Submarine 700+',
      description: 'Tài liệu lưu hành nội bộ dành riêng cho học viên khóa Submarine TOEIC 700+.',
      publicCategory: 'internal-only',
      format: 'PDF',
      accessScope: 'by_course',
      courseId: 'submarine-toeic',
      targetRefLabel: 'Khóa SUBMARINE TOEIC 700+',
      media: {
        id: 'med-mat-003',
        kind: 'document',
        fileName: 'submarine-part7-triple-passages.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 6_400_000,
        url: 'https://drive.google.com/drive/folders/english-center-submarine-p7',
        status: 'ready',
      },
      status: 'published',
      updatedAt: '2026-11-20T14:00:00.000Z',
    },
    {
      id: 'mat-004',
      code: 'AUD-ECS01-DICT',
      slug: 'audio-luyen-nghe-chep-chinh-ta-lop-ec-s01',
      title: 'Bộ Audio luyện nghe chép chính tả tốc độ 1.15x – Lớp EC-S01',
      description: 'Học liệu đính kèm dành riêng cho học viên lớp EC-S01 của Cô Lan Hương.',
      publicCategory: 'internal-only',
      format: 'Audio',
      accessScope: 'by_class',
      classId: 'cls-ec-s01',
      targetRefLabel: 'Lớp EC-S01 (Submarine 700+)',
      media: {
        id: 'med-mat-004',
        kind: 'audio',
        fileName: 'ec-s01-dictation-pack.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 12_500_000,
        durationSec: 420,
        url: STAFF_SZ_DEMO_AUDIO,
        status: 'ready',
      },
      status: 'published',
      updatedAt: '2026-11-22T16:00:00.000Z',
    },
  ]
}

function buildSeedSzCategories(): StudyZoneCategoryMeta[] {
  return [
    {
      slug: 'grammar',
      clientRoute: '/study-zone/grammar',
      name: 'Ngữ pháp TOEIC (Grammar)',
      description: 'Hệ thống chủ điểm ngữ pháp và bài tập trắc nghiệm Part 5 – Part 6.',
      displayOrder: 1,
      isActive: true,
      topicsCount: 0,
      exercisesCount: 0,
    },
    {
      slug: 'vocabulary',
      clientRoute: '/study-zone/vocabulary',
      name: 'Từ vựng TOEIC (Vocabulary)',
      description: 'Từ vựng theo chủ đề thương mại, văn phòng, nhân sự và hợp đồng.',
      displayOrder: 2,
      isActive: true,
      topicsCount: 0,
      exercisesCount: 0,
    },
    {
      slug: 'listening',
      clientRoute: '/study-zone/listening',
      name: 'Luyện nghe TOEIC (Listening)',
      description: 'Luyện phản xạ nghe tranh tả người/vật, hỏi đáp ngắn và hội thoại.',
      displayOrder: 3,
      isActive: true,
      topicsCount: 0,
      exercisesCount: 0,
    },
  ]
}

function buildSeedSzTopics(): ManagedStudyTopicRecord[] {
  return [
    {
      id: 'sz-top-gram-01',
      slug: 'cum-danh-tu-va-tu-loai-part-5',
      category: 'grammar',
      title: 'Cụm danh từ & Vị trí Từ loại trong TOEIC Part 5',
      shortDescription: 'Nhận diện nhanh hậu tố danh từ, tính từ, trạng từ trong 5 giây mà không cần dịch cả câu.',
      level: 'Trung cấp (450–600+)',
      orderNumber: 1,
      isPublished: true,
    },
    {
      id: 'sz-top-gram-02',
      slug: 'lien-tu-va-gioi-tu-thuong-gap',
      category: 'grammar',
      title: 'Phân biệt Liên từ (Conjunctions) & Giới từ (Prepositions)',
      shortDescription: 'Tổng hợp các cặp từ nối chỉ nguyên nhân, nhượng bộ và điều kiện xuất hiện trong mọi đề thi.',
      level: 'Nâng cao (700+)',
      orderNumber: 2,
      isPublished: true,
    },
    {
      id: 'sz-top-vocab-01',
      slug: 'tu-vung-hop-dong-va-tuyen-dung',
      category: 'vocabulary',
      title: 'Từ vựng Hợp đồng, Nhân sự & Tuyển dụng (Personnel & Contracts)',
      shortDescription: 'Hệ thống cụm collocation cốt lõi trong văn bản email doanh nghiệp và thông báo nội bộ.',
      level: 'Trung cấp (450–600+)',
      orderNumber: 1,
      isPublished: true,
    },
    {
      id: 'sz-top-lis-01',
      slug: 'luyen-nghe-hoi-dap-part-2-wh-questions',
      category: 'listening',
      title: 'Phản xạ Hỏi – Đáp ngắn Part 2 (Who / Where / When / Why)',
      shortDescription: 'Mẹo loại trừ đáp án bẫy đồng âm và nhận diện câu trả lời gián tiếp chuẩn ETS.',
      level: 'Cơ bản (350+)',
      orderNumber: 1,
      isPublished: true,
    },
  ]
}

function buildSeedSzExercises(): ManagedStudyExerciseRecord[] {
  return [
    {
      id: 'sz-ex-gram-01',
      code: 'SZ-GRAM-01',
      slug: 'test-1-cum-danh-tu-part-5',
      category: 'grammar',
      topicId: 'sz-top-gram-01',
      topicSlug: 'cum-danh-tu-va-tu-loai-part-5',
      topicTitle: 'Cụm danh từ & Vị trí Từ loại trong TOEIC Part 5',
      title: 'TEST 1 – Cụm danh từ & Từ loại',
      subtitle: 'Bài luyện nhanh 3 câu chuẩn cấu trúc Part 5',
      description: 'Áp dụng quy tắc đứng sau mạo từ/tính từ sở hữu để chọn đúng từ loại.',
      level: 'Trung cấp (450–600+)',
      durationMinutes: 8,
      instructions: 'Chọn đáp án đúng nhất A, B, C hoặc D cho mỗi câu hỏi.',
      status: 'published',
      questions: [
        {
          id: 'sz-g01-q1',
          displayOrder: 1,
          questionText: 'All department heads must submit their annual budget _____ by Friday.',
          imageUrl: '',
          audioUrl: '',
          options: [
            { id: 'sz-g01-q1-a', label: 'A', text: 'propose' },
            { id: 'sz-g01-q1-b', label: 'B', text: 'proposals' },
            { id: 'sz-g01-q1-c', label: 'C', text: 'proposed' },
            { id: 'sz-g01-q1-d', label: 'D', text: 'proposing' },
          ],
        },
        {
          id: 'sz-g01-q2',
          displayOrder: 2,
          questionText: 'The new software update has _____ improved our customer response time.',
          imageUrl: '',
          audioUrl: '',
          options: [
            { id: 'sz-g01-q2-a', label: 'A', text: 'significant' },
            { id: 'sz-g01-q2-b', label: 'B', text: 'significance' },
            { id: 'sz-g01-q2-c', label: 'C', text: 'significantly' },
            { id: 'sz-g01-q2-d', label: 'D', text: 'signify' },
          ],
        },
        {
          id: 'sz-g01-q3',
          displayOrder: 3,
          questionText: 'Ms. Tanaka received official _____ for leading the product launch.',
          imageUrl: '',
          audioUrl: '',
          options: [
            { id: 'sz-g01-q3-a', label: 'A', text: 'recognition' },
            { id: 'sz-g01-q3-b', label: 'B', text: 'recognize' },
            { id: 'sz-g01-q3-c', label: 'C', text: 'recognizable' },
            { id: 'sz-g01-q3-d', label: 'D', text: 'recognizing' },
          ],
        },
      ],
      answerKeys: {
        'sz-g01-q1': {
          questionId: 'sz-g01-q1',
          correctOptionId: 'sz-g01-q1-b',
          explanation: 'Sau cụm danh từ phụ "their annual budget" cần danh từ chính -> proposals (các bản đề xuất ngân sách).',
        },
        'sz-g01-q2': {
          questionId: 'sz-g01-q2',
          correctOptionId: 'sz-g01-q2-c',
          explanation: 'Giữa trợ động từ "has" và phân từ hai "improved" cần trạng từ bổ nghĩa cho động từ -> significantly.',
        },
        'sz-g01-q3': {
          questionId: 'sz-g01-q3',
          correctOptionId: 'sz-g01-q3-a',
          explanation: 'Sau tính từ "official" cần danh từ -> recognition (sự ghi nhận chính thức).',
        },
      },
      updatedAt: '2026-11-18T09:00:00.000Z',
    },
    {
      id: 'sz-ex-vocab-01',
      code: 'SZ-VOC-01',
      slug: 'test-1-tu-vung-nhan-su-hop-dong',
      category: 'vocabulary',
      topicId: 'sz-top-vocab-01',
      topicSlug: 'tu-vung-hop-dong-va-tuyen-dung',
      topicTitle: 'Từ vựng Hợp đồng, Nhân sự & Tuyển dụng (Personnel & Contracts)',
      title: 'TEST 1 – Collocations Nhân sự & Hợp đồng',
      subtitle: 'Từ vựng thương mại tần suất cao Part 5–6',
      level: 'Trung cấp (450–600+)',
      durationMinutes: 8,
      instructions: 'Chọn từ vựng phù hợp nhất với ngữ cảnh câu thương mại.',
      status: 'published',
      questions: [
        {
          id: 'sz-v01-q1',
          displayOrder: 1,
          questionText: 'Candidates must meet all minimum _____ listed in the job posting.',
          imageUrl: '',
          audioUrl: '',
          options: [
            { id: 'sz-v01-q1-a', label: 'A', text: 'qualifications' },
            { id: 'sz-v01-q1-b', label: 'B', text: 'locations' },
            { id: 'sz-v01-q1-c', label: 'C', text: 'subscriptions' },
            { id: 'sz-v01-q1-d', label: 'D', text: 'destinations' },
          ],
        },
        {
          id: 'sz-v01-q2',
          displayOrder: 2,
          questionText: 'Both parties signed the lease _____ after reviewing the terms carefully.',
          imageUrl: '',
          audioUrl: '',
          options: [
            { id: 'sz-v01-q2-a', label: 'A', text: 'ingredient' },
            { id: 'sz-v01-q2-b', label: 'B', text: 'agreement' },
            { id: 'sz-v01-q2-c', label: 'C', text: 'compliment' },
            { id: 'sz-v01-q2-d', label: 'D', text: 'compartment' },
          ],
        },
      ],
      answerKeys: {
        'sz-v01-q1': {
          questionId: 'sz-v01-q1',
          correctOptionId: 'sz-v01-q1-a',
          explanation: 'Cụm cố định "meet minimum qualifications" = đáp ứng các tiêu chuẩn/bằng cấp tối thiểu.',
        },
        'sz-v01-q2': {
          questionId: 'sz-v01-q2',
          correctOptionId: 'sz-v01-q2-b',
          explanation: 'Cụm "lease agreement" = hợp đồng thuê mặt bằng/tài sản.',
        },
      },
      updatedAt: '2026-11-19T10:00:00.000Z',
    },
    {
      id: 'sz-ex-lis-01',
      code: 'SZ-LIS-01',
      slug: 'test-1-phan-xa-part-2-wh-questions',
      category: 'listening',
      topicId: 'sz-top-lis-01',
      topicSlug: 'luyen-nghe-hoi-dap-part-2-wh-questions',
      topicTitle: 'Phản xạ Hỏi – Đáp ngắn Part 2 (Who / Where / When / Why)',
      title: 'TEST 1 – Nghe phản xạ Wh-Questions',
      subtitle: 'Luyện nghe bắt từ để hỏi đầu câu',
      level: 'Cơ bản (350+)',
      durationMinutes: 6,
      instructions: 'Nghe đoạn âm thanh và chọn lời hồi đáp phù hợp nhất.',
      status: 'published',
      questions: [
        {
          id: 'sz-l01-q1',
          displayOrder: 1,
          questionText: 'Listen to the question and choose the best response.',
          imageUrl: '',
          audioUrl: STAFF_SZ_DEMO_AUDIO,
          audioDurationSeconds: 2,
          options: [
            { id: 'sz-l01-q1-a', label: 'A', text: 'In Conference Room B on the third floor.' },
            { id: 'sz-l01-q1-b', label: 'B', text: 'Yes, the projector is brand new.' },
            { id: 'sz-l01-q1-c', label: 'C', text: 'About twenty-five pages long.' },
          ],
        },
      ],
      answerKeys: {
        'sz-l01-q1': {
          questionId: 'sz-l01-q1',
          correctOptionId: 'sz-l01-q1-a',
          explanation: 'Câu hỏi "Where" hỏi địa điểm tổ chức cuộc họp -> loại ngay Yes/No ở câu B, chọn cụm nơi chốn ở câu A.',
          audioTranscript: 'Where will the orientation session be held tomorrow morning?',
          audioTranslation: 'Buổi định hướng sáng mai sẽ được tổ chức ở đâu?',
        },
      },
      updatedAt: '2026-11-20T11:00:00.000Z',
    },
  ]
}

export function validateStudyExerciseForPublish(
  exercise: ManagedStudyExerciseRecord,
  context?: {
    existingExercises?: readonly ManagedStudyExerciseRecord[]
    topics?: readonly ManagedStudyTopicRecord[]
  },
): string[] {
  const errors: string[] = []
  const trimmedCode = exercise.code.trim()
  const trimmedSlug = exercise.slug.trim()

  if (!trimmedCode) errors.push('Thiếu mã bài luyện tập.')
  if (!trimmedSlug) {
    errors.push('Thiếu đường dẫn Slug bài luyện tập.')
  } else if (!isValidSlug(trimmedSlug.toLowerCase())) {
    errors.push('Đường dẫn Slug bài luyện tập chỉ được chứa a-z, 0-9 và dấu gạch ngang (-).')
  }
  if (!exercise.title.trim()) errors.push('Thiếu tiêu đề bài luyện tập.')
  if (!exercise.topicId.trim()) errors.push('Chưa chọn chủ đề học tập.')

  if (context?.existingExercises) {
    if (
      trimmedCode &&
      context.existingExercises.some(
        (other) =>
          other.id !== exercise.id &&
          other.code.trim().toUpperCase() === trimmedCode.toUpperCase(),
      )
    ) {
      errors.push(`Mã bài luyện tập "${trimmedCode.toUpperCase()}" đã tồn tại.`)
    }
    if (
      trimmedSlug &&
      context.existingExercises.some(
        (other) =>
          other.id !== exercise.id &&
          other.slug.trim().toLowerCase() === trimmedSlug.toLowerCase(),
      )
    ) {
      errors.push(`Đường dẫn Slug "${trimmedSlug.toLowerCase()}" đã tồn tại.`)
    }
  }

  if (context?.topics && exercise.topicId.trim()) {
    const matchedTopic = context.topics.find((t) => t.id === exercise.topicId)
    if (!matchedTopic) {
      errors.push('Chủ đề gắn kèm không tồn tại trong hệ thống Study Zone.')
    } else if (matchedTopic.category !== exercise.category) {
      errors.push(
        `Chủ đề "${matchedTopic.title}" thuộc danh mục "${matchedTopic.category}", không khớp với danh mục bài tập "${exercise.category}".`,
      )
    }
  }

  if (exercise.questions.length === 0) {
    errors.push('Bài luyện tập phải có ít nhất 1 câu hỏi trước khi xuất bản.')
  }

  const seenQuestionIds = new Set<string>()
  const seenOptionIds = new Set<string>()

  exercise.questions.forEach((q, idx) => {
    const qLabel = `Câu #${idx + 1}`
    if (seenQuestionIds.has(q.id)) {
      errors.push(`${qLabel}: Trùng mã định danh câu hỏi (${q.id}).`)
    }
    seenQuestionIds.add(q.id)

    for (const opt of q.options) {
      if (seenOptionIds.has(opt.id)) {
        errors.push(`${qLabel}: Trùng mã định danh lựa chọn đáp án (${opt.id}).`)
      }
      seenOptionIds.add(opt.id)
    }

    if (!q.questionText.trim() && !q.audioUrl.trim()) {
      errors.push(`${qLabel}: Phải có nội dung câu hỏi hoặc tệp âm thanh.`)
    }
    if (exercise.category === 'listening' && !q.audioUrl.trim()) {
      errors.push(`${qLabel}: Danh mục Luyện nghe bắt buộc có tệp âm thanh.`)
    }
    if (
      q.audioUrl.trim().toLowerCase().startsWith('blob:') ||
      q.imageUrl.trim().toLowerCase().startsWith('blob:')
    ) {
      errors.push(
        `${qLabel}: Tệp media đang ở dạng đường dẫn tạm thời, vui lòng đính kèm URL hợp lệ trước khi xuất bản.`,
      )
    }
    if (q.options.length < 2 || q.options.length > 4 || q.options.some((opt) => !opt.text.trim())) {
      errors.push(`${qLabel}: Cần có từ 2 đến 4 lựa chọn đáp án và không được để trống nội dung.`)
    }
    const key = exercise.answerKeys[q.id]
    if (!key || !q.options.some((o) => o.id === key.correctOptionId)) {
      errors.push(`${qLabel}: Chưa chọn đáp án đúng hợp lệ.`)
    }
  })
  return errors
}

export const learningApi = {
  async listMaterials(): Promise<ManagedMaterialRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedMaterialRecord[]>(STAFF_API_ENDPOINTS.learning.materials)
    }
    await mockDelay(100)
    return readMockCollection(MATERIALS_MOCK_KEY, buildSeedMaterials)
  },

  async upsertMaterial(
    input: Omit<ManagedMaterialRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ManagedMaterialRecord> {
    const normalizedCode = input.code.trim().toUpperCase()
    const normalizedSlug = slugifyVi(input.slug || input.code)

    if (!normalizedCode || !input.title.trim() || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError('Vui lòng nhập đầy đủ Mã học liệu, Tiêu đề và Slug hợp lệ.', 400)
    }

    if (input.accessScope === 'by_course' && !input.courseId?.trim()) {
      throw new StaffApiClientError('Vui lòng chọn Khóa học áp dụng cho học liệu.', 400)
    }
    if (input.accessScope === 'by_class' && !input.classId?.trim()) {
      throw new StaffApiClientError('Vui lòng chọn Lớp đào tạo áp dụng cho học liệu.', 400)
    }

    if (input.status === 'published') {
      if (!input.media || !input.media.url.trim() || input.media.status === 'failed') {
        throw new StaffApiClientError(
          'Học liệu bắt buộc đính kèm tệp media hợp lệ trước khi Xuất bản.',
          400,
        )
      }
    }

    const sanitizedPayload = {
      ...input,
      code: normalizedCode,
      slug: normalizedSlug,
      title: input.title.trim(),
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedMaterialRecord>(
          STAFF_API_ENDPOINTS.learning.materialDetail(input.id),
          sanitizedPayload,
        )
      }
      return staffHttpClient.post<ManagedMaterialRecord>(
        STAFF_API_ENDPOINTS.learning.materials,
        sanitizedPayload,
      )
    }

    await mockDelay()
    const current = readMockCollection(MATERIALS_MOCK_KEY, buildSeedMaterials)
    if (
      current.some((m) => m.id !== input.id && m.code.trim().toUpperCase() === normalizedCode)
    ) {
      throw new StaffApiClientError(`Mã học liệu "${normalizedCode}" đã tồn tại.`, 409)
    }
    if (
      current.some((m) => m.id !== input.id && m.slug.trim().toLowerCase() === normalizedSlug)
    ) {
      throw new StaffApiClientError(`Đường dẫn Slug học liệu "${normalizedSlug}" đã tồn tại.`, 409)
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((m) => m.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy tài liệu.', 404)
      const updated: ManagedMaterialRecord = {
        ...current[idx]!,
        ...sanitizedPayload,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(MATERIALS_MOCK_KEY, next)
      return updated
    }

    const created: ManagedMaterialRecord = {
      ...sanitizedPayload,
      id: createUniqueId('mat'),
      updatedAt: nowIso,
    }
    const next = [created, ...current]
    writeMockCollection(MATERIALS_MOCK_KEY, next)
    return created
  },

  async listSzCategories(): Promise<StudyZoneCategoryMeta[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<StudyZoneCategoryMeta[]>(
        STAFF_API_ENDPOINTS.learning.studyZoneCategories,
      )
    }
    await mockDelay(80)
    const categories = readMockCollection(SZ_CATEGORIES_MOCK_KEY, buildSeedSzCategories)
    const topics = readMockCollection(SZ_TOPICS_MOCK_KEY, buildSeedSzTopics)
    const exercises = readMockCollection(SZ_EXERCISES_MOCK_KEY, buildSeedSzExercises)
    return categories.map((cat) => ({
      ...cat,
      topicsCount: topics.filter((t) => t.category === cat.slug).length,
      exercisesCount: exercises.filter((e) => e.category === cat.slug).length,
    }))
  },

  async updateSzCategoryMeta(
    slug: StudyZoneCategoryMeta['slug'],
    patch: Pick<StudyZoneCategoryMeta, 'name' | 'description' | 'isActive'>,
  ): Promise<StudyZoneCategoryMeta[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<StudyZoneCategoryMeta[]>(
        STAFF_API_ENDPOINTS.learning.studyZoneCategoryDetail(slug),
        patch,
      )
    }
    await mockDelay()
    const current = readMockCollection(SZ_CATEGORIES_MOCK_KEY, buildSeedSzCategories)
    const next = current.map((c) => (c.slug === slug ? { ...c, ...patch, slug: c.slug } : c))
    writeMockCollection(SZ_CATEGORIES_MOCK_KEY, next)
    return next
  },

  async listSzTopics(): Promise<ManagedStudyTopicRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedStudyTopicRecord[]>(
        STAFF_API_ENDPOINTS.learning.studyZoneTopics,
      )
    }
    await mockDelay(80)
    return readMockCollection(SZ_TOPICS_MOCK_KEY, buildSeedSzTopics)
  },

  async upsertSzTopic(
    input: Omit<ManagedStudyTopicRecord, 'id'> & { id?: string },
  ): Promise<ManagedStudyTopicRecord> {
    const normalizedTitle = input.title.trim()
    const normalizedSlug = slugifyVi(input.slug || normalizedTitle)

    if (!normalizedTitle || !normalizedSlug || !isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError('Vui lòng nhập Tên chủ đề và Slug hợp lệ.', 400)
    }

    const payload = {
      ...input,
      title: normalizedTitle,
      slug: normalizedSlug,
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ManagedStudyTopicRecord>(
          STAFF_API_ENDPOINTS.learning.studyZoneTopicDetail(input.id),
          payload,
        )
      }
      return staffHttpClient.post<ManagedStudyTopicRecord>(
        STAFF_API_ENDPOINTS.learning.studyZoneTopics,
        payload,
      )
    }

    await mockDelay()
    const current = readMockCollection(SZ_TOPICS_MOCK_KEY, buildSeedSzTopics)
    if (
      current.some((t) => t.id !== input.id && t.slug.trim().toLowerCase() === normalizedSlug)
    ) {
      throw new StaffApiClientError(`Slug chủ đề "${normalizedSlug}" đã tồn tại.`, 409)
    }

    if (input.id) {
      const idx = current.findIndex((t) => t.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy chủ đề.', 404)
      const updated: ManagedStudyTopicRecord = { ...current[idx]!, ...payload, id: input.id }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(SZ_TOPICS_MOCK_KEY, next)
      return updated
    }
    const created: ManagedStudyTopicRecord = {
      ...payload,
      id: createUniqueId('topic'),
    }
    const next = [...current, created]
    writeMockCollection(SZ_TOPICS_MOCK_KEY, next)
    return created
  },

  async listSzExercises(): Promise<ManagedStudyExerciseRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedStudyExerciseRecord[]>(
        STAFF_API_ENDPOINTS.learning.studyZoneExercises,
      )
    }
    await mockDelay(100)
    return readMockCollection(SZ_EXERCISES_MOCK_KEY, buildSeedSzExercises)
  },

  async getSzExerciseById(id: string): Promise<ManagedStudyExerciseRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedStudyExerciseRecord>(
        STAFF_API_ENDPOINTS.learning.studyZoneExerciseDetail(id),
      )
    }
    await mockDelay(80)
    const list = readMockCollection(SZ_EXERCISES_MOCK_KEY, buildSeedSzExercises)
    const found = list.find((e) => e.id === id)
    if (!found) {
      throw new StaffApiClientError('Không tìm thấy bài luyện tập Study Zone.', 404)
    }
    return found
  },

  async saveSzExercise(
    input: Omit<ManagedStudyExerciseRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ManagedStudyExerciseRecord> {
    const normalizedCode = input.code.trim().toUpperCase()
    const normalizedSlug = slugifyVi(input.slug || input.code)

    if (!normalizedCode || !normalizedSlug || !isValidSlug(normalizedSlug) || !input.title.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập đầy đủ Mã bài tập, Tiêu đề và Đường dẫn Slug.',
        400,
      )
    }
    if (!input.topicId.trim()) {
      throw new StaffApiClientError('Bài luyện tập bắt buộc gắn với một Chủ đề hợp lệ.', 400)
    }

    const sanitized = {
      ...input,
      code: normalizedCode,
      slug: normalizedSlug,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
    }

    if (!USE_STAFF_MOCK_API) {
      if (sanitized.status === 'published') {
        const tempRecord: ManagedStudyExerciseRecord = {
          ...sanitized,
          id: input.id ?? 'temp',
          updatedAt: '',
        }
        const errs = validateStudyExerciseForPublish(tempRecord)
        if (errs.length > 0) {
          throw new StaffApiClientError(errs[0] ?? 'Bài luyện tập chưa đủ điều kiện xuất bản.', 400)
        }
      }
      if (input.id) {
        return staffHttpClient.put<ManagedStudyExerciseRecord>(
          STAFF_API_ENDPOINTS.learning.studyZoneExerciseDetail(input.id),
          sanitized,
        )
      }
      return staffHttpClient.post<ManagedStudyExerciseRecord>(
        STAFF_API_ENDPOINTS.learning.studyZoneExercises,
        sanitized,
      )
    }

    await mockDelay()
    const current = readMockCollection(SZ_EXERCISES_MOCK_KEY, buildSeedSzExercises)
    const topics = readMockCollection(SZ_TOPICS_MOCK_KEY, buildSeedSzTopics)

    if (
      current.some((e) => e.id !== input.id && e.code.trim().toUpperCase() === normalizedCode)
    ) {
      throw new StaffApiClientError(`Mã bài luyện tập "${normalizedCode}" đã tồn tại.`, 409)
    }
    if (
      current.some((e) => e.id !== input.id && e.slug.trim().toLowerCase() === normalizedSlug)
    ) {
      throw new StaffApiClientError(`Đường dẫn Slug "${normalizedSlug}" đã tồn tại.`, 409)
    }

    const matchedTopic = topics.find((t) => t.id === sanitized.topicId)
    if (!matchedTopic) {
      throw new StaffApiClientError('Chủ đề học tập đã chọn không tồn tại.', 400)
    }
    if (matchedTopic.category !== sanitized.category) {
      throw new StaffApiClientError(
        `Chủ đề "${matchedTopic.title}" không khớp với danh mục kỹ năng "${sanitized.category}".`,
        400,
      )
    }

    if (sanitized.status === 'published') {
      const tempRecord: ManagedStudyExerciseRecord = {
        ...sanitized,
        id: input.id ?? 'temp',
        updatedAt: '',
      }
      const errs = validateStudyExerciseForPublish(tempRecord, {
        existingExercises: current,
        topics,
      })
      if (errs.length > 0) {
        throw new StaffApiClientError(errs[0] ?? 'Bài luyện tập chưa đủ điều kiện xuất bản.', 400)
      }
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((e) => e.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy bài luyện tập.', 404)
      const updated: ManagedStudyExerciseRecord = {
        ...current[idx]!,
        ...sanitized,
        topicSlug: matchedTopic.slug,
        topicTitle: matchedTopic.title,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(SZ_EXERCISES_MOCK_KEY, next)
      return updated
    }

    const created: ManagedStudyExerciseRecord = {
      ...sanitized,
      topicSlug: matchedTopic.slug,
      topicTitle: matchedTopic.title,
      id: createUniqueId('ex-sz'),
      updatedAt: nowIso,
    }
    const next = [created, ...current]
    writeMockCollection(SZ_EXERCISES_MOCK_KEY, next)
    return created
  },
}
