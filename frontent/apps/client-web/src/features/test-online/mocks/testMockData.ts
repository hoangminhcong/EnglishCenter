import type {
  QuestionGroup,
  ScoreConversionPoint,
  ServerTestAnswerKey,
  Test,
  TestPart,
} from '@/features/test-online/types/test.types'

/**
 * Tạo chuỗi âm thanh WAV (Data URL) tự thân không phụ thuộc mạng ngoài,
 * giúp học viên nghe thử loa và trải nghiệm thực tế cơ chế "Listening chỉ phát 1 lần rồi tự chuyển câu/nhóm tiếp theo".
 */
function buildMockAudioWavDataUrl(frequencies: number[], stepMs = 450): string {
  const sampleRate = 8000
  const samplesPerStep = Math.floor((sampleRate * stepMs) / 1000)
  const totalSamples = samplesPerStep * frequencies.length
  const dataSize = totalSamples * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < totalSamples; i += 1) {
    const stepIndex = Math.min(frequencies.length - 1, Math.floor(i / samplesPerStep))
    const freq = frequencies[stepIndex]
    const localPos = (i % samplesPerStep) / samplesPerStep
    const envelope = localPos < 0.08 ? localPos / 0.08 : Math.exp(-2.8 * (localPos - 0.08))
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.35 * envelope
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    view.setInt16(44 + i * 2, int16, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

export const SAMPLE_SPEAKER_CHECK_AUDIO = buildMockAudioWavDataUrl([440, 554, 659, 880, 659, 554, 659, 880], 450)
const AUDIO_PART1_Q1 = buildMockAudioWavDataUrl([392, 440, 494, 523, 587, 659, 587, 523, 494, 523], 500)
const AUDIO_PART1_Q2 = buildMockAudioWavDataUrl([523, 494, 440, 392, 440, 523, 587, 523, 440, 523], 500)
const AUDIO_PART2_Q3 = buildMockAudioWavDataUrl([440, 523, 587, 659, 587, 523, 440, 523, 587, 659], 500)
const AUDIO_PART2_Q4 = buildMockAudioWavDataUrl([349, 440, 523, 587, 698, 587, 523, 440, 523, 587], 500)
const AUDIO_PART3_GROUP1 = buildMockAudioWavDataUrl(
  [440, 494, 523, 587, 659, 587, 523, 659, 587, 523, 494, 523, 587, 659],
  520,
)
const AUDIO_PART4_GROUP1 = buildMockAudioWavDataUrl(
  [392, 440, 523, 587, 659, 784, 659, 587, 523, 494, 440, 523, 587, 659],
  520,
)

const DEFAULT_SCORE_CONVERSION_TABLE: ScoreConversionPoint[] = [
  { minRatio: 0.95, listeningScore: 495, readingScore: 495 },
  { minRatio: 0.85, listeningScore: 450, readingScore: 430 },
  { minRatio: 0.75, listeningScore: 400, readingScore: 380 },
  { minRatio: 0.65, listeningScore: 350, readingScore: 330 },
  { minRatio: 0.5, listeningScore: 310, readingScore: 290 },
  { minRatio: 0.35, listeningScore: 220, readingScore: 200 },
  { minRatio: 0.2, listeningScore: 130, readingScore: 110 },
  { minRatio: 0.01, listeningScore: 50, readingScore: 40 },
  { minRatio: 0, listeningScore: 5, readingScore: 5 },
]

function buildStandardParts(testPrefix: string, allowStandalonePartSelection = true): TestPart[] {
  // Mọi câu hỏi ở tất cả các Part đều dùng chung 3 trường đồng nhất: `questionText`, `audioUrl`, `imageUrl`.
  // Câu nào không có thành phần nào (khuyết chữ câu hỏi, khuyết ảnh hoặc khuyết âm thanh) chỉ cần để trống ''.
  const p1Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p1-1`,
      partNumber: 1,
      audioGroupId: `${testPrefix}-audio-p1-1`,
      questions: [
        {
          id: `${testPrefix}-q1`,
          questionNumber: 1,
          partNumber: 1,
          groupId: `${testPrefix}-g-p1-1`,
          questionText: '',
          audioUrl: AUDIO_PART1_Q1,
          audioDurationSeconds: 5,
          imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900',
          imageAlt: 'Nhân viên thảo luận công việc quanh bàn họp có máy tính xách tay',
          options: [
            { id: `${testPrefix}-q1-a`, label: 'A', text: '' },
            { id: `${testPrefix}-q1-b`, label: 'B', text: '' },
            { id: `${testPrefix}-q1-c`, label: 'C', text: '' },
            { id: `${testPrefix}-q1-d`, label: 'D', text: '' },
          ],
          displayOrder: 1,
        },
      ],
      displayOrder: 1,
    },
    {
      id: `${testPrefix}-g-p1-2`,
      partNumber: 1,
      audioGroupId: `${testPrefix}-audio-p1-2`,
      questions: [
        {
          id: `${testPrefix}-q2`,
          questionNumber: 2,
          partNumber: 1,
          groupId: `${testPrefix}-g-p1-2`,
          questionText: '',
          audioUrl: AUDIO_PART1_Q2,
          audioDurationSeconds: 5,
          imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900',
          imageAlt: 'Khu vực kho vận với các kệ hàng được sắp xếp gọn gàng',
          options: [
            { id: `${testPrefix}-q2-a`, label: 'A', text: '' },
            { id: `${testPrefix}-q2-b`, label: 'B', text: '' },
            { id: `${testPrefix}-q2-c`, label: 'C', text: '' },
            { id: `${testPrefix}-q2-d`, label: 'D', text: '' },
          ],
          displayOrder: 2,
        },
      ],
      displayOrder: 2,
    },
  ]

  const p2Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p2-1`,
      partNumber: 2,
      audioGroupId: `${testPrefix}-audio-p2-1`,
      questions: [
        {
          id: `${testPrefix}-q3`,
          questionNumber: 7,
          partNumber: 2,
          groupId: `${testPrefix}-g-p2-1`,
          questionText: '',
          audioUrl: AUDIO_PART2_Q3,
          audioDurationSeconds: 5,
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q3-a`, label: 'A', text: '' },
            { id: `${testPrefix}-q3-b`, label: 'B', text: '' },
            { id: `${testPrefix}-q3-c`, label: 'C', text: '' },
          ],
          displayOrder: 7,
        },
      ],
      displayOrder: 1,
    },
    {
      id: `${testPrefix}-g-p2-2`,
      partNumber: 2,
      audioGroupId: `${testPrefix}-audio-p2-2`,
      questions: [
        {
          id: `${testPrefix}-q4`,
          questionNumber: 8,
          partNumber: 2,
          groupId: `${testPrefix}-g-p2-2`,
          questionText: '',
          audioUrl: AUDIO_PART2_Q4,
          audioDurationSeconds: 5,
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q4-a`, label: 'A', text: '' },
            { id: `${testPrefix}-q4-b`, label: 'B', text: '' },
            { id: `${testPrefix}-q4-c`, label: 'C', text: '' },
          ],
          displayOrder: 8,
        },
      ],
      displayOrder: 2,
    },
  ]

  // Part 3: 1 đoạn Audio dùng chung cho 3 câu hỏi (Questions 32-34)
  const p3Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p3-1`,
      partNumber: 3,
      audioGroupId: `${testPrefix}-audio-p3-group1`,
      groupTitle: 'Questions 32–34 refer to the following conversation.',
      passageText: '',
      audioUrl: AUDIO_PART3_GROUP1,
      audioDurationSeconds: 7,
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q5`,
          questionNumber: 32,
          partNumber: 3,
          groupId: `${testPrefix}-g-p3-1`,
          questionText: 'What are the speakers mainly discussing?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q5-a`, label: 'A', text: 'A software upgrade schedule' },
            { id: `${testPrefix}-q5-b`, label: 'B', text: 'An upcoming client orientation' },
            { id: `${testPrefix}-q5-c`, label: 'C', text: 'A budget proposal for Q3' },
            { id: `${testPrefix}-q5-d`, label: 'D', text: 'A warehouse relocation plan' },
          ],
          displayOrder: 32,
        },
        {
          id: `${testPrefix}-q6`,
          questionNumber: 33,
          partNumber: 3,
          groupId: `${testPrefix}-g-p3-1`,
          questionText: 'What problem does the woman mention?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q6-a`, label: 'A', text: 'The main conference room is already booked.' },
            { id: `${testPrefix}-q6-b`, label: 'B', text: 'The printed brochures have not arrived yet.' },
            { id: `${testPrefix}-q6-c`, label: 'C', text: 'The keynote speaker flight was delayed.' },
            { id: `${testPrefix}-q6-d`, label: 'D', text: 'The catering invoice contains an error.' },
          ],
          displayOrder: 33,
        },
        {
          id: `${testPrefix}-q7`,
          questionNumber: 34,
          partNumber: 3,
          groupId: `${testPrefix}-g-p3-1`,
          questionText: 'What does the man offer to do next?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q7-a`, label: 'A', text: 'Contact the printing supplier directly' },
            { id: `${testPrefix}-q7-b`, label: 'B', text: 'Reschedule the meeting to Friday' },
            { id: `${testPrefix}-q7-c`, label: 'C', text: 'Send digital copies to the attendees' },
            { id: `${testPrefix}-q7-d`, label: 'D', text: 'Reserve a larger banquet hall' },
          ],
          displayOrder: 34,
        },
      ],
      displayOrder: 1,
    },
  ]

  // Part 4: 1 bài nói dùng chung cho 3 câu hỏi kèm bảng lịch trình (Questions 71-73)
  const p4Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p4-1`,
      partNumber: 4,
      audioGroupId: `${testPrefix}-audio-p4-group1`,
      groupTitle: 'Questions 71–73 refer to the following talk and schedule.',
      passageText:
        'ANNUAL TECH SUMMIT – MORNING TRACK\n• 08:30 AM – Registration & Welcome Coffee (Main Lobby)\n• 09:15 AM – Opening Keynote: Cloud Security Trends (Hall A)\n• 10:30 AM – Workshop: Automated Quality Assurance (Room 204)\n• 12:00 PM – Networking Luncheon (Terrace Garden)',
      audioUrl: AUDIO_PART4_GROUP1,
      audioDurationSeconds: 7,
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q8`,
          questionNumber: 71,
          partNumber: 4,
          groupId: `${testPrefix}-g-p4-1`,
          questionText: 'Who most likely is the speaker?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q8-a`, label: 'A', text: 'An event coordinator' },
            { id: `${testPrefix}-q8-b`, label: 'B', text: 'A hotel receptionist' },
            { id: `${testPrefix}-q8-c`, label: 'C', text: 'A travel agent' },
            { id: `${testPrefix}-q8-d`, label: 'D', text: 'A software developer' },
          ],
          displayOrder: 71,
        },
        {
          id: `${testPrefix}-q9`,
          questionNumber: 72,
          partNumber: 4,
          groupId: `${testPrefix}-g-p4-1`,
          questionText: 'Look at the graphic. Which session has been moved to Room 302?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q9-a`, label: 'A', text: 'Registration & Welcome Coffee' },
            { id: `${testPrefix}-q9-b`, label: 'B', text: 'Opening Keynote: Cloud Security Trends' },
            { id: `${testPrefix}-q9-c`, label: 'C', text: 'Workshop: Automated Quality Assurance' },
            { id: `${testPrefix}-q9-d`, label: 'D', text: 'Networking Luncheon' },
          ],
          displayOrder: 72,
        },
        {
          id: `${testPrefix}-q10`,
          questionNumber: 73,
          partNumber: 4,
          groupId: `${testPrefix}-g-p4-1`,
          questionText: 'What are listeners reminded to do before leaving the auditorium?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q10-a`, label: 'A', text: 'Pick up their parking validation tickets' },
            { id: `${testPrefix}-q10-b`, label: 'B', text: 'Complete the digital feedback survey on the mobile app' },
            { id: `${testPrefix}-q10-c`, label: 'C', text: 'Return their translation headsets' },
            { id: `${testPrefix}-q10-d`, label: 'D', text: 'Sign up for the afternoon shuttle bus' },
          ],
          displayOrder: 73,
        },
      ],
      displayOrder: 1,
    },
  ]

  // Part 5: Incomplete Sentences (Questions 101-103)
  const p5Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p5-1`,
      partNumber: 5,
      questions: [
        {
          id: `${testPrefix}-q11`,
          questionNumber: 101,
          partNumber: 5,
          groupId: `${testPrefix}-g-p5-1`,
          questionText:
            'All international shipments must be inspected _______ they are loaded onto the cargo aircraft.',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q11-a`, label: 'A', text: 'before' },
            { id: `${testPrefix}-q11-b`, label: 'B', text: 'during' },
            { id: `${testPrefix}-q11-c`, label: 'C', text: 'prior' },
            { id: `${testPrefix}-q11-d`, label: 'D', text: 'until' },
          ],
          displayOrder: 101,
        },
        {
          id: `${testPrefix}-q12`,
          questionNumber: 102,
          partNumber: 5,
          groupId: `${testPrefix}-g-p5-1`,
          questionText:
            'Ms. Tanaka received praise from the board of directors for her _______ analysis of the Asian retail market.',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q12-a`, label: 'A', text: 'comprehend' },
            { id: `${testPrefix}-q12-b`, label: 'B', text: 'comprehensive' },
            { id: `${testPrefix}-q12-c`, label: 'C', text: 'comprehensively' },
            { id: `${testPrefix}-q12-d`, label: 'D', text: 'comprehension' },
          ],
          displayOrder: 102,
        },
        {
          id: `${testPrefix}-q13`,
          questionNumber: 103,
          partNumber: 5,
          groupId: `${testPrefix}-g-p5-1`,
          questionText:
            'Employees who wish to attend the leadership seminar should register no later than Friday, _______ seating is limited.',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q13-a`, label: 'A', text: 'despite' },
            { id: `${testPrefix}-q13-b`, label: 'B', text: 'as' },
            { id: `${testPrefix}-q13-c`, label: 'C', text: 'so that' },
            { id: `${testPrefix}-q13-d`, label: 'D', text: 'whether' },
          ],
          displayOrder: 103,
        },
      ],
      displayOrder: 1,
    },
  ]

  // Part 6: Text Completion (Questions 131-134 gồm 2 cụm đoạn văn)
  const p6Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p6-1`,
      partNumber: 6,
      groupTitle: 'Questions 131–132 refer to the following internal memo.',
      passageText:
        'MEMORANDUM\nTo: All Regional Sales Representatives\nFrom: David Nguyen, Operations Director\nDate: October 14\nSubject: Updated Travel Reimbursement Policy\n\nStarting November 1, all travel expense reports must be submitted through the new FinTrack online portal within ten business days of completing a trip. Previously, paper receipts could be handed in to the accounting desk at the end of each quarter. _______ (131) _______. Any expense claim submitted without digital copies of itemized receipts will be returned for revision.\n\nIf you have not yet activated your FinTrack account, please contact the IT Helpdesk _______ (132) _______ the end of this week.',
      audioUrl: '',
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q14`,
          questionNumber: 131,
          partNumber: 6,
          groupId: `${testPrefix}-g-p6-1`,
          questionText: 'Select the best sentence to fill in blank (131).',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q14-a`, label: 'A', text: 'This transition will speed up reimbursement processing significantly.' },
            { id: `${testPrefix}-q14-b`, label: 'B', text: 'The annual sales conference will be held in Da Nang this year.' },
            { id: `${testPrefix}-q14-c`, label: 'C', text: 'Several airlines have recently reduced their baggage fees.' },
            { id: `${testPrefix}-q14-d`, label: 'D', text: 'Please attach your résumé to the application form.' },
          ],
          displayOrder: 131,
        },
        {
          id: `${testPrefix}-q15`,
          questionNumber: 132,
          partNumber: 6,
          groupId: `${testPrefix}-g-p6-1`,
          questionText: 'Select the best word or phrase to fill in blank (132).',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q15-a`, label: 'A', text: 'by' },
            { id: `${testPrefix}-q15-b`, label: 'B', text: 'while' },
            { id: `${testPrefix}-q15-c`, label: 'C', text: 'among' },
            { id: `${testPrefix}-q15-d`, label: 'D', text: 'except' },
          ],
          displayOrder: 132,
        },
      ],
      displayOrder: 1,
    },
    {
      id: `${testPrefix}-g-p6-2`,
      partNumber: 6,
      groupTitle: 'Questions 133–134 refer to the following customer announcement.',
      passageText:
        'CUSTOMER NOTICE – GREENLEAF BOOKSTORE\n\nThank you for supporting Greenleaf Bookstore over the past twelve years. Beginning next Monday, our flagship store on Nguyen Hue Boulevard will temporarily close for a two-week interior renovation. _______ (133) _______. Online orders placed through our website will continue to be shipped daily without interruption.\n\nAll loyalty members will receive a 20% discount voucher _______ (134) _______ our grand reopening celebration on April 15.',
      audioUrl: '',
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q19`,
          questionNumber: 133,
          partNumber: 6,
          groupId: `${testPrefix}-g-p6-2`,
          questionText: 'Select the best sentence to fill in blank (133).',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q19-a`, label: 'A', text: 'During this period, customers are welcome to visit our District 3 branch.' },
            { id: `${testPrefix}-q19-b`, label: 'B', text: 'The author will sign copies of the novel at seven o’clock.' },
            { id: `${testPrefix}-q19-c`, label: 'C', text: 'Paperback textbooks are located on the second floor.' },
            { id: `${testPrefix}-q19-d`, label: 'D', text: 'Several cashiers were hired last summer.' },
          ],
          displayOrder: 133,
        },
        {
          id: `${testPrefix}-q20`,
          questionNumber: 134,
          partNumber: 6,
          groupId: `${testPrefix}-g-p6-2`,
          questionText: 'Select the best word or phrase to fill in blank (134).',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q20-a`, label: 'A', text: 'for' },
            { id: `${testPrefix}-q20-b`, label: 'B', text: 'unless' },
            { id: `${testPrefix}-q20-c`, label: 'C', text: 'whether' },
            { id: `${testPrefix}-q20-d`, label: 'D', text: 'whose' },
          ],
          displayOrder: 134,
        },
      ],
      displayOrder: 2,
    },
  ]

  // Part 7: Reading Comprehension (Questions 147-152 gồm 2 cụm đoạn văn)
  const p7Groups: QuestionGroup[] = [
    {
      id: `${testPrefix}-g-p7-1`,
      partNumber: 7,
      groupTitle: 'Questions 147–149 refer to the following email and service notice.',
      passages: [
        'EMAIL\nTo: customersupport@luminaoffice.com\nFrom: h.tran@apexarchitects.vn\nDate: March 18\nSubject: Order #LO-88421 – Conference Table Delivery\n\nDear Customer Support Team,\n\nLast week, our firm ordered two oak conference tables (Model CT-900) scheduled for delivery to our District 1 office on March 22. However, our interior renovation contractor informed us this morning that the flooring installation in the main boardroom will not be finished until March 26.\n\nCould we postpone the delivery to Friday, March 28, during the morning window (8:30 AM – 11:30 AM)? In addition, we would like to add four ergonomic mesh chairs (Model EC-210) to the same shipment so that we can qualify for complimentary assembly service.\n\nThank you for your assistance.\nBest regards,\nHoang Tran\nFacilities Manager, Apex Architects',
        'LUMINA OFFICE FURNISHINGS – DELIVERY & ASSEMBLY POLICY\n• Standard Delivery: Free for all corporate orders over $1,500.\n• Complimentary On-Site Assembly: Available for orders totaling $2,500 or more.\n• Rescheduling Policy: Customers may change their delivery date at no extra charge provided the request is received at least 72 hours prior to the original delivery date.',
      ],
      audioUrl: '',
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q16`,
          questionNumber: 147,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-1`,
          questionText: 'Why did Mr. Tran send the email?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q16-a`, label: 'A', text: 'To report a damaged item in a recent shipment' },
            { id: `${testPrefix}-q16-b`, label: 'B', text: 'To request a later delivery date and add items to an order' },
            { id: `${testPrefix}-q16-c`, label: 'C', text: 'To cancel a furniture rental contract' },
            { id: `${testPrefix}-q16-d`, label: 'D', text: 'To inquire about a showroom location in District 1' },
          ],
          displayOrder: 147,
        },
        {
          id: `${testPrefix}-q17`,
          questionNumber: 148,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-1`,
          questionText: 'Why does Apex Architects need to delay the delivery?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q17-a`, label: 'A', text: 'The company is moving to a different building.' },
            { id: `${testPrefix}-q17-b`, label: 'B', text: 'The office will be closed for a public holiday.' },
            { id: `${testPrefix}-q17-c`, label: 'C', text: 'Flooring work in the boardroom is taking longer than expected.' },
            { id: `${testPrefix}-q17-d`, label: 'D', text: 'The accounting department has not approved the invoice.' },
          ],
          displayOrder: 148,
        },
        {
          id: `${testPrefix}-q18`,
          questionNumber: 149,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-1`,
          questionText:
            'According to the policy, why is Mr. Tran eligible to reschedule without an additional fee?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q18-a`, label: 'A', text: 'He submitted his request more than 72 hours before March 22.' },
            { id: `${testPrefix}-q18-b`, label: 'B', text: 'He is a first-time corporate customer.' },
            { id: `${testPrefix}-q18-c`, label: 'C', text: 'His office is located within the city center.' },
            { id: `${testPrefix}-q18-d`, label: 'D', text: 'He paid for an extended warranty plan.' },
          ],
          displayOrder: 149,
        },
      ],
      displayOrder: 1,
    },
    {
      id: `${testPrefix}-g-p7-2`,
      partNumber: 7,
      groupTitle: 'Questions 150–152 refer to the following workshop announcement.',
      passageText:
        'PROFESSIONAL DEVELOPMENT WORKSHOP\nTopic: Effective Cross-Team Project Management\nDate: Thursday, May 14 | Time: 1:30 PM – 4:30 PM\nLocation: Conference Room B (4th Floor)\nInstructor: Ms. Claire Pham, Senior PMO Consultant\n\nOverview:\nThis interactive three-hour workshop is designed for newly appointed team leaders and assistant managers. Participants will practice sprint planning, risk tracking, and stakeholder reporting using real company case studies.\n\nRegistration:\nAttendance is capped at 25 participants. Please register via the HR Intranet portal by May 8. Laptops are required for the hands-on exercises.',
      audioUrl: '',
      imageUrl: '',
      questions: [
        {
          id: `${testPrefix}-q21`,
          questionNumber: 150,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-2`,
          questionText: 'Who is the workshop primarily intended for?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q21-a`, label: 'A', text: 'External software vendors' },
            { id: `${testPrefix}-q21-b`, label: 'B', text: 'New team leaders and assistant managers' },
            { id: `${testPrefix}-q21-c`, label: 'C', text: 'Accounting interns' },
            { id: `${testPrefix}-q21-d`, label: 'D', text: 'Customer support callers' },
          ],
          displayOrder: 150,
        },
        {
          id: `${testPrefix}-q22`,
          questionNumber: 151,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-2`,
          questionText: 'What must participants bring to the workshop?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q22-a`, label: 'A', text: 'Printed financial statements' },
            { id: `${testPrefix}-q22-b`, label: 'B', text: 'Signed supervisor approval forms' },
            { id: `${testPrefix}-q22-c`, label: 'C', text: 'Their portable computers' },
            { id: `${testPrefix}-q22-d`, label: 'D', text: 'Visitor identification badges' },
          ],
          displayOrder: 151,
        },
        {
          id: `${testPrefix}-q23`,
          questionNumber: 152,
          partNumber: 7,
          groupId: `${testPrefix}-g-p7-2`,
          questionText: 'What is indicated about registration for the session?',
          audioUrl: '',
          imageUrl: '',
          options: [
            { id: `${testPrefix}-q23-a`, label: 'A', text: 'It closes on May 8.' },
            { id: `${testPrefix}-q23-b`, label: 'B', text: 'It requires a $50 training fee.' },
            { id: `${testPrefix}-q23-c`, label: 'C', text: 'It is open to up to 100 employees.' },
            { id: `${testPrefix}-q23-d`, label: 'D', text: 'It must be completed by telephone.' },
          ],
          displayOrder: 152,
        },
      ],
      displayOrder: 2,
    },
  ]

  return [
    {
      id: `${testPrefix}-part-1`,
      partNumber: 1,
      section: 'listening',
      title: 'PART 1',
      englishTitle: 'Photographs',
      vietnameseTitle: 'Mô tả hình ảnh',
      description:
        'Học viên quan sát hình ảnh và nghe các phương án mô tả. Nhiệm vụ là lựa chọn câu mô tả phù hợp nhất với hình ảnh.',
      instructions: [
        'Quan sát kỹ hình ảnh hiển thị trên màn hình.',
        'Lắng nghe các phương án A, B, C, D (các phương án không in sẵn trên đề).',
        'Chọn phương án mô tả chính xác nhất những gì đang diễn ra trong ảnh.',
        'Mỗi đoạn ghi âm chỉ được nghe một lần duy nhất.',
      ],
      contentTypesLabel: 'Hình ảnh + File ghi âm (Audio)',
      importantNotes: [
        'Audio sẽ tự động phát một lần khi vào câu hỏi và không thể tua hoặc phát lại.',
        'Sau khi audio kết thúc, hệ thống tự động chuyển sang câu/nhóm tiếp theo trong phần Listening.',
      ],
      introductionBlocks: [
        {
          type: 'image',
          id: `${testPrefix}-intro-img-p1`,
          url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=700',
          alt: 'Minh họa Part 1 Photographs',
          caption: 'Ví dụ: Quan sát bức ảnh và chọn câu mô tả đúng nhất từ 4 phương án nghe được.',
        },
      ],
      questionCount: 2,
      standardToeicCount: 6,
      suggestedMinutes: 5,
      allowStandaloneSelection: true,
      questionGroups: p1Groups,
      displayOrder: 1,
    },
    {
      id: `${testPrefix}-part-2`,
      partNumber: 2,
      section: 'listening',
      title: 'PART 2',
      englishTitle: 'Question – Response',
      vietnameseTitle: 'Hỏi và đáp',
      description:
        'Học viên nghe một câu hỏi hoặc câu nói và lựa chọn câu trả lời phù hợp nhất trong các phương án.',
      instructions: [
        'Tập trung lắng nghe từ để hỏi (Who, When, Where, Why, How...) hoặc ngữ điệu câu nói.',
        'Phân tích nội dung và ngữ cảnh giao tiếp thực tế.',
        'Chọn đáp án phù hợp nhất trong 3 phương án nghe được.',
        'Mỗi đoạn ghi âm chỉ được nghe một lần.',
      ],
      contentTypesLabel: 'File ghi âm (Audio thuần)',
      importantNotes: [
        'Cả câu hỏi và các phương án trả lời đều không hiển thị văn bản trên màn hình.',
        'Không thể tạm dừng hoặc phát lại sau khi audio đã bắt đầu chạy.',
      ],
      questionCount: 2,
      standardToeicCount: 25,
      suggestedMinutes: 10,
      allowStandaloneSelection: true,
      questionGroups: p2Groups,
      displayOrder: 2,
    },
    {
      id: `${testPrefix}-part-3`,
      partNumber: 3,
      section: 'listening',
      title: 'PART 3',
      englishTitle: 'Conversations',
      vietnameseTitle: 'Hội thoại ngắn',
      description:
        'Học viên nghe các đoạn hội thoại giữa hai hoặc nhiều người, sau đó trả lời câu hỏi liên quan.',
      instructions: [
        'Đọc nhanh 3 câu hỏi của nhóm trước và trong khi nghe đoạn hội thoại.',
        'Chú ý người nói, địa điểm, mục đích và giải pháp được thống nhất cuối cuộc gọi/cuộc họp.',
        'Một đoạn hội thoại liên kết với 3 câu hỏi đi kèm.',
        'Mỗi đoạn hội thoại chỉ được phát một lần cho cả nhóm câu hỏi.',
      ],
      contentTypesLabel: 'Audio hội thoại theo nhóm + Văn bản câu hỏi & phương án',
      importantNotes: [
        'Chuyển qua lại giữa các câu hỏi trong cùng một nhóm hội thoại sẽ không tạo thêm lượt phát audio.',
      ],
      questionCount: 3,
      standardToeicCount: 39,
      suggestedMinutes: 18,
      allowStandaloneSelection: allowStandalonePartSelection,
      questionGroups: p3Groups,
      displayOrder: 3,
    },
    {
      id: `${testPrefix}-part-4`,
      partNumber: 4,
      section: 'listening',
      title: 'PART 4',
      englishTitle: 'Talks',
      vietnameseTitle: 'Bài nói ngắn',
      description:
        'Học viên nghe bài nói hoặc thông báo ngắn và trả lời các câu hỏi liên quan.',
      instructions: [
        'Chú ý nội dung chính ngay ở 2 câu đầu tiên của bài nói.',
        'Xác định mục đích, đối tượng người nghe và thông tin trên bảng biểu đi kèm (nếu có).',
        'Một bài nói liên kết với 3 câu hỏi.',
        'Mỗi đoạn ghi âm chỉ được phát một lần.',
      ],
      contentTypesLabel: 'Audio bài nói theo nhóm + Bảng biểu/Văn bản + Câu hỏi',
      importantNotes: [
        'Sau khi hoàn thành toàn bộ audio của phần Listening, hệ thống sẽ tự động mở khóa và chuyển sang màn hình giới thiệu phần Reading.',
      ],
      questionCount: 3,
      standardToeicCount: 30,
      suggestedMinutes: 15,
      allowStandaloneSelection: allowStandalonePartSelection,
      questionGroups: p4Groups,
      displayOrder: 4,
    },
    {
      id: `${testPrefix}-part-5`,
      partNumber: 5,
      section: 'reading',
      title: 'PART 5',
      englishTitle: 'Incomplete Sentences',
      vietnameseTitle: 'Hoàn thành câu',
      description:
        'Học viên hoàn thành các câu tiếng Anh bằng cách lựa chọn phương án phù hợp nhất.',
      instructions: [
        'Đọc kỹ câu hỏi và xác định thành phần ngữ pháp còn thiếu ở chỗ trống.',
        'Phân tích từ loại, thì động từ, liên từ, giới từ hoặc từ vựng theo ngữ cảnh.',
        'Chọn một đáp án đúng nhất A, B, C hoặc D.',
      ],
      contentTypesLabel: 'Văn bản câu đơn + 4 phương án A, B, C, D',
      importantNotes: [
        'Bạn có thể chủ động phân bổ thời gian, đánh dấu câu cần xem lại và di chuyển tự do giữa các câu hỏi.',
      ],
      questionCount: 3,
      standardToeicCount: 30,
      suggestedMinutes: 15,
      allowStandaloneSelection: true,
      questionGroups: p5Groups,
      displayOrder: 5,
    },
    {
      id: `${testPrefix}-part-6`,
      partNumber: 6,
      section: 'reading',
      title: 'PART 6',
      englishTitle: 'Text Completion',
      vietnameseTitle: 'Hoàn thành đoạn văn',
      description:
        'Học viên đọc các đoạn văn có chỗ trống và lựa chọn phương án phù hợp để hoàn thiện nội dung.',
      instructions: [
        'Đọc toàn bộ đoạn văn để nắm mạch nội dung tổng thể.',
        'Phân tích câu đứng ngay trước và sau mỗi chỗ trống.',
        'Chú ý ngữ pháp, từ vựng và câu điền vào đoạn văn sao cho mạch lạc.',
        'Một đoạn văn liên kết với nhiều câu hỏi.',
      ],
      contentTypesLabel: 'Đoạn văn dùng chung + Nhóm câu hỏi điền khuyết',
      importantNotes: [
        'Khung đoạn văn bên trái hỗ trợ cuộn độc lập với khung câu hỏi bên phải.',
      ],
      questionCount: 4,
      standardToeicCount: 16,
      suggestedMinutes: 12,
      allowStandaloneSelection: true,
      questionGroups: p6Groups,
      displayOrder: 6,
    },
    {
      id: `${testPrefix}-part-7`,
      partNumber: 7,
      section: 'reading',
      title: 'PART 7',
      englishTitle: 'Reading Comprehension',
      vietnameseTitle: 'Đọc hiểu văn bản',
      description:
        'Học viên đọc và phân tích văn bản như email, thông báo, quảng cáo, tin nhắn và các đoạn văn khác để trả lời câu hỏi.',
      instructions: [
        'Đọc kỹ tiêu đề, người gửi, người nhận và mục đích của văn bản.',
        'Xác định từ khóa trong câu hỏi để đối chiếu nhanh thông tin.',
        'Phân tích mối liên hệ giữa hai hoặc nhiều văn bản trong cùng một nhóm câu hỏi.',
        'Có thể cuộn nội dung văn bản để đọc đầy đủ.',
      ],
      contentTypesLabel: 'Đơn văn bản / Đa văn bản (Email, Notice, Article) + Nhóm câu hỏi',
      importantNotes: [
        'Kiểm tra kỹ các câu đã đánh dấu xem lại trước khi nhấn NỘP BÀI THI.',
      ],
      questionCount: 6,
      standardToeicCount: 54,
      suggestedMinutes: 45,
      allowStandaloneSelection: true,
      questionGroups: p7Groups,
      displayOrder: 7,
    },
  ]
}

