import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRightLeft, UserPlus } from 'lucide-react'
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
import { formatDate, formatDateTimeVi } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'
import {
  CLASS_STATUS_META,
  STUDENT_LEARNING_STATUS_META,
} from '@/features/academic/types/academic.types'

export function AcademicClassDetailPage() {
  const { classId = '' } = useParams()
  useDocumentTitle(`Chi tiết lớp học ${classId}`)
  const actor = useAcademicActor()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [enrollNote, setEnrollNote] = useState('')

  const [transferTargetStudentId, setTransferTargetStudentId] = useState<string | null>(null)
  const [targetClassId, setTargetClassId] = useState('')
  const [transferReason, setTransferReason] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.classDetail(classId),
    queryFn: () => academicApi.getClassDetail(classId),
    enabled: Boolean(classId),
  })

  const { data: allStudents = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.students(),
    queryFn: () => academicApi.listStudents(),
  })

  const { data: allClasses = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.classes(),
    queryFn: () => academicApi.listClasses(),
  })

  // Chỉ liệt kê học viên chờ xếp lớp (hoặc đã hoàn thành khóa trước) tương thích với khóa học của lớp
  const eligibleStudentsToAdd = useMemo(() => {
    if (!data) return []
    const rosterIds = new Set(data.roster.map((r) => r.student.id))
    return allStudents.filter((s) => {
      if (rosterIds.has(s.id)) return false
      if (s.learningStatus === 'dropped' || s.learningStatus === 'hold' || s.learningStatus === 'studying') {
        return false
      }
      if (s.learningStatus === 'waiting_placement') {
        return !s.currentCourseId || s.currentCourseId === data.classInfo.courseId
      }
      return s.learningStatus === 'completed'
    })
  }, [data, allStudents])

  // Chuyển lớp bắt buộc cùng khóa học (cls.courseId === fromCls.courseId) và còn chỗ trống
  const compatibleTransferClasses = useMemo(() => {
    if (!data) return []
    return allClasses.filter(
      (c) =>
        c.id !== data.classInfo.id &&
        c.courseId === data.classInfo.courseId &&
        c.status !== 'completed' &&
        c.status !== 'cancelled' &&
        (c.remainingSeats === null || c.remainingSeats > 0),
    )
  }, [data, allClasses])

  const selectedAddStudentObj = useMemo(
    () =>
      eligibleStudentsToAdd.find((s) => s.id === selectedStudentId) ??
      eligibleStudentsToAdd[0] ??
      null,
    [eligibleStudentsToAdd, selectedStudentId],
  )

  const enrollMutation = useMutation({
    mutationFn: () => {
      const stuId = selectedStudentId || eligibleStudentsToAdd[0]?.id || ''
      return academicApi.enrollStudentIntoClass({
        classId,
        studentId: stuId,
        note: enrollNote,
      })
    },
    onSuccess: (created) => {
      setAddStudentOpen(false)
      setEnrollNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'accounting'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã thêm học viên vào lớp (${created.enrollmentCode})`,
        description: 'Sĩ số lớp đã cập nhật và sẵn sàng để Kế toán tạo khoản phải thu.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể thêm học viên vào lớp',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!transferTargetStudentId) throw new Error('Chưa chọn học viên.')
      const destId = targetClassId || compatibleTransferClasses[0]?.id || ''
      return academicApi.transferStudentClass(actor, {
        studentId: transferTargetStudentId,
        fromClassId: classId,
        toClassId: destId,
        reason: transferReason,
      })
    },
    onSuccess: () => {
      setTransferTargetStudentId(null)
      setTransferReason('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'accounting'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: 'Đã chuyển lớp cùng khóa thành công',
        description:
          'Lịch sử lớp cũ được bảo toàn, miễn tạo thu trùng và tự động cập nhật mã lớp trên Khoản phải thu hiện có.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể chuyển lớp',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  if (isLoading) return <LoadingBlock label="Đang tải danh sách lớp và sĩ số..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không tìm thấy lớp đào tạo."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { classInfo, roster, transferHistory } = data
  const stMeta = CLASS_STATUS_META[classInfo.status]
  const transferStudentObj = roster.find((r) => r.student.id === transferTargetStudentId)?.student

  const handleEnrollSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    enrollMutation.mutate()
  }

  const handleTransferSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    transferMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lớp ${classInfo.classCode} – ${classInfo.className}`}
        description={`${classInfo.courseName} • ${classInfo.branchName} • Giảng viên: ${classInfo.teacherName ?? 'Chưa phân công'}`}
        badge={<Badge tone={stMeta.tone}>{stMeta.label}</Badge>}
        actions={
          <>
            <Link to="/academic/classes">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                <span>Tất cả lớp</span>
              </Button>
            </Link>
            {classInfo.status !== 'completed' && classInfo.status !== 'cancelled' && (
              <ActionGuard permission="classes.assign_students">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedStudentId(eligibleStudentsToAdd[0]?.id ?? '')
                    setAddStudentOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Thêm học viên vào lớp</span>
                </Button>
              </ActionGuard>
            )}
          </>
        }
      />

      {/* Thông tin lớp & sĩ số */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs text-[#64748B]">Sĩ số hiện tại</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#243B53]">
            {classInfo.enrolledStudents ?? 0} / {classInfo.maxStudents ?? '—'} HV
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs text-[#64748B]">Chỗ trống còn lại</span>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-[#1F7A4C]">
            {classInfo.remainingSeats === null ? 'Chưa giới hạn' : `${classInfo.remainingSeats} chỗ`}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs text-[#64748B]">Lịch học cố định</span>
          <p className="mt-1 text-sm font-extrabold text-[#243B53]">
            {classInfo.endTime
              ? `${classInfo.studyDays} (${classInfo.startTime}–${classInfo.endTime})`
              : classInfo.studyDays === classInfo.startTime
                ? classInfo.studyDays
                : `${classInfo.studyDays} (${classInfo.startTime})`}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
          <span className="text-xs text-[#64748B]">Khai giảng & Phòng</span>
          <p className="mt-1 text-sm font-extrabold text-[#243B53]">
            {classInfo.startDateDisplay ?? formatDate(classInfo.startDate)} •{' '}
            {classInfo.roomLabel ?? classInfo.studyMode}
          </p>
        </div>
      </div>

      {/* Danh sách học viên trong lớp */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
          Danh sách học viên đang ghi danh ({roster.length})
        </h2>

        {roster.length === 0 ? (
          <EmptyBlock title="Lớp hiện chưa có học viên ghi danh" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã HV & Họ tên
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Liên hệ</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã ghi danh
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Mốc điểm</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái học tập
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Điều phối
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {roster.map(({ enrollment, student }) => {
                  const st = STUDENT_LEARNING_STATUS_META[student.learningStatus]
                  return (
                    <DataTableRow key={enrollment.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <Link
                          to={`/academic/students/${student.id}`}
                          className="font-extrabold text-[#2878B8] hover:underline"
                        >
                          {student.studentCode}
                        </Link>
                        <p className="font-semibold text-[#243B53]">{student.fullName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        <p>{student.phone}</p>
                        <p className="text-[#64748B]">{student.email ?? '—'}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs font-semibold whitespace-nowrap text-[#243B53]">
                        {enrollment.enrollmentCode}
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap">
                        {student.entryScore.total} → <strong>{student.goalScore.total}</strong>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        {enrollment.status === 'active' && (
                          <ActionGuard permission="classes.transfer_students">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setTransferTargetStudentId(student.id)
                                  setTargetClassId(compatibleTransferClasses[0]?.id ?? '')
                                  setTransferReason('')
                                }}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                <span>Chuyển lớp</span>
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

      {/* Lịch sử chuyển lớp liên quan tới lớp này */}
      {transferHistory.length > 0 && (
        <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
          <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
            Lịch sử điều chuyển lớp liên quan ({transferHistory.length})
          </h2>
          <div className="space-y-2 text-xs">
            {transferHistory.map((trf) => (
              <div key={trf.id} className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                <p className="font-bold text-[#243B53]">
                  {trf.studentName} ({trf.studentCode}): {trf.fromClassCode} → {trf.toClassCode}
                </p>
                <p className="text-[#475569]">Lý do: {trf.reason}</p>
                <p className="text-[#64748B]">
                  Thực hiện bởi {trf.transferredByName} • {formatDateTimeVi(trf.transferredAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Thêm học viên vào lớp */}
      <Modal
        open={addStudentOpen}
        title={`Thêm học viên vào lớp ${classInfo.classCode} (${classInfo.courseName})`}
        onClose={() => setAddStudentOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        {eligibleStudentsToAdd.length === 0 ? (
          <EmptyBlock
            title={`Không có học viên chờ xếp lớp tương thích với khóa ${classInfo.courseName}`}
            description="Chỉ học viên đang Chờ xếp lớp đúng khóa học (hoặc học viên đã hoàn thành khóa trước chuyển tiếp lên) mới được liệt kê tại đây."
          />
        ) : (
          <form onSubmit={handleEnrollSubmit} className="space-y-4">
            <SelectField
              id="add-stu-select"
              label="Chọn học viên đủ điều kiện & tương thích khóa học *"
              value={selectedStudentId || eligibleStudentsToAdd[0]?.id || ''}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              options={eligibleStudentsToAdd.map((s) => ({
                value: s.id,
                label: `${s.fullName} (${s.studentCode}) – ${STUDENT_LEARNING_STATUS_META[s.learningStatus].label}`,
              }))}
            />
            {selectedAddStudentObj &&
              selectedAddStudentObj.currentCourseId &&
              selectedAddStudentObj.currentCourseId !== classInfo.courseId && (
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                  Lưu ý chuyển tiếp khóa học: Học viên đã hoàn thành khóa{' '}
                  <strong>{selectedAddStudentObj.currentCourseName}</strong> và sẽ ghi danh mới lên
                  khóa <strong>{classInfo.courseName}</strong>.
                </div>
              )}
            <InputField
              id="add-stu-note"
              label="Ghi chú ghi danh"
              placeholder="VD: Bổ sung học viên kiểm tra đầu vào đạt yêu cầu"
              value={enrollNote}
              onChange={(e) => setEnrollNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={enrollMutation.isPending}>
                Xác nhận thêm vào lớp
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Chuyển lớp cùng khóa học */}
      <Modal
        open={Boolean(transferTargetStudentId)}
        title={`Chuyển lớp cho ${transferStudentObj?.fullName ?? ''}`}
        onClose={() => setTransferTargetStudentId(null)}
        maxWidthClassName="max-w-lg"
      >
        {compatibleTransferClasses.length === 0 ? (
          <EmptyBlock
            title={`Chưa có lớp tương thích nào khác cùng khóa ${classInfo.courseName} còn chỗ trống`}
            description="Quy định học vụ chỉ cho phép chuyển lớp trong cùng một khóa học."
          />
        ) : (
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs space-y-1">
              <p>
                <span className="text-[#64748B]">1. Học viên:</span>{' '}
                <strong>
                  {transferStudentObj?.fullName} ({transferStudentObj?.studentCode})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">2. Lớp hiện tại (bảo toàn lịch sử):</span>{' '}
                <strong>{classInfo.classCode}</strong> – Khóa <strong>{classInfo.courseName}</strong>
              </p>
              <p className="text-[#64748B]">
                Chỉ cho phép chuyển sang lớp cùng khóa học. Đợt ghi danh mới được miễn lập khoản
                phải thu trùng và tự động cập nhật mã lớp trên công nợ Kế toán hiện có.
              </p>
            </div>

            <SelectField
              id="trf-target-cls"
              label="3. Chọn lớp mới cùng khóa còn chỗ trống *"
              value={targetClassId || compatibleTransferClasses[0]?.id || ''}
              onChange={(e) => setTargetClassId(e.target.value)}
              options={compatibleTransferClasses.map((c) => ({
                value: c.id,
                label: `${c.classCode} – ${c.branchName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
              }))}
            />

            <InputField
              id="trf-reason"
              label="4. Lý do chuyển lớp (Bắt buộc lưu vết) *"
              placeholder="VD: Trùng lịch học chính khóa trên trường đại học"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTransferTargetStudentId(null)}
              >
                Hủy
              </Button>
              <Button type="submit" loading={transferMutation.isPending}>
                Xác nhận chuyển lớp
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
