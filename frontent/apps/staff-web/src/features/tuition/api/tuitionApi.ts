import { getTodayIsoInVietnam } from '@english-center/utils'
import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import type {
  TuitionPolicyRecord,
  TuitionPolicyStatus,
  UpsertTuitionPolicyInput,
} from '@/features/tuition/types/tuition.types'

export const TUITION_POLICIES_MOCK_KEY = 'ec_staff_mock_tuition_policies_v6'

export function calculateNetTuition(
  listedVnd: number,
  discountPercent: number,
  discountFixedVnd: number,
): number {
  const afterPct = Math.round(listedVnd * (1 - Math.max(0, Math.min(100, discountPercent)) / 100))
  return Math.max(0, afterPct - Math.max(0, discountFixedVnd))
}

function rangesOverlap(
  aFrom: string,
  aTo: string | null | undefined,
  bFrom: string,
  bTo: string | null | undefined,
): boolean {
  const endA = aTo || '9999-12-31'
  const endB = bTo || '9999-12-31'
  return aFrom <= endB && bFrom <= endA
}

function buildSeedPolicies(): TuitionPolicyRecord[] {
  return [
    {
      id: 'tp-foundation-2026',
      policyCode: 'CSHP-FD-2026',
      courseId: 'foundation-toeic',
      courseName: 'FOUNDATION TOEIC (Xây nền)',
      listedTuitionVnd: 2_800_000,
      discountProgramName: 'Ưu đãi đăng ký sớm trước khai giảng 7 ngày',
      discountPercent: 0,
      discountFixedVnd: 200_000,
      netTuitionVnd: 2_600_000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2027-06-30',
      status: 'active',
      applicabilityNote: 'Áp dụng cho học viên đóng trọn gói khóa Foundation tại toàn bộ cơ sở.',
      updatedAt: '2026-11-10T08:00:00.000Z',
      history: [
        {
          id: 'tph-fd-1',
          versionNumber: 1,
          changedAt: '2026-11-10T08:00:00.000Z',
          changedBy: 'Nguyễn Hoàng Nam',
          note: 'Ban hành khung học phí chuẩn năm học 2026–2027.',
          listedTuitionVnd: 2_800_000,
          netTuitionVnd: 2_600_000,
        },
      ],
    },
    {
      id: 'tp-beginners-2026',
      policyCode: 'CSHP-BG-2026',
      courseId: 'beginners-toeic',
      courseName: "BEGINNER'S TOEIC 350+",
      listedTuitionVnd: 3_400_000,
      discountProgramName: 'Hỗ trợ sinh viên đại học',
      discountPercent: 5,
      discountFixedVnd: 0,
      netTuitionVnd: 3_230_000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2027-06-30',
      status: 'active',
      applicabilityNote: 'Áp dụng khi xuất trình thẻ sinh viên còn hiệu lực.',
      updatedAt: '2026-11-10T08:15:00.000Z',
      history: [
        {
          id: 'tph-bg-1',
          versionNumber: 1,
          changedAt: '2026-11-10T08:15:00.000Z',
          changedBy: 'Nguyễn Hoàng Nam',
          note: 'Ban hành chính sách ưu đãi sinh viên.',
          listedTuitionVnd: 3_400_000,
          netTuitionVnd: 3_230_000,
        },
      ],
    },
    {
      id: 'tp-campbomb-2026',
      policyCode: 'CSHP-CB-2026',
      courseId: 'camp-bomb-toeic',
      courseName: 'CAMP BOMB TOEIC 450+',
      listedTuitionVnd: 4_000_000,
      discountProgramName: 'Ưu đãi sinh viên đại học đối tác',
      discountPercent: 0,
      discountFixedVnd: 200_000,
      netTuitionVnd: 3_800_000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2027-06-30',
      status: 'active',
      applicabilityNote: 'Áp dụng toàn hệ thống Offline & TOEIC Online.',
      updatedAt: '2026-11-12T09:00:00.000Z',
      history: [
        {
          id: 'tph-cb-1',
          versionNumber: 1,
          changedAt: '2026-11-12T09:00:00.000Z',
          changedBy: 'Nguyễn Hoàng Nam',
          note: 'Áp dụng biểu phí khóa Camp Bomb 450+.',
          listedTuitionVnd: 4_000_000,
          netTuitionVnd: 3_800_000,
        },
      ],
    },
    {
      id: 'tp-submarine-2026',
      policyCode: 'CSHP-SM-2026',
      courseId: 'submarine-toeic',
      courseName: 'SUBMARINE TOEIC 700+',
      listedTuitionVnd: 4_800_000,
      discountProgramName: 'Ưu đãi học viên đăng ký sớm / chuyển tiếp',
      discountPercent: 0,
      discountFixedVnd: 300_000,
      netTuitionVnd: 4_500_000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2027-06-30',
      status: 'active',
      applicabilityNote: 'Áp dụng cho học viên hoàn tất cọc/học phí đợt 1 trước khai giảng.',
      updatedAt: '2026-11-14T10:00:00.000Z',
      history: [
        {
          id: 'tph-sm-1',
          versionNumber: 1,
          changedAt: '2026-11-14T10:00:00.000Z',
          changedBy: 'Nguyễn Hoàng Nam',
          note: 'Ban hành chính sách học phí khóa Submarine 700+.',
          listedTuitionVnd: 4_800_000,
          netTuitionVnd: 4_500_000,
        },
      ],
    },
  ]
}

