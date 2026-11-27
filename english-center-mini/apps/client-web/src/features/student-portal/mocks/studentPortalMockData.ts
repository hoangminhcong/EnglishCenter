import { shiftIsoYmd } from '@english-center/utils'
import type { StudentTuitionOverviewDto } from '@english-center/contracts'
import { formatDate, getTodayIsoInVietnam } from '@/utils/format'
import type {
  AssignmentWithSubmission,
  AttendanceRecord,
  LearningResource,
  LessonActivityType,
  LessonSession,
  StudentPortalDataset,
} from '../model/studentPortal.types'

const DOC_BASE_URL = 'https://drive.google.com/drive/folders/english-center-'

const GENERAL_RESOURCES: LearningResource[] = [
  {
    id: 'res-gen-1',
    title: 'Giáo trình tổng hợp & Audio luyện nghe khóa học',
    kind: 'PDF',
    url: `${DOC_BASE_URL}giao-trinh-khoa`,
    isCourseGeneral: true,
  },
  {
    id: 'res-gen-2',
    title: 'Hệ thống video chữa chi tiết Reading Part 5 – Part 7',
    kind: 'Video',
    url: `${DOC_BASE_URL}video-reading`,
    isCourseGeneral: true,
  },
  {
    id: 'res-gen-3',
    title: 'Sổ tay 600 từ vựng thương mại trọng tâm TOEIC',
    kind: 'PDF',
    url: `${DOC_BASE_URL}600-tu-vung-toeic`,
    isCourseGeneral: true,
  },
  {
    id: 'res-gen-4',
    title: 'Thư mục nộp bài tập về nhà của lớp',
    kind: 'Link',
    url: `${DOC_BASE_URL}folder-nop-bai`,
    isCourseGeneral: true,
  },
]

