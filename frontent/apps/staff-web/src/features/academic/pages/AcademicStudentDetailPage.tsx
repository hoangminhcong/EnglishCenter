import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit3, RotateCcw, UserCog } from 'lucide-react'
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
import { formatDate, formatDateTimeVi, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'
import {
  ACADEMIC_REQUEST_STATUS_META,
  ACADEMIC_REQUEST_TYPE_LABELS,
  STUDENT_LEARNING_STATUS_META,
} from '@/features/academic/types/academic.types'

const ENROLLMENT_STATUS_LABELS: Record<
  'active' | 'hold' | 'transferred' | 'completed' | 'dropped',
  string
> = {
  active: 'Đang theo học',
  hold: 'Đang bảo lưu',
  transferred: 'Đã chuyển lớp',
  completed: 'Đã hoàn thành',
  dropped: 'Thôi học',
}

const BILLING_EXEMPTION_LABELS: Record<
  'transfer' | 'retake' | 'return_from_hold',
  string
> = {
  transfer: 'Miễn thu mới: Chuyển lớp',
  retake: 'Miễn thu mới: Học lại',
  return_from_hold: 'Miễn thu mới: Khôi phục bảo lưu',
}

export function AcademicStudentDetailPage() {
  const { studentId = '' } = useParams()
  useDocumentTitle(`Hồ sơ học viên ${studentId}`)
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editSchool, setEditSchool] = useState('')
  const [editNote, setEditNote] = useState('')

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<'completed' | 'dropped'>('completed')
  const [statusNote, setStatusNote] = useState('')

  const [resumeOpen, setResumeOpen] = useState(false)
  const [resumeClassId, setResumeClassId] = useState('')
  const [resumeEffectiveDate, setResumeEffectiveDate] = useState(todayYmdVn)
  const [resumeReason, setResumeReason] = useState('Hoàn thành kỳ thực tập, xin quay lại học tiếp khóa đã bảo lưu')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.studentDetail(studentId),
    queryFn: () => academicApi.getStudentDetail(studentId),
    enabled: Boolean(studentId),
  })

  const { data: allClasses = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.classes(),
    queryFn: () => academicApi.listClasses(),
  })

  const compatibleResumeClasses = useMemo(() => {
    if (!data?.student.currentCourseId) return []
    return allClasses.filter(
      (c) =>
        c.courseId === data.student.currentCourseId &&
        c.status !== 'completed' &&
        c.status !== 'cancelled' &&
        (c.remainingSeats === null || c.remainingSeats > 0),
    )
  }, [data, allClasses])

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('Không tìm thấy học viên.')
      const s = data.student
      return academicApi.createOrUpdateStudent({
        id: s.id,
        fullName: editName,
        phone: editPhone,
        email: editEmail,
        dateOfBirth: editDob || undefined,
        schoolOrWork: editSchool,
        branchId: s.branchId,
        currentCourseId: s.currentCourseId,
        entryLc: s.entryScore.lc,
        entryRc: s.entryScore.rc,
        goalLc: s.goalScore.lc,
        goalRc: s.goalScore.rc,
        note: editNote,
      })
    },
    onSuccess: () => {
      setEditOpen(false)
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: 'Đã cập nhật thông tin cá nhân học viên',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật học viên',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('Không tìm thấy học viên.')
      return academicApi.updateStudentLearningStatus(actor, {
        studentId: data.student.id,
        nextStatus,
        note: statusNote,
      })
    },
    onSuccess: (updated) => {
      setStatusModalOpen(false)
      setStatusNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã chuyển trạng thái sang ${STUDENT_LEARNING_STATUS_META[updated.learningStatus].label}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể đổi trạng thái học tập',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const resumeFromHoldMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('Không tìm thấy học viên.')
      const createdReq = await academicApi.createAcademicRequest({
        studentId: data.student.id,
        requestType: 'resume',
        targetClassId: resumeClassId || undefined,
        reason: resumeReason,
        detailNote: resumeClassId
          ? 'Khôi phục học trực tiếp vào lớp tương thích còn chỗ trống.'
          : 'Khôi phục học đưa vào Hàng đợi Xếp lớp theo tháng.',
        effectiveDate: resumeEffectiveDate,
      })
      return academicApi.transitionAcademicRequest(actor, {
        requestId: createdReq.id,
        toStatus: 'Completed',
        resolutionNote: 'Giáo vụ xác nhận khôi phục học sau bảo lưu từ hồ sơ học viên.',
      })
    },
    onSuccess: (completedReq) => {
      setResumeOpen(false)
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'accounting'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã khôi phục học thành công (${completedReq.requestCode})`,
        description: completedReq.targetClassCode
          ? `Học viên đã được xếp vào lớp ${completedReq.targetClassCode} (không phát sinh thu học phí trùng).`
          : 'Học viên đã chuyển sang trạng thái Chờ xếp lớp (miễn tạo công nợ trùng khi xếp lớp).',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể khôi phục học sau bảo lưu',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  if (isLoading) return <LoadingBlock label="Đang tải hồ sơ chi tiết học viên..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy hồ sơ học viên."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { student, enrollments, transferHistory, academicRequests, gradesReadOnly } = data
  const stMeta = STUDENT_LEARNING_STATUS_META[student.learningStatus]

  const openEditModal = () => {
    setEditName(student.fullName)
    setEditPhone(student.phone)
    setEditEmail(student.email ?? '')
    setEditDob(student.dateOfBirth ?? '')
    setEditSchool(student.schoolOrWork ?? '')
    setEditNote(student.note ?? '')
    setEditOpen(true)
  }

  const handleEditSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const handleStatusSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateStatusMutation.mutate()
  }

  const handleResumeSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    resumeFromHoldMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.fullName} (${student.studentCode})`}
        description={`${student.branchName} • Lớp hiện tại: ${student.currentClassCode ?? 'Chờ xếp lớp'}`}
        badge={<Badge tone={stMeta.tone}>{stMeta.label}</Badge>}
        actions={
          <>
            <Link to="/academic/students">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại</span>
              </Button>
            </Link>
            {student.learningStatus === 'hold' && (
              <ActionGuard permission="student-status.manage">
                <Button
                  size="sm"
                  onClick={() => {
                    setResumeClassId('')
                    setResumeEffectiveDate(todayYmdVn)
                    setResumeOpen(true)
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Khôi phục học</span>
                </Button>
              </ActionGuard>
            )}
            {student.learningStatus !== 'completed' && student.learningStatus !== 'dropped' && (
              <ActionGuard permission="students.update">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setNextStatus('completed')
                    setStatusNote('')
                    setStatusModalOpen(true)
                  }}
                >
                  <UserCog className="h-4 w-4" />
                  <span>Chốt hoàn thành / Thôi học</span>
                </Button>
              </ActionGuard>
            )}
            <ActionGuard permission="students.update">
              <Button size="sm" onClick={openEditModal}>
                <Edit3 className="h-4 w-4" />
                <span>Cập nhật hồ sơ</span>
              </Button>
            </ActionGuard>
          </>
        }
      />

      {/* 1. Thông tin cá nhân & 2. Cam kết đầu ra */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">1. Thông tin cá nhân</h2>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <p>
              <span className="text-[#64748B]">Mã học viên:</span>{' '}
              <strong>{student.studentCode}</strong>
            </p>
            <p>
              <span className="text-[#64748B]">Số điện thoại:</span>{' '}
              <strong>{student.phone}</strong>
            </p>
            <p>
              <span className="text-[#64748B]">Email:</span>{' '}
              <strong>{student.email ?? 'Chưa cập nhật'}</strong>
            </p>
            <p>
              <span className="text-[#64748B]">Ngày sinh:</span>{' '}
              <strong>{student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}</strong>
            </p>
            <p>
              <span className="text-[#64748B]">Trường / Đơn vị:</span>{' '}
              <strong>{student.schoolOrWork ?? '—'}</strong>
            </p>
            <p>
              <span className="text-[#64748B]">Cơ sở quản lý:</span>{' '}
              <strong>{student.branchName}</strong>
            </p>
          </div>
          {student.note && (
            <p className="mt-3 rounded-xl bg-[#F8FBFD] p-3 text-xs text-[#475569]">
              Ghi chú học vụ: <strong>{student.note}</strong>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            2. Mốc điểm & Cam kết
          </h2>
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#F8FBFD] p-3.5 text-xs sm:grid-cols-2">
            <div className="min-w-0">
              <span className="text-[#64748B]">Điểm đầu vào</span>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[#243B53]">
                {student.entryScore.total} TOEIC
              </p>
              <span className="text-[11px] tabular-nums text-[#64748B]">
                LC {student.entryScore.lc} • RC {student.entryScore.rc}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[#1F7A4C]">Mục tiêu cam kết</span>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[#1F7A4C]">
                {student.goalScore.total} TOEIC
              </p>
              <span className="text-[11px] tabular-nums text-[#64748B]">
                LC {student.goalScore.lc} • RC {student.goalScore.rc}
              </span>
            </div>
          </div>

          {student.commitmentSummary ? (
            <div className="mt-3 space-y-1 text-xs text-[#475569]">
              <p>
                <span className="text-[#64748B]">Cam kết đầu ra:</span>{' '}
                <strong className="text-[#243B53]">
                  {student.commitmentSummary.advisedOutcomeLabel}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Điều kiện áp dụng:</span>{' '}
                {student.commitmentSummary.conditionsText}
              </p>
              {student.commitmentSummary.sourceRegistrationCode && (
                <p className="text-[#2878B8]">
                  Hồ sơ gốc Sales: {student.commitmentSummary.sourceRegistrationCode}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#64748B]">Chưa có phụ lục cam kết đính kèm.</p>
          )}
        </div>
      </div>

      {/* 3. Lịch sử học tập (Enrollments xuyên suốt - không bao giờ ghi đè lớp cũ) */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
          3. Lịch sử ghi danh các khóa & lớp học ({enrollments.length})
        </h2>
        {enrollments.length === 0 ? (
          <EmptyBlock title="Học viên chưa được xếp vào lớp học nào" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã ghi danh
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[180px]">
                    Khóa học & Lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Thời gian ghi danh
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[180px]">
                    Trạng thái bản ghi
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Học phí chốt lúc ghi danh
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {enrollments.map((enr) => (
                  <DataTableRow key={enr.id}>
                    <DataTableCell className="font-bold whitespace-nowrap text-[#243B53]">
                      {enr.enrollmentCode}
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-semibold text-[#243B53]">{enr.courseName}</p>
                      <Link
                        to={`/academic/classes/${enr.classId}`}
                        className="font-bold whitespace-nowrap text-[#2878B8] hover:underline"
                      >
                        Lớp {enr.classCode}
                      </Link>{' '}
                      <span className="text-[#64748B]">• {enr.branchName}</span>
                    </DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      <p>{formatDateTimeVi(enr.enrolledAt)}</p>
                      {enr.endedAt && (
                        <p className="text-[#64748B]">Kết thúc: {formatDateTimeVi(enr.endedAt)}</p>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            tone={
                              enr.status === 'active'
                                ? 'success'
                                : enr.status === 'hold'
                                  ? 'info'
                                  : enr.status === 'transferred'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          >
                            {ENROLLMENT_STATUS_LABELS[enr.status] ?? enr.status}
                          </Badge>
                          {enr.billingExemptionReason && (
                            <Badge tone="neutral">
                              {BILLING_EXEMPTION_LABELS[enr.billingExemptionReason] ??
                                'Miễn thu mới'}
                            </Badge>
                          )}
                        </div>
                        {enr.note && <p className="text-[11px] text-[#64748B]">{enr.note}</p>}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-right font-semibold whitespace-nowrap text-[#243B53]">
                      {formatVnd(enr.agreedTuitionVnd)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>

      {/* 4. Lịch sử chuyển lớp, bảo lưu / học lại & điểm kiểm tra chỉ đọc */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            4. Lịch sử chuyển lớp & Đơn học vụ ({transferHistory.length + academicRequests.length})
          </h2>
          {transferHistory.length === 0 && academicRequests.length === 0 ? (
            <EmptyBlock title="Chưa phát sinh chuyển lớp hoặc bảo lưu / học lại" />
          ) : (
            <div className="space-y-2.5 text-xs">
              {transferHistory.map((trf) => (
                <div
                  key={trf.id}
                  className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3"
                >
                  <p className="font-bold text-[#243B53]">
                    Chuyển lớp: {trf.fromClassCode} → {trf.toClassCode}
                  </p>
                  <p className="mt-0.5 text-[#475569]">Lý do: {trf.reason}</p>
                  <p className="mt-1 text-[#64748B]">
                    Người thực hiện: {trf.transferredByName} • {formatDateTimeVi(trf.transferredAt)}
                  </p>
                </div>
              ))}
              {academicRequests.map((req) => {
                const st = ACADEMIC_REQUEST_STATUS_META[req.status]
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#EEF4F8] bg-white p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 font-bold text-[#243B53]">
                        {req.requestCode} – {ACADEMIC_REQUEST_TYPE_LABELS[req.requestType]}
                      </span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 text-[#475569]">{req.reason}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            5. Điểm bài kiểm tra chính thức (Chỉ xem từ Giảng viên)
          </h2>
          {gradesReadOnly.length === 0 ? (
            <EmptyBlock title="Chưa có bản ghi điểm kiểm tra cho học viên này" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Bài kiểm tra</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">Ngày thi</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right whitespace-nowrap">
                      Điểm số
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {gradesReadOnly.map((g) => (
                    <DataTableRow key={g.id}>
                      <DataTableCell className="text-xs">
                        <p className="font-bold text-[#243B53]">{g.assessmentTitle}</p>
                        <p className="text-[#64748B]">Lớp {g.classCode}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        {formatDate(g.examDate)}
                      </DataTableCell>
                      <DataTableCell className="text-right text-xs font-extrabold whitespace-nowrap">
                        {g.totalScore === null ? (
                          <span className="text-[#64748B]">Chưa đánh giá</span>
                        ) : (
                          <span className="text-[#1F7A4C]">
                            {g.totalScore}/{g.maxTotalScore}
                          </span>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </div>
      </div>

      {/* Modal cập nhật thông tin cá nhân */}
      <Modal
        open={editOpen}
        title="Cập nhật thông tin cá nhân học viên"
        onClose={() => setEditOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <InputField
            id="edt-stu-name"
            label="Họ và tên *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <InputField
            id="edt-stu-phone"
            label="Số điện thoại *"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            required
          />
          <InputField
            id="edt-stu-email"
            type="email"
            label="Email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <InputField
            id="edt-stu-dob"
            type="date"
            label="Ngày sinh"
            value={editDob}
            onChange={(e) => setEditDob(e.target.value)}
          />
          <InputField
            id="edt-stu-school"
            label="Trường học / Đơn vị"
            value={editSchool}
            onChange={(e) => setEditSchool(e.target.value)}
          />
          <InputField
            id="edt-stu-note"
            label="Ghi chú học vụ"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Chốt hoàn thành / Thôi học */}
      <Modal
        open={statusModalOpen}
        title={`Cập nhật trạng thái học tập – ${student.fullName}`}
        onClose={() => setStatusModalOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <SelectField
            id="dtl-stu-status"
            label="Trạng thái mới *"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as 'completed' | 'dropped')}
            options={[
              { value: 'completed', label: 'Đã hoàn thành khóa học' },
              { value: 'dropped', label: 'Thôi học' },
            ]}
          />
          <InputField
            id="dtl-stu-status-note"
            label={nextStatus === 'dropped' ? 'Lý do thôi học *' : 'Ghi chú hoàn thành khóa'}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            required={nextStatus === 'dropped'}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStatusModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant={nextStatus === 'dropped' ? 'danger' : 'primary'}
              loading={updateStatusMutation.isPending}
            >
              Xác nhận
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Khôi phục học sau Bảo lưu */}
      <Modal
        open={resumeOpen}
        title={`Khôi phục học sau Bảo lưu – ${student.fullName}`}
        onClose={() => setResumeOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleResumeSubmit} className="space-y-4">
          <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
            <p>
              <span className="text-[#64748B]">Khóa học đang bảo lưu:</span>{' '}
              <strong>{student.currentCourseName ?? student.currentCourseId}</strong>
            </p>
            <p className="text-[#475569]">
              Nếu học viên đã có khoản phải thu cho khóa học này bên Kế toán, hệ thống sẽ tự động
              miễn tạo công nợ trùng.
            </p>
          </div>

          <SelectField
            id="res-target-cls"
            label="Chọn lớp xếp vào ngay (Hoặc để trống để chuyển sang Hàng đợi xếp lớp)"
            value={resumeClassId}
            onChange={(e) => setResumeClassId(e.target.value)}
            options={[
              { value: '', label: '— Đưa vào Hàng đợi Chờ xếp lớp theo tháng —' },
              ...compatibleResumeClasses.map((c) => ({
                value: c.id,
                label: `${c.classCode} – ${c.branchName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
              })),
            ]}
          />

          <InputField
            id="res-eff-date"
            type="date"
            label="Ngày bắt đầu quay lại học *"
            value={resumeEffectiveDate}
            onChange={(e) => setResumeEffectiveDate(e.target.value)}
            required
          />

          <InputField
            id="res-reason"
            label="Ghi chú khôi phục học *"
            value={resumeReason}
            onChange={(e) => setResumeReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResumeOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={resumeFromHoldMutation.isPending}>
              Xác nhận khôi phục học
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
