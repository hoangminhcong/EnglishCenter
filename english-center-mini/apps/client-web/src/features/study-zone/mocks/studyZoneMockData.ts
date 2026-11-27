import type {
  QuestionAnswerKey,
  StudyExercise,
  StudyTopic,
} from '@/features/study-zone/types'

/**
 * Tạo WAV data URI ngắn (âm báo 440Hz trong 1.5s) để trình phát Audio hoạt động thật 100%
 * ngay cả khi máy học viên không có kết nối internet ngoài hoặc trong sandbox.
 */
function buildDemoToneWavDataUrl(freqHz = 440, seconds = 1.5): string {
  const sampleRate = 8000
  const numSamples = Math.floor(sampleRate * seconds)
  const buffer = new ArrayBuffer(44 + numSamples)
  const view = new DataView(buffer)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + numSamples, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true) // 8-bit
  writeStr(36, 'data')
  view.setUint32(40, numSamples, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const envelope = Math.min(1, (numSamples - i) / (sampleRate * 0.2))
    const sample = 128 + Math.round(60 * envelope * Math.sin(2 * Math.PI * freqHz * t))
    view.setUint8(44 + i, sample)
  }

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

export const DEMO_AUDIO_A = buildDemoToneWavDataUrl(440, 2)
export const DEMO_AUDIO_B = buildDemoToneWavDataUrl(523.25, 2)

// =========================================================================
// 1. DANH SÁCH CHỦ ĐỀ STUDY ZONE (GRAMMAR / VOCABULARY / LISTENING)
// =========================================================================

