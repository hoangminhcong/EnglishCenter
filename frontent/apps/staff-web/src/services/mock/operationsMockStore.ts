import { getTodayIsoInVietnam, shiftIsoYmd } from '@english-center/utils'
import type {
  AcademicStudentDto,
  AccountingReceivableDto,
  AttendanceAuditEntryDto,
  CenterClassOfferingDto,
  ClassScheduleSessionDto,
  ClassTransferHistoryDto,
  CourseSyllabusVersionDto,
  GradeAuditEntryDto,
  LessonActivityType,
  PaymentReceiptDto,
  PaymentTransactionDto,
  PlacementContactLogDto,
  RefundRequestDto,
  StudentAcademicRequestDto,
  StudentAssessmentGradeDto,
  StudentEnrollmentRecordDto,
  TeacherAssignmentRecordDto,
  TeacherAttendanceEntryDto,
  TeacherSubmissionRecordDto,
  TeachingScheduleRequestDto,
  TeachingSessionPlanDto,
  TransactionAuditLogDto,
} from '@english-center/contracts'
import { readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'

export const ACADEMIC_OPS_MOCK_KEY = 'ec_staff_mock_academic_ops_v6'
export const ACCOUNTING_OPS_MOCK_KEY = 'ec_staff_mock_accounting_ops_v6'
export const TEACHER_OPS_MOCK_KEY = 'ec_staff_mock_teacher_ops_v6'

export interface AcademicOpsMockState {
  students: AcademicStudentDto[]
  enrollments: StudentEnrollmentRecordDto[]
  transferHistory: ClassTransferHistoryDto[]
  placementContactLogs: PlacementContactLogDto[]
  academicRequests: StudentAcademicRequestDto[]
  courseSyllabi: CourseSyllabusVersionDto[]
}

export interface AccountingOpsMockState {
  receivables: AccountingReceivableDto[]
  transactions: PaymentTransactionDto[]
  transactionAuditLogs: TransactionAuditLogDto[]
  receipts: PaymentReceiptDto[]
  refunds: RefundRequestDto[]
}

export interface TeacherOpsMockState {
  sessions: ClassScheduleSessionDto[]
  teachingPlans: TeachingSessionPlanDto[]
  attendanceEntries: TeacherAttendanceEntryDto[]
  attendanceAuditLogs: AttendanceAuditEntryDto[]
  assignments: TeacherAssignmentRecordDto[]
  submissions: TeacherSubmissionRecordDto[]
  grades: StudentAssessmentGradeDto[]
  gradeAuditLogs: GradeAuditEntryDto[]
  teachingRequests: TeachingScheduleRequestDto[]
}

export function shiftIsoYearMonth(baseYmd: string, deltaMonths: number): string {
  const [y = 2026, m = 11] = baseYmd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1 + deltaMonths, 1))
  return utc.toISOString().slice(0, 7)
}

function parseStudyDaysToUtcDays(studyDays: string): number[] {
  const lower = studyDays.toLowerCase()
  const set = new Set<number>()
  for (const m of lower.matchAll(/(?:thứ|thu|t)\s*([2-7])\b/g)) {
    const vnDay = Number(m[1])
    if (vnDay >= 2 && vnDay <= 7) set.add(vnDay - 1)
  }
  for (const m of lower.matchAll(/(?:^|[\s,\-/])([2-7])(?=$|[\s,\-/])/g)) {
    const vnDay = Number(m[1])
    if (vnDay >= 2 && vnDay <= 7) set.add(vnDay - 1)
  }
  if (/\bcn\b|chủ\s*nhật|chu\s*nhat/.test(lower)) {
    set.add(0)
  }
  if (set.size === 0) {
    return [1, 3, 5]
  }
  return Array.from(set).sort((a, b) => a - b)
}

function generateSessionDatesFromStart(
  startDateYmd: string,
  studyDays: string,
  count: number,
): string[] {
  const utcWeekdays = parseStudyDaysToUtcDays(studyDays)
  const [sy = 2026, sm = 10, sd = 1] = startDateYmd.slice(0, 10).split('-').map(Number)
  const dates: string[] = []
  let offset = 0
  while (dates.length < count && offset < count * 14 + 30) {
    const dt = new Date(Date.UTC(sy, sm - 1, sd + offset))
    if (utcWeekdays.includes(dt.getUTCDay())) {
      dates.push(dt.toISOString().slice(0, 10))
    }
    offset += 1
  }
  return dates
}