const SESSION_TOPICS: ReadonlyArray<{
  lc: string
  rc: string
  title: string
  type: LessonActivityType
}> = [
  { lc: 'Part 1: Tranh tả người (1 người & nhóm người)', rc: 'Cấu trúc câu & Từ loại danh từ', title: 'Chiến thuật Part 1 & Cụm danh từ Part 5', type: 'class' },
  { lc: 'Part 1: Tranh tả vật & phong cảnh nơi làm việc', rc: 'Động từ, chia thì hiện tại & quá khứ', title: 'Tranh tả vật & Hệ thống thì động từ', type: 'class' },
  { lc: 'Part 2: Câu hỏi Who / Where / When', rc: 'Thì tương lai & Thì hoàn thành trong TOEIC', title: 'Phản xạ Hỏi – Đáp Wh-Questions & Thì hoàn thành', type: 'class' },
  { lc: 'Part 2: Câu hỏi Why / How & Yes/No gián tiếp', rc: 'Thể bị động & Phân từ V-ing / V-ed', title: 'Bẫy trả lời gián tiếp Part 2 & Thể bị động', type: 'class' },
  { lc: 'Tổng ôn kỹ năng bắt từ khóa Part 1 – Part 2', rc: 'Chữa đề luyện tập tổng hợp Ngữ pháp tuần 1–2', title: 'Ôn tập chuyên đề Part 1–2 & Từ loại', type: 'review' },
  { lc: 'Mini Demo Listening 50 câu chuẩn tốc độ ETS', rc: 'Mini Demo Reading 50 câu bấm giờ thực chiến', title: 'Demo Test đợt 1 – Đánh giá tiến độ đầu khóa', type: 'demo' },
  { lc: 'Part 3: Hội thoại công sở & nhân sự (3 câu/đoạn)', rc: 'Đại từ nhân xưng, đại từ phản thân & sở hữu', title: 'Kỹ thuật đọc trước câu hỏi Part 3 & Đại từ', type: 'class' },
  { lc: 'Part 3: Hội thoại mua sắm, đặt lịch & dịch vụ', rc: 'Tính từ, Trạng từ & Cấu trúc so sánh', title: 'Paraphrasing trong Part 3 & So sánh', type: 'class' },
  { lc: 'Part 3: Hội thoại kèm bảng biểu / sơ đồ (Graphic)', rc: 'Giới từ chỉ thời gian, nơi chốn & cụm giới từ', title: 'Xử lý câu hỏi bảng biểu Part 3 & Giới từ', type: 'class' },
  { lc: 'Part 4: Thông báo nội bộ & Tin nhắn thoại', rc: 'Liên từ phụ thuộc, liên từ tương quan & giới từ', title: 'Bài nói ngắn Part 4 & Liên từ trọng tâm', type: 'class' },
  { lc: 'Rà soát lỗi sai Listening nửa đầu khóa', rc: 'Chiến thuật phân bổ thời gian Part 5 (30 câu/10 phút)', title: 'Tổng ôn trước kỳ thi Giữa khóa', type: 'review' },
  { lc: 'Thi Giữa khóa Listening (100 câu – 45 phút)', rc: 'Thi Giữa khóa Reading (100 câu – 75 phút)', title: 'Kiểm tra Giữa khóa (Middle Test)', type: 'mid' },
  { lc: 'Chữa chi tiết transcript Listening Middle Test', rc: 'Phân tích bẫy từ vựng & ngữ pháp Middle Test', title: 'Chữa đề Giữa khóa & Cá nhân hóa lộ trình', type: 'review' },
  { lc: 'Part 4: Quảng cáo thương mại & Bản tin sự kiện', rc: 'Mệnh đề quan hệ rút gọn trong Part 5 & Part 6', title: 'Bài nói quảng cáo Part 4 & Mệnh đề quan hệ', type: 'class' },
  { lc: 'Part 4: Bài phát biểu hội thảo & Chuyến tham quan', rc: 'Part 6: Điền câu hoàn chỉnh theo mạch văn bản', title: 'Suy luận ý định người nói & Điền câu Part 6', type: 'class' },
  { lc: 'Luyện nghe tăng tốc Part 3 – Part 4 nâng cao', rc: 'Part 7: Email, Thư tín thương mại & Thông báo', title: 'Skimming – Scanning đoạn đơn Part 7', type: 'class' },
  { lc: 'Bẫy đồng âm & đổi ý phút cuối trong Part 3', rc: 'Part 7: Bài báo, Quảng cáo tuyển dụng & Hóa đơn', title: 'Câu hỏi suy luận (Inference) trong Part 7', type: 'class' },
  { lc: 'Demo Test số 2 (Listening 100 câu chuẩn ETS)', rc: 'Demo Test số 2 (Reading 100 câu chuẩn ETS)', title: 'Demo Test đợt 2 – Rèn tâm lý phòng thi', type: 'demo' },
  { lc: 'Chữa chuyên sâu các cụm đồng nghĩa Listening', rc: 'Part 7: Đoạn đôi (Double Passages) liên kết thông tin', title: 'Kỹ thuật đối chiếu thông tin Đoạn đôi Part 7', type: 'class' },
  { lc: 'Luyện đề Listening tổng hợp mục tiêu 400+ LC', rc: 'Part 7: Đoạn ba (Triple Passages) tối ưu tốc độ', title: 'Chiến thuật xử lý Đoạn ba Part 7 hiệu quả', type: 'class' },
  { lc: 'Luyện phản xạ câu hỏi ngụ ý (Implied Meaning)', rc: 'Luyện bộ câu hỏi từ vựng nâng cao 800+ Part 5–6', title: 'Tăng tốc mục tiêu 750+ TOEIC', type: 'class' },
  { lc: 'Thi thử tốc độ thật Listening Full Set', rc: 'Thi thử tốc độ thật Reading Full Set', title: 'Luyện đề tổng hợp sát cấu trúc thi thật', type: 'class' },
  { lc: 'Hệ thống hóa mẹo tránh bẫy toàn bộ Part 1–4', rc: 'Hệ thống hóa quản lý thời gian Part 5–7', title: 'Tổng ôn toàn diện trước kỳ thi Cuối khóa', type: 'review' },
  { lc: 'Thi Cuối khóa Listening (100 câu – 45 phút)', rc: 'Thi Cuối khóa Reading (100 câu – 75 phút)', title: 'Kiểm tra Cuối khóa (Final Test)', type: 'final' },
]