export const initialStudyTopics: StudyTopic[] = [
  // ----------------- NGỮ PHÁP (GRAMMAR) -----------------
  {
    id: 'gram-03',
    slug: '28-chu-de-ngu-phap-thuong-gap-nhat-trong-toeic',
    category: 'grammar',
    orderNumber: 1,
    title: '28 CHỦ ĐỀ NGỮ PHÁP THƯỜNG GẶP NHẤT TRONG TOEIC',
    shortDescription:
      'Tổng hợp toàn diện 28 chủ điểm: Thành phần câu, Các thì của động từ, Từ loại, Giới từ, Liên từ, Câu bị động, Câu điều kiện và Mệnh đề quan hệ.',
    thumbnail: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=900',
    level: 'Cơ bản (350+)',
    lessonsCount: 28,
    isPublished: true,
    exercises: [
      {
        id: 'ex-gram-rc-test1',
        title: 'Test 1',
        subtitle: 'Thành phần câu, cấu trúc câu',
        questionCount: 5,
        durationMinutes: 10,
        level: 'Cơ bản (350+)',
      },
      {
        id: 'ex-gram-rc-test2',
        title: 'Test 2',
        subtitle: 'Thì của động từ & Bị động',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Cơ bản (350+)',
      },
    ],
    subTopics: [
      {
        id: 'sub-gram-1',
        title: 'THÀNH PHẦN CÂU, CẤU TRÚC CÂU',
        exercises: [
          { id: 'ex-gram-rc-test1', title: 'Test 1', subtitle: 'Đề số 1', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 2', subtitle: 'Đề số 2', questionCount: 3, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test1', title: 'Test 3', subtitle: 'Đề số 3', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 4', subtitle: 'Đề số 4', questionCount: 3, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test1', title: 'Test 5', subtitle: 'Đề số 5', questionCount: 5, level: 'Cơ bản (350+)' },
        ],
      },
      {
        id: 'sub-gram-2',
        title: 'THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI ĐƠN',
        exercises: [
          { id: 'ex-gram-rc-test1', title: 'Test 1', subtitle: 'Hiện tại đơn 1', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 2', subtitle: 'Hiện tại đơn 2', questionCount: 3, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test1', title: 'Test 3', subtitle: 'Hiện tại đơn 3', questionCount: 5, level: 'Cơ bản (350+)' },
        ],
      },
      {
        id: 'sub-gram-3',
        title: 'THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI TIẾP DIỄN',
        exercises: [
          { id: 'ex-gram-rc-test1', title: 'Test 1', subtitle: 'Hiện tại tiếp diễn 1', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 2', subtitle: 'Hiện tại tiếp diễn 2', questionCount: 3, level: 'Cơ bản (350+)' },
        ],
      },
      {
        id: 'sub-gram-4',
        title: 'THÌ CỦA ĐỘNG TỪ - THÌ HIỆN TẠI HOÀN THÀNH',
        exercises: [
          { id: 'ex-gram-rc-test1', title: 'Test 1', subtitle: 'Hiện tại hoàn thành 1', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 2', subtitle: 'Hiện tại hoàn thành 2', questionCount: 3, level: 'Cơ bản (350+)' },
        ],
      },
      {
        id: 'sub-gram-5',
        title: 'THÌ CỦA ĐỘNG TỪ - THÌ QUÁ KHỨ ĐƠN',
        exercises: [
          { id: 'ex-gram-rc-test1', title: 'Test 1', subtitle: 'Quá khứ đơn 1', questionCount: 5, level: 'Cơ bản (350+)' },
          { id: 'ex-gram-rc-test2', title: 'Test 2', subtitle: 'Quá khứ đơn 2', questionCount: 3, level: 'Cơ bản (350+)' },
        ],
      },
      {
        id: 'sub-gram-6',
        title: 'THÌ CỦA ĐỘNG TỪ - THÌ QUÁ KHỨ TIẾP DIỄN',
        exercises: [
          { id: 'ex-gram-rc-test2', title: 'Test 1', subtitle: 'Quá khứ tiếp diễn 1', questionCount: 3, level: 'Cơ bản (350+)' },
        ],
      },
    ],
  },
  {
    id: 'gram-01',
    slug: 'camp-bomb-toeic-rc-2026',
    category: 'grammar',
    orderNumber: 2,
    title: 'CAMP BOMB TOEIC RC 2026 – CÁC THÌ & CẤU TRÚC CÂU TRỌNG TÂM',
    shortDescription:
      'Hệ thống các thì tiếng Anh, sự hòa hợp chủ ngữ – động từ và các dạng câu hỏi ngữ pháp cốt lõi trong TOEIC Reading Part 5 & Part 6.',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900',
    level: 'Trung cấp (450–600+)',
    lessonsCount: 6,
    isPublished: true,
    exercises: [
      {
        id: 'ex-gram-rc-test1',
        title: 'TEST 1',
        subtitle: 'Chuyên đề Thì động từ & Từ loại Part 5',
        questionCount: 5,
        durationMinutes: 10,
        level: 'Trung cấp (450–600+)',
      },
      {
        id: 'ex-gram-rc-test2',
        title: 'TEST 2',
        subtitle: 'Chuyên đề Câu bị động & Mệnh đề quan hệ',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Trung cấp (450–600+)',
      },
    ],
  },
  {
    id: 'gram-02',
    slug: 'submarine-toeic-rc-2026',
    category: 'grammar',
    orderNumber: 3,
    title: 'SUBMARINE TOEIC RC 2026 – Câu điều kiện, Bị động & Mệnh đề quan hệ',
    shortDescription:
      'Huấn luyện chuyên sâu cấu trúc đảo ngữ câu điều kiện, rút gọn mệnh đề quan hệ và bẫy liên từ/giới từ mức điểm 700+ TOEIC.',
    thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900',
    level: 'Nâng cao (700+)',
    lessonsCount: 8,
    isPublished: true,
    exercises: [
      {
        id: 'ex-gram-rc-test2',
        title: 'Test 1',
        subtitle: 'Rút gọn mệnh đề & Đảo ngữ câu điều kiện',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Nâng cao (700+)',
      },
    ],
  },
  {
    id: 'gram-04',
    slug: 'camp-bomb-toeic-rc-2024',
    category: 'grammar',
    orderNumber: 4,
    title: 'CAMP BOMB TOEIC RC 2024 – Giới từ, Liên từ & Đại từ',
    shortDescription:
      'Kho bài học và đề rèn luyện chuyên sâu về đại từ phản thân, giới từ chỉ thời gian/địa điểm và liên từ tương quan.',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
    level: 'Trung cấp (450–600+)',
    lessonsCount: 5,
    isPublished: true,
    exercises: [
      {
        id: 'ex-gram-rc-test2',
        title: 'TEST 1',
        subtitle: 'Luyện tập Liên từ & Giới từ',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Trung cấp (450–600+)',
      },
    ],
  },
  {
    id: 'gram-05',
    slug: 'submarine-toeic-rc-2024',
    category: 'grammar',
    orderNumber: 5,
    title: 'SUBMARINE TOEIC RC 2024 – Phân tích bẫy đề thi nâng cao',
    shortDescription:
      'Tổng hợp các câu hỏi phân loại điểm 800+ trong Part 5 & Part 6: Phân từ hoàn thành, giả định thức (Subjunctive) và giới từ nâng cao.',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900',
    level: 'Chuyên sâu (800+)',
    lessonsCount: 6,
    isPublished: true,
    exercises: [
      {
        id: 'ex-gram-rc-test1',
        title: 'TEST 1',
        subtitle: 'Đề luyện tổng hợp Ngữ pháp',
        questionCount: 5,
        durationMinutes: 10,
        level: 'Chuyên sâu (800+)',
      },
    ],
  },

  // ----------------- TỪ VỰNG (VOCABULARY) -----------------
  {
    id: 'voc-01',
    slug: 'toeic-speaking-and-writing-vocab-ep-5',
    category: 'vocabulary',
    orderNumber: 1,
    title: 'TOEIC Speaking and Writing Vocab - Ep 5 (Office, Library & Education)',
    shortDescription:
      'Chủ đề từ vựng thực chiến về Môi trường văn phòng, Thư viện, Giáo dục và Hội họp kèm phát âm IPA, hình ảnh trực quan và bài test đa phương tiện.',
    thumbnail: 'https://images.unsplash.com/photo-1507842229356-51c61504d3ab?w=900',
    level: 'Trung cấp (450–600+)',
    wordsCount: 6,
    isPublished: true,
    exercises: [
      {
        id: 'ex-vocab-ep5-test1',
        title: 'TEST 1',
        subtitle: 'Part 1 - Photographs & Audio Vocab',
        questionCount: 5,
        durationMinutes: 10,
        level: 'Trung cấp (450–600+)',
      },
      {
        id: 'ex-vocab-ep5-test2',
        title: 'TEST 2',
        subtitle: 'Từ vựng Ngữ cảnh Văn phòng & Hội họp',
        questionCount: 3,
        durationMinutes: 6,
        level: 'Trung cấp (450–600+)',
      },
      {
        id: 'ex-vocab-ep5-test3',
        title: 'TEST 3',
        subtitle: 'Phản xạ Từ đồng nghĩa & Collocations',
        questionCount: 3,
        durationMinutes: 6,
        level: 'Nâng cao (700+)',
      },
    ],
  },
  {
    id: 'voc-02',
    slug: 'toeic-speaking-and-writing-vocab-ep-4',
    category: 'vocabulary',
    orderNumber: 2,
    title: 'TOEIC Speaking and Writing Vocab - Ep 4 (Business & Shopping)',
    shortDescription:
      'Từ vựng trọng tâm chủ đề Chăm sóc khách hàng, Mua sắm, Hóa đơn thanh toán và Giải quyết khiếu nại qua Email.',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900',
    level: 'Trung cấp (450–600+)',
    wordsCount: 4,
    isPublished: true,
    exercises: [
      {
        id: 'ex-vocab-ep5-test2',
        title: 'TEST 1',
        subtitle: 'Kiểm tra Từ vựng Thương mại & Mua sắm',
        questionCount: 3,
        durationMinutes: 6,
        level: 'Trung cấp (450–600+)',
      },
    ],
  },
  {
    id: 'voc-03',
    slug: 'toeic-speaking-and-writing-vocab-ep-9',
    category: 'vocabulary',
    orderNumber: 3,
    title: 'TOEIC Speaking and Writing Vocab - Ep 9 (Travel & Transportation)',
    shortDescription:
      'Hệ thống từ vựng chủ đề Giao thông, Sân bay, Đặt phòng khách sạn và Lịch trình di chuyển quốc tế.',
    thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900',
    level: 'Trung cấp (450–600+)',
    wordsCount: 3,
    isPublished: true,
    exercises: [
      {
        id: 'ex-vocab-ep5-test3',
        title: 'TEST 1',
        subtitle: 'Từ vựng Du lịch & Giao thông',
        questionCount: 3,
        durationMinutes: 6,
        level: 'Trung cấp (450–600+)',
      },
    ],
  },
  {
    id: 'voc-04',
    slug: 'toeic-speaking-and-writing-vocab-ep-7',
    category: 'vocabulary',
    orderNumber: 4,
    title: 'TOEIC Speaking and Writing Vocab - Ep 7 (Technology & Health)',
    shortDescription:
      'Từ vựng chuyên ngành Công nghệ thông tin, Bảo trì hệ thống, Sức khỏe nghề nghiệp và Môi trường làm việc.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900',
    level: 'Nâng cao (700+)',
    wordsCount: 3,
    isPublished: true,
    exercises: [
      {
        id: 'ex-vocab-ep5-test1',
        title: 'TEST 1',
        subtitle: 'Bài tập tổng hợp Từ vựng hình ảnh & âm thanh',
        questionCount: 5,
        durationMinutes: 10,
        level: 'Nâng cao (700+)',
      },
    ],
  },
  {
    id: 'voc-05',
    slug: 'toeic-speaking-and-writing-vocab-ep-8',
    category: 'vocabulary',
    orderNumber: 5,
    title: 'TOEIC Speaking and Writing Vocab - Ep 8 (Environment & Daily Life)',
    shortDescription:
      'Cụm từ ghi điểm trong bài thi Viết Email phản hồi khẩn cấp, Đời sống thường nhật và Bảo vệ môi trường.',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900',
    level: 'Nâng cao (700+)',
    wordsCount: 3,
    isPublished: true,
    exercises: [
      {
        id: 'ex-vocab-ep5-test3',
        title: 'TEST 1',
        subtitle: 'Trắc nghiệm Từ vựng Email & Đời sống',
        questionCount: 3,
        durationMinutes: 6,
        level: 'Nâng cao (700+)',
      },
    ],
  },

  // ----------------- LUYỆN NGHE (LISTENING) -----------------
  {
    id: 'lis-01',
    slug: 'camp-bomb-toeic-listening-2026',
    category: 'listening',
    orderNumber: 1,
    title: 'CAMP BOMB TOEIC LISTENING 2026 – Phản xạ Part 1 & Part 2',
    shortDescription:
      'Luyện nghe mô tả tranh (Part 1) và Hỏi – Đáp phản xạ nhanh (Part 2) kèm trình phát Audio tốc độ tùy chỉnh và Transcript song ngữ.',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=900',
    level: 'Trung cấp (450–600+)',
    durationLabel: '15 phút',
    listeningType: 'TOEIC Part 1 & Part 2',
    isPublished: true,
    exercises: [
      {
        id: 'ex-listen-part12-test1',
        title: 'TEST 1',
        subtitle: 'Luyện nghe Tranh tả người & Hỏi đáp Part 2',
        questionCount: 4,
        durationMinutes: 8,
        level: 'Trung cấp (450–600+)',
      },
      {
        id: 'ex-listen-part34-test2',
        title: 'TEST 2',
        subtitle: 'Luyện nghe Hội thoại ngắn & Bảng biểu',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Nâng cao (700+)',
      },
    ],
  },
  {
    id: 'lis-02',
    slug: 'submarine-toeic-listening-2026',
    category: 'listening',
    orderNumber: 2,
    title: 'SUBMARINE TOEIC LISTENING 2026 – Chuyên sâu Part 3 & Part 4',
    shortDescription:
      'Kỹ thuật bắt từ khóa (Keyword Skimming) và kết hợp nhìn biểu đồ/lịch trình trong các đoạn hội thoại Part 3 và bài nói chuyện Part 4.',
    thumbnail: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=900',
    level: 'Nâng cao (700+)',
    durationLabel: '20 phút',
    listeningType: 'TOEIC Part 3 & Part 4',
    isPublished: true,
    exercises: [
      {
        id: 'ex-listen-part34-test2',
        title: 'TEST 1',
        subtitle: 'Hội thoại Công sở & Bài nói kèm Biểu đồ',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Nâng cao (700+)',
      },
    ],
  },
  {
    id: 'lis-03',
    slug: 'foundation-toeic-2026',
    category: 'listening',
    orderNumber: 3,
    title: 'FOUNDATION TOEIC 2026 – Nghe cơ bản & Bắt âm chuẩn IPA',
    shortDescription:
      'Lộ trình luyện nghe từ gốc dành cho người mới bắt đầu: Phân biệt nguyên âm đôi, âm cuối (ending sounds) và hiện tượng nối âm thường gặp.',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900',
    level: 'Cơ bản (350+)',
    durationLabel: '12 phút',
    listeningType: 'Listening cơ bản',
    isPublished: true,
    exercises: [
      {
        id: 'ex-listen-part12-test1',
        title: 'TEST 1',
        subtitle: 'Nghe bắt từ khóa câu đơn cơ bản',
        questionCount: 4,
        durationMinutes: 8,
        level: 'Cơ bản (350+)',
      },
    ],
  },
  {
    id: 'lis-04',
    slug: 'beginners-toeic-2026',
    category: 'listening',
    orderNumber: 4,
    title: "BEGINNER'S TOEIC 2026 – Luyện nghe Part 1 & Part 2 theo chủ đề",
    shortDescription:
      'Làm quen tốc độ đọc của 4 giọng chuẩn ETS (Mỹ, Anh, Úc, Canada) qua các tình huống mua sắm, nhà hàng và văn phòng.',
    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900',
    level: 'Cơ bản (350+)',
    durationLabel: '15 phút',
    listeningType: 'TOEIC Part 1',
    isPublished: true,
    exercises: [
      {
        id: 'ex-listen-part12-test1',
        title: 'TEST 1',
        subtitle: 'Thực hành Part 1 – Mô tả tranh',
        questionCount: 4,
        durationMinutes: 8,
        level: 'Cơ bản (350+)',
      },
    ],
  },
  {
    id: 'lis-05',
    slug: 'master-toeic-2026',
    category: 'listening',
    orderNumber: 5,
    title: 'MASTER TOEIC 2026 – Luyện nghe tốc độ cao 800–990 TOEIC',
    shortDescription:
      'Chinh phục các câu hỏi suy luận ẩn ý người nói (Implied Meaning) và bài thông báo tốc độ nhanh trong Part 3 & Part 4.',
    thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900',
    level: 'Chuyên sâu (800+)',
    durationLabel: '25 phút',
    listeningType: 'TOEIC Part 4',
    isPublished: true,
    exercises: [
      {
        id: 'ex-listen-part34-test2',
        title: 'TEST 1',
        subtitle: 'Bài nói chuyện & Thông báo sân bay Part 4',
        questionCount: 3,
        durationMinutes: 8,
        level: 'Chuyên sâu (800+)',
      },
    ],
  },
]

// =========================================================================
// 2. DỮ LIỆU BÀI TẬP ĐA PHƯƠNG TIỆN (TÁCH BIỆT KHỎI ĐÁP ÁN ĐÚNG)
// =========================================================================

export const initialStudyExercises: StudyExercise[] = [
  // ----------------- BÀI TẬP 1: TỪ VỰNG HÌNH ẢNH + GHI ÂM + VĂN BẢN (BÁM SÁT ẢNH MẪU) -----------------
  {
    id: 'ex-vocab-ep5-test1',
    topicSlug: 'toeic-speaking-and-writing-vocab-ep-5',
    category: 'vocabulary',
    title: 'TEST 1',
    subtitle: 'Part 1 - Photographs & Audio Vocab',
    description:
      'Bài tập kết hợp Nghe phát âm + Quan sát hình ảnh + Chọn từ vựng/câu mô tả chính xác theo đúng chuẩn TOEIC.',
    level: 'Trung cấp (450–600+)',
    durationMinutes: 10,
    instructions:
      'Nghe đoạn ghi âm, quan sát kỹ bức ảnh minh họa bên trái và chọn đáp án chính xác nhất bên phải.',
    displayOrder: 1,
    questions: [
      {
        id: 'q-voc-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'Dễ (TOEIC 450+)',
        content: [
          {
            type: 'text',
            id: 'q1-txt',
            variant: 'instruction',
            content: 'Nghe phát âm và chọn danh từ chính xác mô tả nghề nghiệp của người phụ nữ trong bức ảnh:',
          },
          {
            type: 'audio',
            id: 'q1-aud',
            url: DEMO_AUDIO_A,
            title: 'Audio phát âm câu 1',
            durationSeconds: 15,
          },
          {
            type: 'image',
            id: 'q1-img',
            url: 'https://images.unsplash.com/photo-1507842229356-51c61504d3ab?w=1000',
            alt: 'Người phụ nữ đang xếp sách trên kệ thư viện',
            caption: 'Quan sát bối cảnh kệ sách thư viện trong ảnh',
          },
        ],
        options: [
          {
            id: 'opt-q1-a',
            label: 'A',
            content: [{ type: 'text', id: 'o1a', content: 'barbarian' }],
          },
          {
            id: 'opt-q1-b',
            label: 'B',
            content: [{ type: 'text', id: 'o1b', content: 'librarian' }],
          },
          {
            id: 'opt-q1-c',
            label: 'C',
            content: [{ type: 'text', id: 'o1c', content: 'vegetarian' }],
          },
          {
            id: 'opt-q1-d',
            label: 'D',
            content: [{ type: 'text', id: 'o1d', content: 'electrician' }],
          },
        ],
      },
      {
        id: 'q-voc-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'Dễ (TOEIC 450+)',
        content: [
          {
            type: 'text',
            id: 'q2-txt',
            variant: 'instruction',
            content: 'Quan sát bức ảnh và chọn từ vựng đúng chỉ đồ vật chứa các cuốn sách:',
          },
          {
            type: 'image',
            id: 'q2-img',
            url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1000',
            alt: 'Những dãy kệ sách gỗ trong thư viện',
          },
        ],
        options: [
          {
            id: 'opt-q2-a',
            label: 'A',
            content: [{ type: 'text', id: 'o2a', content: 'bookshelf (kệ sách)' }],
          },
          {
            id: 'opt-q2-b',
            label: 'B',
            content: [{ type: 'text', id: 'o2b', content: 'wardrobe (tủ quần áo)' }],
          },
          {
            id: 'opt-q2-c',
            label: 'C',
            content: [{ type: 'text', id: 'o2c', content: 'refrigerator (tủ lạnh)' }],
          },
          {
            id: 'opt-q2-d',
            label: 'D',
            content: [{ type: 'text', id: 'o2d', content: 'escalator (thang cuốn)' }],
          },
        ],
      },
      {
        id: 'q-voc-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'Trung bình (TOEIC 550+)',
        content: [
          {
            type: 'text',
            id: 'q3-txt',
            variant: 'instruction',
            content: 'Nghe đoạn ghi âm và chọn từ vựng phù hợp điền vào câu sau:',
          },
          {
            type: 'audio',
            id: 'q3-aud',
            url: DEMO_AUDIO_B,
            title: 'Audio câu 3',
            durationSeconds: 12,
          },
          {
            type: 'text',
            id: 'q3-prompt',
            variant: 'prompt',
            content: 'All department heads are attending the annual sales _______ in the main convention center.',
          },
        ],
        options: [
          {
            id: 'opt-q3-a',
            label: 'A',
            content: [{ type: 'text', id: 'o3a', content: 'conference' }],
          },
          {
            id: 'opt-q3-b',
            label: 'B',
            content: [{ type: 'text', id: 'o3b', content: 'passenger' }],
          },
          {
            id: 'opt-q3-c',
            label: 'C',
            content: [{ type: 'text', id: 'o3c', content: 'ingredient' }],
          },
          {
            id: 'opt-q3-d',
            label: 'D',
            content: [{ type: 'text', id: 'o3d', content: 'appliance' }],
          },
        ],
      },
      {
        id: 'q-voc-4',
        displayOrder: 4,
        questionType: 'single_choice',
        difficulty: 'Trung bình (TOEIC 600+)',
        content: [
          {
            type: 'text',
            id: 'q4-txt',
            variant: 'instruction',
            content: 'Quan sát hình ảnh kiểm tra kỹ thuật tại nhà máy và chọn động từ phù hợp nhất:',
          },
          {
            type: 'image',
            id: 'q4-img',
            url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000',
            alt: 'Kỹ sư đang kiểm tra thiết bị trong nhà máy',
          },
          {
            type: 'text',
            id: 'q4-prompt',
            variant: 'prompt',
            content: 'The quality control engineer is _______ the machinery to ensure safety compliance.',
          },
        ],
        options: [
          {
            id: 'opt-q4-a',
            label: 'A',
            content: [{ type: 'text', id: 'o4a', content: 'dining' }],
          },
          {
            id: 'opt-q4-b',
            label: 'B',
            content: [{ type: 'text', id: 'o4b', content: 'inspecting' }],
          },
          {
            id: 'opt-q4-c',
            label: 'C',
            content: [{ type: 'text', id: 'o4c', content: 'folding' }],
          },
          {
            id: 'opt-q4-d',
            label: 'D',
            content: [{ type: 'text', id: 'o4d', content: 'planting' }],
          },
        ],
      },
      {
        id: 'q-voc-5',
        displayOrder: 5,
        questionType: 'single_choice',
        difficulty: 'Khá (TOEIC 650+)',
        content: [
          {
            type: 'text',
            id: 'q5-txt',
            variant: 'instruction',
            content: 'Chọn hình ảnh và phương án minh họa đúng nghĩa của từ "conference (cuộc họp / hội thảo)":',
          },
        ],
        options: [
          {
            id: 'opt-q5-a',
            label: 'A',
            content: [
              { type: 'text', id: 'o5a-t', content: 'Buổi họp & thảo luận nhóm tại văn phòng' },
              {
                type: 'image',
                id: 'o5a-i',
                url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=500',
                alt: 'Cuộc họp văn phòng',
              },
            ],
          },
          {
            id: 'opt-q5-b',
            label: 'B',
            content: [
              { type: 'text', id: 'o5b-t', content: 'Khu vực máy bay cất cánh tại sân bay' },
              {
                type: 'image',
                id: 'o5b-i',
                url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500',
                alt: 'Máy bay tại sân bay',
              },
            ],
          },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 2: TỪ VỰNG NGỮ CẢNH VĂN PHÒNG -----------------
  {
    id: 'ex-vocab-ep5-test2',
    topicSlug: 'toeic-speaking-and-writing-vocab-ep-5',
    category: 'vocabulary',
    title: 'TEST 2',
    subtitle: 'Từ vựng Ngữ cảnh Văn phòng & Thương mại',
    description: 'Luyện tập chọn từ vựng tiếng Anh và nghĩa tiếng Việt chính xác trong câu.',
    level: 'Trung cấp (450–600+)',
    durationMinutes: 6,
    instructions: 'Đọc kỹ ngữ cảnh câu và chọn từ vựng phù hợp nhất.',
    displayOrder: 2,
    questions: [
      {
        id: 'q-voc2-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'Trung bình',
        content: [
          {
            type: 'text',
            id: 'qv21-t',
            variant: 'prompt',
            content: 'Please keep your original _______ in case you need to return or exchange the product.',
          },
        ],
        options: [
          { id: 'opt-v21-a', label: 'A', content: [{ type: 'text', id: 'ov21a', content: 'receipt (biên lai)' }] },
          { id: 'opt-v21-b', label: 'B', content: [{ type: 'text', id: 'ov21b', content: 'recipe (công thức nấu ăn)' }] },
          { id: 'opt-v21-c', label: 'C', content: [{ type: 'text', id: 'ov21c', content: 'reception (quầy lễ tân)' }] },
          { id: 'opt-v21-d', label: 'D', content: [{ type: 'text', id: 'ov21d', content: 'recipient (người nhận)' }] },
        ],
      },
      {
        id: 'q-voc2-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'Trung bình',
        content: [
          {
            type: 'text',
            id: 'qv22-t',
            variant: 'prompt',
            content: 'The accounting department will _______ employees for approved travel expenses.',
          },
        ],
        options: [
          { id: 'opt-v22-a', label: 'A', content: [{ type: 'text', id: 'ov22a', content: 'reimburse' }] },
          { id: 'opt-v22-b', label: 'B', content: [{ type: 'text', id: 'ov22b', content: 'renovate' }] },
          { id: 'opt-v22-c', label: 'C', content: [{ type: 'text', id: 'ov22c', content: 'resemble' }] },
          { id: 'opt-v22-d', label: 'D', content: [{ type: 'text', id: 'ov22d', content: 'relocate' }] },
        ],
      },
      {
        id: 'q-voc2-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'Khá',
        content: [
          {
            type: 'text',
            id: 'qv23-t',
            variant: 'prompt',
            content: 'Hotel guests are offered a _______ continental breakfast every morning in the lounge.',
          },
        ],
        options: [
          { id: 'opt-v23-a', label: 'A', content: [{ type: 'text', id: 'ov23a', content: 'complimentary' }] },
          { id: 'opt-v23-b', label: 'B', content: [{ type: 'text', id: 'ov23b', content: 'confidential' }] },
          { id: 'opt-v23-c', label: 'C', content: [{ type: 'text', id: 'ov23c', content: 'crowded' }] },
          { id: 'opt-v23-d', label: 'D', content: [{ type: 'text', id: 'ov23d', content: 'temporary' }] },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 3: COLLOCATIONS & TỪ ĐỒNG NGHĨA -----------------
  {
    id: 'ex-vocab-ep5-test3',
    topicSlug: 'toeic-speaking-and-writing-vocab-ep-5',
    category: 'vocabulary',
    title: 'TEST 3',
    subtitle: 'Phản xạ Từ đồng nghĩa & Collocations',
    description: 'Kiểm tra khả năng nhận diện cụm từ cố định trong TOEIC Reading Part 5 & Part 7.',
    level: 'Nâng cao (700+)',
    durationMinutes: 6,
    instructions: 'Chọn đáp án tạo thành cụm từ thương mại đúng chuẩn.',
    displayOrder: 3,
    questions: [
      {
        id: 'q-voc3-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'Nâng cao',
        content: [
          {
            type: 'text',
            id: 'qv31-t',
            variant: 'prompt',
            content: 'All passengers must present a valid _______ pass before entering the departure gate.',
          },
        ],
        options: [
          { id: 'opt-v31-a', label: 'A', content: [{ type: 'text', id: 'ov31a', content: 'boarding' }] },
          { id: 'opt-v31-b', label: 'B', content: [{ type: 'text', id: 'ov31b', content: 'walking' }] },
          { id: 'opt-v31-c', label: 'C', content: [{ type: 'text', id: 'ov31c', content: 'staying' }] },
          { id: 'opt-v31-d', label: 'D', content: [{ type: 'text', id: 'ov31d', content: 'Seat' }] },
        ],
      },
      {
        id: 'q-voc3-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'Nâng cao',
        content: [
          {
            type: 'text',
            id: 'qv32-t',
            variant: 'prompt',
            content: 'The main auditorium can _______ up to 500 attendees for the technology summit.',
          },
        ],
        options: [
          { id: 'opt-v32-a', label: 'A', content: [{ type: 'text', id: 'ov32a', content: 'accommodate' }] },
          { id: 'opt-v32-b', label: 'B', content: [{ type: 'text', id: 'ov32b', content: 'hesitate' }] },
          { id: 'opt-v32-c', label: 'C', content: [{ type: 'text', id: 'ov32c', content: 'participate' }] },
          { id: 'opt-v32-d', label: 'D', content: [{ type: 'text', id: 'ov32d', content: 'graduate' }] },
        ],
      },
      {
        id: 'q-voc3-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'Nâng cao',
        content: [
          {
            type: 'text',
            id: 'qv33-t',
            variant: 'prompt',
            content: 'Customer service representatives are trained to respond _______ to client complaints.',
          },
        ],
        options: [
          { id: 'opt-v33-a', label: 'A', content: [{ type: 'text', id: 'ov33a', content: 'promptly' }] },
          { id: 'opt-v33-b', label: 'B', content: [{ type: 'text', id: 'ov33b', content: 'rarely' }] },
          { id: 'opt-v33-c', label: 'C', content: [{ type: 'text', id: 'ov33c', content: 'loosely' }] },
          { id: 'opt-v33-d', label: 'D', content: [{ type: 'text', id: 'ov33d', content: 'narrowly' }] },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 4: NGỮ PHÁP TRỌNG TÂM PART 5 -----------------
  {
    id: 'ex-gram-rc-test1',
    topicSlug: 'camp-bomb-toeic-rc-2026',
    category: 'grammar',
    title: 'TEST 1',
    subtitle: 'Chuyên đề Thì động từ & Từ loại Part 5',
    description: 'Bài tập rèn phản xạ giải nhanh câu hỏi ngữ pháp TOEIC Reading Part 5 dưới 20 giây/câu.',
    level: 'Trung cấp (450–600+)',
    durationMinutes: 10,
    instructions: 'Chọn phương án đúng về ngữ pháp để hoàn thành từng câu sau.',
    displayOrder: 1,
    questions: [
      {
        id: 'q-gram-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'Cơ bản (TOEIC 400+)',
        content: [
          {
            type: 'text',
            id: 'qg1-i',
            variant: 'instruction',
            content: 'Choose the correct verb form to complete the sentence:',
          },
          {
            type: 'text',
            id: 'qg1-p',
            variant: 'prompt',
            content: 'Ms. Tanaka _______ the regional sales report every Monday morning.',
          },
        ],
        options: [
          { id: 'opt-g1-a', label: 'A', content: [{ type: 'text', id: 'og1a', content: 'review' }] },
          { id: 'opt-g1-b', label: 'B', content: [{ type: 'text', id: 'og1b', content: 'reviews' }] },
          { id: 'opt-g1-c', label: 'C', content: [{ type: 'text', id: 'og1c', content: 'reviewing' }] },
          { id: 'opt-g1-d', label: 'D', content: [{ type: 'text', id: 'og1d', content: 'to review' }] },
        ],
      },
      {
        id: 'q-gram-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'Trung bình (TOEIC 500+)',
        content: [
          {
            type: 'text',
            id: 'qg2-i',
            variant: 'instruction',
            content: 'Xác định từ loại cần điền vào trước động từ chính "improved":',
          },
          {
            type: 'text',
            id: 'qg2-p',
            variant: 'prompt',
            content: 'The updated logistics system has _______ improved our delivery speed.',
          },
        ],
        options: [
          { id: 'opt-g2-a', label: 'A', content: [{ type: 'text', id: 'og2a', content: 'significant' }] },
          { id: 'opt-g2-b', label: 'B', content: [{ type: 'text', id: 'og2b', content: 'significantly' }] },
          { id: 'opt-g2-c', label: 'C', content: [{ type: 'text', id: 'og2c', content: 'significance' }] },
          { id: 'opt-g2-d', label: 'D', content: [{ type: 'text', id: 'og2d', content: 'signify' }] },
        ],
      },
      {
        id: 'q-gram-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'Trung bình (TOEIC 550+)',
        content: [
          {
            type: 'text',
            id: 'qg3-i',
            variant: 'instruction',
            content: 'Quan sát sơ đồ/hình ảnh cuộc họp và chọn giới từ/liên từ đúng:',
          },
          {
            type: 'image',
            id: 'qg3-img',
            url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
            alt: 'Nhóm nhân viên vẫn họp đúng giờ dù thời tiết xấu',
          },
          {
            type: 'text',
            id: 'qg3-p',
            variant: 'prompt',
            content: '_______ the heavy rain, all committee members arrived at the seminar on time.',
          },
        ],
        options: [
          { id: 'opt-g3-a', label: 'A', content: [{ type: 'text', id: 'og3a', content: 'Although' }] },
          { id: 'opt-g3-b', label: 'B', content: [{ type: 'text', id: 'og3b', content: 'Despite' }] },
          { id: 'opt-g3-c', label: 'C', content: [{ type: 'text', id: 'og3c', content: 'Because' }] },
          { id: 'opt-g3-d', label: 'D', content: [{ type: 'text', id: 'og3d', content: 'Unless' }] },
        ],
      },
      {
        id: 'q-gram-4',
        displayOrder: 4,
        questionType: 'single_choice',
        difficulty: 'Khá (TOEIC 650+)',
        content: [
          {
            type: 'text',
            id: 'qg4-p',
            variant: 'prompt',
            content: 'The director requested that every department _______ its budget proposal by Friday.',
          },
        ],
        options: [
          { id: 'opt-g4-a', label: 'A', content: [{ type: 'text', id: 'og4a', content: 'submits' }] },
          { id: 'opt-g4-b', label: 'B', content: [{ type: 'text', id: 'og4b', content: 'submit' }] },
          { id: 'opt-g4-c', label: 'C', content: [{ type: 'text', id: 'og4c', content: 'submitted' }] },
          { id: 'opt-g4-d', label: 'D', content: [{ type: 'text', id: 'og4d', content: 'submitting' }] },
        ],
      },
      {
        id: 'q-gram-5',
        displayOrder: 5,
        questionType: 'single_choice',
        difficulty: 'Khá (TOEIC 650+)',
        content: [
          {
            type: 'text',
            id: 'qg5-p',
            variant: 'prompt',
            content: 'Ms. Rivera completed the financial audit _______ without any external assistance.',
          },
        ],
        options: [
          { id: 'opt-g5-a', label: 'A', content: [{ type: 'text', id: 'og5a', content: 'she' }] },
          { id: 'opt-g5-b', label: 'B', content: [{ type: 'text', id: 'og5b', content: 'her' }] },
          { id: 'opt-g5-c', label: 'C', content: [{ type: 'text', id: 'og5c', content: 'hers' }] },
          { id: 'opt-g5-d', label: 'D', content: [{ type: 'text', id: 'og5d', content: 'herself' }] },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 5: NGỮ PHÁP NÂNG CAO -----------------
  {
    id: 'ex-gram-rc-test2',
    topicSlug: 'submarine-toeic-rc-2026',
    category: 'grammar',
    title: 'TEST 2',
    subtitle: 'Câu bị động, Mệnh đề quan hệ & Đảo ngữ',
    description: 'Bộ câu hỏi phân loại mức điểm 700+ TOEIC Reading.',
    level: 'Nâng cao (700+)',
    durationMinutes: 8,
    instructions: 'Chọn cấu trúc ngữ pháp chính xác nhất cho mỗi câu.',
    displayOrder: 2,
    questions: [
      {
        id: 'q-gram2-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'Nâng cao (TOEIC 700+)',
        content: [
          {
            type: 'text',
            id: 'qg21-p',
            variant: 'prompt',
            content: 'Anyone _______ to attend the international trade fair should register online before May 10.',
          },
        ],
        options: [
          { id: 'opt-g21-a', label: 'A', content: [{ type: 'text', id: 'og21a', content: 'wishes' }] },
          { id: 'opt-g21-b', label: 'B', content: [{ type: 'text', id: 'og21b', content: 'wished' }] },
          { id: 'opt-g21-c', label: 'C', content: [{ type: 'text', id: 'og21c', content: 'wishing' }] },
          { id: 'opt-g21-d', label: 'D', content: [{ type: 'text', id: 'og21d', content: 'wish' }] },
        ],
      },
      {
        id: 'q-gram2-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'Nâng cao (TOEIC 750+)',
        content: [
          {
            type: 'text',
            id: 'qg22-p',
            variant: 'prompt',
            content: '_______ you have any further questions regarding the warranty policy, please contact our support team.',
          },
        ],
        options: [
          { id: 'opt-g22-a', label: 'A', content: [{ type: 'text', id: 'og22a', content: 'Should' }] },
          { id: 'opt-g22-b', label: 'B', content: [{ type: 'text', id: 'og22b', content: 'Were' }] },
          { id: 'opt-g22-c', label: 'C', content: [{ type: 'text', id: 'og22c', content: 'Unless' }] },
          { id: 'opt-g22-d', label: 'D', content: [{ type: 'text', id: 'og22d', content: 'Because' }] },
        ],
      },
      {
        id: 'q-gram2-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'Nâng cao (TOEIC 700+)',
        content: [
          {
            type: 'text',
            id: 'qg23-p',
            variant: 'prompt',
            content: 'The newly renovated conference hall _______ by the chief architect last week.',
          },
        ],
        options: [
          { id: 'opt-g23-a', label: 'A', content: [{ type: 'text', id: 'og23a', content: 'inspected' }] },
          { id: 'opt-g23-b', label: 'B', content: [{ type: 'text', id: 'og23b', content: 'was inspected' }] },
          { id: 'opt-g23-c', label: 'C', content: [{ type: 'text', id: 'og23c', content: 'is inspecting' }] },
          { id: 'opt-g23-d', label: 'D', content: [{ type: 'text', id: 'og23d', content: 'has inspected' }] },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 6: LUYỆN NGHE PART 1 & PART 2 (AUDIO + IMAGE + TEXT) -----------------
  {
    id: 'ex-listen-part12-test1',
    topicSlug: 'camp-bomb-toeic-listening-2026',
    category: 'listening',
    title: 'TEST 1',
    subtitle: 'Luyện nghe Part 1 (Photographs) & Part 2 (Question-Response)',
    description: 'Kết hợp nghe file ghi âm, quan sát hình ảnh và phản xạ chọn câu trả lời đúng.',
    level: 'Trung cấp (450–600+)',
    durationMinutes: 8,
    instructions: 'Nhấn nút Play trên thanh Audio để nghe câu hỏi, sau đó chọn đáp án đúng A, B, C hoặc D.',
    displayOrder: 1,
    questions: [
      {
        id: 'q-lis-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 1',
        content: [
          {
            type: 'text',
            id: 'ql1-t',
            variant: 'instruction',
            content: 'Listen to the four statements and choose the one that best describes the photograph:',
          },
          {
            type: 'audio',
            id: 'ql1-a',
            url: DEMO_AUDIO_A,
            title: 'Part 1 - Question 01',
            durationSeconds: 18,
          },
          {
            type: 'image',
            id: 'ql1-i',
            url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1000',
            alt: 'Các nhân viên đang thảo luận quanh bàn họp với máy tính xách tay',
          },
        ],
        options: [
          { id: 'opt-l1-a', label: 'A', content: [{ type: 'text', id: 'ol1a', content: '(A) They are boarding a commuter train.' }] },
          { id: 'opt-l1-b', label: 'B', content: [{ type: 'text', id: 'ol1b', content: '(B) They are gathered around a conference table.' }] },
          { id: 'opt-l1-c', label: 'C', content: [{ type: 'text', id: 'ol1c', content: '(C) They are painting the office walls.' }] },
          { id: 'opt-l1-d', label: 'D', content: [{ type: 'text', id: 'ol1d', content: '(D) They are unloading boxes from a truck.' }] },
        ],
      },
      {
        id: 'q-lis-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 1',
        content: [
          {
            type: 'text',
            id: 'ql2-t',
            variant: 'instruction',
            content: 'Listen to the recording and select the statement that best describes the picture:',
          },
          {
            type: 'audio',
            id: 'ql2-a',
            url: DEMO_AUDIO_B,
            title: 'Part 1 - Question 02',
            durationSeconds: 16,
          },
          {
            type: 'image',
            id: 'ql2-i',
            url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000',
            alt: 'Học viên đang làm việc cùng nhau trước màn hình laptop',
          },
        ],
        options: [
          { id: 'opt-l2-a', label: 'A', content: [{ type: 'text', id: 'ol2a', content: '(A) The room is completely unoccupied.' }] },
          { id: 'opt-l2-b', label: 'B', content: [{ type: 'text', id: 'ol2b', content: '(B) Some people are looking at a laptop screen.' }] },
          { id: 'opt-l2-c', label: 'C', content: [{ type: 'text', id: 'ol2c', content: '(C) A man is repairing a bicycle.' }] },
          { id: 'opt-l2-d', label: 'D', content: [{ type: 'text', id: 'ol2d', content: '(D) The chairs are stacked on the tables.' }] },
        ],
      },
      {
        id: 'q-lis-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 2',
        content: [
          {
            type: 'text',
            id: 'ql3-t',
            variant: 'instruction',
            content: 'Listen to the question and three responses. Choose the best response:',
          },
          {
            type: 'audio',
            id: 'ql3-a',
            url: DEMO_AUDIO_A,
            title: 'Part 2 - Question 03',
            durationSeconds: 14,
          },
          {
            type: 'text',
            id: 'ql3-p',
            variant: 'prompt',
            content: 'Question: When is the regional sales meeting scheduled to begin?',
          },
        ],
        options: [
          { id: 'opt-l3-a', label: 'A', content: [{ type: 'text', id: 'ol3a', content: '(A) It starts at ten o’clock in Room B.' }] },
          { id: 'opt-l3-b', label: 'B', content: [{ type: 'text', id: 'ol3b', content: '(B) Yes, I met him yesterday.' }] },
          { id: 'opt-l3-c', label: 'C', content: [{ type: 'text', id: 'ol3c', content: '(C) About twenty-five pages long.' }] },
        ],
      },
      {
        id: 'q-lis-4',
        displayOrder: 4,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 2',
        content: [
          {
            type: 'text',
            id: 'ql4-t',
            variant: 'instruction',
            content: 'Listen to the question and choose the most appropriate response:',
          },
          {
            type: 'audio',
            id: 'ql4-a',
            url: DEMO_AUDIO_B,
            title: 'Part 2 - Question 04',
            durationSeconds: 14,
          },
          {
            type: 'text',
            id: 'ql4-p',
            variant: 'prompt',
            content: 'Question: Who is responsible for ordering the new office supplies?',
          },
        ],
        options: [
          { id: 'opt-l4-a', label: 'A', content: [{ type: 'text', id: 'ol4a', content: '(A) On the second floor.' }] },
          { id: 'opt-l4-b', label: 'B', content: [{ type: 'text', id: 'ol4b', content: '(B) Mr. Tanaka handles all purchasing requests.' }] },
          { id: 'opt-l4-c', label: 'C', content: [{ type: 'text', id: 'ol4c', content: '(C) Free shipping on all orders.' }] },
        ],
      },
    ],
  },

  // ----------------- BÀI TẬP 7: LUYỆN NGHE PART 3 & PART 4 -----------------
  {
    id: 'ex-listen-part34-test2',
    topicSlug: 'submarine-toeic-listening-2026',
    category: 'listening',
    title: 'TEST 2',
    subtitle: 'Luyện nghe Part 3 (Conversations) & Part 4 (Talks)',
    description: 'Nghe đoạn hội thoại công sở kết hợp quan sát bảng biểu và chọn đáp án đúng.',
    level: 'Nâng cao (700+)',
    durationMinutes: 8,
    instructions: 'Nghe kỹ đoạn ghi âm và trả lời các câu hỏi bên dưới.',
    displayOrder: 2,
    questions: [
      {
        id: 'q-lis2-1',
        displayOrder: 1,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 3',
        content: [
          {
            type: 'text',
            id: 'ql21-t',
            variant: 'instruction',
            content: 'Nghe đoạn hội thoại giữa hai đồng nghiệp và trả lời câu hỏi:',
          },
          {
            type: 'audio',
            id: 'ql21-a',
            url: DEMO_AUDIO_A,
            title: 'Conversation Track 01',
            durationSeconds: 25,
          },
          {
            type: 'text',
            id: 'ql21-p',
            variant: 'prompt',
            content: 'What problem does the man mention about the main training room?',
          },
        ],
        options: [
          { id: 'opt-l21-a', label: 'A', content: [{ type: 'text', id: 'ol21a', content: 'The air conditioner is too loud.' }] },
          { id: 'opt-l21-b', label: 'B', content: [{ type: 'text', id: 'ol21b', content: 'The projector has stopped working.' }] },
          { id: 'opt-l21-c', label: 'C', content: [{ type: 'text', id: 'ol21c', content: 'There are not enough chairs for guests.' }] },
          { id: 'opt-l21-d', label: 'D', content: [{ type: 'text', id: 'ol21d', content: 'The room key is missing.' }] },
        ],
      },
      {
        id: 'q-lis2-2',
        displayOrder: 2,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 3',
        content: [
          {
            type: 'audio',
            id: 'ql22-a',
            url: DEMO_AUDIO_A,
            title: 'Conversation Track 01',
            durationSeconds: 25,
          },
          {
            type: 'text',
            id: 'ql22-p',
            variant: 'prompt',
            content: 'Where will the client presentation most likely take place instead?',
          },
        ],
        options: [
          { id: 'opt-l22-a', label: 'A', content: [{ type: 'text', id: 'ol22a', content: 'In the cafeteria on the first floor' }] },
          { id: 'opt-l22-b', label: 'B', content: [{ type: 'text', id: 'ol22b', content: 'In Room 302 on the third floor' }] },
          { id: 'opt-l22-c', label: 'C', content: [{ type: 'text', id: 'ol22c', content: 'At the client’s headquarters' }] },
          { id: 'opt-l22-d', label: 'D', content: [{ type: 'text', id: 'ol22d', content: 'In the lobby area' }] },
        ],
      },
      {
        id: 'q-lis2-3',
        displayOrder: 3,
        questionType: 'single_choice',
        difficulty: 'TOEIC Part 4 (Graphic)',
        content: [
          {
            type: 'text',
            id: 'ql23-t',
            variant: 'instruction',
            content: 'Nghe thông báo tại sân bay kết hợp quan sát hình ảnh nhà ga:',
          },
          {
            type: 'audio',
            id: 'ql23-a',
            url: DEMO_AUDIO_B,
            title: 'Airport Announcement Track',
            durationSeconds: 22,
          },
          {
            type: 'image',
            id: 'ql23-i',
            url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000',
            alt: 'Khu vực cổng chờ lên máy bay tại sân bay',
          },
          {
            type: 'text',
            id: 'ql23-p',
            variant: 'prompt',
            content: 'Why has boarding for Flight 408 to Tokyo been delayed?',
          },
        ],
        options: [
          { id: 'opt-l23-a', label: 'A', content: [{ type: 'text', id: 'ol23a', content: 'Severe weather conditions' }] },
          { id: 'opt-l23-b', label: 'B', content: [{ type: 'text', id: 'ol23b', content: 'A minor mechanical inspection' }] },
          { id: 'opt-l23-c', label: 'C', content: [{ type: 'text', id: 'ol23c', content: 'A late arriving flight crew' }] },
          { id: 'opt-l23-d', label: 'D', content: [{ type: 'text', id: 'ol23d', content: 'A gate change to Terminal 2' }] },
        ],
      },
    ],
  },
]

// =========================================================================
// 3. KHO ĐÁP ÁN & LỜI GIẢI CHI TIẾT (TÁCH RIÊNG - CHỈ TRẢ VỀ SAU KHI NỘP BÀI)
// =========================================================================

export const serverAnswerKeys: Record<string, QuestionAnswerKey> = {
  // Bài 1: Vocab Ep 5 - Test 1
  'q-voc-1': {
    questionId: 'q-voc-1',
    correctOptionId: 'opt-q1-b',
    audioTranscript: '"The woman is working as a librarian and sorting books on the wooden shelf."',
    audioTranslation: 'Dịch nghĩa: "Người phụ nữ đang làm công việc của một thủ thư và sắp xếp các cuốn sách trên kệ gỗ."',
    explanation:
      '• librarian /laɪˈbreəriən/ (danh từ): Người thủ thư, người làm việc trong thư viện sách.\n• barbarian /bɑːˈbeəriən/ (danh từ): Người dã man (bẫy đồng âm đuôi "-arian" rất hay gặp trong TOEIC Part 1).\n• Trong bức ảnh người phụ nữ đang xếp sách lên kệ thư viện nên "librarian" là đáp án chính xác.',
  },
  'q-voc-2': {
    questionId: 'q-voc-2',
    correctOptionId: 'opt-q2-a',
    explanation:
      '• bookshelf /ˈbʊkʃelf/ (n): Giá sách, kệ đựng sách.\n• wardrobe (n): Tủ quần áo; refrigerator (n): Tủ lạnh; escalator (n): Thang cuốn.',
  },
  'q-voc-3': {
    questionId: 'q-voc-3',
    correctOptionId: 'opt-q3-a',
    audioTranscript: '"All department heads are attending the annual sales conference in the main convention center."',
    audioTranslation: 'Dịch nghĩa: "Tất cả trưởng bộ phận đang tham dự hội nghị kinh doanh thường niên tại trung tâm hội nghị chính."',
    explanation:
      '• conference /ˈkɒnfərəns/ (n): Hội nghị, cuộc họp lớn.\n• Cụm cố định: "annual sales conference" (hội nghị bán hàng thường niên).',
  },
  'q-voc-4': {
    questionId: 'q-voc-4',
    correctOptionId: 'opt-q4-b',
    explanation:
      '• inspect /ɪnˈspekt/ (v): Kiểm tra, thanh tra kỹ lưỡng thiết bị/máy móc để đảm bảo tiêu chuẩn an toàn (safety compliance).',
  },
  'q-voc-5': {
    questionId: 'q-voc-5',
    correctOptionId: 'opt-q5-a',
    explanation:
      '• "conference" nghĩa là hội nghị / cuộc họp thảo luận chuyên đề, tương ứng với hình ảnh nhóm nhân sự đang họp tại văn phòng.',
  },

  // Bài 2: Vocab Ep 5 - Test 2
  'q-voc2-1': {
    questionId: 'q-voc2-1',
    correctOptionId: 'opt-v21-a',
    explanation:
      '• receipt /rɪˈsiːt/ (n): Biên lai, hóa đơn mua hàng (chứng từ cần giữ lại khi muốn đổi/trả sản phẩm).\n• Phân biệt với recipe (công thức nấu ăn), reception (lễ tân) và recipient (người nhận).',
  },
  'q-voc2-2': {
    questionId: 'q-voc2-2',
    correctOptionId: 'opt-v22-a',
    explanation:
      '• reimburse sb for sth (v): Hoàn trả lại tiền/chi phí công tác cho nhân viên.',
  },
  'q-voc2-3': {
    questionId: 'q-voc2-3',
    correctOptionId: 'opt-v23-a',
    explanation:
      '• complimentary /ˌkɒmplɪˈmentri/ (adj): Miễn phí, tặng kèm. Cụm kinh điển trong TOEIC: "complimentary breakfast" (bữa sáng miễn phí cho khách lưu trú).',
  },

  // Bài 3: Vocab Ep 5 - Test 3
  'q-voc3-1': {
    questionId: 'q-voc3-1',
    correctOptionId: 'opt-v31-a',
    explanation:
      '• boarding pass (n): Thẻ lên máy bay. Đây là cụm danh từ ghép xuất hiện liên tục trong chủ đề Travel.',
  },
  'q-voc3-2': {
    questionId: 'q-voc3-2',
    correctOptionId: 'opt-v32-a',
    explanation:
      '• accommodate + số lượng người (v): Có sức chứa bao nhiêu khách/người tham dự.',
  },
  'q-voc3-3': {
    questionId: 'q-voc3-3',
    correctOptionId: 'opt-v33-a',
    explanation:
      '• respond promptly (collocation): Phản hồi một cách nhanh chóng, kịp thời.',
  },

  // Bài 4: Grammar Test 1
  'q-gram-1': {
    questionId: 'q-gram-1',
    correctOptionId: 'opt-g1-b',
    explanation:
      '• Dấu hiệu "every Monday morning" chỉ thói quen lặp lại ở hiện tại -> chia thì Hiện tại đơn.\n• Chủ ngữ "Ms. Tanaka" là ngôi thứ 3 số ít nên động từ thêm "-s": reviews.',
  },
  'q-gram-2': {
    questionId: 'q-gram-2',
    correctOptionId: 'opt-g2-b',
    explanation:
      '• Giữa trợ động từ "has" và phân từ hai "improved" cần một Trạng từ (Adverb) để bổ nghĩa cho động từ -> chọn "significantly".',
  },
  'q-gram-3': {
    questionId: 'q-gram-3',
    correctOptionId: 'opt-g3-b',
    explanation:
      '• Theo sau chỗ trống là cụm danh từ "the heavy rain" (không có động từ chia thì) và mang nghĩa nhượng bộ -> dùng giới từ "Despite" (Mặc dù). "Although" và "Because" là liên từ nên phải đi với mệnh đề S + V.',
  },
  'q-gram-4': {
    questionId: 'q-gram-4',
    correctOptionId: 'opt-g4-b',
    explanation:
      '• Cấu trúc giả định thức (Subjunctive): request/suggest/recommend + that + S + V(nguyên thể không chia) -> chọn "submit" dù chủ ngữ là "every department".',
  },
  'q-gram-5': {
    questionId: 'q-gram-5',
    correctOptionId: 'opt-g5-d',
    explanation:
      '• Mệnh đề đã đủ Chủ ngữ (Ms. Rivera) + Động từ (completed) + Tân ngữ (the financial audit). Chỗ trống kết hợp với "without any external assistance" cần Đại từ phản thân "herself" để nhấn mạnh việc tự mình hoàn thành.',
  },

  // Bài 5: Grammar Test 2
  'q-gram2-1': {
    questionId: 'q-gram2-1',
    correctOptionId: 'opt-g21-c',
    explanation:
      '• Câu đã có động từ chính là "should register". Chỗ trống cần rút gọn mệnh đề quan hệ chủ động (who wishes -> wishing).',
  },
  'q-gram2-2': {
    questionId: 'q-gram2-2',
    correctOptionId: 'opt-g22-a',
    explanation:
      '• Đảo ngữ câu điều kiện loại 1: "Should + S + V(nguyên thể)" thay cho "If you should have...".',
  },
  'q-gram2-3': {
    questionId: 'q-gram2-3',
    correctOptionId: 'opt-g23-b',
    explanation:
      '• Chủ ngữ là vật ("The newly renovated conference hall"), theo sau có "by the chief architect" và dấu hiệu quá khứ "last week" -> chia bị động quá khứ đơn: "was inspected".',
  },

  // Bài 6: Listening Test 1
  'q-lis-1': {
    questionId: 'q-lis-1',
    correctOptionId: 'opt-l1-b',
    audioTranscript:
      '(A) They are boarding a commuter train. (B) They are gathered around a conference table. (C) They are painting the office walls. (D) They are unloading boxes from a truck.',
    audioTranslation:
      'Dịch nghĩa: (A) Họ đang lên tàu điện. (B) Họ đang tụ họp quanh bàn hội nghị. (C) Họ đang sơn tường văn phòng. (D) Họ đang dỡ các thùng hàng từ xe tải.',
    explanation:
      '• Trong bức ảnh các thành viên đang ngồi họp xung quanh bàn cùng laptop -> "gathered around a conference table" mô tả chính xác nhất.',
  },
  'q-lis-2': {
    questionId: 'q-lis-2',
    correctOptionId: 'opt-l2-b',
    audioTranscript:
      '(A) The room is completely unoccupied. (B) Some people are looking at a laptop screen. (C) A man is repairing a bicycle. (D) The chairs are stacked on the tables.',
    audioTranslation:
      'Dịch nghĩa: (A) Căn phòng hoàn toàn trống không có người. (B) Một vài người đang nhìn vào màn hình máy tính xách tay. (C) Một người đàn ông đang sửa xe đạp. (D) Những chiếc ghế được xếp chồng lên bàn.',
    explanation:
      '• Bức ảnh cho thấy nhóm học viên đang cùng nhìn vào màn hình laptop để trao đổi bài -> đáp án (B).',
  },
  'q-lis-3': {
    questionId: 'q-lis-3',
    correctOptionId: 'opt-l3-a',
    audioTranscript:
      'When is the regional sales meeting scheduled to begin? — (A) It starts at ten o’clock in Room B. (B) Yes, I met him yesterday. (C) About twenty-five pages long.',
    audioTranslation:
      'Khi nào cuộc họp kinh doanh khu vực dự kiến bắt đầu? — (A) Nó bắt đầu lúc 10 giờ tại Phòng B.',
    explanation:
      '• Câu hỏi "When..." hỏi về thời điểm bắt đầu cuộc họp -> trả lời bằng mốc giờ "at ten o’clock" (A). Đáp án (B) bẫy lặp từ "meeting/met".',
  },
  'q-lis-4': {
    questionId: 'q-lis-4',
    correctOptionId: 'opt-l4-b',
    audioTranscript:
      'Who is responsible for ordering the new office supplies? — (A) On the second floor. (B) Mr. Tanaka handles all purchasing requests. (C) Free shipping on all orders.',
    audioTranslation:
      'Ai chịu trách nhiệm đặt văn phòng phẩm mới? — (B) Ông Tanaka phụ trách mọi yêu cầu mua hàng.',
    explanation:
      '• Câu hỏi "Who..." hỏi về người phụ trách -> đáp án (B) nêu tên "Mr. Tanaka" và dùng từ đồng nghĩa "ordering = purchasing requests".',
  },

  // Bài 7: Listening Test 2
  'q-lis2-1': {
    questionId: 'q-lis2-1',
    correctOptionId: 'opt-l21-b',
    audioTranscript:
      'Man: Hi Sarah, the projector in the main training room just stopped working, and our client presentation starts in thirty minutes.',
    audioTranslation:
      'Người đàn ông: Chào Sarah, máy chiếu ở phòng đào tạo chính vừa ngừng hoạt động, mà buổi thuyết trình với khách hàng bắt đầu sau 30 phút nữa.',
    explanation:
      '• Người đàn ông nói rõ: "the projector in the main training room just stopped working" -> đáp án B.',
  },
  'q-lis2-2': {
    questionId: 'q-lis2-2',
    correctOptionId: 'opt-l22-b',
    audioTranscript:
      'Woman: Don’t worry. Room 302 on the third floor is available right now, and it has a brand-new smart display.',
    audioTranslation:
      'Người phụ nữ: Đừng lo. Phòng 302 trên tầng 3 hiện đang trống và có sẵn màn hình thông minh mới.',
    explanation:
      '• Người phụ nữ đề xuất chuyển sang "Room 302 on the third floor" -> đáp án B.',
  },
  'q-lis2-3': {
    questionId: 'q-lis2-3',
    correctOptionId: 'opt-l23-b',
    audioTranscript:
      'Announcement: Attention passengers on Flight 408 to Tokyo. Due to a minor mechanical inspection, boarding has been delayed by twenty minutes.',
    audioTranslation:
      'Thông báo: Xin lưu ý hành khách trên chuyến bay 408 đi Tokyo. Do kiểm tra kỹ thuật nhỏ, việc lên máy bay bị hoãn 20 phút.',
    explanation:
      '• Thông báo nêu nguyên nhân trực tiếp sau cụm "Due to": "a minor mechanical inspection" -> đáp án B.',
  },
}