export function syncClassScheduleSessions(
  cls: CenterClassOfferingDto,
  syllabi: readonly CourseSyllabusVersionDto[],
  existingSessions: readonly ClassScheduleSessionDto[],
  options?: {
    courseName?: string
    branchName?: string
    totalSessions?: number
  },
): ClassScheduleSessionDto[] {
  const otherClassSessions = existingSessions.filter((s) => s.classId !== cls.id)
  if (cls.status === 'cancelled') {
    return [...otherClassSessions]
  }

  const prevForClass = existingSessions
    .filter((s) => s.classId === cls.id)
    .sort((a, b) => a.sessionNumber - b.sessionNumber)

  const activeSyllabus =
    syllabi.find((s) => s.courseId === cls.courseId && s.status === 'active') ??
    syllabi.find((s) => s.courseId === cls.courseId)

  const courseName = options?.courseName ?? activeSyllabus?.courseName ?? cls.courseId
  const branchName =
    options?.branchName ??
    (cls.studyMode === 'Online' ? 'TOEIC Online (Trực tuyến tương tác)' : cls.branchId)
  const totalSessions = Math.max(
    12,
    Math.min(32, options?.totalSessions ?? (prevForClass.length >= 12 ? prevForClass.length : 24)),
  )

  const generatedDates = generateSessionDatesFromStart(cls.startDate, cls.studyDays, totalSessions)
  const firstDateYmd = generatedDates[0] ?? cls.startDate
  const [fy = 2026, fm = 10, fd = 1] = firstDateYmd.split('-').map(Number)
  const firstUtcMs = Date.UTC(fy, fm - 1, fd)

  const midSessionNum = Math.floor(totalSessions / 2)
  const builtSessions: ClassScheduleSessionDto[] = []

  for (let i = 0; i < totalSessions; i += 1) {
    const sessionNumber = i + 1
    const existing = prevForClass.find((s) => s.sessionNumber === sessionNumber)
    const sessionDate = generatedDates[i] ?? shiftIsoYmd(cls.startDate, i * 2)
    const [cy = 2026, cm = 10, cd = 1] = sessionDate.split('-').map(Number)
    const curUtcMs = Date.UTC(cy, cm - 1, cd)
    const weekIndex = Math.max(0, Math.floor((curUtcMs - firstUtcMs) / (7 * 86_400_000)))

    const sylItem = activeSyllabus?.sessions.find((item) => item.sessionNumber === sessionNumber)
    let activityType: LessonActivityType = 'class'
    let officialTitle = `Buổi ${String(sessionNumber).padStart(2, '0')}: Chuyên đề luyện kỹ năng ${courseName}`

    if (sylItem) {
      activityType = sylItem.activityType
      officialTitle = sylItem.topicTitle.startsWith('Buổi')
        ? sylItem.topicTitle
        : `Buổi ${String(sessionNumber).padStart(2, '0')}: ${sylItem.topicTitle}`
    } else if (sessionNumber === midSessionNum) {
      activityType = 'mid'
      officialTitle = `Buổi ${String(sessionNumber).padStart(2, '0')}: Kiểm tra Giữa khóa (Middle Test)`
    } else if (sessionNumber === midSessionNum + 1) {
      activityType = 'review'
      officialTitle = `Buổi ${String(sessionNumber).padStart(2, '0')}: Chữa đề Giữa khóa & Phân tích lỗi sai`
    } else if (sessionNumber === totalSessions) {
      activityType = 'final'
      officialTitle = `Buổi ${String(sessionNumber).padStart(2, '0')}: Kiểm tra Cuối khóa (Final Test)`
    } else if (existing?.officialTitle) {
      activityType = existing.activityType
      officialTitle = existing.officialTitle
    }

    builtSessions.push({
      id: existing?.id ?? `ses-${cls.id}-${String(sessionNumber).padStart(2, '0')}`,
      classId: cls.id,
      classCode: cls.classCode,
      courseId: cls.courseId,
      courseName: existing?.courseName ?? courseName,
      branchName: options?.branchName ?? existing?.branchName ?? branchName,
      teacherId: cls.teacherId ?? '',
      teacherName: cls.teacherId
        ? (cls.teacherName ?? existing?.teacherName ?? 'Giảng viên TOEIC')
        : 'Chưa phân công giảng viên',
      sessionNumber,
      weekIndex,
      sessionDate,
      startTime: cls.startTime,
      endTime: cls.endTime,
      roomLabel:
        cls.roomLabel ??
        existing?.roomLabel ??
        (cls.studyMode === 'Online' ? 'Zoom LMS Room' : 'Phòng học tiêu chuẩn'),
      activityType,
      officialTitle,
    })
  }

  return [...builtSessions, ...otherClassSessions]
}

