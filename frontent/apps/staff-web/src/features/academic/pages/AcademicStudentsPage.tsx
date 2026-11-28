import { useMemo, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, UserCog } from 'lucide-react'
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
  Pagination,
  SelectField,
} from '@english-center/ui'
import type { AcademicStudentDto, StudentLearningStatus } from '@english-center/contracts'
import { matchText, paginate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { cmsApi } from '@/features/content/api/cmsApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'
import { STUDENT_LEARNING_STATUS_META } from '@/features/academic/types/academic.types'

type StudentSortOption = 'updated_desc' | 'name_asc' | 'code_asc'

export function AcademicStudentsPage() {
  useDocumentTitle('Quản lý học viên')
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentLearningStatus>('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<StudentSortOption>('updated_desc')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [schoolOrWork, setSchoolOrWork] = useState('')
  const [branchId, setBranchId] = useState('cs-ha-dong')
  const [courseId, setCourseId] = useState('foundation-toeic')
  const [entryLc, setEntryLc] = useState('150')
  const [entryRc, setEntryRc] = useState('140')
  const [goalLc, setGoalLc] = useState('260')
  const [goalRc, setGoalRc] = useState('240')
  const [expectedMonth, setExpectedMonth] = useState(todayYmdVn.slice(0, 7))
  const [note, setNote] = useState('')

  const [statusTarget, setStatusTarget] = useState<AcademicStudentDto | null>(null)
  const [nextLearningStatus, setNextLearningStatus] = useState<'completed' | 'dropped'>('completed')
  const [statusNote, setStatusNote] = useState('')

  const {
    data: students = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.students(),
    queryFn: () => academicApi.listStudents(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const filteredAndSorted = useMemo(() => {
    const list = students.filter((s) => {
      if (statusFilter !== 'ALL' && s.learningStatus !== statusFilter) return false
      if (courseFilter !== 'ALL' && s.currentCourseId !== courseFilter) return false
      if (branchFilter !== 'ALL' && s.branchId !== branchFilter) return false
      if (search.trim()) {
        return (
          matchText(s.fullName, search) ||
          matchText(s.studentCode, search) ||
          matchText(s.phone, search) ||
          matchText(s.email ?? '', search) ||
          matchText(s.currentClassCode ?? '', search)
        )
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName, 'vi')
      }
      if (sortBy === 'code_asc') {
        return a.studentCode.localeCompare(b.studentCode)
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [students, statusFilter, courseFilter, branchFilter, search, sortBy])

  const paged = paginate(filteredAndSorted, page, 8)

  const createMutation = useMutation({
    mutationFn: () =>
      academicApi.createOrUpdateStudent({
        fullName,
        phone,
        email,
        dateOfBirth: dateOfBirth || undefined,
        schoolOrWork,
        branchId,
        currentCourseId: courseId,
        entryLc: Number(entryLc) || 0,
        entryRc: Number(entryRc) || 0,
        goalLc: Number(goalLc) || 0,
        goalRc: Number(goalRc) || 0,
        expectedStartMonth: expectedMonth,
        note,
      }),
    onSuccess: (created) => {
      setModalOpen(false)
      setFullName('')
      setPhone('')
      setEmail('')
      setDateOfBirth('')
      setSchoolOrWork('')
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      notify({
        tone: 'success',
        title: `Đã tạo hồ sơ học viên ${created.studentCode}`,
        description: `${created.fullName} đã được đưa vào danh sách chờ xếp lớp.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu hồ sơ học viên',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!statusTarget) throw new Error('Chưa chọn học viên.')
      return academicApi.updateStudentLearningStatus(actor, {
        studentId: statusTarget.id,
        nextStatus: nextLearningStatus,
        note: statusNote,
      })
    },
    onSuccess: (updated) => {
      setStatusTarget(null)
      setStatusNote('')
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.all })
      void queryClient.invalidateQueries({ queryKey: ['staff', 'training'] })
      notify({
        tone: 'success',
        title: `Đã cập nhật trạng thái học tập của ${updated.fullName}`,
        description: `Trạng thái mới: ${STUDENT_LEARNING_STATUS_META[updated.learningStatus].label}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể cập nhật trạng thái học tập',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleStatusSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    statusMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải danh sách học viên toàn trung tâm..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách học viên."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Hồ sơ Học viên"
        description="Quản lý hồ sơ học viên, mục tiêu điểm số và trạng thái theo học."
        badge={<Badge tone="info">{students.length} học viên</Badge>}
        actions={
          <ActionGuard permission="students.create">
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span>Thêm học viên mới</span>
            </Button>
          </ActionGuard>
        }
      />

      {/* Bộ lọc & Sắp xếp */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <InputField
          id="stu-search"
          placeholder="Tìm họ tên, mã HV, SĐT, email, mã lớp..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <SelectField
          id="stu-status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | StudentLearningStatus)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Mọi trạng thái học tập' },
            { value: 'studying', label: 'Đang theo học' },
            { value: 'waiting_placement', label: 'Chờ xếp lớp' },
            { value: 'hold', label: 'Đang bảo lưu' },
            { value: 'completed', label: 'Đã hoàn thành khóa' },
            { value: 'dropped', label: 'Thôi học' },
          ]}
        />
        <SelectField
          id="stu-course"
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Mọi khóa học' },
            ...courses.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SelectField
          id="stu-branch"
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value)
            setPage(1)
          }}
          options={[
            { value: 'ALL', label: 'Mọi cơ sở' },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <SelectField
          id="stu-sort"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as StudentSortOption)
            setPage(1)
          }}
          options={[
            { value: 'updated_desc', label: 'Sắp xếp: Cập nhật mới nhất' },
            { value: 'name_asc', label: 'Sắp xếp: Họ tên (A → Z)' },
            { value: 'code_asc', label: 'Sắp xếp: Mã học viên tăng dần' },
          ]}
        />
      </div>

      {paged.items.length === 0 ? (
        <EmptyBlock title="Không tìm thấy học viên phù hợp" />
      ) : (
        <DataTableContainer>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="min-w-[180px]">Mã HV & Họ tên</DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">Liên hệ</DataTableHeaderCell>
                <DataTableHeaderCell className="min-w-[170px]">
                  Khóa học & Lớp hiện tại
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Đầu vào → Mục tiêu
                </DataTableHeaderCell>
                <DataTableHeaderCell className="whitespace-nowrap">
                  Trạng thái học tập
                </DataTableHeaderCell>
                <DataTableHeaderCell className="text-right whitespace-nowrap">
                  Thao tác
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <tbody>
              {paged.items.map((stu) => {
                const stMeta = STUDENT_LEARNING_STATUS_META[stu.learningStatus]
                return (
                  <DataTableRow key={stu.id}>
                    <DataTableCell>
                      <Link
                        to={`/academic/students/${stu.id}`}
                        className="font-extrabold whitespace-nowrap text-[#2878B8] hover:underline"
                      >
                        {stu.studentCode}
                      </Link>
                      <p className="font-semibold text-[#243B53]">{stu.fullName}</p>
                      <p className="text-xs text-[#64748B]">{stu.branchName}</p>
                    </DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      <p className="font-medium text-[#243B53]">{stu.phone}</p>
                      <p className="text-[#64748B]">{stu.email ?? 'Chưa cập nhật email'}</p>
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <p className="font-semibold text-[#243B53]">
                        {stu.currentCourseName ?? 'Chưa chọn khóa'}
                      </p>
                      <p className="text-[#64748B]">
                        Lớp hiện tại:{' '}
                        <strong className="whitespace-nowrap">
                          {stu.currentClassCode ?? 'Chờ xếp lớp'}
                        </strong>
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-xs whitespace-nowrap">
                      <span className="font-bold text-[#243B53]">{stu.entryScore.total}</span> →{' '}
                      <span className="font-extrabold text-[#1F7A4C]">{stu.goalScore.total}</span>{' '}
                      TOEIC
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Link to={`/academic/students/${stu.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-3.5 w-3.5" />
                            <span>Hồ sơ</span>
                          </Button>
                        </Link>
                        {stu.learningStatus !== 'completed' && stu.learningStatus !== 'dropped' && (
                          <ActionGuard permission="students.update">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setStatusTarget(stu)
                                setNextLearningStatus('completed')
                                setStatusNote('')
                              }}
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              <span>Trạng thái</span>
                            </Button>
                          </ActionGuard>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </tbody>
          </DataTable>
          <div className="px-4 pb-4">
            <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
          </div>
        </DataTableContainer>
      )}

      {/* Modal tạo học viên mới */}
      <Modal
        open={modalOpen}
        title="Tạo hồ sơ học viên mới (Đưa vào chờ xếp lớp)"
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              id="new-stu-name"
              label="Họ và tên học viên *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <InputField
              id="new-stu-phone"
              label="Số điện thoại (10 số) *"
              placeholder="0900000299"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <InputField
              id="new-stu-email"
              type="email"
              label="Email học viên (Kiểm tra trùng tự động)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputField
              id="new-stu-dob"
              type="date"
              label="Ngày sinh"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <InputField
              id="new-stu-school"
              label="Trường học / Đơn vị công tác"
              value={schoolOrWork}
              onChange={(e) => setSchoolOrWork(e.target.value)}
            />
            <SelectField
              id="new-stu-branch"
              label="Cơ sở quản lý *"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <SelectField
              id="new-stu-course"
              label="Khóa học dự kiến *"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
            />
            <InputField
              id="new-stu-month"
              type="month"
              label="Tháng dự kiến xếp lớp"
              value={expectedMonth}
              onChange={(e) => setExpectedMonth(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InputField
              id="new-stu-elc"
              type="number"
              min={0}
              max={495}
              label="Đầu vào LC"
              value={entryLc}
              onChange={(e) => setEntryLc(e.target.value)}
            />
            <InputField
              id="new-stu-erc"
              type="number"
              min={0}
              max={495}
              label="Đầu vào RC"
              value={entryRc}
              onChange={(e) => setEntryRc(e.target.value)}
            />
            <InputField
              id="new-stu-glc"
              type="number"
              min={5}
              max={495}
              label="Mục tiêu LC"
              value={goalLc}
              onChange={(e) => setGoalLc(e.target.value)}
            />
            <InputField
              id="new-stu-grc"
              type="number"
              min={5}
              max={495}
              label="Mục tiêu RC"
              value={goalRc}
              onChange={(e) => setGoalRc(e.target.value)}
            />
          </div>

          <InputField
            id="new-stu-note"
            label="Ghi chú học vụ"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Lưu hồ sơ học viên
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal chốt trạng thái Hoàn thành khóa / Thôi học */}
      <Modal
        open={Boolean(statusTarget)}
        title={`Cập nhật trạng thái học tập – ${statusTarget?.fullName ?? ''}`}
        onClose={() => setStatusTarget(null)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <p className="text-xs text-[#475569]">
            Nếu học viên đang theo học tại lớp <strong>{statusTarget?.currentClassCode ?? '—'}</strong>,
            hệ thống sẽ tự động kết thúc đợt ghi danh hiện tại và giải phóng chỗ trống trên sĩ số lớp.
          </p>
          <SelectField
            id="stu-next-learning-st"
            label="Trạng thái học tập mới *"
            value={nextLearningStatus}
            onChange={(e) => setNextLearningStatus(e.target.value as 'completed' | 'dropped')}
            options={[
              { value: 'completed', label: 'Đã hoàn thành khóa học' },
              { value: 'dropped', label: 'Thôi học' },
            ]}
          />
          <InputField
            id="stu-status-note"
            label={nextLearningStatus === 'dropped' ? 'Lý do thôi học *' : 'Ghi chú tổng kết khóa'}
            placeholder="VD: Hoàn thành đủ 32 buổi hoặc nghỉ học vì chuyển công tác xa"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            required={nextLearningStatus === 'dropped'}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStatusTarget(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant={nextLearningStatus === 'dropped' ? 'danger' : 'primary'}
              loading={statusMutation.isPending}
            >
              Xác nhận cập nhật
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
