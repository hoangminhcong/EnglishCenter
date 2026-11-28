import { USE_STAFF_MOCK_API } from '@/services/api/apiConfig'
import { STAFF_API_ENDPOINTS } from '@/services/api/endpoints'
import { StaffApiClientError, staffHttpClient } from '@/services/api/httpClient'
import { mockDelay, readMockCollection, writeMockCollection } from '@/services/mock/mockStorage'
import { createUniqueId } from '@/shared/utils/staffFormatters'
import type {
  ScoreConversionTableVersion,
  ToeicMilestoneRecord,
  ToeicScoreScaleVersion,
} from '@/features/toeic-config/types/toeicConfig.types'

export const TOEIC_SCALES_MOCK_KEY = 'ec_staff_mock_toeic_scales_v6'
export const TOEIC_CONVERSIONS_MOCK_KEY = 'ec_staff_mock_toeic_conversions_v6'
export const TOEIC_MILESTONES_MOCK_KEY = 'ec_staff_mock_toeic_milestones_v6'

function buildSeedScales(): ToeicScoreScaleVersion[] {
  return [
    {
      id: 'scale-ets-lr-v1',
      versionCode: 'ETS-LR-990',
      name: 'Khung thang điểm chuẩn TOEIC 4 Kỹ năng (ETS)',
      listeningMin: 5,
      listeningMax: 495,
      readingMin: 5,
      readingMax: 495,
      totalMin: 10,
      totalMax: 990,
      speakingMin: 0,
      speakingMax: 200,
      writingMin: 0,
      writingMax: 200,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      verifiedSource: 'ETS TOEIC Examinee Handbook – Listening & Reading / Speaking & Writing',
      changeReason: 'Khung điểm quy chuẩn áp dụng toàn trung tâm.',
      status: 'active',
      updatedAt: '2026-10-01T08:00:00.000Z',
    },
  ]
}

function buildSeedConversionTables(): ScoreConversionTableVersion[] {
  return [
    {
      id: 'conv-ets-2026-v1',
      versionCode: 'ETS-CONV-2026',
      title: 'Bảng quy đổi điểm chuẩn TOEIC Listening & Reading (10–990)',
      scaleVersionId: 'scale-ets-lr-v1',
      verifiedSourceUrlOrCitation: 'ETS Official TOEIC Score Conversion Reference Guide',
      effectiveFrom: '2026-01-01',
      status: 'active',
      rows: [
        { rawCorrectCount: 0, correctCountLabel: '0–5 câu đúng', listeningScaledScore: 5, readingScaledScore: 5 },
        { rawCorrectCount: 25, correctCountLabel: '25 câu đúng', listeningScaledScore: 110, readingScaledScore: 95 },
        { rawCorrectCount: 40, correctCountLabel: '40 câu đúng', listeningScaledScore: 195, readingScaledScore: 175 },
        { rawCorrectCount: 55, correctCountLabel: '55 câu đúng', listeningScaledScore: 285, readingScaledScore: 265 },
        { rawCorrectCount: 70, correctCountLabel: '70 câu đúng', listeningScaledScore: 370, readingScaledScore: 345 },
        { rawCorrectCount: 80, correctCountLabel: '80 câu đúng', listeningScaledScore: 425, readingScaledScore: 395 },
        { rawCorrectCount: 90, correctCountLabel: '90 câu đúng', listeningScaledScore: 470, readingScaledScore: 450 },
        { rawCorrectCount: 100, correctCountLabel: '97–100 câu đúng', listeningScaledScore: 495, readingScaledScore: 495 },
      ],
    },
  ]
}

function buildSeedMilestones(): ToeicMilestoneRecord[] {
  return [
    {
      id: 'ms-foundation',
      code: 'MS-FOUNDATION',
      label: 'Xây dựng nền tảng (0 -> 300+)',
      minScore: 10,
      maxScore: 300,
      description: 'Chuẩn hóa ngữ âm, từ vựng căn bản và cấu trúc câu đơn cho học viên mất gốc.',
      applicabilityScope: 'new_enrollments_only',
      linkedCourseIds: ['foundation-toeic'],
      isActive: true,
      updatedAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 'ms-350',
      code: 'MS-350',
      label: '350+ TOEIC Sơ cấp',
      minScore: 300,
      maxScore: 445,
      description: 'Làm quen định dạng đề thi ETS và nắm vững chiến thuật Part 1, 2, 5.',
      applicabilityScope: 'new_enrollments_only',
      linkedCourseIds: ['beginners-toeic'],
      isActive: true,
      updatedAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 'ms-450',
      code: 'MS-450',
      label: '450–600+ TOEIC Chuẩn đầu ra Đại học',
      minScore: 450,
      maxScore: 650,
      description: 'Đạt chuẩn đầu ra tiếng Anh các trường Đại học khối Kinh tế – Kỹ thuật.',
      applicabilityScope: 'new_enrollments_only',
      linkedCourseIds: ['camp-bomb-toeic'],
      isActive: true,
      updatedAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 'ms-700',
      code: 'MS-700',
      label: '700–900+ TOEIC Chuyên sâu Đi làm',
      minScore: 700,
      maxScore: 990,
      description: 'Sử dụng thành thạo tiếng Anh thương mại trong môi trường doanh nghiệp quốc tế.',
      applicabilityScope: 'new_enrollments_only',
      linkedCourseIds: ['submarine-toeic'],
      isActive: true,
      updatedAt: '2026-10-05T08:00:00.000Z',
    },
  ]
}

