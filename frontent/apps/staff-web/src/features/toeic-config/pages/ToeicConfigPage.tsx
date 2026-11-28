import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  DataTable,
  DataTableCell,
  DataTableContainer,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyBlock,
  ErrorBlock,
  InputField,
  LoadingBlock,
  Modal,
  SelectField,
} from '@english-center/ui'
import { getTodayIsoInVietnam } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { toeicConfigApi } from '@/features/toeic-config/api/toeicConfigApi'
import type {
  MilestoneApplicabilityScope,
  ScoreConversionTableVersion,
  ToeicMilestoneRecord,
  ToeicScoreScaleVersion,
  VerifiedConversionRow,
} from '@/features/toeic-config/types/toeicConfig.types'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'

export function ToeicConfigPage() {
  useDocumentTitle('Cấu hình TOEIC')
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'scales' | 'conversions' | 'milestones'>('scales')
  const [activateTarget, setActivateTarget] = useState<ToeicScoreScaleVersion | null>(null)
  const [activateConvTarget, setActivateConvTarget] =
    useState<ScoreConversionTableVersion | null>(null)
  const [inspectConvTarget, setInspectConvTarget] =
    useState<ScoreConversionTableVersion | null>(null)

  const [scaleModalOpen, setScaleModalOpen] = useState(false)
  const [scaleError, setScaleError] = useState<string | null>(null)
  const [scaleForm, setScaleForm] = useState({
    versionCode: '',
    name: '',
    effectiveFrom: getTodayIsoInVietnam(),
    verifiedSource: '',
    changeReason: '',
  })

  const [convModalOpen, setConvModalOpen] = useState(false)
  const [convError, setConvError] = useState<string | null>(null)
  const [convForm, setConvForm] = useState<{
    versionCode: string
    title: string
    scaleVersionId: string
    verifiedSourceUrlOrCitation: string
    effectiveFrom: string
    rows: VerifiedConversionRow[]
  }>({
    versionCode: '',
    title: '',
    scaleVersionId: '',
    verifiedSourceUrlOrCitation: '',
    effectiveFrom: getTodayIsoInVietnam(),
    rows: [
      {
        rawCorrectCount: 100,
        correctCountLabel: '100/100 câu đúng',
        listeningScaledScore: 495,
        readingScaledScore: 495,
      },
    ],
  })

  const [msModalOpen, setMsModalOpen] = useState(false)
  const [msError, setMsError] = useState<string | null>(null)
  const [msForm, setMsForm] = useState<{
    id?: string
    code: string
    label: string
    minScore: number
    maxScore: number
    description: string
    applicabilityScope: MilestoneApplicabilityScope
    linkedCourseIds: string[]
    isActive: boolean
  }>({
    code: '',
    label: '',
    minScore: 10,
    maxScore: 990,
    description: '',
    applicabilityScope: 'new_enrollments_only',
    linkedCourseIds: [],
    isActive: true,
  })

  const { data: scales = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'toeic-scales'],
    queryFn: () => toeicConfigApi.listScales(),
  })

  const { data: conversions = [] } = useQuery({
    queryKey: ['staff', 'toeic-conversions'],
    queryFn: () => toeicConfigApi.listConversionTables(),
  })

  const { data: milestones = [] } = useQuery({
    queryKey: ['staff', 'toeic-milestones'],
    queryFn: () => toeicConfigApi.listMilestones(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const createScaleMutation = useMutation({
    mutationFn: () =>
      toeicConfigApi.createDraftScale({
        versionCode: scaleForm.versionCode,
        name: scaleForm.name,
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
        effectiveFrom: scaleForm.effectiveFrom,
        effectiveTo: null,
        verifiedSource: scaleForm.verifiedSource,
        changeReason: scaleForm.changeReason,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'toeic-scales'] })
      setScaleModalOpen(false)
      notify({
        tone: 'success',
        title: 'Đã tạo phiên bản thang điểm nháp',
        description: created.versionCode,
      })
    },
    onError: (err) => {
      setScaleError(err instanceof Error ? err.message : 'Không thể tạo phiên bản.')
    },
  })

  const activateScaleMutation = useMutation({
    mutationFn: (id: string) => toeicConfigApi.activateScaleVersion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'toeic-scales'] })
      setActivateTarget(null)
      notify({
        tone: 'success',
        title: 'Đã kích hoạt phiên bản thang điểm mới',
        description: 'Phiên bản active trước đó đã được chuyển sang Lưu trữ để bảo toàn lịch sử.',
      })
    },
  })

  const createConvMutation = useMutation({
    mutationFn: () =>
      toeicConfigApi.registerVerifiedConversionTable({
        versionCode: convForm.versionCode,
        title: convForm.title,
        scaleVersionId: convForm.scaleVersionId,
        verifiedSourceUrlOrCitation: convForm.verifiedSourceUrlOrCitation,
        effectiveFrom: convForm.effectiveFrom,
        status: 'draft',
        rows: convForm.rows,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'toeic-conversions'] })
      setConvModalOpen(false)
      notify({
        tone: 'success',
        title: 'Đã đăng ký bảng quy đổi có trích dẫn xác minh',
        description: `${created.versionCode} (${created.rows.length} dòng quy đổi)`,
      })
    },
    onError: (err) => {
      setConvError(err instanceof Error ? err.message : 'Không thể lưu bảng quy đổi.')
    },
  })

  const activateConvMutation = useMutation({
    mutationFn: (id: string) => toeicConfigApi.activateConversionTable(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'toeic-conversions'] })
      setActivateConvTarget(null)
      notify({
        tone: 'success',
        title: 'Đã kích hoạt bảng quy đổi điểm TOEIC',
        description: 'Bảng active trước đó (nếu có) đã được chuyển sang trạng thái Lưu trữ.',
      })
    },
    onError: (err) => {
      setActivateConvTarget(null)
      notify({
        tone: 'error',
        title: 'Không thể kích hoạt bảng quy đổi',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại cấu hình.',
      })
    },
  })

  const saveMilestoneMutation = useMutation({
    mutationFn: () => toeicConfigApi.upsertMilestone(msForm),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'toeic-milestones'] })
      setMsModalOpen(false)
      notify({
        tone: 'success',
        title: 'Đã lưu mốc mục tiêu TOEIC',
        description: `${saved.code} – ${saved.label} (${saved.linkedCourseIds.length} khóa học liên kết)`,
      })
    },
    onError: (err) => {
      setMsError(err instanceof Error ? err.message : 'Không thể lưu mốc mục tiêu.')
    },
  })

  if (isLoading) return <LoadingBlock label="Đang tải cấu hình TOEIC..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải cấu hình TOEIC."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cấu hình Khảo thí & Khung điểm TOEIC"
        description="Quản lý khung thang điểm, bảng quy đổi và mốc mục tiêu đầu ra TOEIC."
        badge={<Badge tone="info">Chuẩn khảo thí</Badge>}
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('scales')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'scales' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            1. Khung thang điểm & Phiên bản ({scales.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('conversions')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'conversions' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            2. Bảng quy đổi điểm ({conversions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('milestones')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'milestones' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            3. Mốc điểm & Mục tiêu đầu ra ({milestones.length})
          </button>
        </div>

        <ActionGuard permission="toeic_config.create">
          {tab === 'scales' && (
            <Button
              size="sm"
              onClick={() => {
                setScaleError(null)
                setScaleForm({
                  versionCode: '',
                  name: '',
                  effectiveFrom: getTodayIsoInVietnam(),
                  verifiedSource: '',
                  changeReason: '',
                })
                setScaleModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Tạo phiên bản thang điểm mới</span>
            </Button>
          )}

          {tab === 'conversions' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setConvError(null)
                setConvForm({
                  versionCode: '',
                  title: '',
                  scaleVersionId:
                    scales.find((s) => s.status === 'active')?.id ??
                    scales[0]?.id ??
                    '',
                  verifiedSourceUrlOrCitation: '',
                  effectiveFrom: getTodayIsoInVietnam(),
                  rows: [
                    {
                      rawCorrectCount: 100,
                      correctCountLabel: '100/100 câu đúng',
                      listeningScaledScore: 495,
                      readingScaledScore: 495,
                    },
                  ],
                })
                setConvModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Đăng ký bảng quy đổi đã xác minh</span>
            </Button>
          )}

          {tab === 'milestones' && (
            <Button
              size="sm"
              onClick={() => {
                setMsError(null)
                setMsForm({
                  code: '',
                  label: '',
                  minScore: 10,
                  maxScore: 990,
                  description: '',
                  applicabilityScope: 'new_enrollments_only',
                  linkedCourseIds: [],
                  isActive: true,
                })
                setMsModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Thêm mốc mục tiêu</span>
            </Button>
          )}
        </ActionGuard>
      </div>

      {/* TAB 1: SCALES */}
      {tab === 'scales' &&
        (scales.length === 0 ? (
          <EmptyBlock title="Chưa có phiên bản khung thang điểm TOEIC" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã & Tên phiên bản
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Listening & Reading
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Speaking & Writing
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Nguồn xác minh & Hiệu lực</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {scales.map((sc) => (
                  <DataTableRow key={sc.id}>
                    <DataTableCell>
                      <p className="whitespace-nowrap font-bold text-[#243B53]">{sc.versionCode}</p>
                      <p className="text-xs text-[#64748B]">{sc.name}</p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-xs">
                      <p className="font-bold text-[#243B53]">
                        Tổng: {sc.totalMin}–{sc.totalMax}
                      </p>
                      <p className="text-[#64748B]">
                        LC {sc.listeningMin}–{sc.listeningMax} • RC {sc.readingMin}–{sc.readingMax}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-xs">
                      {sc.speakingMax > 0 ? (
                        <span>
                          S: {sc.speakingMin}–{sc.speakingMax} • W: {sc.writingMin}–{sc.writingMax}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">Không khai báo S&W</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-medium text-[#243B53]">{sc.verifiedSource}</p>
                      <p className="whitespace-nowrap text-[#64748B]">
                        Từ {sc.effectiveFrom} {'→'} {sc.effectiveTo ?? 'Đang áp dụng'}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge
                        tone={
                          sc.status === 'active'
                            ? 'success'
                            : sc.status === 'draft'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {sc.status === 'active'
                          ? 'Đang áp dụng'
                          : sc.status === 'draft'
                            ? 'Bản nháp'
                            : 'Đã lưu trữ'}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <ActionGuard permission="toeic_config.activate">
                          {sc.status === 'draft' && (
                            <Button size="sm" onClick={() => setActivateTarget(sc)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Kích hoạt</span>
                            </Button>
                          )}
                        </ActionGuard>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {/* TAB 2: CONVERSION TABLES */}
      {tab === 'conversions' && (
        <div className="space-y-4">
          {conversions.length === 0 ? (
            <EmptyBlock
              title="Chưa có bảng quy đổi điểm TOEIC"
              description="Nhấn Đăng ký bảng quy đổi đã xác minh để thêm mới."
            />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã & Tiêu đề bảng quy đổi
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Khung điểm & Số dòng
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Trích dẫn nguồn xác minh</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Ngày hiệu lực
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thao tác
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {conversions.map((cv) => {
                    const matchedScale = scales.find((s) => s.id === cv.scaleVersionId)
                    return (
                      <DataTableRow key={cv.id}>
                        <DataTableCell>
                          <p className="whitespace-nowrap font-bold text-[#243B53]">
                            {cv.versionCode}
                          </p>
                          <p className="text-xs text-[#64748B]">{cv.title}</p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-xs">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge tone="info">
                              {matchedScale?.versionCode ?? cv.scaleVersionId}
                            </Badge>
                            <p className="font-semibold text-[#243B53]">
                              {cv.rows.length} dòng quy đổi
                            </p>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-[#2878B8]">
                          {cv.verifiedSourceUrlOrCitation}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-xs">
                          {cv.effectiveFrom}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge
                            tone={
                              cv.status === 'active'
                                ? 'success'
                                : cv.status === 'draft'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {cv.status === 'active'
                              ? 'Đang áp dụng'
                              : cv.status === 'draft'
                                ? 'Dự thảo kiểm định'
                                : 'Đã lưu trữ'}
                          </Badge>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setInspectConvTarget(cv)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết ({cv.rows.length})</span>
                            </Button>

                            <ActionGuard permission="toeic_config.activate">
                              {cv.status === 'draft' && (
                                <Button size="sm" onClick={() => setActivateConvTarget(cv)}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Kích hoạt</span>
                                </Button>
                              )}
                            </ActionGuard>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      )}

      {/* TAB 3: MILESTONES */}
      {tab === 'milestones' &&
        (milestones.length === 0 ? (
          <EmptyBlock title="Chưa có mốc điểm đầu ra TOEIC" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã & Nhãn mốc mục tiêu
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Khoảng điểm TOEIC
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Khóa học liên kết & Phạm vi</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {milestones.map((ms: ToeicMilestoneRecord) => (
                  <DataTableRow key={ms.id}>
                    <DataTableCell>
                      <p className="whitespace-nowrap font-bold text-[#243B53]">
                        {ms.code} – {ms.label}
                      </p>
                      <p className="text-xs text-[#64748B]">{ms.description}</p>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap font-extrabold text-[#2878B8]">
                      {ms.minScore} – {ms.maxScore} điểm
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone="info">
                          {ms.applicabilityScope === 'new_enrollments_only'
                            ? 'Chỉ áp dụng ghi danh mới'
                            : 'Chỉ áp dụng khóa học mở mới'}
                        </Badge>
                        {ms.linkedCourseIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {ms.linkedCourseIds.map((cId) => {
                              const courseName = courses.find((c) => c.id === cId)?.name ?? cId
                              return (
                                <Badge key={cId} tone="neutral">
                                  {courseName}
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#64748B]">Chưa gắn khóa học cụ thể</p>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={ms.isActive ? 'success' : 'neutral'}>
                        {ms.isActive ? 'Đang dùng' : 'Ngưng dùng'}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <ActionGuard permission="toeic_config.update">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setMsError(null)
                              setMsForm({
                                id: ms.id,
                                code: ms.code,
                                label: ms.label,
                                minScore: ms.minScore,
                                maxScore: ms.maxScore,
                                description: ms.description,
                                applicabilityScope: ms.applicabilityScope,
                                linkedCourseIds: [...ms.linkedCourseIds],
                                isActive: ms.isActive,
                              })
                              setMsModalOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Sửa</span>
                          </Button>
                        </ActionGuard>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        ))}

      {/* Modal tạo phiên bản thang điểm */}
      <Modal
        open={scaleModalOpen}
        title="Tạo Phiên bản Khung Thang điểm TOEIC mới"
        onClose={() => setScaleModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setScaleModalOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={createScaleMutation.isPending}
              onClick={() => createScaleMutation.mutate()}
            >
              Lưu phiên bản nháp
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {scaleError && (
            <div className="rounded-xl bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
              {scaleError}
            </div>
          )}
          <InputField
            label="Mã phiên bản"
            value={scaleForm.versionCode}
            onChange={(e) => setScaleForm({ ...scaleForm, versionCode: e.target.value })}
          />
          <InputField
            label="Tên mô tả phiên bản"
            value={scaleForm.name}
            onChange={(e) => setScaleForm({ ...scaleForm, name: e.target.value })}
          />
          <InputField
            label="Ngày bắt đầu hiệu lực"
            type="date"
            value={scaleForm.effectiveFrom}
            onChange={(e) => setScaleForm({ ...scaleForm, effectiveFrom: e.target.value })}
          />
          <InputField
            label="Nguồn tài liệu chuẩn đã xác minh (Bắt buộc)"
            value={scaleForm.verifiedSource}
            onChange={(e) => setScaleForm({ ...scaleForm, verifiedSource: e.target.value })}
            placeholder="VD: ETS TOEIC Official Score Guide 2027..."
          />
          <InputField
            label="Lý do ban hành phiên bản mới"
            value={scaleForm.changeReason}
            onChange={(e) => setScaleForm({ ...scaleForm, changeReason: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modal đăng ký bảng quy đổi có trích dẫn + Row Editor */}
      <Modal
        open={convModalOpen}
        title="Đăng ký Bảng quy đổi điểm có nguồn xác minh"
        onClose={() => setConvModalOpen(false)}
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvModalOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={createConvMutation.isPending}
              onClick={() => createConvMutation.mutate()}
            >
              Đăng ký bản dự thảo ({convForm.rows.length} dòng)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {convError && (
            <div className="rounded-xl bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
              {convError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              label="Mã bảng quy đổi"
              value={convForm.versionCode}
              onChange={(e) => setConvForm({ ...convForm, versionCode: e.target.value })}
            />
            <InputField
              label="Tiêu đề bảng quy đổi"
              value={convForm.title}
              onChange={(e) => setConvForm({ ...convForm, title: e.target.value })}
            />
            <SelectField
              label="Gắn với Khung thang điểm gốc"
              value={convForm.scaleVersionId}
              placeholder={
                scales.length === 0
                  ? '-- Chưa có khung thang điểm --'
                  : '-- Chọn khung thang điểm --'
              }
              onChange={(e) => setConvForm({ ...convForm, scaleVersionId: e.target.value })}
              options={scales.map((sc) => ({
                value: sc.id,
                label: `${sc.versionCode} (${sc.status === 'active' ? 'Đang áp dụng' : sc.status})`,
              }))}
            />
            <InputField
              label="Ngày bắt đầu hiệu lực"
              type="date"
              value={convForm.effectiveFrom}
              onChange={(e) => setConvForm({ ...convForm, effectiveFrom: e.target.value })}
            />
            <div className="sm:col-span-2">
              <InputField
                label="Trích dẫn tài liệu / URL nguồn ETS đã xác minh (Bắt buộc)"
                value={convForm.verifiedSourceUrlOrCitation}
                onChange={(e) =>
                  setConvForm({ ...convForm, verifiedSourceUrlOrCitation: e.target.value })
                }
                placeholder="Nhập tên ấn phẩm ETS hoặc URL xác thực..."
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase text-[#243B53]">
                  Các dòng quy đổi điểm ({convForm.rows.length} dòng)
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Mỗi điểm Scaled Score phải từ 5 đến 495 và là bội số của 5.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  onClick={() =>
                    setConvForm((prev) => {
                      const nextRaw = Math.min(100, prev.rows.length * 10)
                      return {
                        ...prev,
                        rows: [
                          ...prev.rows,
                          {
                            rawCorrectCount: nextRaw,
                            correctCountLabel: `${nextRaw}/100 câu đúng`,
                            listeningScaledScore: 250,
                            readingScaledScore: 250,
                          },
                        ],
                      }
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm dòng</span>
                </Button>
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {convForm.rows.map((row, idx) => (
                <div
                  key={`conv-row-${idx}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-[#DCEAF3] bg-white p-2.5 sm:grid-cols-12 sm:items-end"
                >
                  <div className="sm:col-span-2">
                    <InputField
                      label="Số câu đúng"
                      type="number"
                      min={0}
                      max={100}
                      value={row.rawCorrectCount ?? 0}
                      onChange={(e) => {
                        const raw = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                        setConvForm((prev) => ({
                          ...prev,
                          rows: prev.rows.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  rawCorrectCount: raw,
                                  correctCountLabel: `${raw}/100 câu đúng`,
                                }
                              : r,
                          ),
                        }))
                      }}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <InputField
                      label="Nhãn hiển thị"
                      value={row.correctCountLabel}
                      onChange={(e) => {
                        const label = e.target.value
                        setConvForm((prev) => ({
                          ...prev,
                          rows: prev.rows.map((r, i) =>
                            i === idx ? { ...r, correctCountLabel: label } : r,
                          ),
                        }))
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <InputField
                      label="Điểm LC"
                      type="number"
                      min={5}
                      max={495}
                      step={5}
                      value={row.listeningScaledScore}
                      onChange={(e) => {
                        const lc = Math.min(495, Math.max(5, Number(e.target.value) || 5))
                        setConvForm((prev) => ({
                          ...prev,
                          rows: prev.rows.map((r, i) =>
                            i === idx ? { ...r, listeningScaledScore: lc } : r,
                          ),
                        }))
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <InputField
                      label="Điểm RC"
                      type="number"
                      min={5}
                      max={495}
                      step={5}
                      value={row.readingScaledScore}
                      onChange={(e) => {
                        const rc = Math.min(495, Math.max(5, Number(e.target.value) || 5))
                        setConvForm((prev) => ({
                          ...prev,
                          rows: prev.rows.map((r, i) =>
                            i === idx ? { ...r, readingScaledScore: rc } : r,
                          ),
                        }))
                      }}
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={convForm.rows.length <= 1}
                      onClick={() =>
                        setConvForm((prev) => ({
                          ...prev,
                          rows: prev.rows.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#B93A2E]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal xem chi tiết các dòng của Bảng quy đổi */}
      <Modal
        open={Boolean(inspectConvTarget)}
        title={
          inspectConvTarget
            ? `Chi tiết Bảng quy đổi ${inspectConvTarget.versionCode} (${inspectConvTarget.rows.length} dòng)`
            : ''
        }
        onClose={() => setInspectConvTarget(null)}
        maxWidthClassName="max-w-2xl"
        footer={<Button onClick={() => setInspectConvTarget(null)}>Đóng</Button>}
      >
        {inspectConvTarget && (
          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-[#F8FBFD] p-3">
              <p className="font-bold text-[#243B53]">{inspectConvTarget.title}</p>
              <p className="mt-1 text-[#2878B8]">
                Nguồn xác minh: {inspectConvTarget.verifiedSourceUrlOrCitation}
              </p>
              <p className="mt-0.5 text-[#64748B]">
                Hiệu lực từ: {inspectConvTarget.effectiveFrom}
              </p>
            </div>
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Số câu đúng (Raw Score)
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Listening Scaled
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Reading Scaled
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {inspectConvTarget.rows.map((row, idx) => (
                    <DataTableRow key={`${row.correctCountLabel}-${idx}`}>
                      <DataTableCell className="whitespace-nowrap font-semibold">
                        {row.rawCorrectCount !== undefined
                          ? `${row.rawCorrectCount} câu (${row.correctCountLabel})`
                          : row.correctCountLabel}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-bold text-[#2878B8]">
                        {row.listeningScaledScore}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right font-bold text-[#1F7A4C]">
                        {row.readingScaledScore}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          </div>
        )}
      </Modal>

      {/* Modal thêm/sửa Mốc mục tiêu */}
      <Modal
        open={msModalOpen}
        title={msForm.id ? 'Cập nhật mốc mục tiêu TOEIC' : 'Thêm mốc mục tiêu đầu ra mới'}
        onClose={() => setMsModalOpen(false)}
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              loading={saveMilestoneMutation.isPending}
              onClick={() => saveMilestoneMutation.mutate()}
            >
              Lưu mốc mục tiêu
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {msError && (
            <div className="rounded-xl bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
              {msError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Mã mốc (VD: M-700)"
              value={msForm.code}
              onChange={(e) => setMsForm({ ...msForm, code: e.target.value })}
            />
            <InputField
              label="Nhãn hiển thị"
              value={msForm.label}
              onChange={(e) => setMsForm({ ...msForm, label: e.target.value })}
            />
            <InputField
              label="Điểm tối thiểu"
              type="number"
              min={10}
              max={990}
              value={msForm.minScore}
              onChange={(e) => setMsForm({ ...msForm, minScore: Number(e.target.value) || 10 })}
            />
            <InputField
              label="Điểm tối đa"
              type="number"
              min={10}
              max={990}
              value={msForm.maxScore}
              onChange={(e) => setMsForm({ ...msForm, maxScore: Number(e.target.value) || 990 })}
            />
          </div>
          <SelectField
            label="Quy tắc bảo vệ cam kết lịch sử"
            value={msForm.applicabilityScope}
            onChange={(e) =>
              setMsForm({
                ...msForm,
                applicabilityScope: e.target.value as MilestoneApplicabilityScope,
              })
            }
            options={[
              {
                value: 'new_enrollments_only',
                label: 'Chỉ áp dụng cho ghi danh mới (Không sửa cam kết lớp cũ)',
              },
              {
                value: 'new_courses_only',
                label: 'Chỉ áp dụng cho khóa học mở mới',
              },
            ]}
          />
          <InputField
            label="Mô tả năng lực đầu ra"
            value={msForm.description}
            onChange={(e) => setMsForm({ ...msForm, description: e.target.value })}
          />

          <div className="space-y-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
            <p className="font-extrabold uppercase text-[#243B53]">
              Liên kết Khóa học áp dụng ({msForm.linkedCourseIds.length} đã chọn)
            </p>
            {courses.length === 0 ? (
              <p className="text-xs text-[#64748B]">Chưa có khóa học nào trong hệ thống.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {courses.map((course) => {
                  const checked = msForm.linkedCourseIds.includes(course.id)
                  return (
                    <label
                      key={course.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#DCEAF3] bg-white p-2 font-semibold text-[#243B53]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked
                          setMsForm((prev) => ({
                            ...prev,
                            linkedCourseIds: isChecked
                              ? [...prev.linkedCourseIds, course.id]
                              : prev.linkedCourseIds.filter((id) => id !== course.id),
                          }))
                        }}
                      />
                      <span className="truncate">{course.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#DCEAF3] p-3 text-xs font-bold text-[#243B53]">
            <input
              type="checkbox"
              checked={msForm.isActive}
              onChange={(e) => setMsForm({ ...msForm, isActive: e.target.checked })}
            />
            <span>Đang kích hoạt sử dụng mốc mục tiêu này</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Kích hoạt Phiên bản Thang điểm TOEIC mới"
        description={
          activateTarget ? (
            <>
              Kích hoạt phiên bản <strong>{activateTarget.versionCode}</strong>? Phiên bản đang
              Active trước đó sẽ tự động chuyển sang trạng thái <strong>Đã lưu trữ</strong> (không bị
              ghi đè) để giữ nguyên lịch sử chấm điểm của các bài thi cũ.
            </>
          ) : (
            ''
          )
        }
        loading={activateScaleMutation.isPending}
        onClose={() => setActivateTarget(null)}
        onConfirm={() => {
          if (activateTarget) activateScaleMutation.mutate(activateTarget.id)
        }}
      />

      <ConfirmDialog
        open={Boolean(activateConvTarget)}
        title="Kích hoạt Bảng Quy đổi Điểm TOEIC"
        description={
          activateConvTarget ? (
            <>
              Xác nhận kích hoạt bảng quy đổi <strong>{activateConvTarget.versionCode}</strong> (
              {activateConvTarget.rows.length} dòng quy đổi)? Bảng đang áp dụng trước đó (nếu có) sẽ
              tự động chuyển về trạng thái <strong>Đã lưu trữ</strong>.
            </>
          ) : (
            ''
          )
        }
        loading={activateConvMutation.isPending}
        onClose={() => setActivateConvTarget(null)}
        onConfirm={() => {
          if (activateConvTarget) activateConvMutation.mutate(activateConvTarget.id)
        }}
      />
    </div>
  )
}
