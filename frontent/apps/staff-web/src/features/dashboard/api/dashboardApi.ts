import { deriveAccountingReceivableStatus } from '@english-center/contracts'
import { formatVnd, getTodayIsoInVietnam } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { staffHttpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/mock/mockStorage'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
} from '@/services/mock/operationsMockStore'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { readSalesMockStore } from '@/features/sales/services/salesApi'
import { readCenterClassesStore } from '@/features/training/api/trainingApi'
import { buildRecentYearMonths, toVietnamYmd } from '@/shared/utils/staffFormatters'
import type { StaffDashboardOverview } from '@/features/dashboard/types/dashboard.types'

const COURSE_SLICE_COLORS = ['#75BDEB', '#2878B8', '#F26522', '#1F7A4C', '#0284C7', '#D97706']

export const dashboardApi = {
  async getOverview(period: '3m' | '6m' = '6m'): Promise<StaffDashboardOverview> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<StaffDashboardOverview>(STAFF_API_ENDPOINTS.dashboard.overview, {
        period,
      })
    }

    await mockDelay(120)
    const todayYmd = getTodayIsoInVietnam()
    const currentYm = todayYmd.slice(0, 7)
    const months6M = buildRecentYearMonths(currentYm, 6)
    const periodMonths = new Set(period === '3m' ? months6M.slice(-3) : months6M)

    const [accounts, courses] = await Promise.all([
      accountsApi.listAccounts(),
      coursesApi.listCourses(),
    ])
    const centerClasses = readCenterClassesStore()
    const academicStore = readAcademicOpsStore()
    const accountingStore = readAccountingOpsStore()
    const salesStore = readSalesMockStore()

    const teacherAccounts = accounts.filter((a) => a.category === 'TEACHER')
    const activeTeachers = teacherAccounts.filter((a) => a.accountStatus === 'ACTIVE').length
    const staffAccounts = accounts.filter((a) => a.category === 'STAFF')
    const activeStaff = staffAccounts.filter((a) => a.accountStatus === 'ACTIVE').length

    const nonCancelledClasses = centerClasses.filter((c) => c.status !== 'cancelled')
    const ongoingClasses = nonCancelledClasses.filter((c) => c.status === 'ongoing').length
    const openOrUpcomingClasses = nonCancelledClasses.filter(
      (c) => c.status === 'open' || c.status === 'upcoming' || c.status === 'full',
    ).length
    const completedClasses = nonCancelledClasses.filter((c) => c.status === 'completed').length

    const studyingStudents = academicStore.students.filter(
      (s) => s.learningStatus === 'studying',
    ).length
    const waitingStudents = academicStore.students.filter(
      (s) => s.learningStatus === 'waiting_placement',
    ).length

    const activeEnrollmentsInPeriod = academicStore.enrollments.filter(
      (e) => e.status !== 'dropped' && periodMonths.has(toVietnamYmd(e.enrolledAt).slice(0, 7)),
    )
    const approvedOrConvertedRegs = salesStore.registrations.filter(
      (r) => r.status === 'Approved' || r.status === 'Converted',
    ).length
    const pendingRegs = salesStore.registrations.filter(
      (r) =>
        r.status === 'Submitted' || r.status === 'Reviewing' || r.status === 'NeedAdditionalInfo',
    ).length

    const confirmedTxs = accountingStore.transactions.filter((t) => t.status === 'Confirmed')
    const pendingTxs = accountingStore.transactions.filter(
      (t) => t.status === 'PendingVerification',
    )
    const completedRefunds = accountingStore.refunds.filter((r) => r.status === 'Completed')

    const confirmedInPeriod = confirmedTxs
      .filter((t) => periodMonths.has(toVietnamYmd(t.paidAt).slice(0, 7)))
      .reduce((sum, t) => sum + t.amountVnd, 0)
    const refundedInPeriod = completedRefunds
      .filter((r) =>
        periodMonths.has(toVietnamYmd(r.completedAt ?? r.requestedAt).slice(0, 7)),
      )
      .reduce((sum, r) => sum + r.amountVnd, 0)
    const netRevenuePeriodVnd = Math.max(0, confirmedInPeriod - refundedInPeriod)

    const paidByReceivable = new Map<string, number>()
    for (const tx of confirmedTxs) {
      paidByReceivable.set(tx.receivableId, (paidByReceivable.get(tx.receivableId) ?? 0) + tx.amountVnd)
    }

    let totalOutstandingDebtVnd = 0
    let openReceivablesCount = 0
    let overdueCount = 0

    for (const rcv of accountingStore.receivables) {
      if (rcv.isCancelled) continue
      const paid = paidByReceivable.get(rcv.id) ?? 0
      const remaining = Math.max(0, rcv.totalReceivableVnd - paid)
      if (remaining > 0) {
        totalOutstandingDebtVnd += remaining
        openReceivablesCount += 1
        const st = deriveAccountingReceivableStatus({
          isCancelled: rcv.isCancelled,
          totalReceivableVnd: rcv.totalReceivableVnd,
          paidConfirmedVnd: paid,
          dueDate: rcv.dueDate,
          todayYmdVn: todayYmd,
        })
        if (st === 'Overdue') overdueCount += 1
      }
    }

    const monthlyEnrollments6M = months6M.map((ym) => {
      const monthLabel = `T${ym.slice(5, 7)}`
      const count = academicStore.enrollments.filter(
        (e) => e.status !== 'dropped' && toVietnamYmd(e.enrolledAt).slice(0, 7) === ym,
      ).length
      return { label: monthLabel, value: count }
    })

    const monthlyRevenueMln6M = months6M.map((ym) => {
      const monthLabel = `T${ym.slice(5, 7)}`
      const gross = confirmedTxs
        .filter((t) => toVietnamYmd(t.paidAt).slice(0, 7) === ym)
        .reduce((sum, t) => sum + t.amountVnd, 0)
      const refunded = completedRefunds
        .filter((r) => toVietnamYmd(r.completedAt ?? r.requestedAt).slice(0, 7) === ym)
        .reduce((sum, r) => sum + r.amountVnd, 0)
      const netMln = Math.round((Math.max(0, gross - refunded) / 1_000_000) * 10) / 10
      return {
        label: monthLabel,
        value: netMln,
        formattedValue: `${netMln}tr`,
      }
    })

    const studentsByCourse = courses.map((course, index) => {
      const enrolledSum = nonCancelledClasses
        .filter((cls) => cls.courseId === course.id)
        .reduce((sum, cls) => sum + (cls.enrolledStudents ?? 0), 0)
      return {
        label: course.code,
        value: enrolledSum,
        color: COURSE_SLICE_COLORS[index % COURSE_SLICE_COLORS.length]!,
      }
    })

    return {
      kpis: [
        {
          id: 'kpi-students',
          label: 'Hồ sơ học viên hệ thống',
          value: `${academicStore.students.length} HV`,
          subLabel: `${studyingStudents} đang học • ${waitingStudents} chờ xếp lớp`,
          targetPath: '/training',
          requiredPermission: 'training.view',
        },
        {
          id: 'kpi-teachers',
          label: 'Giảng viên TOEIC',
          value: `${activeTeachers}/${teacherAccounts.length}`,
          subLabel: 'Tài khoản Giảng viên đang hoạt động (ACTIVE)',
          targetPath: '/accounts',
          requiredPermission: 'accounts.view',
        },
        {
          id: 'kpi-staff',
          label: 'Nhân sự vận hành',
          value: `${activeStaff}/${staffAccounts.length}`,
          subLabel: 'Admin, Sale, Kế toán & Giáo vụ đang ACTIVE',
          targetPath: '/accounts',
          requiredPermission: 'accounts.view',
        },
        {
          id: 'kpi-courses',
          label: 'Khóa học niêm yết',
          value: `${courses.filter((c) => c.status === 'active').length}/${courses.length}`,
          subLabel: 'Đang mở tuyển sinh trên Website',
          targetPath: '/courses',
          requiredPermission: 'courses.view',
        },
        {
          id: 'kpi-classes',
          label: 'Lớp đào tạo toàn trung tâm',
          value: `${nonCancelledClasses.length} lớp`,
          subLabel: `${ongoingClasses} đang học • ${openOrUpcomingClasses} đang tuyển / sắp mở`,
          targetPath: '/training',
          requiredPermission: 'training.view',
        },
        {
          id: 'kpi-enrollment',
          label: `Ghi danh (${period === '3m' ? '3 tháng' : '6 tháng'})`,
          value: `${activeEnrollmentsInPeriod.length} lượt`,
          subLabel: `${approvedOrConvertedRegs} hồ sơ Sale duyệt • ${pendingRegs} chờ duyệt`,
          targetPath: '/reports?tab=admissions',
          requiredPermission: 'reports.view',
        },
        {
          id: 'kpi-revenue',
          label: `Thực thu ròng (${period === '3m' ? '3 tháng' : '6 tháng'})`,
          value: formatVnd(netRevenuePeriodVnd),
          subLabel: `${confirmedTxs.length} giao dịch xác nhận • ${pendingTxs.length} chờ đối chiếu`,
          targetPath: '/reports?tab=finance',
          requiredPermission: 'reports.view',
        },
        {
          id: 'kpi-receivable',
          label: 'Công nợ học phí cần theo dõi',
          value: formatVnd(totalOutstandingDebtVnd),
          subLabel: `${openReceivablesCount} khoản phải thu mở • ${overdueCount} quá hạn`,
          targetPath: '/reports?tab=finance',
          requiredPermission: 'reports.view',
        },
      ],
      monthlyEnrollments6M,
      monthlyRevenueMln6M,
      studentsByCourse,
      classStatusBreakdown: [
        { statusLabel: 'Đang giảng dạy (Ongoing)', count: ongoingClasses, tone: 'success' },
        { statusLabel: 'Đang tuyển sinh / Sắp mở', count: openOrUpcomingClasses, tone: 'info' },
        { statusLabel: 'Đã hoàn thành khóa', count: completedClasses, tone: 'neutral' },
      ],
    }
  },
}