function buildAnswerKeysForPrefix(testPrefix: string): Record<string, ServerTestAnswerKey> {
  return {
    [`${testPrefix}-q1`]: {
      questionId: `${testPrefix}-q1`,
      correctOptionId: `${testPrefix}-q1-b`,
      explanation:
        'Trong bức ảnh, các nhân viên đang ngồi quanh bàn họp và thảo luận công việc trước máy tính xách tay -> Đáp án (B) là mô tả chính xác nhất.',
      transcript:
        '(A) They are boarding a commuter train.\n(B) Some colleagues are discussing documents at a conference table.\n(C) Presentation equipment is being packed into boxes.\n(D) The office chairs are stacked against the wall.',
      translation:
        '(A) Họ đang lên tàu điện.\n(B) Một số đồng nghiệp đang thảo luận tài liệu tại bàn họp.\n(C) Thiết bị thuyết trình đang được đóng vào thùng.\n(D) Ghế văn phòng đang được xếp chồng sát tường.',
    },
    [`${testPrefix}-q2`]: {
      questionId: `${testPrefix}-q2`,
      correctOptionId: `${testPrefix}-q2-c`,
      explanation:
        'Bức ảnh chụp khu vực nhà kho với các kiện hàng được xếp ngay ngắn trên kệ cao -> Đáp án (C).',
      transcript:
        '(A) Customers are paying at the checkout counter.\n(B) A delivery truck is parked on the highway.\n(C) Merchandise has been arranged on warehouse shelves.\n(D) Workers are painting the ceiling.',
      translation:
        '(A) Khách hàng đang thanh toán tại quầy thu ngân.\n(B) Xe tải giao hàng đang đỗ trên đường cao tốc.\n(C) Hàng hóa đã được sắp xếp trên các kệ trong nhà kho.\n(D) Công nhân đang sơn trần nhà.',
    },
    [`${testPrefix}-q3`]: {
      questionId: `${testPrefix}-q3`,
      correctOptionId: `${testPrefix}-q3-a`,
      explanation:
        'Câu hỏi "When is the quarterly financial report due?" hỏi về thời hạn nộp báo cáo -> Đáp án (A) "By five o’clock this Friday" trả lời trực tiếp mốc thời gian.',
      transcript:
        'Question: When is the quarterly financial report due?\n(A) By five o’clock this Friday.\n(B) In the third-floor accounting office.\n(C) Yes, the revenue increased this year.',
      translation:
        'Câu hỏi: Khi nào đến hạn nộp báo cáo tài chính quý?\n(A) Trước 5 giờ chiều thứ Sáu tuần này.\n(B) Tại phòng kế toán tầng 3.\n(C) Đúng vậy, doanh thu năm nay đã tăng.',
    },
    [`${testPrefix}-q4`]: {
      questionId: `${testPrefix}-q4`,
      correctOptionId: `${testPrefix}-q4-b`,
      explanation:
        'Câu hỏi "Who is responsible for training the new interns?" hỏi về người phụ trách -> Đáp án (B) "Ms. Le from Human Resources".',
      transcript:
        'Question: Who is responsible for training the new interns?\n(A) The training session lasted two hours.\n(B) Ms. Le from Human Resources.\n(C) I submitted my application yesterday.',
      translation:
        'Câu hỏi: Ai chịu trách nhiệm đào tạo các thực tập sinh mới?\n(A) Buổi đào tạo kéo dài hai tiếng.\n(B) Cô Lê ở phòng Nhân sự.\n(C) Tôi đã nộp đơn ứng tuyển hôm qua.',
    },
    [`${testPrefix}-q5`]: {
      questionId: `${testPrefix}-q5`,
      correctOptionId: `${testPrefix}-q5-b`,
      explanation:
        'Hai người nói đang chuẩn bị tài liệu và phòng họp cho buổi đón tiếp khách hàng mới (client orientation) vào ngày mai -> Đáp án (B).',
      transcript:
        'W: Hi Marcus, are we ready for tomorrow’s client orientation session?\nM: Almost, but I just heard from the front desk that the printed welcome brochures haven’t arrived from the print shop yet.\nW: Oh no, the session starts at nine tomorrow morning.\nM: Don’t worry. I’ll call the printing supplier directly right now to ask for express courier delivery.',
      translation:
        'Nữ: Chào Marcus, chúng ta đã sẵn sàng cho buổi định hướng khách hàng ngày mai chưa?\nNam: Gần xong rồi, nhưng tôi vừa nghe lễ tân báo là các tập tài liệu chào mừng in ấn vẫn chưa được giao tới.\nNữ: Ôi, buổi họp bắt đầu lúc 9 giờ sáng mai rồi.\nNam: Đừng lo. Tôi sẽ gọi trực tiếp cho nhà cung cấp in ấn ngay bây giờ để yêu cầu giao hỏa tốc.',
    },
    [`${testPrefix}-q6`]: {
      questionId: `${testPrefix}-q6`,
      correctOptionId: `${testPrefix}-q6-b`,
      explanation:
        'Vấn đề được nêu trong hội thoại là các tập tài liệu in (printed brochures) vẫn chưa được giao tới -> Đáp án (B).',
    },
    [`${testPrefix}-q7`]: {
      questionId: `${testPrefix}-q7`,
      correctOptionId: `${testPrefix}-q7-a`,
      explanation:
        'Người đàn ông đề nghị "I’ll call the printing supplier directly right now" -> Đáp án (A).',
    },
    [`${testPrefix}-q8`]: {
      questionId: `${testPrefix}-q8`,
      correctOptionId: `${testPrefix}-q8-a`,
      explanation:
        'Người nói chào mừng khách tham dự hội nghị, thông báo thay đổi phòng workshop và hướng dẫn khảo sát trên ứng dụng sự kiện -> Đáp án (A) An event coordinator.',
      transcript:
        'M: Welcome everyone to the Annual Tech Summit. Before our morning keynote begins, please take note of one room change on your schedule. Due to high registration numbers, the ten-thirty session on Automated Quality Assurance will now take place in Room 302 instead of Room 204. Also, before leaving the auditorium today, please complete the digital feedback survey available on our summit mobile app.',
      translation:
        'Nam: Chào mừng tất cả quý vị đến với Hội nghị Thượng đỉnh Công nghệ Thường niên. Trước khi bài phát biểu chính buổi sáng bắt đầu, xin lưu ý một thay đổi về phòng họp trên lịch trình. Do số lượng đăng ký cao, phiên thảo luận lúc 10:30 về Đảm bảo Chất lượng Tự động sẽ diễn ra tại Phòng 302 thay vì Phòng 204. Ngoài ra, trước khi rời hội trường hôm nay, vui lòng hoàn thành khảo sát phản hồi điện tử trên ứng dụng di động của hội nghị.',
    },
    [`${testPrefix}-q9`]: {
      questionId: `${testPrefix}-q9`,
      correctOptionId: `${testPrefix}-q9-c`,
      explanation:
        'Người nói thông báo phiên lúc 10:30 (trên lịch trình là "Workshop: Automated Quality Assurance" ở Room 204) được chuyển sang Room 302 -> Đáp án (C).',
    },
    [`${testPrefix}-q10`]: {
      questionId: `${testPrefix}-q10`,
      correctOptionId: `${testPrefix}-q10-b`,
      explanation:
        'Cuối bài nói nhắc: "please complete the digital feedback survey available on our summit mobile app" -> Đáp án (B).',
    },
    [`${testPrefix}-q11`]: {
      questionId: `${testPrefix}-q11`,
      correctOptionId: `${testPrefix}-q11-a`,
      explanation:
        'Sau chỗ trống là một mệnh đề hoàn chỉnh ("they are loaded..."), cần liên từ chỉ thời gian hợp nghĩa "trước khi được chất lên máy bay" -> Đáp án (A) before.',
    },
    [`${testPrefix}-q12`]: {
      questionId: `${testPrefix}-q12`,
      correctOptionId: `${testPrefix}-q12-b`,
      explanation:
        'Giữa tính từ sở hữu "her" và danh từ "analysis" cần một tính từ bổ nghĩa -> Đáp án (B) comprehensive (toàn diện, sâu sắc).',
    },
    [`${testPrefix}-q13`]: {
      questionId: `${testPrefix}-q13`,
      correctOptionId: `${testPrefix}-q13-b`,
      explanation:
        'Mệnh đề sau nêu nguyên nhân ("seating is limited" - số chỗ ngồi có hạn) -> dùng liên từ "as" (= because) -> Đáp án (B).',
    },
    [`${testPrefix}-q14`]: {
      questionId: `${testPrefix}-q14`,
      correctOptionId: `${testPrefix}-q14-a`,
      explanation:
        'Đoạn văn đang nói về việc chuyển từ nộp hóa đơn giấy sang cổng trực tuyến FinTrack. Câu (A) "Sự chuyển đổi này sẽ giúp đẩy nhanh đáng kể thời gian xử lý hoàn ứng" liên kết mạch lạc nhất.',
    },
    [`${testPrefix}-q15`]: {
      questionId: `${testPrefix}-q15`,
      correctOptionId: `${testPrefix}-q15-a`,
      explanation:
        'Cụm "by the end of this week" (trước thời điểm cuối tuần này) chỉ hạn chót hoàn thành -> Đáp án (A) by.',
    },
    [`${testPrefix}-q16`]: {
      questionId: `${testPrefix}-q16`,
      correctOptionId: `${testPrefix}-q16-b`,
      explanation:
        'Ông Hoàng Trần viết email xin dời lịch giao bàn họp sang ngày 28/3 và đặt thêm 4 ghế lưới -> Đáp án (B).',
    },
    [`${testPrefix}-q17`]: {
      questionId: `${testPrefix}-q17`,
      correctOptionId: `${testPrefix}-q17-c`,
      explanation:
        'Trong đoạn 1 của email: "the flooring installation in the main boardroom will not be finished until March 26" -> Đáp án (C).',
    },
    [`${testPrefix}-q18`]: {
      questionId: `${testPrefix}-q18`,
      correctOptionId: `${testPrefix}-q18-a`,
      explanation:
        'Chính sách quy định khách được đổi lịch miễn phí nếu gửi yêu cầu trước ít nhất 72 giờ so với ngày giao ban đầu. Email gửi ngày 18/3, trước ngày giao ban đầu 22/3 là 4 ngày (96 giờ) -> Đáp án (A).',
    },
    [`${testPrefix}-q19`]: {
      questionId: `${testPrefix}-q19`,
      correctOptionId: `${testPrefix}-q19-a`,
      explanation:
        'Câu trước thông báo cửa hàng chính tạm đóng cửa 2 tuần để sửa chữa; câu (A) hướng dẫn khách ghé chi nhánh Quận 3 trong thời gian này là mạch lạc nhất.',
    },
    [`${testPrefix}-q20`]: {
      questionId: `${testPrefix}-q20`,
      correctOptionId: `${testPrefix}-q20-a`,
      explanation:
        'Giới từ "for" (dành cho dịp khai trương lại vào ngày 15/4) phù hợp nhất về ngữ pháp và ngữ nghĩa -> Đáp án (A).',
    },
    [`${testPrefix}-q21`]: {
      questionId: `${testPrefix}-q21`,
      correctOptionId: `${testPrefix}-q21-b`,
      explanation:
        'Trong phần Overview nêu rõ: "designed for newly appointed team leaders and assistant managers" -> Đáp án (B).',
    },
    [`${testPrefix}-q22`]: {
      questionId: `${testPrefix}-q22`,
      correctOptionId: `${testPrefix}-q22-c`,
      explanation:
        'Cuối thông báo ghi rõ: "Laptops are required for the hands-on exercises" (laptops = portable computers) -> Đáp án (C).',
    },
    [`${testPrefix}-q23`]: {
      questionId: `${testPrefix}-q23`,
      correctOptionId: `${testPrefix}-q23-a`,
      explanation:
        'Thông báo ghi: "Please register via the HR Intranet portal by May 8" -> hạn đăng ký kết thúc ngày 8/5 -> Đáp án (A).',
    },
  }
}

