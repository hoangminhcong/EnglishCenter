import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ClipboardList, Eye, FileSpreadsheet, Users } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyBlock,
  ErrorBlock,
  InputField,
  LoadingBlock,
  SelectField,
} from '@english-center/ui'
import type { CenterClassOfferingDto } from '@english-center/contracts'
import { formatDate, matchText } from '@english-center/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/shared/components/PageHeader'
import { teacherApi } from '@/features/teacher/services/teacherApi'
import { TEACHER_QUERY_KEYS, useTeacherActor } from '@/features/teacher/hooks/useTeacher'
import { CLASS_STATUS_META } from '@/features/academic/types/academic.types'

type ClassStatusFilter = 'ALL' | CenterClassOfferingDto['status']

export function TeacherClassesPage() {
  useDocumentTitle('Lớp của tôi')
  const actor = useTeacherActor()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClassStatusFilter>('ALL')

  const {
    data: classes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: TEACHER_QUERY_KEYS.classes(actor.userId),
    queryFn: () => teacherApi.listMyClasses(actor),
  })

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (statusFilter !== 'ALL' && cls.status !== statusFilter) return false
      if (search.trim()) {
        return (
          matchText(cls.classCode, search) ||
          matchText(cls.className, search) ||
          matchText(cls.courseName, search) ||
          matchText(cls.branchName, search) ||
          matchText(cls.roomLabel ?? '', search)
        )
      }
      return true
    })
  }, [classes, statusFilter, search])

  if (isLoading) return <LoadingBlock label="Đang tải các lớp được phân công giảng dạy..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách lớp của bạn."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lớp của tôi"
        description="Danh sách các lớp học bạn đang trực tiếp phụ trách giảng dạy."
        badge={<Badge tone="info">{classes.length} lớp được phân công</Badge>}
        actions={
          <Link to="/teacher/schedule">
            <Button size="sm" variant="secondary">
              <CalendarDays className="h-4 w-4" />
              <span>Xem lớp đang cần giảng viên</span>
            </Button>
          </Link>
        }
      />

      {/* Bộ lọc tìm kiếm & trạng thái lớp */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2">
        <InputField
          id="cls-search"
          placeholder="Tìm theo mã lớp, tên lớp, khóa học, cơ sở, phòng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          id="cls-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClassStatusFilter)}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái lớp' },
            { value: 'open', label: CLASS_STATUS_META.open.label },
            { value: 'upcoming', label: CLASS_STATUS_META.upcoming.label },
            { value: 'ongoing', label: CLASS_STATUS_META.ongoing.label },
            { value: 'full', label: CLASS_STATUS_META.full.label },
            { value: 'completed', label: CLASS_STATUS_META.completed.label },
            { value: 'cancelled', label: CLASS_STATUS_META.cancelled.label },
          ]}
        />
      </div>

      {classes.length === 0 ? (
        <EmptyBlock
          title="Hiện tại bạn chưa có lớp học nào được phân công"
          description="Bạn có thể sang mục Lịch giảng dạy để xem các lớp mới đang thiếu giảng viên và gửi nguyện vọng dạy lớp."
        />
      ) : filteredClasses.length === 0 ? (
        <EmptyBlock title="Không có lớp học nào khớp từ khóa hoặc bộ lọc trạng thái" />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredClasses.map((cls) => {
            const st = CLASS_STATUS_META[cls.status]
            return (
              <div
                key={cls.id}
                className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 text-base font-black text-[#2878B8]">
                      {cls.classCode}
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <h2 className="mt-1 text-base font-extrabold text-[#243B53]">{cls.className}</h2>
                  <p className="text-xs font-semibold text-[#64748B]">
                    {cls.courseName} • {cls.branchName} • Hình thức:{' '}
                    <strong>{cls.studyMode}</strong>
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#F8FBFD] p-3.5 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <span className="text-[#64748B]">Lịch dạy ({cls.sessionsCount} buổi)</span>
                      <p className="mt-0.5 font-bold text-[#243B53]">
                        {cls.endTime
                          ? `${cls.studyDays} (${cls.startTime}–${cls.endTime})`
                          : cls.studyDays === cls.startTime
                            ? cls.studyDays
                            : `${cls.studyDays} (${cls.startTime})`}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#64748B]">Khai giảng & Phòng học</span>
                      <p className="mt-0.5 font-bold text-[#243B53]">
                        {cls.startDateDisplay ?? formatDate(cls.startDate)} •{' '}
                        {cls.roomLabel ?? cls.studyMode}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#64748B]">Sĩ số đang học</span>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-bold tabular-nums text-[#243B53]">
                        <Users className="h-3.5 w-3.5 shrink-0 text-[#2878B8]" />
                        {cls.activeEnrolledCount}/{cls.maxStudents ?? '—'} HV
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#64748B]">Bài nộp chờ chấm</span>
                      <p className="mt-0.5 font-bold tabular-nums text-[#D97706]">
                        {cls.ungradedCount} bài nộp
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF4F8] pt-3">
                  <Link to={`/teacher/assignments?classId=${cls.id}`}>
                    <Button size="sm" variant="ghost">
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>Bài tập</span>
                    </Button>
                  </Link>
                  <Link to={`/teacher/gradebook?classId=${cls.id}`}>
                    <Button size="sm" variant="ghost">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Sổ điểm</span>
                    </Button>
                  </Link>
                  <Link to={`/teacher/attendance?classId=${cls.id}`}>
                    <Button size="sm" variant="secondary">
                      Điểm danh
                    </Button>
                  </Link>
                  <Link to={`/teacher/classes/${cls.id}`}>
                    <Button size="sm">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Chi tiết lớp</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
