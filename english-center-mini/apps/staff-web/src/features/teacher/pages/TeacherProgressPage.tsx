import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
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
import { matchText } from '@english-center/utils'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaffApiClientError } from '@/services/api/httpClient'
import { PageHeader } from '@/shared/components/PageHeader'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import type { StudentProgressSummary } from '@/features/teacher/types/teacher.types'

export function TeacherProgressPage() {
  useDocumentTitle('Tiến độ học tập học viên')
  const actor = useTeacherActor()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryClassId = searchParams.get('classId')
  const [classFilterOverride, setClassFilterOverride] = useState<string | null>(null)
  const classFilter = classFilterOverride ?? queryClassId ?? 'ALL'

  const [alertFilter, setAlertFilter] = useState<'ALL' | 'NEEDS_SUPPORT' | 'ON_TRACK'>('ALL')
  const [search, setSearch] = useState('')
  const [detailRow, setDetailRow] = useState<StudentProgressSummary | null>(null)

  const { data: myClasses = [] } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.progress(actor.userId, classFilter),
    queryFn: () => teacherApi.listStudentProgress(actor, classFilter),
    retry: false,
  })

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (alertFilter === 'NEEDS_SUPPORT' && !r.needsSupport) return false
      if (alertFilter === 'ON_TRACK' && r.needsSupport) return false
      if (search.trim()) {
        return (
          matchText(r.student.fullName, search) ||
          matchText(r.student.studentCode, search) ||
          matchText(r.classCode, search)
        )
      }
      return true
    })
  }, [rows, alertFilter, search])

  if (isLoading) return <LoadingBlock label="Đang tính toán tiến độ học tập từ dữ liệu thực..." />
  if (error instanceof StaffApiClientError && error.status === 403) {
    return <ForbiddenPage />
  }
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải tiến độ học tập."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const flaggedCount = rows.filter((r) => r.needsSupport).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Theo dõi Tiến độ Học tập Học viên"
        description="Tổng hợp trực tiếp từ dữ liệu điểm danh, bài tập đã nộp và bảng điểm các lớp phụ trách."
        badge={
          flaggedCount > 0 ? (
            <Badge tone="danger">{flaggedCount} học viên cần hỗ trợ</Badge>
          ) : (
            <Badge tone="success">0 học viên cần hỗ trợ</Badge>
          )
        }
      />

      {myClasses.length === 0 ? (
        <EmptyBlock title="Chưa có lớp học được phân công." />
      ) : (
        <>
          {/* Bộ lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-3">
        <InputField
          id="prg-search"
          placeholder="Tìm họ tên HV, mã HV, mã lớp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          id="prg-cls"
          value={classFilter}
          onChange={(e) => {
            const nextVal = e.target.value
            setClassFilterOverride(nextVal)
            setSearchParams(nextVal === 'ALL' ? {} : { classId: nextVal }, { replace: true })
          }}
          options={[
            { value: 'ALL', label: 'Tất cả lớp phụ trách' },
            ...myClasses.map((c) => ({ value: c.id, label: `${c.classCode} – ${c.courseName}` })),
          ]}
        />
        <SelectField
          id="prg-alert"
          value={alertFilter}
          onChange={(e) =>
            setAlertFilter(e.target.value as 'ALL' | 'NEEDS_SUPPORT' | 'ON_TRACK')
          }
          options={[
            { value: 'ALL', label: 'Tất cả mức độ tiến độ' },
            { value: 'NEEDS_SUPPORT', label: 'Cần hỗ trợ kèm sát' },
            { value: 'ON_TRACK', label: 'Đảm bảo tiến độ' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock title="Không có học viên nào khớp bộ lọc" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="min-w-[180px]">
                  Học viên & Lớp
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Chuyên cần (Có mặt / Muộn / CP / KP)
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Hoàn thành bài tập
                </DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[220px]">
                  Kết quả Đánh giá & ĐTB Trọng số
                </DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[170px]">
                  Đánh giá tiến độ
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Chi tiết
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {filtered.map((row) => (
                <DataTableRow key={`${row.classId}-${row.student.id}`}>
                  <DataTableCell className="whitespace-nowrap">
                    <p className="font-bold text-[#243B53]">{row.student.fullName}</p>
                    <p className="text-xs text-[#64748B]">
                      {row.student.studentCode} • Lớp {row.classCode}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-xs whitespace-nowrap">
                    <p className="font-bold text-[#243B53]">
                      {row.attendanceRatePercent === null
                        ? 'Chưa điểm danh'
                        : `${row.attendanceRatePercent}% chuyên cần`}
                    </p>
                    <p className="text-[#64748B]">
                      Có mặt: {row.presentCount} • Muộn: {row.lateCount} • CP: {row.excusedCount} •
                      KP:{' '}
                      <strong className={row.unexcusedCount > 0 ? 'text-[#B93A2E]' : ''}>
                        {row.unexcusedCount}
                      </strong>
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-xs whitespace-nowrap">
                    <p className="font-bold text-[#243B53]">
                      {row.assignmentCompletionPercent === null
                        ? 'Chưa giao'
                        : `${row.assignmentCompletionPercent}% hoàn thành`}
                    </p>
                    <p className="text-[#64748B]">
                      Đã nộp: {row.submittedOrGradedCount} • Còn thiếu: {row.missingCount}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    <p className="whitespace-nowrap">
                      Đầu vào: <strong>{row.student.entryScore.total}</strong> → Mục tiêu:{' '}
                      <strong className="text-[#1F7A4C]">{row.student.goalScore.total}</strong>
                    </p>
                    <p className="whitespace-nowrap text-[#64748B]">
                      Quá trình:{' '}
                      {row.processAveragePercent === null ? '—' : `${row.processAveragePercent}%`} •
                      Mid: <strong>{row.midScore ?? '—'}</strong> • Final:{' '}
                      {row.finalScore ?? '—'}
                    </p>
                    <p className="font-semibold whitespace-nowrap text-[#2878B8]">
                      ĐTB Trọng số:{' '}
                      {row.weightedAveragePercent === null ? 'Chưa có' : `${row.weightedAveragePercent}%`}
                      {row.toeicMockScore !== null ? ` • Mock: ${row.toeicMockScore}/990` : ''}
                    </p>
                  </DataTableCell>
                  <DataTableCell>
                    {row.needsSupport ? (
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone="danger">Cần hỗ trợ</Badge>
                        <p className="max-w-[200px] text-[11px] text-[#B93A2E]">
                          {row.supportReasons[0]}
                        </p>
                      </div>
                    ) : (
                      <Badge tone="success">Đảm bảo tiến độ</Badge>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setDetailRow(row)}>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Phân tích</span>
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableContainer>
      )}
        </>
      )}

      {/* Modal chi tiết tiến độ học viên */}
      <Modal
        open={Boolean(detailRow)}
        title={`Hồ sơ tiến độ – ${detailRow?.student.fullName ?? ''}`}
        onClose={() => setDetailRow(null)}
        maxWidthClassName="max-w-lg"
      >
        {detailRow && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
              <p>
                <span className="text-[#64748B]">Mã học viên:</span>{' '}
                <strong>{detailRow.student.studentCode}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Lớp đang học:</span>{' '}
                <strong>{detailRow.classCode}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Số buổi tham gia:</span>{' '}
                <strong>
                  {detailRow.presentCount + detailRow.lateCount}/{detailRow.markedSessionsCount}{' '}
                  buổi
                </strong>
                {detailRow.lateCount > 0 ? ` (Đi muộn: ${detailRow.lateCount})` : ''}
              </p>
              <p>
                <span className="text-[#64748B]">Bài tập đã hoàn thành:</span>{' '}
                <strong>
                  {detailRow.submittedOrGradedCount}/{detailRow.assignedCount} bài
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">TB Quá trình (BTVN/Quiz/TX):</span>{' '}
                <strong>
                  {detailRow.processAveragePercent === null
                    ? 'Chưa có điểm'
                    : `${detailRow.processAveragePercent}%`}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">ĐTB Trọng số học phần:</span>{' '}
                <strong>
                  {detailRow.weightedAveragePercent === null
                    ? 'Chưa có điểm'
                    : `${detailRow.weightedAveragePercent}%`}
                </strong>
              </p>
            </div>

            {detailRow.needsSupport ? (
              <div className="rounded-xl border border-[#F5C2C7] bg-[#FDECE9] p-3.5 text-[#B93A2E]">
                <p className="font-extrabold">Các tiêu chí cần hỗ trợ đang kích hoạt:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {detailRow.supportReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 text-[#166534]">
                Học viên duy trì tốt cả chuyên cần lẫn tiến độ làm bài tập về nhà.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
