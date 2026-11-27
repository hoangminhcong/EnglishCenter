import type { TestDifficulty } from '@english-center/contracts'

export type ToeicPartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ToeicSectionType = 'listening' | 'reading'

export type AuthoringTestStatus = 'draft' | 'published' | 'hidden' | 'archived'

export type AuthoringTestType = 'Full Test 7 Parts' | 'Mini Test' | 'Luyện chuyên sâu'

export interface AuthoringOption {
  id: string
  label: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface AuthoringQuestion {
  id: string
  questionNumber: number
  partNumber: ToeicPartNumber
  groupId: string
  questionText: string
  audioUrl: string
  audioDurationSeconds?: number
  imageUrl: string
  options: AuthoringOption[]
  displayOrder: number
}

export interface AuthoringQuestionGroup {
  id: string
  partNumber: ToeicPartNumber
  groupTitle: string
  passageText: string
  passages?: string[]
  audioUrl: string
  audioDurationSeconds?: number
  imageUrl: string
  displayOrder: number
  questions: AuthoringQuestion[]
}

export interface AuthoringTestPart {
  partNumber: ToeicPartNumber
  partName: string
  section: ToeicSectionType
  groupedMode: boolean
  allowStandaloneSelection: boolean
  instructions: string
  groups: AuthoringQuestionGroup[]
}

export interface AuthoringAnswerKey {
  questionId: string
  correctOptionId: string
  explanation: string
  transcript?: string
  translation?: string
}

export interface TestVersionSnapshot {
  versionNumber: number
  versionCode: string
  publishedAt: string
  publishedBy: string
  totalQuestions: number
  scoreScaleVersionCode: string
  changeNote: string
  partsSnapshot?: AuthoringTestPart[]
  answerKeysSnapshot?: Record<string, AuthoringAnswerKey>
}

export interface TestWorkingDraft {
  versionNumber: number
  parts: AuthoringTestPart[]
  answerKeys: Record<string, AuthoringAnswerKey>
  updatedAt: string
}

export interface ManagedToeicTestRecord {
  id: string
  code: string
  slug: string
  title: string
  collectionGroup: string
  skillCategory: 'listening_reading' | 'speaking_writing'
  difficulty: TestDifficulty
  testType: AuthoringTestType
  durationMinutes: number
  standardTotalQuestions: number
  allowPartSelection: boolean
  availableDurationOptions: number[]
  thumbnail: string
  description: string
  generalInstructions: string[]
  status: AuthoringTestStatus
  attemptsCount: number
  activeVersionNumber: number
  scoreScaleVersionCode: string
  versionHistory: TestVersionSnapshot[]
  parts: AuthoringTestPart[]
  answerKeys: Record<string, AuthoringAnswerKey>
  workingDraft?: TestWorkingDraft
  updatedAt: string
}

export interface ValidationIssue {
  id: string
  severity: 'error' | 'warning'
  partNumber?: ToeicPartNumber
  message: string
}

export interface TestPublishValidationResult {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  computedTotalQuestions: number
}

export const TOEIC_PARTS_META: readonly {
  partNumber: ToeicPartNumber
  partName: string
  title: string
  englishTitle: string
  vietnameseTitle: string
  section: ToeicSectionType
  groupedMode: boolean
  optionCount: 3 | 4
  standardToeicCount: number
  suggestedMinutes: number
  defaultInstructions: string
}[] = [
  {
    partNumber: 1,
    partName: 'Part 1: Photographs',
    title: 'Part 1: Photographs',
    englishTitle: 'Photographs',
    vietnameseTitle: 'Mô tả hình ảnh',
    section: 'listening',
    groupedMode: false,
    optionCount: 4,
    standardToeicCount: 6,
    suggestedMinutes: 4,
    defaultInstructions: 'Nghe 4 câu mô tả bức hình và chọn đáp án đúng nhất A, B, C hoặc D.',
  },
  {
    partNumber: 2,
    partName: 'Part 2: Question-Response',
    title: 'Part 2: Question-Response',
    englishTitle: 'Question-Response',
    vietnameseTitle: 'Hỏi – Đáp ngắn',
    section: 'listening',
    groupedMode: false,
    optionCount: 3,
    standardToeicCount: 25,
    suggestedMinutes: 8,
    defaultInstructions: 'Nghe câu hỏi/phát biểu và 3 lời hồi đáp A, B, C để chọn câu phù hợp nhất.',
  },
  {
    partNumber: 3,
    partName: 'Part 3: Conversations',
    title: 'Part 3: Conversations',
    englishTitle: 'Conversations',
    vietnameseTitle: 'Đoạn hội thoại',
    section: 'listening',
    groupedMode: true,
    optionCount: 4,
    standardToeicCount: 39,
    suggestedMinutes: 17,
    defaultInstructions: 'Nghe đoạn hội thoại ngắn và trả lời chùm câu hỏi đi kèm.',
  },
  {
    partNumber: 4,
    partName: 'Part 4: Talks',
    title: 'Part 4: Talks',
    englishTitle: 'Talks',
    vietnameseTitle: 'Bài nói ngắn',
    section: 'listening',
    groupedMode: true,
    optionCount: 4,
    standardToeicCount: 30,
    suggestedMinutes: 16,
    defaultInstructions: 'Nghe bài nói ngắn từ một người nói và trả lời chùm câu hỏi đi kèm.',
  },
  {
    partNumber: 5,
    partName: 'Part 5: Incomplete Sentences',
    title: 'Part 5: Incomplete Sentences',
    englishTitle: 'Incomplete Sentences',
    vietnameseTitle: 'Hoàn thành câu',
    section: 'reading',
    groupedMode: false,
    optionCount: 4,
    standardToeicCount: 30,
    suggestedMinutes: 12,
    defaultInstructions: 'Chọn từ hoặc cụm từ đúng nhất để điền vào chỗ trống trong câu.',
  },
  {
    partNumber: 6,
    partName: 'Part 6: Text Completion',
    title: 'Part 6: Text Completion',
    englishTitle: 'Text Completion',
    vietnameseTitle: 'Hoàn thành đoạn văn',
    section: 'reading',
    groupedMode: true,
    optionCount: 4,
    standardToeicCount: 16,
    suggestedMinutes: 10,
    defaultInstructions: 'Đọc đoạn văn bản và chọn đáp án đúng điền vào từng chỗ trống.',
  },
  {
    partNumber: 7,
    partName: 'Part 7: Reading Comprehension',
    title: 'Part 7: Reading Comprehension',
    englishTitle: 'Reading Comprehension',
    vietnameseTitle: 'Đọc hiểu đơn & đa đoạn',
    section: 'reading',
    groupedMode: true,
    optionCount: 4,
    standardToeicCount: 54,
    suggestedMinutes: 53,
    defaultInstructions: 'Đọc đoạn văn đơn hoặc đa đoạn văn và trả lời chùm câu hỏi đọc hiểu.',
  },
]
