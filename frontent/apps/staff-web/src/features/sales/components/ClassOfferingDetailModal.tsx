import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, FilePlus2, MapPin, Users } from 'lucide-react'
import {
  computeRemainingClassSeats,
  isClassOpenForRegistration,
  type CenterClassOfferingDto,
} from '@english-center/contracts'
import { Badge, Button, Modal } from '@english-center/ui'
import { formatDate, formatVnd } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import type { ManagedBranchRecord } from '@/features/content/types/cms.types'
import type { ManagedCourseRecord } from '@/features/courses/types/courses.types'
import type { TuitionPolicyRecord } from '@/features/tuition/types/tuition.types'
import { CLASS_RECRUITMENT_STATUS_META } from '@/features/sales/types/sales.types'

export function ClassOfferingDetailModal({
  open,
  classItem,
  course,
  branch,
  activePolicy,
  canCreateRegistration = true,
  preselectedLeadId,
  onClose,
}: {
  open: boolean
  classItem: CenterClassOfferingDto | null
  course?: ManagedCourseRecord
  branch?: ManagedBranchRecord
  activePolicy?: TuitionPolicyRecord
  canCreateRegistration?: boolean
  preselectedLeadId?: string
  onClose: () => void
}) {
  const navigate = useNavigate()

  if (!classItem) return null

  const remainingSeats = computeRemainingClassSeats(classItem)
  const selectable = isClassOpenForRegistration(classItem)
  const stMeta = CLASS_RECRUITMENT_STATUS_META[classItem.status]

  const estimatedVnd = activePolicy
    ? activePolicy.netTuitionVnd
    : (course?.listedTuitionVnd ?? 0)

  const handleProceedRegister = () => {
    const query = new URLSearchParams({
      courseId: classItem.courseId,
      branchId: classItem.branchId,
      classId: classItem.id,
    })
    if (preselectedLeadId) query.set('leadId', preselectedLeadId)
    onClose()
    navigate(`/sales/registrations/new?${query.toString()}`)
  }

  return (
    <Modal
      open={open}
      title={`Chi tiết Lớp mở tuyển sinh – ${classItem.classCode}`}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {canCreateRegistration && (
            <ActionGuard permission="sales.registrations.create">
              <Button
                variant="cta"
                disabled={!selectable}
                onClick={handleProceedRegister}
              >
                <FilePlus2 className="h-4 w-4" />
                <span>
                  {selectable
                    ? 'Chọn lớp này để đăng ký khách hàng'
                    : 'Lớp hiện không nhận đăng ký'}
                </span>
              </Button>
            </ActionGuard>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5">
          <div className="min-w-0">
            <p className="font-extrabold text-[#243B53]">{classItem.className}</p>
            <p className="text-xs text-[#64748B]">
              Mã lớp: <strong>{classItem.classCode}</strong> • Hình thức: {classItem.studyMode}
            </p>
          </div>
          <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="text-xs font-bold uppercase text-[#64748B]">Khóa học & Đầu ra</span>
            <p className="mt-1 font-bold text-[#2878B8]">{course?.name ?? classItem.courseId}</p>
            <p className="text-xs text-[#475569]">
              Mục tiêu: <strong>{course?.targetScoreLabel ?? 'Theo chương trình'}</strong>
            </p>
          </div>

          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#64748B]">
              <MapPin className="h-3.5 w-3.5" />
              Cơ sở đào tạo
            </span>
            <p className="mt-1 font-bold text-[#243B53]">
              {branch?.name ?? classItem.branchId}
            </p>
            <p className="text-xs text-[#475569]">
              {classItem.roomLabel ?? branch?.address ?? ''}
            </p>
          </div>

          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#64748B]">
              <Clock className="h-3.5 w-3.5" />
              Lịch học hàng tuần
            </span>
            <p className="mt-1 font-bold text-[#243B53]">{classItem.studyDays}</p>
            <p className="text-xs text-[#475569]">
              Khung giờ:{' '}
              <strong>
                {classItem.endTime
                  ? `${classItem.startTime} – ${classItem.endTime}`
                  : classItem.startTime}
              </strong>
            </p>
          </div>

          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#64748B]">
              <Calendar className="h-3.5 w-3.5" />
              Mốc thời gian khóa
            </span>
            <p className="mt-1 text-xs text-[#243B53]">
              Khai giảng:{' '}
              <strong>{classItem.startDateDisplay ?? formatDate(classItem.startDate)}</strong>
            </p>
            <p className="text-xs text-[#475569]">
              Kết thúc dự kiến:{' '}
              <strong>
                {classItem.endDate ? formatDate(classItem.endDate) : 'Chưa công bố'}
              </strong>
            </p>
            <p className="text-xs text-[#475569]">
              Hạn đăng ký:{' '}
              <strong>
                {classItem.registrationDeadline
                  ? formatDate(classItem.registrationDeadline)
                  : 'Khi đủ sĩ số'}
              </strong>
            </p>
          </div>

          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#64748B]">
              <Users className="h-3.5 w-3.5" />
              Sĩ số & Chỗ còn lại
            </span>
            {remainingSeats === null ? (
              <p className="mt-1 text-xs font-semibold text-[#9E6300]">
                Chưa cấu hình sĩ số tối đa
              </p>
            ) : (
              <>
                <p className="mt-1 font-bold text-[#243B53]">
                  Đã ghi danh: {classItem.enrolledStudents}/{classItem.maxStudents} HV
                </p>
                <p
                  className={`text-xs font-bold ${
                    remainingSeats > 0 ? 'text-[#1F7A4C]' : 'text-[#B93A2E]'
                  }`}
                >
                  Số chỗ còn trống: {remainingSeats} chỗ
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-[#EEF4F8] p-3">
            <span className="text-xs font-bold uppercase text-[#64748B]">
              Giảng viên & Học phí dự kiến
            </span>
            <p className="mt-1 text-xs text-[#243B53]">
              Giảng viên: <strong>{classItem.teacherName ?? 'Chưa phân công'}</strong>
            </p>
            <p className="mt-0.5 text-xs text-[#1F7A4C]">
              Học phí dự kiến:{' '}
              <strong>
                {estimatedVnd > 0 ? formatVnd(estimatedVnd) : 'Chưa có dữ liệu học phí'}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
