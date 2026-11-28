import { useMemo, useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calculator, ChevronDown, ChevronUp, Edit3, History, Plus } from 'lucide-react'
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
import {
  ASSESSMENT_CATEGORIES,
  TOEIC_EXAM_PART_KEYS,
  type AssessmentCategory,
  type StudentAssessmentGradeDto,
  type ToeicExamPartBreakdownDto,
  type ToeicExamPartKey,
} from '@english-center/contracts'
import { formatDate, formatDateTimeVi, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import {
  ASSESSMENT_CATEGORY_LABELS,
  getDefaultMaxScoresForCategory,
} from '@/features/teacher/types/teacher.types'

const PART_BREAKDOWN_META: Record<
  ToeicExamPartKey,
  { label: string; defaultTotal: number }
> = {
  p1: { label: 'Part 1 (Tranh – /6)', defaultTotal: 6 },
  p2: { label: 'Part 2 (Hỏi đáp – /25)', defaultTotal: 25 },
  p3: { label: 'Part 3 (Hội thoại – /39)', defaultTotal: 39 },
  p4: { label: 'Part 4 (Bài nói – /30)', defaultTotal: 30 },
  p5: { label: 'Part 5 (Câu đơn – /30)', defaultTotal: 30 },
  p6: { label: 'Part 6 (Điền đoạn – /16)', defaultTotal: 16 },
  p7s: { label: 'Part 7 Đơn (/29)', defaultTotal: 29 },
  p7d: { label: 'Part 7 Kép (/10)', defaultTotal: 10 },
  p7t: { label: 'Part 7 Ba đoạn (/15)', defaultTotal: 15 },
}

type PartInputMap = Record<ToeicExamPartKey, { correct: string; total: string }>

function buildEmptyPartInputs(): PartInputMap {
  return {
    p1: { correct: '', total: '6' },
    p2: { correct: '', total: '25' },
    p3: { correct: '', total: '39' },
    p4: { correct: '', total: '30' },
    p5: { correct: '', total: '30' },
    p6: { correct: '', total: '16' },
    p7s: { correct: '', total: '29' },
    p7d: { correct: '', total: '10' },
    p7t: { correct: '', total: '15' },
  }
}

export function TeacherGradebookPage() {
  useDocumentTitle('Bảng điểm lớp phụ trách')
  const actor = useTeacherActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryClassId = searchParams.get('classId')
  const [classFilterOverride, setClassFilterOverride] = useState<string | null>(null)
  const classFilter = classFilterOverride ?? queryClassId ?? 'ALL'

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AssessmentCategory>('ALL')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [formClassId, setFormClassId] = useState('')
  const [formStudentId, setFormStudentId] = useState('')
  const [formCategory, setFormCategory] = useState<AssessmentCategory>('regular')
  const [formTitle, setFormTitle] = useState('')
  const [formExamDate, setFormExamDate] = useState(todayYmdVn)
  const [maxLcInput, setMaxLcInput] = useState('495')
  const [maxRcInput, setMaxRcInput] = useState('495')
  const [hasScoreEvaluated, setHasScoreEvaluated] = useState(true)
  const [lcScoreInput, setLcScoreInput] = useState('')
  const [rcScoreInput, setRcScoreInput] = useState('')
  const [showPartBreakdown, setShowPartBreakdown] = useState(false)
  const [partInputs, setPartInputs] = useState<PartInputMap>(buildEmptyPartInputs)
  const [commentInput, setCommentInput] = useState('')
  const [changeReason, setChangeReason] = useState('')

  const { data: myClasses = [] } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const activeFormClassId = formClassId || myClasses[0]?.id || ''
  const { data: classDetailForForm } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classDetail(actor.userId, activeFormClassId),
    queryFn: () => teacherApi.getClassDetail(actor, activeFormClassId),
    enabled: Boolean(modalOpen && activeFormClassId),
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.gradebook(actor.userId, classFilter, categoryFilter),
    queryFn: () =>
      teacherApi.getGradebook(actor, { classId: classFilter, category: categoryFilter }),
    retry: false,
  })

  const filteredGrades = useMemo(() => {
    const list = data?.grades ?? []
    if (!search.trim()) return list
    return list.filter(
      (g) =>
        matchText(g.studentName, search) ||
        matchText(g.studentCode, search) ||
        matchText(g.assessmentTitle, search) ||
        matchText(g.classCode, search),
    )
  }, [data, search])

  const filteredSummaries = useMemo(() => {
    const list = data?.studentSummaries ?? []
    if (!search.trim()) return list
    return list.filter(
      (s) =>
        matchText(s.studentName, search) ||
        matchText(s.studentCode, search) ||
        matchText(s.classCode, search),
    )
  }, [data, search])

  const saveMutation = useMutation({
    mutationFn: () => {
      const stuId = formStudentId || classDetailForForm?.students[0]?.id || ''
      if (!stuId) {
        throw new Error('Lớp học chưa có học viên để nhập điểm.')
      }

      const trimmedMaxLc = maxLcInput.trim()
      const trimmedMaxRc = maxRcInput.trim()
      const parsedMaxLc = Number(trimmedMaxLc)
      const parsedMaxRc = Number(trimmedMaxRc)
      if (
        !trimmedMaxLc ||
        !trimmedMaxRc ||
        !Number.isFinite(parsedMaxLc) ||
        parsedMaxLc <= 0 ||
        !Number.isFinite(parsedMaxRc) ||
        parsedMaxRc <= 0
      ) {
        throw new Error('Vui lòng nhập thang điểm tối đa hợp lệ (> 0) cho Listening và Reading.')
      }

      let listeningScore: number | null = null
      let readingScore: number | null = null

      if (hasScoreEvaluated) {
        const trimmedLc = lcScoreInput.trim()
        const trimmedRc = rcScoreInput.trim()
        // Tuyệt đối không để chuỗi rỗng '' bị ép kiểu thành 0 điểm!
        if (!trimmedLc || !trimmedRc) {
          throw new Error(
            'Vui lòng nhập đầy đủ điểm Listening và Reading (hoặc bỏ chọn Đã chấm kết quả để lưu Chưa đánh giá).',
          )
        }
        const parsedLc = Number(trimmedLc)
        const parsedRc = Number(trimmedRc)
        if (!Number.isFinite(parsedLc) || !Number.isFinite(parsedRc)) {
          throw new Error('Điểm Listening và Reading phải là số hợp lệ.')
        }
        listeningScore = parsedLc
        readingScore = parsedRc
      }

      let partBreakdown: ToeicExamPartBreakdownDto | undefined
      const supportsPartBreakdown = formCategory === 'mid' || formCategory === 'final'
      if (hasScoreEvaluated && supportsPartBreakdown && showPartBreakdown) {
        const hasAnyFilled = TOEIC_EXAM_PART_KEYS.some((k) => partInputs[k].correct.trim() !== '')
        if (hasAnyFilled) {
          const parsedBreakdown = {} as ToeicExamPartBreakdownDto
          for (const key of TOEIC_EXAM_PART_KEYS) {
            const meta = PART_BREAKDOWN_META[key]
            const rawCorrect = partInputs[key].correct.trim()
            const rawTotal = partInputs[key].total.trim()
            if (!rawCorrect) {
              throw new Error(
                `Vui lòng nhập đủ số câu đúng cho ${meta.label} (hoặc để trống tất cả 9 phần).`,
              )
            }
            const correctNum = Number(rawCorrect)
            const totalNum = Number(rawTotal) || meta.defaultTotal
            if (
              !Number.isFinite(correctNum) ||
              !Number.isFinite(totalNum) ||
              totalNum <= 0 ||
              correctNum < 0 ||
              correctNum > totalNum
            ) {
              throw new Error(
                `Số câu đúng của ${meta.label} phải nằm trong khoảng 0 đến ${totalNum}.`,
              )
            }
            parsedBreakdown[key] = {
              correct: Math.round(correctNum),
              total: Math.round(totalNum),
            }
          }
          partBreakdown = parsedBreakdown
        }
      }

      if (editingId && !changeReason.trim()) {
        throw new Error('Vui lòng nhập lý do điều chỉnh điểm khi cập nhật bản ghi hiện có.')
      }

      return teacherApi.upsertAssessmentGrade(actor, {
        id: editingId,
        classId: activeFormClassId,
        studentId: stuId,
        category: formCategory,
        assessmentTitle: formTitle,
        examDate: formExamDate,
        maxListeningScore: parsedMaxLc,
        maxReadingScore: parsedMaxRc,
        listeningScore,
        readingScore,
        partBreakdown,
        teacherComment: commentInput,
        changeReason,
      })
    },
    onSuccess: (saved) => {
      setModalOpen(false)
      setChangeReason('')
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã lưu điểm bài kiểm tra cho ${saved.studentName}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu điểm kiểm tra',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const openCreateModal = () => {
    const defaultCls =
      classFilter !== 'ALL' && myClasses.some((c) => c.id === classFilter)
        ? classFilter
        : (myClasses[0]?.id ?? '')
    const defaults = getDefaultMaxScoresForCategory('regular')
    setEditingId(undefined)
    setFormClassId(defaultCls)
    setFormStudentId('')
    setFormCategory('regular')
    setFormTitle('')
    setFormExamDate(todayYmdVn)
    setMaxLcInput(String(defaults.maxListening))
    setMaxRcInput(String(defaults.maxReading))
    setHasScoreEvaluated(true)
    setLcScoreInput('')
    setRcScoreInput('')
    setShowPartBreakdown(false)
    setPartInputs(buildEmptyPartInputs())
    setCommentInput('')
    setChangeReason('')
    setModalOpen(true)
  }

  const openEditModal = (g: StudentAssessmentGradeDto) => {
    const evaluated =
      g.totalScore !== null && g.listeningScore !== null && g.readingScore !== null
    setEditingId(g.id)
    setFormClassId(g.classId)
    setFormStudentId(g.studentId)
    setFormCategory(g.category)
    setFormTitle(g.assessmentTitle)
    setFormExamDate(g.examDate)
    setMaxLcInput(String(g.maxListeningScore))
    setMaxRcInput(String(g.maxReadingScore))
    setHasScoreEvaluated(evaluated)
    // Tuyệt đối khởi tạo '' khi null thay vì '0' để không biến Missing Grade thành 0 điểm
    setLcScoreInput(g.listeningScore !== null ? String(g.listeningScore) : '')
    setRcScoreInput(g.readingScore !== null ? String(g.readingScore) : '')
    if (g.partBreakdown) {
      setShowPartBreakdown(true)
      const mapped = buildEmptyPartInputs()
      for (const k of TOEIC_EXAM_PART_KEYS) {
        mapped[k] = {
          correct: String(g.partBreakdown[k].correct),
          total: String(g.partBreakdown[k].total),
        }
      }
      setPartInputs(mapped)
    } else {
      setShowPartBreakdown(false)
      setPartInputs(buildEmptyPartInputs())
    }
    setCommentInput(g.teacherComment ?? '')
    setChangeReason('')
    setModalOpen(true)
  }

  const handleCategoryChangeInModal = (nextCat: AssessmentCategory) => {
    setFormCategory(nextCat)
    if (!editingId) {
      const defaults = getDefaultMaxScoresForCategory(nextCat)
      setMaxLcInput(String(defaults.maxListening))
      setMaxRcInput(String(defaults.maxReading))
    }
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải sổ điểm kiểm tra..." />
  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải bảng điểm."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const categoryOptions = ASSESSMENT_CATEGORIES.map((cat) => ({
    value: cat,
    label: ASSESSMENT_CATEGORY_LABELS[cat],
  }))

  const computedMaxTotal = (Number(maxLcInput) || 0) + (Number(maxRcInput) || 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bảng điểm & Trọng số Đánh giá Học phần"
        description="Quản lý điểm đánh giá quá trình, giữa khóa, cuối khóa và tổng kết học phần."
        actions={
          myClasses.length > 0 ? (
            <ActionGuard permission="grades.create">
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                <span>Nhập điểm kiểm tra</span>
              </Button>
            </ActionGuard>
          ) : undefined
        }
      />

      {myClasses.length === 0 ? (
        <EmptyBlock title="Chưa có lớp học được phân công." />
      ) : (
        <>
          {/* Bộ lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-3">
        <InputField
          id="grd-search"
          placeholder="Tìm tên HV, mã HV, mã lớp, tên đợt thi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          id="grd-cls"
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
          id="grd-cat"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | AssessmentCategory)}
          options={[
            { value: 'ALL', label: 'Tất cả 6 loại đầu điểm' },
            ...categoryOptions,
          ]}
        />
      </div>

      {/* Bảng 1: Tổng hợp Điểm trung bình có trọng số theo Học viên */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#243B53]">
            <Calculator className="h-4 w-4 text-[#2878B8]" />
            <span>
              Tổng hợp Điểm trung bình có trọng số theo Học viên ({filteredSummaries.length})
            </span>
          </h2>
          <Badge tone="info">BTVN 15% • Quiz/TX 15% • Mid 30% • Final 40%</Badge>
        </div>

        {filteredSummaries.length === 0 ? (
          <EmptyBlock title="Chưa có học viên nào trong phạm vi lớp đang chọn" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="min-w-[180px]">
                    Học viên & Lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    BTVN (15%)
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Quiz / TX (15%)
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Giữa khóa (30%)
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Cuối khóa (40%)
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    TOEIC Mock (/990)
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    ĐTB Trọng số
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái đầu điểm
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {filteredSummaries.map((row) => (
                  <DataTableRow key={`${row.classId}-${row.studentId}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <p className="font-bold text-[#243B53]">{row.studentName}</p>
                      <p className="text-xs text-[#64748B]">
                        {row.studentCode} • Lớp {row.classCode}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {row.homeworkPercent === null ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        `${row.homeworkPercent}%`
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {row.quizRegularPercent === null ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        `${row.quizRegularPercent}%`
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {row.midPercent === null ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        `${row.midPercent}%`
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {row.finalPercent === null ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        `${row.finalPercent}%`
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-right text-xs font-bold whitespace-nowrap text-[#2878B8]">
                      {row.toeicMockScore === null ? '—' : `${row.toeicMockScore}/990`}
                    </DataTableCell>
                    <DataTableCell className="text-right whitespace-nowrap">
                      {row.weightedAveragePercent === null ? (
                        <span className="text-xs text-[#94A3B8]">—</span>
                      ) : (
                        <span className="text-sm font-black text-[#1F7A4C]">
                          {row.weightedAveragePercent}%
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge
                        tone={
                          row.completionState === 'complete'
                            ? 'success'
                            : row.completionState === 'partial'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {row.completionLabel} ({row.gradedBucketsCount}/{row.totalBucketsCount})
                      </Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>

      {/* Bảng 2: Chi tiết từng bản ghi điểm kiểm tra */}
      {filteredGrades.length === 0 ? (
        <EmptyBlock title="Chưa có bản ghi điểm chi tiết khớp điều kiện lọc" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="min-w-[180px]">
                  Học viên & Lớp
                </DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[200px]">
                  Đợt đánh giá & Ngày thi
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Listening
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Reading
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Tổng điểm
                </DataTableHeaderCell>
                <DataTableHeaderCell>Nhận xét chuyên môn</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Cập nhật
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {filteredGrades.map((g) => (
                <DataTableRow key={g.id}>
                  <DataTableCell className="whitespace-nowrap">
                    <p className="font-bold text-[#243B53]">{g.studentName}</p>
                    <p className="text-xs text-[#64748B]">
                      {g.studentCode} • Lớp {g.classCode}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge
                        tone={
                          g.category === 'final'
                            ? 'success'
                            : g.category === 'mid' || g.category === 'toeic_mock'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {ASSESSMENT_CATEGORY_LABELS[g.category]}
                      </Badge>
                      <div>
                        <p className="font-semibold text-[#243B53]">{g.assessmentTitle}</p>
                        <p className="whitespace-nowrap text-[#64748B]">{formatDate(g.examDate)}</p>
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                    {g.listeningScore === null ? '—' : `${g.listeningScore}/${g.maxListeningScore}`}
                  </DataTableCell>
                  <DataTableCell className="text-right text-xs font-semibold whitespace-nowrap">
                    {g.readingScore === null ? '—' : `${g.readingScore}/${g.maxReadingScore}`}
                  </DataTableCell>
                  <DataTableCell className="text-right whitespace-nowrap">
                    {g.totalScore === null ? (
                      <Badge tone="warning">Chưa đánh giá</Badge>
                    ) : (
                      <span className="text-sm font-black text-[#1F7A4C]">
                        {g.totalScore}/{g.maxTotalScore}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="max-w-xs text-xs text-[#475569]">
                    <p>{g.teacherComment ?? '—'}</p>
                    {g.partBreakdown && (
                      <p className="mt-1 text-[11px] font-semibold text-[#2878B8]">
                        9 phần: P1 {g.partBreakdown.p1.correct}/{g.partBreakdown.p1.total} • P2{' '}
                        {g.partBreakdown.p2.correct}/{g.partBreakdown.p2.total} • P3{' '}
                        {g.partBreakdown.p3.correct}/{g.partBreakdown.p3.total} • P4{' '}
                        {g.partBreakdown.p4.correct}/{g.partBreakdown.p4.total} • P5{' '}
                        {g.partBreakdown.p5.correct}/{g.partBreakdown.p5.total} • P6{' '}
                        {g.partBreakdown.p6.correct}/{g.partBreakdown.p6.total} • P7 (
                        {g.partBreakdown.p7s.correct +
                          g.partBreakdown.p7d.correct +
                          g.partBreakdown.p7t.correct}
                        /
                        {g.partBreakdown.p7s.total +
                          g.partBreakdown.p7d.total +
                          g.partBreakdown.p7t.total}
                        )
                      </p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-right whitespace-nowrap">
                    <ActionGuard permission="grades.update">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(g)}>
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Sửa điểm</span>
                        </Button>
                      </div>
                    </ActionGuard>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableContainer>
      )}

      {data.auditLogs.length > 0 && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#243B53]">
            <History className="h-4 w-4 text-[#2878B8]" />
            <span>Nhật ký chỉnh sửa điểm số ({data.auditLogs.length})</span>
          </h2>
          <div className="space-y-2 text-xs">
            {data.auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                <strong>{log.studentName}</strong> ({log.assessmentTitle}):{' '}
                {log.previousTotal === null ? 'Chưa đánh giá' : `${log.previousTotal}đ`} →{' '}
                <strong>{log.nextTotal === null ? 'Chưa đánh giá' : `${log.nextTotal}đ`}</strong> •{' '}
                {log.changedByName} ({formatDateTimeVi(log.changedAt)})
                {log.note ? ` – ${log.note}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal Nhập / Sửa điểm */}
      <Modal
        open={modalOpen}
        title={editingId ? 'Cập nhật điểm bài kiểm tra' : 'Nhập điểm bài kiểm tra mới'}
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="f-grd-cls"
              label="Lớp phụ trách *"
              value={activeFormClassId}
              disabled={Boolean(editingId)}
              onChange={(e) => {
                setFormClassId(e.target.value)
                setFormStudentId('')
              }}
              options={myClasses.map((c) => ({ value: c.id, label: c.classCode }))}
            />
            <SelectField
              id="f-grd-stu"
              label="Học viên *"
              value={formStudentId || classDetailForForm?.students[0]?.id || ''}
              disabled={Boolean(editingId)}
              onChange={(e) => setFormStudentId(e.target.value)}
              options={(classDetailForForm?.students ?? []).map((s) => ({
                value: s.id,
                label: `${s.fullName} (${s.studentCode})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="f-grd-cat"
              label="Loại bài kiểm tra *"
              value={formCategory}
              onChange={(e) => handleCategoryChangeInModal(e.target.value as AssessmentCategory)}
              options={categoryOptions}
            />
            <InputField
              id="f-grd-date"
              type="date"
              label="Ngày kiểm tra *"
              value={formExamDate}
              onChange={(e) => setFormExamDate(e.target.value)}
              required
            />
          </div>

          <InputField
            id="f-grd-title"
            label="Tên đợt kiểm tra *"
            placeholder="VD: Kiểm tra Giữa khóa TOEIC LR / Mini Quiz Unit 4"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3">
            <InputField
              id="f-grd-max-lc"
              type="number"
              min={1}
              max={1000}
              label="Thang tối đa Listening *"
              value={maxLcInput}
              onChange={(e) => setMaxLcInput(e.target.value)}
              required
            />
            <InputField
              id="f-grd-max-rc"
              type="number"
              min={1}
              max={1000}
              label={`Thang tối đa Reading * (Tổng: ${computedMaxTotal})`}
              value={maxRcInput}
              onChange={(e) => setMaxRcInput(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 text-xs font-semibold text-[#243B53]">
            <input
              type="checkbox"
              checked={hasScoreEvaluated}
              onChange={(e) => setHasScoreEvaluated(e.target.checked)}
              className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
            />
            <span>
              Đã chấm có kết quả điểm số (Bỏ chọn nếu học viên chưa thi / chờ thi bù để lưu Chưa
              đánh giá)
            </span>
          </label>

          {hasScoreEvaluated && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  id="f-grd-lc"
                  type="number"
                  min={0}
                  max={Number(maxLcInput) || 495}
                  placeholder={`0 – ${maxLcInput || 495}`}
                  label={`Điểm Listening (0 – ${maxLcInput || 495}) *`}
                  value={lcScoreInput}
                  onChange={(e) => setLcScoreInput(e.target.value)}
                  required
                />
                <InputField
                  id="f-grd-rc"
                  type="number"
                  min={0}
                  max={Number(maxRcInput) || 495}
                  placeholder={`0 – ${maxRcInput || 495}`}
                  label={`Điểm Reading (0 – ${maxRcInput || 495}) *`}
                  value={rcScoreInput}
                  onChange={(e) => setRcScoreInput(e.target.value)}
                  required
                />
              </div>

              {(formCategory === 'mid' || formCategory === 'final') && (
                <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowPartBreakdown((prev) => !prev)}
                    className="flex w-full items-center justify-between font-bold text-[#2878B8]"
                  >
                    <span>
                      Phân tích độ chính xác 9 phần TOEIC (Tùy chọn – đồng bộ biểu đồ Student
                      Portal)
                    </span>
                    {showPartBreakdown ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showPartBreakdown && (
                    <div className="mt-3 grid grid-cols-3 gap-2.5">
                      {TOEIC_EXAM_PART_KEYS.map((partKey) => {
                        const meta = PART_BREAKDOWN_META[partKey]
                        const totalVal = Number(partInputs[partKey].total) || meta.defaultTotal
                        return (
                          <InputField
                            key={partKey}
                            id={`f-grd-part-${partKey}`}
                            type="number"
                            min={0}
                            max={totalVal}
                            placeholder={`0–${totalVal}`}
                            label={meta.label}
                            value={partInputs[partKey].correct}
                            onChange={(e) =>
                              setPartInputs((prev) => ({
                                ...prev,
                                [partKey]: {
                                  ...prev[partKey],
                                  correct: e.target.value,
                                },
                              }))
                            }
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <InputField
            id="f-grd-comment"
            label="Nhận xét chuyên môn"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />

          {editingId && (
            <InputField
              id="f-grd-reason"
              label="Lý do điều chỉnh điểm (Bắt buộc lưu nhật ký) *"
              placeholder="VD: Cập nhật điểm sau buổi thi bù chính thức"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              required
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              Lưu bảng điểm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
