export type StudyZoneCategory = 'grammar' | 'vocabulary' | 'listening'

export type StudyLevel = 'Cơ bản (350+)' | 'Trung cấp (450–600+)' | 'Nâng cao (700+)' | 'Chuyên sâu (800+)'

export const STUDY_CATEGORY_LABELS: Record<StudyZoneCategory, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  listening: 'Luyện nghe',
}

export const STUDY_CATEGORY_PATHS: Record<StudyZoneCategory, string> = {
  grammar: '/study-zone/grammar',
  vocabulary: '/study-zone/vocabulary',
  listening: '/study-zone/listening',
}

// =========================================================================
// 1. HỆ THỐNG CÂU HỎI ĐA PHƯƠNG TIỆN (TEXT + IMAGE + AUDIO)
// =========================================================================

export type QuestionContentBlock =
  | {
      type: 'text'
      id: string
      content: string
      variant?: 'instruction' | 'passage' | 'prompt'
    }
  | {
      type: 'image'
      id: string
      url: string
      alt?: string
      caption?: string
    }
  | {
      type: 'audio'
      id: string
      url: string
      title?: string
      durationSeconds?: number
    }

export interface QuestionOption {
  id: string
  label: string // "A", "B", "C", "D"
  text?: string
  imageUrl?: string
  audioUrl?: string
  content?: QuestionContentBlock[]
}

/**
 * Dữ liệu câu hỏi gửi xuống Frontend khi học viên ĐANG LÀM BÀI.
 * Hỗ trợ đồng nhất 3 trường `questionText` + `audioUrl` + `imageUrl` (khuyết phần nào tự động bỏ qua phần đó nhưng vẫn giữ nguyên khung).
 */
export interface Question {
  id: string
  questionText?: string
  audioUrl?: string
  audioDurationSeconds?: number
  imageUrl?: string
  imageAlt?: string
  content?: QuestionContentBlock[]
  questionType: 'single_choice'
  options: QuestionOption[]
  difficulty?: string
  displayOrder: number
}

/**
 * Dữ liệu đáp án & giải thích chi tiết được tách riêng trên Server.
 * Chỉ trả về trong kết quả sau khi học viên đã nhấn NỘP BÀI.
 */
export interface QuestionAnswerKey {
  questionId: string
  correctOptionId: string
  explanation: string
  audioTranscript?: string
  audioTranslation?: string
}

// =========================================================================
// 2. BÀI TẬP & KẾT QUẢ CHẤM ĐIỂM (EXERCISES & SUBMISSIONS)
// =========================================================================

export interface StudyExercise {
  id: string
  topicSlug: string
  category: StudyZoneCategory
  title: string // VD: "TEST 1", "TEST 2"
  subtitle: string // VD: "Part 1 - Photographs"
  description: string
  level: StudyLevel
  durationMinutes?: number
  instructions: string
  questions: Question[]
  displayOrder: number
}

export interface ExerciseSummaryItem {
  id: string
  title: string
  subtitle: string
  questionCount: number
  durationMinutes?: number
  level: StudyLevel
}

export interface StudySubTopicItem {
  id: string
  title: string
  exercises: ExerciseSummaryItem[]
}

export interface SubmitExercisePayload {
  exerciseId: string
  answers: Record<string, string> // questionId -> selectedOptionId
  durationSeconds: number
}

export interface QuestionReviewItem {
  questionId: string
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  explanation: string
  audioTranscript?: string
  audioTranslation?: string
}

export interface ExerciseAttemptResult {
  attemptId: string
  exerciseId: string
  submittedAt: string
  totalQuestions: number
  answeredCount: number
  unansweredCount: number
  correctCount: number
  incorrectCount: number
  scoreTen: number // Điểm quy đổi thang 10
  accuracyPercent: number
  durationSeconds: number
  reviews: Record<string, QuestionReviewItem>
}

// =========================================================================
// 3. CHỦ ĐỀ HỌC TẬP (GRAMMAR, VOCABULARY, LISTENING)
// =========================================================================

export interface StudyTopic {
  id: string
  slug: string
  category: StudyZoneCategory
  orderNumber: number
  title: string // Hiển thị trong Timeline Accordion & Card (VD: "CAMP BOMB TOEIC RC 2026", "TOEIC Speaking and Writing Vocab - Ep 5")
  shortDescription: string
  thumbnail: string
  level: StudyLevel
  lessonsCount?: number
  wordsCount?: number
  durationLabel?: string
  listeningType?: string
  isPublished: boolean

  // Danh sách bài tập tương tác thuộc chủ đề (VD: TEST 1, TEST 2, TEST 3)
  exercises: ExerciseSummaryItem[]
  // Danh sách chủ điểm con lồng bên trong (VD: THÀNH PHẦN CÂU, CẤU TRÚC CÂU -> Test 1..Test 5)
  subTopics?: StudySubTopicItem[]
}
