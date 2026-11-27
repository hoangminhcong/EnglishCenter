import { useMemo, useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Lock,
  Paperclip,
  Plus,
  Users,
} from 'lucide-react'
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
   type BadgeTone,
} from '@english-center/ui'
import type {
  AssignmentTargetScope,
  TeacherAssignmentRecordDto,
  TeacherSubmissionRecordDto,
  TeacherSubmissionStatus,
} from '@english-center/contracts'
import { formatDate, formatDateTimeVi, matchText, toSafeHttpUrl } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { toVietnamYmd } from '@/shared/utils/staffFormatters'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import {
  SUBMISSION_STATUS_META,
  TARGET_SCOPE_LABELS,
  isSubmissionPastDue,
} from '@/features/teacher/types/teacher.types'

type AssignmentLifecycleFilter = 'ALL' | 'open' | 'overdue' | 'closed'
type SubmissionFilterValue = 'ALL' | TeacherSubmissionStatus | 'LATE'

function deriveAssignmentStatusMeta(
  assignment: TeacherAssignmentRecordDto,
  todayYmdVn: string,
): { key: 'open' | 'overdue' | 'closed'; label: string; tone: BadgeTone } {
  if (assignment.status === 'closed') {
    return { key: 'closed', label: 'Đã đóng', tone: 'neutral' }
  }
  if (toVietnamYmd(assignment.dueAt) < todayYmdVn) {
    return { key: 'overdue', label: 'Quá hạn', tone: 'warning' }
  }
  return { key: 'open', label: 'Đang mở', tone: 'success' }
}

