import { getTodayIsoInVietnam, shiftIsoYmd } from '@english-center/utils'
import type { CenterClassOfferingDto } from '@english-center/contracts'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { readTeacherOpsStore } from '@/services/mock/operationsMockStore'
import { cmsApi } from '@/features/content/api/cmsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { readStaffIdentityStore } from '@/features/auth/mocks/staffIdentityMockStore'
import type {
  ActualTrainingClassRecord,
  PublicOpeningScheduleRecord,
} from '@/features/training/types/training.types'

export const CENTER_CLASSES_MOCK_KEY = 'ec_staff_mock_center_classes_v6'

function buildSeedCenterClasses(): CenterClassOfferingDto[] {
  const today = getTodayIsoInVietnam()
  return [
    {
      id: 'cls-ec-s01',
      classCode: 'EC-S01',
      className: 'Submarine 700+ – Tối 3-5-7 (Cs. Hà Đông)',
      courseId: 'submarine-toeic',
      branchId: 'cs-ha-dong',
      studyMode: 'Offline',
      classTypeLabel: 'Lớp cam kết 700+',
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
    },
    {
      id: 'cls-ec-cb02',
      classCode: 'EC-CB02',
      className: 'Camp Bomb 450+ – Tối 2-4-6 (Cs. Nam Từ Liêm)',
      courseId: 'camp-bomb-toeic',
      branchId: 'cs-nam-tu-liem',
      studyMode: 'Offline',
      classTypeLabel: 'Lớp tiêu chuẩn',
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
    },
    {
      id: 'sch-hd-01',
      classCode: 'TOEIC-FD01',
      className: 'Foundation Xây nền – Tối 2-4-6 (Đang tuyển sinh)',
      courseId: 'foundation-toeic',
      branchId: 'cs-ha-dong',
      studyMode: 'Offline',
      classTypeLabel: 'Lớp xây nền',
      startDate: shiftIsoYmd(today, 12),
      endDate: shiftIsoYmd(today, 70),
      studyDays: 'Thứ 2 - Thứ 4 - Thứ 6',
      startTime: '18:00',
      endTime: '20:00',
      teacherId: 'acc-stf-006',
      teacherName: 'Thầy Minh Đức',
      roomLabel: 'Phòng P.202 – Hà Đông',
      maxStudents: 25,
      enrolledStudents: 16,
      registrationDeadline: shiftIsoYmd(today, 10),
      status: 'open',
      isPublishedOnWeb: true,
    },
    {
      id: 'sch-hbt-01',
      classCode: 'HBT-SB12',
      className: 'Submarine 700+ – Tối 3-5-7 (Cs. Hai Bà Trưng)',
      courseId: 'submarine-toeic',
      branchId: 'cs-hai-ba-trung',
      studyMode: 'Offline',
      classTypeLabel: 'Lớp cam kết 700+',
      startDate: shiftIsoYmd(today, 15),
      endDate: shiftIsoYmd(today, 75),
      studyDays: 'Thứ 3 - Thứ 5 - Thứ 7',
      startTime: '18:30',
      endTime: '20:30',
      teacherId: 'acc-stf-007',
      teacherName: 'Cô Lan Hương',
      roomLabel: 'Phòng P.401 – Tạ Quang Bửu',
      maxStudents: 22,
      enrolledStudents: 19,
      registrationDeadline: shiftIsoYmd(today, 13),
      status: 'open',
      isPublishedOnWeb: true,
    },
    {
      id: 'sch-onl-01',
      classCode: 'ONL-CB11',
      className: 'Camp Bomb 450+ Trực tuyến Zoom – Tối 3-5-7',
      courseId: 'camp-bomb-toeic',
      branchId: 'toeic-online',
      studyMode: 'Online',
      classTypeLabel: 'Lớp trực tuyến Zoom',
      startDate: shiftIsoYmd(today, 8),
      endDate: shiftIsoYmd(today, 64),
      studyDays: 'Thứ 3 - Thứ 5 - Thứ 7',
      startTime: '19:30',
      endTime: '21:30',
      teacherId: 'acc-stf-006',
      teacherName: 'Thầy Minh Đức',
      roomLabel: 'Zoom LMS Room 02',
      maxStudents: 20,
      enrolledStudents: 14,
      registrationDeadline: shiftIsoYmd(today, 6),
      status: 'upcoming',
      isPublishedOnWeb: true,
    },
    {
      id: 'cls-ec-s00',
      classCode: 'EC-S00',
      className: 'Submarine 700+ Khóa K10 – Đã hoàn thành',
      courseId: 'submarine-toeic',
      branchId: 'cs-tay-son',
      studyMode: 'Offline',
      classTypeLabel: 'Lớp cam kết 700+',
      startDate: shiftIsoYmd(today, -95),
      endDate: shiftIsoYmd(today, -15),
      studyDays: 'Thứ 2 - Thứ 5',
      startTime: '18:30',
      endTime: '21:00',
      teacherId: 'acc-stf-007',
      teacherName: 'Cô Lan Hương',
      roomLabel: 'Phòng P.302 – Tây Sơn',
      maxStudents: 22,
      enrolledStudents: 22,
      status: 'completed',
      isPublishedOnWeb: false,
    },
  ]
}

export function readCenterClassesStore(): CenterClassOfferingDto[] {
  return readMockCollection<CenterClassOfferingDto[]>(CENTER_CLASSES_MOCK_KEY, buildSeedCenterClasses)
}