export function getActiveScaleCodeSync(): string | null {
  const scales = readMockCollection(TOEIC_SCALES_MOCK_KEY, buildSeedScales)
  return (scales.find((s) => s.status === 'active') ?? scales[0])?.versionCode ?? null
}

export function getActiveConversionTableSync(): ScoreConversionTableVersion | null {
  const tables = readMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, buildSeedConversionTables)
  return tables.find((t) => t.status === 'active') ?? tables[0] ?? null
}

export const toeicConfigApi = {
  async listScales(): Promise<ToeicScoreScaleVersion[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ToeicScoreScaleVersion[]>(STAFF_API_ENDPOINTS.toeicConfig.scales)
    }
    await mockDelay(100)
    return readMockCollection(TOEIC_SCALES_MOCK_KEY, buildSeedScales)
  },

  async createDraftScale(
    input: Omit<ToeicScoreScaleVersion, 'id' | 'status' | 'updatedAt'>,
  ): Promise<ToeicScoreScaleVersion> {
    if (!input.versionCode.trim() || !input.name.trim()) {
      throw new StaffApiClientError('Vui lòng nhập Mã phiên bản và Tên phiên bản thang điểm.', 400)
    }
    if (!input.verifiedSource.trim()) {
      throw new StaffApiClientError(
        'Bắt buộc cung cấp nguồn tham chiếu đã xác minh khi tạo phiên bản thang điểm.',
        400,
      )
    }

    const normalizedCode = input.versionCode.trim().toUpperCase()
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ToeicScoreScaleVersion>(STAFF_API_ENDPOINTS.toeicConfig.scales, {
        ...input,
        versionCode: normalizedCode,
      })
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_SCALES_MOCK_KEY, buildSeedScales)
    const dup = current.find((s) => s.versionCode.toUpperCase() === normalizedCode)
    if (dup) {
      throw new StaffApiClientError('Mã phiên bản thang điểm đã tồn tại.', 409)
    }
    const created: ToeicScoreScaleVersion = {
      ...input,
      id: createUniqueId('scale'),
      versionCode: normalizedCode,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    }
    const next = [created, ...current]
    writeMockCollection(TOEIC_SCALES_MOCK_KEY, next)
    return created
  },

  async activateScaleVersion(id: string): Promise<ToeicScoreScaleVersion[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ToeicScoreScaleVersion[]>(
        STAFF_API_ENDPOINTS.toeicConfig.scaleActivate(id),
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_SCALES_MOCK_KEY, buildSeedScales)
    const target = current.find((s) => s.id === id)
    if (!target) {
      throw new StaffApiClientError('Không tìm thấy phiên bản thang điểm.', 404)
    }

    const nowIso = new Date().toISOString()
    const todayDate = nowIso.slice(0, 10)
    const next = current.map((item) => {
      if (item.id === id) {
        return { ...item, status: 'active' as const, updatedAt: nowIso }
      }
      if (item.status === 'active') {
        return {
          ...item,
          status: 'archived' as const,
          effectiveTo: item.effectiveTo ?? todayDate,
          updatedAt: nowIso,
        }
      }
      return item
    })
    writeMockCollection(TOEIC_SCALES_MOCK_KEY, next)
    return next
  },

  async listConversionTables(): Promise<ScoreConversionTableVersion[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ScoreConversionTableVersion[]>(
        STAFF_API_ENDPOINTS.toeicConfig.conversions,
      )
    }
    await mockDelay(100)
    return readMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, buildSeedConversionTables)
  },

  async registerVerifiedConversionTable(
    input: Omit<ScoreConversionTableVersion, 'id'>,
  ): Promise<ScoreConversionTableVersion> {
    const normalizedCode = input.versionCode.trim().toUpperCase()
    if (!normalizedCode || !input.title.trim()) {
      throw new StaffApiClientError('Vui lòng nhập Mã bảng quy đổi và Tiêu đề.', 400)
    }
    if (!input.verifiedSourceUrlOrCitation.trim()) {
      throw new StaffApiClientError(
        'Vui lòng nhập trích dẫn tài liệu hoặc nguồn xác minh hợp lệ.',
        400,
      )
    }
    if (!input.scaleVersionId.trim()) {
      throw new StaffApiClientError('Vui lòng chọn Khung thang điểm gốc.', 400)
    }
    if (input.rows.length === 0) {
      throw new StaffApiClientError('Bảng quy đổi phải có ít nhất 1 dòng quy đổi điểm.', 400)
    }

    for (const row of input.rows) {
      if (!row.correctCountLabel.trim()) {
        throw new StaffApiClientError('Nhãn số câu đúng không được để trống.', 400)
      }
      if (
        row.listeningScaledScore < 5 ||
        row.listeningScaledScore > 495 ||
        row.listeningScaledScore % 5 !== 0 ||
        row.readingScaledScore < 5 ||
        row.readingScaledScore > 495 ||
        row.readingScaledScore % 5 !== 0
      ) {
        throw new StaffApiClientError(
          'Điểm quy đổi Listening và Reading ở mọi dòng phải trong khoảng 5–495 và chia hết cho 5.',
          400,
        )
      }
    }

    const payload = {
      ...input,
      versionCode: normalizedCode,
      title: input.title.trim(),
    }

    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ScoreConversionTableVersion>(
        STAFF_API_ENDPOINTS.toeicConfig.conversions,
        payload,
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, buildSeedConversionTables)
    if (current.some((c) => c.versionCode.toUpperCase() === normalizedCode)) {
      throw new StaffApiClientError(`Mã bảng quy đổi "${normalizedCode}" đã tồn tại.`, 409)
    }

    const created: ScoreConversionTableVersion = {
      ...payload,
      id: createUniqueId('conv'),
    }
    const next = [created, ...current]
    writeMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, next)
    return created
  },

  async activateConversionTable(id: string): Promise<ScoreConversionTableVersion[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.post<ScoreConversionTableVersion[]>(
        STAFF_API_ENDPOINTS.toeicConfig.conversionActivate(id),
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, buildSeedConversionTables)
    const target = current.find((c) => c.id === id)
    if (!target) {
      throw new StaffApiClientError('Không tìm thấy bảng quy đổi điểm cần kích hoạt.', 404)
    }
    if (target.rows.length === 0) {
      throw new StaffApiClientError('Không thể kích hoạt bảng quy đổi rỗng.', 400)
    }

    const next = current.map((item) => {
      if (item.id === id) {
        return { ...item, status: 'active' as const }
      }
      if (item.status === 'active') {
        return { ...item, status: 'archived' as const }
      }
      return item
    })
    writeMockCollection(TOEIC_CONVERSIONS_MOCK_KEY, next)
    return next
  },

  async listMilestones(): Promise<ToeicMilestoneRecord[]> {
    if (!USE_STAFF_MOCK_API) {
      return staffHttpClient.get<ToeicMilestoneRecord[]>(STAFF_API_ENDPOINTS.toeicConfig.milestones)
    }
    await mockDelay(100)
    return readMockCollection(TOEIC_MILESTONES_MOCK_KEY, buildSeedMilestones)
  },

  async upsertMilestone(
    input: Omit<ToeicMilestoneRecord, 'id' | 'updatedAt'> & { id?: string },
  ): Promise<ToeicMilestoneRecord> {
    const normalizedCode = input.code.trim().toUpperCase()
    if (!normalizedCode || !input.label.trim()) {
      throw new StaffApiClientError('Vui lòng nhập Mã mốc và Nhãn mốc mục tiêu.', 400)
    }
    if (input.maxScore < input.minScore) {
      throw new StaffApiClientError('Điểm tối đa phải lớn hơn hoặc bằng điểm tối thiểu.', 400)
    }

    const sanitized = {
      ...input,
      code: normalizedCode,
      label: input.label.trim(),
    }

    if (!USE_STAFF_MOCK_API) {
      if (input.id) {
        return staffHttpClient.put<ToeicMilestoneRecord>(
          STAFF_API_ENDPOINTS.toeicConfig.milestoneDetail(input.id),
          sanitized,
        )
      }
      return staffHttpClient.post<ToeicMilestoneRecord>(
        STAFF_API_ENDPOINTS.toeicConfig.milestones,
        sanitized,
      )
    }

    await mockDelay()
    const current = readMockCollection(TOEIC_MILESTONES_MOCK_KEY, buildSeedMilestones)
    if (current.some((m) => m.id !== input.id && m.code.toUpperCase() === normalizedCode)) {
      throw new StaffApiClientError(`Mã mốc mục tiêu "${normalizedCode}" đã tồn tại.`, 409)
    }

    const nowIso = new Date().toISOString()

    if (input.id) {
      const idx = current.findIndex((m) => m.id === input.id)
      if (idx === -1) {
        throw new StaffApiClientError('Không tìm thấy mốc mục tiêu TOEIC.', 404)
      }
      const updated: ToeicMilestoneRecord = {
        ...current[idx]!,
        ...sanitized,
        id: input.id,
        updatedAt: nowIso,
      }
      const next = [...current]
      next[idx] = updated
      writeMockCollection(TOEIC_MILESTONES_MOCK_KEY, next)
      return updated
    }

    const created: ToeicMilestoneRecord = {
      ...sanitized,
      id: createUniqueId('ms'),
      updatedAt: nowIso,
    }
    const next = [...current, created]
    writeMockCollection(TOEIC_MILESTONES_MOCK_KEY, next)
    return created
  },
}