export const tuitionApi = {
  async listPolicies(): Promise<TuitionPolicyRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<TuitionPolicyRecord[]>(STAFF_API_ENDPOINTS.tuitionPolicies.list)
    }
    await mockDelay()
    const todayYmd = getTodayIsoInVietnam()
    const raw = readMockCollection(TUITION_POLICIES_MOCK_KEY, buildSeedPolicies)
    return raw.map((p) => {
      if (p.status === 'active' && p.effectiveTo && p.effectiveTo < todayYmd) {
        return { ...p, status: 'expired' as const }
      }
      return p
    })
  },

  async upsertPolicy(
    input: UpsertTuitionPolicyInput,
    actorLabel: string,
  ): Promise<TuitionPolicyRecord> {
    if (!input.policyCode.trim()) {
      throw new StaffApiClientError('Vui lòng nhập mã chính sách học phí.', 400)
    }
    if (!input.courseId.trim()) {
      throw new StaffApiClientError('Vui lòng chọn khóa học áp dụng.', 400)
    }
    if (!input.effectiveFrom.trim()) {
      throw new StaffApiClientError('Vui lòng chọn ngày bắt đầu hiệu lực.', 400)
    }
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
      throw new StaffApiClientError(
        'Ngày kết thúc hiệu lực không được nhỏ hơn ngày bắt đầu hiệu lực.',
        400,
      )
    }
    if (input.listedTuitionVnd <= 0) {
      throw new StaffApiClientError('Học phí niêm yết phải lớn hơn 0.', 422)
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<TuitionPolicyRecord>(
          STAFF_API_ENDPOINTS.tuitionPolicies.detail(input.id),
          input,
        )
      }
      return staffHttpClient.post<TuitionPolicyRecord>(
        STAFF_API_ENDPOINTS.tuitionPolicies.list,
        input,
      )
    }

    await mockDelay()
    const current = readMockCollection(TUITION_POLICIES_MOCK_KEY, buildSeedPolicies)
    const normalizedCode = input.policyCode.trim().toUpperCase()
    const dup = current.find(
      (p) => p.policyCode.toUpperCase() === normalizedCode && p.id !== input.id,
    )
    if (dup) {
      throw new StaffApiClientError('Mã chính sách học phí đã tồn tại.', 409)
    }

    if (input.status === 'active') {
      const overlappingActive = current.find(
        (p) =>
          p.id !== input.id &&
          p.courseId === input.courseId &&
          p.status === 'active' &&
          rangesOverlap(input.effectiveFrom, input.effectiveTo, p.effectiveFrom, p.effectiveTo),
      )
      if (overlappingActive) {
        throw new StaffApiClientError(
          `Khóa học đã có chính sách đang hiệu lực (${overlappingActive.policyCode}) trùng khoảng thời gian áp dụng. Vui lòng lưu trữ chính sách cũ hoặc chọn khoảng ngày khác.`,
          409,
        )
      }
    }

    const netTuitionVnd = calculateNetTuition(
      input.listedTuitionVnd,
      input.discountPercent,
      input.discountFixedVnd,
    )
    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((p) => p.id === input.id)
      if (idx === -1) {
        throw new StaffApiClientError('Không tìm thấy chính sách học phí.', 404)
      }
      const prev = current[idx]!
      const nextVer = prev.history.length + 1
      const updated: TuitionPolicyRecord = {
        ...prev,
        policyCode: normalizedCode,
        courseId: input.courseId,
        courseName: input.courseName,
        listedTuitionVnd: input.listedTuitionVnd,
        discountProgramName: input.discountProgramName.trim(),
        discountPercent: input.discountPercent,
        discountFixedVnd: input.discountFixedVnd,
        netTuitionVnd,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        status: input.status,
        applicabilityNote: input.applicabilityNote.trim(),
        updatedAt: nowIso,
        history: [
          {
            id: createUniqueId('tph'),
            versionNumber: nextVer,
            changedAt: nowIso,
            changedBy: actorLabel,
            note: input.changeReason.trim() || 'Cập nhật điều khoản chính sách học phí.',
            listedTuitionVnd: input.listedTuitionVnd,
            netTuitionVnd,
          },
          ...prev.history,
        ],
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(TUITION_POLICIES_MOCK_KEY, next)
      return updated
    }

    const created: TuitionPolicyRecord = {
      id: createUniqueId('tp'),
      policyCode: normalizedCode,
      courseId: input.courseId,
      courseName: input.courseName,
      listedTuitionVnd: input.listedTuitionVnd,
      discountProgramName: input.discountProgramName.trim(),
      discountPercent: input.discountPercent,
      discountFixedVnd: input.discountFixedVnd,
      netTuitionVnd,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      status: input.status,
      applicabilityNote: input.applicabilityNote.trim(),
      updatedAt: nowIso,
      history: [
        {
          id: createUniqueId('tph'),
          versionNumber: 1,
          changedAt: nowIso,
          changedBy: actorLabel,
          note: input.changeReason.trim() || 'Khởi tạo chính sách học phí mới.',
          listedTuitionVnd: input.listedTuitionVnd,
          netTuitionVnd,
        },
      ],
    }

    const next = [created, ...current]
    writeMockCollection(TUITION_POLICIES_MOCK_KEY, next)
    return created
  },

  async setPolicyStatus(
    id: string,
    status: TuitionPolicyStatus,
    actorLabel: string,
  ): Promise<TuitionPolicyRecord> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.patch<TuitionPolicyRecord>(
        STAFF_API_ENDPOINTS.tuitionPolicies.status(id),
        { status },
      )
    }

    await mockDelay()
    const current = readMockCollection(TUITION_POLICIES_MOCK_KEY, buildSeedPolicies)
    const idx = current.findIndex((p) => p.id === id)
    if (idx === -1) {
      throw new StaffApiClientError('Không tìm thấy chính sách học phí.', 404)
    }
    const prev = current[idx]!
    const nowIso = new Date().toISOString()
    const updated: TuitionPolicyRecord = {
      ...prev,
      status,
      updatedAt: nowIso,
      history: [
        {
          id: createUniqueId('tph'),
          versionNumber: prev.history.length + 1,
          changedAt: nowIso,
          changedBy: actorLabel,
          note: `Chuyển trạng thái chính sách sang "${status}".`,
          listedTuitionVnd: prev.listedTuitionVnd,
          netTuitionVnd: prev.netTuitionVnd,
        },
        ...prev.history,
      ],
    }
    const next = [...current]
    next[idx] = updated
    writeMockCollection(TUITION_POLICIES_MOCK_KEY, next)
    return updated
  },
}