function generateClassDatesAroundToday(todayYmd: string, completedCount = 14): string[] {
  // Đặt buổi thứ (completedCount + 1) rơi vào hôm nay hoặc ngày mai để Thời khóa biểu tuần hiện tại luôn sinh động
  const anchorSessionIdx = completedCount // index 14 = session 15
  const dates: string[] = []
  for (let i = 0; i < 24; i += 1) {
    const deltaDays = (i - anchorSessionIdx) * 2
    dates.push(shiftIsoYmd(todayYmd, deltaDays))
  }
  return dates
}

export function getSeededStudentPortalDataset(
  studentId: string,
  fallbackUser?: { fullName?: string; email?: string; phone?: string },
): StudentPortalDataset | null {
  if (studentId !== 'stu-hv-001' && studentId !== 'stu-hv-002') {
    return null
  }

  const todayIso = getTodayIsoInVietnam()
  const isSecondStudent = studentId === 'stu-hv-002'
  const completedSessions = isSecondStudent ? 10 : 14
  const dates = generateClassDatesAroundToday(todayIso, completedSessions)
  const startDate = dates[0] ?? todayIso
  const endDate = dates[23] ?? shiftIsoYmd(todayIso, 20)

  const classId = isSecondStudent ? 'cls-ec-cb02' : 'cls-ec-s01'
  const classCode = isSecondStudent ? 'EC-CB02' : 'EC-S01'
  const courseId = isSecondStudent ? 'camp-bomb-toeic' : 'submarine-toeic'
  const courseName = isSecondStudent ? 'CAMP BOMB TOEIC 450+' : 'SUBMARINE TOEIC 700+'
  const branchName = isSecondStudent ? 'Cơ sở 2 – Nam Từ Liêm' : 'Cơ sở 1 – Hà Đông'
  const roomName = isSecondStudent ? 'Phòng P.204 – Nhổn' : 'Phòng P.301 – Hà Đông'
  const scheduleDays = isSecondStudent ? 'Thứ 2, Thứ 4, Thứ 6' : 'Thứ 3, Thứ 5, Thứ 7'
  const startTime = isSecondStudent ? '18:00' : '19:30'
  const endTime = isSecondStudent ? '20:00' : '21:30'

  const lessons: LessonSession[] = SESSION_TOPICS.map((item, idx) => {
    const sessionNumber = idx + 1
    const date = dates[idx] ?? todayIso
    const isPast = idx < completedSessions
    const assignmentId =
      sessionNumber === 2
        ? `asg-${classId}-01`
        : sessionNumber === 6
          ? `asg-${classId}-02`
          : sessionNumber === 9
            ? `asg-${classId}-03`
            : sessionNumber === 14
              ? `asg-${classId}-04`
              : sessionNumber === 15
                ? `asg-${classId}-05`
                : undefined

    return {
      id: `ses-${classId}-${String(sessionNumber).padStart(2, '0')}`,
      learningPlanId: `plan-${classId}`,
      sessionNumber,
      weekIndex: Math.floor(idx / 3),
      date,
      type: item.type,
      title: `Buổi ${String(sessionNumber).padStart(2, '0')}: ${item.title}`,
      lcContent: item.lc,
      rcContent: item.rc,
      startTime,
      endTime,
      roomName,
      teacherName: 'Cô Lan Hương',
      learningObjectives: `${item.lc}; ${item.rc}.`,
      homeworkSummary: assignmentId ? 'Hoàn thành bài tập thực hành & ghi chú từ vựng buổi học.' : undefined,
      sessionStatus: isPast ? 'completed' : 'scheduled',
      assignmentId,
      resources: [
        {
          id: `res-${classId}-${sessionNumber}-pdf`,
          lessonId: `ses-${classId}-${String(sessionNumber).padStart(2, '0')}`,
          title: `Slide & Tài liệu Buổi ${String(sessionNumber).padStart(2, '0')}`,
          kind: 'PDF',
          url: `${DOC_BASE_URL}slide-buoi-${sessionNumber}`,
        },
        {
          id: `res-${classId}-${sessionNumber}-aud`,
          lessonId: `ses-${classId}-${String(sessionNumber).padStart(2, '0')}`,
          title: `File nghe luyện tập Buổi ${String(sessionNumber).padStart(2, '0')}`,
          kind: 'Audio',
          url: `${DOC_BASE_URL}audio-buoi-${sessionNumber}`,
        },
      ],
    }
  })

  const attendance: AttendanceRecord[] = lessons.map((les, idx) => {
    let teacherStatus: AttendanceRecord['teacherStatus'] = 'Unmarked'
    let status: AttendanceRecord['status'] = 'none'
    let note: string | undefined

    if (idx < completedSessions) {
      if (idx === 4) {
        teacherStatus = 'Late'
        status = 'late'
        note = 'Đến muộn 10 phút do tắc đường, đã bổ sung bài ghi đầy đủ.'
      } else if (idx === 8) {
        teacherStatus = 'Excused'
        status = 'excused'
        note = 'Xin phép nghỉ thi học kỳ tại trường, đã xem video record học bù.'
      } else {
        teacherStatus = 'Present'
        status = 'on'
      }
    }

    return {
      id: `att-${studentId}-${les.sessionNumber}`,
      lessonId: les.id,
      sessionNumber: les.sessionNumber,
      date: les.date,
      lessonTitle: les.title,
      lessonType: les.type,
      status,
      teacherStatus,
      note,
    }
  })

  const assignments: AssignmentWithSubmission[] = [
    {
      id: `asg-${classId}-01`,
      lessonId: lessons[1]!.id,
      sessionNumber: 2,
      weekIndex: 0,
      code: 'BTVN-01',
      title: 'Bài tập Cụm danh từ & Thì động từ + Nghe chép chính tả Part 1',
      instructions: 'Hoàn thành 30 câu Part 5 và nộp link Google Drive bài chép chính tả.',
      submissionFormat: 'lc_rc_sheet',
      maxScore: 100,
      assignedDate: lessons[1]!.date,
      dueDate: `${shiftIsoYmd(lessons[1]!.date, 2)}T23:00:00`,
      isDemoTest: false,
      parts: [
        { key: 'lc', label: 'Listening Part 1', maxQuestions: 20 },
        { key: 'rc', label: 'Reading Part 5', maxQuestions: 30 },
      ],
      isUnlocked: true,
      isOverdue: false,
      submission: {
        assignmentId: `asg-${classId}-01`,
        studentId,
        status: 'passed',
        driveLink: `${DOC_BASE_URL}bai-nop-btvn-01`,
        studentAnswerNote: 'Em đã hoàn thành đủ bài nghe chép và 30 câu ngữ pháp ạ.',
        partScores: { lc: 18, rc: 27 },
        score: 90,
        isConfirmedByTeacher: true,
        teacherFeedback: 'Bài làm rất cẩn thận, nắm chắc vị trí danh từ ghép. Phát huy nhé!',
        gradedByTeacherName: 'Cô Lan Hương',
        submittedAt: `${shiftIsoYmd(lessons[1]!.date, 1)}T20:15:00.000Z`,
        gradedAt: `${shiftIsoYmd(lessons[1]!.date, 2)}T09:30:00.000Z`,
      },
    },
    {
      id: `asg-${classId}-02`,
      lessonId: lessons[5]!.id,
      sessionNumber: 6,
      weekIndex: 1,
      code: 'DEMO-01',
      title: 'Báo cáo điểm Demo Test đợt 1 (100 câu chuẩn ETS)',
      instructions: 'Nhập số điểm quy đổi LC & RC sau khi làm bài thi trên phòng máy / LMS.',
      submissionFormat: 'lc_rc_sheet',
      maxScore: 990,
      assignedDate: lessons[5]!.date,
      dueDate: `${shiftIsoYmd(lessons[5]!.date, 2)}T23:00:00`,
      isDemoTest: true,
      parts: null,
      isUnlocked: true,
      isOverdue: false,
      submission: {
        assignmentId: `asg-${classId}-02`,
        studentId,
        status: 'passed',
        demoScores: { lc: 325, rc: 295, total: 620 },
        score: 620,
        isConfirmedByTeacher: true,
        teacherFeedback: 'Tăng 70 điểm so với đầu vào! Cần cải thiện thêm tốc độ đọc Part 7.',
        gradedByTeacherName: 'Cô Lan Hương',
        submittedAt: `${shiftIsoYmd(lessons[5]!.date, 1)}T21:00:00.000Z`,
        gradedAt: `${shiftIsoYmd(lessons[5]!.date, 2)}T10:00:00.000Z`,
      },
    },
    {
      id: `asg-${classId}-03`,
      lessonId: lessons[8]!.id,
      sessionNumber: 9,
      weekIndex: 2,
      code: 'BTVN-03',
      title: 'Chuyên đề Hội thoại kèm bảng biểu Part 3 & Giới từ thương mại',
      instructions: 'Làm 24 câu Part 3 Graphic và 25 câu giới từ trong sách bài tập trang 68.',
      submissionFormat: 'lc_rc_sheet',
      maxScore: 100,
      assignedDate: lessons[8]!.date,
      dueDate: `${shiftIsoYmd(lessons[8]!.date, 2)}T23:00:00`,
      isDemoTest: false,
      parts: [
        { key: 'lc', label: 'Part 3 Graphic', maxQuestions: 24 },
        { key: 'rc', label: 'Giới từ Part 5–6', maxQuestions: 25 },
      ],
      isUnlocked: true,
      isOverdue: false,
      submission: {
        assignmentId: `asg-${classId}-03`,
        studentId,
        status: 'submitted',
        driveLink: `${DOC_BASE_URL}bai-nop-btvn-03`,
        studentAnswerNote: 'Em gửi bài làm tuần 3, nhờ cô xem giúp câu 18 phần giới từ ạ.',
        partScores: { lc: 21, rc: 22 },
        isConfirmedByTeacher: false,
        submittedAt: `${shiftIsoYmd(todayIso, -1)}T21:20:00.000Z`,
      },
    },
    {
      id: `asg-${classId}-04`,
      lessonId: lessons[13]!.id,
      sessionNumber: 14,
      weekIndex: 4,
      code: 'BTVN-04',
      title: 'Bài tập Mệnh đề quan hệ rút gọn & Nghe bài nói quảng cáo Part 4',
      instructions: 'Hoàn thành bộ đề 40 câu mệnh đề quan hệ rút gọn và nộp kết quả trước buổi 16.',
      submissionFormat: 'lc_rc_sheet',
      maxScore: 100,
      assignedDate: lessons[13]!.date,
      dueDate: `${shiftIsoYmd(todayIso, 3)}T23:00:00`,
      isDemoTest: false,
      parts: [
        { key: 'lc', label: 'Listening Part 4', maxQuestions: 20 },
        { key: 'rc', label: 'Mệnh đề quan hệ', maxQuestions: 20 },
      ],
      isUnlocked: true,
      isOverdue: false,
      submission: {
        assignmentId: `asg-${classId}-04`,
        studentId,
        status: 'todo',
      },
    },
  ]

  const midExamDate = lessons[11]?.date ?? shiftIsoYmd(todayIso, -5)

  return {
    hasEnrollment: true,
    student: {
      id: studentId,
      studentCode: isSecondStudent ? 'HV-2026-0002' : 'HV-2026-0001',
      fullName:
        fallbackUser?.fullName?.trim() ||
        (isSecondStudent ? 'Nguyễn Minh Anh' : 'Đỗ Minh Quân'),
      email:
        fallbackUser?.email?.trim() ||
        (isSecondStudent ? 'minhanh@englishcenter.edu.vn' : 'minhquan@englishcenter.edu.vn'),
      phone: fallbackUser?.phone?.trim() || (isSecondStudent ? '0912345678' : '0988777666'),
      dateOfBirth: isSecondStudent ? '2004-08-19' : '2003-05-14',
      schoolOrWork: isSecondStudent
        ? 'Đại học Thương mại – Khoa Kinh tế Quốc tế'
        : 'Đại học Bách Khoa Hà Nội – Năm 4',
      learningStatus: 'studying',
      branchName,
      commitmentSummary: {
        advisedOutcomeLabel: isSecondStudent ? 'Cam kết đầu ra 500+ TOEIC' : 'Cam kết đầu ra 700+ TOEIC',
        conditionsText:
          'Tham gia tối thiểu 90% thời lượng buổi học và hoàn thành đầy đủ bài tập về nhà, bài kiểm tra định kỳ.',
        sourceRegistrationCode: isSecondStudent ? 'REG-2026-0002' : 'REG-2026-0001',
      },
      entryScore: isSecondStudent
        ? { lc: 195, rc: 175, total: 370 }
        : { lc: 285, rc: 265, total: 550 },
      goalScore: isSecondStudent
        ? { lc: 280, rc: 250, total: 530 }
        : { lc: 395, rc: 355, total: 750 },
    },
    classInfo: {
      id: classId,
      classCode,
      courseId,
      courseName,
      teacherName: 'Cô Lan Hương',
      branchName,
      scheduleDays,
      scheduleTime: `${startTime} – ${endTime}`,
      roomName,
      startDate,
      endDate,
      totalWeeks: 8,
      totalSessions: 24,
    },
    enrollments: [
      {
        id: isSecondStudent ? 'enr-hv-002' : 'enr-hv-001',
        enrollmentCode: isSecondStudent ? 'ENR-2026-0002' : 'ENR-2026-0001',
        studentId,
        courseId,
        courseName,
        classId,
        classCode,
        branchId: isSecondStudent ? 'cs-nam-tu-liem' : 'cs-ha-dong',
        branchName,
        status: 'active',
        agreedTuitionVnd: isSecondStudent ? 3_800_000 : 4_500_000,
        enrolledAt: `${startDate}T08:30:00.000Z`,
      },
    ],
    assessmentGrades: [
      {
        id: `grd-${studentId}-hw`,
        classId,
        classCode,
        studentId,
        studentCode: isSecondStudent ? 'HV-2026-0002' : 'HV-2026-0001',
        studentName: isSecondStudent ? 'Nguyễn Minh Anh' : 'Đỗ Minh Quân',
        category: 'homework',
        assessmentTitle: 'Trung bình Bài tập về nhà nửa đầu khóa',
        examDate: shiftIsoYmd(todayIso, -7),
        maxListeningScore: 50,
        maxReadingScore: 50,
        maxTotalScore: 100,
        listeningScore: 44,
        readingScore: 46,
        totalScore: 90,
        teacherComment: 'Hoàn thành bài tập đúng hạn, ghi chép từ vựng đầy đủ.',
        updatedByTeacherId: 'acc-stf-007',
        updatedByTeacherName: 'Cô Lan Hương',
        updatedAt: `${shiftIsoYmd(todayIso, -6)}T10:00:00.000Z`,
      },
      {
        id: `grd-${studentId}-quiz`,
        classId,
        classCode,
        studentId,
        studentCode: isSecondStudent ? 'HV-2026-0002' : 'HV-2026-0001',
        studentName: isSecondStudent ? 'Nguyễn Minh Anh' : 'Đỗ Minh Quân',
        category: 'quiz',
        assessmentTitle: 'Mini Test Từ vựng & Ngữ pháp Tuần 3',
        examDate: shiftIsoYmd(todayIso, -10),
        maxListeningScore: 50,
        maxReadingScore: 50,
        maxTotalScore: 100,
        listeningScore: 42,
        readingScore: 43,
        totalScore: 85,
        updatedByTeacherId: 'acc-stf-007',
        updatedByTeacherName: 'Cô Lan Hương',
        updatedAt: `${shiftIsoYmd(todayIso, -9)}T10:00:00.000Z`,
      },
      {
        id: `grd-${studentId}-mid`,
        classId,
        classCode,
        studentId,
        studentCode: isSecondStudent ? 'HV-2026-0002' : 'HV-2026-0001',
        studentName: isSecondStudent ? 'Nguyễn Minh Anh' : 'Đỗ Minh Quân',
        category: 'mid',
        assessmentTitle: 'Bài thi Giữa khóa (Middle Test 200 câu)',
        examDate: midExamDate,
        maxListeningScore: 495,
        maxReadingScore: 495,
        maxTotalScore: 990,
        listeningScore: isSecondStudent ? 245 : 350,
        readingScore: isSecondStudent ? 220 : 315,
        totalScore: isSecondStudent ? 465 : 665,
        teacherComment: 'Đạt vượt tiến độ cam kết giữa khóa (+115 điểm so với đầu vào).',
        updatedByTeacherId: 'acc-stf-007',
        updatedByTeacherName: 'Cô Lan Hương',
        updatedAt: `${shiftIsoYmd(todayIso, -4)}T15:00:00.000Z`,
      },
    ],
    generalResources: GENERAL_RESOURCES,
    lessons,
    assignments,
    attendance,
    examResults: {
      entryScore: isSecondStudent
        ? { lc: 195, rc: 175, total: 370 }
        : { lc: 285, rc: 265, total: 550 },
      goalScore: isSecondStudent
        ? { lc: 280, rc: 250, total: 530 }
        : { lc: 395, rc: 355, total: 750 },
      midTerm: {
        id: `exam-mid-${studentId}`,
        examType: 'mid',
        examDate: midExamDate,
        lcScore: isSecondStudent ? 245 : 350,
        rcScore: isSecondStudent ? 220 : 315,
        totalScore: isSecondStudent ? 465 : 665,
        isConfirmed: true,
        parts: {
          p1: { correct: 5, total: 6 },
          p2: { correct: 20, total: 25 },
          p3: { correct: 29, total: 39 },
          p4: { correct: 21, total: 30 },
          p5: { correct: 24, total: 30 },
          p6: { correct: 12, total: 16 },
          p7s: { correct: 21, total: 29 },
          p7d: { correct: 7, total: 10 },
          p7t: { correct: 10, total: 15 },
        },
      },
      finalTerm: null,
      expectedFinalDate: endDate,
    },
    supportRequests: [
      {
        id: `req-${studentId}-01`,
        requestCode: 'REQ-202601',
        studentId,
        type: 'transfer',
        requestType: 'transfer',
        reason: 'Điều chỉnh lịch học sang ca phù hợp',
        content: 'Em xin đăng ký học bù nội dung Buổi 09 cùng lớp ca tối Thứ 6 do trùng lịch thi học phần.',
        detailNote: 'Em xin đăng ký học bù nội dung Buổi 09 cùng lớp ca tối Thứ 6.',
        effectiveDate: lessons[8]!.date,
        createdAt: formatDate(shiftIsoYmd(lessons[8]!.date, -1)),
        submittedAt: `${shiftIsoYmd(lessons[8]!.date, -1)}T09:00:00.000Z`,
        status: 'Approved',
        reviewedByName: 'Lê Hoàng Quân (Phòng Giáo vụ)',
        reviewedAt: `${shiftIsoYmd(lessons[8]!.date, -1)}T14:30:00.000Z`,
        resolutionNote: 'Đã xếp lịch học bù và cấp quyền xem lại video bài giảng Buổi 09.',
      },
    ],
    referenceToday: todayIso,
  }
}

