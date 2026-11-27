export type ToeicPartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ToeicSectionType = 'listening' | 'reading'

export type TestSkillCategory = 'listening_reading' | 'speaking_writing'

export type TestDifficulty = 'Cơ bản (350+)' | 'Trung cấp (550+)' | 'Chuẩn ETS (700+)' | 'Nâng cao (850+)'

export type TestTypeLabel = 'Full Test 7 Parts' | 'Mini Test' | 'Luyện chuyên sâu'

export type TestPublicationStatus = 'published' | 'draft' | 'hidden'

export type TestPracticeMode = 'full' | 'custom_parts'

export type AudioPlaybackStatus = 'NOT_PLAYED' | 'PLAYING' | 'COMPLETED' | 'LOCKED'

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired'

// =========================================================================
// 1. NỘI DUNG ĐA PHƯƠNG TIỆN CÂU HỎI & PHƯƠNG ÁN TRẢ LỜI
// =========================================================================

export type TestContentBlock =
  | {
      type: 'text'
      id: string
      content: string
      variant?: 'instruction' | 'passage' | 'prompt' | 'dialogue'
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

export interface TestOption {
  id: string
  label: 'A' | 'B' | 'C' | 'D'
  /** Nội dung chữ của phương án (để trống nếu là phương án chỉ nghe như Part 1, Part 2) */
  text?: string
  imageUrl?: string
  content?: TestContentBlock[]
}

/**
 * Dữ liệu câu hỏi đồng nhất cho mọi Part (Part 1 – Part 7):
 * - Mỗi câu đều hỗ trợ sẵn 3 trường đơn giản: `questionText` (câu hỏi), `audioUrl` (âm thanh), `imageUrl` (ảnh).
 * - Câu nào không có thành phần nào (khuyết chữ, khuyết ảnh hoặc khuyết âm thanh) chỉ cần để trống `""` hoặc `undefined`, giao diện vẫn giữ nguyên khung chuẩn.
 * - Tuyệt đối KHÔNG chứa đáp án đúng (`correctOptionId`) hay giải thích (`explanation`) khi đang thi.
 */
export interface TestQuestion {
  id: string
  questionNumber: number
  partNumber: ToeicPartNumber
  groupId: string
  /** Nội dung câu hỏi (để trống nếu câu không có chữ câu hỏi như Part 1, Part 2) */
  questionText?: string
  /** Đường dẫn file âm thanh của câu hỏi (để trống nếu không có âm thanh) */
  audioUrl?: string
  audioDurationSeconds?: number
  /** Đường dẫn hình ảnh của câu hỏi (để trống nếu không có ảnh) */
  imageUrl?: string
  imageAlt?: string
  /** Tương thích mở rộng nếu dữ liệu truyền theo mảng block */
  content?: TestContentBlock[]
  options: TestOption[]
  displayOrder: number
}

/**
 * Dữ liệu đáp án đúng & lời giải trên Server (chỉ trả về sau khi nộp bài).
 */
export interface ServerTestAnswerKey {
  questionId: string
  correctOptionId: string
  explanation: string
  transcript?: string
  translation?: string
}

/**
 * Nhóm câu hỏi dùng chung một nguồn nội dung (Stimulus):
 * - Part 3 / Part 4: 1 đoạn Audio hội thoại/bài nói dùng chung cho 3 câu hỏi (chỉ phát 1 lần cho cả nhóm).
 * - Part 6 / Part 7: 1 hoặc nhiều đoạn văn/email/thông báo dùng chung cho nhiều câu hỏi.
 * - Part 1 / Part 2 / Part 5: Mỗi nhóm có thể chứa 1 câu hỏi hoặc 1 audio dùng chung.
 */
export interface QuestionGroup {
  id: string
  partNumber: ToeicPartNumber
  groupTitle?: string
  /** ID định danh nguồn phát Audio dùng chung (quản lý quy tắc chỉ nghe 1 lần theo nhóm) */
  audioGroupId?: string
  /** Đoạn văn đọc / hội thoại / bảng biểu dùng chung cho nhóm câu hỏi (có thể để trống) */
  passageText?: string
  /** Mảng nhiều đoạn văn dùng chung (VD: Double / Triple Passage ở Part 7) */
  passages?: string[]
  /** Đường dẫn âm thanh dùng chung cho nhóm câu hỏi (có thể để trống) */
  audioUrl?: string
  audioDurationSeconds?: number
  /** Đường dẫn hình ảnh dùng chung cho nhóm câu hỏi (có thể để trống) */
  imageUrl?: string
  imageAlt?: string
  /** Tương thích mở rộng nếu dữ liệu truyền theo mảng block */
  stimulus?: TestContentBlock[]
  questions: TestQuestion[]
  displayOrder: number
}

// =========================================================================
// 2. CẤU TRÚC PART 1 - PART 7 VÀ MÀN HÌNH GIỚI THIỆU TỪNG PART
// =========================================================================

export interface TestPart {
  id: string
  partNumber: ToeicPartNumber
  section: ToeicSectionType
  title: string // VD: "PART 1"
  englishTitle: string // VD: "Photographs"
  vietnameseTitle: string // VD: "Mô tả hình ảnh"
  description: string
  instructions: string[]
  contentTypesLabel: string // VD: "Hình ảnh + Audio 4 phương án A, B, C, D"
  importantNotes: string[]
  introductionBlocks?: TestContentBlock[]
  questionCount: number // Tổng số câu thực tế trong câu hỏi của đề
  standardToeicCount: number // Số câu chuẩn cấu trúc đề thi TOEIC (6, 25, 39, 30, 30, 16, 54)
  suggestedMinutes: number
  allowStandaloneSelection: boolean
  questionGroups: QuestionGroup[]
  displayOrder: number
}

// =========================================================================
// 3. ĐỀ THI (TEST)
// =========================================================================

export interface ScoreConversionPoint {
  minRatio: number
  listeningScore: number
  readingScore: number
}

export interface Test {
  id: string
  code: string
  title: string
  slug: string
  collectionGroup: string // VD: "2026 (New)", "2025 ETS Standard"
  skillCategory: TestSkillCategory
  description: string
  thumbnail: string
  difficulty: TestDifficulty
  testType: TestTypeLabel
  duration: number // Thời gian mặc định (phút), VD: 120
  totalQuestions: number
  standardTotalQuestions: number // VD: 200
  attemptsCount: number
  createdAt: string
  allowPartSelection: boolean
  availableDurationOptions: number[] // VD: [15, 30, 45, 60, 90, 120]
  status: TestPublicationStatus
  generalInstructions: string[]
  sampleCheckAudioUrl: string
  parts: TestPart[]
  /** Bảng quy đổi điểm TOEIC do hệ thống cung cấp khi làm Full Test */
  scoreConversionTable?: ScoreConversionPoint[]
}

// =========================================================================
// 4. LƯỢT THI (TEST ATTEMPT), TRẠNG THÁI AUDIO & KẾT QUẢ CHẤM ĐIỂM
// =========================================================================

export interface AudioGroupState {
  audioGroupId: string
  partNumber: ToeicPartNumber
  audioUrl: string
  status: AudioPlaybackStatus
  startedAt?: string
  completedAt?: string
}

export interface StartAttemptPayload {
  testId: string
  testSlug: string
  practiceMode: TestPracticeMode
  selectedParts: ToeicPartNumber[]
  selectedDuration: number // phút
}

export interface TestAttempt {
  id: string
  /** ID học viên thực hiện lượt thi (phân tách dữ liệu giữa các tài khoản) */
  studentId?: string
  testId: string
  testSlug: string
  testCode: string
  testTitle: string
  practiceMode: TestPracticeMode
  selectedParts: ToeicPartNumber[]
  selectedDuration: number // phút
  startedAt: string // ISO timestamp
  deadlineAt: string // ISO timestamp
  /** Thời điểm bắt đầu dừng đồng hồ khi đang đọc màn hình giới thiệu Part (thời gian giới thiệu không bị trừ vào giờ làm bài) */
  timerPausedAt?: string // ISO timestamp
  submittedAt?: string // ISO timestamp
  status: AttemptStatus
  /** questionId -> selectedOptionId */
  answers: Record<string, string>
  /** Danh sách questionId được đánh dấu xem lại */
  flaggedQuestionIds: string[]
  /** Trạng thái từng nhóm audio Listening (đảm bảo reload trang không được nghe lại) */
  audioStates: Record<string, AudioGroupState>
  /** Các Part đã xem màn hình giới thiệu và nhấn "Bắt đầu Part" */
  introducedParts: ToeicPartNumber[]
  /** Part hiện tại học viên đang đứng */
  currentPartNumber: ToeicPartNumber
  /** Đang ở màn hình giới thiệu Part hay đang làm câu hỏi trong Part */
  currentStage: 'part_intro' | 'questions'
  /** ID câu hỏi đang xem hiện tại */
  currentQuestionId?: string
  /** Đã hoàn thành toàn bộ audio của các Part Listening đã chọn chưa */
  listeningCompleted: boolean
  /** Thông báo chuyển sang Reading lần đầu sau khi xong Listening */
  listeningJustCompletedNotice?: boolean
}

export interface PartPerformanceStat {
  partNumber: ToeicPartNumber
  partTitle: string
  englishTitle: string
  section: ToeicSectionType
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  accuracyPercent: number
  evaluation: 'Tốt' | 'Khá' | 'Cần cải thiện'
}

export interface QuestionReviewDetail {
  questionId: string
  questionNumber: number
  partNumber: ToeicPartNumber
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
  isFlagged: boolean
  explanation: string
  transcript?: string
  translation?: string
}

export interface TestAttemptResult {
  attemptId: string
  testId: string
  testSlug: string
  testCode: string
  testTitle: string
  practiceMode: TestPracticeMode
  isFullTestScoreEligible: boolean
  selectedParts: ToeicPartNumber[]
  selectedDuration: number
  startedAt: string
  deadlineAt: string
  submittedAt: string
  actualDurationSeconds: number
  status: 'submitted' | 'expired'
  totalQuestions: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  accuracyPercent: number
  listeningCorrect: number
  listeningTotal: number
  readingCorrect: number
  readingTotal: number
  /** Điểm quy đổi Listening / Reading / Tổng (chỉ tính theo bảng quy đổi khi làm Full Test) */
  convertedListeningScore: number | null
  convertedReadingScore: number | null
  convertedTotalScore: number | null
  partStats: PartPerformanceStat[]
  strongParts: ToeicPartNumber[]
  improvementParts: ToeicPartNumber[]
  reviews: Record<string, QuestionReviewDetail>
}

export interface TestHistoryFilterParams {
  keyword?: string
  testSlug?: string
  status?: 'all' | AttemptStatus
  fromDate?: string
  toDate?: string
  sortOrder?: 'newest' | 'oldest'
}
