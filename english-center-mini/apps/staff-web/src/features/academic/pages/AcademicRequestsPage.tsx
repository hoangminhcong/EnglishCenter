import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
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
import type {
  AcademicRequestStatus,
  AcademicRequestType,
  StudentAcademicRequestDto,
} from '@english-center/contracts'
import { formatDate, formatDateTimeVi, matchText } from '@english-center/utils'
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
} from '@/features/academic/types/academic.types'

export function AcademicRequestsPage() {
  useDocumentTitle('Bảo lưu / Khôi phục / Chuyển lớp / Học lại')
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | AcademicRequestType>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AcademicRequestStatus>('ALL')

  const [createOpen, setCreateOpen] = useState(false)
  const [requestType, setRequestType] = useState<AcademicRequestType>('hold')
  const [studentId, setStudentId] = useState('')
  const [targetClassId, setTargetClassId] = useState('')
  const [reason, setReason] = useState('')
  const [detailNote, setDetailNote] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(todayYmdVn)
  const [holdUntilDate, setHoldUntilDate] = useState('')

  const [actionTarget, setActionTarget] = useState<{
    req: StudentAcademicRequestDto
    toStatus: AcademicRequestStatus
  } | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionTargetClassId, setActionTargetClassId] = useState('')

  const {
    data: requests = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.requests(),
    queryFn: () => academicApi.listAcademicRequests(),
  })

  const { data: students = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.students(),
    queryFn: () => academicApi.listStudents(),
  })

  const { data: classes = [] } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.classes(),
    queryFn: () => academicApi.listClasses(),
  })

  const eligibleStudentsForRequest = useMemo(() => {
    if (requestType === 'hold') {
      return students.filter((s) => s.learningStatus === 'studying')
    }
    if (requestType === 'resume') {
      return students.filter((s) => s.learningStatus === 'hold')
    }
    if (requestType === 'transfer') {
      return students.filter((s) => s.learningStatus === 'studying' && Boolean(s.currentClassId))
    }
    return students.filter((s) => s.learningStatus !== 'dropped')
  }, [students, requestType])

  const selectedStudent = useMemo(
    () =>
      eligibleStudentsForRequest.find((s) => s.id === studentId) ??
      eligibleStudentsForRequest[0] ??
      null,
    [eligibleStudentsForRequest, studentId],
  )

  const matchingOpenClasses = useMemo(() => {
    if (!selectedStudent) return []
    return classes.filter((c) => {
      if (c.status === 'completed' || c.status === 'cancelled') return false
      if (c.remainingSeats !== null && c.remainingSeats <= 0) return false
      if (selectedStudent.currentCourseId && c.courseId !== selectedStudent.currentCourseId) {
        return false
      }
      if (requestType === 'transfer' && c.id === selectedStudent.currentClassId) {
        return false
      }
      return true
    })
  }, [classes, selectedStudent, requestType])

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter !== 'ALL' && r.requestType !== typeFilter) return false
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(r.requestCode, search) ||
          matchText(r.studentName, search) ||
          matchText(r.studentCode, search) ||
          matchText(r.reason, search)
        )
      }
      return true
    })
  }, [requests, typeFilter, statusFilter, search])

  const createMutation = useMutation({
    mutationFn: () => {
      const resolvedStudentId = selectedStudent?.id ?? ''
      const resolvedTargetClassId =
        requestType === 'hold'
          ? undefined
          : requestType === 'resume'
            ? targetClassId || undefined
            : targetClassId || matchingOpenClasses[0]?.id || undefined
      return academicApi.createAcademicRequest({
        studentId: resolvedStudentId,
        requestType,
        targetClassId: resolvedTargetClassId,
        reason,
        detailNote,
        effectiveDate,
        holdUntilDate: requestType === 'hold' ? holdUntilDate || undefined : undefined,
      })
    },
    onSuccess: (created) => {
      setCreateOpen(false)
      setReason('')
      setDetailNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã tiếp nhận đơn ${created.requestCode}`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể tạo đơn yêu cầu',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const matchingActionTargetClasses = useMemo(() => {
    if (!actionTarget) return []
    const { req } = actionTarget
    return classes.filter((c) => {
      if (c.status === 'completed' || c.status === 'cancelled') return false
      if (c.remainingSeats !== null && c.remainingSeats <= 0) return false
      if (req.currentCourseId && c.courseId !== req.currentCourseId) return false
      if (req.requestType === 'transfer' && c.id === req.currentClassId) return false
      return true
    })
  }, [classes, actionTarget])

  const transitionMutation = useMutation({
    mutationFn: () => {
      if (!actionTarget) throw new Error('Chưa chọn đơn.')
      const needsTargetClass =
        actionTarget.toStatus === 'Approved' &&
        (actionTarget.req.requestType === 'transfer' || actionTarget.req.requestType === 'retake')
      const resolvedTargetCls =
        actionTargetClassId ||
        actionTarget.req.targetClassId ||
        (needsTargetClass ? matchingActionTargetClasses[0]?.id : undefined)

      return academicApi.transitionAcademicRequest(actor, {
        requestId: actionTarget.req.id,
        toStatus: actionTarget.toStatus,
        resolutionNote,
        targetClassId: resolvedTargetCls || undefined,
      })
    },
    onSuccess: (updated) => {
      setActionTarget(null)
      setResolutionNote('')
      setActionTargetClassId('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'accounting'] })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã cập nhật đơn ${updated.requestCode}`,
        description: `Trạng thái mới: ${ACADEMIC_REQUEST_STATUS_META[updated.status].label}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể chuyển trạng thái đơn',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleOpenCreateModal = () => {
    setRequestType('hold')
    const firstStudying = students.find((s) => s.learningStatus === 'studying')
    setStudentId(firstStudying?.id ?? students[0]?.id ?? '')
    setTargetClassId('')
    setEffectiveDate(todayYmdVn)
    setHoldUntilDate('')
    setReason('')
    setDetailNote('')
    setCreateOpen(true)
  }

  const handleRequestTypeChange = (nextType: AcademicRequestType) => {
    setRequestType(nextType)
    setTargetClassId('')
    if (nextType === 'resume') {
      const firstHold = students.find((s) => s.learningStatus === 'hold')
      setStudentId(firstHold?.id ?? '')
    } else if (nextType === 'hold' || nextType === 'transfer') {
      const firstStudying = students.find((s) => s.learningStatus === 'studying')
      setStudentId(firstStudying?.id ?? '')
    } else {
      const firstEligible = students.find((s) => s.learningStatus !== 'dropped')
      setStudentId(firstEligible?.id ?? '')
    }
  }

  const handleCreateSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleTransitionSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    transitionMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách đơn học vụ..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách đơn Bảo lưu / Khôi phục / Chuyển lớp / Học lại."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Bảo lưu / Khôi phục / Chuyển lớp / Học lại"
        description="Tiếp nhận và xử lý đơn bảo lưu, khôi phục học, chuyển lớp và học lại."
        badge={<Badge tone="info">{requests.length} yêu cầu</Badge>}
        actions={
          <ActionGuard permission="student-status.manage">
            <Button size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Tạo đơn yêu cầu mới</span>
            </Button>
          </ActionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-3">
        <InputField
          id="req-search"
          placeholder="Tìm mã đơn, họ tên HV, mã HV, lý do..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          id="req-type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'ALL' | AcademicRequestType)}
          options={[
            { value: 'ALL', label: 'Mọi loại yêu cầu' },
            { value: 'hold', label: 'Bảo lưu khóa học' },
            { value: 'resume', label: 'Khôi phục học sau Bảo lưu' },
            { value: 'transfer', label: 'Chuyển lớp học' },
            { value: 'retake', label: 'Đăng ký học lại' },
          ]}
        />
        <SelectField
          id="req-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AcademicRequestStatus)}
          options={[
            { value: 'ALL', label: 'Mọi trạng thái xử lý' },
            { value: 'Pending', label: 'Chờ tiếp nhận' },
            { value: 'Reviewing', label: 'Đang thẩm định' },
            { value: 'Approved', label: 'Đã phê duyệt' },
            { value: 'Completed', label: 'Đã hoàn tất xử lý' },
            { value: 'Rejected', label: 'Từ chối' },
            { value: 'Cancelled', label: 'Đã hủy đơn' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock title="Không có đơn yêu cầu nào khớp điều kiện lọc" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Mã đơn & Ngày nộp
                </DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[190px]">Học viên & Lớp</DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[220px]">
                  Loại đơn & Lý do
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Thời hạn áp dụng
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">Trạng thái</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Xử lý
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {filtered.map((req) => {
                const st = ACADEMIC_REQUEST_STATUS_META[req.status]
                return (
                  <DataTableRow key={req.id}>
                    <DataTableCell className="whitespace-nowrap">
                      <p className="font-bold text-[#243B53]">{req.requestCode}</p>
                      <p className="text-xs text-[#64748B]">{formatDateTimeVi(req.submittedAt)}</p>
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-bold whitespace-nowrap text-[#243B53]">
                        {req.studentName} ({req.studentCode})
                      </p>
                      <p className="text-[#64748B]">
                        Hiện tại: <strong>{req.currentClassCode ?? 'Chờ xếp lớp'}</strong>
                        {req.targetClassCode
                          ? ` → Đích: ${req.targetClassCode}`
                          : req.requestType === 'transfer' || req.requestType === 'retake'
                            ? ' → Đích: Chọn khi duyệt'
                            : ''}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="max-w-xs text-xs">
                      <p className="font-bold text-[#2878B8]">
                        {ACADEMIC_REQUEST_TYPE_LABELS[req.requestType]}
                      </p>
                      <p className="text-[#243B53]">{req.reason}</p>
                      {req.resolutionNote && (
                        <p className="mt-1 text-[#1F7A4C]">Kết quả: {req.resolutionNote}</p>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      <p>Từ: {formatDate(req.effectiveDate)}</p>
                      {req.holdUntilDate && (
                        <p className="text-[#64748B]">Đến: {formatDate(req.holdUntilDate)}</p>
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right whitespace-nowrap">
                      <ActionGuard permission="student-status.manage">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {req.status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setActionTarget({ req, toStatus: 'Reviewing' })
                                setResolutionNote('Tiếp nhận kiểm tra điều kiện học vụ.')
                              }}
                            >
                              Thẩm định
                            </Button>
                          )}
                          {(req.status === 'Pending' || req.status === 'Reviewing') && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setActionTarget({ req, toStatus: 'Approved' })
                                  setActionTargetClassId(req.targetClassId ?? '')
                                  setResolutionNote('Đủ điều kiện học vụ, phê duyệt đơn.')
                                }}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setActionTarget({ req, toStatus: 'Rejected' })
                                  setResolutionNote('')
                                }}
                              >
                                Từ chối
                              </Button>
                              {req.status === 'Pending' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setActionTarget({ req, toStatus: 'Cancelled' })
                                    setResolutionNote('Học viên rút lại yêu cầu học vụ.')
                                  }}
                                >
                                  Hủy yêu cầu
                                </Button>
                              )}
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActionTarget({ req, toStatus: 'Completed' })
                                setResolutionNote('Đã thực thi cập nhật hồ sơ & lớp học.')
                              }}
                            >
                              Hoàn tất thực thi
                            </Button>
                          )}
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

      {/* Modal tạo đơn mới */}
      <Modal
        open={createOpen}
        title="Lập đơn Bảo lưu / Khôi phục / Chuyển lớp / Học lại"
        onClose={() => setCreateOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="new-req-type"
              label="Loại yêu cầu *"
              value={requestType}
              onChange={(e) => handleRequestTypeChange(e.target.value as AcademicRequestType)}
              options={[
                { value: 'hold', label: 'Bảo lưu khóa học' },
                { value: 'resume', label: 'Khôi phục học sau Bảo lưu' },
                { value: 'transfer', label: 'Chuyển lớp học' },
                { value: 'retake', label: 'Đăng ký học lại' },
              ]}
            />
            <InputField
              id="new-req-eff"
              type="date"
              label="Ngày bắt đầu áp dụng *"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          {eligibleStudentsForRequest.length === 0 ? (
            <EmptyBlock
              title={`Hiện không có học viên nào đủ điều kiện lập đơn "${ACADEMIC_REQUEST_TYPE_LABELS[requestType]}"`}
            />
          ) : (
            <>
              <SelectField
                id="new-req-stu"
                label="Học viên *"
                value={selectedStudent?.id ?? ''}
                onChange={(e) => {
                  setStudentId(e.target.value)
                  setTargetClassId('')
                }}
                options={eligibleStudentsForRequest.map((s) => ({
                  value: s.id,
                  label: `${s.fullName} (${s.studentCode}) – ${s.currentCourseName ?? 'Chưa chọn khóa'} (${s.currentClassCode ?? 'Bảo lưu/Chờ xếp'})`,
                }))}
              />

              {requestType === 'hold' ? (
                <InputField
                  id="new-req-until"
                  type="date"
                  min={effectiveDate}
                  label="Bảo lưu đến ngày (>= Ngày áp dụng)"
                  value={holdUntilDate}
                  onChange={(e) => setHoldUntilDate(e.target.value)}
                />
              ) : requestType === 'resume' ? (
                <SelectField
                  id="new-req-resume-cls"
                  label="Lớp xếp lại (Để trống để chuyển sang Hàng đợi Chờ xếp lớp)"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  options={[
                    { value: '', label: '— Đưa về trạng thái Chờ xếp lớp —' },
                    ...matchingOpenClasses.map((c) => ({
                      value: c.id,
                      label: `${c.classCode} – ${c.courseName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
                    })),
                  ]}
                />
              ) : (
                <SelectField
                  id="new-req-target-cls"
                  label="Lớp chuyển đến / Lớp học lại cùng khóa còn chỗ trống *"
                  value={targetClassId || matchingOpenClasses[0]?.id || ''}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  options={
                    matchingOpenClasses.length === 0
                      ? [{ value: '', label: '— Chưa có lớp mở cùng khóa còn chỗ —' }]
                      : matchingOpenClasses.map((c) => ({
                          value: c.id,
                          label: `${c.classCode} – ${c.courseName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
                        }))
                  }
                />
              )}

              <InputField
                id="new-req-reason"
                label="Lý do chính *"
                placeholder="VD: Lịch thực tập tốt nghiệp trùng ca học tối"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <InputField
                id="new-req-detail"
                label="Ghi chú chi tiết & minh chứng"
                value={detailNote}
                onChange={(e) => setDetailNote(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={
                    (requestType === 'transfer' || requestType === 'retake') &&
                    matchingOpenClasses.length === 0
                  }
                >
                  Ghi nhận đơn yêu cầu
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Modal Chuyển trạng thái đơn */}
      <Modal
        open={Boolean(actionTarget)}
        title={`Cập nhật đơn ${actionTarget?.req.requestCode ?? ''}`}
        onClose={() => setActionTarget(null)}
        maxWidthClassName="max-w-md"
      >
        {actionTarget && (
          <form onSubmit={handleTransitionSubmit} className="space-y-4">
            <p className="text-xs text-[#475569]">
              Chuyển trạng thái sang:{' '}
              <strong>{ACADEMIC_REQUEST_STATUS_META[actionTarget.toStatus].label}</strong>.
            </p>
            {actionTarget.toStatus === 'Approved' &&
              (actionTarget.req.requestType === 'transfer' ||
                actionTarget.req.requestType === 'retake' ||
                actionTarget.req.requestType === 'resume') && (
                <SelectField
                  id="act-req-target-cls"
                  label={
                    actionTarget.req.requestType === 'resume'
                      ? 'Lớp xếp lại (Để trống để chuyển sang Chờ xếp lớp)'
                      : 'Chọn lớp đích cùng khóa còn chỗ trống *'
                  }
                  value={
                    actionTargetClassId ||
                    actionTarget.req.targetClassId ||
                    (actionTarget.req.requestType !== 'resume'
                      ? (matchingActionTargetClasses[0]?.id ?? '')
                      : '')
                  }
                  onChange={(e) => setActionTargetClassId(e.target.value)}
                  options={
                    actionTarget.req.requestType === 'resume'
                      ? [
                          { value: '', label: '— Chuyển về Hàng đợi Chờ xếp lớp —' },
                          ...matchingActionTargetClasses.map((c) => ({
                            value: c.id,
                            label: `${c.classCode} – ${c.courseName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
                          })),
                        ]
                      : matchingActionTargetClasses.length === 0
                        ? [{ value: '', label: '— Hiện chưa có lớp cùng khóa còn chỗ trống —' }]
                        : matchingActionTargetClasses.map((c) => ({
                            value: c.id,
                            label: `${c.classCode} – ${c.courseName} (${c.studyDays}, còn ${c.remainingSeats ?? '?'} chỗ)`,
                          }))
                  }
                />
              )}
            <InputField
              id="act-req-note"
              label={
                actionTarget.toStatus === 'Rejected' ? 'Lý do từ chối *' : 'Ghi chú giải quyết'
              }
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              required={actionTarget.toStatus === 'Rejected'}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setActionTarget(null)}>
                Đóng
              </Button>
              <Button
                type="submit"
                variant={actionTarget.toStatus === 'Rejected' ? 'danger' : 'primary'}
                loading={transitionMutation.isPending}
              >
                Xác nhận
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
