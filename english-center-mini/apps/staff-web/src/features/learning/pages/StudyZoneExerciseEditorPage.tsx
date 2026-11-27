import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  EmptyBlock,
  ErrorBlock,
  InputField,
  LoadingBlock,
  Modal,
  SelectField,
} from '@english-center/ui'
import { STUDY_LEVELS, type StudyLevel } from '@english-center/contracts'
import { slugifyVi } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  learningApi,
  validateStudyExerciseForPublish,
} from '@/features/learning/api/learningApi'
import type {
  LearningContentStatus,
  ManagedStudyExerciseRecord,
  StudyQuestionPublicItem,
} from '@/features/learning/types/learning.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { MediaUploadBox } from '@/shared/components/MediaUploadBox'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { createUniqueId } from '@/shared/utils/staffFormatters'

const STATUS_META: Record<
  LearningContentStatus,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  published: { label: 'Đang xuất bản', tone: 'success' },
  draft: { label: 'Bản nháp', tone: 'warning' },
  hidden: { label: 'Đang ẩn', tone: 'neutral' },
  archived: { label: 'Lưu trữ', tone: 'neutral' },
}

export function StudyZoneExerciseEditorPage() {
  const { exerciseId = '' } = useParams()
  useDocumentTitle('Biên tập Study Zone')
  const { user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const canUpdate = hasPermission(user, 'study_zone.update')
  const canPublish = hasPermission(user, 'study_zone.publish')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'sz', 'exercise', exerciseId],
    queryFn: () => learningApi.getSzExerciseById(exerciseId),
    enabled: Boolean(exerciseId),
  })

  const { data: allExercises = [] } = useQuery({
    queryKey: ['staff', 'sz', 'exercises'],
    queryFn: () => learningApi.listSzExercises(),
  })

  const { data: allTopics = [] } = useQuery({
    queryKey: ['staff', 'sz', 'topics'],
    queryFn: () => learningApi.listSzTopics(),
  })

  const [editedDraft, setEditedDraft] = useState<ManagedStudyExerciseRecord | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewPicks, setPreviewPicks] = useState<Record<string, string>>({})
  const [previewSubmitted, setPreviewSubmitted] = useState(false)
  const [focusedPreviewQId, setFocusedPreviewQId] = useState<string | null>(null)

  const draft = editedDraft && editedDraft.id === data?.id ? editedDraft : (data ?? null)
  const setDraft = (next: ManagedStudyExerciseRecord) => setEditedDraft(next)

  const saveMutation = useMutation({
    mutationFn: (overrideStatus?: LearningContentStatus) => {
      if (!draft) throw new Error('Chưa tải dữ liệu bài tập.')
      const effectiveStatus: LearningContentStatus = canPublish
        ? (overrideStatus ?? draft.status)
        : 'draft'
      return learningApi.saveSzExercise({
        ...draft,
        status: effectiveStatus,
      })
    },
    onSuccess: (saved) => {
      setEditedDraft(saved)
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sz', 'exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'sz', 'exercise', exerciseId] })
      notify({
        tone: 'success',
        title: `Đã lưu bài luyện tập (${STATUS_META[saved.status].label})`,
        description: `${saved.title} (${saved.questions.length} câu hỏi)`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Chưa thể xuất bản / lưu bài tập',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại dữ liệu.',
      })
    },
  })

  if (isLoading || !draft) return <LoadingBlock label="Đang tải trình biên tập câu hỏi..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không tìm thấy bài luyện tập cần biên tập."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const categoryTopics = allTopics.filter((t) => t.category === draft.category)
  const validationErrors = validateStudyExerciseForPublish(draft, {
    existingExercises: allExercises,
    topics: allTopics,
  })

  const previewCorrectCount = draft.questions.filter((q) => {
    const picked = previewPicks[q.id]
    if (!picked) return false
    return draft.answerKeys[q.id]?.correctOptionId === picked
  }).length
  const previewScore10 =
    draft.questions.length > 0
      ? ((previewCorrectCount / draft.questions.length) * 10).toFixed(1)
      : '0.0'

  const addQuestion = () => {
    const qId = createUniqueId('szq')
    const newQ: StudyQuestionPublicItem = {
      id: qId,
      displayOrder: draft.questions.length + 1,
      questionText: '',
      imageUrl: '',
      audioUrl: '',
      options: [
        { id: `${qId}-a`, label: 'A', text: '' },
        { id: `${qId}-b`, label: 'B', text: '' },
        { id: `${qId}-c`, label: 'C', text: '' },
        { id: `${qId}-d`, label: 'D', text: '' },
      ],
    }
    setDraft({
      ...draft,
      questions: [...draft.questions, newQ],
      answerKeys: {
        ...draft.answerKeys,
        [qId]: {
          questionId: qId,
          correctOptionId: `${qId}-a`,
          explanation: '',
          audioTranscript: '',
          audioTranslation: '',
        },
      },
    })
  }

  const duplicateQuestion = (q: StudyQuestionPublicItem) => {
    const qId = createUniqueId('szq')
    const prevKey = draft.answerKeys[q.id]
    const oldSelectedIdx = q.options.findIndex((o) => o.id === prevKey?.correctOptionId)
    const clonedOptions = q.options.map((opt) => ({
      ...opt,
      id: `${qId}-${opt.label.toLowerCase()}`,
    }))
    const newCorrectId = clonedOptions[Math.max(0, oldSelectedIdx)]?.id ?? `${qId}-a`

    const cloned: StudyQuestionPublicItem = {
      ...q,
      id: qId,
      displayOrder: draft.questions.length + 1,
      options: clonedOptions,
    }

    setDraft({
      ...draft,
      questions: [...draft.questions, cloned],
      answerKeys: {
        ...draft.answerKeys,
        [qId]: {
          questionId: qId,
          correctOptionId: newCorrectId,
          explanation: prevKey?.explanation ?? '',
          audioTranscript: prevKey?.audioTranscript ?? '',
          audioTranslation: prevKey?.audioTranslation ?? '',
        },
      },
    })
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= draft.questions.length) return
    const cloned = [...draft.questions]
    const cur = cloned[idx]
    const target = cloned[nextIdx]
    if (!cur || !target) return
    cloned[idx] = target
    cloned[nextIdx] = cur
    setDraft({
      ...draft,
      questions: cloned.map((item, i) => ({ ...item, displayOrder: i + 1 })),
    })
  }

  const removeQuestion = (qId: string) => {
    const nextKeys = { ...draft.answerKeys }
    delete nextKeys[qId]
    setDraft({
      ...draft,
      questions: draft.questions
        .filter((q) => q.id !== qId)
        .map((q, i) => ({ ...q, displayOrder: i + 1 })),
      answerKeys: nextKeys,
    })
  }

  const scrollToPreviewQuestion = (qId: string) => {
    setFocusedPreviewQId(qId)
    requestAnimationFrame(() => {
      document.getElementById(`sz-preview-q-${qId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  const currentBadge = STATUS_META[draft.status]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/learning/study-zone"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách Study Zone</span>
        </Link>
      </div>

      <PageHeader
        title={draft.title}
        description={`Mã bài: ${draft.code} • Danh mục: /study-zone/${draft.category} • Luyện tập: /study-zone/practice/${draft.id} • Chủ đề: ${draft.topicTitle}`}
        badge={<Badge tone={currentBadge.tone}>{currentBadge.label}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewPicks({})
                setPreviewSubmitted(false)
                setFocusedPreviewQId(null)
                setPreviewOpen(true)
              }}
            >
              <Eye className="h-4 w-4" />
              <span>Xem thử giao diện Học viên</span>
            </Button>

            <ActionGuard permission="study_zone.update">
              <Button
                variant="secondary"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(canPublish ? draft.status : 'draft')}
              >
                <Save className="h-4 w-4" />
                <span>{canPublish ? 'Lưu cấu hình & câu hỏi' : 'Lưu bản nháp'}</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="study_zone.publish">
              <Button
                disabled={validationErrors.length > 0}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate('published')}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Xuất bản bài tập</span>
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {validationErrors.length > 0 && (
        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs text-[#78350F]">
          <p className="font-extrabold">
            Cần hoàn thiện {validationErrors.length} điều kiện trước khi Xuất bản:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {validationErrors.map((errText) => (
              <li key={errText}>{errText}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-3.5 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <h2 className="text-base font-extrabold text-[#243B53]">
          Thông tin bài luyện tập & Trạng thái phát hành
        </h2>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <InputField
            label="Mã bài luyện tập"
            disabled={!canUpdate}
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
          />
          <InputField
            label="Mã định danh Slug"
            disabled={!canUpdate}
            value={draft.slug}
            onChange={(e) =>
              setDraft({ ...draft, slug: slugifyVi(e.target.value) })
            }
          />
          <SelectField
            label="Trạng thái phát hành"
            disabled={!canUpdate || !canPublish}
            value={canPublish ? draft.status : 'draft'}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as LearningContentStatus })
            }
            options={[
              { value: 'draft', label: 'Bản nháp' },
              { value: 'published', label: 'Đang xuất bản' },
              { value: 'hidden', label: 'Đang ẩn' },
              { value: 'archived', label: 'Lưu trữ' },
            ]}
          />
          <InputField
            label="Tiêu đề bài luyện tập"
            disabled={!canUpdate}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <InputField
            label="Phụ đề / Chủ điểm nhỏ"
            disabled={!canUpdate}
            value={draft.subtitle}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
          />
          <SelectField
            label="Chủ đề thuộc danh mục"
            disabled={!canUpdate}
            value={draft.topicId}
            onChange={(e) => {
              const tId = e.target.value
              const matched = categoryTopics.find((t) => t.id === tId)
              setDraft({
                ...draft,
                topicId: tId,
                topicSlug: matched?.slug ?? draft.topicSlug,
                topicTitle: matched?.title ?? draft.topicTitle,
              })
            }}
            options={
              categoryTopics.length > 0
                ? categoryTopics.map((t) => ({ value: t.id, label: t.title }))
                : [{ value: draft.topicId, label: draft.topicTitle || 'Chưa có chủ đề' }]
            }
          />
          <SelectField
            label="Trình độ gợi ý"
            disabled={!canUpdate}
            value={draft.level}
            onChange={(e) => setDraft({ ...draft, level: e.target.value as StudyLevel })}
            options={STUDY_LEVELS.map((lv) => ({ value: lv, label: lv }))}
          />
          <InputField
            label="Thời lượng gợi ý (Phút)"
            type="number"
            min={1}
            disabled={!canUpdate}
            value={draft.durationMinutes}
            onChange={(e) =>
              setDraft({ ...draft, durationMinutes: Math.max(1, Number(e.target.value) || 5) })
            }
          />
          <InputField
            label="Hướng dẫn làm bài"
            disabled={!canUpdate}
            value={draft.instructions}
            onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
            placeholder="VD: Chọn đáp án đúng nhất A, B, C hoặc D."
          />
          <div className="md:col-span-3">
            <InputField
              label="Mô tả tóm tắt bài luyện tập"
              disabled={!canUpdate}
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Mô tả trọng tâm kiến thức của bài luyện tập..."
            />
          </div>
        </div>
      </div>

      {/* Danh sách câu hỏi */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="min-w-0 text-base font-extrabold text-[#243B53]">
            Danh sách câu hỏi ({draft.questions.length})
          </h2>
          <ActionGuard permission="study_zone.update">
            <Button size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
              <span>Thêm câu hỏi</span>
            </Button>
          </ActionGuard>
        </div>

        {draft.questions.length === 0 ? (
          <EmptyBlock
            title="Chưa có câu hỏi nào"
            description="Nhấn Thêm câu hỏi để bắt đầu biên tập."
          />
        ) : null}

        {draft.questions.map((q, idx) => {
          const answerKey = draft.answerKeys[q.id] ?? {
            questionId: q.id,
            correctOptionId: q.options[0]?.id ?? '',
            explanation: '',
            audioTranscript: '',
          }

          return (
            <div
              key={q.id}
              className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF4F8] pb-3">
                <Badge tone="info">Câu hỏi #{idx + 1}</Badge>
                <ActionGuard permission="study_zone.update">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === draft.questions.length - 1}
                      onClick={() => moveQuestion(idx, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => duplicateQuestion(q)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Nhân bản</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </ActionGuard>
              </div>

              <div className="space-y-4">
                <InputField
                  label="Nội dung câu hỏi"
                  disabled={!canUpdate}
                  value={q.questionText}
                  onChange={(e) => {
                    const text = e.target.value
                    setDraft({
                      ...draft,
                      questions: draft.questions.map((item) =>
                        item.id === q.id ? { ...item, questionText: text } : item,
                      ),
                    })
                  }}
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <MediaUploadBox
                    label="Âm thanh câu hỏi (Tùy chọn / Bắt buộc với Listening)"
                    kind="audio"
                    disabled={!canUpdate}
                    value={
                      q.audioUrl
                        ? {
                            id: `aud-${q.id}`,
                            kind: 'audio',
                            fileName: `question-${idx + 1}.wav`,
                            mimeType: 'audio/wav',
                            durationSec: q.audioDurationSeconds,
                            url: q.audioUrl,
                            status: 'temporary',
                          }
                        : null
                    }
                    onChange={(media) => {
                      if (media?.status === 'failed') {
                        notify({
                          tone: 'error',
                          title: 'Tệp âm thanh lỗi',
                          description: 'Không thể đính kèm tệp âm thanh bị lỗi.',
                        })
                        return
                      }
                      setDraft({
                        ...draft,
                        questions: draft.questions.map((item) =>
                          item.id === q.id
                            ? {
                                ...item,
                                audioUrl: media?.url ?? '',
                                audioDurationSeconds: media?.durationSec,
                              }
                            : item,
                        ),
                      })
                    }}
                  />

                  <MediaUploadBox
                    label="Hình minh họa câu hỏi (Tùy chọn)"
                    kind="image"
                    disabled={!canUpdate}
                    value={
                      q.imageUrl
                        ? {
                            id: `img-${q.id}`,
                            kind: 'image',
                            fileName: `question-${idx + 1}.jpg`,
                            mimeType: 'image/jpeg',
                            url: q.imageUrl,
                            status: 'ready',
                          }
                        : null
                    }
                    onChange={(media) => {
                      if (media?.status === 'failed') {
                        notify({
                          tone: 'error',
                          title: 'Hình ảnh lỗi',
                          description: 'Không thể đính kèm hình ảnh bị lỗi.',
                        })
                        return
                      }
                      setDraft({
                        ...draft,
                        questions: draft.questions.map((item) =>
                          item.id === q.id ? { ...item, imageUrl: media?.url ?? '' } : item,
                        ),
                      })
                    }}
                  />
                </div>

                {/* 2 đến 4 lựa chọn A-D */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase text-[#243B53]">
                      Các lựa chọn đáp án ({q.options.length} lựa chọn – Hỗ trợ 2, 3 hoặc 4 đáp án)
                    </span>
                    <ActionGuard permission="study_zone.update">
                      <div className="flex items-center gap-1.5">
                        {q.options.length < 4 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const nextLabels: readonly ('A' | 'B' | 'C' | 'D')[] = [
                                'A',
                                'B',
                                'C',
                                'D',
                              ]
                              const nextLabel = nextLabels[q.options.length] ?? 'D'
                              const addedOpt = {
                                id: `${q.id}-${nextLabel.toLowerCase()}`,
                                label: nextLabel,
                                text: '',
                              }
                              setDraft({
                                ...draft,
                                questions: draft.questions.map((item) =>
                                  item.id === q.id
                                    ? { ...item, options: [...item.options, addedOpt] }
                                    : item,
                                ),
                              })
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>
                              Thêm lựa chọn {(['A', 'B', 'C', 'D'] as const)[q.options.length]}
                            </span>
                          </Button>
                        )}
                        {q.options.length > 2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const removed = q.options[q.options.length - 1]
                              const nextOptions = q.options.slice(0, -1)
                              const nextCorrect =
                                answerKey.correctOptionId === removed?.id
                                  ? (nextOptions[0]?.id ?? '')
                                  : answerKey.correctOptionId
                              setDraft({
                                ...draft,
                                questions: draft.questions.map((item) =>
                                  item.id === q.id ? { ...item, options: nextOptions } : item,
                                ),
                                answerKeys: {
                                  ...draft.answerKeys,
                                  [q.id]: { ...answerKey, correctOptionId: nextCorrect },
                                },
                              })
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-[#B93A2E]" />
                            <span className="text-[#B93A2E]">
                              Bớt lựa chọn {q.options[q.options.length - 1]?.label}
                            </span>
                          </Button>
                        )}
                      </div>
                    </ActionGuard>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <InputField
                        key={opt.id}
                        label={`Lựa chọn ${opt.label}`}
                        disabled={!canUpdate}
                        value={opt.text}
                        onChange={(e) => {
                          const text = e.target.value
                          setDraft({
                            ...draft,
                            questions: draft.questions.map((item) =>
                              item.id === q.id
                                ? {
                                    ...item,
                                    options: item.options.map((o) =>
                                      o.id === opt.id ? { ...o, text } : o,
                                    ),
                                  }
                                : item,
                            ),
                          })
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#A7F3D0] bg-[#E3F5EC]/40 p-3.5 sm:grid-cols-3">
                  <SelectField
                    label="Đáp án đúng"
                    disabled={!canUpdate}
                    value={answerKey.correctOptionId}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        answerKeys: {
                          ...draft.answerKeys,
                          [q.id]: { ...answerKey, correctOptionId: e.target.value },
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
                      label="Giải thích đáp án chi tiết (Hiển thị sau khi nộp bài)"
                      disabled={!canUpdate}
                      value={answerKey.explanation}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          answerKeys: {
                            ...draft.answerKeys,
                            [q.id]: { ...answerKey, explanation: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <InputField
                      label="Lời thoại băng nghe (Tùy chọn – Hiển thị sau khi nộp bài)"
                      disabled={!canUpdate}
                      value={answerKey.audioTranscript ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          answerKeys: {
                            ...draft.answerKeys,
                            [q.id]: { ...answerKey, audioTranscript: e.target.value },
                          },
                        })
                      }
                      placeholder="Nhập lời thoại băng nghe của câu hỏi này (nếu có)..."
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-bold text-[#243B53]">
                      Dịch nghĩa tiếng Việt (Hiển thị sau khi nộp bài)
                    </label>
                    <textarea
                      rows={2}
                      disabled={!canUpdate}
                      value={answerKey.audioTranslation ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          answerKeys: {
                            ...draft.answerKeys,
                            [q.id]: { ...answerKey, audioTranslation: e.target.value },
                          },
                        })
                      }
                      placeholder="Nhập bản dịch tiếng Việt cho lời thoại hoặc câu hỏi..."
                      className="w-full rounded-xl border border-[#DCEAF3] bg-white p-2.5 text-xs outline-none focus:border-[#75BDEB]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Xem thử bài luyện tập góc nhìn Học viên */}
      <Modal
        open={previewOpen}
        title={`Xem thử giao diện Học viên – ${draft.title}`}
        onClose={() => setPreviewOpen(false)}
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPreviewPicks({})
                setPreviewSubmitted(false)
                setFocusedPreviewQId(null)
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Làm lại xem thử</span>
            </Button>
            {!previewSubmitted ? (
              <Button
                variant="secondary"
                disabled={draft.questions.length === 0}
                onClick={() => setPreviewSubmitted(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Nộp bài xem thử</span>
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setPreviewSubmitted(false)}>
                Ẩn kết quả chấm thử
              </Button>
            )}
            <Button onClick={() => setPreviewOpen(false)}>Đóng bản xem thử</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5FAFE] p-3 text-xs text-[#475569]">
            <span>
              <strong>Hướng dẫn:</strong> {draft.instructions}
            </span>
            <span>
              Trình độ: <strong>{draft.level}</strong> • Thời lượng:{' '}
              <strong>{draft.durationMinutes} phút</strong>
            </span>
          </div>

          {previewSubmitted && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">
                  Kết quả nộp bài xem thử: {previewCorrectCount}/{draft.questions.length} câu đúng –
                  Thang điểm 10: {previewScore10}/10
                </p>
                <p className="mt-0.5 text-[#047857]">
                  Đã trả lời {Object.keys(previewPicks).length}/{draft.questions.length} câu • Đáp án
                  chọn sai được viền đỏ để kiểm định trực quan.
                </p>
              </div>
              <Badge tone="success">{previewScore10} / 10 điểm</Badge>
            </div>
          )}

          {/* Question Navigator Pills */}
          {draft.questions.length === 0 ? (
            <EmptyBlock title="Chưa có câu hỏi để xem thử" />
          ) : (
            <div className="rounded-xl border border-[#DCEAF3] bg-white p-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#243B53]">
                Điều hướng nhanh câu hỏi ({draft.questions.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.questions.map((q, idx) => {
                  const picked = previewPicks[q.id]
                  const answered = Boolean(picked)
                  const key = draft.answerKeys[q.id]
                  const isRight =
                    previewSubmitted && answered && key?.correctOptionId === picked
                  const isWrong =
                    previewSubmitted && answered && key?.correctOptionId !== picked
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToPreviewQuestion(q.id)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
                        isRight
                          ? 'border-[#1F7A4C] bg-[#1F7A4C] text-white'
                          : isWrong
                            ? 'border-[#B93A2E] bg-[#B93A2E] text-white'
                            : answered
                              ? 'border-[#2878B8] bg-[#2878B8] text-white'
                              : 'border-[#DCEAF3] bg-[#F8FBFD] text-[#243B53] hover:border-[#75BDEB]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {draft.questions.map((q, idx) => {
            const picked = previewPicks[q.id]
            const key = draft.answerKeys[q.id]
            const isFocused = focusedPreviewQId === q.id
            return (
              <div
                key={q.id}
                id={`sz-preview-q-${q.id}`}
                className={`rounded-xl border p-4 transition ${
                  isFocused
                    ? 'border-[#2878B8] ring-2 ring-[#BAE6FD]'
                    : 'border-[#DCEAF3]'
                }`}
              >
                <p className="font-bold text-[#243B53]">
                  Câu {idx + 1}. {q.questionText}
                </p>
                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    alt={`Hình câu ${idx + 1}`}
                    className="mt-2 max-h-44 rounded-lg object-contain"
                  />
                )}
                {q.audioUrl && (
                  <audio controls src={q.audioUrl} className="mt-2 h-9 w-full">
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                )}
                <div className="mt-3 space-y-2">
                  {q.options.map((opt) => {
                    const isPicked = picked === opt.id
                    const isCorrect = key?.correctOptionId === opt.id
                    const isWrongPicked = previewSubmitted && isPicked && !isCorrect
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setPreviewPicks((prev) => ({ ...prev, [q.id]: opt.id }))
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs transition ${
                          previewSubmitted && isCorrect
                            ? 'border-[#1F7A4C] bg-[#E3F5EC] font-bold text-[#1F7A4C]'
                            : isWrongPicked
                              ? 'border-[#B93A2E] bg-[#FDECE9] font-bold text-[#B93A2E]'
                              : isPicked
                                ? 'border-[#2878B8] bg-[#EAF6FD] font-bold text-[#2878B8]'
                                : 'border-[#DCEAF3] hover:bg-[#F8FBFD]'
                        }`}
                      >
                        <span>
                          <strong>({opt.label})</strong> {opt.text}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {previewSubmitted && key && (
                  <div className="mt-2.5 space-y-1.5 rounded-lg bg-[#F8FBFD] p-2.5 text-xs text-[#2878B8]">
                    <div>
                      <strong>Giải thích:</strong>{' '}
                      {key.explanation || 'Chưa nhập lời giải thích cho câu hỏi này.'}
                    </div>
                    {key.audioTranscript?.trim() && (
                      <div className="border-t border-[#DCEAF3] pt-1.5 text-[#243B53]">
                        <strong>Transcript âm thanh:</strong> {key.audioTranscript}
                      </div>
                    )}
                    {key.audioTranslation?.trim() && (
                      <div className="border-t border-[#DCEAF3] pt-1.5 text-[#475569]">
                        <strong>Dịch nghĩa:</strong> {key.audioTranslation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