function buildSeedAcademicOpsStore(): AcademicOpsMockState {
  const today = getTodayIsoInVietnam()
  const currentMonth = today.slice(0, 7)

  const courseSyllabi: CourseSyllabusVersionDto[] = [
    {
      id: 'syl-submarine-v1',
      courseId: 'submarine-toeic',
      courseCode: 'SUBMARINE',
      courseName: 'SUBMARINE TOEIC 700+',
      versionCode: 'SYL-SM-2026.1',
      status: 'active',
      effectiveFrom: '2026-09-01',
      summaryNote: 'Khung giáo trình 24 buổi chuyên sâu mục tiêu 700–850+ TOEIC.',
      updatedByName: 'Lê Hoàng Quân',
      updatedAt: '2026-10-01T08:00:00.000Z',
      sessions: Array.from({ length: 24 }, (_, idx) => {
        const sNum = idx + 1
        const activityType: LessonActivityType =
          sNum === 6 || sNum === 18
            ? 'demo'
            : sNum === 12
              ? 'mid'
              : sNum === 24
                ? 'final'
                : sNum === 5 || sNum === 13 || sNum === 23
                  ? 'review'
                  : 'class'
        return {
          id: `syl-sm-s${String(sNum).padStart(2, '0')}`,
          sessionNumber: sNum,
          activityType,
          topicTitle:
            sNum === 1
              ? 'Chiến thuật Part 1 & Cụm danh từ Part 5'
              : sNum === 12
                ? 'Kiểm tra Giữa khóa (Middle Test 200 câu)'
                : sNum === 24
                  ? 'Kiểm tra Cuối khóa (Final Test 200 câu)'
                  : `Chuyên đề thực chiến TOEIC 700+ – Phần ${sNum}`,
          learningObjectives: 'Nắm vững bẫy từ đồng nghĩa, tăng tốc độ xử lý câu hỏi thực chiến.',
          lcSummary: `Luyện nghe chuyên đề Listening buổi ${sNum}`,
          rcSummary: `Luyện giải nhanh Reading buổi ${sNum}`,
          teachingMaterials: [`Slide_Submarine_Buoi_${sNum}.pdf`],
        }
      }),
    },
    {
      id: 'syl-campbomb-v1',
      courseId: 'camp-bomb-toeic',
      courseCode: 'CAMPBOMB',
      courseName: 'CAMP BOMB TOEIC 450+',
      versionCode: 'SYL-CB-2026.1',
      status: 'active',
      effectiveFrom: '2026-09-01',
      summaryNote: 'Khung giáo trình 24 buổi bứt phá chuẩn đầu ra đại học 450–600+.',
      updatedByName: 'Lê Hoàng Quân',
      updatedAt: '2026-10-02T08:00:00.000Z',
      sessions: Array.from({ length: 24 }, (_, idx) => {
        const sNum = idx + 1
        const activityType: LessonActivityType =
          sNum === 12 ? 'mid' : sNum === 24 ? 'final' : sNum % 6 === 0 ? 'review' : 'class'
        return {
          id: `syl-cb-s${String(sNum).padStart(2, '0')}`,
          sessionNumber: sNum,
          activityType,
          topicTitle: `Chuyên đề Camp Bomb 450+ – Buổi ${String(sNum).padStart(2, '0')}`,
          learningObjectives: 'Xây chắc phản xạ nghe hội thoại và đọc lướt thông tin chính.',
          lcSummary: `Listening Part 1–4 buổi ${sNum}`,
          rcSummary: `Reading Part 5–7 buổi ${sNum}`,
          teachingMaterials: [`Slide_CampBomb_Buoi_${sNum}.pdf`],
        }
      }),
    },
  ]

  return {
    students: [
      {
        id: 'stu-hv-001',
        userAccountId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        fullName: 'Đỗ Minh Quân',
        phone: '0988777666',
        email: 'minhquan@englishcenter.edu.vn',
        dateOfBirth: '2003-05-14',
        schoolOrWork: 'Đại học Bách Khoa Hà Nội – Năm 4',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        currentCourseId: 'submarine-toeic',
        currentCourseName: 'SUBMARINE TOEIC 700+',
        currentClassId: 'cls-ec-s01',
        currentClassCode: 'EC-S01',
        entryScore: { lc: 285, rc: 265, total: 550 },
        goalScore: { lc: 395, rc: 355, total: 750 },
        commitmentSummary: {
          advisedOutcomeLabel: 'Cam kết đầu ra 700+ TOEIC',
          conditionsText: 'Tham gia tối thiểu 90% số buổi học và hoàn thành đầy đủ bài tập.',
          sourceRegistrationCode: 'REG-2026-0001',
        },
        learningStatus: 'studying',
        sourceRegistrationId: 'reg-seed-001',
        createdAt: `${shiftIsoYmd(today, -28)}T08:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -1)}T09:00:00.000Z`,
      },
      {
        id: 'stu-hv-002',
        userAccountId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        fullName: 'Nguyễn Minh Anh',
        phone: '0912345678',
        email: 'minhanh@englishcenter.edu.vn',
        dateOfBirth: '2004-08-19',
        schoolOrWork: 'Đại học Thương mại – Khoa Kinh tế Quốc tế',
        branchId: 'cs-nam-tu-liem',
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
        currentCourseId: 'camp-bomb-toeic',
        currentCourseName: 'CAMP BOMB TOEIC 450+',
        currentClassId: 'cls-ec-cb02',
        currentClassCode: 'EC-CB02',
        entryScore: { lc: 195, rc: 175, total: 370 },
        goalScore: { lc: 280, rc: 250, total: 530 },
        commitmentSummary: {
          advisedOutcomeLabel: 'Cam kết đầu ra 500+ TOEIC',
          conditionsText: 'Đảm bảo chuyên cần tối thiểu 90% và nộp đủ bài tập định kỳ.',
          sourceRegistrationCode: 'REG-2026-0002',
        },
        learningStatus: 'studying',
        sourceRegistrationId: 'reg-seed-002',
        createdAt: `${shiftIsoYmd(today, -20)}T08:30:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -2)}T10:00:00.000Z`,
      },
      {
        id: 'stu-hv-003',
        userAccountId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        fullName: 'Phạm Gia Huy',
        phone: '0977112233',
        email: 'giahuy@englishcenter.edu.vn',
        dateOfBirth: '2002-11-08',
        schoolOrWork: 'Kỹ sư Phần mềm – FPT Software',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        currentCourseId: 'submarine-toeic',
        currentCourseName: 'SUBMARINE TOEIC 700+',
        currentClassId: 'cls-ec-s01',
        currentClassCode: 'EC-S01',
        entryScore: { lc: 265, rc: 245, total: 510 },
        goalScore: { lc: 380, rc: 340, total: 720 },
        learningStatus: 'studying',
        createdAt: `${shiftIsoYmd(today, -28)}T09:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -3)}T11:00:00.000Z`,
      },
      {
        id: 'stu-hv-004',
        studentCode: 'HV-2026-0004',
        fullName: 'Lê Khánh Linh',
        phone: '0966445588',
        email: 'khanhlinh.le@gmail.com',
        dateOfBirth: '2005-03-22',
        schoolOrWork: 'Học viện Tài chính – Năm 2',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        currentCourseId: 'foundation-toeic',
        currentCourseName: 'FOUNDATION TOEIC (Xây nền)',
        entryScore: { lc: 115, rc: 105, total: 220 },
        goalScore: { lc: 200, rc: 180, total: 380 },
        learningStatus: 'waiting_placement',
        expectedStartMonth: currentMonth,
        note: 'Ưu tiên xếp lớp ca tối Thứ 2 - 4 - 6 tại Cơ sở Hà Đông.',
        createdAt: `${shiftIsoYmd(today, -4)}T10:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -1)}T15:00:00.000Z`,
      },
      {
        id: 'stu-hv-005',
        studentCode: 'HV-2026-0005',
        fullName: 'Hoàng Đức Trung',
        phone: '0933889977',
        email: 'ductrung.hoang@gmail.com',
        dateOfBirth: '2001-07-12',
        schoolOrWork: 'Chuyên viên Kế toán – Viettel Post',
        branchId: 'cs-hai-ba-trung',
        branchName: 'Cơ sở 3 – Hai Bà Trưng',
        currentCourseId: 'submarine-toeic',
        currentCourseName: 'SUBMARINE TOEIC 700+',
        entryScore: { lc: 290, rc: 260, total: 550 },
        goalScore: { lc: 390, rc: 360, total: 750 },
        learningStatus: 'hold',
        note: 'Đang bảo lưu 1 tháng do đi công tác chi nhánh miền Nam.',
        createdAt: `${shiftIsoYmd(today, -45)}T08:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -10)}T09:00:00.000Z`,
      },
    ],
    enrollments: [
      {
        id: 'enr-hv-001',
        enrollmentCode: 'ENR-2026-0001',
        studentId: 'stu-hv-001',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        status: 'active',
        agreedTuitionVnd: 4_500_000,
        listedTuitionSnapshotVnd: 4_800_000,
        discountSnapshotVnd: 300_000,
        tuitionPolicyIdSnapshot: 'tp-submarine-2026',
        tuitionPolicyCodeSnapshot: 'CSHP-SM-2026',
        sourceRegistrationCode: 'REG-2026-0001',
        enrolledAt: `${shiftIsoYmd(today, -28)}T08:30:00.000Z`,
      },
      {
        id: 'enr-hv-002',
        enrollmentCode: 'ENR-2026-0002',
        studentId: 'stu-hv-002',
        courseId: 'camp-bomb-toeic',
        courseName: 'CAMP BOMB TOEIC 450+',
        classId: 'cls-ec-cb02',
        classCode: 'EC-CB02',
        branchId: 'cs-nam-tu-liem',
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
        status: 'active',
        agreedTuitionVnd: 3_800_000,
        listedTuitionSnapshotVnd: 4_000_000,
        discountSnapshotVnd: 200_000,
        tuitionPolicyIdSnapshot: 'tp-campbomb-2026',
        tuitionPolicyCodeSnapshot: 'CSHP-CB-2026',
        sourceRegistrationCode: 'REG-2026-0002',
        enrolledAt: `${shiftIsoYmd(today, -20)}T08:45:00.000Z`,
      },
      {
        id: 'enr-hv-003',
        enrollmentCode: 'ENR-2026-0003',
        studentId: 'stu-hv-003',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        status: 'active',
        agreedTuitionVnd: 4_800_000,
        listedTuitionSnapshotVnd: 4_800_000,
        discountSnapshotVnd: 0,
        enrolledAt: `${shiftIsoYmd(today, -28)}T09:15:00.000Z`,
      },
    ],
    transferHistory: [
      {
        id: 'trf-001',
        studentId: 'stu-hv-002',
        studentName: 'Nguyễn Minh Anh',
        studentCode: 'HV-2026-0002',
        fromClassId: 'sch-onl-01',
        fromClassCode: 'ONL-CB11',
        toClassId: 'cls-ec-cb02',
        toClassCode: 'EC-CB02',
        courseId: 'camp-bomb-toeic',
        reason: 'Học viên xin chuyển từ lớp Online sang học trực tiếp tại Cs. Nam Từ Liêm gần trường.',
        transferredByUserId: 'acc-stf-004',
        transferredByName: 'Lê Hoàng Quân',
        transferredAt: `${shiftIsoYmd(today, -19)}T10:00:00.000Z`,
      },
    ],
    placementContactLogs: [
      {
        id: 'plc-log-001',
        targetKey: 'stu-hv-004',
        studentOrLeadName: 'Lê Khánh Linh',
        phone: '0966445588',
        contactedAt: `${shiftIsoYmd(today, -1)}T15:00:00.000Z`,
        contactedByUserId: 'acc-stf-004',
        contactedByName: 'Lê Hoàng Quân',
        resultSummary: 'Đã xác nhận lịch khai giảng lớp TOEIC-FD01 tối 2-4-6, học viên đồng ý nhập học.',
        nextFollowUpDate: shiftIsoYmd(today, 2),
      },
    ],
    academicRequests: [
      {
        id: 'areq-001',
        requestCode: 'REQ-2026-001',
        studentId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        studentName: 'Phạm Gia Huy',
        studentPhone: '0977112233',
        enrollmentId: 'enr-hv-003',
        currentCourseId: 'submarine-toeic',
        currentCourseName: 'SUBMARINE TOEIC 700+',
        currentClassId: 'cls-ec-s01',
        currentClassCode: 'EC-S01',
        targetClassId: 'sch-hbt-01',
        targetClassCode: 'HBT-SB12',
        requestType: 'transfer',
        reason: 'Thay đổi địa điểm văn phòng làm việc sang quận Hai Bà Trưng',
        detailNote: 'Em mong muốn chuyển sang lớp Submarine cơ sở Hai Bà Trưng từ tuần tới để kịp giờ đi làm về.',
        effectiveDate: shiftIsoYmd(today, 5),
        status: 'Pending',
        submittedAt: `${shiftIsoYmd(today, -1)}T16:20:00.000Z`,
      },
      {
        id: 'areq-002',
        requestCode: 'REQ-2026-002',
        studentId: 'stu-hv-005',
        studentCode: 'HV-2026-0005',
        studentName: 'Hoàng Đức Trung',
        studentPhone: '0933889977',
        currentCourseId: 'submarine-toeic',
        currentCourseName: 'SUBMARINE TOEIC 700+',
        requestType: 'hold',
        reason: 'Đi công tác dài ngày theo quyết định công ty',
        detailNote: 'Xin bảo lưu kết quả học phí 1 tháng, dự kiến quay lại học vào tháng sau.',
        effectiveDate: shiftIsoYmd(today, -10),
        holdUntilDate: shiftIsoYmd(today, 20),
        status: 'Approved',
        submittedAt: `${shiftIsoYmd(today, -12)}T09:00:00.000Z`,
        reviewedByUserId: 'acc-stf-004',
        reviewedByName: 'Lê Hoàng Quân',
        reviewedAt: `${shiftIsoYmd(today, -11)}T14:00:00.000Z`,
        resolutionNote: 'Đã phê duyệt bảo lưu 30 ngày kèm xác nhận công tác.',
      },
    ],
    courseSyllabi,
  }
}

