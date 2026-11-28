import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckSquare, History, Save } from 'lucide-react'
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
  SelectField,
} from '@english-center/ui'
import type { TeacherAttendanceStatus } from '@english-center/contracts'
import { formatDate, formatDateTimeVi } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import { ATTENDANCE_STATUS_META } from '@/features/teacher/types/teacher.types'

type MarkedChoice = Exclude<TeacherAttendanceStatus, 'Unmarked'>

export function TeacherAttendancePage() {
  useDocumentTitle('Điểm danh buổi học')
  const { can } = useStaffAuth()
  const actor = useTeacherActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const canCreateAttendance = can('attendance.create')
  const canUpdateAttendance = can('attendance.update')

  const [selectedClassOverride, setSelectedClassOverride] = useState<string | null>(null)
  const [selectedSessionOverride, setSelectedSessionOverride] = useState<string | null>(null)

  const [draftStatuses, setDraftStatuses] = useState<Partial<Record<string, MarkedChoice>>>({})
  const [draftNotes, setDraftNotes] = useState<Partial<Record<string, string>>>({})
  const [editReason, setEditReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: myClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const { data: allPlans = [], isLoading: loadingSessions } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.teachingPlans(actor.userId, 'ALL'),
    queryFn: () => teacherApi.listTeachingPlans(actor, 'ALL'),
  })

  const querySessionId = searchParams.get('sessionId')
  const queryClassId = searchParams.get('classId')

  // Nếu URL truyền ?classId= không thuộc danh sách lớp phân công của giảng viên -> chặn 403 ForbiddenPage
  const isUnauthorizedQueryClass =
    !loadingClasses &&
    !selectedClassOverride &&
    Boolean(queryClassId) &&
    !myClasses.some((c) => c.id === queryClassId)

  const activeClassId = useMemo(() => {
    if (selectedClassOverride) return selectedClassOverride
    if (querySessionId) {
      const matched = allPlans.find((p) => p.session.id === querySessionId)
      if (matched) return matched.session.classId
    }
    return queryClassId ?? myClasses[0]?.id ?? ''
  }, [selectedClassOverride, querySessionId, queryClassId, allPlans, myClasses])

  const classSessions = useMemo(
    () => allPlans.filter((p) => p.session.classId === activeClassId).map((p) => p.session),
    [allPlans, activeClassId],
  )

  const activeSessionId = useMemo(() => {
    if (selectedSessionOverride && classSessions.some((s) => s.id === selectedSessionOverride)) {
      return selectedSessionOverride
    }
    // Truyền thẳng querySessionId tới API để getAttendanceSheet kiểm tra quyền sở hữu và ném 403 nếu trái thẩm quyền
    if (!selectedSessionOverride && querySessionId) {
      return querySessionId
    }
    const todaySes = classSessions.find((s) => s.sessionDate === todayYmdVn)
    return todaySes?.id ?? classSessions[0]?.id ?? ''
  }, [selectedSessionOverride, querySessionId, classSessions, todayYmdVn])

  const {
    data: sheet,
    isLoading: loadingSheet,
    error,
    refetch,
  } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.attendanceSheet(actor.userId, activeSessionId, todayYmdVn),
    queryFn: () => teacherApi.getAttendanceSheet(actor, activeSessionId, todayYmdVn),
    enabled: Boolean(activeSessionId) && !isUnauthorizedQueryClass,
    retry: false,
  })

  const hasExistingMarkedRows = useMemo(
    () => Boolean(sheet?.rows.some((r) => r.effectiveStatus !== 'Unmarked')),
    [sheet],
  )

  const hasStatusModification = useMemo(() => {
    if (!sheet) return false
    return sheet.rows.some((r) => {
      const nextSt = draftStatuses[r.student.id]
      return Boolean(r.effectiveStatus !== 'Unmarked' && nextSt && nextSt !== r.effectiveStatus)
    })
  }, [sheet, draftStatuses])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!sheet) throw new Error('Chưa chọn buổi học.')
      if (hasStatusModification && !editReason.trim()) {
        throw new Error(
          'Vui lòng nhập lý do chỉnh sửa khi thay đổi trạng thái điểm danh của học viên đã đánh dấu.',
        )
      }
      const entries = sheet.rows.map((row) => {
        const chosen =
          draftStatuses[row.student.id] ??
          (row.effectiveStatus !== 'Unmarked' ? row.effectiveStatus : undefined)
        if (!chosen) {
          throw new Error(
            `Vui lòng chọn trạng thái điểm danh cho học viên ${row.student.fullName} (không tự mặc định Có mặt).`,
          )
        }
        return {
          studentId: row.student.id,
          status: chosen,
          note: draftNotes[row.student.id] ?? row.entry?.note,
        }
      })

      return teacherApi.saveSessionAttendance(actor, {
        sessionId: sheet.session.id,
        todayYmdVn,
        entries,
        editReason,
      })
    },
    onSuccess: () => {
      setConfirmOpen(false)
      setDraftStatuses({})
      setDraftNotes({})
      setEditReason('')
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: 'Đã lưu bảng điểm danh buổi học',
        description: 'Tỷ lệ chuyên cần và tiến độ học tập đã được cập nhật.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu điểm danh',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại.',
      })
    },
  })

  const handleOpenConfirm = () => {
    if (!sheet) return
    const unmarkedRow = sheet.rows.find((row) => {
      const status: TeacherAttendanceStatus =
        draftStatuses[row.student.id] ?? row.effectiveStatus
      return status === 'Unmarked'
    })
    if (unmarkedRow) {
      notify({
        tone: 'warning',
        title: 'Chưa chọn đủ trạng thái điểm danh',
        description: `Học viên ${unmarkedRow.student.fullName} chưa được đánh dấu (Có mặt / Đi muộn / Vắng có phép / Vắng không phép).`,
      })
      return
    }
    setConfirmOpen(true)
  }

  if (loadingClasses || loadingSessions || loadingSheet) {
    return <LoadingBlock label="Đang tải danh sách điểm danh buổi học..." />
  }
  if (
    isUnauthorizedQueryClass ||
    (error instanceof StaffApiClientError && error.status === 403)
  ) {
    return <ForbiddenPage />
  }
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải bảng điểm danh."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const summaryCounts = (sheet?.rows ?? []).reduce(
    (acc, row) => {
      const st = draftStatuses[row.student.id] ?? row.effectiveStatus
      acc[st] += 1
      return acc
    },
    { Unmarked: 0, Present: 0, Late: 0, Excused: 0, Unexcused: 0 } as Record<
      TeacherAttendanceStatus,
      number
    >,
  )

  const requiredActionPermission = hasExistingMarkedRows
    ? 'attendance.update'
    : 'attendance.create'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Điểm danh lớp học"
        description="Ghi nhận chuyên cần theo từng buổi học của lớp phụ trách."
        badge={
          sheet ? (
            <Badge tone={sheet.isFutureSession ? 'warning' : 'info'}>
              {sheet.session.classCode} • Buổi {sheet.session.sessionNumber}
            </Badge>
          ) : undefined
        }
      />

      {myClasses.length === 0 ? (
        <EmptyBlock title="Chưa có lớp học được phân công." />
      ) : (
        <>
          {/* Bộ chọn Lớp & Buổi học */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2">
            <SelectField
              id="att-class"
              label="1. Chọn lớp giảng dạy"
              value={activeClassId}
              onChange={(e) => {
                const nextCls = e.target.value
                setSelectedClassOverride(nextCls)
                setSelectedSessionOverride(null)
                setDraftStatuses({})
                setDraftNotes({})
                setSearchParams({ classId: nextCls }, { replace: true })
              }}
              options={myClasses.map((c) => ({
                value: c.id,
                label: `${c.classCode} – ${c.courseName}`,
              }))}
            />

            <SelectField
              id="att-session"
              label="2. Chọn buổi học"
              value={activeSessionId}
              onChange={(e) => {
                const nextSes = e.target.value
                setSelectedSessionOverride(nextSes)
                setDraftStatuses({})
                setDraftNotes({})
                setSearchParams({ sessionId: nextSes }, { replace: true })
              }}
              options={classSessions.map((s) => ({
                value: s.id,
                label: `Buổi ${s.sessionNumber} (${formatDate(s.sessionDate)}) – ${s.officialTitle}`,
              }))}
            />
          </div>

          {!sheet ? (
            <EmptyBlock title="Chọn lớp và buổi học để mở bảng điểm danh" />
          ) : (
        <>
          {sheet.isFutureSession && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs text-[#92400E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
              <span>
                <strong>Chặn điểm danh buổi học tương lai:</strong> Buổi{' '}
                {sheet.session.sessionNumber} diễn ra vào ngày{' '}
                <strong>{formatDate(sheet.session.sessionDate)}</strong> (lớn hơn hôm nay{' '}
                {formatDate(todayYmdVn)}). Hệ thống tự động khóa lưu điểm danh trước ngày học.
              </span>
            </div>
          )}

          {/* Thống kê nhanh */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="neutral">Chưa đánh dấu: {summaryCounts.Unmarked}</Badge>
              <Badge tone="success">Có mặt: {summaryCounts.Present}</Badge>
              <Badge tone="info">Đi muộn: {summaryCounts.Late}</Badge>
              <Badge tone="warning">Vắng có phép: {summaryCounts.Excused}</Badge>
              <Badge tone="danger">Vắng không phép: {summaryCounts.Unexcused}</Badge>
            </div>

            {!sheet.isFutureSession && sheet.rows.length > 0 && (
              <ActionGuard permission={requiredActionPermission}>
                <div className="flex flex-wrap items-center gap-2">
                  {summaryCounts.Unmarked > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const next: Record<string, MarkedChoice> = {}
                        for (const r of sheet.rows) {
                          next[r.student.id] =
                            draftStatuses[r.student.id] ??
                            (r.effectiveStatus !== 'Unmarked' ? r.effectiveStatus : 'Present')
                        }
                        setDraftStatuses(next)
                      }}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Đánh dấu nhanh Có mặt cho HV còn trống</span>
                    </Button>
                  )}
                  <Button size="sm" onClick={handleOpenConfirm}>
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {hasExistingMarkedRows
                        ? 'Lưu cập nhật điểm danh'
                        : 'Lưu điểm danh buổi học'}
                    </span>
                  </Button>
                </div>
              </ActionGuard>
            )}
          </div>

          {sheet.rows.length === 0 ? (
            <EmptyBlock title="Lớp này chưa có học viên đang theo học" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã HV & Họ tên
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái hiện tại
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[340px]">
                      Chọn trạng thái điểm danh (4 mức)
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="min-w-[220px]">
                      Ghi chú buổi học
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {sheet.rows.map((row) => {
                    const currentChoice =
                      draftStatuses[row.student.id] ?? row.effectiveStatus
                    const stMeta = ATTENDANCE_STATUS_META[currentChoice]
                    const noteVal = draftNotes[row.student.id] ?? row.entry?.note ?? ''
                    const canModifyRow =
                      row.effectiveStatus === 'Unmarked'
                        ? hasExistingMarkedRows
                          ? canUpdateAttendance || canCreateAttendance
                          : canCreateAttendance
                        : canUpdateAttendance

                    return (
                      <DataTableRow key={row.student.id}>
                        <DataTableCell className="whitespace-nowrap">
                          <p className="font-bold text-[#243B53]">{row.student.fullName}</p>
                          <p className="text-xs text-[#64748B]">{row.student.studentCode}</p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="inline-flex flex-wrap gap-1.5">
                            {(
                              [
                                {
                                  key: 'Present',
                                  label: 'Có mặt',
                                  activeCls: 'bg-[#1F7A4C] text-white',
                                },
                                {
                                  key: 'Late',
                                  label: 'Đi muộn',
                                  activeCls: 'bg-[#2878B8] text-white',
                                },
                                {
                                  key: 'Excused',
                                  label: 'Vắng có phép',
                                  activeCls: 'bg-[#D97706] text-white',
                                },
                                {
                                  key: 'Unexcused',
                                  label: 'Vắng không phép',
                                  activeCls: 'bg-[#B93A2E] text-white',
                                },
                              ] as const
                            ).map((opt) => {
                              const active = currentChoice === opt.key
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  disabled={!canModifyRow || sheet.isFutureSession}
                                  onClick={() =>
                                    setDraftStatuses((prev) => ({
                                      ...prev,
                                      [row.student.id]: opt.key,
                                    }))
                                  }
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                                    active
                                      ? `${opt.activeCls} border-transparent`
                                      : 'border-[#DCEAF3] bg-white text-[#475569] hover:border-[#75BDEB]'
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <InputField
                            id={`att-note-${row.student.id}`}
                            placeholder="Ghi chú đi muộn / xin phép..."
                            value={noteVal}
                            disabled={!canModifyRow || sheet.isFutureSession}
                            onChange={(e) =>
                              setDraftNotes((prev) => ({
                                ...prev,
                                [row.student.id]: e.target.value,
                              }))
                            }
                          />
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}

          {/* Lịch sử chỉnh sửa điểm danh */}
          {sheet.auditLogs.length > 0 && (
            <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#243B53]">
                <History className="h-4 w-4 text-[#2878B8]" />
                <span>Lịch sử chỉnh sửa điểm danh buổi này ({sheet.auditLogs.length})</span>
              </h2>
              <div className="space-y-2 text-xs">
                {sheet.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3"
                  >
                    <strong>{log.studentName}:</strong>{' '}
                    {ATTENDANCE_STATUS_META[log.previousStatus].label} →{' '}
                    <strong>{ATTENDANCE_STATUS_META[log.nextStatus].label}</strong> • Bởi{' '}
                    {log.changedByName} ({formatDateTimeVi(log.changedAt)})
                    {log.reason ? ` – Lý do: ${log.reason}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận lưu bảng điểm danh buổi học"
        description={
          <div className="space-y-3">
            <p>
              Bạn sắp lưu kết quả điểm danh cho <strong>{sheet?.session.classCode}</strong> – Buổi{' '}
              <strong>{sheet?.session.sessionNumber}</strong> ({summaryCounts.Present} có mặt,{' '}
              {summaryCounts.Late} đi muộn, {summaryCounts.Excused} vắng có phép,{' '}
              {summaryCounts.Unexcused} vắng không phép).
            </p>
            <InputField
              id="att-edit-reason"
              label={
                hasStatusModification
                  ? 'Lý do thay đổi trạng thái điểm danh đã lưu (Bắt buộc) *'
                  : 'Ghi chú lý do chỉnh sửa (tùy chọn)'
              }
              placeholder="VD: Bổ sung giấy xin phép của học viên"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              required={hasStatusModification}
            />
          </div>
        }
        confirmLabel="Xác nhận lưu điểm danh"
        loading={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
