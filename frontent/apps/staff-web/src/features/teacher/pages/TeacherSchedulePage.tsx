import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Send,
  XCircle,
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
} from '@english-center/ui'
import { formatDate, formatDateTimeVi, shiftIsoYmd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import {
  LESSON_ACTIVITY_META,
  TEACHING_REQUEST_STATUS_META,
  getMondaySundayWeekRange,
  shiftMonthYmd,
  type OpenClassForTeachingItem,
} from '@/features/teacher/types/teacher.types'

export function TeacherSchedulePage() {
  useDocumentTitle('Lịch giảng dạy & Đăng ký nguyện vọng dạy lớp')
  const actor = useTeacherActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'my_schedule' | 'open_classes'>('my_schedule')
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [anchorDate, setAnchorDate] = useState(todayYmdVn)

  const [requestTarget, setRequestTarget] = useState<OpenClassForTeachingItem | null>(null)
  const [requestNote, setRequestNote] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.schedule(actor.userId),
    queryFn: () => teacherApi.getScheduleWorkspace(actor),
  })

  const weekRange = useMemo(() => getMondaySundayWeekRange(anchorDate), [anchorDate])

  const filteredSessions = useMemo(() => {
    const list = data?.mySessions ?? []
    if (viewMode === 'day') {
      return list.filter((s) => s.sessionDate === anchorDate)
    }
    if (viewMode === 'week') {
      return list.filter(
        (s) => s.sessionDate >= weekRange.mondayYmd && s.sessionDate <= weekRange.sundayYmd,
      )
    }
    const ym = anchorDate.slice(0, 7)
    return list.filter((s) => s.sessionDate.slice(0, 7) === ym)
  }, [data, viewMode, anchorDate, weekRange])

  const handleNavigateRange = (direction: -1 | 1) => {
    if (viewMode === 'day') {
      setAnchorDate((prev) => shiftIsoYmd(prev, direction))
      return
    }
    if (viewMode === 'week') {
      setAnchorDate((prev) => shiftIsoYmd(prev, direction * 7))
      return
    }
    setAnchorDate((prev) => shiftMonthYmd(prev, direction))
  }

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!requestTarget) throw new Error('Chưa chọn lớp.')
      return teacherApi.submitTeachingRequest(actor, {
        classId: requestTarget.id,
        note: requestNote,
      })
    },
    onSuccess: (created) => {
      setRequestTarget(null)
      setRequestNote('')
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'academic'] })
      notify({
        tone: 'success',
        title: `Đã gửi nguyện vọng ${created.requestCode}`,
        description: 'Trạng thái: Chờ bộ phận Giáo vụ phê duyệt.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể gửi nguyện vọng',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => teacherApi.cancelTeachingRequest(actor, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'academic'] })
      notify({
        tone: 'info',
        title: 'Đã rút lại nguyện vọng dạy lớp',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể rút lại nguyện vọng',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleRequestSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    requestMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải lịch giảng dạy của bạn..." />
  if (error || !data) {
    return (
      <ErrorBlock
        message="Không thể tải lịch giảng dạy."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const rangeSummaryLabel =
    viewMode === 'day'
      ? `Ngày ${formatDate(anchorDate)}`
      : viewMode === 'week'
        ? `Tuần Thứ 2 (${formatDate(weekRange.mondayYmd)}) – CN (${formatDate(weekRange.sundayYmd)})`
        : `Tháng ${anchorDate.slice(5, 7)}/${anchorDate.slice(0, 4)}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch Giảng dạy & Nguyện vọng Nhận lớp mới"
        description="Theo dõi lịch giảng dạy theo ngày, tuần, tháng và đăng ký nhận lớp mới."
        badge={<Badge tone="info">{data.mySessions.length} buổi trong lịch</Badge>}
      />

      {/* Tabs & Thanh điều hướng thời gian */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
        <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('my_schedule')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'my_schedule' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            1. Lịch dạy của tôi ({data.mySessions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('open_classes')}
            className={`rounded-lg px-3.5 py-2 transition ${
              tab === 'open_classes' ? 'bg-[#2878B8] text-white' : 'text-[#475569]'
            }`}
          >
            2. Lớp đang cần giảng viên ({data.openClassesNeedingTeacher.length})
          </button>
        </div>

        {tab === 'my_schedule' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-1 text-xs font-bold">
              {(
                [
                  { key: 'day', label: 'Theo Ngày' },
                  { key: 'week', label: 'Theo Tuần (T2–CN)' },
                  { key: 'month', label: 'Theo Tháng' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setViewMode(m.key)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    viewMode === m.key ? 'bg-[#243B53] text-white' : 'text-[#475569]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleNavigateRange(-1)}
                title="Khoảng trước"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trước</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAnchorDate(todayYmdVn)}
              >
                Hôm nay
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleNavigateRange(1)}
                title="Khoảng tiếp theo"
              >
                <span>Sau</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <InputField
              id="sch-anchor-date"
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {tab === 'my_schedule' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] px-4 py-2.5 text-xs text-[#243B53]">
          <span className="font-bold">{rangeSummaryLabel}</span>
          <span>
            Hiển thị <strong>{filteredSessions.length}</strong> buổi dạy trong khoảng thời gian đã
            chọn
          </span>
        </div>
      )}

      {tab === 'my_schedule' ? (
        filteredSessions.length === 0 ? (
          <EmptyBlock
            title="Không có ca dạy nào trong khoảng thời gian đang chọn"
            description="Hãy dùng nút Trước / Hôm nay / Sau hoặc chuyển sang chế độ xem Theo Tháng để xem các buổi dạy khác."
          />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="w-44 whitespace-nowrap">
                    Ngày, Khung giờ & Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[170px]">
                    Lớp & Khóa học
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="min-w-[220px]">
                    Loại buổi & Nội dung dạy
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Phòng / Cơ sở
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="text-right whitespace-nowrap">
                    Thao tác
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {filteredSessions.map((ses) => {
                  const isFuture = ses.sessionDate > todayYmdVn
                  const isToday = ses.sessionDate === todayYmdVn
                  const actMeta = LESSON_ACTIVITY_META[ses.activityType]

                  return (
                    <DataTableRow key={ses.id}>
                      <DataTableCell className="w-44 text-xs whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <p className="inline-flex items-center gap-1 font-extrabold text-[#243B53]">
                            <CalendarDays className="h-3.5 w-3.5 text-[#2878B8]" />
                            {formatDate(ses.sessionDate)}
                          </p>
                          <p className="text-[#64748B]">
                            {ses.endTime ? `${ses.startTime} – ${ses.endTime}` : ses.startTime}
                          </p>
                          {isToday ? (
                            <Badge tone="success">Hôm nay</Badge>
                          ) : isFuture ? (
                            <Badge tone="info">Sắp diễn ra</Badge>
                          ) : (
                            <Badge tone="neutral">Đã qua</Badge>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <Link
                          to={`/teacher/classes/${ses.classId}`}
                          className="font-extrabold whitespace-nowrap text-[#2878B8] hover:underline"
                        >
                          {ses.classCode} • Buổi {String(ses.sessionNumber).padStart(2, '0')}
                        </Link>
                        <p className="text-[#64748B]">{ses.courseName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone={actMeta.tone}>{actMeta.label}</Badge>
                          <p className="font-semibold text-[#243B53]">{ses.officialTitle}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-xs whitespace-nowrap text-[#64748B]">
                        <p className="font-semibold text-[#243B53]">{ses.roomLabel}</p>
                        <p>{ses.branchName}</p>
                      </DataTableCell>
                      <DataTableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {isFuture ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled
                              title="Buổi học chưa diễn ra — hệ thống khóa điểm danh trước ngày học"
                            >
                              Chưa mở điểm danh
                            </Button>
                          ) : (
                            <Link to={`/teacher/attendance?sessionId=${ses.id}`}>
                              <Button size="sm" variant={isToday ? 'primary' : 'secondary'}>
                                Điểm danh
                              </Button>
                            </Link>
                          )}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
              Danh sách lớp mở chưa có giảng viên phụ trách ({data.openClassesNeedingTeacher.length})
            </h2>

            {data.openClassesNeedingTeacher.length === 0 ? (
              <EmptyBlock title="Tất cả các lớp đang mở hiện đã được phân công đủ giảng viên" />
            ) : (
              <DataTableContainer>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Mã lớp & Khóa học
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Cơ sở & Lịch học
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Kiểm tra trùng lịch tự động
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="text-right whitespace-nowrap">
                        Nguyện vọng
                      </DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {data.openClassesNeedingTeacher.map((cls) => (
                      <DataTableRow key={cls.id}>
                        <DataTableCell>
                          <p className="font-extrabold whitespace-nowrap text-[#2878B8]">
                            {cls.classCode}
                          </p>
                          <p className="text-xs font-semibold text-[#243B53]">{cls.courseName}</p>
                        </DataTableCell>
                        <DataTableCell className="text-xs whitespace-nowrap">
                          <p className="font-semibold text-[#243B53]">{cls.branchName}</p>
                          <p className="text-[#64748B]">
                            {cls.endTime
                              ? `${cls.studyDays} (${cls.startTime}–${cls.endTime})`
                              : cls.studyDays}{' '}
                            • KG: {cls.startDateDisplay ?? formatDate(cls.startDate)}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-xs whitespace-nowrap">
                          {cls.conflictClassCode ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[#B93A2E]">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Trùng ca với lớp {cls.conflictClassCode}
                            </span>
                          ) : (
                            <Badge tone="success">Không trùng lịch dạy hiện tại</Badge>
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {cls.existingRequest ? (
                              <Badge
                                tone={TEACHING_REQUEST_STATUS_META[cls.existingRequest.status].tone}
                              >
                                {TEACHING_REQUEST_STATUS_META[cls.existingRequest.status].label}
                              </Badge>
                            ) : (
                              <ActionGuard permission="teacher.schedule.request">
                                <Button
                                  size="sm"
                                  disabled={Boolean(cls.conflictClassCode)}
                                  onClick={() => {
                                    setRequestTarget(cls)
                                    setRequestNote('')
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Đăng ký dạy lớp này</span>
                                </Button>
                              </ActionGuard>
                            )}
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableContainer>
            )}
          </div>

          {/* Lịch sử nguyện vọng đã gửi */}
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
            <h2 className="mb-3 text-base font-extrabold text-[#243B53]">
              Nguyện vọng giảng dạy đã gửi của tôi ({data.myRequests.length})
            </h2>
            {data.myRequests.length === 0 ? (
              <EmptyBlock title="Bạn chưa gửi nguyện vọng nhận lớp mới nào" />
            ) : (
              <DataTableContainer>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Mã yêu cầu & Thời gian
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Lớp nguyện vọng
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>Ghi chú & Phản hồi từ Giáo vụ</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Trạng thái
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="text-right whitespace-nowrap">
                        Thao tác
                      </DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {data.myRequests.map((req) => {
                      const meta = TEACHING_REQUEST_STATUS_META[req.status]
                      return (
                        <DataTableRow key={req.id}>
                          <DataTableCell className="text-xs whitespace-nowrap">
                            <p className="font-bold text-[#243B53]">{req.requestCode}</p>
                            <p className="text-[#64748B]">{formatDateTimeVi(req.requestedAt)}</p>
                          </DataTableCell>
                          <DataTableCell className="text-xs whitespace-nowrap">
                            <p className="font-bold text-[#2878B8]">{req.classCode}</p>
                            <p className="text-[#64748B]">
                              {req.endTime
                                ? `${req.studyDays} (${req.startTime}–${req.endTime})`
                                : req.studyDays}
                            </p>
                          </DataTableCell>
                          <DataTableCell className="max-w-xs text-xs text-[#475569]">
                            <p>{req.note}</p>
                            {req.reviewNote && (
                              <p className="mt-1 font-semibold text-[#2878B8]">
                                Giáo vụ: {req.reviewNote}
                              </p>
                            )}
                          </DataTableCell>
                          <DataTableCell className="whitespace-nowrap">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </DataTableCell>
                          <DataTableCell className="text-right whitespace-nowrap">
                            {req.status === 'Requested' && (
                              <ActionGuard permission="teacher.schedule.request">
                                <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    loading={cancelMutation.isPending}
                                    onClick={() => cancelMutation.mutate(req.id)}
                                  >
                                    <XCircle className="h-3.5 w-3.5 text-[#B93A2E]" />
                                    <span className="text-[#B93A2E]">Rút lại</span>
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
        </div>
      )}

      {/* Modal Gửi nguyện vọng dạy lớp */}
      <Modal
        open={Boolean(requestTarget)}
        title={`Gửi nguyện vọng dạy lớp ${requestTarget?.classCode ?? ''}`}
        onClose={() => setRequestTarget(null)}
        maxWidthClassName="max-w-md"
      >
        {requestTarget && (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-1 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
              <p>
                <span className="text-[#64748B]">Khóa học:</span>{' '}
                <strong>{requestTarget.courseName}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Lịch dạy:</span>{' '}
                <strong>
                  {requestTarget.endTime
                    ? `${requestTarget.studyDays} (${requestTarget.startTime}–${requestTarget.endTime})`
                    : requestTarget.studyDays}
                </strong>
              </p>
              <p className="text-[#64748B]">
                Yêu cầu sẽ được gửi tới bộ phận Giáo vụ để xem xét và phê duyệt phân công.
              </p>
            </div>
            <InputField
              id="trq-note"
              label="Ghi chú nguyện vọng & cam kết ca dạy *"
              placeholder="VD: Em đáp ứng trọn vẹn lịch tối 2-4-6 tại cơ sở Hà Đông"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRequestTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" loading={requestMutation.isPending}>
                Gửi nguyện vọng tới Giáo vụ
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