function buildSeedAccountingOpsStore(): AccountingOpsMockState {
  const today = getTodayIsoInVietnam()

  return {
    receivables: [
      {
        id: 'rcv-hv-001',
        receivableCode: 'RCV-2026-0001',
        studentId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        studentName: 'Đỗ Minh Quân',
        studentPhone: '0988777666',
        enrollmentId: 'enr-hv-001',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        tuitionPolicyId: 'tp-submarine-2026',
        tuitionPolicyCode: 'CSHP-SM-2026',
        listedTuitionVnd: 4_800_000,
        discountAmountVnd: 300_000,
        discountReason: 'Ưu đãi học viên đăng ký sớm trước ngày khai giảng',
        totalReceivableVnd: 4_500_000,
        dueDate: shiftIsoYmd(today, 12),
        isCancelled: false,
        note: 'Học viên đóng đợt 1: 3.000.000đ, hẹn hoàn tất đợt 2 trước buổi 18.',
        createdByUserId: 'acc-stf-003',
        createdByName: 'Trần Thu Hà',
        createdAt: `${shiftIsoYmd(today, -28)}T09:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -20)}T09:20:00.000Z`,
      },
      {
        id: 'rcv-hv-002',
        receivableCode: 'RCV-2026-0002',
        studentId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        studentName: 'Nguyễn Minh Anh',
        studentPhone: '0912345678',
        enrollmentId: 'enr-hv-002',
        courseId: 'camp-bomb-toeic',
        courseName: 'CAMP BOMB TOEIC 450+',
        classId: 'cls-ec-cb02',
        classCode: 'EC-CB02',
        branchId: 'cs-nam-tu-liem',
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
        tuitionPolicyId: 'tp-campbomb-2026',
        tuitionPolicyCode: 'CSHP-CB-2026',
        listedTuitionVnd: 4_000_000,
        discountAmountVnd: 200_000,
        discountReason: 'Ưu đãi sinh viên đại học đối tác',
        totalReceivableVnd: 3_800_000,
        dueDate: shiftIsoYmd(today, -10),
        isCancelled: false,
        createdByUserId: 'acc-stf-003',
        createdByName: 'Trần Thu Hà',
        createdAt: `${shiftIsoYmd(today, -20)}T09:00:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -18)}T14:35:00.000Z`,
      },
      {
        id: 'rcv-hv-003',
        receivableCode: 'RCV-2026-0003',
        studentId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        studentName: 'Phạm Gia Huy',
        studentPhone: '0977112233',
        enrollmentId: 'enr-hv-003',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        listedTuitionVnd: 4_800_000,
        discountAmountVnd: 0,
        totalReceivableVnd: 4_800_000,
        dueDate: shiftIsoYmd(today, -3),
        isCancelled: false,
        note: 'Quá hạn học phí đợt 2 (2.400.000đ) 3 ngày – cần nhắc thu.',
        createdByUserId: 'acc-stf-003',
        createdByName: 'Trần Thu Hà',
        createdAt: `${shiftIsoYmd(today, -28)}T09:30:00.000Z`,
        updatedAt: `${shiftIsoYmd(today, -1)}T11:00:00.000Z`,
      },
    ],
    transactions: [
      {
        id: 'tx-hv-001',
        transactionCode: 'GD-2026-0001',
        receivableId: 'rcv-hv-001',
        receivableCode: 'RCV-2026-0001',
        studentId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        studentName: 'Đỗ Minh Quân',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        amountVnd: 3_000_000,
        paymentMethod: 'bank_transfer',
        paidAt: `${shiftIsoYmd(today, -20)}T09:15:00.000Z`,
        payerName: 'Đỗ Minh Quân',
        recordedByUserId: 'acc-stf-003',
        recordedByName: 'Trần Thu Hà',
        status: 'Confirmed',
        bankTransferMeta: {
          bankName: 'Vietcombank',
          referenceCode: 'VCB202611079981',
          transferContent: 'DO MINH QUAN NOP HP DOT 1 EC S01',
          verifiedByName: 'Trần Thu Hà',
          verifiedAt: `${shiftIsoYmd(today, -20)}T09:20:00.000Z`,
        },
        receiptId: 'rcp-hv-001',
        receiptNumber: 'PT-2026-0001',
        createdAt: `${shiftIsoYmd(today, -20)}T09:15:00.000Z`,
      },
      {
        id: 'tx-hv-002',
        transactionCode: 'GD-2026-0002',
        receivableId: 'rcv-hv-002',
        receivableCode: 'RCV-2026-0002',
        studentId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        studentName: 'Nguyễn Minh Anh',
        courseId: 'camp-bomb-toeic',
        courseName: 'CAMP BOMB TOEIC 450+',
        classId: 'cls-ec-cb02',
        classCode: 'EC-CB02',
        branchId: 'cs-nam-tu-liem',
        branchName: 'Cơ sở 2 – Nam Từ Liêm',
        amountVnd: 3_800_000,
        paymentMethod: 'cash',
        paidAt: `${shiftIsoYmd(today, -18)}T14:30:00.000Z`,
        payerName: 'Nguyễn Minh Anh',
        recordedByUserId: 'acc-stf-003',
        recordedByName: 'Trần Thu Hà',
        status: 'Confirmed',
        receiptId: 'rcp-hv-002',
        receiptNumber: 'PT-2026-0002',
        createdAt: `${shiftIsoYmd(today, -18)}T14:30:00.000Z`,
      },
      {
        id: 'tx-hv-003',
        transactionCode: 'GD-2026-0003',
        receivableId: 'rcv-hv-003',
        receivableCode: 'RCV-2026-0003',
        studentId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        studentName: 'Phạm Gia Huy',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        amountVnd: 2_400_000,
        paymentMethod: 'cash',
        paidAt: `${shiftIsoYmd(today, -25)}T10:00:00.000Z`,
        payerName: 'Phạm Gia Huy',
        recordedByUserId: 'acc-stf-003',
        recordedByName: 'Trần Thu Hà',
        status: 'Confirmed',
        receiptId: 'rcp-hv-003',
        receiptNumber: 'PT-2026-0003',
        createdAt: `${shiftIsoYmd(today, -25)}T10:00:00.000Z`,
      },
      {
        id: 'tx-hv-004-pending',
        transactionCode: 'GD-2026-0004',
        receivableId: 'rcv-hv-001',
        receivableCode: 'RCV-2026-0001',
        studentId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        studentName: 'Đỗ Minh Quân',
        courseId: 'submarine-toeic',
        courseName: 'SUBMARINE TOEIC 700+',
        classId: 'cls-ec-s01',
        classCode: 'EC-S01',
        branchId: 'cs-ha-dong',
        branchName: 'Cơ sở 1 – Hà Đông',
        amountVnd: 1_500_000,
        paymentMethod: 'bank_transfer',
        paidAt: `${today}T08:45:00.000Z`,
        payerName: 'Đỗ Minh Quân',
        recordedByUserId: 'acc-stf-003',
        recordedByName: 'Trần Thu Hà',
        status: 'PendingVerification',
        bankTransferMeta: {
          bankName: 'Techcombank',
          referenceCode: 'TCB202611270142',
          transferContent: 'DO MINH QUAN DONG NOT HP EC S01',
        },
        note: 'Chờ đối chiếu sao kê ngân hàng cuối ca sáng.',
        createdAt: `${today}T08:45:00.000Z`,
      },
    ],
    transactionAuditLogs: [
      {
        id: 'tx-aud-001',
        transactionId: 'tx-hv-001',
        action: 'confirmed',
        actorUserId: 'acc-stf-003',
        actorName: 'Trần Thu Hà',
        occurredAt: `${shiftIsoYmd(today, -20)}T09:20:00.000Z`,
        detail: 'Xác nhận chuyển khoản VCB202611079981 và cấp phiếu thu PT-2026-0001.',
      },
      {
        id: 'tx-aud-002',
        transactionId: 'tx-hv-004-pending',
        action: 'created',
        actorUserId: 'acc-stf-003',
        actorName: 'Trần Thu Hà',
        occurredAt: `${today}T08:45:00.000Z`,
        detail: 'Ghi nhận ủy nhiệm chi đợt 2 chờ đối chiếu ngân hàng.',
      },
    ],
    receipts: [
      {
        id: 'rcp-hv-001',
        receiptNumber: 'PT-2026-0001',
        transactionId: 'tx-hv-001',
        transactionCode: 'GD-2026-0001',
        receivableId: 'rcv-hv-001',
        receivableCode: 'RCV-2026-0001',
        studentId: 'stu-hv-001',
        studentCode: 'HV-2026-0001',
        studentName: 'Đỗ Minh Quân',
        payerName: 'Đỗ Minh Quân',
        cashierUserId: 'acc-stf-003',
        cashierName: 'Trần Thu Hà',
        amountVnd: 3_000_000,
        paymentMethod: 'bank_transfer',
        reasonContent: 'Thu học phí đợt 1 lớp EC-S01 (SUBMARINE TOEIC 700+)',
        issuedAt: `${shiftIsoYmd(today, -20)}T09:20:00.000Z`,
      },
      {
        id: 'rcp-hv-002',
        receiptNumber: 'PT-2026-0002',
        transactionId: 'tx-hv-002',
        transactionCode: 'GD-2026-0002',
        receivableId: 'rcv-hv-002',
        receivableCode: 'RCV-2026-0002',
        studentId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        studentName: 'Nguyễn Minh Anh',
        payerName: 'Nguyễn Minh Anh',
        cashierUserId: 'acc-stf-003',
        cashierName: 'Trần Thu Hà',
        amountVnd: 3_800_000,
        paymentMethod: 'cash',
        reasonContent: 'Thu trọn gói học phí lớp EC-CB02 (CAMP BOMB TOEIC 450+)',
        issuedAt: `${shiftIsoYmd(today, -18)}T14:35:00.000Z`,
      },
      {
        id: 'rcp-hv-003',
        receiptNumber: 'PT-2026-0003',
        transactionId: 'tx-hv-003',
        transactionCode: 'GD-2026-0003',
        receivableId: 'rcv-hv-003',
        receivableCode: 'RCV-2026-0003',
        studentId: 'stu-hv-003',
        studentCode: 'HV-2026-0003',
        studentName: 'Phạm Gia Huy',
        payerName: 'Phạm Gia Huy',
        cashierUserId: 'acc-stf-003',
        cashierName: 'Trần Thu Hà',
        amountVnd: 2_400_000,
        paymentMethod: 'cash',
        reasonContent: 'Thu học phí đợt 1 lớp EC-S01 (SUBMARINE TOEIC 700+)',
        issuedAt: `${shiftIsoYmd(today, -25)}T10:05:00.000Z`,
      },
    ],
    refunds: [
      {
        id: 'rfd-001',
        refundCode: 'RF-2026-0001',
        receivableId: 'rcv-hv-002',
        receivableCode: 'RCV-2026-0002',
        originalTransactionId: 'tx-hv-002',
        originalTransactionCode: 'GD-2026-0002',
        studentId: 'stu-hv-002',
        studentCode: 'HV-2026-0002',
        studentName: 'Nguyễn Minh Anh',
        courseId: 'camp-bomb-toeic',
        courseName: 'CAMP BOMB TOEIC 450+',
        classId: 'cls-ec-cb02',
        classCode: 'EC-CB02',
        branchId: 'cs-nam-tu-liem',
        amountVnd: 200_000,
        paymentMethod: 'bank_transfer',
        reason: 'Hoàn bổ sung voucher giới thiệu bạn học cùng lớp sau khi đối chiếu.',
        status: 'PendingApproval',
        requestedByUserId: 'acc-stf-003',
        requestedByName: 'Trần Thu Hà',
        requestedAt: `${shiftIsoYmd(today, -2)}T15:00:00.000Z`,
      },
    ],
  }
}