export function TeacherAssignmentsPage() {
  useDocumentTitle('Quản lý bài tập lớp')
  const actor = useTeacherActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryClassId = searchParams.get('classId')
  const [classFilterOverride, setClassFilterOverride] = useState<string | null>(null)
  const classFilter = classFilterOverride ?? queryClassId ?? 'ALL'

  const [asgSearch, setAsgSearch] = useState('')
  const [asgStatusFilter, setAsgStatusFilter] = useState<AssignmentLifecycleFilter>('ALL')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)

  const [subSearch, setSubSearch] = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState<SubmissionFilterValue>('ALL')

  // State chung cho Modal Tạo mới / Chỉnh sửa bài tập
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignmentRecordDto | null>(
    null,
  )
  const [formClassId, setFormClassId] = useState('')
  const [formSessionId, setFormSessionId] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('')
  const [formDueDate, setFormDueDate] = useState(todayYmdVn)
  const [formFormat, setFormFormat] = useState<'drive_link' | 'lc_rc_sheet' | 'file_url'>(
    'drive_link',
  )
  const [formMaxScore, setFormMaxScore] = useState('100')
  const [formIsDemoTest, setFormIsDemoTest] = useState(false)
  const [formPartMaxLc, setFormPartMaxLc] = useState('100')
  const [formPartMaxRc, setFormPartMaxRc] = useState('100')
  const [formScope, setFormScope] = useState<AssignmentTargetScope>('whole_class')
  const [formGroupLabel, setFormGroupLabel] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // State đóng bài tập
  const [closingTarget, setClosingTarget] = useState<TeacherAssignmentRecordDto | null>(null)
  const [closeReason, setCloseReason] = useState('')

  // State chấm điểm bài nộp
  const [gradingTarget, setGradingTarget] = useState<{
    submission: TeacherSubmissionRecordDto
    assignment: TeacherAssignmentRecordDto
  } | null>(null)
  const [decision, setDecision] = useState<'Graded' | 'ReturnedForRevision'>('Graded')
  const [scoreInput, setScoreInput] = useState('')
  const [outcomeInput, setOutcomeInput] = useState<'' | 'passed' | 'failed'>('passed')
  const [demoLcInput, setDemoLcInput] = useState('')
  const [demoRcInput, setDemoRcInput] = useState('')
  const [demoConfirmed, setDemoConfirmed] = useState(true)
  const [feedbackInput, setFeedbackInput] = useState('')

  const { data: myClasses = [] } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const { data: plans = [] } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.teachingPlans(actor.userId, 'ALL'),
    queryFn: () => teacherApi.listTeachingPlans(actor, 'ALL'),
  })

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.assignments(actor.userId, classFilter),
    queryFn: () => teacherApi.listAssignments(actor, classFilter),
    retry: false,
  })

  const effectiveModalClassId =
    modalMode === 'edit'
      ? (editingAssignment?.classId ?? '')
      : formClassId || myClasses[0]?.id || ''

  const { data: modalClassDetail, isLoading: loadingModalStudents } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classDetail(actor.userId, effectiveModalClassId),
    queryFn: () => teacherApi.getClassDetail(actor, effectiveModalClassId),
    enabled: Boolean(modalMode && effectiveModalClassId),
  })

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const meta = deriveAssignmentStatusMeta(item.assignment, todayYmdVn)
      if (asgStatusFilter !== 'ALL' && meta.key !== asgStatusFilter) return false
      if (asgSearch.trim()) {
        return (
          matchText(item.assignment.code, asgSearch) ||
          matchText(item.assignment.title, asgSearch) ||
          matchText(item.assignment.classCode, asgSearch) ||
          matchText(item.assignment.targetGroupLabel ?? '', asgSearch)
        )
      }
      return true
    })
  }, [items, asgStatusFilter, asgSearch, todayYmdVn])

  const activeItem =
    filteredItems.find((i) => i.assignment.id === selectedAssignmentId) ??
    filteredItems[0] ??
    null

  const filteredSubmissions = useMemo(() => {
    if (!activeItem) return []
    return activeItem.submissions.filter((sub) => {
      const late =
        sub.status === 'LateSubmitted' ||
        isSubmissionPastDue(sub.submittedAt, activeItem.assignment.dueAt)
      if (subStatusFilter === 'LATE' && !late) return false
      if (subStatusFilter !== 'ALL' && subStatusFilter !== 'LATE' && sub.status !== subStatusFilter) {
        return false
      }
      if (subSearch.trim()) {
        return (
          matchText(sub.studentName, subSearch) ||
          matchText(sub.studentCode, subSearch)
        )
      }
      return true
    })
  }, [activeItem, subStatusFilter, subSearch])

  const sessionsForModalClass = useMemo(
    () =>
      plans
        .filter((p) => p.session.classId === effectiveModalClassId)
        .map((p) => p.session),
    [plans, effectiveModalClassId],
  )

  const openCreateModal = () => {
    const defaultClsId =
      classFilter !== 'ALL' && myClasses.some((c) => c.id === classFilter)
        ? classFilter
        : (myClasses[0]?.id ?? '')
    setModalMode('create')
    setEditingAssignment(null)
    setFormClassId(defaultClsId)
    setFormSessionId('')
    setFormCode('')
    setFormTitle('')
    setFormInstructions('')
    setFormAttachmentUrl('')
    setFormDueDate(todayYmdVn)
    setFormFormat('drive_link')
    setFormMaxScore('100')
    setFormIsDemoTest(false)
    setFormPartMaxLc('100')
    setFormPartMaxRc('100')
    setFormScope('whole_class')
    setFormGroupLabel('')
    setSelectedStudentIds([])
  }

  const openEditModal = (asg: TeacherAssignmentRecordDto) => {
    setModalMode('edit')
    setEditingAssignment(asg)
    setFormClassId(asg.classId)
    setFormSessionId(asg.sessionId)
    setFormCode(asg.code)
    setFormTitle(asg.title)
    setFormInstructions(asg.instructions)
    setFormAttachmentUrl(asg.attachmentUrl ?? '')
    setFormDueDate(toVietnamYmd(asg.dueAt))
    setFormFormat(asg.submissionFormat)
    setFormMaxScore(String(asg.maxScore))
    setFormIsDemoTest(Boolean(asg.isDemoTest))
    setFormPartMaxLc(String(asg.partMaxQuestions?.lc ?? 100))
    setFormPartMaxRc(String(asg.partMaxQuestions?.rc ?? 100))
    setFormScope(asg.targetScope)
    setFormGroupLabel(asg.targetGroupLabel ?? '')
    setSelectedStudentIds(asg.targetStudentIds ? [...asg.targetStudentIds] : [])
  }

  const saveAssignmentMutation = useMutation({
    mutationFn: () => {
      const sesId = formSessionId || sessionsForModalClass[0]?.id || ''
      if (!sesId) {
        throw new Error('Lớp học chưa có buổi học hợp lệ để gắn bài tập.')
      }
      const parsedMax = Number(formMaxScore.trim())
      if (!formMaxScore.trim() || !Number.isFinite(parsedMax) || parsedMax <= 0) {
        throw new Error('Vui lòng nhập thang điểm tối đa hợp lệ (> 0).')
      }
      const partMaxQuestions = formIsDemoTest
        ? {
            lc: Math.max(1, Number(formPartMaxLc.trim()) || 100),
            rc: Math.max(1, Number(formPartMaxRc.trim()) || 100),
          }
        : undefined
      const needsStudentPicker =
        formScope === 'group' || formScope === 'individual_students'
      if (needsStudentPicker && selectedStudentIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 học viên thuộc đối tượng nhận bài tập.')
      }

      if (modalMode === 'edit' && editingAssignment) {
        return teacherApi.updateAssignment(actor, {
          assignmentId: editingAssignment.id,
          sessionId: sesId,
          code: formCode,
          title: formTitle,
          instructions: formInstructions,
          attachmentUrl: formAttachmentUrl,
          dueDate: formDueDate,
          submissionFormat: formFormat,
          maxScore: parsedMax,
          isDemoTest: formIsDemoTest,
          partMaxQuestions,
          targetScope: formScope,
          targetGroupLabel: formScope === 'group' ? formGroupLabel : undefined,
          targetStudentIds: needsStudentPicker ? selectedStudentIds : undefined,
        })
      }

      return teacherApi.createAssignment(actor, {
        classId: effectiveModalClassId,
        sessionId: sesId,
        code: formCode,
        title: formTitle,
        instructions: formInstructions,
        attachmentUrl: formAttachmentUrl,
        dueDate: formDueDate,
        submissionFormat: formFormat,
        maxScore: parsedMax,
        isDemoTest: formIsDemoTest,
        partMaxQuestions,
        targetScope: formScope,
        targetGroupLabel: formScope === 'group' ? formGroupLabel : undefined,
        targetStudentIds: needsStudentPicker ? selectedStudentIds : undefined,
      })
    },
    onSuccess: (saved) => {
      const wasEdit = modalMode === 'edit'
      setModalMode(null)
      setEditingAssignment(null)
      setSelectedAssignmentId(saved.id)
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: wasEdit
          ? `Đã cập nhật bài tập ${saved.code}`
          : `Đã giao bài tập ${saved.code} cho lớp ${saved.classCode}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: modalMode === 'edit' ? 'Không thể cập nhật bài tập' : 'Không thể giao bài tập',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const closeMutation = useMutation({
    mutationFn: () => {
      if (!closingTarget) throw new Error('Chưa chọn bài tập cần đóng.')
      return teacherApi.closeAssignment(actor, {
        assignmentId: closingTarget.id,
        reason: closeReason,
      })
    },
    onSuccess: (closed) => {
      setClosingTarget(null)
      setCloseReason('')
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'info',
        title: `Đã đóng bài tập ${closed.code}`,
        description: 'Bài tập đã khóa chỉnh sửa thông tin và ngưng nhận nộp lại.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể đóng bài tập',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const gradeMutation = useMutation({
    mutationFn: () => {
      if (!gradingTarget) throw new Error('Chưa chọn bài nộp.')
      let parsedScore: number | null = null
      let demoScores:
        | {
            lcScore: number
            rcScore: number
            totalScore: number
            isConfirmedByTeacher: boolean
          }
        | undefined

      if (decision === 'Graded') {
        if (gradingTarget.assignment.isDemoTest) {
          const trimmedLc = demoLcInput.trim()
          const trimmedRc = demoRcInput.trim()
          if (!trimmedLc || !trimmedRc) {
            throw new Error(
              'Vui lòng nhập đầy đủ điểm quy đổi Listening và Reading cho bài Demo Test.',
            )
          }
          const lcNum = Number(trimmedLc)
          const rcNum = Number(trimmedRc)
          if (!Number.isFinite(lcNum) || !Number.isFinite(rcNum)) {
            throw new Error('Điểm quy đổi Listening và Reading phải là số hợp lệ.')
          }
          demoScores = {
            lcScore: lcNum,
            rcScore: rcNum,
            totalScore: lcNum + rcNum,
            isConfirmedByTeacher: demoConfirmed,
          }
        }

        const trimmed = scoreInput.trim()
        if (!trimmed) {
          throw new Error('Vui lòng nhập điểm số đạt được (không để trống).')
        }
        const num = Number(trimmed)
        if (!Number.isFinite(num)) {
          throw new Error('Điểm chấm phải là số hợp lệ.')
        }
        parsedScore = num
      }
      return teacherApi.gradeSubmission(actor, {
        submissionId: gradingTarget.submission.id,
        decision,
        score: parsedScore,
        evaluationOutcome:
          decision === 'Graded' && outcomeInput ? outcomeInput : undefined,
        demoScores,
        teacherFeedback: feedbackInput,
      })
    },
    onSuccess: (updated) => {
      setGradingTarget(null)
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title:
          updated.status === 'Graded'
            ? `Đã lưu điểm chấm bài của ${updated.studentName}`
            : `Đã gửi yêu cầu nộp lại bài cho ${updated.studentName}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu kết quả chấm bài',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleAssignmentFormSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveAssignmentMutation.mutate()
  }

  const handleGradeSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    gradeMutation.mutate()
  }

  const toggleTargetStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách bài tập lớp..." />
  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu bài tập."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const modalStudents = modalClassDetail?.students ?? []
  const activeSafeAttachmentUrl = activeItem?.assignment.attachmentUrl
    ? toSafeHttpUrl(activeItem.assignment.attachmentUrl)
    : null
  const activeStatusMeta = activeItem
    ? deriveAssignmentStatusMeta(activeItem.assignment, todayYmdVn)
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Bài tập Lớp học & Chấm bài nộp"
        description="Giao bài tập theo buổi học và chấm điểm bài nộp của học viên."
        actions={
          myClasses.length > 0 ? (
            <ActionGuard permission="assignments.create">
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                <span>Giao bài tập mới</span>
              </Button>
            </ActionGuard>
          ) : undefined
        }
      />

      {myClasses.length === 0 ? (
        <EmptyBlock title="Chưa có lớp học được phân công." />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột danh sách bài tập */}
        <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs lg:col-span-5">
          <SelectField
            id="asg-cls-filter"
            label="Lọc theo lớp phụ trách"
            value={classFilter}
            onChange={(e) => {
              const nextVal = e.target.value
              setClassFilterOverride(nextVal)
              setSelectedAssignmentId(null)
              setSearchParams(nextVal === 'ALL' ? {} : { classId: nextVal }, { replace: true })
            }}
            options={[
              { value: 'ALL', label: 'Tất cả lớp của tôi' },
              ...myClasses.map((c) => ({ value: c.id, label: `${c.classCode} – ${c.courseName}` })),
            ]}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InputField
              id="asg-search"
              placeholder="Tìm mã bài, tiêu đề, nhóm..."
              value={asgSearch}
              onChange={(e) => setAsgSearch(e.target.value)}
            />
            <SelectField
              id="asg-status-filter"
              value={asgStatusFilter}
              onChange={(e) => setAsgStatusFilter(e.target.value as AssignmentLifecycleFilter)}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái bài' },
                { value: 'open', label: 'Đang mở' },
                { value: 'overdue', label: 'Quá hạn' },
                { value: 'closed', label: 'Đã đóng' },
              ]}
            />
          </div>

          {filteredItems.length === 0 ? (
            <EmptyBlock title="Chưa có bài tập nào khớp điều kiện lọc" />
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const { assignment } = item
                const selected = assignment.id === activeItem?.assignment.id
                const stMeta = deriveAssignmentStatusMeta(assignment, todayYmdVn)
                const targetedCount =
                  assignment.targetScope === 'whole_class'
                    ? item.submissions.length
                    : (assignment.targetStudentIds?.length ?? item.submissions.length)

                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition ${
                      selected
                        ? 'border-[#2878B8] bg-[#EAF6FD]/70'
                        : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#2878B8]">
                        {assignment.code} • Lớp {assignment.classCode} (B.{assignment.sessionNumber})
                      </span>
                      <div className="flex items-center gap-1.5">
                        {assignment.isDemoTest && (
                          <Badge tone="warning">Demo Test</Badge>
                        )}
                        <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                        <Badge tone="info">{assignment.maxScore}đ</Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#243B53]">{assignment.title}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#475569]">
                      <Users className="h-3 w-3 text-[#2878B8]" />
                      <span>
                        {assignment.targetScope === 'group' && assignment.targetGroupLabel
                          ? `Nhóm: ${assignment.targetGroupLabel} (${targetedCount} HV)`
                          : `${TARGET_SCOPE_LABELS[assignment.targetScope]} (${targetedCount} HV)`}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                      <span>Hạn: {formatDate(toVietnamYmd(assignment.dueAt))}</span>
                      <span>
                        Đã nộp: <strong>{item.submittedCount}</strong>/{item.submissions.length} •
                        Đã chấm: <strong>{item.gradedCount}</strong>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Cột danh sách bài nộp của bài tập đang chọn */}
        <div className="space-y-4 lg:col-span-7">
          {!activeItem || !activeStatusMeta ? (
            <EmptyBlock title="Chọn một bài tập bên trái để xem bài nộp và chấm điểm" />
          ) : (
            <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <div className="mb-4 space-y-3 border-b border-[#DCEAF3] pb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-[#243B53]">
                        {activeItem.assignment.code}: {activeItem.assignment.title}
                      </h2>
                      {activeItem.assignment.isDemoTest && (
                        <Badge tone="warning">
                          Demo Test ({activeItem.assignment.partMaxQuestions?.lc ?? 100} LC /{' '}
                          {activeItem.assignment.partMaxQuestions?.rc ?? 100} RC)
                        </Badge>
                      )}
                      <Badge tone={activeStatusMeta.tone}>{activeStatusMeta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Lớp <strong>{activeItem.assignment.classCode}</strong> • Buổi{' '}
                      <strong>{activeItem.assignment.sessionNumber}</strong> • Ngày giao:{' '}
                      {formatDate(activeItem.assignment.assignedDate)} • Hạn nộp:{' '}
                      <strong>{formatDateTimeVi(activeItem.assignment.dueAt)}</strong>
                      {activeItem.assignment.closedAt
                        ? ` • Đóng lúc: ${formatDateTimeVi(activeItem.assignment.closedAt)}`
                        : ''}
                    </p>
                  </div>

                  {activeItem.assignment.status !== 'closed' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionGuard permission="assignments.update">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditModal(activeItem.assignment)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Sửa bài tập</span>
                        </Button>
                      </ActionGuard>
                      <ActionGuard permission="assignments.close">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setClosingTarget(activeItem.assignment)
                            setCloseReason('')
                          }}
                        >
                          <Lock className="h-3.5 w-3.5 text-[#B93A2E]" />
                          <span className="text-[#B93A2E]">Đóng bài tập</span>
                        </Button>
                      </ActionGuard>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone="neutral">
                    {activeItem.assignment.targetScope === 'group' &&
                    activeItem.assignment.targetGroupLabel
                      ? `${TARGET_SCOPE_LABELS.group}: ${activeItem.assignment.targetGroupLabel}`
                      : TARGET_SCOPE_LABELS[activeItem.assignment.targetScope]}
                  </Badge>
                  <Badge tone="info">
                    Đối tượng:{' '}
                    {activeItem.assignment.targetScope === 'whole_class'
                      ? `${activeItem.submissions.length} HV toàn lớp`
                      : `${activeItem.assignment.targetStudentIds?.length ?? activeItem.submissions.length} HV được chọn`}
                  </Badge>
                  {activeSafeAttachmentUrl && (
                    <a
                      href={activeSafeAttachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#BAE6FD] bg-[#F5FAFE] px-2.5 py-1 font-semibold text-[#2878B8] hover:underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>Tài liệu đề bài đính kèm</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-[#475569]">
                  <strong>Hướng dẫn:</strong> {activeItem.assignment.instructions}
                </p>
              </div>

              {/* Bộ lọc danh sách bài nộp */}
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InputField
                  id="sub-search"
                  placeholder="Tìm họ tên hoặc mã học viên..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                />
                <SelectField
                  id="sub-status-filter"
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value as SubmissionFilterValue)}
                  options={[
                    { value: 'ALL', label: 'Tất cả trạng thái bài nộp' },
                    { value: 'Submitted', label: 'Đã nộp (Chờ chấm)' },
                    { value: 'LateSubmitted', label: 'Nộp muộn (Chờ chấm)' },
                    { value: 'LATE', label: 'Tất cả bài nộp trễ hạn (kể cả đã chấm)' },
                    { value: 'Grading', label: 'Đang chấm' },
                    { value: 'Graded', label: 'Đã chấm điểm' },
                    { value: 'ReturnedForRevision', label: 'Yêu cầu nộp lại' },
                    { value: 'NotSubmitted', label: 'Chưa nộp bài' },
                  ]}
                />
              </div>

              {filteredSubmissions.length === 0 ? (
                <EmptyBlock title="Không có bài nộp nào khớp bộ lọc" />
              ) : (
                <DataTableContainer>
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <DataTableHeaderCell className="whitespace-nowrap">
                          Học viên
                        </DataTableHeaderCell>
                        <DataTableHeaderCell className="min-w-[200px]">
                          Bài nộp & Chi tiết câu đúng
                        </DataTableHeaderCell>
                        <DataTableHeaderCell className="min-w-[180px]">
                          Trạng thái / Điểm
                        </DataTableHeaderCell>
                        <DataTableHeaderCell className="text-right whitespace-nowrap">
                          Chấm bài
                        </DataTableHeaderCell>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {filteredSubmissions.map((sub) => {
                        const st = SUBMISSION_STATUS_META[sub.status]
                        const safeUrl = sub.submissionUrl
                          ? toSafeHttpUrl(sub.submissionUrl)
                          : null
                        const submittedLate =
                          sub.status === 'LateSubmitted' ||
                          isSubmissionPastDue(sub.submittedAt, activeItem.assignment.dueAt)
                        const hasLcRcCounts =
                          sub.lcCorrect !== undefined || sub.rcCorrect !== undefined

                        return (
                          <DataTableRow key={sub.id}>
                            <DataTableCell className="whitespace-nowrap">
                              <p className="font-bold text-[#243B53]">{sub.studentName}</p>
                              <p className="text-xs text-[#64748B]">{sub.studentCode}</p>
                            </DataTableCell>
                            <DataTableCell className="max-w-xs space-y-1 text-xs">
                              {safeUrl ? (
                                <a
                                  href={safeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-[#2878B8] hover:underline"
                                >
                                  <span>Mở link bài nộp</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-[#94A3B8]">Chưa có link nộp</span>
                              )}
                              {hasLcRcCounts && (
                                <p className="font-semibold whitespace-nowrap text-[#243B53]">
                                  Câu đúng: LC {sub.lcCorrect ?? '—'} • RC {sub.rcCorrect ?? '—'}
                                </p>
                              )}
                              {sub.submittedAt && (
                                <p className="whitespace-nowrap text-[#64748B]">
                                  Nộp lúc: {formatDateTimeVi(sub.submittedAt)}
                                </p>
                              )}
                              {sub.studentAnswerNote && (
                                <p className="text-[#475569]">{sub.studentAnswerNote}</p>
                              )}
                            </DataTableCell>
                            <DataTableCell>
                              <div className="flex flex-col items-start gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge tone={st.tone}>{st.label}</Badge>
                                  {sub.evaluationOutcome === 'passed' && (
                                    <Badge tone="success">Đạt</Badge>
                                  )}
                                  {sub.evaluationOutcome === 'failed' && (
                                    <Badge tone="danger">Chưa đạt</Badge>
                                  )}
                                  {submittedLate && sub.status !== 'LateSubmitted' && (
                                    <Badge tone="warning">Nộp trễ hạn</Badge>
                                  )}
                                </div>
                                {sub.demoScores && (
                                  <p className="text-[11px] font-semibold text-[#2878B8]">
                                    Demo: LC {sub.demoScores.lcScore} + RC {sub.demoScores.rcScore}{' '}
                                    = {sub.demoScores.totalScore} (
                                    {sub.demoScores.isConfirmedByTeacher
                                      ? 'GV đã xác nhận'
                                      : 'Chờ GV xác nhận'}
                                    )
                                  </p>
                                )}
                                {sub.score !== null && (
                                  <p className="text-xs font-extrabold whitespace-nowrap text-[#1F7A4C]">
                                    Điểm: {sub.score}/{activeItem.assignment.maxScore}
                                  </p>
                                )}
                                {sub.teacherFeedback && (
                                  <p className="max-w-[180px] text-[11px] text-[#475569]">
                                    NX: {sub.teacherFeedback}
                                  </p>
                                )}
                              </div>
                            </DataTableCell>
                            <DataTableCell className="text-right whitespace-nowrap">
                              {sub.status !== 'NotSubmitted' && (
                                <ActionGuard permission="assignments.grade">
                                  <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      variant={sub.status === 'Graded' ? 'secondary' : 'primary'}
                                      onClick={() => {
                                        setGradingTarget({
                                          submission: sub,
                                          assignment: activeItem.assignment,
                                        })
                                        setDecision('Graded')
                                        const prefillDemoTotal =
                                          activeItem.assignment.isDemoTest && sub.demoScores
                                            ? String(sub.demoScores.totalScore)
                                            : ''
                                        setScoreInput(
                                          sub.score !== null ? String(sub.score) : prefillDemoTotal,
                                        )
                                        setOutcomeInput(sub.evaluationOutcome ?? 'passed')
                                        setDemoLcInput(
                                          sub.demoScores ? String(sub.demoScores.lcScore) : '',
                                        )
                                        setDemoRcInput(
                                          sub.demoScores ? String(sub.demoScores.rcScore) : '',
                                        )
                                        setDemoConfirmed(
                                          sub.demoScores?.isConfirmedByTeacher ?? true,
                                        )
                                        setFeedbackInput(sub.teacherFeedback ?? '')
                                      }}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>
                                        {sub.status === 'Graded' ? 'Sửa điểm' : 'Chấm điểm'}
                                      </span>
                                    </Button>
                                  </div>
                                </ActionGuard>
                              )}
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
        </div>
      </div>
      )}

      {/* Modal Tạo mới / Chỉnh sửa Bài tập */}
      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'edit'
            ? `Chỉnh sửa bài tập ${editingAssignment?.code ?? ''}`
            : 'Tạo & Giao bài tập cho lớp phụ trách'
        }
        onClose={() => {
          setModalMode(null)
          setEditingAssignment(null)
        }}
        maxWidthClassName="max-w-xl"
      >
        <form onSubmit={handleAssignmentFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="asg-form-cls"
              label="Lớp được giao *"
              value={effectiveModalClassId}
              disabled={modalMode === 'edit'}
              onChange={(e) => {
                setFormClassId(e.target.value)
                setFormSessionId('')
                setSelectedStudentIds([])
              }}
              options={myClasses.map((c) => ({ value: c.id, label: c.classCode }))}
            />
            <SelectField
              id="asg-form-ses"
              label="Gắn với buổi học *"
              value={formSessionId || sessionsForModalClass[0]?.id || ''}
              onChange={(e) => setFormSessionId(e.target.value)}
              options={sessionsForModalClass.map((s) => ({
                value: s.id,
                label: `Buổi ${s.sessionNumber} (${s.sessionDate})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InputField
              id="asg-form-code"
              label="Mã bài tập *"
              placeholder="HW-S01-B16"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <InputField
                id="asg-form-title"
                label="Tiêu đề bài tập *"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <InputField
            id="asg-form-inst"
            label="Hướng dẫn làm bài & yêu cầu nộp *"
            value={formInstructions}
            onChange={(e) => setFormInstructions(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InputField
              id="asg-form-due"
              type="date"
              min={modalMode === 'edit' ? editingAssignment?.assignedDate : todayYmdVn}
              label="Hạn nộp (23:59 GMT+7) *"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              required
            />
            <InputField
              id="asg-form-max"
              type="number"
              min={1}
              max={1000}
              label="Thang điểm tối đa *"
              value={formMaxScore}
              onChange={(e) => setFormMaxScore(e.target.value)}
              required
            />
            <SelectField
              id="asg-form-scope"
              label="Đối tượng nhận bài *"
              value={formScope}
              onChange={(e) => setFormScope(e.target.value as AssignmentTargetScope)}
              options={[
                { value: 'whole_class', label: 'Toàn bộ lớp học' },
                { value: 'group', label: 'Nhóm học tập trong lớp' },
                { value: 'individual_students', label: 'Kèm riêng học viên' },
              ]}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-bold text-[#243B53]">
              <input
                type="checkbox"
                checked={formIsDemoTest}
                onChange={(e) => {
                  const checked = e.target.checked
                  setFormIsDemoTest(checked)
                  if (checked) {
                    setFormMaxScore('990')
                    setFormFormat('lc_rc_sheet')
                  }
                }}
                className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
              />
              <span>
                Đánh dấu là Bài thi thử định kỳ (Demo Test – đối chiếu điểm quy đổi LC/RC trên
                Student Portal)
              </span>
            </label>
            {formIsDemoTest && (
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  id="asg-form-max-lc"
                  type="number"
                  min={1}
                  max={200}
                  label="Số câu tối đa Listening *"
                  value={formPartMaxLc}
                  onChange={(e) => setFormPartMaxLc(e.target.value)}
                  required
                />
                <InputField
                  id="asg-form-max-rc"
                  type="number"
                  min={1}
                  max={200}
                  label="Số câu tối đa Reading *"
                  value={formPartMaxRc}
                  onChange={(e) => setFormPartMaxRc(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {formScope === 'group' && (
            <InputField
              id="asg-form-grp"
              label="Tên nhóm học tập trong lớp *"
              placeholder="VD: Nhóm tăng tốc Reading Part 7"
              value={formGroupLabel}
              onChange={(e) => setFormGroupLabel(e.target.value)}
              required
            />
          )}

          {(formScope === 'group' || formScope === 'individual_students') && (
            <div className="space-y-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#243B53]">
                  Chọn học viên nhận bài tập * ({selectedStudentIds.length}/{modalStudents.length}{' '}
                  HV)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds(modalStudents.map((s) => s.id))}
                    className="font-semibold text-[#2878B8] hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="font-semibold text-[#64748B] hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {loadingModalStudents ? (
                <p className="text-[#64748B]">Đang tải danh sách học viên lớp...</p>
              ) : modalStudents.length === 0 ? (
                <p className="text-[#B93A2E]">Lớp này hiện chưa có học viên đang theo học.</p>
              ) : (
                <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {modalStudents.map((stu) => {
                    const checked = selectedStudentIds.includes(stu.id)
                    return (
                      <label
                        key={stu.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                          checked
                            ? 'border-[#2878B8] bg-[#EAF6FD] font-semibold text-[#243B53]'
                            : 'border-[#DCEAF3] bg-white text-[#475569]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTargetStudent(stu.id)}
                          className="h-3.5 w-3.5 rounded border-[#DCEAF3] text-[#2878B8]"
                        />
                        <span>
                          {stu.fullName} ({stu.studentCode})
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="asg-form-fmt"
              label="Định dạng nộp bài"
              value={formFormat}
              onChange={(e) =>
                setFormFormat(e.target.value as 'drive_link' | 'lc_rc_sheet' | 'file_url')
              }
              options={[
                { value: 'drive_link', label: 'Link thư mục Google Drive' },
                { value: 'lc_rc_sheet', label: 'Phiếu câu đúng LC/RC kèm minh chứng' },
                { value: 'file_url', label: 'Đường dẫn tệp bài làm' },
              ]}
            />
            <InputField
              id="asg-form-att"
              label="Link tài liệu đề bài đính kèm (http/https)"
              placeholder="https://drive.google.com/..."
              value={formAttachmentUrl}
              onChange={(e) => setFormAttachmentUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalMode(null)
                setEditingAssignment(null)
              }}
            >
              Hủy
            </Button>
            <Button type="submit" loading={saveAssignmentMutation.isPending}>
              {modalMode === 'edit' ? 'Lưu thay đổi' : 'Giao bài tập'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hộp thoại xác nhận Đóng bài tập */}
      <ConfirmDialog
        open={Boolean(closingTarget)}
        title={`Xác nhận đóng bài tập ${closingTarget?.code ?? ''}`}
        description={
          <div className="space-y-3">
            <p>
              Sau khi đóng bài tập <strong>{closingTarget?.title}</strong>, hệ thống sẽ khóa chỉnh
              sửa đề bài và ngưng yêu cầu nộp lại bài mới (các bài đã nộp vẫn chấm điểm bình
              thường).
            </p>
            <InputField
              id="asg-close-reason"
              label="Ghi chú đóng bài tập (tùy chọn)"
              placeholder="VD: Đã chữa xong đề bài tập trên lớp"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Xác nhận đóng bài tập"
        loading={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate()}
        onClose={() => setClosingTarget(null)}
      />

      {/* Modal Chấm điểm & Nhận xét */}
      <Modal
        open={Boolean(gradingTarget)}
        title={`Chấm bài tập – ${gradingTarget?.submission.studentName ?? ''}`}
        onClose={() => setGradingTarget(null)}
        maxWidthClassName="max-w-md"
      >
        {gradingTarget && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <SelectField
              id="grd-sub-dec"
              label="Kết luận chấm bài *"
              value={decision}
              onChange={(e) => setDecision(e.target.value as 'Graded' | 'ReturnedForRevision')}
              options={[
                { value: 'Graded', label: 'Chấm điểm hoàn tất (Graded)' },
                ...(gradingTarget.assignment.status === 'closed'
                  ? []
                  : [
                      {
                        value: 'ReturnedForRevision',
                        label: 'Yêu cầu học viên sửa & nộp lại (ReturnedForRevision)',
                      },
                    ]),
              ]}
            />
            {decision === 'Graded' && (
              <>
                {gradingTarget.assignment.isDemoTest && (
                  <div className="space-y-3 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3.5 text-xs">
                    <p className="font-extrabold text-[#243B53]">
                      Xác nhận điểm quy đổi Demo Test (LC + RC)
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <InputField
                        id="grd-demo-lc"
                        type="number"
                        min={0}
                        max={495}
                        label="Điểm LC quy đổi (0–495) *"
                        value={demoLcInput}
                        onChange={(e) => {
                          const nextLc = e.target.value
                          setDemoLcInput(nextLc)
                          const sum = (Number(nextLc) || 0) + (Number(demoRcInput) || 0)
                          setScoreInput(String(sum))
                        }}
                        required
                      />
                      <InputField
                        id="grd-demo-rc"
                        type="number"
                        min={0}
                        max={495}
                        label="Điểm RC quy đổi (0–495) *"
                        value={demoRcInput}
                        onChange={(e) => {
                          const nextRc = e.target.value
                          setDemoRcInput(nextRc)
                          const sum = (Number(demoLcInput) || 0) + (Number(nextRc) || 0)
                          setScoreInput(String(sum))
                        }}
                        required
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 font-semibold text-[#243B53]">
                      <input
                        type="checkbox"
                        checked={demoConfirmed}
                        onChange={(e) => setDemoConfirmed(e.target.checked)}
                        className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                      />
                      <span>Giảng viên xác nhận chính thức điểm Demo Test trên hồ sơ học viên</span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InputField
                    id="grd-sub-score"
                    type="number"
                    min={0}
                    max={gradingTarget.assignment.maxScore}
                    placeholder={`0 – ${gradingTarget.assignment.maxScore}`}
                    label={`Điểm đạt được (0 – ${gradingTarget.assignment.maxScore}) *`}
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    required
                  />
                  <SelectField
                    id="grd-sub-outcome"
                    label="Kết quả Đạt / Chưa đạt"
                    value={outcomeInput}
                    onChange={(e) =>
                      setOutcomeInput(e.target.value as '' | 'passed' | 'failed')
                    }
                    options={[
                      { value: 'passed', label: 'Đạt yêu cầu (Passed)' },
                      { value: 'failed', label: 'Chưa đạt yêu cầu (Failed)' },
                      { value: '', label: 'Không phân loại' },
                    ]}
                  />
                </div>
              </>
            )}
            <InputField
              id="grd-sub-fb"
              label={
                decision === 'ReturnedForRevision'
                  ? 'Yêu cầu chỉnh sửa bắt buộc *'
                  : gradingTarget.submission.status === 'Graded'
                    ? 'Nhận xét / Lý do chấm lại điểm'
                    : 'Nhận xét của giảng viên'
              }
              placeholder="Nhận xét ưu điểm và lỗi sai cần khắc phục..."
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              required={decision === 'ReturnedForRevision'}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setGradingTarget(null)}>
                Đóng
              </Button>
              <Button type="submit" loading={gradeMutation.isPending}>
                Lưu kết quả chấm
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
