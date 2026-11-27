import {
  TOEIC_EXAM_PART_KEYS,
  type AcademicStudentDto,
  type AssessmentCategory,
  type AssignmentTargetScope,
  type AttendanceAuditEntryDto,
  type CenterClassOfferingDto,
  type ClassScheduleSessionDto,
  type GradeAuditEntryDto,
  type StudentAssessmentGradeDto,
  type TeacherAssignmentRecordDto,
  type TeacherAttendanceEntryDto,
  type TeacherAttendanceStatus,
  type TeacherSubmissionRecordDto,
  type TeachingScheduleRequestDto,
  type TeachingSessionPlanDto,
  type ToeicExamPartBreakdownDto,
} from '@english-center/contracts'
import { getTodayIsoInVietnam, shiftIsoYmd, toSafeHttpUrl } from '@english-center/utils'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { checkClassScheduleConflict } from '@/features/sales/services/salesApi'
import { readCenterClassesStore } from '@/features/training/api/trainingApi'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/mock/mockStorage'
import {
  readAcademicOpsStore,
  readTeacherOpsStore,
  writeTeacherOpsStore,
} from '@/services/mock/operationsMockStore'
import { createUniqueId, toVietnamYmd } from '@/shared/utils/staffFormatters'
import type { DataScope } from '@/types/rbac.types'
import type {
  AssignedTeacherClassItem,
  AssignmentWithSubmissionsItem,
  AttendanceSheetBundle,
  GradeCompletionState,
  GradebookBundle,
  OpenClassForTeachingItem,
  SessionWithPlanItem,
  StudentProgressSummary,
  StudentWeightedGradeSummary,
  TeacherClassDetailBundle,
  TeacherDashboardData,
  UnmarkedSessionAlertItem,
} from '@/features/teacher/types/teacher.types'

export interface TeacherActor {
  userId: string
  employeeCode: string
  fullName: string
  scope: DataScope
}

interface CreateTeacherAssignmentInput {
  classId: string
  sessionId: string
  code: string
  title: string
  instructions: string
  attachmentUrl?: string
  dueDate: string
  submissionFormat: 'drive_link' | 'lc_rc_sheet' | 'file_url'
  maxScore: number
  isDemoTest?: boolean
  partMaxQuestions?: { lc: number; rc: number }
  targetScope: AssignmentTargetScope
  targetGroupLabel?: string
  targetStudentIds?: string[]
}

interface UpdateTeacherAssignmentInput {
  assignmentId: string
  sessionId: string
  code: string
  title: string
  instructions: string
  attachmentUrl?: string
  dueDate: string
  submissionFormat: 'drive_link' | 'lc_rc_sheet' | 'file_url'
  maxScore: number
  isDemoTest?: boolean
  partMaxQuestions?: { lc: number; rc: number }
  targetScope: AssignmentTargetScope
  targetGroupLabel?: string
  targetStudentIds?: string[]
}

function isUngradedPendingStatus(status: TeacherSubmissionRecordDto['status']): boolean {
  return status === 'Submitted' || status === 'LateSubmitted' || status === 'Grading'
}

function assertTeacherOwnsClass(cls: CenterClassOfferingDto, actor: TeacherActor): void {
  if (actor.scope === 'all') return
  if (cls.teacherId !== actor.userId) {
    throw new StaffApiClientError(
      `Từ chối truy cập (403): Lớp ${cls.classCode} không nằm trong danh sách phân công giảng dạy của bạn.`,
      403,
    )
  }
}

function getScopedClasses(
  allClasses: readonly CenterClassOfferingDto[],
  actor: TeacherActor,
): CenterClassOfferingDto[] {
  if (actor.scope === 'all') return [...allClasses]
  return allClasses.filter((c) => c.teacherId === actor.userId)
}

function getActiveStudentsInClass(classId: string): AcademicStudentDto[] {
  const academicStore = readAcademicOpsStore()
  const studentMap = new Map(academicStore.students.map((s) => [s.id, s]))
  const enrolledIds = academicStore.enrollments
    .filter((e) => e.classId === classId && e.status === 'active')
    .map((e) => e.studentId)

  const uniqueIds = Array.from(new Set(enrolledIds))
  return uniqueIds
    .map((id) => studentMap.get(id))
    .filter((s): s is AcademicStudentDto => Boolean(s))
}

function averageRawScores(grades: readonly StudentAssessmentGradeDto[]): number | null {
  const valid = grades.filter(
    (g): g is StudentAssessmentGradeDto & { totalScore: number } => g.totalScore !== null,
  )
  if (valid.length === 0) return null
  const sum = valid.reduce((acc, g) => acc + g.totalScore, 0)
  return Math.round((sum / valid.length) * 10) / 10
}

function averageScorePercentages(grades: readonly StudentAssessmentGradeDto[]): number | null {
  const valid = grades.filter(
    (g): g is StudentAssessmentGradeDto & { totalScore: number } =>
      g.totalScore !== null && g.maxTotalScore > 0,
  )
  if (valid.length === 0) return null
  const sumPct = valid.reduce((acc, g) => acc + (g.totalScore / g.maxTotalScore) * 100, 0)
  return Math.round((sumPct / valid.length) * 10) / 10
}

function computeStudentWeightedSummary(params: {
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  classCode: string
  studentGrades: readonly StudentAssessmentGradeDto[]
}): StudentWeightedGradeSummary {
  const hwGrades = params.studentGrades.filter((g) => g.category === 'homework')
  const qrGrades = params.studentGrades.filter(
    (g) => g.category === 'quiz' || g.category === 'regular',
  )
  const midGrades = params.studentGrades.filter((g) => g.category === 'mid')
  const finalGrades = params.studentGrades.filter((g) => g.category === 'final')
  const mockGrades = params.studentGrades.filter((g) => g.category === 'toeic_mock')

  const homeworkPercent = averageScorePercentages(hwGrades)
  const quizRegularPercent = averageScorePercentages(qrGrades)
  const midPercent = averageScorePercentages(midGrades)
  const finalPercent = averageScorePercentages(finalGrades)
  const toeicMockRawAvg = averageRawScores(mockGrades)
  const toeicMockScore = toeicMockRawAvg !== null ? Math.round(toeicMockRawAvg) : null

  // Trọng số học phần: Homework 15% + Quiz/Regular 15% + Midterm 30% + Final 40% = 100%.
  // Quy tắc bất biến: đầu điểm null (Missing Grade) TUYỆT ĐỐI KHÔNG quy đổi thành 0.
  const buckets: { pct: number | null; weight: number }[] = [
    { pct: homeworkPercent, weight: 0.15 },
    { pct: quizRegularPercent, weight: 0.15 },
    { pct: midPercent, weight: 0.3 },
    { pct: finalPercent, weight: 0.4 },
  ]

  let weightedSum = 0
  let gradedWeightSum = 0
  let gradedBucketsCount = 0

  for (const bucket of buckets) {
    if (bucket.pct !== null) {
      weightedSum += bucket.pct * bucket.weight
      gradedWeightSum += bucket.weight
      gradedBucketsCount += 1
    }
  }

  const weightedAveragePercent =
    gradedWeightSum > 0 ? Math.round((weightedSum / gradedWeightSum) * 10) / 10 : null

  const completionState: GradeCompletionState =
    gradedBucketsCount === 0
      ? 'none'
      : gradedBucketsCount < buckets.length
        ? 'partial'
        : 'complete'

  const completionLabel =
    completionState === 'none'
      ? 'Chưa có điểm'
      : completionState === 'partial'
        ? 'Tạm tính (còn thiếu đầu điểm)'
        : 'Đủ đầu điểm'

  return {
    studentId: params.studentId,
    studentCode: params.studentCode,
    studentName: params.studentName,
    classId: params.classId,
    classCode: params.classCode,
    homeworkPercent,
    quizRegularPercent,
    midPercent,
    finalPercent,
    toeicMockScore,
    weightedAveragePercent,
    gradedBucketsCount,
    totalBucketsCount: buckets.length,
    completionState,
    completionLabel,
  }
}

