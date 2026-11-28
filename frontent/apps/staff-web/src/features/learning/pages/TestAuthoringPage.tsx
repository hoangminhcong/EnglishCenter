import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  GitBranch,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  Badge,
  Button,
  ErrorBlock,
  InputField,
  LoadingBlock,
  SelectField,
} from '@english-center/ui'
import { TEST_DIFFICULTIES, type TestDifficulty } from '@english-center/contracts'
import { formatDateTimeVi } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  createOptionsForPart,
  getAuthoringEditableTest,
  getTargetPublishVersionNumber,
  isImmutableVersionProtected,
  renumberTestQuestions,
  testAuthoringApi,
  validateTestBeforePublish,
} from '@/features/learning/api/testAuthoringApi'
import { TestPreviewModal } from '@/features/learning/components/TestPreviewModal'
import type {
  AuthoringQuestion,
  AuthoringQuestionGroup,
  AuthoringTestType,
  ManagedToeicTestRecord,
  ToeicPartNumber,
} from '@/features/learning/types/testAuthoring.types'
import { toeicConfigApi } from '@/features/toeic-config/api/toeicConfigApi'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { createUniqueId } from '@/shared/utils/staffFormatters'

export function TestAuthoringPage() {
  const { testId = '' } = useParams()
  useDocumentTitle('Soạn thảo Đề thi TOEIC')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canUpdate = hasPermission(user, 'tests.update')
  const canPublish = hasPermission(user, 'tests.publish')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'learning', 'test', testId],
    queryFn: () => testAuthoringApi.getTestById(testId),
    enabled: Boolean(testId),
  })

  const { data: allTests = [] } = useQuery({
    queryKey: ['staff', 'learning', 'tests'],
    queryFn: () => testAuthoringApi.listTests(),
  })

  const { data: scales = [] } = useQuery({
    queryKey: ['staff', 'toeic-scales'],
    queryFn: () => toeicConfigApi.listScales(),
  })

  const [editedDraft, setEditedDraft] = useState<ManagedToeicTestRecord | null>(null)
  const [activeTab, setActiveTab] = useState<'metadata' | 'questions' | 'publish'>('questions')
  const [selectedPartNum, setSelectedPartNum] = useState<ToeicPartNumber>(1)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [publishChangeNote, setPublishChangeNote] = useState(
    'Hoàn tất kiểm định câu hỏi, tệp âm thanh và đáp án.',
  )

  const serverEditable = data ? getAuthoringEditableTest(data) : null
  const draft =
    editedDraft && editedDraft.id === serverEditable?.id ? editedDraft : serverEditable
  const setDraft = (next: ManagedToeicTestRecord) => setEditedDraft(next)

  const actorLabel = user ? `${user.fullName} (${user.employeeCode})` : 'Quản trị viên'

  const forkDraftMutation = useMutation({
    mutationFn: () => testAuthoringApi.forkWorkingDraftVersion(testId),
    onSuccess: (forked) => {
      setEditedDraft(getAuthoringEditableTest(forked))
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'test', testId] })
      notify({
        tone: 'info',
        title: `Đã khởi tạo bản nháp phiên bản mới v${forked.workingDraft?.versionNumber ?? forked.activeVersionNumber + 1}`,
        description: `Phiên bản đang phát hành v${forked.activeVersionNumber} vẫn giữ nguyên phục vụ học viên.`,
      })
    },
  })

  const discardDraftMutation = useMutation({
    mutationFn: () => testAuthoringApi.discardWorkingDraft(testId),
    onSuccess: (restored) => {
      setEditedDraft(getAuthoringEditableTest(restored))
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'test', testId] })
      notify({
        tone: 'warning',
        title: 'Đã hủy bản nháp phiên bản mới',
        description: `Đã khôi phục nội dung theo phiên bản gốc v${restored.activeVersionNumber}.`,
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('Chưa tải dữ liệu đề thi.')
      return testAuthoringApi.saveTestAuthoring(draft)
    },
    onSuccess: ({ saved, forkedNewVersion }) => {
      setEditedDraft(getAuthoringEditableTest(saved))
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'test', testId] })
      notify({
        tone: forkedNewVersion ? 'info' : 'success',
        title: saved.workingDraft
          ? `Đã lưu bản nháp v${saved.workingDraft.versionNumber} (Đề live v${saved.activeVersionNumber} vẫn hoạt động)`
          : 'Đã lưu cấu trúc đề thi',
        description: forkedNewVersion
          ? 'Đề đang xuất bản không bị gỡ offline; toàn bộ snapshot lịch sử phiên bản cũ được bảo toàn bất biến.'
          : `${saved.title} (${saved.code})`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu bản soạn thảo',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại dữ liệu.',
      })
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Chưa tải dữ liệu đề thi.')
      const { saved } = await testAuthoringApi.saveTestAuthoring(draft)
      return testAuthoringApi.publishTestVersion(saved.id, actorLabel, publishChangeNote)
    },
    onSuccess: (published) => {
      setEditedDraft(getAuthoringEditableTest(published))
      setPublishConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'tests'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'learning', 'test', testId] })
      notify({
        tone: 'success',
        title: `Đã xuất bản chính thức phiên bản v${published.activeVersionNumber}`,
        description: `${published.title} đã đạt toàn bộ điều kiện kiểm định và lưu Snapshot bất biến.`,
      })
    },
    onError: (err) => {
      setPublishConfirmOpen(false)
      notify({
        tone: 'error',
        title: 'Xuất bản bị từ chối bởi Validator',
        description: err instanceof Error ? err.message : 'Đề thi chưa đủ điều kiện.',
      })
    },
  })

  if (isLoading || !draft) return <LoadingBlock label="Đang mở không gian soạn thảo đề TOEIC..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không tìm thấy đề thi cần soạn thảo."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const validation = validateTestBeforePublish(draft, allTests)
  const targetPublishVersion = getTargetPublishVersionNumber(draft)
  const isProtectedTest = isImmutableVersionProtected(draft)
  const selectedPart =
    draft.parts.find((p) => p.partNumber === selectedPartNum) ?? draft.parts[0]!

  const scaleOptions = (() => {
    const opts =
      scales.length > 0
        ? scales.map((sc) => ({
            value: sc.versionCode,
            label: `${sc.versionCode} – ${sc.name}${sc.status === 'active' ? ' (Đang áp dụng)' : ''}`,
          }))
        : [{ value: 'ETS-LR-990', label: 'Thang chuẩn TOEIC 10–990' }]
    if (
      draft.scoreScaleVersionCode &&
      !opts.some((o) => o.value === draft.scoreScaleVersionCode)
    ) {
      opts.unshift({
        value: draft.scoreScaleVersionCode,
        label: `${draft.scoreScaleVersionCode} (Hiện gắn kèm)`,
      })
    }
    return opts
  })()

  const rejectFailedMedia = (mediaStatus?: string): boolean => {
    if (mediaStatus === 'failed') {
      notify({
        tone: 'error',
        title: 'Tệp media tải lên bị lỗi',
        description: 'Không thể gắn tệp media có trạng thái lỗi vào câu hỏi.',
      })
      return true
    }
    return false
  }

  const updatePartsAndKeys = (
    nextParts: ManagedToeicTestRecord['parts'],
    nextKeys = draft.answerKeys,
  ) => {
    setDraft({
      ...draft,
      parts: renumberTestQuestions(nextParts),
      answerKeys: nextKeys,
    })
  }

  const handleAddGroup = (partNumber: ToeicPartNumber) => {
    const grpId = createUniqueId('grp')
    const qId = createUniqueId('q')
    const opts = createOptionsForPart(qId, partNumber)

    const newGroup: AuthoringQuestionGroup = {
      id: grpId,
      partNumber,
      groupTitle:
        partNumber === 3
          ? 'Đoạn hội thoại mới (Part 3)'
          : partNumber === 4
            ? 'Bài nói ngắn mới (Part 4)'
            : partNumber === 6
              ? 'Đoạn văn điền từ mới (Part 6)'
              : partNumber === 7
                ? 'Đoạn văn đọc hiểu mới (Part 7)'
                : `Câu đơn Part ${partNumber}`,
      passageText: '',
      audioUrl: '',
      imageUrl: '',
      displayOrder: 1,
      questions: [
        {
          id: qId,
          questionNumber: 1,
          partNumber,
          groupId: grpId,
          questionText: partNumber >= 3 ? 'Nhập câu hỏi...' : '',
          audioUrl: '',
          imageUrl: '',
          options: opts,
          displayOrder: 1,
        },
      ],
    }

    const nextParts = draft.parts.map((p) =>
      p.partNumber === partNumber ? { ...p, groups: [...p.groups, newGroup] } : p,
    )
    updatePartsAndKeys(nextParts, {
      ...draft.answerKeys,
      [qId]: {
        questionId: qId,
        correctOptionId: opts[0]?.id ?? '',
        explanation: '',
        transcript: '',
        translation: '',
      },
    })
  }

  const handleAddQuestionToGroup = (partNumber: ToeicPartNumber, groupId: string) => {
    const qId = createUniqueId('q')
    const opts = createOptionsForPart(qId, partNumber)
    const newQ: AuthoringQuestion = {
      id: qId,
      questionNumber: 1,
      partNumber,
      groupId,
      questionText: partNumber >= 3 ? 'Nhập nội dung câu hỏi tiếp theo...' : '',
      audioUrl: '',
      imageUrl: '',
      options: opts,
      displayOrder: 1,
    }

    const nextParts = draft.parts.map((p) =>
      p.partNumber === partNumber
        ? {
            ...p,
            groups: p.groups.map((g) =>
              g.id === groupId ? { ...g, questions: [...g.questions, newQ] } : g,
            ),
          }
        : p,
    )
    updatePartsAndKeys(nextParts, {
      ...draft.answerKeys,
      [qId]: {
        questionId: qId,
        correctOptionId: opts[0]?.id ?? '',
        explanation: '',
        transcript: '',
        translation: '',
      },
    })
  }

  const handleDuplicateQuestion = (
    partNumber: ToeicPartNumber,
    groupId: string,
    q: AuthoringQuestion,
  ) => {
    const qId = createUniqueId('q')
    const prevKey = draft.answerKeys[q.id]
    const prevIdx = q.options.findIndex((o) => o.id === prevKey?.correctOptionId)
    const clonedOptions = q.options.map((o) => ({
      ...o,
      id: createUniqueId(`opt-${o.label.toLowerCase()}`),
    }))
    const clonedQ: AuthoringQuestion = {
      ...q,
      id: qId,
      options: clonedOptions,
    }

    const nextParts = draft.parts.map((p) => {
      if (p.partNumber !== partNumber) return p
      if (!p.groupedMode) {
        const newGrpId = createUniqueId('grp')
        return {
          ...p,
          groups: [
            ...p.groups,
            {
              id: newGrpId,
              partNumber,
              groupTitle: `Câu đơn Part ${partNumber}`,
              passageText: '',
              audioUrl: '',
              imageUrl: '',
              displayOrder: p.groups.length + 1,
              questions: [{ ...clonedQ, groupId: newGrpId }],
            },
          ],
        }
      }
      return {
        ...p,
        groups: p.groups.map((g) =>
          g.id === groupId ? { ...g, questions: [...g.questions, clonedQ] } : g,
        ),
      }
    })

    updatePartsAndKeys(nextParts, {
      ...draft.answerKeys,
      [qId]: {
        questionId: qId,
        correctOptionId: clonedOptions[Math.max(0, prevIdx)]?.id ?? clonedOptions[0]?.id ?? '',
        explanation: prevKey?.explanation ?? '',
        transcript: prevKey?.transcript,
        translation: prevKey?.translation,
      },
    })
  }

  const handleMoveGroup = (partNumber: ToeicPartNumber, grpIdx: number, dir: -1 | 1) => {
    const nextParts = draft.parts.map((p) => {
      if (p.partNumber !== partNumber) return p
      const targetIdx = grpIdx + dir
      if (targetIdx < 0 || targetIdx >= p.groups.length) return p
      const cloned = [...p.groups]
      const cur = cloned[grpIdx]
      const swap = cloned[targetIdx]
      if (!cur || !swap) return p
      cloned[grpIdx] = swap
      cloned[targetIdx] = cur
      return { ...p, groups: cloned }
    })
    updatePartsAndKeys(nextParts)
  }

  const handleDeleteGroup = (partNumber: ToeicPartNumber, grp: AuthoringQuestionGroup) => {
    const nextKeys = { ...draft.answerKeys }
    for (const q of grp.questions) {
      delete nextKeys[q.id]
    }
    const nextParts = draft.parts.map((p) =>
      p.partNumber === partNumber
        ? { ...p, groups: p.groups.filter((g) => g.id !== grp.id) }
        : p,
    )
    updatePartsAndKeys(nextParts, nextKeys)
  }

  const handleDeleteQuestion = (
    partNumber: ToeicPartNumber,
    grp: AuthoringQuestionGroup,
    qId: string,
  ) => {
    const nextKeys = { ...draft.answerKeys }
    delete nextKeys[qId]

    const nextParts = draft.parts.map((p) => {
      if (p.partNumber !== partNumber) return p
      if (!p.groupedMode && grp.questions.length <= 1) {
        return { ...p, groups: p.groups.filter((g) => g.id !== grp.id) }
      }
      return {
        ...p,
        groups: p.groups.map((g) =>
          g.id === grp.id
            ? { ...g, questions: g.questions.filter((q) => q.id !== qId) }
            : g,
        ),
      }
    })
    updatePartsAndKeys(nextParts, nextKeys)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/learning/tests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Ngân hàng đề Test Online</span>
        </Link>
      </div>

      <PageHeader
        title={`${draft.title} (${draft.code})`}
        description={`Phiên bản v${draft.activeVersionNumber}${draft.workingDraft ? ` • Bản nháp v${draft.workingDraft.versionNumber}` : ''} • ${validation.computedTotalQuestions} câu hỏi`}
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              tone={
                draft.status === 'published'
                  ? 'success'
                  : draft.status === 'draft'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {draft.status === 'published'
                ? `Đang xuất bản (v${draft.activeVersionNumber})`
                : draft.status === 'draft'
                  ? `Bản nháp (v${draft.activeVersionNumber})`
                  : draft.status === 'hidden'
                    ? `Đang ẩn (v${draft.activeVersionNumber})`
                    : `Lưu trữ (v${draft.activeVersionNumber})`}
            </Badge>
            {draft.workingDraft && (
              <Badge tone="info">Nháp phiên bản mới v{draft.workingDraft.versionNumber}</Badge>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              <span>Xem thử đề</span>
            </Button>

            <ActionGuard permission="tests.update">
              {isProtectedTest && !draft.workingDraft && (
                <Button
                  variant="secondary"
                  loading={forkDraftMutation.isPending}
                  onClick={() => forkDraftMutation.mutate()}
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Tạo bản nháp phiên bản mới (v{draft.activeVersionNumber + 1})</span>
                </Button>
              )}
              {draft.workingDraft && (
                <Button
                  variant="ghost"
                  loading={discardDraftMutation.isPending}
                  onClick={() => discardDraftMutation.mutate()}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Hủy nháp v{draft.workingDraft.versionNumber}</span>
                </Button>
              )}
              <Button
                variant="secondary"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="h-4 w-4" />
                <span>
                  {isProtectedTest
                    ? `Lưu bản nháp v${targetPublishVersion}`
                    : 'Lưu bản soạn thảo'}
                </span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="tests.publish">
              <Button
                disabled={validation.errors.length > 0 || !canPublish}
                onClick={() => setPublishConfirmOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Xuất bản v{targetPublishVersion}
                  {validation.errors.length > 0 ? ` (${validation.errors.length} lỗi)` : ''}
                </span>
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* 3 Authoring Tabs */}
      <div className="inline-flex flex-wrap rounded-2xl border border-[#DCEAF3] bg-white p-1.5 text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('metadata')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'metadata' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          1. Thông tin đề & Lịch sử phiên bản ({draft.versionHistory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'questions' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          2. Cấu trúc Part 1–7, Nhóm & Câu hỏi ({validation.computedTotalQuestions})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('publish')}
          className={`rounded-xl px-4 py-2 transition ${
            activeTab === 'publish' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
          }`}
        >
          3. Kiểm định trước xuất bản ({validation.errors.length} lỗi •{' '}
          {validation.warnings.length} cảnh báo)
        </button>
      </div>

      {/* TAB 1: METADATA & VERSION HISTORY */}
      {activeTab === 'metadata' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
            <h2 className="text-base font-extrabold text-[#243B53]">Thông tin chung & Cấu hình đề</h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <InputField
                label="Mã đề thi"
                disabled={!canUpdate}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
              <InputField
                label="Slug đường dẫn"
                disabled={!canUpdate}
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
              <div className="sm:col-span-2">
                <InputField
                  label="Tên đề thi"
                  disabled={!canUpdate}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <SelectField
                label="Loại cấu trúc đề"
                disabled={!canUpdate}
                value={draft.testType}
                onChange={(e) =>
                  setDraft({ ...draft, testType: e.target.value as AuthoringTestType })
                }
                options={[
                  { value: 'Full Test 7 Parts', label: 'Full Test 7 Parts' },
                  { value: 'Mini Test', label: 'Mini Test' },
                  { value: 'Luyện chuyên sâu', label: 'Luyện chuyên sâu' },
                ]}
              />
              <InputField
                label="Thời lượng chuẩn (Phút)"
                type="number"
                min={5}
                disabled={!canUpdate}
                value={draft.durationMinutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    durationMinutes: Math.max(5, Number(e.target.value) || 60),
                  })
                }
              />
              <InputField
                label="Bộ sưu tập (Collection)"
                disabled={!canUpdate}
                value={draft.collectionGroup}
                onChange={(e) => setDraft({ ...draft, collectionGroup: e.target.value })}
              />
              <SelectField
                label="Độ khó hiển thị"
                disabled={!canUpdate}
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft({ ...draft, difficulty: e.target.value as TestDifficulty })
                }
                options={TEST_DIFFICULTIES.map((d) => ({ value: d, label: d }))}
              />
              <div className="sm:col-span-2">
                <SelectField
                  label="Khung thang điểm TOEIC gắn kèm"
                  disabled={!canUpdate}
                  value={draft.scoreScaleVersionCode}
                  onChange={(e) =>
                    setDraft({ ...draft, scoreScaleVersionCode: e.target.value })
                  }
                  options={scaleOptions}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Mô tả giới thiệu đề thi
              </label>
              <textarea
                rows={2}
                disabled={!canUpdate}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Nhập mô tả tóm tắt nội dung, đối tượng luyện đề phù hợp..."
                className="w-full rounded-xl border border-[#DCEAF3] p-3 text-xs outline-none focus:border-[#75BDEB]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                Hướng dẫn làm bài chung (Mỗi dòng 1 quy định)
              </label>
              <textarea
                rows={3}
                disabled={!canUpdate}
                value={draft.generalInstructions.join('\n')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    generalInstructions: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full rounded-xl border border-[#DCEAF3] p-3 text-xs outline-none focus:border-[#75BDEB]"
              />
            </div>

            <div className="space-y-2.5 border-t border-[#EEF4F8] pt-3">
              <label className="flex items-center gap-2 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3 text-xs font-bold text-[#243B53]">
                <input
                  type="checkbox"
                  disabled={!canUpdate}
                  checked={draft.allowPartSelection}
                  onChange={(e) =>
                    setDraft({ ...draft, allowPartSelection: e.target.checked })
                  }
                />
                <span>
                  Cho phép học viên chọn chế độ luyện tập từng Part lẻ
                </span>
              </label>

              <p className="text-xs font-extrabold uppercase text-[#243B53]">
                Quyền chọn lẻ từng Part cụ thể
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {draft.parts.map((part) => (
                  <label
                    key={part.partNumber}
                    className={`flex items-center gap-2 rounded-xl border border-[#DCEAF3] p-2 text-xs font-semibold ${
                      !draft.allowPartSelection ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!canUpdate || !draft.allowPartSelection}
                      checked={part.allowStandaloneSelection}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setDraft({
                          ...draft,
                          parts: draft.parts.map((p) =>
                            p.partNumber === part.partNumber
                              ? { ...p, allowStandaloneSelection: checked }
                              : p,
                          ),
                        })
                      }}
                    />
                    <span>Part {part.partNumber}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
            <h2 className="text-base font-extrabold text-[#243B53]">
              Lịch sử phiên bản đã xuất bản
            </h2>
            {draft.versionHistory.length === 0 ? (
              <p className="rounded-xl bg-[#F8FBFD] p-4 text-xs text-[#64748B]">
                Đề thi này chưa từng xuất bản phiên bản nào.
              </p>
            ) : (
              <div className="space-y-2.5">
                {draft.versionHistory.map((ver) => (
                  <div
                    key={ver.versionCode}
                    className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Badge tone="success">{ver.versionCode}</Badge>
                        {ver.partsSnapshot && ver.answerKeysSnapshot && (
                          <Badge tone="info">Đã khóa Snapshot</Badge>
                        )}
                      </div>
                      <span className="text-[#64748B]">{formatDateTimeVi(ver.publishedAt)}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-[#243B53]">{ver.changeNote}</p>
                    <p className="mt-1 text-[#64748B]">
                      Số câu: <strong>{ver.totalQuestions}</strong> • Khung điểm:{' '}
                      <code>{ver.scoreScaleVersionCode}</code> • Bởi: {ver.publishedBy}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PART 1-7 & QUESTION GROUPS & QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Thanh chọn Part */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCEAF3] bg-white p-3.5 shadow-2xs">
            {draft.parts.map((part) => {
              const qCount = part.groups.reduce((s, g) => s + g.questions.length, 0)
              const active = part.partNumber === selectedPart.partNumber
              return (
                <button
                  key={part.partNumber}
                  type="button"
                  onClick={() => setSelectedPartNum(part.partNumber)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-[#2878B8] text-white shadow-2xs'
                      : 'border border-[#DCEAF3] bg-[#F8FBFD] text-[#243B53] hover:bg-[#EAF6FD]'
                  }`}
                >
                  Part {part.partNumber} • {part.section === 'listening' ? 'LC' : 'RC'} ({qCount}{' '}
                  câu)
                </button>
              )
            })}
          </div>

          {/* Header của Part đang chọn */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">{selectedPart.partName}</h2>
              <p className="text-xs text-[#64748B]">
                {selectedPart.groupedMode
                  ? 'Cấu trúc chùm câu hỏi dùng chung đoạn hội thoại / bài nói / đoạn văn đọc hiểu.'
                  : selectedPart.partNumber === 2
                    ? 'Cấu trúc câu hỏi đơn 3 lựa chọn (A, B, C) chuẩn TOEIC Part 2.'
                    : 'Cấu trúc câu hỏi đơn 4 lựa chọn (A, B, C, D).'}
              </p>
            </div>
            <ActionGuard permission="tests.update">
              <Button size="sm" onClick={() => handleAddGroup(selectedPart.partNumber)}>
                <Plus className="h-4 w-4" />
                <span>
                  {selectedPart.groupedMode
                    ? `Thêm Nhóm câu hỏi Part ${selectedPart.partNumber}`
                    : `Thêm Câu hỏi đơn Part ${selectedPart.partNumber}`}
                </span>
              </Button>
            </ActionGuard>
          </div>

          {selectedPart.groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DCEAF3] bg-white p-10 text-center text-sm text-[#64748B]">
              {selectedPart.partName} hiện chưa có câu hỏi nào. Nhấn nút Thêm ở góc phải để bắt đầu
              soạn thảo.
            </div>
          ) : (
            <div className="space-y-4">
              {selectedPart.groups.map((grp, grpIdx) => (
                <div
                  key={grp.id}
                  className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
                >
                  {/* Group Header */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF4F8] pb-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="info">
                        {selectedPart.groupedMode
                          ? `Nhóm #${grpIdx + 1} (${grp.questions.length} câu)`
                          : `Khung câu đơn #${grpIdx + 1}`}
                      </Badge>
                    </div>
                    <ActionGuard permission="tests.update">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={grpIdx === 0}
                          onClick={() => handleMoveGroup(selectedPart.partNumber, grpIdx, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={grpIdx === selectedPart.groups.length - 1}
                          onClick={() => handleMoveGroup(selectedPart.partNumber, grpIdx, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        {selectedPart.groupedMode && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleAddQuestionToGroup(selectedPart.partNumber, grp.id)
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Thêm câu vào nhóm</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteGroup(selectedPart.partNumber, grp)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </ActionGuard>
                  </div>

                  {/* Group-level Stimulus (Parts 3, 4, 6, 7) */}
                  {selectedPart.groupedMode && (
                    <div className="mb-4 space-y-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
                      <InputField
                        label="Tiêu đề nhóm câu hỏi"
                        disabled={!canUpdate}
                        value={grp.groupTitle}
                        onChange={(e) => {
                          const title = e.target.value
                          updatePartsAndKeys(
                            draft.parts.map((p) =>
                              p.partNumber === selectedPart.partNumber
                                ? {
                                    ...p,
                                    groups: p.groups.map((g) =>
                                      g.id === grp.id ? { ...g, groupTitle: title } : g,
                                    ),
                                  }
                                : p,
                            ),
                          )
                        }}
                      />

                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                          {selectedPart.partNumber <= 4
                            ? 'Bảng biểu / Lịch trình dạng văn bản đi kèm (Graphic Schedule – Tùy chọn cho Part 3 & 4)'
                            : 'Nội dung đoạn văn đọc hiểu chính (Passage Text 1)'}
                        </label>
                        <textarea
                          rows={selectedPart.partNumber <= 4 ? 3 : 4}
                          disabled={!canUpdate}
                          value={grp.passageText}
                          placeholder={
                            selectedPart.partNumber <= 4
                              ? 'Nhập bảng biểu / lịch trình tham chiếu cho câu hỏi Look at the graphic (nếu có)...'
                              : 'Nhập nội dung văn bản đọc hiểu...'
                          }
                          onChange={(e) => {
                            const passage = e.target.value
                            updatePartsAndKeys(
                              draft.parts.map((p) =>
                                p.partNumber === selectedPart.partNumber
                                  ? {
                                      ...p,
                                      groups: p.groups.map((g) => {
                                        if (g.id !== grp.id) return g
                                        const second = g.passages?.[1]?.trim()
                                        const extra = g.passages?.slice(2) ?? []
                                        const nextPassages = second
                                          ? [passage, g.passages![1]!, ...extra]
                                          : undefined
                                        return {
                                          ...g,
                                          passageText: passage,
                                          passages: nextPassages,
                                        }
                                      }),
                                    }
                                  : p,
                              ),
                            )
                          }}
                          className="w-full rounded-xl border border-[#DCEAF3] bg-white p-3 text-xs outline-none focus:border-[#75BDEB]"
                        />
                      </div>

                      {selectedPart.partNumber === 7 && (
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-[#243B53]">
                            Đoạn văn thứ 2 (Double Passage – Tùy chọn cho Part 7)
                          </label>
                          <textarea
                            rows={3}
                            disabled={!canUpdate}
                            value={grp.passages?.[1] ?? ''}
                            placeholder="Nhập đoạn văn thứ 2 (Email phản hồi / Hóa đơn / Thông báo đính kèm) nếu là bài đọc ghép..."
                            onChange={(e) => {
                              const secondPassage = e.target.value
                              updatePartsAndKeys(
                                draft.parts.map((p) =>
                                  p.partNumber === selectedPart.partNumber
                                    ? {
                                        ...p,
                                        groups: p.groups.map((g) => {
                                          if (g.id !== grp.id) return g
                                          const extra = g.passages?.slice(2) ?? []
                                          const nextPassages =
                                            secondPassage.trim() || extra.length > 0
                                              ? [g.passageText, secondPassage, ...extra]
                                              : undefined
                                          return {
                                            ...g,
                                            passages: nextPassages,
                                          }
                                        }),
                                      }
                                    : p,
                                ),
                              )
                            }}
                            className="w-full rounded-xl border border-[#DCEAF3] bg-white p-3 text-xs outline-none focus:border-[#75BDEB]"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {selectedPart.section === 'listening' && (
                          <MediaUploadBox
                            label="Âm thanh dùng chung cho Nhóm (Part 3 / Part 4)"
                            kind="audio"
                            disabled={!canUpdate}
                            value={
                              grp.audioUrl
                                ? {
                                    id: `gaud-${grp.id}`,
                                    kind: 'audio',
                                    fileName: `group-audio-${grp.id}.wav`,
                                    mimeType: 'audio/wav',
                                    durationSec: grp.audioDurationSeconds,
                                    url: grp.audioUrl,
                                    status: 'temporary',
                                  }
                                : null
                            }
                            onChange={(media) => {
                              if (rejectFailedMedia(media?.status)) return
                              updatePartsAndKeys(
                                draft.parts.map((p) =>
                                  p.partNumber === selectedPart.partNumber
                                    ? {
                                        ...p,
                                        groups: p.groups.map((g) =>
                                          g.id === grp.id
                                            ? {
                                                ...g,
                                                audioUrl: media?.url ?? '',
                                                audioDurationSeconds: media?.durationSec,
                                              }
                                            : g,
                                        ),
                                      }
                                    : p,
                                ),
                              )
                            }}
                          />
                        )}

                        <MediaUploadBox
                          label="Bảng biểu / Hình ảnh dùng chung cho Nhóm (Tùy chọn)"
                          kind="image"
                          disabled={!canUpdate}
                          value={
                            grp.imageUrl
                              ? {
                                  id: `gimg-${grp.id}`,
                                  kind: 'image',
                                  fileName: `group-img-${grp.id}.jpg`,
                                  mimeType: 'image/jpeg',
                                  url: grp.imageUrl,
                                  status: 'ready',
                                }
                              : null
                          }
                          onChange={(media) => {
                            if (rejectFailedMedia(media?.status)) return
                            updatePartsAndKeys(
                              draft.parts.map((p) =>
                                p.partNumber === selectedPart.partNumber
                                  ? {
                                      ...p,
                                      groups: p.groups.map((g) =>
                                        g.id === grp.id
                                          ? { ...g, imageUrl: media?.url ?? '' }
                                          : g,
                                      ),
                                    }
                                  : p,
                              ),
                            )
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Questions inside Group */}
                  <div className="space-y-4">
                    {grp.questions.map((q) => {
                      const key = draft.answerKeys[q.id] ?? {
                        questionId: q.id,
                        correctOptionId: q.options[0]?.id ?? '',
                        explanation: '',
                        transcript: '',
                      }
                      return (
                        <div
                          key={q.id}
                          className="rounded-xl border border-[#DCEAF3] bg-[#FCFEFF] p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="min-w-0 text-sm font-extrabold text-[#2878B8]">
                              Câu #{q.questionNumber}
                            </span>
                            <ActionGuard permission="tests.update">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    handleDuplicateQuestion(selectedPart.partNumber, grp.id, q)
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Nhân bản</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteQuestion(selectedPart.partNumber, grp, q.id)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[#B93A2E]" />
                                </Button>
                              </div>
                            </ActionGuard>
                          </div>

                          <div className="space-y-3">
                            <InputField
                              label={
                                selectedPart.partNumber <= 2
                                  ? 'Nội dung câu hỏi (Để trống với Part 1 & Part 2 chuẩn ETS)'
                                  : 'Nội dung câu hỏi (Bắt buộc với Part 3–7)'
                              }
                              disabled={!canUpdate}
                              value={q.questionText}
                              onChange={(e) => {
                                const text = e.target.value
                                updatePartsAndKeys(
                                  draft.parts.map((p) =>
                                    p.partNumber === selectedPart.partNumber
                                      ? {
                                          ...p,
                                          groups: p.groups.map((g) =>
                                            g.id === grp.id
                                              ? {
                                                  ...g,
                                                  questions: g.questions.map((item) =>
                                                    item.id === q.id
                                                      ? { ...item, questionText: text }
                                                      : item,
                                                  ),
                                                }
                                              : g,
                                          ),
                                        }
                                      : p,
                                  ),
                                )
                              }}
                            />

                            {!selectedPart.groupedMode && (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {selectedPart.section === 'listening' && (
                                  <MediaUploadBox
                                    label="Tệp âm thanh câu hỏi (Bắt buộc cho Part 1 & Part 2)"
                                    kind="audio"
                                    disabled={!canUpdate}
                                    value={
                                      q.audioUrl
                                        ? {
                                            id: `qaud-${q.id}`,
                                            kind: 'audio',
                                            fileName: `q-${q.questionNumber}.wav`,
                                            mimeType: 'audio/wav',
                                            durationSec: q.audioDurationSeconds,
                                            url: q.audioUrl,
                                            status: 'temporary',
                                          }
                                        : null
                                    }
                                    onChange={(media) => {
                                      if (rejectFailedMedia(media?.status)) return
                                      updatePartsAndKeys(
                                        draft.parts.map((p) =>
                                          p.partNumber === selectedPart.partNumber
                                            ? {
                                                ...p,
                                                groups: p.groups.map((g) =>
                                                  g.id === grp.id
                                                    ? {
                                                        ...g,
                                                        questions: g.questions.map((item) =>
                                                          item.id === q.id
                                                            ? {
                                                                ...item,
                                                                audioUrl: media?.url ?? '',
                                                                audioDurationSeconds:
                                                                  media?.durationSec,
                                                              }
                                                            : item,
                                                        ),
                                                      }
                                                    : g,
                                                ),
                                              }
                                            : p,
                                        ),
                                      )
                                    }}
                                  />
                                )}

                                {selectedPart.partNumber === 1 && (
                                  <MediaUploadBox
                                    label="Hình ảnh mô tả Part 1 (Bắt buộc)"
                                    kind="image"
                                    disabled={!canUpdate}
                                    value={
                                      q.imageUrl
                                        ? {
                                            id: `qimg-${q.id}`,
                                            kind: 'image',
                                            fileName: `p1-q${q.questionNumber}.jpg`,
                                            mimeType: 'image/jpeg',
                                            url: q.imageUrl,
                                            status: 'ready',
                                          }
                                        : null
                                    }
                                    onChange={(media) => {
                                      if (rejectFailedMedia(media?.status)) return
                                      updatePartsAndKeys(
                                        draft.parts.map((p) =>
                                          p.partNumber === selectedPart.partNumber
                                            ? {
                                                ...p,
                                                groups: p.groups.map((g) =>
                                                  g.id === grp.id
                                                    ? {
                                                        ...g,
                                                        questions: g.questions.map((item) =>
                                                          item.id === q.id
                                                            ? {
                                                                ...item,
                                                                imageUrl: media?.url ?? '',
                                                              }
                                                            : item,
                                                        ),
                                                      }
                                                    : g,
                                                ),
                                              }
                                            : p,
                                        ),
                                      )
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            {/* Options */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {q.options.map((opt) => (
                                <InputField
                                  key={opt.id}
                                  label={`Đáp án ${opt.label}${
                                    selectedPart.partNumber <= 2
                                      ? ' (Có thể để trống nếu đọc trong băng)'
                                      : ''
                                  }`}
                                  disabled={!canUpdate}
                                  value={opt.text}
                                  onChange={(e) => {
                                    const text = e.target.value
                                    updatePartsAndKeys(
                                      draft.parts.map((p) =>
                                        p.partNumber === selectedPart.partNumber
                                          ? {
                                              ...p,
                                              groups: p.groups.map((g) =>
                                                g.id === grp.id
                                                  ? {
                                                      ...g,
                                                      questions: g.questions.map((item) =>
                                                        item.id === q.id
                                                          ? {
                                                              ...item,
                                                              options: item.options.map((o) =>
                                                                o.id === opt.id ? { ...o, text } : o,
                                                              ),
                                                            }
                                                          : item,
                                                      ),
                                                    }
                                                  : g,
                                              ),
                                            }
                                          : p,
                                      ),
                                    )
                                  }}
                                />
                              ))}
                            </div>

                            {/* Separated Answer Key */}
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#A7F3D0] bg-[#E3F5EC]/40 p-3 sm:grid-cols-3">
                              <SelectField
                                label="Đáp án đúng"
                                disabled={!canUpdate}
                                value={key.correctOptionId}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    answerKeys: {
                                      ...draft.answerKeys,
                                      [q.id]: { ...key, correctOptionId: e.target.value },
                                    },
                                  })
                                }
                                options={q.options.map((o) => ({
                                  value: o.id,
                                  label: `Đáp án ${o.label}`,
                                }))}
                              />
                              <div className="sm:col-span-2">
                                <InputField
                                  label="Lời giải thích đáp án (Ẩn trong lúc thí sinh làm bài)"
                                  disabled={!canUpdate}
                                  value={key.explanation}
                                  onChange={(e) =>
                                    setDraft({
                                      ...draft,
                                      answerKeys: {
                                        ...draft.answerKeys,
                                        [q.id]: { ...key, explanation: e.target.value },
                                      },
                                    })
                                  }
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <InputField
                                  label="Lời thoại băng nghe (Tùy chọn – Hiển thị sau khi nộp bài)"
                                  disabled={!canUpdate}
                                  value={key.transcript ?? ''}
                                  onChange={(e) =>
                                    setDraft({
                                      ...draft,
                                      answerKeys: {
                                        ...draft.answerKeys,
                                        [q.id]: { ...key, transcript: e.target.value },
                                      },
                                    })
                                  }
                                  placeholder="Nhập lời thoại câu hỏi / hội thoại nếu có..."
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <label className="mb-1 block text-xs font-bold text-[#243B53]">
                                  Dịch nghĩa tiếng Việt (Hiển thị sau khi nộp bài)
                                </label>
                                <textarea
                                  rows={2}
                                  disabled={!canUpdate}
                                  value={key.translation ?? ''}
                                  onChange={(e) =>
                                    setDraft({
                                      ...draft,
                                      answerKeys: {
                                        ...draft.answerKeys,
                                        [q.id]: { ...key, translation: e.target.value },
                                      },
                                    })
                                  }
                                  placeholder="Nhập bản dịch tiếng Việt của câu hỏi / đoạn văn..."
                                  className="w-full rounded-xl border border-[#DCEAF3] bg-white p-2.5 text-xs outline-none focus:border-[#75BDEB]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRE-PUBLISH VALIDATOR */}
      {activeTab === 'publish' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#243B53]">
                  Kiểm định điều kiện trước xuất bản
                </h2>
                <p className="text-xs text-[#64748B]">
                  Đề thi chỉ được phép xuất bản khi không còn lỗi bắt buộc cần khắc phục.
                </p>
              </div>
              {validation.errors.length === 0 ? (
                <Badge tone="success">Sẵn sàng xuất bản v{targetPublishVersion}</Badge>
              ) : (
                <Badge tone="danger">Chưa đạt điều kiện ({validation.errors.length} lỗi)</Badge>
              )}
            </div>

            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5 text-xs font-semibold text-[#1F7A4C]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Đề thi đã đạt toàn bộ điều kiện kiểm định và sẵn sàng xuất bản.</span>
              </div>
            )}

            {validation.errors.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-extrabold uppercase text-[#B93A2E]">
                  1. Lỗi bắt buộc phải khắc phục ({validation.errors.length})
                </p>
                {validation.errors.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs text-[#B93A2E]"
                  >
                    <div className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                    {issue.partNumber && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedPartNum(issue.partNumber!)
                          setActiveTab('questions')
                        }}
                      >
                        Mở Part {issue.partNumber}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-extrabold uppercase text-[#9E6300]">
                  2. Cảnh báo khuyến nghị ({validation.warnings.length} – Không chặn xuất bản)
                </p>
                {validation.warnings.map((warn) => (
                  <div
                    key={warn.id}
                    className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#78350F]"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                    <span>{warn.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <TestPreviewModal
        open={previewOpen}
        test={draft}
        onClose={() => setPreviewOpen(false)}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        title={`Xác nhận Xuất bản Đề thi v${targetPublishVersion}`}
        description={
          <div className="space-y-3">
            <p>
              Phiên bản <strong>{draft.code}@v{targetPublishVersion}</strong> sẽ được phát hành
              chính thức và gắn với khung thang điểm <code>{draft.scoreScaleVersionCode}</code>.
            </p>
            <InputField
              label="Ghi chú phát hành phiên bản"
              value={publishChangeNote}
              onChange={(e) => setPublishChangeNote(e.target.value)}
            />
          </div>
        }
        confirmLabel={`Xuất bản v${targetPublishVersion} ngay`}
        loading={publishMutation.isPending}
        onClose={() => setPublishConfirmOpen(false)}
        onConfirm={() => publishMutation.mutate()}
      />
    </div>
  )
}
