import type {
  PublicScoreConversionPointDto,
  PublicStudentTestDto,
  PublicTestPartDto,
  TestDifficulty,
} from '@english-center/contracts'
import { isValidSlug } from '@english-center/utils'
import {
  getActiveConversionTableSync,
  getActiveScaleCodeSync,
} from '@/features/toeic-config/api/toeicConfigApi'
import type { VerifiedConversionRow } from '@/features/toeic-config/types/toeicConfig.types'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import {
  TOEIC_PARTS_META,
  type AuthoringAnswerKey,
  type AuthoringOption,
  type AuthoringQuestion,
  type AuthoringQuestionGroup,
  type AuthoringTestPart,
  type AuthoringTestStatus,
  type ManagedToeicTestRecord,
  type TestPublishValidationResult,
  type TestVersionSnapshot,
  type ToeicPartNumber,
  type ValidationIssue,
} from '@/features/learning/types/testAuthoring.types'

export const TOEIC_TESTS_MOCK_KEY = 'ec_staff_mock_toeic_tests_v6'

function buildStaffTestWavDataUrl(freqHz = 523): string {
  const sampleRate = 8000
  const numSamples = 16000 // 2s
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
    const env = Math.min(1, (numSamples - i) / 2000)
    view.setUint8(44 + i, 128 + Math.round(55 * env * Math.sin(2 * Math.PI * freqHz * t)))
  }
  let bin = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]!)
  return `data:audio/wav;base64,${btoa(bin)}`
}

const STAFF_TEST_AUDIO_SAMPLE = buildStaffTestWavDataUrl(523)