function computeProgressForClass(
  cls: CenterClassOfferingDto,
  courseName: string,
): StudentProgressSummary[] {
  const students = getActiveStudentsInClass(cls.id)
  const teacherStore = readTeacherOpsStore()

  const classAssignments = teacherStore.assignments.filter((a) => a.classId === cls.id)
  const classAttendance = teacherStore.attendanceEntries.filter(
    (e) => e.classId === cls.id && e.status !== 'Unmarked',
  )
  const classGrades = teacherStore.grades.filter((g) => g.classId === cls.id)

  return students.map((student) => {
    const stuAtt = classAttendance.filter((a) => a.studentId === student.id)
    const markedSessionsCount = stuAtt.length
    const presentCount = stuAtt.filter((a) => a.status === 'Present').length
    const lateCount = stuAtt.filter((a) => a.status === 'Late').length
    const excusedCount = stuAtt.filter((a) => a.status === 'Excused').length
    const unexcusedCount = stuAtt.filter((a) => a.status === 'Unexcused').length
    const attendedCount = presentCount + lateCount
    const attendanceRatePercent =
      markedSessionsCount > 0 ? Math.round((attendedCount / markedSessionsCount) * 100) : null

    const targetedAssignments = classAssignments.filter((asg) => {
      if (
        (asg.targetScope === 'individual_students' || asg.targetScope === 'group') &&
        asg.targetStudentIds?.length
      ) {
        return asg.targetStudentIds.includes(student.id)
      }
      return true
    })
    const assignedCount = targetedAssignments.length
    const stuSubs = teacherStore.submissions.filter(
      (sub) =>
        sub.studentId === student.id &&
        targetedAssignments.some((a) => a.id === sub.assignmentId),
    )
    const submittedOrGradedCount = stuSubs.filter(
      (s) =>
        s.status === 'Submitted' ||
        s.status === 'LateSubmitted' ||
        s.status === 'Grading' ||
        s.status === 'Graded',
    ).length
    const missingCount = Math.max(0, assignedCount - submittedOrGradedCount)
    const assignmentCompletionPercent =
      assignedCount > 0 ? Math.round((submittedOrGradedCount / assignedCount) * 100) : null

    const stuGrades = classGrades.filter((g) => g.studentId === student.id)
    const homeworkScore = averageRawScores(stuGrades.filter((g) => g.category === 'homework'))
    const quizScore = averageRawScores(stuGrades.filter((g) => g.category === 'quiz'))
    const regularScore = averageRawScores(stuGrades.filter((g) => g.category === 'regular'))
    const processAveragePercent = averageScorePercentages(
      stuGrades.filter(
        (g) => g.category === 'homework' || g.category === 'quiz' || g.category === 'regular',
      ),
    )
    const midScore = averageRawScores(stuGrades.filter((g) => g.category === 'mid'))
    const finalScore = averageRawScores(stuGrades.filter((g) => g.category === 'final'))

    const weightedSummary = computeStudentWeightedSummary({
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      classId: cls.id,
      classCode: cls.classCode,
      studentGrades: stuGrades,
    })

    // Công thức đa tiêu chí minh bạch (không phán đoán cảm tính từ 1 chỉ số lẻ)
    const supportReasons: string[] = []
    if (attendanceRatePercent !== null && attendanceRatePercent < 80) {
      supportReasons.push(`Chuyên cần thấp (${attendanceRatePercent}% < 80%)`)
    }
    if (unexcusedCount >= 2) {
      supportReasons.push(`Vắng không phép ${unexcusedCount} buổi`)
    }
    if (assignmentCompletionPercent !== null && assignmentCompletionPercent < 70) {
      supportReasons.push(`Hoàn thành BTVN thấp (${assignmentCompletionPercent}% < 70%)`)
    }
    if (midScore !== null && midScore < student.entryScore.total) {
      supportReasons.push(
        `Điểm Giữa khóa (${midScore}) thấp hơn đầu vào (${student.entryScore.total})`,
      )
    }

    return {
      student,
      classId: cls.id,
      classCode: cls.classCode,
      courseName,
      markedSessionsCount,
      presentCount,
      lateCount,
      excusedCount,
      unexcusedCount,
      attendanceRatePercent,
      assignedCount,
      submittedOrGradedCount,
      missingCount,
      assignmentCompletionPercent,
      homeworkScore,
      quizScore,
      regularScore,
      processAveragePercent,
      midScore,
      finalScore,
      toeicMockScore: weightedSummary.toeicMockScore,
      weightedAveragePercent: weightedSummary.weightedAveragePercent,
      needsSupport: supportReasons.length > 0,
      supportReasons,
    }
  })
}

function validateAndNormalizeMaterialLinks(links: readonly string[]): string[] {
  const sanitized: string[] = []
  for (const raw of links) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const safe = toSafeHttpUrl(trimmed)
    if (!safe) {
      throw new StaffApiClientError(
        `Đường dẫn học liệu không hợp lệ (chỉ chấp nhận http/https): ${trimmed}`,
        400,
      )
    }
    sanitized.push(safe)
  }
  return sanitized
}