function buildSeedTeacherOpsStore(): TeacherOpsMockState {
  const today = getTodayIsoInVietnam()
  const academicSeed = buildSeedAcademicOpsStore()

  const ecS01Class: CenterClassOfferingDto = {
    id: 'cls-ec-s01',
    classCode: 'EC-S01',
    className: 'Submarine 700+ – Tối 3-5-7 (Cs. Hà Đông)',
    courseId: 'submarine-toeic',
    branchId: 'cs-ha-dong',
    studyMode: 'Offline',
    startDate: shiftIsoYmd(today, -28),
    endDate: shiftIsoYmd(today, 24),
    studyDays: 'Thứ 3 - Thứ 5 - Thứ 7',
    startTime: '19:30',
    endTime: '21:30',
    teacherId: 'acc-stf-007',
    teacherName: 'Cô Lan Hương',
    roomLabel: 'Phòng P.301 – Hà Đông',
    maxStudents: 22,
    enrolledStudents: 18,
    status: 'ongoing',
    isPublishedOnWeb: false,
  }

  const ecCb02Class: CenterClassOfferingDto = {
    id: 'cls-ec-cb02',
    classCode: 'EC-CB02',
    className: 'Camp Bomb 450+ – Tối 2-4-6 (Cs. Nam Từ Liêm)',
    courseId: 'camp-bomb-toeic',
    branchId: 'cs-nam-tu-liem',
    studyMode: 'Offline',
    startDate: shiftIsoYmd(today, -20),
    endDate: shiftIsoYmd(today, 32),
    studyDays: 'Thứ 2 - Thứ 4 - Thứ 6',
    startTime: '18:00',
    endTime: '20:00',
    teacherId: 'acc-stf-007',
    teacherName: 'Cô Lan Hương',
    roomLabel: 'Phòng P.204 – Nhổn',
    maxStudents: 24,
    enrolledStudents: 20,
    status: 'ongoing',
    isPublishedOnWeb: false,
  }

  let sessions = syncClassScheduleSessions(ecS01Class, academicSeed.courseSyllabi, [], {
    courseName: 'SUBMARINE TOEIC 700+',
    branchName: 'Cơ sở 1 – Hà Đông',
    totalSessions: 24,
  })
  sessions = syncClassScheduleSessions(ecCb02Class, academicSeed.courseSyllabi, sessions, {
    courseName: 'CAMP BOMB TOEIC 450+',
    branchName: 'Cơ sở 2 – Nam Từ Liêm',
    totalSessions: 24,
  })

  const s01Sessions = sessions
    .filter((s) => s.classId === 'cls-ec-s01')
    .sort((a, b) => a.sessionNumber - b.sessionNumber)

  const teachingPlans: TeachingSessionPlanDto[] = s01Sessions.slice(0, 12).map((ses) => ({
    id: `plan-${ses.id}`,
    sessionId: ses.id,
    classId: 'cls-ec-s01',
    teacherId: 'acc-stf-007',
    topicTitle: ses.officialTitle,
    lcContent: `Luyện kỹ năng Listening chuyên sâu (${ses.officialTitle})`,
    rcContent: `Giải bài tập tốc độ Reading (${ses.officialTitle})`,
    learningObjectives: 'Học viên đạt tỷ lệ đúng tối thiểu 80% nhóm câu hỏi mục tiêu.',
    materialLinks: ['https://drive.google.com/drive/folders/english-center-giao-trinh-khoa'],
    homeworkBrief: 'Hoàn thành bài tập về nhà trên cổng Khóa học của tôi trước buổi kế tiếp.',
    teacherNote: 'Lớp tương tác sôi nổi, cần lưu ý nhắc nhóm cuối lớp luyện thêm từ đồng nghĩa.',
    completionStatus: 'completed',
    updatedAt: `${ses.sessionDate}T21:40:00.000Z`,
  }))

  const attendanceEntries: TeacherAttendanceEntryDto[] = []
  for (const ses of s01Sessions.slice(0, 12)) {
    attendanceEntries.push(
      {
        id: `att-${ses.id}-stu1`,
        sessionId: ses.id,
        classId: 'cls-ec-s01',
        studentId: 'stu-hv-001',
        status: ses.sessionNumber === 5 ? 'Late' : ses.sessionNumber === 9 ? 'Excused' : 'Present',
        note:
          ses.sessionNumber === 5
            ? 'Đến muộn 10 phút do tắc đường'
            : ses.sessionNumber === 9
              ? 'Xin phép nghỉ thi học kỳ tại trường'
              : undefined,
        recordedByTeacherId: 'acc-stf-007',
        recordedByTeacherName: 'Cô Lan Hương',
        updatedAt: `${ses.sessionDate}T20:00:00.000Z`,
      },
      {
        id: `att-${ses.id}-stu3`,
        sessionId: ses.id,
        classId: 'cls-ec-s01',
        studentId: 'stu-hv-003',
        status: ses.sessionNumber === 7 ? 'Unexcused' : 'Present',
        note: ses.sessionNumber === 7 ? 'Vắng chưa báo trước, đã nhắn nhắc làm bài bù' : undefined,
        recordedByTeacherId: 'acc-stf-007',
        recordedByTeacherName: 'Cô Lan Hương',
        updatedAt: `${ses.sessionDate}T20:00:00.000Z`,
      },
    )
  }

  const ses2 = s01Sessions[1]!
  const ses9 = s01Sessions[8]!
  const ses12 = s01Sessions[11]!

  const assignments: TeacherAssignmentRecordDto[] = [
    {
      id: 'asg-cls-ec-s01-01',
      code: 'BTVN-01',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      sessionId: ses2.id,
      sessionNumber: 2,
      title: 'Bài tập Cụm danh từ & Thì động từ + Nghe chép chính tả Part 1',
      instructions: 'Hoàn thành 30 câu Part 5 và nộp link Google Drive bài chép chính tả.',
      assignedDate: ses2.sessionDate,
      dueAt: `${shiftIsoYmd(ses2.sessionDate, 3)}T23:00:00.000Z`,
      submissionFormat: 'lc_rc_sheet',
      maxScore: 100,
      partMaxQuestions: { lc: 20, rc: 30 },
      targetScope: 'whole_class',
      status: 'open',
      createdByTeacherId: 'acc-stf-007',
      createdByTeacherName: 'Cô Lan Hương',
      createdAt: `${ses2.sessionDate}T21:35:00.000Z`,
    },
    {
      id: 'asg-cls-ec-s01-03',
      code: 'BTVN-03',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      sessionId: ses9.id,
      sessionNumber: 9,
      title: 'Chuyên đề Hội thoại kèm bảng biểu Part 3 & Giới từ thương mại',
      instructions: 'Làm 24 câu Part 3 Graphic và 25 câu giới từ trong sách bài tập trang 68.',
      assignedDate: ses9.sessionDate,
      dueAt: `${shiftIsoYmd(today, 2)}T23:00:00.000Z`,
      submissionFormat: 'lc_rc_sheet',
      maxScore: 100,
      partMaxQuestions: { lc: 24, rc: 25 },
      targetScope: 'whole_class',
      status: 'open',
      createdByTeacherId: 'acc-stf-007',
      createdByTeacherName: 'Cô Lan Hương',
      createdAt: `${ses9.sessionDate}T21:35:00.000Z`,
    },
  ]

  const submissions: TeacherSubmissionRecordDto[] = [
    {
      id: 'sub-s01-01-stu1',
      assignmentId: 'asg-cls-ec-s01-01',
      classId: 'cls-ec-s01',
      studentId: 'stu-hv-001',
      studentCode: 'HV-2026-0001',
      studentName: 'Đỗ Minh Quân',
      status: 'Graded',
      submissionUrl: 'https://drive.google.com/drive/folders/english-center-bai-nop-btvn-01',
      studentAnswerNote: 'Em đã hoàn thành đủ bài nghe chép và 30 câu ngữ pháp ạ.',
      lcCorrect: 18,
      rcCorrect: 27,
      evaluationOutcome: 'passed',
      submittedAt: `${shiftIsoYmd(ses2.sessionDate, 1)}T20:15:00.000Z`,
      score: 90,
      teacherFeedback: 'Bài làm rất cẩn thận, nắm chắc vị trí danh từ ghép. Phát huy nhé!',
      gradedByTeacherId: 'acc-stf-007',
      gradedByTeacherName: 'Cô Lan Hương',
      gradedAt: `${shiftIsoYmd(ses2.sessionDate, 2)}T09:30:00.000Z`,
    },
    {
      id: 'sub-s01-03-stu1',
      assignmentId: 'asg-cls-ec-s01-03',
      classId: 'cls-ec-s01',
      studentId: 'stu-hv-001',
      studentCode: 'HV-2026-0001',
      studentName: 'Đỗ Minh Quân',
      status: 'Submitted',
      submissionUrl: 'https://drive.google.com/drive/folders/english-center-bai-nop-btvn-03',
      studentAnswerNote: 'Em gửi bài làm tuần 3, nhờ cô xem giúp câu 18 phần giới từ ạ.',
      lcCorrect: 21,
      rcCorrect: 22,
      submittedAt: `${shiftIsoYmd(today, -1)}T21:20:00.000Z`,
      score: null,
    },
    {
      id: 'sub-s01-03-stu3',
      assignmentId: 'asg-cls-ec-s01-03',
      classId: 'cls-ec-s01',
      studentId: 'stu-hv-003',
      studentCode: 'HV-2026-0003',
      studentName: 'Phạm Gia Huy',
      status: 'NotSubmitted',
      score: null,
    },
  ]

  const grades: StudentAssessmentGradeDto[] = [
    {
      id: 'grd-stu-hv-001-hw',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      studentId: 'stu-hv-001',
      studentCode: 'HV-2026-0001',
      studentName: 'Đỗ Minh Quân',
      category: 'homework',
      assessmentTitle: 'Trung bình Bài tập về nhà nửa đầu khóa',
      examDate: shiftIsoYmd(today, -7),
      maxListeningScore: 50,
      maxReadingScore: 50,
      maxTotalScore: 100,
      listeningScore: 44,
      readingScore: 46,
      totalScore: 90,
      teacherComment: 'Hoàn thành bài tập đúng hạn, ghi chép từ vựng đầy đủ.',
      updatedByTeacherId: 'acc-stf-007',
      updatedByTeacherName: 'Cô Lan Hương',
      updatedAt: `${shiftIsoYmd(today, -6)}T10:00:00.000Z`,
    },
    {
      id: 'grd-stu-hv-001-mid',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      studentId: 'stu-hv-001',
      studentCode: 'HV-2026-0001',
      studentName: 'Đỗ Minh Quân',
      category: 'mid',
      assessmentTitle: 'Bài thi Giữa khóa (Middle Test 200 câu)',
      examDate: ses12.sessionDate,
      maxListeningScore: 495,
      maxReadingScore: 495,
      maxTotalScore: 990,
      listeningScore: 350,
      readingScore: 315,
      totalScore: 665,
      partBreakdown: {
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
      teacherComment: 'Đạt vượt tiến độ cam kết giữa khóa (+115 điểm so với đầu vào).',
      updatedByTeacherId: 'acc-stf-007',
      updatedByTeacherName: 'Cô Lan Hương',
      updatedAt: `${shiftIsoYmd(today, -4)}T15:00:00.000Z`,
    },
    {
      id: 'grd-stu-hv-003-mid',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      studentId: 'stu-hv-003',
      studentCode: 'HV-2026-0003',
      studentName: 'Phạm Gia Huy',
      category: 'mid',
      assessmentTitle: 'Bài thi Giữa khóa (Middle Test 200 câu)',
      examDate: ses12.sessionDate,
      maxListeningScore: 495,
      maxReadingScore: 495,
      maxTotalScore: 990,
      listeningScore: 315,
      readingScore: 285,
      totalScore: 600,
      teacherComment: 'Tăng 90 điểm so với đầu vào, cần rèn thêm tốc độ đọc đoạn đôi Part 7.',
      updatedByTeacherId: 'acc-stf-007',
      updatedByTeacherName: 'Cô Lan Hương',
      updatedAt: `${shiftIsoYmd(today, -4)}T15:20:00.000Z`,
    },
  ]

  const teachingRequests: TeachingScheduleRequestDto[] = [
    {
      id: 'treq-001',
      requestCode: 'GV-REQ-2026-01',
      classId: 'cls-ec-s01',
      classCode: 'EC-S01',
      className: 'Submarine 700+ – Tối 3-5-7 (Cs. Hà Đông)',
      courseId: 'submarine-toeic',
      courseName: 'SUBMARINE TOEIC 700+',
      branchId: 'cs-ha-dong',
      branchName: 'Cơ sở 1 – Hà Đông',
      studyDays: 'Thứ 3 - Thứ 5 - Thứ 7',
      startTime: '19:30',
      endTime: '21:30',
      startDate: shiftIsoYmd(today, 6),
      teacherId: 'acc-stf-007',
      teacherCode: 'GV-TOEIC-01',
      teacherName: 'Cô Lan Hương',
      note: 'Đề xuất mở thêm 1 buổi phụ đạo chữa đề chuyên sâu Part 7 chiều Chủ nhật cho nhóm mục tiêu 800+.',
      status: 'Requested',
      requestedAt: `${shiftIsoYmd(today, -1)}T10:30:00.000Z`,
    },
  ]

  return {
    sessions,
    teachingPlans,
    attendanceEntries,
    attendanceAuditLogs: [
      {
        id: 'att-aud-001',
        sessionId: ses9.id,
        classId: 'cls-ec-s01',
        studentId: 'stu-hv-001',
        studentName: 'Đỗ Minh Quân',
        previousStatus: 'Unexcused',
        nextStatus: 'Excused',
        changedByName: 'Cô Lan Hương',
        changedAt: `${ses9.sessionDate}T21:45:00.000Z`,
        reason: 'Cập nhật theo đơn xin phép trùng lịch thi học phần đã được Giáo vụ xác nhận.',
      },
    ],
    assignments,
    submissions,
    grades,
    gradeAuditLogs: [
      {
        id: 'grd-aud-001',
        gradeId: 'grd-stu-hv-001-mid',
        classId: 'cls-ec-s01',
        studentName: 'Đỗ Minh Quân',
        assessmentTitle: 'Bài thi Giữa khóa (Middle Test 200 câu)',
        previousTotal: null,
        nextTotal: 665,
        changedByName: 'Cô Lan Hương',
        changedAt: `${shiftIsoYmd(today, -4)}T15:00:00.000Z`,
        note: 'Nhập điểm chấm phiếu trả lời kỳ thi Giữa khóa.',
      },
    ],
    teachingRequests,
  }
}

export function readAcademicOpsStore(): AcademicOpsMockState {
  return readMockCollection(ACADEMIC_OPS_MOCK_KEY, buildSeedAcademicOpsStore)
}

export function writeAcademicOpsStore(next: AcademicOpsMockState): void {
  writeMockCollection(ACADEMIC_OPS_MOCK_KEY, next)
}

export function readAccountingOpsStore(): AccountingOpsMockState {
  return readMockCollection(ACCOUNTING_OPS_MOCK_KEY, buildSeedAccountingOpsStore)
}

export function writeAccountingOpsStore(next: AccountingOpsMockState): void {
  writeMockCollection(ACCOUNTING_OPS_MOCK_KEY, next)
}

export function readTeacherOpsStore(): TeacherOpsMockState {
  return readMockCollection(TEACHER_OPS_MOCK_KEY, buildSeedTeacherOpsStore)
}

export function writeTeacherOpsStore(next: TeacherOpsMockState): void {
  writeMockCollection(TEACHER_OPS_MOCK_KEY, next)
}