export const mockTests: Test[] = [
  {
    id: 'test-2026-01',
    code: 'ETS-2026-T01',
    title: 'TEST 1 – 2026',
    slug: 'toeic-test-01-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description:
      'Đề thi thử TOEIC Listening & Reading chuẩn cấu trúc ETS mới nhất 2026, đầy đủ 7 Part từ mô tả tranh, hội thoại đến đọc hiểu đa văn bản.',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 275192,
    createdAt: '2026-11-15T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: [
      'Hãy sử dụng trình duyệt Google Chrome hoặc Microsoft Edge và kiểm tra tai nghe/loa trước khi bắt đầu làm bài.',
      'Phần Listening (Part 1 – Part 4): Mỗi đoạn ghi âm chỉ được phát MỘT LẦN DUY NHẤT. Bạn không thể tua, tạm dừng hoặc phát lại.',
      'Trong khi đang làm phần Listening, phần Reading (Part 5 – Part 7) sẽ bị khóa cho đến khi toàn bộ audio Listening kết thúc.',
      'Sau khi phần Reading được mở khóa, bạn có thể chuyển qua lại để kiểm tra hoặc chỉnh sửa đáp án nhưng không được nghe lại audio.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t01', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-02',
    code: 'ETS-2026-T02',
    title: 'TEST 2 – 2026',
    slug: 'toeic-test-02-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description:
      'Bộ đề luyện thi TOEIC số 02 cập nhật xu hướng câu hỏi bảng biểu Part 3–4 và đọc hiểu chuỗi email thương mại Part 7.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 159480,
    createdAt: '2026-11-12T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: [
      'Hãy sử dụng trình duyệt Google Chrome để có trải nghiệm âm thanh ổn định nhất.',
      'Mỗi đoạn audio trong phần Listening chỉ phát 1 lần và tự động chuyển tiếp khi kết thúc.',
      'Đồng hồ đếm ngược tính theo thời gian thực kể từ lúc nhấn BẮT ĐẦU LÀM BÀI.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t02', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-03',
    code: 'ETS-2026-T03',
    title: 'TEST 3 – 2026',
    slug: 'toeic-test-03-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description:
      'Đề thi đánh giá năng lực TOEIC trung – cao cấp, phù hợp cho học viên đặt mục tiêu đạt chuẩn đầu ra 550–750+.',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900',
    difficulty: 'Trung cấp (550+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 123601,
    createdAt: '2026-11-08T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: [
      'Đề hỗ trợ cả 2 chế độ: Làm toàn bộ đề (Full Test) hoặc Tự chọn từng Part từ Part 1 đến Part 7.',
      'Phần Listening tuân thủ nghiêm ngặt quy định chỉ nghe một lần.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t03', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-04',
    code: 'ETS-2026-T04',
    title: 'TEST 4 – 2026',
    slug: 'toeic-test-04-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description:
      'Đề luyện tập tăng tốc độ xử lý bẫy ngữ pháp Part 5–6 và kỹ năng suy luận đa đoạn văn trong Part 7.',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
    difficulty: 'Nâng cao (850+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 101860,
    createdAt: '2026-11-01T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: [
      'Đề mức độ nâng cao 850+ dành cho học viên rèn phản xạ giải đề dưới áp lực thời gian thực.',
      'Sau khi nộp bài, hệ thống cung cấp thống kê chi tiết theo từng Part và giải thích từng câu.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t04', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-05',
    code: 'ETS-2026-T05',
    title: 'TEST 5 – 2026',
    slug: 'toeic-test-05-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 05 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 94366,
    createdAt: '2026-10-29T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t05', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-06',
    code: 'ETS-2026-T06',
    title: 'TEST 6 – 2026',
    slug: 'toeic-test-06-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 06 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 84781,
    createdAt: '2026-10-27T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t06', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-07',
    code: 'ETS-2026-T07',
    title: 'TEST 7 – 2026',
    slug: 'toeic-test-07-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 07 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 75501,
    createdAt: '2026-10-25T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t07', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-08',
    code: 'ETS-2026-T08',
    title: 'TEST 8 – 2026',
    slug: 'toeic-test-08-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 08 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 70183,
    createdAt: '2026-10-23T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t08', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-09',
    code: 'ETS-2026-T09',
    title: 'TEST 9 – 2026',
    slug: 'toeic-test-09-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 09 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 69340,
    createdAt: '2026-10-22T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t09', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2026-10',
    code: 'ETS-2026-T10',
    title: 'TEST 10 – 2026',
    slug: 'toeic-test-10-2026',
    collectionGroup: '2026 (New)',
    skillCategory: 'listening_reading',
    description: 'Đề luyện thi TOEIC số 10 bộ đề mới 2026.',
    thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Full Test 7 Parts',
    duration: 120,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 86168,
    createdAt: '2026-10-21T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: ['Làm bài trên trình duyệt Google Chrome để đạt độ ổn định tốt nhất.'],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t10', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2025-01',
    code: 'EC-2025-T01',
    title: 'TEST 1 – 2025 (Nền tảng 450+)',
    slug: 'toeic-test-01-2025',
    collectionGroup: '2025 Core Collection',
    skillCategory: 'listening_reading',
    description:
      'Đề thi thử TOEIC nền tảng giúp học viên làm quen với áp lực phòng thi trực tuyến và quy trình phân bổ thời gian Listening – Reading.',
    thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900',
    difficulty: 'Cơ bản (350+)',
    testType: 'Mini Test',
    duration: 60,
    totalQuestions: 23,
    standardTotalQuestions: 100,
    attemptsCount: 93914,
    createdAt: '2026-10-20T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [15, 30, 45, 60, 90],
    status: 'published',
    generalInstructions: [
      'Đề nền tảng có thời gian mặc định 60 phút, phù hợp cho học viên mới bắt đầu luyện giải đề.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t11', true),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
  {
    id: 'test-2025-02',
    code: 'EC-2025-T02',
    title: 'TEST 2 – 2025 (Chuyên sâu 700+)',
    slug: 'toeic-test-02-2025',
    collectionGroup: '2025 Core Collection',
    skillCategory: 'listening_reading',
    description:
      'Đề thi tổng hợp kiểm tra định kỳ cuối khóa với một số Part nâng cao yêu cầu làm theo lộ trình chuẩn.',
    thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900',
    difficulty: 'Chuẩn ETS (700+)',
    testType: 'Luyện chuyên sâu',
    duration: 90,
    totalQuestions: 23,
    standardTotalQuestions: 200,
    attemptsCount: 84310,
    createdAt: '2026-10-10T08:00:00.000Z',
    allowPartSelection: true,
    availableDurationOptions: [30, 45, 60, 90, 120],
    status: 'published',
    generalInstructions: [
      'Trong đề kiểm tra định kỳ này, Part 3 và Part 4 được cấu hình khóa chọn lẻ khi tự chọn Part theo cấu trúc bài kiểm tra định kỳ.',
    ],
    sampleCheckAudioUrl: SAMPLE_SPEAKER_CHECK_AUDIO,
    parts: buildStandardParts('t12', false),
    scoreConversionTable: DEFAULT_SCORE_CONVERSION_TABLE,
  },
]

export const serverTestAnswerKeys: Record<string, ServerTestAnswerKey> = {
  ...buildAnswerKeysForPrefix('t01'),
  ...buildAnswerKeysForPrefix('t02'),
  ...buildAnswerKeysForPrefix('t03'),
  ...buildAnswerKeysForPrefix('t04'),
  ...buildAnswerKeysForPrefix('t05'),
  ...buildAnswerKeysForPrefix('t06'),
  ...buildAnswerKeysForPrefix('t07'),
  ...buildAnswerKeysForPrefix('t08'),
  ...buildAnswerKeysForPrefix('t09'),
  ...buildAnswerKeysForPrefix('t10'),
  ...buildAnswerKeysForPrefix('t11'),
  ...buildAnswerKeysForPrefix('t12'),
}