function validateAssignmentCommonFields(input: {
  code: string
  title: string
  instructions: string
  dueDate: string
  assignedDate: string
  maxScore: number
  isDemoTest?: boolean
  partMaxQuestions?: { lc: number; rc: number }
  attachmentUrl?: string
  targetScope: AssignmentTargetScope
  targetGroupLabel?: string
  targetStudentIds?: string[]
}): {
  normalizedAttachmentUrl: string | undefined
  normalizedTargetIds: string[] | undefined
  normalizedPartMaxQuestions: { lc: number; rc: number } | undefined
} {
  if (!input.code.trim() || !input.title.trim() || !input.instructions.trim()) {
    throw new StaffApiClientError(
      'Vui lòng nhập đầy đủ Mã bài tập, Tiêu đề và Hướng dẫn làm bài.',
      400,
    )
  }
  if (!Number.isFinite(input.maxScore) || input.maxScore <= 0) {
    throw new StaffApiClientError('Thang điểm tối đa phải lớn hơn 0.', 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
    throw new StaffApiClientError('Định dạng hạn nộp bài không hợp lệ (YYYY-MM-DD).', 400)
  }
  if (input.dueDate.trim() < input.assignedDate) {
    throw new StaffApiClientError(
      `Hạn nộp bài (${input.dueDate}) không được nhỏ hơn ngày giao bài (${input.assignedDate}).`,
      400,
    )
  }

  let normalizedPartMaxQuestions: { lc: number; rc: number } | undefined
  if (input.isDemoTest) {
    const lcMax = Math.round(Number(input.partMaxQuestions?.lc ?? 100))
    const rcMax = Math.round(Number(input.partMaxQuestions?.rc ?? 100))
    if (!Number.isFinite(lcMax) || lcMax <= 0 || !Number.isFinite(rcMax) || rcMax <= 0) {
      throw new StaffApiClientError(
        'Số câu hỏi tối đa phần Listening và Reading của Demo Test phải lớn hơn 0.',
        400,
      )
    }
    normalizedPartMaxQuestions = { lc: lcMax, rc: rcMax }
  }

  let normalizedAttachmentUrl: string | undefined
  if (input.attachmentUrl?.trim()) {
    const safe = toSafeHttpUrl(input.attachmentUrl.trim())
    if (!safe) {
      throw new StaffApiClientError(
        'Đường dẫn tài liệu đính kèm không hợp lệ (chỉ chấp nhận http/https).',
        400,
      )
    }
    normalizedAttachmentUrl = safe
  }

  if (input.targetScope === 'group' && !input.targetGroupLabel?.trim()) {
    throw new StaffApiClientError('Vui lòng nhập tên nhóm học tập trong lớp.', 400)
  }

  let normalizedTargetIds: string[] | undefined
  if (input.targetScope === 'group' || input.targetScope === 'individual_students') {
    const uniqueTargetIds = Array.from(
      new Set((input.targetStudentIds ?? []).map((id) => id.trim()).filter(Boolean)),
    )
    if (uniqueTargetIds.length === 0) {
      throw new StaffApiClientError(
        'Vui lòng chọn ít nhất 1 học viên nhận bài cho nhóm học tập hoặc kèm riêng.',
        400,
      )
    }
    normalizedTargetIds = uniqueTargetIds
  }

  return { normalizedAttachmentUrl, normalizedTargetIds, normalizedPartMaxQuestions }
}

export const teacherApi = {
  async listMyClasses(actor: TeacherActor): Promise<AssignedTeacherClassItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AssignedTeacherClassItem[]>(STAFF_API_ENDPOINTS.teacher.classes)
    }

    await mockDelay(90)
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const allClasses = readCenterClassesStore()
    const myClasses = getScopedClasses(allClasses, actor)
    const teacherStore = readTeacherOpsStore()

    return myClasses.map((cls) => {
      const activeStudents = getActiveStudentsInClass(cls.id)
      const sessionsCount = teacherStore.sessions.filter((s) => s.classId === cls.id).length
      const ungradedCount = teacherStore.submissions.filter(
        (sub) => sub.classId === cls.id && isUngradedPendingStatus(sub.status),
      ).length
      return {
        ...cls,
        enrolledStudents: activeStudents.length,
        activeEnrolledCount: activeStudents.length,
        courseName: courseMap.get(cls.courseId) ?? cls.courseId,
        branchName: branchMap.get(cls.branchId) ?? cls.branchId,
        sessionsCount,
        ungradedCount,
      }
    })
  },

  async getDashboardData(
    actor: TeacherActor,
    todayYmdVn = getTodayIsoInVietnam(),
  ): Promise<TeacherDashboardData> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<TeacherDashboardData>(STAFF_API_ENDPOINTS.teacher.dashboard, {
        today: todayYmdVn,
      })
    }

    const myClasses = await this.listMyClasses(actor)
    const myClassIds = new Set(myClasses.map((c) => c.id))
    const teacherStore = readTeacherOpsStore()

    const mySessions = teacherStore.sessions
      .filter((s) => myClassIds.has(s.classId))
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

    const todaySessions = mySessions.filter((s) => s.sessionDate === todayYmdVn)
    const upcomingSessions = mySessions.filter((s) => s.sessionDate > todayYmdVn)

    // Cảnh báo buổi học đã diễn ra / hôm nay nhưng còn học viên chưa điểm danh (Unmarked)
    const unmarkedSessions: UnmarkedSessionAlertItem[] = []
    for (const ses of mySessions) {
      if (ses.sessionDate > todayYmdVn) continue
      const activeStudents = getActiveStudentsInClass(ses.classId)
      if (activeStudents.length === 0) continue
      const unmarkedCount = activeStudents.filter((stu) => {
        const entry = teacherStore.attendanceEntries.find(
          (e) => e.sessionId === ses.id && e.studentId === stu.id,
        )
        return !entry || entry.status === 'Unmarked'
      }).length
      if (unmarkedCount > 0) {
        unmarkedSessions.push({
          ...ses,
          unmarkedCount,
          totalStudents: activeStudents.length,
        })
      }
    }

    const asgMap = new Map(teacherStore.assignments.map((a) => [a.id, a]))
    const pendingSubmissions = teacherStore.submissions
      .filter((sub) => myClassIds.has(sub.classId) && isUngradedPendingStatus(sub.status))
      .map((sub) => {
        const asg = asgMap.get(sub.assignmentId)
        return {
          ...sub,
          assignmentCode: asg?.code ?? 'HW',
          assignmentTitle: asg?.title ?? 'Bài tập lớp',
          classCode: asg?.classCode ?? '',
          dueAt: asg?.dueAt ?? '',
        }
      })

    // Bài chờ chấm quá hạn: nộp từ >= 2 ngày trước hoặc đã qua hạn nộp bài tập
    const submittedAgeThresholdYmd = shiftIsoYmd(todayYmdVn, -2)
    const overdueGradingCount = pendingSubmissions.filter((s) => {
      const agingBySubmission =
        Boolean(s.submittedAt) && toVietnamYmd(s.submittedAt!) <= submittedAgeThresholdYmd
      const pastDueDate = Boolean(s.dueAt) && toVietnamYmd(s.dueAt) < todayYmdVn
      return agingBySubmission || pastDueDate
    }).length

    const allProgress = myClasses.flatMap((cls) => computeProgressForClass(cls, cls.courseName))
    const studentsNeedingSupport = allProgress.filter((p) => p.needsSupport)

    return {
      kpis: {
        assignedClassesCount: myClasses.length,
        todaySessionsCount: todaySessions.length,
        upcomingSessionsCount: upcomingSessions.length,
        ungradedSubmissionsCount: pendingSubmissions.length,
        overdueGradingCount,
        studentsNeedingSupportCount: studentsNeedingSupport.length,
        unmarkedSessionsCount: unmarkedSessions.length,
      },
      assignedClasses: myClasses,
      todaySessions,
      upcomingSessions: upcomingSessions.slice(0, 6),
      unmarkedSessions,
      pendingSubmissions,
      studentsNeedingSupport,
    }
  },

  async getClassDetail(actor: TeacherActor, classId: string): Promise<TeacherClassDetailBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<TeacherClassDetailBundle>(
        STAFF_API_ENDPOINTS.teacher.classDetail(classId),
      )
    }

    await mockDelay(90)
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const allClasses = readCenterClassesStore()
    const found = allClasses.find((c) => c.id === classId)
    if (!found) {
      throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    }

    // Rào chắn bắt buộc: Giảng viên mở URL lớp của giảng viên khác sẽ nhận lỗi 403
    assertTeacherOwnsClass(found, actor)

    const courseName = courses.find((c) => c.id === found.courseId)?.name ?? found.courseId
    const branchName = branches.find((b) => b.id === found.branchId)?.name ?? found.branchId
    const teacherStore = readTeacherOpsStore()
    const activeStudents = getActiveStudentsInClass(classId)

    const sessions = teacherStore.sessions
      .filter((s) => s.classId === classId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber)

    const ungradedCount = teacherStore.submissions.filter(
      (sub) => sub.classId === classId && isUngradedPendingStatus(sub.status),
    ).length

    return {
      classInfo: {
        ...found,
        enrolledStudents: activeStudents.length,
        activeEnrolledCount: activeStudents.length,
        courseName,
        branchName,
        sessionsCount: sessions.length,
        ungradedCount,
      },
      students: activeStudents,
      sessions,
      teachingPlans: teacherStore.teachingPlans.filter((p) => p.classId === classId),
      assignments: teacherStore.assignments.filter((a) => a.classId === classId),
      grades: teacherStore.grades.filter((g) => g.classId === classId),
      progressRows: computeProgressForClass(found, courseName),
    }
  },

  async listTeachingPlans(
    actor: TeacherActor,
    classIdFilter?: string,
  ): Promise<SessionWithPlanItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<SessionWithPlanItem[]>(STAFF_API_ENDPOINTS.teacher.teachingPlans, {
        classId: classIdFilter && classIdFilter !== 'ALL' ? classIdFilter : undefined,
      })
    }

    const myClasses = await this.listMyClasses(actor)
    const allowedIds = new Set(myClasses.map((c) => c.id))
    if (classIdFilter && classIdFilter !== 'ALL' && !allowedIds.has(classIdFilter)) {
      throw new StaffApiClientError('Lớp học nằm ngoài phạm vi phân công giảng dạy.', 403)
    }

    const teacherStore = readTeacherOpsStore()
    const sessions = teacherStore.sessions
      .filter(
        (s) =>
          allowedIds.has(s.classId) &&
          (!classIdFilter || classIdFilter === 'ALL' || s.classId === classIdFilter),
      )
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

    return sessions.map((session) => ({
      session,
      plan: teacherStore.teachingPlans.find((p) => p.sessionId === session.id) ?? null,
    }))
  },

  async upsertTeachingPlan(
    actor: TeacherActor,
    input: {
      sessionId: string
      topicTitle: string
      lcContent: string
      rcContent: string
      learningObjectives: string
      materialLinks: string[]
      homeworkBrief?: string
      teacherNote?: string
      completionStatus: 'planned' | 'in_progress' | 'completed'
    },
  ): Promise<TeachingSessionPlanDto> {
    if (!input.topicTitle.trim() || !input.learningObjectives.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập đầy đủ Chủ đề giảng dạy và Mục tiêu buổi học.',
        400,
      )
    }
    const sanitizedLinks = validateAndNormalizeMaterialLinks(input.materialLinks)

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<TeachingSessionPlanDto>(
        STAFF_API_ENDPOINTS.teacher.teachingPlanDetail(input.sessionId),
        {
          ...input,
          topicTitle: input.topicTitle.trim(),
          lcContent: input.lcContent.trim(),
          rcContent: input.rcContent.trim(),
          learningObjectives: input.learningObjectives.trim(),
          materialLinks: sanitizedLinks,
          homeworkBrief: input.homeworkBrief?.trim() || undefined,
          teacherNote: input.teacherNote?.trim() || undefined,
        },
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const session = teacherStore.sessions.find((s) => s.id === input.sessionId)
    if (!session) throw new StaffApiClientError('Không tìm thấy buổi học trong lịch.', 404)

    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === session.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    const nowIso = new Date().toISOString()
    const existingIdx = teacherStore.teachingPlans.findIndex((p) => p.sessionId === session.id)

    const saved: TeachingSessionPlanDto = {
      id: existingIdx >= 0 ? teacherStore.teachingPlans[existingIdx]!.id : createUniqueId('tpl'),
      sessionId: session.id,
      classId: session.classId,
      teacherId: actor.userId,
      topicTitle: input.topicTitle.trim(),
      lcContent: input.lcContent.trim(),
      rcContent: input.rcContent.trim(),
      learningObjectives: input.learningObjectives.trim(),
      materialLinks: sanitizedLinks,
      homeworkBrief: input.homeworkBrief?.trim() || undefined,
      teacherNote: input.teacherNote?.trim() || undefined,
      completionStatus: input.completionStatus,
      updatedAt: nowIso,
    }

    const nextPlans = [...teacherStore.teachingPlans]
    if (existingIdx >= 0) {
      nextPlans[existingIdx] = saved
    } else {
      nextPlans.unshift(saved)
    }

    writeTeacherOpsStore({ ...teacherStore, teachingPlans: nextPlans })
    return saved
  },

  async getAttendanceSheet(
    actor: TeacherActor,
    sessionId: string,
    todayYmdVn = getTodayIsoInVietnam(),
  ): Promise<AttendanceSheetBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AttendanceSheetBundle>(
        STAFF_API_ENDPOINTS.teacher.attendanceSheet(sessionId),
        { today: todayYmdVn },
      )
    }

    await mockDelay(80)
    const teacherStore = readTeacherOpsStore()
    const session = teacherStore.sessions.find((s) => s.id === sessionId)
    if (!session) throw new StaffApiClientError('Không tìm thấy buổi học.', 404)

    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === session.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    const students = getActiveStudentsInClass(cls.id)
    const rows = students.map((student) => {
      const entry =
        teacherStore.attendanceEntries.find(
          (e) => e.sessionId === session.id && e.studentId === student.id,
        ) ?? null
      return {
        student,
        entry,
        // Tuyệt đối không mặc định Có mặt khi chưa điểm danh!
        effectiveStatus: entry?.status ?? 'Unmarked',
      }
    })

    return {
      session,
      isFutureSession: session.sessionDate > todayYmdVn,
      rows,
      auditLogs: teacherStore.attendanceAuditLogs
        .filter((l) => l.sessionId === session.id)
        .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    }
  },

  async saveSessionAttendance(
    actor: TeacherActor,
    input: {
      sessionId: string
      todayYmdVn: string
      entries: {
        studentId: string
        status: Exclude<TeacherAttendanceStatus, 'Unmarked'>
        note?: string
      }[]
      editReason?: string
    },
  ): Promise<void> {
    if (!USE_STAFF_MOCK_API) {
      await staffHttpClient.post<void>(STAFF_API_ENDPOINTS.teacher.attendance, input)
      return
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const session = teacherStore.sessions.find((s) => s.id === input.sessionId)
    if (!session) throw new StaffApiClientError('Không tìm thấy buổi học.', 404)

    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === session.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    if (session.sessionDate > input.todayYmdVn) {
      throw new StaffApiClientError(
        `Buổi ${session.sessionNumber} (${session.sessionDate}) chưa diễn ra — hệ thống chặn điểm danh hoàn tất trước ngày học.`,
        400,
      )
    }

    const students = getActiveStudentsInClass(cls.id)
    const studentMap = new Map(students.map((s) => [s.id, s]))

    for (const item of input.entries) {
      if (!studentMap.has(item.studentId)) {
        throw new StaffApiClientError(
          `Học viên (${item.studentId}) không thuộc danh sách đang theo học của lớp ${cls.classCode}.`,
          400,
        )
      }
    }

    const trimmedReason = input.editReason?.trim() ?? ''
    const hasStatusModification = input.entries.some((item) => {
      const prev = teacherStore.attendanceEntries.find(
        (e) => e.sessionId === session.id && e.studentId === item.studentId,
      )
      return Boolean(prev && prev.status !== 'Unmarked' && prev.status !== item.status)
    })

    if (hasStatusModification && !trimmedReason) {
      throw new StaffApiClientError(
        'Vui lòng nhập lý do chỉnh sửa khi thay đổi trạng thái điểm danh của học viên đã được đánh dấu.',
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const nextEntries = [...teacherStore.attendanceEntries]
    const nextAudits: AttendanceAuditEntryDto[] = [...teacherStore.attendanceAuditLogs]

    for (const item of input.entries) {
      const nextNote = item.note?.trim() || undefined
      const existingIdx = nextEntries.findIndex(
        (e) => e.sessionId === session.id && e.studentId === item.studentId,
      )
      if (existingIdx >= 0) {
        const prev = nextEntries[existingIdx]!
        const prevNote = prev.note?.trim() || undefined
        const statusChanged = prev.status !== 'Unmarked' && prev.status !== item.status
        const noteChanged = prev.status !== 'Unmarked' && prevNote !== nextNote

        if (statusChanged || noteChanged) {
          const noteChangeDetail = noteChanged
            ? `Ghi chú: "${prevNote ?? 'Trống'}" → "${nextNote ?? 'Trống'}"`
            : ''
          const auditReason = statusChanged
            ? noteChangeDetail
              ? `${trimmedReason} (${noteChangeDetail})`
              : trimmedReason
            : trimmedReason
              ? `${trimmedReason} (${noteChangeDetail})`
              : noteChangeDetail

          nextAudits.unshift({
            id: createUniqueId('ata'),
            sessionId: session.id,
            classId: cls.id,
            studentId: item.studentId,
            studentName: studentMap.get(item.studentId)?.fullName ?? item.studentId,
            previousStatus: prev.status,
            nextStatus: item.status,
            changedByName: actor.fullName,
            changedAt: nowIso,
            reason: auditReason,
          })
        }
        nextEntries[existingIdx] = {
          ...prev,
          status: item.status,
          note: nextNote,
          recordedByTeacherId: actor.userId,
          recordedByTeacherName: actor.fullName,
          updatedAt: nowIso,
        }
      } else {
        const createdEntry: TeacherAttendanceEntryDto = {
          id: createUniqueId('att'),
          sessionId: session.id,
          classId: cls.id,
          studentId: item.studentId,
          status: item.status,
          note: nextNote,
          recordedByTeacherId: actor.userId,
          recordedByTeacherName: actor.fullName,
          updatedAt: nowIso,
        }
        nextEntries.push(createdEntry)
      }
    }

    writeTeacherOpsStore({
      ...teacherStore,
      attendanceEntries: nextEntries,
      attendanceAuditLogs: nextAudits,
    })
  },

  async listAssignments(
    actor: TeacherActor,
    classIdFilter?: string,
  ): Promise<AssignmentWithSubmissionsItem[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<AssignmentWithSubmissionsItem[]>(
        STAFF_API_ENDPOINTS.teacher.assignments,
        {
          classId: classIdFilter && classIdFilter !== 'ALL' ? classIdFilter : undefined,
        },
      )
    }

    const myClasses = await this.listMyClasses(actor)
    const allowedIds = new Set(myClasses.map((c) => c.id))
    if (classIdFilter && classIdFilter !== 'ALL' && !allowedIds.has(classIdFilter)) {
      throw new StaffApiClientError('Lớp học nằm ngoài phạm vi phân công giảng dạy.', 403)
    }

    const teacherStore = readTeacherOpsStore()

    const filteredAssignments = teacherStore.assignments
      .filter(
        (a) =>
          allowedIds.has(a.classId) &&
          (!classIdFilter || classIdFilter === 'ALL' || a.classId === classIdFilter),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return filteredAssignments.map((assignment) => {
      const submissions = teacherStore.submissions.filter(
        (s) => s.assignmentId === assignment.id,
      )
      const submittedCount = submissions.filter((s) => s.status !== 'NotSubmitted').length
      const gradedCount = submissions.filter((s) => s.status === 'Graded').length
      return {
        assignment,
        submissions,
        submittedCount,
        gradedCount,
      }
    })
  },

  async createAssignment(
    actor: TeacherActor,
    input: CreateTeacherAssignmentInput,
  ): Promise<TeacherAssignmentRecordDto> {
    const nowIso = new Date().toISOString()
    const assignedDate = toVietnamYmd(nowIso)

    const { normalizedAttachmentUrl, normalizedTargetIds, normalizedPartMaxQuestions } =
      validateAssignmentCommonFields({
        code: input.code,
        title: input.title,
        instructions: input.instructions,
        dueDate: input.dueDate,
        assignedDate,
        maxScore: input.maxScore,
        isDemoTest: input.isDemoTest,
        partMaxQuestions: input.partMaxQuestions,
        attachmentUrl: input.attachmentUrl,
        targetScope: input.targetScope,
        targetGroupLabel: input.targetGroupLabel,
        targetStudentIds: input.targetStudentIds,
      })

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeacherAssignmentRecordDto>(
        STAFF_API_ENDPOINTS.teacher.assignments,
        {
          ...input,
          code: input.code.trim().toUpperCase(),
          title: input.title.trim(),
          instructions: input.instructions.trim(),
          attachmentUrl: normalizedAttachmentUrl,
          dueDate: input.dueDate.trim(),
          isDemoTest: Boolean(input.isDemoTest) || undefined,
          partMaxQuestions: normalizedPartMaxQuestions,
          targetGroupLabel:
            input.targetScope === 'group' ? input.targetGroupLabel?.trim() : undefined,
          targetStudentIds: normalizedTargetIds,
        },
      )
    }

    await mockDelay()
    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === input.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    const teacherStore = readTeacherOpsStore()
    const session = teacherStore.sessions.find((s) => s.id === input.sessionId)
    if (!session) {
      throw new StaffApiClientError('Vui lòng chọn buổi học hợp lệ của lớp để giao bài tập.', 400)
    }
    if (session.classId !== cls.id) {
      throw new StaffApiClientError(
        `Buổi học được chọn không thuộc lớp ${cls.classCode}.`,
        400,
      )
    }

    const classStudents = getActiveStudentsInClass(cls.id)
    const classStudentMap = new Map(classStudents.map((s) => [s.id, s]))

    if (normalizedTargetIds) {
      for (const sid of normalizedTargetIds) {
        if (!classStudentMap.has(sid)) {
          throw new StaffApiClientError(
            `Học viên được chọn (${sid}) không thuộc lớp ${cls.classCode}.`,
            400,
          )
        }
      }
    }

    const created: TeacherAssignmentRecordDto = {
      id: createUniqueId('asg'),
      code: input.code.trim().toUpperCase(),
      classId: cls.id,
      classCode: cls.classCode,
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      attachmentUrl: normalizedAttachmentUrl,
      assignedDate,
      dueAt: `${input.dueDate.trim()}T23:59:00+07:00`,
      submissionFormat: input.submissionFormat,
      maxScore: input.maxScore,
      isDemoTest: Boolean(input.isDemoTest) || undefined,
      partMaxQuestions: normalizedPartMaxQuestions,
      targetScope: input.targetScope,
      targetGroupLabel:
        input.targetScope === 'group' ? input.targetGroupLabel?.trim() || undefined : undefined,
      targetStudentIds: normalizedTargetIds,
      status: 'open',
      createdByTeacherId: actor.userId,
      createdByTeacherName: actor.fullName,
      createdAt: nowIso,
    }

    const targetStudents = normalizedTargetIds
      ? classStudents.filter((s) => normalizedTargetIds.includes(s.id))
      : classStudents

    const initialSubs: TeacherSubmissionRecordDto[] = targetStudents.map((stu) => ({
      id: createUniqueId('sub'),
      assignmentId: created.id,
      classId: cls.id,
      studentId: stu.id,
      studentCode: stu.studentCode,
      studentName: stu.fullName,
      status: 'NotSubmitted',
      score: null,
    }))

    writeTeacherOpsStore({
      ...teacherStore,
      assignments: [created, ...teacherStore.assignments],
      submissions: [...initialSubs, ...teacherStore.submissions],
    })

    return created
  },

  async updateAssignment(
    actor: TeacherActor,
    input: UpdateTeacherAssignmentInput,
  ): Promise<TeacherAssignmentRecordDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.put<TeacherAssignmentRecordDto>(
        STAFF_API_ENDPOINTS.teacher.assignmentDetail(input.assignmentId),
        input,
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const idx = teacherStore.assignments.findIndex((a) => a.id === input.assignmentId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy bài tập.', 404)

    const existing = teacherStore.assignments[idx]!
    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === existing.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    if (existing.status === 'closed') {
      throw new StaffApiClientError(
        'Bài tập này đã đóng, không thể chỉnh sửa thông tin giao bài.',
        400,
      )
    }

    const { normalizedAttachmentUrl, normalizedTargetIds, normalizedPartMaxQuestions } =
      validateAssignmentCommonFields({
        code: input.code,
        title: input.title,
        instructions: input.instructions,
        dueDate: input.dueDate,
        assignedDate: existing.assignedDate,
        maxScore: input.maxScore,
        isDemoTest: input.isDemoTest,
        partMaxQuestions: input.partMaxQuestions,
        attachmentUrl: input.attachmentUrl,
        targetScope: input.targetScope,
        targetGroupLabel: input.targetGroupLabel,
        targetStudentIds: input.targetStudentIds,
      })

    const session = teacherStore.sessions.find((s) => s.id === input.sessionId)
    if (!session) {
      throw new StaffApiClientError('Không tìm thấy buổi học được chọn.', 400)
    }
    if (session.classId !== cls.id) {
      throw new StaffApiClientError(
        `Buổi học được chọn không thuộc lớp ${cls.classCode}.`,
        400,
      )
    }

    const existingSubs = teacherStore.submissions.filter((s) => s.assignmentId === existing.id)
    const exceedsNewMax = existingSubs.some(
      (s) => s.score !== null && s.score > input.maxScore,
    )
    if (exceedsNewMax) {
      throw new StaffApiClientError(
        'Thang điểm tối đa mới nhỏ hơn điểm số đã chấm cho học viên. Vui lòng kiểm tra lại.',
        400,
      )
    }

    const classStudents = getActiveStudentsInClass(cls.id)
    const classStudentMap = new Map(classStudents.map((s) => [s.id, s]))
    if (normalizedTargetIds) {
      for (const sid of normalizedTargetIds) {
        if (!classStudentMap.has(sid)) {
          throw new StaffApiClientError(
            `Học viên được chọn (${sid}) không thuộc lớp ${cls.classCode}.`,
            400,
          )
        }
      }
    }

    const updated: TeacherAssignmentRecordDto = {
      ...existing,
      code: input.code.trim().toUpperCase(),
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      attachmentUrl: normalizedAttachmentUrl,
      dueAt: `${input.dueDate.trim()}T23:59:00+07:00`,
      submissionFormat: input.submissionFormat,
      maxScore: input.maxScore,
      isDemoTest: Boolean(input.isDemoTest) || undefined,
      partMaxQuestions: normalizedPartMaxQuestions,
      targetScope: input.targetScope,
      targetGroupLabel:
        input.targetScope === 'group' ? input.targetGroupLabel?.trim() || undefined : undefined,
      targetStudentIds: normalizedTargetIds,
    }

    // Đồng bộ danh sách bài nộp theo đối tượng mới (giữ nguyên mọi bài đã nộp/chấm)
    const targetStudentSet = new Set(
      normalizedTargetIds ?? classStudents.map((s) => s.id),
    )
    const filteredOtherOrSubmitted = teacherStore.submissions.filter((sub) => {
      if (sub.assignmentId !== existing.id) return true
      if (targetStudentSet.has(sub.studentId)) return true
      return sub.status !== 'NotSubmitted'
    })

    const existingSubStudentIds = new Set(
      filteredOtherOrSubmitted
        .filter((s) => s.assignmentId === existing.id)
        .map((s) => s.studentId),
    )

    const addedSubs: TeacherSubmissionRecordDto[] = classStudents
      .filter((s) => targetStudentSet.has(s.id) && !existingSubStudentIds.has(s.id))
      .map((stu) => ({
        id: createUniqueId('sub'),
        assignmentId: existing.id,
        classId: cls.id,
        studentId: stu.id,
        studentCode: stu.studentCode,
        studentName: stu.fullName,
        status: 'NotSubmitted',
        score: null,
      }))

    const nextAssignments = [...teacherStore.assignments]
    nextAssignments[idx] = updated

    writeTeacherOpsStore({
      ...teacherStore,
      assignments: nextAssignments,
      submissions: [...addedSubs, ...filteredOtherOrSubmitted],
    })

    return updated
  },

  async closeAssignment(
    actor: TeacherActor,
    input: { assignmentId: string; reason?: string },
  ): Promise<TeacherAssignmentRecordDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeacherAssignmentRecordDto>(
        STAFF_API_ENDPOINTS.teacher.assignmentClose(input.assignmentId),
        { reason: input.reason?.trim() || undefined },
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const idx = teacherStore.assignments.findIndex((a) => a.id === input.assignmentId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy bài tập.', 404)

    const existing = teacherStore.assignments[idx]!
    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === existing.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    if (existing.status === 'closed') {
      throw new StaffApiClientError('Bài tập này đã ở trạng thái đóng.', 400)
    }

    const updated: TeacherAssignmentRecordDto = {
      ...existing,
      status: 'closed',
      closedAt: new Date().toISOString(),
    }

    const nextAssignments = [...teacherStore.assignments]
    nextAssignments[idx] = updated

    writeTeacherOpsStore({
      ...teacherStore,
      assignments: nextAssignments,
    })

    return updated
  },

  async gradeSubmission(
    actor: TeacherActor,
    input: {
      submissionId: string
      decision: 'Graded' | 'ReturnedForRevision'
      score: number | null
      evaluationOutcome?: 'passed' | 'failed'
      demoScores?: {
        lcScore: number
        rcScore: number
        totalScore: number
        isConfirmedByTeacher: boolean
      }
      teacherFeedback: string
    },
  ): Promise<TeacherSubmissionRecordDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeacherSubmissionRecordDto>(
        STAFF_API_ENDPOINTS.teacher.submissionGrade(input.submissionId),
        input,
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const subIdx = teacherStore.submissions.findIndex((s) => s.id === input.submissionId)
    if (subIdx === -1) throw new StaffApiClientError('Không tìm thấy bài nộp học viên.', 404)

    const sub = teacherStore.submissions[subIdx]!
    const asg = teacherStore.assignments.find((a) => a.id === sub.assignmentId)
    if (!asg) throw new StaffApiClientError('Không tìm thấy bài tập gốc.', 404)

    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === asg.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    if (sub.status === 'NotSubmitted') {
      throw new StaffApiClientError('Học viên chưa nộp bài, không thể chấm điểm.', 400)
    }
    if (asg.status === 'closed' && input.decision === 'ReturnedForRevision') {
      throw new StaffApiClientError(
        'Bài tập đã đóng nhận bài, không thể yêu cầu học viên nộp lại.',
        400,
      )
    }

    let normalizedDemoScores = sub.demoScores

    if (input.decision === 'Graded') {
      if (
        input.score === null ||
        !Number.isFinite(input.score) ||
        input.score < 0 ||
        input.score > asg.maxScore
      ) {
        throw new StaffApiClientError(
          `Điểm chấm phải nằm trong khoảng từ 0 đến ${asg.maxScore}.`,
          400,
        )
      }
      if (asg.isDemoTest && input.demoScores) {
        const { lcScore, rcScore, isConfirmedByTeacher } = input.demoScores
        if (
          !Number.isFinite(lcScore) ||
          lcScore < 0 ||
          lcScore > 495 ||
          !Number.isFinite(rcScore) ||
          rcScore < 0 ||
          rcScore > 495
        ) {
          throw new StaffApiClientError(
            'Điểm quy đổi Demo Test (LC / RC) phải nằm trong khoảng 0 đến 495.',
            400,
          )
        }
        normalizedDemoScores = {
          lcScore,
          rcScore,
          totalScore: lcScore + rcScore,
          isConfirmedByTeacher,
        }
      }
    } else if (!input.teacherFeedback.trim()) {
      throw new StaffApiClientError(
        'Vui lòng ghi rõ nhận xét hướng dẫn khi yêu cầu học viên nộp lại bài.',
        400,
      )
    }

    const nowIso = new Date().toISOString()
    const nextScore = input.decision === 'Graded' ? input.score : null

    const updated: TeacherSubmissionRecordDto = {
      ...sub,
      status: input.decision,
      score: nextScore,
      evaluationOutcome: input.decision === 'Graded' ? input.evaluationOutcome : undefined,
      demoScores: input.decision === 'Graded' ? normalizedDemoScores : sub.demoScores,
      teacherFeedback: input.teacherFeedback.trim() || undefined,
      gradedByTeacherId: actor.userId,
      gradedByTeacherName: actor.fullName,
      gradedAt: nowIso,
    }

    const nextGradeAudits: GradeAuditEntryDto[] = [...teacherStore.gradeAuditLogs]
    if ((sub.status === 'Graded' || sub.score !== null) && sub.score !== nextScore) {
      nextGradeAudits.unshift({
        id: createUniqueId('ga'),
        gradeId: sub.id,
        classId: cls.id,
        studentName: sub.studentName,
        assessmentTitle: `[Bài tập ${asg.code}] ${asg.title}`,
        previousTotal: sub.score,
        nextTotal: nextScore,
        changedByName: actor.fullName,
        changedAt: nowIso,
        note:
          input.teacherFeedback.trim() ||
          (input.decision === 'ReturnedForRevision'
            ? 'Yêu cầu học viên sửa và nộp lại bài'
            : 'Chấm lại điểm bài tập lớp'),
      })
    }

    const nextSubs = [...teacherStore.submissions]
    nextSubs[subIdx] = updated
    writeTeacherOpsStore({
      ...teacherStore,
      submissions: nextSubs,
      gradeAuditLogs: nextGradeAudits,
    })
    return updated
  },

  async getGradebook(
    actor: TeacherActor,
    filters: { classId: string; category: 'ALL' | AssessmentCategory },
  ): Promise<GradebookBundle> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<GradebookBundle>(STAFF_API_ENDPOINTS.teacher.grades, {
        classId: filters.classId !== 'ALL' ? filters.classId : undefined,
        category: filters.category !== 'ALL' ? filters.category : undefined,
      })
    }

    const myClasses = await this.listMyClasses(actor)
    const allowedIds = new Set(myClasses.map((c) => c.id))
    if (filters.classId !== 'ALL' && !allowedIds.has(filters.classId)) {
      throw new StaffApiClientError('Lớp học nằm ngoài phạm vi phân công giảng dạy.', 403)
    }

    const teacherStore = readTeacherOpsStore()

    const grades = teacherStore.grades.filter((g) => {
      if (!allowedIds.has(g.classId)) return false
      if (filters.classId !== 'ALL' && g.classId !== filters.classId) return false
      if (filters.category !== 'ALL' && g.category !== filters.category) return false
      return true
    })

    const targetClasses =
      filters.classId !== 'ALL'
        ? myClasses.filter((c) => c.id === filters.classId)
        : myClasses

    const studentSummaries: StudentWeightedGradeSummary[] = targetClasses.flatMap((cls) => {
      const students = getActiveStudentsInClass(cls.id)
      const classGrades = teacherStore.grades.filter((g) => g.classId === cls.id)
      return students.map((stu) =>
        computeStudentWeightedSummary({
          studentId: stu.id,
          studentCode: stu.studentCode,
          studentName: stu.fullName,
          classId: cls.id,
          classCode: cls.classCode,
          studentGrades: classGrades.filter((g) => g.studentId === stu.id),
        }),
      )
    })

    const auditLogs = teacherStore.gradeAuditLogs
      .filter((l) => {
        if (!allowedIds.has(l.classId)) return false
        if (filters.classId !== 'ALL' && l.classId !== filters.classId) return false
        return true
      })
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))

    return {
      grades,
      studentSummaries,
      auditLogs,
    }
  },

  async upsertAssessmentGrade(
    actor: TeacherActor,
    input: {
      id?: string
      classId: string
      studentId: string
      category: AssessmentCategory
      assessmentTitle: string
      examDate: string
      maxListeningScore: number
      maxReadingScore: number
      listeningScore: number | null
      readingScore: number | null
      partBreakdown?: ToeicExamPartBreakdownDto
      teacherComment?: string
      changeReason?: string
    },
  ): Promise<StudentAssessmentGradeDto> {
    if (!input.assessmentTitle.trim()) {
      throw new StaffApiClientError('Vui lòng nhập tên bài kiểm tra.', 400)
    }
    if (
      !Number.isFinite(input.maxListeningScore) ||
      input.maxListeningScore <= 0 ||
      !Number.isFinite(input.maxReadingScore) ||
      input.maxReadingScore <= 0
    ) {
      throw new StaffApiClientError(
        'Thang điểm tối đa của Listening và Reading phải lớn hơn 0.',
        400,
      )
    }

    if (
      (input.listeningScore === null && input.readingScore !== null) ||
      (input.listeningScore !== null && input.readingScore === null)
    ) {
      throw new StaffApiClientError(
        'Vui lòng nhập đủ cả điểm Listening và Reading, hoặc bỏ chọn đã chấm để lưu trạng thái Chưa đánh giá.',
        400,
      )
    }

    const validatePart = (val: number | null, maxVal: number, label: string) => {
      if (val === null) return
      if (!Number.isFinite(val) || val < 0 || val > maxVal) {
        throw new StaffApiClientError(
          `Điểm ${label} (${val}) phải nằm trong thang từ 0 đến ${maxVal}.`,
          400,
        )
      }
    }

    validatePart(input.listeningScore, input.maxListeningScore, 'Listening')
    validatePart(input.readingScore, input.maxReadingScore, 'Reading')

    let normalizedBreakdown: ToeicExamPartBreakdownDto | undefined
    if (
      input.partBreakdown &&
      (input.category === 'mid' || input.category === 'final') &&
      input.listeningScore !== null &&
      input.readingScore !== null
    ) {
      const cleaned = {} as ToeicExamPartBreakdownDto
      for (const key of TOEIC_EXAM_PART_KEYS) {
        const partItem = input.partBreakdown[key]
        if (
          !partItem ||
          !Number.isFinite(partItem.correct) ||
          !Number.isFinite(partItem.total) ||
          partItem.total <= 0 ||
          partItem.correct < 0 ||
          partItem.correct > partItem.total
        ) {
          throw new StaffApiClientError(
            `Số câu đúng phần ${key.toUpperCase()} không hợp lệ (phải từ 0 đến tổng số câu).`,
            400,
          )
        }
        cleaned[key] = {
          correct: Math.round(partItem.correct),
          total: Math.round(partItem.total),
        }
      }
      normalizedBreakdown = cleaned
    }

    if (input.id && !input.changeReason?.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập lý do điều chỉnh điểm khi cập nhật bản ghi điểm hiện có.',
        400,
      )
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<StudentAssessmentGradeDto>(
          STAFF_API_ENDPOINTS.teacher.gradeDetail(input.id),
          input,
        )
      }
      return staffHttpClient.post<StudentAssessmentGradeDto>(
        STAFF_API_ENDPOINTS.teacher.grades,
        input,
      )
    }

    await mockDelay()
    const allClasses = readCenterClassesStore()
    const cls = allClasses.find((c) => c.id === input.classId)
    if (!cls) throw new StaffApiClientError('Không tìm thấy lớp học.', 404)
    assertTeacherOwnsClass(cls, actor)

    const students = getActiveStudentsInClass(cls.id)
    const student = students.find((s) => s.id === input.studentId)
    if (!student) {
      throw new StaffApiClientError('Học viên không thuộc danh sách lớp được phân công.', 400)
    }

    const totalScore =
      input.listeningScore === null || input.readingScore === null
        ? null
        : input.listeningScore + input.readingScore
    const maxTotalScore = input.maxListeningScore + input.maxReadingScore
    const nowIso = new Date().toISOString()

    const teacherStore = readTeacherOpsStore()
    const nextGrades = [...teacherStore.grades]
    const nextAudits: GradeAuditEntryDto[] = [...teacherStore.gradeAuditLogs]

    if (input.id) {
      const idx = nextGrades.findIndex((g) => g.id === input.id)
      if (idx === -1) throw new StaffApiClientError('Không tìm thấy bản ghi điểm.', 404)
      const prev = nextGrades[idx]!

      // Rào chắn bảo mật P0: Kiểm tra quyền sở hữu trên lớp gốc của bản ghi điểm trước khi ghi đè
      const prevClass = allClasses.find((c) => c.id === prev.classId)
      if (!prevClass) throw new StaffApiClientError('Không tìm thấy lớp học của bản ghi điểm.', 404)
      assertTeacherOwnsClass(prevClass, actor)

      if (prev.classId !== cls.id || prev.studentId !== student.id) {
        throw new StaffApiClientError(
          'Không được phép thay đổi lớp học hoặc học viên của bản ghi điểm hiện có.',
          400,
        )
      }

      if (input.category === 'mid' || input.category === 'final') {
        const duplicateMajor = nextGrades.some(
          (g) =>
            g.id !== prev.id &&
            g.classId === cls.id &&
            g.studentId === student.id &&
            g.category === input.category,
        )
        if (duplicateMajor) {
          throw new StaffApiClientError(
            `Học viên ${student.fullName} đã có bản ghi điểm ${input.category === 'mid' ? 'Giữa khóa' : 'Cuối khóa'} ở lớp ${cls.classCode}.`,
            409,
          )
        }
      }

      const scoreChanged =
        prev.listeningScore !== input.listeningScore ||
        prev.readingScore !== input.readingScore ||
        prev.totalScore !== totalScore

      if (scoreChanged) {
        const reasonText = input.changeReason!.trim()
        const skillDetail =
          prev.listeningScore !== input.listeningScore || prev.readingScore !== input.readingScore
            ? ` (LC: ${prev.listeningScore ?? 'Chưa ĐG'} → ${input.listeningScore ?? 'Chưa ĐG'}, RC: ${prev.readingScore ?? 'Chưa ĐG'} → ${input.readingScore ?? 'Chưa ĐG'})`
            : ''
        nextAudits.unshift({
          id: createUniqueId('ga'),
          gradeId: prev.id,
          classId: cls.id,
          studentName: student.fullName,
          assessmentTitle: input.assessmentTitle.trim(),
          previousTotal: prev.totalScore,
          nextTotal: totalScore,
          changedByName: actor.fullName,
          changedAt: nowIso,
          note: `${reasonText}${skillDetail}`,
        })
      }

      const updated: StudentAssessmentGradeDto = {
        ...prev,
        category: input.category,
        assessmentTitle: input.assessmentTitle.trim(),
        examDate: input.examDate,
        maxListeningScore: input.maxListeningScore,
        maxReadingScore: input.maxReadingScore,
        maxTotalScore,
        listeningScore: input.listeningScore,
        readingScore: input.readingScore,
        totalScore,
        partBreakdown: normalizedBreakdown,
        teacherComment: input.teacherComment?.trim() || undefined,
        updatedByTeacherId: actor.userId,
        updatedByTeacherName: actor.fullName,
        updatedAt: nowIso,
      }
      nextGrades[idx] = updated
      writeTeacherOpsStore({
        ...teacherStore,
        grades: nextGrades,
        gradeAuditLogs: nextAudits,
      })
      return updated
    }

    if (input.category === 'mid' || input.category === 'final') {
      const existingMajor = nextGrades.find(
        (g) =>
          g.classId === cls.id &&
          g.studentId === student.id &&
          g.category === input.category,
      )
      if (existingMajor) {
        throw new StaffApiClientError(
          `Học viên ${student.fullName} đã có bản ghi điểm ${input.category === 'mid' ? 'Giữa khóa (Midterm)' : 'Cuối khóa (Final)'} ở lớp ${cls.classCode}. Vui lòng chọn "Sửa điểm" trên bản ghi hiện có.`,
          409,
        )
      }
    }

    const created: StudentAssessmentGradeDto = {
      id: createUniqueId('grd'),
      classId: cls.id,
      classCode: cls.classCode,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      category: input.category,
      assessmentTitle: input.assessmentTitle.trim(),
      examDate: input.examDate,
      maxListeningScore: input.maxListeningScore,
      maxReadingScore: input.maxReadingScore,
      maxTotalScore,
      listeningScore: input.listeningScore,
      readingScore: input.readingScore,
      totalScore,
      partBreakdown: normalizedBreakdown,
      teacherComment: input.teacherComment?.trim() || undefined,
      updatedByTeacherId: actor.userId,
      updatedByTeacherName: actor.fullName,
      updatedAt: nowIso,
    }

    writeTeacherOpsStore({
      ...teacherStore,
      grades: [created, ...nextGrades],
    })
    return created
  },

  async listStudentProgress(
    actor: TeacherActor,
    classIdFilter?: string,
  ): Promise<StudentProgressSummary[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<StudentProgressSummary[]>(STAFF_API_ENDPOINTS.teacher.progress, {
        classId: classIdFilter && classIdFilter !== 'ALL' ? classIdFilter : undefined,
      })
    }

    const myClasses = await this.listMyClasses(actor)
    const allowedIds = new Set(myClasses.map((c) => c.id))
    if (classIdFilter && classIdFilter !== 'ALL' && !allowedIds.has(classIdFilter)) {
      throw new StaffApiClientError('Lớp học nằm ngoài phạm vi phân công giảng dạy.', 403)
    }

    const scoped =
      classIdFilter && classIdFilter !== 'ALL'
        ? myClasses.filter((c) => c.id === classIdFilter)
        : myClasses
    return scoped.flatMap((cls) => computeProgressForClass(cls, cls.courseName))
  },

  async getScheduleWorkspace(actor: TeacherActor): Promise<{
    mySessions: ClassScheduleSessionDto[]
    openClassesNeedingTeacher: OpenClassForTeachingItem[]
    myRequests: TeachingScheduleRequestDto[]
  }> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<{
        mySessions: ClassScheduleSessionDto[]
        openClassesNeedingTeacher: OpenClassForTeachingItem[]
        myRequests: TeachingScheduleRequestDto[]
      }>(STAFF_API_ENDPOINTS.teacher.schedule)
    }

    const [courses, branches, myClasses] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
      this.listMyClasses(actor),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const allClasses = readCenterClassesStore()
    const teacherStore = readTeacherOpsStore()
    const myClassIds = new Set(myClasses.map((c) => c.id))

    const mySessions = teacherStore.sessions
      .filter((s) => myClassIds.has(s.classId))
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

    const myRequests = teacherStore.teachingRequests
      .filter((r) => r.teacherId === actor.userId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

    const activeMyClasses = myClasses.filter(
      (c) => c.status !== 'completed' && c.status !== 'cancelled',
    )

    const openClassesNeedingTeacher: OpenClassForTeachingItem[] = allClasses
      .filter(
        (c) =>
          !c.teacherId &&
          (c.status === 'open' || c.status === 'upcoming'),
      )
      .map((cls) => {
        const conflict = checkClassScheduleConflict(cls, activeMyClasses)
        const existingRequest =
          myRequests.find(
            (r) =>
              r.classId === cls.id &&
              r.status !== 'Cancelled' &&
              r.status !== 'Rejected',
          ) ?? null
        return {
          ...cls,
          courseName: courseMap.get(cls.courseId) ?? cls.courseId,
          branchName: branchMap.get(cls.branchId) ?? cls.branchId,
          conflictClassCode: conflict?.classCode ?? null,
          existingRequest,
        }
      })

    return {
      mySessions,
      openClassesNeedingTeacher,
      myRequests,
    }
  },

  /**
   * Giảng viên KHÔNG tự phân công mình vào lớp.
   * Thao tác chỉ gửi yêu cầu trạng thái 'Requested' chờ Giáo vụ phê duyệt tại /academic/classes.
   */
  async submitTeachingRequest(
    actor: TeacherActor,
    input: { classId: string; note: string },
  ): Promise<TeachingScheduleRequestDto> {
    if (!input.note.trim()) {
      throw new StaffApiClientError('Vui lòng ghi rõ lý do / khả năng đáp ứng ca dạy.', 400)
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeachingScheduleRequestDto>(
        STAFF_API_ENDPOINTS.teacher.teachingRequests,
        {
          classId: input.classId,
          note: input.note.trim(),
        },
      )
    }

    const workspace = await this.getScheduleWorkspace(actor)
    const target = workspace.openClassesNeedingTeacher.find((c) => c.id === input.classId)
    if (!target) {
      throw new StaffApiClientError(
        'Lớp học không còn trong danh sách chờ phân công giảng viên.',
        404,
      )
    }
    if (target.conflictClassCode) {
      throw new StaffApiClientError(
        `Không thể gửi nguyện vọng vì trùng ca dạy với lớp đang phụ trách ${target.conflictClassCode}.`,
        409,
      )
    }
    if (target.existingRequest) {
      throw new StaffApiClientError(
        `Bạn đã gửi nguyện vọng ${target.existingRequest.requestCode} cho lớp này.`,
        409,
      )
    }

    const teacherStore = readTeacherOpsStore()
    const seq = String(teacherStore.teachingRequests.length + 1).padStart(3, '0')
    const created: TeachingScheduleRequestDto = {
      id: createUniqueId('trq'),
      requestCode: `TRQ-${getTodayIsoInVietnam().slice(0, 4)}-${seq}`,
      classId: target.id,
      classCode: target.classCode,
      className: target.className,
      courseId: target.courseId,
      courseName: target.courseName,
      branchId: target.branchId,
      branchName: target.branchName,
      studyDays: target.studyDays,
      startTime: target.startTime,
      endTime: target.endTime,
      startDate: target.startDate,
      teacherId: actor.userId,
      teacherCode: actor.employeeCode,
      teacherName: actor.fullName,
      note: input.note.trim(),
      status: 'Requested',
      requestedAt: new Date().toISOString(),
    }

    writeTeacherOpsStore({
      ...teacherStore,
      teachingRequests: [created, ...teacherStore.teachingRequests],
    })
    return created
  },

  async cancelTeachingRequest(
    actor: TeacherActor,
    requestId: string,
  ): Promise<TeachingScheduleRequestDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<TeachingScheduleRequestDto>(
        STAFF_API_ENDPOINTS.teacher.teachingRequestCancel(requestId),
      )
    }

    await mockDelay()
    const teacherStore = readTeacherOpsStore()
    const idx = teacherStore.teachingRequests.findIndex((r) => r.id === requestId)
    if (idx === -1) throw new StaffApiClientError('Không tìm thấy nguyện vọng.', 404)

    const req = teacherStore.teachingRequests[idx]!
    if (req.teacherId !== actor.userId) {
      throw new StaffApiClientError('Bạn không thể rút nguyện vọng của giảng viên khác.', 403)
    }
    if (req.status !== 'Requested') {
      throw new StaffApiClientError('Chỉ được rút nguyện vọng khi Giáo vụ chưa xử lý.', 400)
    }

    const updated: TeachingScheduleRequestDto = {
      ...req,
      status: 'Cancelled',
    }
    const next = [...teacherStore.teachingRequests]
    next[idx] = updated
    writeTeacherOpsStore({ ...teacherStore, teachingRequests: next })
    return updated
  },
}