export function writeCenterClassesStore(next: CenterClassOfferingDto[]): void {
  writeMockCollection(CENTER_CLASSES_MOCK_KEY, next)
}

export const trainingApi = {
  async listActualClasses(): Promise<ActualTrainingClassRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ActualTrainingClassRecord[]>(STAFF_API_ENDPOINTS.training.classes)
    }
    await mockDelay()
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c]))
    const branchMap = new Map(branches.map((b) => [b.id, b]))
    const identityStore = readStaffIdentityStore()
    const teacherCodeMap = new Map(
      identityStore.employeeProfiles.map((p) => [p.userId, p.employeeCode]),
    )
    const teacherOps = readTeacherOpsStore()
    const liveClasses = readCenterClassesStore()

    return liveClasses
      .filter((c) => c.status !== 'cancelled')
      .map((cls) => {
        const course = courseMap.get(cls.courseId)
        const branch = branchMap.get(cls.branchId)
        const classSessions = teacherOps.sessions.filter((s) => s.classId === cls.id)
        const totalSessions =
          classSessions.length > 0 ? classSessions.length : (course?.sessionsCount ?? 24)

        const classPlans = teacherOps.teachingPlans.filter(
          (p) => p.classId === cls.id && p.completionStatus === 'completed',
        )
        const completedSessions =
          cls.status === 'completed'
            ? totalSessions
            : cls.status === 'ongoing'
              ? classPlans.length
              : 0

        const markedAtt = teacherOps.attendanceEntries.filter(
          (a) => a.classId === cls.id && a.status !== 'Unmarked',
        )
        const attendedCount = markedAtt.filter(
          (a) => a.status === 'Present' || a.status === 'Late',
        ).length
        const attendanceRatePercent =
          markedAtt.length > 0 ? Math.round((attendedCount / markedAtt.length) * 100) : 0

        const classSubs = teacherOps.submissions.filter((s) => s.classId === cls.id)
        const doneSubs = classSubs.filter((s) => s.status !== 'NotSubmitted').length
        const homeworkCompletionPercent =
          classSubs.length > 0 ? Math.round((doneSubs / classSubs.length) * 100) : 0

        const mappedStatus: ActualTrainingClassRecord['status'] =
          cls.status === 'ongoing'
            ? 'ongoing'
            : cls.status === 'completed'
              ? 'completed'
              : 'upcoming'

        return {
          id: cls.id,
          classCode: cls.classCode,
          courseId: cls.courseId,
          courseName: course?.name ?? cls.courseId,
          branchId: cls.branchId,
          branchName: branch?.name ?? cls.branchId,
          studyMode: cls.studyMode,
          teacherName: cls.teacherName ?? 'Chưa phân công GV',
          teacherCode: cls.teacherId
            ? (teacherCodeMap.get(cls.teacherId) ?? 'GV-TOEIC')
            : 'CHƯA GÁN',
          roomLabel: cls.roomLabel ?? (cls.studyMode === 'Online' ? 'Zoom LMS' : 'Chưa xếp phòng'),
          scheduleDays: cls.studyDays,
          timeSlot: cls.endTime ? `${cls.startTime} – ${cls.endTime}` : cls.startTime,
          startDate: cls.startDate,
          endDate: cls.endDate ?? 'Đang cập nhật',
          completedSessions,
          totalSessions,
          enrolledCount: cls.enrolledStudents ?? 0,
          maxCapacity: cls.maxStudents ?? 25,
          attendanceRatePercent,
          homeworkCompletionPercent,
          status: mappedStatus,
        }
      })
  },

  async listPublicSchedules(): Promise<PublicOpeningScheduleRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<PublicOpeningScheduleRecord[]>(
        STAFF_API_ENDPOINTS.training.publicSchedules,
      )
    }
    await mockDelay()
    const [courses, branches] = await Promise.all([
      coursesApi.listCourses(),
      cmsApi.listBranches(),
    ])
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.shortLabel || b.name]))
    const liveClasses = readCenterClassesStore()

    return liveClasses
      .filter(
        (c) =>
          c.isPublishedOnWeb === true &&
          (c.status === 'open' || c.status === 'upcoming' || c.status === 'full'),
      )
      .map((c) => ({
        id: c.id,
        classCode: c.classCode,
        courseId: c.courseId,
        courseName: courseMap.get(c.courseId) ?? c.courseId,
        branchId: c.branchId,
        branchName: branchMap.get(c.branchId) ?? c.branchId,
        studyMode: c.studyMode,
        classTypeLabel:
          c.classTypeLabel ??
          (c.studyMode === 'Online' ? 'Lớp trực tuyến Zoom' : 'Lớp tiêu chuẩn'),
        studyDays: c.studyDays,
        timeSlot: c.endTime ? `${c.startTime} – ${c.endTime}` : c.startTime,
        startDate: c.startDateDisplay ?? c.startDate,
        enrolledStudents: c.enrolledStudents ?? 0,
        maxStudents: c.maxStudents ?? 25,
        status: c.status === 'full' ? 'full' : c.status === 'upcoming' ? 'upcoming' : 'open',
        isPublished: true,
      }))
  },

  async listAllCenterClasses(): Promise<CenterClassOfferingDto[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<CenterClassOfferingDto[]>(
        STAFF_API_ENDPOINTS.training.centerClasses,
      )
    }
    await mockDelay(100)
    return readCenterClassesStore()
  },
}