export function getSeededStudentTuitionOverview(
  studentId: string,
): StudentTuitionOverviewDto | null {
  const todayIso = getTodayIsoInVietnam()

  if (studentId === 'stu-hv-001') {
    return {
      studentId: 'stu-hv-001',
      studentCode: 'HV-2026-0001',
      totalReceivableVnd: 4_500_000,
      totalPaidConfirmedVnd: 3_000_000,
      totalRemainingVnd: 1_500_000,
      items: [
        {
          receivableId: 'rcv-hv-001',
          receivableCode: 'RCV-2026-0001',
          courseId: 'submarine-toeic',
          courseName: 'SUBMARINE TOEIC 700+',
          classId: 'cls-ec-s01',
          classCode: 'EC-S01',
          branchName: 'Cơ sở 1 – Hà Đông',
          listedTuitionVnd: 4_800_000,
          discountAmountVnd: 300_000,
          discountReason: 'Ưu đãi học viên đăng ký sớm trước ngày khai giảng',
          totalReceivableVnd: 4_500_000,
          paidConfirmedVnd: 3_000_000,
          pendingVerificationVnd: 0,
          remainingVnd: 1_500_000,
          dueDate: shiftIsoYmd(todayIso, 12),
          status: 'PartiallyPaid',
          receipts: [
            {
              id: 'rcp-hv-001',
              receiptNumber: 'PT-2026-0001',
              transactionCode: 'GD-2026-0001',
              amountVnd: 3_000_000,
              paymentMethod: 'bank_transfer',
              paidAt: `${shiftIsoYmd(todayIso, -20)}T09:15:00.000Z`,
              issuedAt: `${shiftIsoYmd(todayIso, -20)}T09:20:00.000Z`,
              reasonContent: 'Thu học phí đợt 1 lớp EC-S01 (SUBMARINE TOEIC 700+)',
            },
          ],
        },
      ],
    }
  }

  if (studentId === 'stu-hv-002') {
    return {
      studentId: 'stu-hv-002',
      studentCode: 'HV-2026-0002',
      totalReceivableVnd: 3_800_000,
      totalPaidConfirmedVnd: 3_800_000,
      totalRemainingVnd: 0,
      items: [
        {
          receivableId: 'rcv-hv-002',
          receivableCode: 'RCV-2026-0002',
          courseId: 'camp-bomb-toeic',
          courseName: 'CAMP BOMB TOEIC 450+',
          classId: 'cls-ec-cb02',
          classCode: 'EC-CB02',
          branchName: 'Cơ sở 2 – Nam Từ Liêm',
          listedTuitionVnd: 4_000_000,
          discountAmountVnd: 200_000,
          discountReason: 'Ưu đãi sinh viên đại học đối tác',
          totalReceivableVnd: 3_800_000,
          paidConfirmedVnd: 3_800_000,
          pendingVerificationVnd: 0,
          remainingVnd: 0,
          dueDate: shiftIsoYmd(todayIso, -10),
          status: 'Paid',
          receipts: [
            {
              id: 'rcp-hv-002',
              receiptNumber: 'PT-2026-0002',
              transactionCode: 'GD-2026-0002',
              amountVnd: 3_800_000,
              paymentMethod: 'cash',
              paidAt: `${shiftIsoYmd(todayIso, -18)}T14:30:00.000Z`,
              issuedAt: `${shiftIsoYmd(todayIso, -18)}T14:35:00.000Z`,
              reasonContent: 'Thu trọn gói học phí lớp EC-CB02 (CAMP BOMB TOEIC 450+)',
            },
          ],
        },
      ],
    }
  }

  return null
}
