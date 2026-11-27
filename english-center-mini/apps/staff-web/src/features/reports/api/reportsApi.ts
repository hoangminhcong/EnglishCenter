import { getTodayIsoInVietnam } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { staffHttpClient } from '@/services/api/httpClient'
import { mockDelay } from '@/services/mock/mockStorage'
import {
  readAcademicOpsStore,
  readAccountingOpsStore,
  readTeacherOpsStore,
} from '@/services/mock/operationsMockStore'
import { cmsApi } from '@/features/content/api/cmsApi'
import { testAuthoringApi } from '@/features/learning/api/testAuthoringApi'
import { readCenterClassesStore } from '@/features/training/api/trainingApi'
import { buildRecentYearMonths, toVietnamYmd } from '@/shared/utils/staffFormatters'

export interface ReportsSummaryDto {
  enrollmentTrend6M: { label: string; value: number }[]
  revenueByMonth6M: { label: string; value: number; formattedValue: string }[]
  attendanceByBranch: { label: string; value: number; formattedValue: string }[]
  testOnlineAttemptsByCollection: { label: string; value: number; color: string }[]
  topTestsTable: {
    id: string
    code: string
    title: string
    attempts: number
    totalQuestions: number
    versionNumber: number
    status: string
  }[]
}

const COLLECTION_COLORS = ['#2878B8', '#75BDEB', '#F26522', '#1F7A4C', '#0284C7']

export const reportsApi = {
  async getSummary(
    branchFilter: string,
    period: '3m' | '6m' = '6m',
  ): Promise<ReportsSummaryDto> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ReportsSummaryDto>(STAFF_API_ENDPOINTS.reports.summary, {
        branchId: branchFilter,
        period,
      })
    }

    await mockDelay(120)
    const todayYmd = getTodayIsoInVietnam()
    const months6M = buildRecentYearMonths(todayYmd.slice(0, 7), 6)

    const [branches, tests] = await Promise.all([
      cmsApi.listBranches(),
      testAuthoringApi.listTests(),
    ])

    const academicStore = readAcademicOpsStore()
    const accountingStore = readAccountingOpsStore()
    const teacherStore = readTeacherOpsStore()
    const centerClasses = readCenterClassesStore()

    const matchBranch = (branchId: string) =>
      branchFilter === 'ALL' || branchId === branchFilter

    const scopedEnrollments = academicStore.enrollments.filter(
      (e) => e.status !== 'dropped' && matchBranch(e.branchId),
    )
    const scopedConfirmedTxs = accountingStore.transactions.filter(
      (t) => t.status === 'Confirmed' && matchBranch(t.branchId),
    )
    const scopedCompletedRefunds = accountingStore.refunds.filter(
      (r) => r.status === 'Completed' && matchBranch(r.branchId),
    )

    const enrollmentTrend6M = months6M.map((ym) => ({
      label: `T${ym.slice(5, 7)}`,
      value: scopedEnrollments.filter((e) => toVietnamYmd(e.enrolledAt).slice(0, 7) === ym).length,
    }))

    const revenueByMonth6M = months6M.map((ym) => {
      const gross = scopedConfirmedTxs
        .filter((t) => toVietnamYmd(t.paidAt).slice(0, 7) === ym)
        .reduce((sum, t) => sum + t.amountVnd, 0)
      const refunded = scopedCompletedRefunds
        .filter((r) => toVietnamYmd(r.completedAt ?? r.requestedAt).slice(0, 7) === ym)
        .reduce((sum, r) => sum + r.amountVnd, 0)
      const netMln = Math.round((Math.max(0, gross - refunded) / 1_000_000) * 10) / 10
      return {
        label: `T${ym.slice(5, 7)}`,
        value: netMln,
        formattedValue: `${netMln}tr`,
      }
    })

    const classBranchMap = new Map<string, string>()
    for (const cls of centerClasses) {
      classBranchMap.set(cls.id, cls.branchId)
    }

    const visibleBranches = branches.filter((b) => matchBranch(b.id) && b.isActive)
    const attendanceByBranch = visibleBranches.map((branch) => {
      const markedEntries = teacherStore.attendanceEntries.filter(
        (entry) =>
          entry.status !== 'Unmarked' && classBranchMap.get(entry.classId) === branch.id,
      )
      const presentCount = markedEntries.filter((entry) => entry.status === 'Present').length
      const rate =
        markedEntries.length > 0 ? Math.round((presentCount / markedEntries.length) * 100) : 0
      return {
        label: branch.shortLabel || branch.name,
        value: rate,
        formattedValue: markedEntries.length > 0 ? `${rate}%` : 'Chưa điểm danh',
      }
    })

    const collectionTotals = new Map<string, number>()
    for (const test of tests) {
      const groupName = test.collectionGroup || 'Bộ đề luyện thi'
      collectionTotals.set(
        groupName,
        (collectionTotals.get(groupName) ?? 0) + (test.attemptsCount ?? 0),
      )
    }

    const testOnlineAttemptsByCollection = Array.from(collectionTotals.entries()).map(
      ([label, value], index) => ({
        label,
        value,
        color: COLLECTION_COLORS[index % COLLECTION_COLORS.length]!,
      }),
    )

    const topTestsTable = [...tests]
      .sort((a, b) => b.attemptsCount - a.attemptsCount)
      .map((t) => {
        const totalQuestions = t.parts.reduce(
          (sum, p) => sum + p.groups.reduce((gSum, g) => gSum + g.questions.length, 0),
          0,
        )
        return {
          id: t.id,
          code: t.code,
          title: t.title,
          attempts: t.attemptsCount,
          totalQuestions,
          versionNumber: t.activeVersionNumber,
          status: t.status,
        }
      })

    return {
      enrollmentTrend6M,
      revenueByMonth6M,
      attendanceByBranch,
      testOnlineAttemptsByCollection,
      topTestsTable,
    }
  },
}
