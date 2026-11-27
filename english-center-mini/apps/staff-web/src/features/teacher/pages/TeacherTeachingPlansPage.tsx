import { useMemo, useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, ExternalLink, FileText, Lock } from 'lucide-react'
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
import { formatDate, matchText, toSafeHttpUrl } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import {
  LESSON_ACTIVITY_META,
  type SessionWithPlanItem,
} from '@/features/teacher/types/teacher.types'

type PlanStatusFilter = 'ALL' | 'unplanned' | 'planned' | 'in_progress' | 'completed'

export function TeacherTeachingPlansPage() {
  useDocumentTitle('Kế hoạch giảng dạy')
  const actor = useTeacherActor()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryClassId = searchParams.get('classId')
  const [classFilterOverride, setClassFilterOverride] = useState<string | null>(null)
  const classFilter = classFilterOverride ?? queryClassId ?? 'ALL'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>('ALL')

  const [editingItem, setEditingItem] = useState<SessionWithPlanItem | null>(null)
  const [topicTitle, setTopicTitle] = useState('')
  const [lcContent, setLcContent] = useState('')
  const [rcContent, setRcContent] = useState('')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [materialsInput, setMaterialsInput] = useState('')
  const [homeworkBrief, setHomeworkBrief] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [completionStatus, setCompletionStatus] = useState<'planned' | 'in_progress' | 'completed'>(
    'planned',
  )

  const { data: myClasses = [] } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.teachingPlans(actor.userId, classFilter),
    queryFn: () => teacherApi.listTeachingPlans(actor, classFilter),
    retry: false,
  })

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const effectiveStatus = item.plan ? item.plan.completionStatus : 'unplanned'
      if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(item.session.classCode, search) ||
          matchText(item.session.officialTitle, search) ||
          matchText(item.plan?.topicTitle ?? '', search) ||
          matchText(item.plan?.learningObjectives ?? '', search) ||
          matchText(item.plan?.lcContent ?? '', search) ||
          matchText(item.plan?.rcContent ?? '', search) ||
          matchText(item.plan?.homeworkBrief ?? '', search)
        )
      }
      return true
    })
  }, [items, statusFilter, search])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) throw new Error('Chưa chọn buổi học.')
      return teacherApi.upsertTeachingPlan(actor, {
        sessionId: editingItem.session.id,
        topicTitle,
        lcContent,
        rcContent,
        learningObjectives,
        materialLinks: materialsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        homeworkBrief,
        teacherNote,
        completionStatus,
      })
    },
    onSuccess: () => {
      setEditingItem(null)
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: 'Đã lưu kế hoạch giảng dạy buổi học',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu kế hoạch giảng dạy',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const openEditor = (item: SessionWithPlanItem) => {
    setEditingItem(item)
    setTopicTitle(item.plan?.topicTitle ?? item.session.officialTitle)
    setLcContent(item.plan?.lcContent ?? '')
    setRcContent(item.plan?.rcContent ?? '')
    setLearningObjectives(item.plan?.learningObjectives ?? '')
    setMaterialsInput(item.plan?.materialLinks.join(', ') ?? '')
    setHomeworkBrief(item.plan?.homeworkBrief ?? '')
    setTeacherNote(item.plan?.teacherNote ?? '')
    setCompletionStatus(item.plan?.completionStatus ?? 'planned')
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải kế hoạch giảng dạy theo buổi..." />
  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải kế hoạch giảng dạy."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kế hoạch Giảng dạy theo Buổi học"
        description="Soạn chủ đề, mục tiêu bài học, học liệu và theo dõi tiến độ giảng dạy từng buổi."
        badge={<Badge tone="info">{filteredItems.length} buổi học</Badge>}
      />

      {myClasses.length === 0 ? (
        <EmptyBlock title="Chưa có lớp học được phân công." />
      ) : (
        <>
          {/* Bộ lọc Lớp, Từ khóa & Trạng thái hoàn thành */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-3">
        <InputField
          id="tpl-search"
          label="Tìm kiếm nội dung bài giảng"
          placeholder="Chủ đề, mục tiêu, LC/RC, BTVN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          id="tpl-cls-filter"
          label="Lọc theo lớp phụ trách"
          value={classFilter}
          onChange={(e) => {
            const nextVal = e.target.value
            setClassFilterOverride(nextVal)
            setSearchParams(nextVal === 'ALL' ? {} : { classId: nextVal }, { replace: true })
          }}
          options={[
            { value: 'ALL', label: 'Tất cả lớp của tôi' },
            ...myClasses.map((c) => ({ value: c.id, label: `${c.classCode} – ${c.courseName}` })),
          ]}
        />
        <SelectField
          id="tpl-status-filter"
          label="Trạng thái triển khai"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PlanStatusFilter)}
          options={[
            { value: 'ALL', label: 'Mọi tiến độ buổi dạy' },
            { value: 'unplanned', label: 'Chưa soạn kế hoạch' },
            { value: 'planned', label: 'Dự kiến giảng dạy' },
            { value: 'in_progress', label: 'Đang triển khai' },
            { value: 'completed', label: 'Đã dạy xong' },
          ]}
        />
      </div>

      {filteredItems.length === 0 ? (
        <EmptyBlock title="Không có buổi học nào khớp bộ lọc kế hoạch giảng dạy" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="w-52 whitespace-nowrap">
                  Lớp & Buổi học
                </DataTableHeaderCell>
                <DataTableHeaderCell>Chủ đề, Mục tiêu & BTVN</DataTableHeaderCell>
                <DataTableHeaderCell>Nội dung LC / RC & Học liệu</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Tiến độ buổi dạy
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Soạn bài
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {filteredItems.map((item) => {
                const { session, plan } = item
                const actMeta = LESSON_ACTIVITY_META[session.activityType]
                const safeMaterialUrls = (plan?.materialLinks ?? [])
                  .map((url) => toSafeHttpUrl(url))
                  .filter((url): url is string => Boolean(url))
                const sessionTimeText = session.endTime
                  ? `${session.startTime}–${session.endTime}`
                  : session.startTime

                return (
                  <DataTableRow key={session.id}>
                    <DataTableCell className="w-52 align-top text-xs whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1.5">
                        <p className="font-extrabold text-[#2878B8]">
                          {session.classCode} • Buổi {String(session.sessionNumber).padStart(2, '0')}
                        </p>
                        <Badge tone={actMeta.tone}>{actMeta.label}</Badge>
                        <div>
                          <p className="font-semibold text-[#243B53]">
                            {formatDate(session.sessionDate)} ({sessionTimeText})
                          </p>
                          <p className="text-[#64748B]">{session.roomLabel}</p>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="max-w-xs align-top text-xs">
                      <p className="font-bold text-[#243B53]">
                        {plan?.topicTitle ?? session.officialTitle}
                      </p>
                      <p className="mt-1 text-[#475569]">
                        {plan?.learningObjectives ?? 'Chưa cập nhật mục tiêu chi tiết.'}
                      </p>
                      {plan?.homeworkBrief && (
                        <p className="mt-1 font-semibold text-[#2878B8]">
                          BTVN: {plan.homeworkBrief}
                        </p>
                      )}
                      {plan?.teacherNote && (
                        <p className="mt-1 italic text-[#D97706]">Ghi chú: {plan.teacherNote}</p>
                      )}
                    </DataTableCell>
                    <DataTableCell className="max-w-xs align-top text-xs text-[#475569]">
                      {plan ? (
                        <div className="space-y-1">
                          <p>
                            <strong>LC:</strong> {plan.lcContent || '—'}
                          </p>
                          <p>
                            <strong>RC:</strong> {plan.rcContent || '—'}
                          </p>
                          {safeMaterialUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {safeMaterialUrls.map((safeUrl, idx) => (
                                <a
                                  key={`${session.id}-mat-${idx}`}
                                  href={safeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-[#BAE6FD] bg-[#F5FAFE] px-2 py-0.5 font-semibold whitespace-nowrap text-[#2878B8] hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Học liệu {idx + 1}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]">Chưa soạn kế hoạch chi tiết</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="align-top whitespace-nowrap">
                      <Badge
                        tone={
                          plan?.completionStatus === 'completed'
                            ? 'success'
                            : plan?.completionStatus === 'in_progress'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {plan?.completionStatus === 'completed'
                          ? 'Đã dạy xong'
                          : plan?.completionStatus === 'in_progress'
                            ? 'Đang triển khai'
                            : plan
                              ? 'Dự kiến'
                              : 'Chưa soạn'}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="align-top text-right whitespace-nowrap">
                      <ActionGuard permission="teaching-plan.update">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button size="sm" variant="secondary" onClick={() => openEditor(item)}>
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Cập nhật</span>
                          </Button>
                        </div>
                      </ActionGuard>
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </tbody>
          </DataTable>
        </DataTableContainer>
      )}
        </>
      )}

      {/* Modal cập nhật kế hoạch buổi dạy */}
      <Modal
        open={Boolean(editingItem)}
        title={`Soạn kế hoạch – ${editingItem?.session.classCode ?? ''} Buổi ${editingItem?.session.sessionNumber ?? ''}`}
        onClose={() => setEditingItem(null)}
        maxWidthClassName="max-w-xl"
      >
        {editingItem && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 text-xs text-[#475569]">
              <Lock className="h-4 w-4 shrink-0 text-[#64748B]" />
              <span>
                Lịch cố định bởi Giáo vụ:{' '}
                <strong>
                  {formatDate(editingItem.session.sessionDate)} (
                  {editingItem.session.endTime
                    ? `${editingItem.session.startTime}–${editingItem.session.endTime}`
                    : editingItem.session.startTime}
                  ) – {editingItem.session.roomLabel}
                </strong>
              </span>
            </div>

            <InputField
              id="tpl-topic"
              label="Chủ đề giảng dạy buổi học *"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              required
            />
            <InputField
              id="tpl-obj"
              label="Mục tiêu học tập cần đạt *"
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField
                id="tpl-lc"
                label="Nội dung Listening (LC)"
                value={lcContent}
                onChange={(e) => setLcContent(e.target.value)}
              />
              <InputField
                id="tpl-rc"
                label="Nội dung Reading (RC)"
                value={rcContent}
                onChange={(e) => setRcContent(e.target.value)}
              />
            </div>
            <InputField
              id="tpl-mats"
              label="Link tài liệu buổi học (http/https, cách nhau bởi dấu phẩy)"
              placeholder="https://englishcenter.edu.vn/materials/slide-u15.pdf"
              value={materialsInput}
              onChange={(e) => setMaterialsInput(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField
                id="tpl-hw"
                label="Tóm tắt bài tập về nhà"
                value={homeworkBrief}
                onChange={(e) => setHomeworkBrief(e.target.value)}
              />
              <SelectField
                id="tpl-status"
                label="Trạng thái triển khai"
                value={completionStatus}
                onChange={(e) =>
                  setCompletionStatus(
                    e.target.value as 'planned' | 'in_progress' | 'completed',
                  )
                }
                options={[
                  { value: 'planned', label: 'Dự kiến giảng dạy' },
                  { value: 'in_progress', label: 'Đang triển khai' },
                  { value: 'completed', label: 'Đã hoàn thành buổi học' },
                ]}
              />
            </div>
            <InputField
              id="tpl-note"
              label="Ghi chú sư phạm nội bộ"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                Đóng
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                Lưu kế hoạch buổi dạy
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
