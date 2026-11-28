import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookmarkPlus, Eye, FilePlus2 } from 'lucide-react'
import {
  computeRemainingClassSeats,
  isClassOpenForRegistration,
  type CenterClassOfferingDto,
} from '@english-center/contracts'
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
import { formatDate, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { ClassOfferingDetailModal } from '@/features/sales/components/ClassOfferingDetailModal'
import {
  useAccessibleSalesLeads,
  useSalesLeadMutations,
  useSalesReferenceCatalogs,
} from '@/features/sales/hooks/useSalesCrm'
import { CLASS_RECRUITMENT_STATUS_META } from '@/features/sales/types/sales.types'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

export function SalesCourseDetailPage() {
  const { courseId = '' } = useParams()
  useDocumentTitle('Chi tiết Khóa học để tư vấn')
  const { session } = useStaffAuth()
  const navigate = useNavigate()
  const { notify } = useToast()

  const canUpdateLead = hasPermission(session, 'sales.leads.update')
  const canCreateReg = hasPermission(session, 'sales.registrations.create')
  const canViewClasses = hasPermission(session, 'sales.classes.view')

  const { courses, branches, classes, tuitionPolicies, isLoadingCatalogs } =
    useSalesReferenceCatalogs()
  const { data: accessibleLeads = [] } = useAccessibleSalesLeads()
  const { attachCourseInterest } = useSalesLeadMutations()

  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [identifiedNeed, setIdentifiedNeed] = useState('')
  const [targetGoalNote, setTargetGoalNote] = useState('')
  const [proposalReason, setProposalReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [detailClass, setDetailClass] = useState<CenterClassOfferingDto | null>(null)

  if (isLoadingCatalogs) return <LoadingBlock label="Đang tải chi tiết khóa học..." />

  const course = courses.find((c) => c.id === courseId)
  if (!course) {
    return (
      <ErrorBlock
        message="Không tìm thấy khóa học cần tra cứu."
        onRetry={() => navigate('/sales/courses')}
      />
    )
  }

  const branchMap = new Map(branches.map((b) => [b.id, b]))
  const activePolicy = tuitionPolicies.find(
    (p) => p.courseId === course.id && p.status === 'active',
  )
  const courseClasses = classes.filter((cls) => cls.courseId === course.id)
  const openClasses = courseClasses.filter((cls) => isClassOpenForRegistration(cls))

  const handleAttachToLead = (andNavigateToRegister: boolean) => {
    setFormError(null)
    if (!selectedLeadId) {
      setFormError('Vui lòng chọn một khách hàng tiềm năng (Lead) đang tư vấn.')
      return
    }
    if (!proposalReason.trim()) {
      setFormError('Vui lòng nhập lý do đề xuất khóa học này cho khách hàng.')
      return
    }

    attachCourseInterest.mutate(
      {
        leadId: selectedLeadId,
        courseId: course.id,
        classId: selectedClassId || undefined,
        identifiedNeed,
        targetGoalNote: targetGoalNote || course.targetScoreLabel,
        proposalReason,
      },
      {
        onSuccess: (updatedLead) => {
          notify({
            tone: 'success',
            title: 'Đã gắn khóa học quan tâm vào hồ sơ Lead',
            description: `Đã cập nhật cho ${updatedLead.fullName} và lưu bản ghi tư vấn (chưa tạo hồ sơ đăng ký).`,
          })
          if (andNavigateToRegister) {
            const q = new URLSearchParams({
              leadId: updatedLead.id,
              courseId: course.id,
            })
            if (selectedClassId) {
              const cls = classes.find((c) => c.id === selectedClassId)
              if (cls) q.set('branchId', cls.branchId)
              q.set('classId', selectedClassId)
            }
            navigate(`/sales/registrations/new?${q.toString()}`)
          } else {
            setProposalReason('')
          }
        },
        onError: (err) => {
          setFormError(err instanceof Error ? err.message : 'Không thể gắn khóa học vào Lead.')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/sales/courses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Danh sách khóa học & Lớp đang mở</span>
        </Link>
      </div>

      <PageHeader
        title={`${course.name} (${course.code})`}
        description={`Đầu vào: ${course.level} • Mục tiêu đầu ra: ${course.targetScoreLabel} • Thời lượng: ${course.duration}`}
        badge={
          canViewClasses ? (
            <Badge tone="success">{openClasses.length} lớp đang nhận đăng ký</Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Cột thông tin khóa học có thật */}
        <div className="space-y-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-7">
          <h2 className="text-base font-extrabold text-[#243B53]">
            1. Thông tin chương trình & Chính sách học phí hiện hành
          </h2>

          <p className="text-sm leading-relaxed text-[#475569]">
            {course.description || course.shortDescription || 'Chưa có mô tả chi tiết.'}
          </p>

          {course.highlights.length > 0 && (
            <div>
              <p className="text-xs font-extrabold uppercase text-[#2878B8]">
                Điểm trọng tâm tư vấn học viên
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-[#243B53]">
                {course.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[#64748B]">Học phí niêm yết gốc:</span>
              <p className="mt-0.5 text-base font-extrabold text-[#243B53]">
                {formatVnd(course.listedTuitionVnd)}
              </p>
            </div>
            <div>
              <span className="text-[#64748B]">Chính sách ưu đãi đang hiệu lực:</span>
              {activePolicy ? (
                <>
                  <p className="mt-0.5 text-base font-extrabold text-[#1F7A4C]">
                    {formatVnd(activePolicy.netTuitionVnd)}
                  </p>
                  <p className="text-[11px] text-[#475569]">{activePolicy.discountProgramName}</p>
                </>
              ) : (
                <p className="mt-0.5 font-semibold text-[#64748B]">
                  Không có chương trình giảm giá riêng
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cột gắn khóa học quan tâm vào Lead */}
        <div className="space-y-3.5 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs lg:col-span-5">
          <h2 className="text-base font-extrabold text-[#243B53]">
            2. Gắn khóa quan tâm vào khách hàng đang tư vấn
          </h2>

          {formError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
              {formError}
            </div>
          )}

          <SelectField
            id="att-lead"
            label="Chọn khách hàng đang tư vấn *"
            value={selectedLeadId}
            placeholder="-- Chọn khách hàng trong phạm vi của bạn --"
            disabled={!canUpdateLead}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            options={accessibleLeads.map((l) => ({
              value: l.id,
              label: `${l.fullName} (${l.phone})`,
            }))}
          />

          {canViewClasses && (
            <SelectField
              id="att-class"
              label="Lớp mở dự kiến (Tùy chọn)"
              value={selectedClassId}
              placeholder="-- Chưa cố định lớp --"
              disabled={!canUpdateLead}
              onChange={(e) => setSelectedClassId(e.target.value)}
              options={openClasses.map((cls) => ({
                value: cls.id,
                label: `${cls.classCode} – ${branchMap.get(cls.branchId)?.shortLabel ?? cls.branchId} (${cls.studyDays}) • KG ${cls.startDateDisplay ?? formatDate(cls.startDate)}`,
              }))}
            />
          )}

          <InputField
            id="att-goal"
            label="Mục tiêu điểm tư vấn"
            value={targetGoalNote}
            disabled={!canUpdateLead}
            onChange={(e) => setTargetGoalNote(e.target.value)}
            placeholder={course.targetScoreLabel}
          />

          <InputField
            id="att-need"
            label="Ghi chú nhu cầu cập nhật"
            value={identifiedNeed}
            disabled={!canUpdateLead}
            onChange={(e) => setIdentifiedNeed(e.target.value)}
            placeholder="VD: Muốn học ngay đợt tháng 1..."
          />

          <InputField
            id="att-reason"
            label="Lý do đề xuất khóa học này *"
            value={proposalReason}
            disabled={!canUpdateLead}
            onChange={(e) => setProposalReason(e.target.value)}
            placeholder="VD: Điểm đầu vào 320 phù hợp lộ trình xây gốc 24 buổi..."
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <ActionGuard permission="sales.leads.update">
              <Button
                variant="secondary"
                loading={attachCourseInterest.isPending}
                onClick={() => handleAttachToLead(false)}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span>Chỉ gắn khóa vào Lead</span>
              </Button>
            </ActionGuard>

            <ActionGuard permission="sales.leads.update">
              <ActionGuard permission="sales.registrations.create">
                <Button
                  variant="cta"
                  loading={attachCourseInterest.isPending}
                  onClick={() => handleAttachToLead(true)}
                >
                  <FilePlus2 className="h-4 w-4" />
                  <span>Gắn & Chuyển sang Đăng ký</span>
                </Button>
              </ActionGuard>
            </ActionGuard>
          </div>
        </div>
      </div>

      {/* Bảng tất cả lớp của khóa học này trên mọi cơ sở */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[#243B53]">
          3. Danh sách Lớp thuộc khóa {course.name} tại tất cả cơ sở (
          {canViewClasses ? courseClasses.length : 0})
        </h2>

        {!canViewClasses ? (
          <EmptyBlock title="Bạn không có quyền xem danh sách lớp mở của khóa học" />
        ) : courseClasses.length === 0 ? (
          <EmptyBlock title="Hiện chưa có lớp nào được mở cho khóa học này" />
        ) : (
          <DataTableContainer>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Mã & Tên lớp
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">Cơ sở</DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Lịch học & Khai giảng
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Giảng viên
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Sĩ số & Chỗ trống
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap">
                    Trạng thái
                  </DataTableHeaderCell>
                  <DataTableHeaderCell className="whitespace-nowrap text-right">
                    Chọn lớp
                  </DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {courseClasses.map((cls) => {
                  const branch = branchMap.get(cls.branchId)
                  const rem = computeRemainingClassSeats(cls)
                  const selectable = isClassOpenForRegistration(cls)
                  const stMeta = CLASS_RECRUITMENT_STATUS_META[cls.status]
                  const scheduleText = cls.endTime
                    ? `${cls.studyDays} (${cls.startTime} – ${cls.endTime})`
                    : cls.studyDays === cls.startTime
                      ? cls.studyDays
                      : `${cls.studyDays} (${cls.startTime})`

                  return (
                    <DataTableRow key={cls.id}>
                      <DataTableCell>
                        <p className="whitespace-nowrap font-bold text-[#243B53]">
                          {cls.classCode}
                        </p>
                        <p className="text-xs text-[#64748B]">{cls.className}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs font-semibold">
                        {branch?.name ?? cls.branchId}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        <p className="font-semibold text-[#243B53]">{scheduleText}</p>
                        <p className="text-[#64748B]">
                          KG: <strong>{cls.startDateDisplay ?? formatDate(cls.startDate)}</strong>
                          {cls.endDate ? ` – KT: ${formatDate(cls.endDate)}` : ''}
                        </p>
                        {cls.registrationDeadline && (
                          <p className="text-[11px] text-[#9E6300]">
                            Hạn ĐK: {formatDate(cls.registrationDeadline)}
                          </p>
                        )}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        {cls.teacherName ?? 'Chưa phân công'}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-xs">
                        {rem === null
                          ? 'Chưa cấu hình sĩ số'
                          : `${cls.enrolledStudents}/${cls.maxStudents} (Còn ${rem})`}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailClass(cls)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <ActionGuard permission="sales.registrations.create">
                            <Button
                              size="sm"
                              disabled={!selectable}
                              onClick={() => {
                                const q = new URLSearchParams({
                                  courseId: course.id,
                                  branchId: cls.branchId,
                                  classId: cls.id,
                                })
                                if (selectedLeadId) q.set('leadId', selectedLeadId)
                                navigate(`/sales/registrations/new?${q.toString()}`)
                              }}
                            >
                              Đăng ký vào lớp
                            </Button>
                          </ActionGuard>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  )
                })}
              </tbody>
            </DataTable>
          </DataTableContainer>
        )}
      </div>

      <ClassOfferingDetailModal
        open={Boolean(detailClass)}
        classItem={detailClass}
        course={course}
        branch={detailClass ? branchMap.get(detailClass.branchId) : undefined}
        activePolicy={activePolicy}
        canCreateRegistration={canCreateReg}
        preselectedLeadId={selectedLeadId || undefined}
        onClose={() => setDetailClass(null)}
      />
    </div>
  )
}