function buildEmptyTestsStore(): ManagedToeicTestRecord[] {
  return [
    {
      id: 'test-2026-01',
      code: 'EC-2026-T01',
      slug: 'toeic-test-01-2026',
      title: 'TEST 1 – 2026 (Đề chuẩn cấu trúc ETS Full 7 Parts)',
      collectionGroup: '2026 Official Practice Set',
      skillCategory: 'listening_reading',
      difficulty: 'Nâng cao (750+)',
      testType: 'Full Test 7 Parts',
      durationMinutes: 120,
      standardTotalQuestions: 200,
      allowPartSelection: true,
      availableDurationOptions: [30, 45, 60, 90, 120],
      thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
      description:
        'Đề thi chuẩn cấu trúc 7 Parts TOEIC Listening & Reading dùng cho học viên luyện thi trực tuyến và đánh giá năng lực định kỳ.',
      generalInstructions: [
        'Phần Listening (Part 1 – Part 4) phát âm thanh một lần duy nhất theo đúng quy chế phòng thi.',
        'Phần Reading (Part 5 – Part 7) cho phép chuyển câu tự do và đánh dấu câu cần xem lại.',
      ],
      status: 'published',
      attemptsCount: 1248,
      activeVersionNumber: 1,
      scoreScaleVersionCode: 'ETS-LR-990',
      versionHistory: [
        {
          versionNumber: 1,
          versionCode: 'EC-2026-T01@v1',
          publishedAt: '2026-11-05T08:00:00.000Z',
          publishedBy: 'Nguyễn Hoàng Nam',
          totalQuestions: 7,
          scoreScaleVersionCode: 'ETS-LR-990',
          changeNote: 'Xuất bản chính thức bộ đề luyện tập đợt 1 năm 2026.',
        },
      ],
      parts: [
        {
          partNumber: 1,
          partName: 'Part 1: Photographs',
          section: 'listening',
          groupedMode: false,
          allowStandaloneSelection: true,
          instructions: 'Nghe 4 câu mô tả bức hình và chọn đáp án đúng nhất.',
          groups: [
            {
              id: 'st-t01-g1',
              partNumber: 1,
              groupTitle: 'Photographs – Câu 1',
              passageText: '',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q1',
                  questionNumber: 1,
                  partNumber: 1,
                  groupId: 'st-t01-g1',
                  questionText: '',
                  audioUrl: STAFF_TEST_AUDIO_SAMPLE,
                  audioDurationSeconds: 2,
                  imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600',
                  displayOrder: 1,
                  options: [
                    { id: 'st-t01-q1-a', label: 'A', text: 'They are reviewing documents at a table.' },
                    { id: 'st-t01-q1-b', label: 'B', text: 'They are boarding a commuter train.' },
                    { id: 'st-t01-q1-c', label: 'C', text: 'A presenter is hanging a banner on the wall.' },
                    { id: 'st-t01-q1-d', label: 'D', text: 'The chairs are stacked in the corner.' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 2,
          partName: 'Part 2: Question-Response',
          section: 'listening',
          groupedMode: false,
          allowStandaloneSelection: true,
          instructions: 'Nghe câu hỏi và 3 phương án trả lời A, B, C.',
          groups: [
            {
              id: 'st-t01-g2',
              partNumber: 2,
              groupTitle: 'Question-Response – Câu 2',
              passageText: '',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q2',
                  questionNumber: 2,
                  partNumber: 2,
                  groupId: 'st-t01-g2',
                  questionText: '',
                  audioUrl: STAFF_TEST_AUDIO_SAMPLE,
                  audioDurationSeconds: 2,
                  imageUrl: '',
                  displayOrder: 2,
                  options: [
                    { id: 'st-t01-q2-a', label: 'A', text: 'By Wednesday afternoon at the latest.' },
                    { id: 'st-t01-q2-b', label: 'B', text: 'At the main reception desk.' },
                    { id: 'st-t01-q2-c', label: 'C', text: 'Yes, I met Mr. Kim last week.' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 3,
          partName: 'Part 3: Conversations',
          section: 'listening',
          groupedMode: true,
          allowStandaloneSelection: true,
          instructions: 'Nghe đoạn hội thoại và trả lời câu hỏi.',
          groups: [
            {
              id: 'st-t01-g3',
              partNumber: 3,
              groupTitle: 'Hội thoại phòng Nhân sự',
              passageText: '',
              audioUrl: STAFF_TEST_AUDIO_SAMPLE,
              audioDurationSeconds: 2,
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q3',
                  questionNumber: 3,
                  partNumber: 3,
                  groupId: 'st-t01-g3',
                  questionText: 'What are the speakers mainly discussing?',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 3,
                  options: [
                    { id: 'st-t01-q3-a', label: 'A', text: 'An upcoming staff training workshop' },
                    { id: 'st-t01-q3-b', label: 'B', text: 'A software license renewal' },
                    { id: 'st-t01-q3-c', label: 'C', text: 'A warehouse inventory check' },
                    { id: 'st-t01-q3-d', label: 'D', text: 'A flight itinerary change' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 4,
          partName: 'Part 4: Talks',
          section: 'listening',
          groupedMode: true,
          allowStandaloneSelection: true,
          instructions: 'Nghe bài thông báo ngắn và chọn đáp án đúng.',
          groups: [
            {
              id: 'st-t01-g4',
              partNumber: 4,
              groupTitle: 'Thông báo bảo trì tòa nhà',
              passageText: '',
              audioUrl: STAFF_TEST_AUDIO_SAMPLE,
              audioDurationSeconds: 2,
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q4',
                  questionNumber: 4,
                  partNumber: 4,
                  groupId: 'st-t01-g4',
                  questionText: 'What are listeners asked to do before leaving today?',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 4,
                  options: [
                    { id: 'st-t01-q4-a', label: 'A', text: 'Shut down their desktop computers' },
                    { id: 'st-t01-q4-b', label: 'B', text: 'Return parking passes to security' },
                    { id: 'st-t01-q4-c', label: 'C', text: 'Submit travel expense receipts' },
                    { id: 'st-t01-q4-d', label: 'D', text: 'Move vehicles from the north lot' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 5,
          partName: 'Part 5: Incomplete Sentences',
          section: 'reading',
          groupedMode: false,
          allowStandaloneSelection: true,
          instructions: 'Chọn từ hoặc cụm từ đúng nhất điền vào chỗ trống.',
          groups: [
            {
              id: 'st-t01-g5',
              partNumber: 5,
              groupTitle: 'Grammar & Vocabulary Part 5',
              passageText: '',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q5',
                  questionNumber: 5,
                  partNumber: 5,
                  groupId: 'st-t01-g5',
                  questionText: 'Please review the attached safety guidelines _____ operating the machinery.',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 5,
                  options: [
                    { id: 'st-t01-q5-a', label: 'A', text: 'prior' },
                    { id: 'st-t01-q5-b', label: 'B', text: 'before' },
                    { id: 'st-t01-q5-c', label: 'C', text: 'unless' },
                    { id: 'st-t01-q5-d', label: 'D', text: 'earlier' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 6,
          partName: 'Part 6: Text Completion',
          section: 'reading',
          groupedMode: true,
          allowStandaloneSelection: true,
          instructions: 'Đọc đoạn thông báo và chọn từ phù hợp điền vào chỗ trống.',
          groups: [
            {
              id: 'st-t01-g6',
              partNumber: 6,
              groupTitle: 'Thông báo nâng cấp hệ thống thư viện',
              passageText:
                'To all library members: Beginning December 1, our online reservation portal will feature an upgraded search interface. Members will be able to renew borrowed items _____ from their mobile devices.',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q6',
                  questionNumber: 6,
                  partNumber: 6,
                  groupId: 'st-t01-g6',
                  questionText: 'Select the best word to complete the blank in the notice.',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 6,
                  options: [
                    { id: 'st-t01-q6-a', label: 'A', text: 'convenient' },
                    { id: 'st-t01-q6-b', label: 'B', text: 'convenience' },
                    { id: 'st-t01-q6-c', label: 'C', text: 'conveniently' },
                    { id: 'st-t01-q6-d', label: 'D', text: 'convened' },
                  ],
                },
              ],
            },
          ],
        },
        {
          partNumber: 7,
          partName: 'Part 7: Reading Comprehension',
          section: 'reading',
          groupedMode: true,
          allowStandaloneSelection: true,
          instructions: 'Đọc email thương mại và trả lời câu hỏi đọc hiểu.',
          groups: [
            {
              id: 'st-t01-g7',
              partNumber: 7,
              groupTitle: 'Email xác nhận lịch giao thiết bị văn phòng',
              passageText:
                'From: orders@apexoffice.com\nTo: h.tran@englishcenter.edu.vn\nSubject: Delivery Confirmation #AO-4821\n\nDear Ms. Tran,\nYour order of twelve ergonomic chairs and two conference tables is scheduled for delivery on Thursday, November 28, between 9:00 A.M. and 11:30 A.M.',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t01-q7',
                  questionNumber: 7,
                  partNumber: 7,
                  groupId: 'st-t01-g7',
                  questionText: 'When is the office furniture scheduled to arrive?',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 7,
                  options: [
                    { id: 'st-t01-q7-a', label: 'A', text: 'On Thursday morning' },
                    { id: 'st-t01-q7-b', label: 'B', text: 'On Friday afternoon' },
                    { id: 'st-t01-q7-c', label: 'C', text: 'Next Monday at noon' },
                    { id: 'st-t01-q7-d', label: 'D', text: 'Within thirty business days' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      answerKeys: {
        'st-t01-q1': { questionId: 'st-t01-q1', correctOptionId: 'st-t01-q1-a', explanation: 'Các thành viên đang cùng xem tài liệu quanh bàn họp.' },
        'st-t01-q2': { questionId: 'st-t01-q2', correctOptionId: 'st-t01-q2-a', explanation: 'Câu hỏi When về thời hạn nộp báo cáo -> trả lời mốc thời gian By Wednesday afternoon.' },
        'st-t01-q3': { questionId: 'st-t01-q3', correctOptionId: 'st-t01-q3-a', explanation: 'Hai nhân sự trao đổi về lịch tập huấn nhân viên mới.' },
        'st-t01-q4': { questionId: 'st-t01-q4', correctOptionId: 'st-t01-q4-a', explanation: 'Bộ phận IT nhắc tắt máy tính để cập nhật điện nguồn tối nay.' },
        'st-t01-q5': { questionId: 'st-t01-q5', correctOptionId: 'st-t01-q5-b', explanation: 'Before + V-ing (operating); prior phải đi kèm giới từ to.' },
        'st-t01-q6': { questionId: 'st-t01-q6', correctOptionId: 'st-t01-q6-c', explanation: 'Cần trạng từ conveniently bổ nghĩa cho động từ renew.' },
        'st-t01-q7': { questionId: 'st-t01-q7', correctOptionId: 'st-t01-q7-a', explanation: 'Khung giờ 9:00 A.M. – 11:30 A.M. thứ Năm tương ứng Thursday morning.' },
      },
      updatedAt: '2026-11-20T09:00:00.000Z',
    },
    {
      id: 'test-2026-02',
      code: 'EC-MINI-02',
      slug: 'toeic-mini-test-02-2026',
      title: 'MINI TEST 02 – Đánh giá nhanh Ngữ pháp & Đọc hiểu (30 phút)',
      collectionGroup: '2026 Quick Assessment',
      skillCategory: 'listening_reading',
      difficulty: 'Trung cấp (550+)',
      testType: 'Mini Test',
      durationMinutes: 30,
      standardTotalQuestions: 50,
      allowPartSelection: true,
      availableDurationOptions: [15, 30, 45],
      thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
      description: 'Đề kiểm tra ngắn đánh giá tốc độ xử lý câu đơn Part 5 và đọc lướt thông báo Part 6.',
      generalInstructions: ['Hoàn thành toàn bộ câu hỏi trong thời gian 30 phút.'],
      status: 'published',
      attemptsCount: 642,
      activeVersionNumber: 1,
      scoreScaleVersionCode: 'ETS-LR-990',
      versionHistory: [
        {
          versionNumber: 1,
          versionCode: 'EC-MINI-02@v1',
          publishedAt: '2026-11-12T08:00:00.000Z',
          publishedBy: 'Nguyễn Hoàng Nam',
          totalQuestions: 2,
          scoreScaleVersionCode: 'ETS-LR-990',
          changeNote: 'Phát hành đề đánh giá nhanh đầu vào.',
        },
      ],
      parts: [
        {
          partNumber: 5,
          partName: 'Part 5: Incomplete Sentences',
          section: 'reading',
          groupedMode: false,
          allowStandaloneSelection: true,
          instructions: 'Chọn đáp án đúng nhất A, B, C hoặc D.',
          groups: [
            {
              id: 'st-t02-g5',
              partNumber: 5,
              groupTitle: 'Mini Test Reading Set',
              passageText: '',
              audioUrl: '',
              imageUrl: '',
              displayOrder: 1,
              questions: [
                {
                  id: 'st-t02-q1',
                  questionNumber: 1,
                  partNumber: 5,
                  groupId: 'st-t02-g5',
                  questionText: 'Attendance at Monday morning’s orientation is _____ for all new interns.',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 1,
                  options: [
                    { id: 'st-t02-q1-a', label: 'A', text: 'mandatory' },
                    { id: 'st-t02-q1-b', label: 'B', text: 'mandate' },
                    { id: 'st-t02-q1-c', label: 'C', text: 'mandatedly' },
                    { id: 'st-t02-q1-d', label: 'D', text: 'mandates' },
                  ],
                },
                {
                  id: 'st-t02-q2',
                  questionNumber: 2,
                  partNumber: 5,
                  groupId: 'st-t02-g5',
                  questionText: 'Complimentary refreshments will be served _____ the intermission.',
                  audioUrl: '',
                  imageUrl: '',
                  displayOrder: 2,
                  options: [
                    { id: 'st-t02-q2-a', label: 'A', text: 'while' },
                    { id: 'st-t02-q2-b', label: 'B', text: 'during' },
                    { id: 'st-t02-q2-c', label: 'C', text: 'when' },
                    { id: 'st-t02-q2-d', label: 'D', text: 'whereas' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      answerKeys: {
        'st-t02-q1': { questionId: 'st-t02-q1', correctOptionId: 'st-t02-q1-a', explanation: 'Sau động từ to be "is" cần tính từ mandatory (bắt buộc).' },
        'st-t02-q2': { questionId: 'st-t02-q2', correctOptionId: 'st-t02-q2-b', explanation: 'Giới từ during + cụm danh từ chỉ khoảng thời gian "the intermission".' },
      },
      updatedAt: '2026-11-18T10:30:00.000Z',
    },
    {
      id: 'test-2026-03-draft',
      code: 'EC-2026-T03',
      slug: 'toeic-practice-test-03-2026',
      title: 'TEST 3 – 2026 (Bản nháp đang biên soạn Quý 1/2027)',
      collectionGroup: '2026 Official Practice Set',
      skillCategory: 'listening_reading',
      difficulty: 'Khá (650+)',
      testType: 'Luyện chuyên sâu',
      durationMinutes: 60,
      standardTotalQuestions: 100,
      allowPartSelection: true,
      availableDurationOptions: [30, 60],
      thumbnail: '',
      description: 'Đề thi đang trong quá trình thẩm định câu hỏi trước khi xuất bản.',
      generalInstructions: ['Đọc kỹ hướng dẫn từng phần trước khi bắt đầu.'],
      status: 'draft',
      attemptsCount: 0,
      activeVersionNumber: 1,
      scoreScaleVersionCode: 'ETS-LR-990',
      versionHistory: [],
      parts: buildEmptyPartsTemplate(),
      answerKeys: {},
      updatedAt: '2026-11-26T15:00:00.000Z',
    },
  ]
}

export function clonePartsDeep(parts: readonly AuthoringTestPart[]): AuthoringTestPart[] {
  return parts.map((part) => ({
    ...part,
    groups: part.groups.map((grp) => ({
      ...grp,
      passages: grp.passages ? [...grp.passages] : undefined,
      questions: grp.questions.map((q) => ({
        ...q,
        options: q.options.map((opt) => ({ ...opt })),
      })),
    })),
  }))
}

export function cloneAnswerKeysDeep(
  keys: Readonly<Record<string, AuthoringAnswerKey>>,
): Record<string, AuthoringAnswerKey> {
  const cloned: Record<string, AuthoringAnswerKey> = {}
  for (const [qId, item] of Object.entries(keys)) {
    cloned[qId] = { ...item }
  }
  return cloned
}

export function isBrokenMediaUrl(rawUrl: string): boolean {
  const v = rawUrl.trim()
  if (!v) return false
  const lower = v.toLowerCase()
  if (lower.startsWith('failed:') || lower.includes('upload-failed') || lower === 'error') {
    return true
  }
  return !(
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('/')
  )
}

function isBlobMediaUrl(rawUrl: string): boolean {
  return rawUrl.trim().toLowerCase().startsWith('blob:')
}

function collectBrokenMediaErrors(test: ManagedToeicTestRecord): string[] {
  const broken: string[] = []
  if (isBrokenMediaUrl(test.thumbnail)) {
    broken.push('Ảnh đại diện đề thi bị lỗi hoặc sai định dạng URL.')
  }
  for (const part of test.parts) {
    for (const grp of part.groups) {
      if (isBrokenMediaUrl(grp.audioUrl)) {
        broken.push(
          `${part.partName}: Tệp âm thanh nhóm "${grp.groupTitle || grp.id}" bị lỗi tải lên.`,
        )
      }
      if (isBrokenMediaUrl(grp.imageUrl)) {
        broken.push(
          `${part.partName}: Hình ảnh nhóm "${grp.groupTitle || grp.id}" bị lỗi tải lên.`,
        )
      }
      for (const q of grp.questions) {
        if (isBrokenMediaUrl(q.audioUrl)) {
          broken.push(
            `Câu #${q.questionNumber} (Part ${part.partNumber}): Tệp âm thanh bị lỗi tải lên.`,
          )
        }
        if (isBrokenMediaUrl(q.imageUrl)) {
          broken.push(
            `Câu #${q.questionNumber} (Part ${part.partNumber}): Hình ảnh bị lỗi tải lên.`,
          )
        }
      }
    }
  }
  return broken
}

export function buildEmptyPartsTemplate(): AuthoringTestPart[] {
  return TOEIC_PARTS_META.map((meta) => ({
    partNumber: meta.partNumber,
    partName: meta.partName,
    section: meta.section,
    groupedMode: meta.groupedMode,
    allowStandaloneSelection: true,
    instructions: meta.defaultInstructions,
    groups: [],
  }))
}

export function createOptionsForPart(
  qId: string,
  partNumber: ToeicPartNumber,
  texts?: readonly string[],
): AuthoringOption[] {
  const labels: readonly ('A' | 'B' | 'C' | 'D')[] =
    partNumber === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']
  return labels.map((label, idx) => ({
    id: `${qId}-${label.toLowerCase()}`,
    label,
    text: texts?.[idx] ?? '',
  }))
}

export function renumberTestQuestions(parts: AuthoringTestPart[]): AuthoringTestPart[] {
  let seq = 0
  return parts.map((part) => ({
    ...part,
    groups: part.groups.map((grp, gIdx) => ({
      ...grp,
      displayOrder: gIdx + 1,
      questions: grp.questions.map((q) => {
        seq += 1
        return {
          ...q,
          partNumber: part.partNumber,
          groupId: grp.id,
          questionNumber: seq,
          displayOrder: seq,
        }
      }),
    })),
  }))
}

export function countTestQuestions(parts: readonly AuthoringTestPart[]): number {
  return parts.reduce(
    (sum, p) => sum + p.groups.reduce((gSum, g) => gSum + g.questions.length, 0),
    0,
  )
}

export function getAuthoringEditableTest(record: ManagedToeicTestRecord): ManagedToeicTestRecord {
  if (!record.workingDraft) return record
  return {
    ...record,
    parts: clonePartsDeep(record.workingDraft.parts),
    answerKeys: cloneAnswerKeysDeep(record.workingDraft.answerKeys),
  }
}

export function isImmutableVersionProtected(record: ManagedToeicTestRecord): boolean {
  return (
    record.status === 'published' ||
    record.attemptsCount > 0 ||
    record.versionHistory.length > 0
  )
}

export function getTargetPublishVersionNumber(record: ManagedToeicTestRecord): number {
  if (record.workingDraft) {
    return record.workingDraft.versionNumber
  }
  if (record.status === 'published' || (record.attemptsCount > 0 && record.status !== 'draft')) {
    return record.activeVersionNumber + 1
  }
  if (record.versionHistory.some((v) => v.versionNumber === record.activeVersionNumber)) {
    return record.activeVersionNumber + 1
  }
  return record.activeVersionNumber
}

function ensureLiveVersionSnapshotPreserved(record: ManagedToeicTestRecord): TestVersionSnapshot[] {
  if (!isImmutableVersionProtected(record)) {
    return record.versionHistory
  }
  const existingIdx = record.versionHistory.findIndex(
    (v) => v.versionNumber === record.activeVersionNumber,
  )
  if (existingIdx !== -1) {
    const existing = record.versionHistory[existingIdx]!
    if (existing.partsSnapshot && existing.answerKeysSnapshot) {
      return record.versionHistory
    }
    const hydrated: TestVersionSnapshot = {
      ...existing,
      partsSnapshot: existing.partsSnapshot ?? clonePartsDeep(record.parts),
      answerKeysSnapshot: existing.answerKeysSnapshot ?? cloneAnswerKeysDeep(record.answerKeys),
    }
    const nextHistory = [...record.versionHistory]
    nextHistory[existingIdx] = hydrated
    return nextHistory
  }

  const fallbackSnapshot: TestVersionSnapshot = {
    versionNumber: record.activeVersionNumber,
    versionCode: `${record.code}@v${record.activeVersionNumber}`,
    publishedAt: record.updatedAt,
    publishedBy: 'Hệ thống bảo toàn lịch sử',
    totalQuestions: countTestQuestions(record.parts),
    scoreScaleVersionCode: record.scoreScaleVersionCode,
    changeNote: `Bản chụp bất biến tự động bảo vệ phiên bản v${record.activeVersionNumber}.`,
    partsSnapshot: clonePartsDeep(record.parts),
    answerKeysSnapshot: cloneAnswerKeysDeep(record.answerKeys),
  }
  return [fallbackSnapshot, ...record.versionHistory]
}

export function validateTestBeforePublish(
  test: ManagedToeicTestRecord,
  existingTests?: readonly ManagedToeicTestRecord[],
): TestPublishValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  if (test.skillCategory !== 'listening_reading') {
    errors.push({
      id: 'err-skill',
      severity: 'error',
      message:
        'Hệ thống khảo thí hiện chỉ phát hành định dạng TOEIC Listening & Reading.',
    })
  }

  const trimmedCode = test.code.trim()
  const trimmedSlug = test.slug.trim()

  if (!trimmedCode || !test.title.trim() || !trimmedSlug) {
    errors.push({
      id: 'err-meta',
      severity: 'error',
      message: 'Thiếu Mã đề thi, Tên đề thi hoặc Đường dẫn Slug.',
    })
  }

  if (trimmedSlug && !isValidSlug(trimmedSlug.toLowerCase())) {
    errors.push({
      id: 'err-slug-format',
      severity: 'error',
      message: 'Đường dẫn Slug chỉ được chứa chữ thường a-z, số 0-9 và dấu gạch ngang (-).',
    })
  }

  if (existingTests) {
    if (
      trimmedCode &&
      existingTests.some(
        (other) =>
          other.id !== test.id &&
          other.code.trim().toUpperCase() === trimmedCode.toUpperCase(),
      )
    ) {
      errors.push({
        id: 'err-dup-code',
        severity: 'error',
        message: `Mã đề thi "${trimmedCode.toUpperCase()}" đã tồn tại trong ngân hàng đề.`,
      })
    }
    if (
      trimmedSlug &&
      existingTests.some(
        (other) =>
          other.id !== test.id &&
          other.slug.trim().toLowerCase() === trimmedSlug.toLowerCase(),
      )
    ) {
      errors.push({
        id: 'err-dup-slug',
        severity: 'error',
        message: `Đường dẫn Slug "${trimmedSlug.toLowerCase()}" đã tồn tại trong ngân hàng đề.`,
      })
    }
  }

  if (isBrokenMediaUrl(test.thumbnail)) {
    errors.push({
      id: 'err-broken-thumb',
      severity: 'error',
      message: 'Ảnh đại diện đề thi bị lỗi tải lên hoặc URL không hợp lệ.',
    })
  }
  if (isBlobMediaUrl(test.thumbnail)) {
    errors.push({
      id: 'err-blob-thumb',
      severity: 'error',
      message:
        'Ảnh đại diện đề thi đang dùng đường dẫn tạm thời. Vui lòng nhập URL bền vững trước khi xuất bản.',
    })
  }

  const computedTotalQuestions = countTestQuestions(test.parts)
  if (computedTotalQuestions === 0) {
    errors.push({
      id: 'err-zero-q',
      severity: 'error',
      message: 'Đề thi chưa có bất kỳ câu hỏi nào.',
    })
  }

  const seenGroupIds = new Set<string>()
  const seenQuestionIds = new Set<string>()
  const seenOptionIds = new Set<string>()

  for (const part of test.parts) {
    const partQuestionCount = part.groups.reduce((s, g) => s + g.questions.length, 0)

    if (test.testType === 'Full Test 7 Parts' && partQuestionCount === 0) {
      errors.push({
        id: `err-empty-part-${part.partNumber}`,
        severity: 'error',
        partNumber: part.partNumber,
        message: `${part.partName}: Đề loại "Full Test 7 Parts" bắt buộc có ít nhất 1 câu hỏi ở mọi Part.`,
      })
    }

    for (const grp of part.groups) {
      if (seenGroupIds.has(grp.id)) {
        errors.push({
          id: `err-dup-grp-${part.partNumber}-${grp.id}`,
          severity: 'error',
          partNumber: part.partNumber,
          message: `${part.partName}: Phát hiện trùng mã định danh nhóm câu hỏi (${grp.id}).`,
        })
      }
      seenGroupIds.add(grp.id)

      if (isBrokenMediaUrl(grp.audioUrl) || isBrokenMediaUrl(grp.imageUrl)) {
        errors.push({
          id: `err-grp-media-${grp.id}`,
          severity: 'error',
          partNumber: part.partNumber,
          message: `${part.partName}: Tệp media của nhóm "${grp.groupTitle || grp.id}" bị lỗi tải lên hoặc sai định dạng.`,
        })
      }
      if (isBlobMediaUrl(grp.audioUrl) || isBlobMediaUrl(grp.imageUrl)) {
        errors.push({
          id: `err-grp-blob-${grp.id}`,
          severity: 'error',
          partNumber: part.partNumber,
          message: `${part.partName}: Tệp media của nhóm "${grp.groupTitle || grp.id}" đang dùng URL tạm thời, không thể xuất bản.`,
        })
      }

      if (grp.questions.length === 0) {
        errors.push({
          id: `err-empty-grp-${grp.id}`,
          severity: 'error',
          partNumber: part.partNumber,
          message: `${part.partName}: Nhóm câu hỏi "${grp.groupTitle || grp.id}" đang rỗng (không có câu hỏi con).`,
        })
      }

      if (
        (part.partNumber === 6 || part.partNumber === 7) &&
        !grp.passageText.trim() &&
        !grp.imageUrl.trim() &&
        !(grp.passages && grp.passages.some((p) => p.trim()))
      ) {
        errors.push({
          id: `err-passage-${grp.id}`,
          severity: 'error',
          partNumber: part.partNumber,
          message: `${part.partName}: Nhóm "${grp.groupTitle}" thiếu nội dung đoạn văn đọc hiểu hoặc ảnh văn bản.`,
        })
      }

      for (const q of grp.questions) {
        const qTag = `Câu #${q.questionNumber} (Part ${part.partNumber})`
        const expectedOpts = part.partNumber === 2 ? 3 : 4

        if (seenQuestionIds.has(q.id)) {
          errors.push({
            id: `err-dup-q-${part.partNumber}-${q.questionNumber}-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Phát hiện trùng mã định danh câu hỏi (${q.id}).`,
          })
        }
        seenQuestionIds.add(q.id)

        for (const opt of q.options) {
          if (seenOptionIds.has(opt.id)) {
            errors.push({
              id: `err-dup-opt-${q.questionNumber}-${opt.id}`,
              severity: 'error',
              partNumber: part.partNumber,
              message: `${qTag}: Phát hiện trùng mã định danh lựa chọn đáp án (${opt.id}).`,
            })
          }
          seenOptionIds.add(opt.id)
        }

        if (isBrokenMediaUrl(q.audioUrl) || isBrokenMediaUrl(q.imageUrl)) {
          errors.push({
            id: `err-q-media-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Tệp âm thanh hoặc hình ảnh đính kèm bị lỗi tải lên.`,
          })
        }
        if (isBlobMediaUrl(q.audioUrl) || isBlobMediaUrl(q.imageUrl)) {
          errors.push({
            id: `err-q-blob-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Tệp âm thanh hoặc hình ảnh đang dùng URL tạm thời, không thể xuất bản.`,
          })
        }

        if (q.groupId !== grp.id) {
          errors.push({
            id: `err-orphan-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Liên kết nhóm câu hỏi không khớp.`,
          })
        }

        if (q.options.length !== expectedOpts) {
          errors.push({
            id: `err-optcount-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Yêu cầu đúng ${expectedOpts} lựa chọn đáp án.`,
          })
        }

        if (part.partNumber >= 3 && q.options.some((o) => !o.text.trim())) {
          errors.push({
            id: `err-opttext-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Các lựa chọn A, B, C, D ở Part ${part.partNumber} không được để trống nội dung.`,
          })
        }

        if (part.partNumber >= 3 && !q.questionText.trim()) {
          errors.push({
            id: `err-stem-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Thiếu nội dung câu hỏi.`,
          })
        }

        if (part.section === 'listening' && !q.audioUrl.trim() && !grp.audioUrl.trim()) {
          errors.push({
            id: `err-audio-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Câu hỏi Listening bắt buộc có tệp âm thanh ở cấp Câu hỏi hoặc Nhóm câu hỏi.`,
          })
        }

        if (part.partNumber === 1 && !q.imageUrl.trim()) {
          errors.push({
            id: `err-p1-img-${q.id}`,
            severity: 'error',
            partNumber: 1,
            message: `${qTag}: Câu mô tả tranh Part 1 bắt buộc đính kèm hình ảnh.`,
          })
        }

        const key = test.answerKeys[q.id]
        if (!key || !q.options.some((o) => o.id === key.correctOptionId)) {
          errors.push({
            id: `err-key-${q.id}`,
            severity: 'error',
            partNumber: part.partNumber,
            message: `${qTag}: Chưa thiết lập đáp án đúng hợp lệ.`,
          })
        } else if (!key.explanation.trim()) {
          warnings.push({
            id: `warn-exp-${q.id}`,
            severity: 'warning',
            partNumber: part.partNumber,
            message: `${qTag}: Chưa có lời giải thích chi tiết.`,
          })
        }
      }
    }
  }

  if (computedTotalQuestions > 0 && computedTotalQuestions !== test.standardTotalQuestions) {
    warnings.push({
      id: 'warn-qcount-standard',
      severity: 'warning',
      message: `Số câu thực tế đã nhập (${computedTotalQuestions} câu) khác với chỉ tiêu chuẩn khai báo (${test.standardTotalQuestions} câu).`,
    })
  }

  if (test.generalInstructions.length === 0) {
    warnings.push({
      id: 'warn-instructions',
      severity: 'warning',
      message: 'Chưa nhập hướng dẫn chung trước giờ làm bài.',
    })
  }

  return { errors, warnings, computedTotalQuestions }
}

function mapConversionRowsToPublicPoints(
  rows?: readonly VerifiedConversionRow[],
): PublicScoreConversionPointDto[] {
  const sourceRows = rows && rows.length > 0 ? rows : (getActiveConversionTableSync()?.rows ?? [])
  if (sourceRows.length > 0) {
    return sourceRows.map((row, idx) => {
      const raw = row.rawCorrectCount ?? idx
      const minRatio = Math.min(1, Math.max(0, raw / 100))
      return {
        minRatio,
        listeningScore: row.listeningScaledScore,
        readingScore: row.readingScaledScore,
      }
    })
  }

  const fallbackRatios = [0, 0.2, 0.4, 0.6, 0.8, 1]
  return fallbackRatios.map((minRatio) => ({
    minRatio,
    listeningScore:
      minRatio === 0 ? 5 : Math.min(495, Math.max(5, Math.round((5 + minRatio * 490) / 5) * 5)),
    readingScore:
      minRatio === 0 ? 5 : Math.min(495, Math.max(5, Math.round((5 + minRatio * 490) / 5) * 5)),
  }))
}

function mapAuthoringTestTypeToPublic(
  testType: ManagedToeicTestRecord['testType'],
): PublicStudentTestDto['testType'] {
  if (testType === 'Full Test 7 Parts') return 'full_test'
  if (testType === 'Mini Test') return 'mini_test'
  return 'part_practice'
}

export function projectPublicStudentTestPayload(
  record: ManagedToeicTestRecord,
  activeConversionRows?: readonly VerifiedConversionRow[],
): PublicStudentTestDto {
  const renumbered = renumberTestQuestions(clonePartsDeep(record.parts))
  const totalQuestions = countTestQuestions(renumbered)

  const mappedParts: PublicTestPartDto[] = renumbered.map((part, pIdx) => {
    const meta =
      TOEIC_PARTS_META.find((m) => m.partNumber === part.partNumber) ?? TOEIC_PARTS_META[0]!
    const partQuestions = part.groups.flatMap((g) => g.questions)
    const contentTypesLabel =
      part.partNumber === 1
        ? 'Hình ảnh & Âm thanh'
        : part.partNumber === 2
          ? 'Hỏi – Đáp âm thanh (3 lựa chọn)'
          : part.partNumber <= 4
            ? 'Hội thoại / Bài nói & Nhóm câu hỏi'
            : part.partNumber === 5
              ? 'Trắc nghiệm hoàn thành câu đơn'
              : 'Đoạn văn đọc hiểu & Chùm câu hỏi'

    return {
      id: `${record.id}-part-${part.partNumber}`,
      partNumber: part.partNumber,
      section: part.section,
      title: meta.title,
      englishTitle: meta.englishTitle,
      vietnameseTitle: meta.vietnameseTitle,
      description: part.instructions || meta.defaultInstructions,
      contentTypesLabel,
      questionCount: partQuestions.length,
      standardToeicCount: meta.standardToeicCount,
      suggestedMinutes: meta.suggestedMinutes,
      allowStandaloneSelection: part.allowStandaloneSelection,
      instructions: [part.instructions || meta.defaultInstructions],
      importantNotes:
        part.section === 'listening'
          ? ['Âm thanh phát liên tục ở chế độ thi thật; lắng nghe kỹ trước khi chọn đáp án.']
          : ['Phân bổ thời gian hợp lý để hoàn thành toàn bộ các đoạn văn đọc hiểu.'],
      displayOrder: pIdx + 1,
      questionGroups: part.groups.map((grp) => ({
        id: grp.id,
        partNumber: part.partNumber,
        groupTitle: grp.groupTitle || undefined,
        passage: grp.passageText.trim() || undefined,
        passages:
          grp.passages && grp.passages.some((p) => p.trim())
            ? grp.passages.filter((p) => p.trim())
            : undefined,
        audioUrl: grp.audioUrl.trim() || undefined,
        audioDurationSeconds: grp.audioDurationSeconds,
        imageUrl: grp.imageUrl.trim() || undefined,
        displayOrder: grp.displayOrder,
        questions: grp.questions.map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          audioUrl: q.audioUrl.trim() || undefined,
          audioDurationSeconds: q.audioDurationSeconds,
          imageUrl: q.imageUrl.trim() || undefined,
          displayOrder: q.displayOrder,
          options: q.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            text: opt.text,
          })),
        })),
      })),
    }
  })

  return {
    id: record.id,
    code: record.code,
    slug: record.slug,
    title: record.title,
    collectionGroup: record.collectionGroup,
    difficulty: record.difficulty,
    testType: mapAuthoringTestTypeToPublic(record.testType),
    duration: record.durationMinutes,
    totalQuestions,
    standardTotalQuestions: record.standardTotalQuestions,
    attemptsCount: record.attemptsCount,
    allowPartSelection: record.allowPartSelection,
    availableDurationOptions: [...record.availableDurationOptions],
    thumbnail: record.thumbnail,
    description: record.description,
    generalInstructions:
      record.generalInstructions.length > 0
        ? [...record.generalInstructions]
        : ['Đọc kỹ hướng dẫn từng phần trước khi bắt đầu làm bài.'],
    status: record.status === 'archived' ? 'hidden' : record.status,
    activeVersionNumber: record.activeVersionNumber,
    scoreScaleVersionCode: record.scoreScaleVersionCode,
    createdAt:
      record.versionHistory[record.versionHistory.length - 1]?.publishedAt ?? record.updatedAt,
    updatedAt: record.updatedAt,
    parts: mappedParts,
    scoreConversionTable: mapConversionRowsToPublicPoints(activeConversionRows),
  }
}

export const testAuthoringApi = {
  async listTests(): Promise<ManagedToeicTestRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedToeicTestRecord[]>(STAFF_API_ENDPOINTS.learning.tests)
    }
    await mockDelay(100)
    return readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
  },

  async getTestById(id: string): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testDetail(id),
      )
    }
    await mockDelay(80)
    const list = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const found = list.find((t) => t.id === id)
    if (!found) {
      throw new StaffApiClientError('Không tìm thấy đề thi trong ngân hàng đề.', 404)
    }
    return found
  },

  async createDraftTest(input: {
    code: string
    title: string
    slug: string
    testType: ManagedToeicTestRecord['testType']
    durationMinutes: number
    collectionGroup: string
    difficulty: TestDifficulty
  }): Promise<ManagedToeicTestRecord> {
    const normalizedCode = input.code.trim().toUpperCase()
    const normalizedSlug = input.slug.trim().toLowerCase()
    if (!normalizedCode || !normalizedSlug || !input.title.trim()) {
      throw new StaffApiClientError('Vui lòng nhập đầy đủ Mã đề thi, Tên đề thi và Slug.', 400)
    }
    if (!isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError(
        'Đường dẫn Slug chỉ được chứa chữ thường a-z, số 0-9 và dấu gạch ngang (-).',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedToeicTestRecord>(STAFF_API_ENDPOINTS.learning.tests, {
        ...input,
        code: normalizedCode,
        slug: normalizedSlug,
      })
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)

    if (current.some((t) => t.code.toUpperCase() === normalizedCode)) {
      throw new StaffApiClientError('Mã đề thi đã tồn tại.', 409)
    }
    if (current.some((t) => t.slug.toLowerCase() === normalizedSlug)) {
      throw new StaffApiClientError('Đường dẫn Slug đề thi đã tồn tại.', 409)
    }

    const created: ManagedToeicTestRecord = {
      id: createUniqueId('test'),
      code: normalizedCode,
      slug: normalizedSlug,
      title: input.title.trim(),
      collectionGroup: input.collectionGroup.trim() || 'Chung',
      skillCategory: 'listening_reading',
      difficulty: input.difficulty,
      testType: input.testType,
      durationMinutes: input.durationMinutes,
      standardTotalQuestions: input.testType === 'Full Test 7 Parts' ? 200 : 50,
      allowPartSelection: true,
      availableDurationOptions: [15, 30, 45, 60, 90, 120],
      thumbnail: '',
      description: '',
      generalInstructions: ['Đọc kỹ hướng dẫn từng Part trước khi bắt đầu làm bài.'],
      status: 'draft',
      attemptsCount: 0,
      activeVersionNumber: 1,
      scoreScaleVersionCode: getActiveScaleCodeSync() ?? 'ETS-LR-990',
      versionHistory: [],
      parts: buildEmptyPartsTemplate(),
      answerKeys: {},
      updatedAt: new Date().toISOString(),
    }

    const next = [created, ...current]
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return created
  },

  async forkWorkingDraftVersion(id: string): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testWorkingDraft(id),
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const idx = current.findIndex((t) => t.id === id)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy đề thi.', 404)
    }

    const prev = current[idx]!
    if (prev.workingDraft) {
      return prev
    }

    const nowIso = new Date().toISOString()
    const preservedHistory = ensureLiveVersionSnapshotPreserved(prev)
    const nextVersion = prev.activeVersionNumber + 1

    const updated: ManagedToeicTestRecord = {
      ...prev,
      versionHistory: preservedHistory,
      workingDraft: {
        versionNumber: nextVersion,
        parts: clonePartsDeep(prev.parts),
        answerKeys: cloneAnswerKeysDeep(prev.answerKeys),
        updatedAt: nowIso,
      },
      updatedAt: nowIso,
    }

    const next = [...current]
    next[idx] = updated
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return updated
  },

  async discardWorkingDraft(id: string): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.delete<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testWorkingDraft(id),
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const idx = current.findIndex((t) => t.id === id)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy đề thi.', 404)
    }

    const prev = current[idx]!
    const { workingDraft: _discarded, ...rest } = prev
    const updated: ManagedToeicTestRecord = {
      ...rest,
      updatedAt: new Date().toISOString(),
    }

    const next = [...current]
    next[idx] = updated
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return updated
  },

  async saveTestAuthoring(
    updatedDraft: ManagedToeicTestRecord,
  ): Promise<{ saved: ManagedToeicTestRecord; forkedNewVersion: boolean }> {
    const normalizedCode = updatedDraft.code.trim().toUpperCase()
    const normalizedSlug = updatedDraft.slug.trim().toLowerCase()
    if (!normalizedCode || !normalizedSlug || !updatedDraft.title.trim()) {
      throw new StaffApiClientError('Mã đề thi, Tên đề thi và Slug không được để trống.', 400)
    }
    if (!isValidSlug(normalizedSlug)) {
      throw new StaffApiClientError(
        'Đường dẫn Slug chỉ được chứa chữ thường a-z, số 0-9 và dấu gạch ngang (-).',
        400,
      )
    }

    const brokenMedia = collectBrokenMediaErrors(updatedDraft)
    if (brokenMedia.length > 0) {
      throw new StaffApiClientError(brokenMedia[0]!, 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<{ saved: ManagedToeicTestRecord; forkedNewVersion: boolean }>(
        STAFF_API_ENDPOINTS.learning.testDetail(updatedDraft.id),
        {
          ...updatedDraft,
          code: normalizedCode,
          slug: normalizedSlug,
        },
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const idx = current.findIndex((t) => t.id === updatedDraft.id)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy đề thi để lưu.', 404)
    }

    if (
      current.some(
        (t) => t.id !== updatedDraft.id && t.code.trim().toUpperCase() === normalizedCode,
      )
    ) {
      throw new StaffApiClientError(`Mã đề thi "${normalizedCode}" đã tồn tại.`, 409)
    }
    if (
      current.some(
        (t) => t.id !== updatedDraft.id && t.slug.trim().toLowerCase() === normalizedSlug,
      )
    ) {
      throw new StaffApiClientError(`Đường dẫn Slug "${normalizedSlug}" đã tồn tại.`, 409)
    }

    const prev = current[idx]!
    const renumberedParts = renumberTestQuestions(clonePartsDeep(updatedDraft.parts))
    const clonedKeys = cloneAnswerKeysDeep(updatedDraft.answerKeys)
    const nowIso = new Date().toISOString()

    const protectLiveVersion = isImmutableVersionProtected(prev)

    if (protectLiveVersion) {
      const preservedHistory = ensureLiveVersionSnapshotPreserved(prev)
      const draftVersionNumber = prev.workingDraft?.versionNumber ?? prev.activeVersionNumber + 1
      const forkedNewVersion = !prev.workingDraft

      const saved: ManagedToeicTestRecord = {
        ...prev,
        code: normalizedCode,
        slug: normalizedSlug,
        title: updatedDraft.title.trim(),
        collectionGroup: updatedDraft.collectionGroup.trim(),
        difficulty: updatedDraft.difficulty,
        testType: updatedDraft.testType,
        durationMinutes: updatedDraft.durationMinutes,
        standardTotalQuestions: updatedDraft.standardTotalQuestions,
        allowPartSelection: updatedDraft.allowPartSelection,
        availableDurationOptions: updatedDraft.availableDurationOptions,
        thumbnail: updatedDraft.thumbnail,
        description: updatedDraft.description,
        generalInstructions: updatedDraft.generalInstructions,
        scoreScaleVersionCode: updatedDraft.scoreScaleVersionCode,
        status: prev.status,
        activeVersionNumber: prev.activeVersionNumber,
        parts: prev.parts,
        answerKeys: prev.answerKeys,
        versionHistory: preservedHistory,
        workingDraft: {
          versionNumber: draftVersionNumber,
          parts: renumberedParts,
          answerKeys: clonedKeys,
          updatedAt: nowIso,
        },
        updatedAt: nowIso,
      }

      const next = [...current]
      next[idx] = saved
      writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
      return { saved, forkedNewVersion }
    }

    const saved: ManagedToeicTestRecord = {
      ...updatedDraft,
      code: normalizedCode,
      slug: normalizedSlug,
      title: updatedDraft.title.trim(),
      parts: renumberedParts,
      answerKeys: clonedKeys,
      workingDraft: undefined,
      status: 'draft',
      updatedAt: nowIso,
    }

    const next = [...current]
    next[idx] = saved
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return { saved, forkedNewVersion: false }
  },

  async publishTestVersion(
    id: string,
    actorLabel: string,
    changeNote: string,
  ): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testPublish(id),
        { actorLabel, changeNote },
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const idx = current.findIndex((t) => t.id === id)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy đề thi.', 404)

    const target = current[idx]!
    const candidateParts = renumberTestQuestions(
      clonePartsDeep(target.workingDraft ? target.workingDraft.parts : target.parts),
    )
    const candidateKeys = cloneAnswerKeysDeep(
      target.workingDraft ? target.workingDraft.answerKeys : target.answerKeys,
    )
    const candidateRecord: ManagedToeicTestRecord = {
      ...target,
      parts: candidateParts,
      answerKeys: candidateKeys,
    }

    const brokenMedia = collectBrokenMediaErrors(candidateRecord)
    if (brokenMedia.length > 0) {
      throw new StaffApiClientError(brokenMedia[0]!, 400)
    }

    const validation = validateTestBeforePublish(candidateRecord, current)
    if (validation.errors.length > 0) {
      throw new StaffApiClientError(
        `Không thể xuất bản do còn ${validation.errors.length} lỗi bắt buộc: ${validation.errors[0]?.message ?? ''}`,
        400,
      )
    }

    const preservedPriorHistory = ensureLiveVersionSnapshotPreserved(target)
    const nextVersionNumber = getTargetPublishVersionNumber(target)
    const nowIso = new Date().toISOString()

    const versionSnapshot: TestVersionSnapshot = {
      versionNumber: nextVersionNumber,
      versionCode: `${target.code}@v${nextVersionNumber}`,
      publishedAt: nowIso,
      publishedBy: actorLabel,
      totalQuestions: validation.computedTotalQuestions,
      scoreScaleVersionCode: target.scoreScaleVersionCode,
      changeNote: changeNote.trim() || `Xuất bản phiên bản v${nextVersionNumber}.`,
      partsSnapshot: clonePartsDeep(candidateParts),
      answerKeysSnapshot: cloneAnswerKeysDeep(candidateKeys),
    }

    const { workingDraft: _promotedDraft, ...targetWithoutDraft } = target
    const updated: ManagedToeicTestRecord = {
      ...targetWithoutDraft,
      status: 'published',
      activeVersionNumber: nextVersionNumber,
      parts: candidateParts,
      answerKeys: candidateKeys,
      versionHistory: [
        versionSnapshot,
        ...preservedPriorHistory.filter((v) => v.versionNumber !== nextVersionNumber),
      ],
      updatedAt: nowIso,
    }

    const next = [...current]
    next[idx] = updated
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return updated
  },

  async setTestStatus(id: string, status: AuthoringTestStatus): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testStatus(id),
        { status },
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const idx = current.findIndex((t) => t.id === id)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy đề thi.', 404)

    const target = current[idx]!
    if (status === 'published') {
      const check = validateTestBeforePublish(target, current)
      if (check.errors.length > 0) {
        throw new StaffApiClientError(
          `Đề thi còn ${check.errors.length} lỗi chưa đạt điều kiện xuất bản: ${check.errors[0]?.message ?? ''}`,
          400,
        )
      }
    }

    const updated: ManagedToeicTestRecord = {
      ...target,
      status,
      updatedAt: new Date().toISOString(),
    }
    const next = [...current]
    next[idx] = updated
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return updated
  },

  async cloneTest(id: string): Promise<ManagedToeicTestRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ManagedToeicTestRecord>(
        STAFF_API_ENDPOINTS.learning.testClone(id),
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_TESTS_MOCK_KEY, buildEmptyTestsStore)
    const source = current.find((t) => t.id === id)
    if (!source) throw new StaffApiClientError('Không tìm thấy đề thi gốc.', 404)

    const sourceParts = source.workingDraft ? source.workingDraft.parts : source.parts
    const sourceKeys = source.workingDraft ? source.workingDraft.answerKeys : source.answerKeys

    const newAnswerKeys: Record<string, AuthoringAnswerKey> = {}
    const clonedParts: AuthoringTestPart[] = sourceParts.map((part) => ({
      ...part,
      groups: part.groups.map((grp): AuthoringQuestionGroup => {
        const newGroupId = createUniqueId('grp')
        const clonedQuestions: AuthoringQuestion[] = grp.questions.map((q) => {
          const newQuestionId = createUniqueId('q')
          const optionIdMap = new Map<string, string>()
          const newOptions: AuthoringOption[] = q.options.map((opt) => {
            const newOptionId = createUniqueId(`opt-${opt.label.toLowerCase()}`)
            optionIdMap.set(opt.id, newOptionId)
            return {
              ...opt,
              id: newOptionId,
            }
          })

          const oldKey = sourceKeys[q.id]
          if (oldKey) {
            const mappedCorrectId =
              optionIdMap.get(oldKey.correctOptionId) ?? newOptions[0]?.id ?? ''
            newAnswerKeys[newQuestionId] = {
              ...oldKey,
              questionId: newQuestionId,
              correctOptionId: mappedCorrectId,
            }
          }

          return {
            ...q,
            id: newQuestionId,
            groupId: newGroupId,
            options: newOptions,
          }
        })

        return {
          ...grp,
          id: newGroupId,
          passages: grp.passages ? [...grp.passages] : undefined,
          questions: clonedQuestions,
        }
      }),
    }))

    const uniqueSuffix = createUniqueId('cp').split('-').slice(-1)[0]?.toUpperCase() ?? 'COPY'
    let candidateCode = `${source.code}-COPY-${uniqueSuffix}`
    let candidateSlug = `${source.slug}-copy-${uniqueSuffix.toLowerCase()}`
    while (
      current.some(
        (t) =>
          t.code.toUpperCase() === candidateCode.toUpperCase() ||
          t.slug.toLowerCase() === candidateSlug.toLowerCase(),
      )
    ) {
      const retrySuffix = createUniqueId('cp').split('-').slice(-1)[0]?.toUpperCase() ?? 'X'
      candidateCode = `${source.code}-COPY-${retrySuffix}`
      candidateSlug = `${source.slug}-copy-${retrySuffix.toLowerCase()}`
    }

    const { workingDraft: _ignoredDraft, ...sourceRest } = source
    const cloned: ManagedToeicTestRecord = {
      ...sourceRest,
      id: createUniqueId('test'),
      code: candidateCode,
      slug: candidateSlug,
      title: `${source.title} (Bản nhân bản)`,
      generalInstructions: [...source.generalInstructions],
      availableDurationOptions: [...source.availableDurationOptions],
      status: 'draft',
      attemptsCount: 0,
      activeVersionNumber: 1,
      versionHistory: [],
      parts: renumberTestQuestions(clonedParts),
      answerKeys: newAnswerKeys,
      updatedAt: new Date().toISOString(),
    }

    const next = [cloned, ...current]
    writeMockCollection(TOEIC_TESTS_MOCK_KEY, next)
    return cloned
  },
}
