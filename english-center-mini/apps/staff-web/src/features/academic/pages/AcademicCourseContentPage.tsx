import { useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CopyPlus, Plus } from 'lucide-react'
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
import type { CourseSyllabusSessionItemDto, LessonActivityType } from '@english-center/contracts'
import { formatDate } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { coursesApi } from '@/features/courses/api/coursesApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'
import { academicApi } from '@/features/academic/services/academicApi'
import { ACADEMIC_QUERY_KEYS, useAcademicActor } from '@/features/academic/hooks/useAcademic'

const ACTIVITY_LABELS: Record<LessonActivityType, string> = {
  class: 'Buổi học trên lớp',
  review: 'Ôn tập & Chữa đề',
  demo: 'Demo Test',
  mid: 'Middle Test (Giữa khóa)',
  final: 'Final Test (Cuối khóa)',
}

export function AcademicCourseContentPage() {
  useDocumentTitle('Quản lý nội dung khóa học')
  const actor = useAcademicActor()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const queryClient = useQueryClient()

  const [courseFilter, setCourseFilter] = useState('ALL')
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string | null>(null)

  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [newCourseId, setNewCourseId] = useState('submarine-toeic')
  const [newVersionCode, setNewVersionCode] = useState('')
  const [newEffectiveFrom, setNewEffectiveFrom] = useState(todayYmdVn)
  const [newSummaryNote, setNewSummaryNote] = useState('')

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | undefined>(undefined)
  const [sessionNumber, setSessionNumber] = useState('1')
  const [activityType, setActivityType] = useState<LessonActivityType>('class')
  const [topicTitle, setTopicTitle] = useState('')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [lcSummary, setLcSummary] = useState('')
  const [rcSummary, setRcSummary] = useState('')
  const [materialsText, setMaterialsText] = useState('')

  const {
    data: syllabi = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ACADEMIC_QUERY_KEYS.syllabi(),
    queryFn: () => academicApi.listCourseSyllabi(),
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['staff', 'courses'],
    queryFn: () => coursesApi.listCourses(),
  })

  const filteredSyllabi = useMemo(() => {
    if (courseFilter === 'ALL') return syllabi
    return syllabi.filter((s) => s.courseId === courseFilter)
  }, [syllabi, courseFilter])

  const activeSyllabus =
    filteredSyllabi.find((s) => s.id === selectedSyllabusId) ?? filteredSyllabi[0] ?? null

  const createVersionMutation = useMutation({
    mutationFn: () =>
      academicApi.createSyllabusVersion(actor, {
        courseId: newCourseId,
        versionCode: newVersionCode,
        effectiveFrom: newEffectiveFrom,
        summaryNote: newSummaryNote,
        cloneFromSyllabusId: activeSyllabus?.courseId === newCourseId ? activeSyllabus.id : undefined,
      }),
    onSuccess: (created) => {
      setVersionModalOpen(false)
      setNewVersionCode('')
      setNewSummaryNote('')
      setSelectedSyllabusId(created.id)
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.syllabi() })
      notify({
        tone: 'success',
        title: `Đã tạo phiên bản nội dung ${created.versionCode}`,
        description: 'Phiên bản mới ở trạng thái Bản nháp, không ảnh hưởng các lớp đang học.',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể tạo phiên bản mới',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const upsertSessionMutation = useMutation({
    mutationFn: () => {
      if (!activeSyllabus) throw new Error('Chưa chọn phiên bản giáo trình.')
      return academicApi.upsertSyllabusSession(actor, {
        syllabusId: activeSyllabus.id,
        session: {
          id: editingSessionId,
          sessionNumber: Number(sessionNumber) || 1,
          activityType,
          topicTitle,
          learningObjectives,
          lcSummary,
          rcSummary,
          teachingMaterials: materialsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      })
    },
    onSuccess: () => {
      setSessionModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.syllabi() })
      notify({
        tone: 'success',
        title: 'Đã lưu nội dung buổi học trong khung chương trình',
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể lưu buổi học',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra.',
      })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => academicApi.activateSyllabusVersion(actor, id),
    onSuccess: (activated) => {
      void queryClient.invalidateQueries({ queryKey: ACADEMIC_QUERY_KEYS.syllabi() })
      notify({
        tone: 'success',
        title: `Đã kích hoạt phiên bản ${activated.versionCode}`,
        description: 'Phiên bản cũ của cùng khóa học đã tự động chuyển sang Lưu trữ.',
      })
    },
  })

  const openAddSessionModal = () => {
    const nextNo = (activeSyllabus?.sessions.length ?? 0) + 1
    setEditingSessionId(undefined)
    setSessionNumber(String(nextNo))
    setActivityType('class')
    setTopicTitle('')
    setLearningObjectives('')
    setLcSummary('')
    setRcSummary('')
    setMaterialsText('')
    setSessionModalOpen(true)
  }

  const openEditSessionModal = (item: CourseSyllabusSessionItemDto) => {
    setEditingSessionId(item.id)
    setSessionNumber(String(item.sessionNumber))
    setActivityType(item.activityType)
    setTopicTitle(item.topicTitle)
    setLearningObjectives(item.learningObjectives)
    setLcSummary(item.lcSummary)
    setRcSummary(item.rcSummary)
    setMaterialsText(item.teachingMaterials.join(', '))
    setSessionModalOpen(true)
  }

  const handleCreateVersionSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createVersionMutation.mutate()
  }

  const handleSessionSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    upsertSessionMutation.mutate()
  }

  if (isLoading) return <LoadingBlock label="Đang tải khung chương trình đào tạo..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải nội dung khóa học."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Nội dung đào tạo theo Khóa học"
        description="Quản lý cấu trúc buổi học, chủ đề, mục tiêu đầu ra và tài liệu giảng dạy theo phiên bản."
        actions={
          <ActionGuard permission="course-content.update">
            <Button size="sm" onClick={() => setVersionModalOpen(true)}>
              <CopyPlus className="h-4 w-4" />
              <span>Tạo phiên bản giáo trình mới</span>
            </Button>
          </ActionGuard>
        }
      />

      {filteredSyllabi.length === 0 ? (
        <div className="space-y-4">
          {syllabi.length > 0 && (
            <div className="max-w-xs rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs">
              <SelectField
                id="syl-course-filter"
                label="Lọc theo khóa học"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả khóa học' },
                  ...courses.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}
          <EmptyBlock title="Chưa có nội dung khóa học." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Danh sách phiên bản giáo trình */}
          <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs lg:col-span-4">
            <SelectField
              id="syl-course-filter"
              label="Lọc theo khóa học"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'Tất cả khóa học' },
                ...courses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <div className="space-y-2">
              {filteredSyllabi.map((syl) => {
                const selected = syl.id === activeSyllabus?.id
                return (
                  <button
                    key={syl.id}
                    type="button"
                    onClick={() => setSelectedSyllabusId(syl.id)}
                    className={`w-full min-w-0 rounded-xl border p-3.5 text-left transition ${
                      selected
                        ? 'border-[#2878B8] bg-[#EAF6FD]/70'
                        : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 text-xs font-extrabold text-[#2878B8]">
                        {syl.versionCode}
                      </span>
                      <Badge
                        tone={
                          syl.status === 'active'
                            ? 'success'
                            : syl.status === 'draft'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {syl.status === 'active'
                          ? 'Đang áp dụng'
                          : syl.status === 'draft'
                            ? 'Bản nháp'
                            : 'Lưu trữ'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#243B53]">{syl.courseName}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      Hiệu lực từ: {formatDate(syl.effectiveFrom)} • {syl.sessions.length} buổi mẫu
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Chi tiết các buổi học của phiên bản */}
          <div className="space-y-4 lg:col-span-8">
            {activeSyllabus && (
              <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#DCEAF3] pb-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-[#243B53]">
                      {activeSyllabus.courseName} – Phiên bản {activeSyllabus.versionCode}
                    </h2>
                    <p className="mt-1 text-xs text-[#64748B]">{activeSyllabus.summaryNote}</p>
                  </div>

                  {activeSyllabus.status !== 'archived' && (
                    <ActionGuard permission="course-content.update">
                      <div className="flex flex-wrap items-center gap-2">
                        {activeSyllabus.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={activateMutation.isPending}
                            onClick={() => activateMutation.mutate(activeSyllabus.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Kích hoạt áp dụng</span>
                          </Button>
                        )}
                        <Button size="sm" onClick={openAddSessionModal}>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm buổi học mẫu</span>
                        </Button>
                      </div>
                    </ActionGuard>
                  )}
                </div>

                {activeSyllabus.sessions.length === 0 ? (
                  <EmptyBlock title="Chưa có buổi học mẫu." />
                ) : (
                  <DataTableContainer>
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <DataTableHeaderCell className="w-44 whitespace-nowrap">
                            Buổi
                          </DataTableHeaderCell>
                          <DataTableHeaderCell>Chủ đề & Mục tiêu buổi học</DataTableHeaderCell>
                          <DataTableHeaderCell>Nội dung LC / RC & Học liệu</DataTableHeaderCell>
                          <DataTableHeaderCell className="w-28 text-right whitespace-nowrap">
                            Thao tác
                          </DataTableHeaderCell>
                        </tr>
                      </DataTableHead>
                      <tbody>
                        {activeSyllabus.sessions.map((ses) => (
                          <DataTableRow key={ses.id}>
                            <DataTableCell className="w-44 align-top whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1.5">
                                <span className="font-extrabold text-[#243B53]">
                                  Buổi {String(ses.sessionNumber).padStart(2, '0')}
                                </span>
                                <Badge tone={ses.activityType === 'class' ? 'info' : 'warning'}>
                                  {ACTIVITY_LABELS[ses.activityType]}
                                </Badge>
                              </div>
                            </DataTableCell>
                            <DataTableCell className="max-w-xs align-top text-xs">
                              <p className="font-bold text-[#243B53]">{ses.topicTitle}</p>
                              <p className="mt-1 text-[#475569]">
                                <strong>Mục tiêu:</strong> {ses.learningObjectives}
                              </p>
                            </DataTableCell>
                            <DataTableCell className="max-w-xs align-top text-xs text-[#475569]">
                              <p>
                                <strong>LC:</strong> {ses.lcSummary}
                              </p>
                              <p className="mt-0.5">
                                <strong>RC:</strong> {ses.rcSummary}
                              </p>
                              {ses.teachingMaterials.length > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-[#2878B8]">
                                  Tài liệu: {ses.teachingMaterials.join(', ')}
                                </p>
                              )}
                            </DataTableCell>
                            <DataTableCell className="align-top text-right whitespace-nowrap">
                              {activeSyllabus.status !== 'archived' && (
                                <ActionGuard permission="course-content.update">
                                  <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditSessionModal(ses)}
                                    >
                                      Biên tập
                                    </Button>
                                  </div>
                                </ActionGuard>
                              )}
                            </DataTableCell>
                          </DataTableRow>
                        ))}
                      </tbody>
                    </DataTable>
                  </DataTableContainer>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal tạo phiên bản mới */}
      <Modal
        open={versionModalOpen}
        title="Khởi tạo Phiên bản giáo trình khóa học mới"
        onClose={() => setVersionModalOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleCreateVersionSubmit} className="space-y-4">
          <SelectField
            id="new-syl-course"
            label="Khóa học *"
            value={newCourseId}
            onChange={(e) => setNewCourseId(e.target.value)}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              id="new-syl-ver"
              label="Mã phiên bản mới *"
              placeholder="VD: SYL-SUB-2027.1"
              value={newVersionCode}
              onChange={(e) => setNewVersionCode(e.target.value)}
              required
            />
            <InputField
              id="new-syl-eff"
              type="date"
              label="Ngày dự kiến hiệu lực *"
              value={newEffectiveFrom}
              onChange={(e) => setNewEffectiveFrom(e.target.value)}
              required
            />
          </div>
          <InputField
            id="new-syl-summary"
            label="Mô tả thay đổi của phiên bản *"
            placeholder="VD: Bổ sung thêm 2 buổi luyện đề thực chiến Part 7 mới"
            value={newSummaryNote}
            onChange={(e) => setNewSummaryNote(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVersionModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={createVersionMutation.isPending}>
              Tạo bản nháp giáo trình
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal thêm/sửa buổi học */}
      <Modal
        open={sessionModalOpen}
        title={editingSessionId ? 'Cập nhật nội dung buổi học' : 'Thêm buổi học vào giáo trình'}
        onClose={() => setSessionModalOpen(false)}
        maxWidthClassName="max-w-xl"
      >
        <form onSubmit={handleSessionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              id="ses-num"
              type="number"
              min={1}
              max={60}
              label="Thứ tự buổi học *"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              required
            />
            <SelectField
              id="ses-act"
              label="Loại hình buổi học *"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as LessonActivityType)}
              options={[
                { value: 'class', label: 'Học trên lớp' },
                { value: 'review', label: 'Ôn tập & Chữa đề' },
                { value: 'demo', label: 'Demo Test' },
                { value: 'mid', label: 'Middle Test (Giữa khóa)' },
                { value: 'final', label: 'Final Test (Cuối khóa)' },
              ]}
            />
          </div>
          <InputField
            id="ses-topic"
            label="Chủ đề buổi học *"
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            required
          />
          <InputField
            id="ses-obj"
            label="Mục tiêu học tập *"
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              id="ses-lc"
              label="Nội dung Listening (LC)"
              value={lcSummary}
              onChange={(e) => setLcSummary(e.target.value)}
            />
            <InputField
              id="ses-rc"
              label="Nội dung Reading (RC)"
              value={rcSummary}
              onChange={(e) => setRcSummary(e.target.value)}
            />
          </div>
          <InputField
            id="ses-mats"
            label="Tài liệu giảng dạy (cách nhau bởi dấu phẩy)"
            placeholder="Slide_Unit03.pdf, Audio_Part3.mp3"
            value={materialsText}
            onChange={(e) => setMaterialsText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSessionModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={upsertSessionMutation.isPending}>
              Lưu buổi học
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
