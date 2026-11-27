import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import {
  CONSULTATION_CHANNELS,
  LEAD_SOURCES,
  getAllowedManualLeadTransitions,
  isClassOpenForRegistration,
  isLeadReopenTransition,
  type CenterClassOfferingDto,
  type ConsultationChannel,
  type LeadSource,
  type LeadStatus,
  type SalesLeadDto,
} from '@english-center/contracts'
import { Badge, Button, InputField, Modal, SelectField } from '@english-center/ui'
import { formatDate } from '@english-center/utils'
import type { ManagedBranchRecord } from '@/features/content/types/cms.types'
import type { ManagedCourseRecord } from '@/features/courses/types/courses.types'
import { salesApi } from '@/features/sales/services/salesApi'
import {
  CONSULTATION_CHANNEL_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_META,
  type DuplicateLeadWarning,
  type SalesActorContext,
} from '@/features/sales/types/sales.types'
import { useSalesLeadMutations } from '@/features/sales/hooks/useSalesCrm'
import { useToast } from '@/shared/feedback/useToast'

interface SaleEmployeeOption {
  id: string
  fullName: string
  employeeCode: string
  branchName: string
}

export function CreateOrEditLeadModal({
  open,
  actor,
  initialLead,
  courses,
  branches,
  saleEmployees,
  onClose,
}: {
  open: boolean
  actor: SalesActorContext
  initialLead?: SalesLeadDto | null
  courses: readonly ManagedCourseRecord[]
  branches: readonly ManagedBranchRecord[]
  saleEmployees: readonly SaleEmployeeOption[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { createLead, updateLead } = useSalesLeadMutations()

  const isEdit = Boolean(initialLead)
  const [fullName, setFullName] = useState(initialLead?.fullName ?? '')
  const [phone, setPhone] = useState(initialLead?.phone ?? '')
  const [email, setEmail] = useState(initialLead?.email ?? '')
  const [facebookUrl, setFacebookUrl] = useState(initialLead?.facebookUrl ?? '')
  const [schoolOrWork, setSchoolOrWork] = useState(initialLead?.schoolOrWork ?? '')
  const [learningNeed, setLearningNeed] = useState(initialLead?.learningNeed ?? '')
  const [currentLevelNote, setCurrentLevelNote] = useState(initialLead?.currentLevelNote ?? '')
  const [targetGoalNote, setTargetGoalNote] = useState(initialLead?.targetGoalNote ?? '')
  const [preferredContactTime, setPreferredContactTime] = useState(
    initialLead?.preferredContactTime ?? 'Buổi tối',
  )
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    initialLead?.interestedCourseIds ?? [],
  )
  const [preferredBranchId, setPreferredBranchId] = useState(
    initialLead?.preferredBranchId ?? '',
  )
  const [source, setSource] = useState<LeadSource>(initialLead?.source ?? 'manual')
  const [consentSummary, setConsentSummary] = useState(
    initialLead?.consentSummary ??
      'Khách cung cấp trực tiếp qua Hotline / Quầy tư vấn để nhận lộ trình học.',
  )
  const [assignedSaleId, setAssignedSaleId] = useState(
    initialLead?.assignedSaleId ?? actor.userId,
  )

  const [duplicates, setDuplicates] = useState<DuplicateLeadWarning[]>([])
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCheckDuplicate = async (nextPhone: string, nextEmail: string) => {
    if (nextPhone.trim().length < 9 && nextEmail.trim().length < 5) {
      setDuplicates([])
      setAllowDuplicateOverride(false)
      return
    }
    const found = await salesApi.findDuplicateLeads(actor, {
      phone: nextPhone,
      email: nextEmail,
      excludeLeadId: initialLead?.id,
    })
    setDuplicates(found)
    if (found.length === 0) {
      setAllowDuplicateOverride(false)
    }
  }

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    )
  }

  const handleSubmit = () => {
    setErrorMsg(null)
    if (!learningNeed.trim()) {
      setErrorMsg('Vui lòng ghi nhận nhu cầu học tập của khách hàng.')
      return
    }

    if (isEdit && initialLead) {
      updateLead.mutate(
        {
          leadId: initialLead.id,
          fullName,
          phone,
          email,
          facebookUrl,
          schoolOrWork,
          learningNeed,
          currentLevelNote,
          targetGoalNote,
          preferredContactTime,
          interestedCourseIds: selectedCourseIds,
          preferredBranchId,
          interestedClassId: initialLead.interestedClassId,
          assignedSaleId,
          allowDuplicateOverride,
        },
        {
          onSuccess: (saved) => {
            notify({
              tone: 'success',
              title: 'Đã cập nhật hồ sơ khách hàng tiềm năng',
              description: saved.fullName,
            })
            onClose()
          },
          onError: (err) => {
            setErrorMsg(err instanceof Error ? err.message : 'Không thể cập nhật khách hàng.')
          },
        },
      )
      return
    }

    createLead.mutate(
      {
        fullName,
        phone,
        email,
        facebookUrl,
        schoolOrWork,
        learningNeed,
        currentLevelNote,
        targetGoalNote,
        preferredContactTime,
        interestedCourseIds: selectedCourseIds,
        preferredBranchId,
        source,
        consentSummary,
        assignedSaleId,
        allowDuplicateOverride,
      },
      {
        onSuccess: (created) => {
          notify({
            tone: 'success',
            title: 'Đã thêm khách hàng tiềm năng mới',
            description: `${created.fullName} – Trạng thái: Mới tiếp nhận`,
          })
          onClose()
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo khách hàng.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Chỉnh sửa thông tin khách hàng tiềm năng' : 'Thêm khách hàng tiềm năng (Lead)'}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createLead.isPending || updateLead.isPending}
            disabled={duplicates.length > 0 && !allowDuplicateOverride}
          >
            {isEdit ? 'Lưu cập nhật' : 'Tạo hồ sơ Lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
            {errorMsg}
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#78350F]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
              <div className="flex-1 space-y-2">
                <p className="font-extrabold">
                  Cảnh báo trùng thông tin liên hệ với hồ sơ khác trong CRM:
                </p>
                {duplicates.map((dup) => (
                  <div
                    key={dup.leadId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#FDE68A] bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong>{dup.fullName}</strong>
                      <span>• Trùng {dup.matchedBy === 'phone' ? 'Số điện thoại' : 'Email'}</span>
                      <Badge tone={LEAD_STATUS_META[dup.status].tone}>
                        {LEAD_STATUS_META[dup.status].label}
                      </Badge>
                    </div>
                    {dup.isAccessibleByCurrentActor ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onClose()
                          navigate(`/sales/leads/${dup.leadId}`)
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở hồ sơ sẵn có</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#9E6300]">
                        Đang do nhân viên Sale khác phụ trách
                      </span>
                    )}
                  </div>
                ))}
                <label className="flex cursor-pointer items-center gap-2 pt-1 font-bold">
                  <input
                    type="checkbox"
                    checked={allowDuplicateOverride}
                    onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                  />
                  <span>Xác nhận đây là người học độc lập (ví dụ dùng chung SĐT phụ huynh)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <InputField
            id="lead-fullname"
            label="Họ và tên khách hàng *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn An"
          />
          <InputField
            id="lead-phone"
            label="Số điện thoại (10 số) *"
            type="tel"
            value={phone}
            onChange={(e) => {
              const next = e.target.value
              setPhone(next)
              void handleCheckDuplicate(next, email)
            }}
            placeholder="0900000109"
          />
          <InputField
            id="lead-email"
            label="Email (Không bắt buộc)"
            type="email"
            value={email}
            onChange={(e) => {
              const next = e.target.value
              setEmail(next)
              void handleCheckDuplicate(phone, next)
            }}
            placeholder="hocvien@student.englishcenter.edu.vn"
          />
          <InputField
            id="lead-facebook"
            label="Facebook cá nhân (Không bắt buộc)"
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/hocvien"
          />
          <InputField
            id="lead-school"
            label="Trường học / Đơn vị công tác"
            value={schoolOrWork}
            onChange={(e) => setSchoolOrWork(e.target.value)}
            placeholder="ĐH Kinh tế Quốc dân – Năm 3"
          />
          <InputField
            id="lead-time"
            label="Khung giờ thuận tiện liên hệ"
            value={preferredContactTime}
            onChange={(e) => setPreferredContactTime(e.target.value)}
            placeholder="VD: Buổi tối sau 19:00"
          />
          <InputField
            id="lead-level"
            label="Trình độ / Điểm hiện tại"
            value={currentLevelNote}
            onChange={(e) => setCurrentLevelNote(e.target.value)}
            placeholder="VD: Mất gốc hoặc 350–400 LR"
          />
          <InputField
            id="lead-goal"
            label="Mục tiêu mong muốn"
            value={targetGoalNote}
            onChange={(e) => setTargetGoalNote(e.target.value)}
            placeholder="VD: 650+ TOEIC trước tháng 6"
          />
          <SelectField
            id="lead-branch"
            label="Cơ sở mong muốn"
            value={preferredBranchId}
            placeholder="-- Chưa chọn cơ sở cụ thể --"
            onChange={(e) => setPreferredBranchId(e.target.value)}
            options={branches
              .filter((b) => b.isActive)
              .map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            id="lead-assignee"
            label="Nhân viên Sale phụ trách"
            value={assignedSaleId}
            disabled={actor.scope === 'own'}
            onChange={(e) => setAssignedSaleId(e.target.value)}
            options={
              saleEmployees.length > 0
                ? saleEmployees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.fullName} (${emp.employeeCode})`,
                  }))
                : [{ value: actor.userId, label: actor.fullName }]
            }
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]">
            Khóa học quan tâm
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {courses
              .filter((c) => c.status === 'active')
              .map((course) => {
                const checked = selectedCourseIds.includes(course.id)
                return (
                  <label
                    key={course.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      checked
                        ? 'border-[#2878B8] bg-[#EAF6FD] text-[#2878B8]'
                        : 'border-[#DCEAF3] bg-white text-[#243B53]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCourse(course.id)}
                    />
                    <span>{course.name}</span>
                  </label>
                )
              })}
          </div>
        </div>

        <div>
          <label
            htmlFor="lead-need"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
          >
            Nhu cầu học tập & Mục đích cần chứng chỉ *
          </label>
          <textarea
            id="lead-need"
            rows={2}
            value={learningNeed}
            onChange={(e) => setLearningNeed(e.target.value)}
            placeholder="Ghi rõ mục đích xét tốt nghiệp, đi làm, khung giờ rảnh..."
            className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#75BDEB]"
          />
        </div>

        {!isEdit && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <SelectField
              id="lead-source"
              label="Nguồn tiếp nhận"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              options={LEAD_SOURCES.map((src) => ({
                value: src,
                label: LEAD_SOURCE_LABELS[src],
              }))}
            />
            <InputField
              id="lead-consent"
              label="Ghi nhận đồng ý liên hệ tư vấn"
              value={consentSummary}
              onChange={(e) => setConsentSummary(e.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

export function TransitionLeadStatusModal({
  open,
  lead,
  canAdminReopenLead,
  onClose,
}: {
  open: boolean
  lead: SalesLeadDto | null
  canAdminReopenLead: boolean
  onClose: () => void
}) {
  const { notify } = useToast()
  const { transitionLeadStatus } = useSalesLeadMutations()

  const sessionKey = `${open ? 'open' : 'closed'}:${lead?.id ?? 'none'}:${lead?.status ?? 'none'}`
  const [trackedKey, setTrackedKey] = useState(sessionKey)
  const [targetStatus, setTargetStatus] = useState<LeadStatus | ''>('')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (trackedKey !== sessionKey) {
    setTrackedKey(sessionKey)
    setTargetStatus('')
    setReason('')
    setErrorMsg(null)
  }

  const handleClose = () => {
    setTargetStatus('')
    setReason('')
    setErrorMsg(null)
    onClose()
  }

  if (!lead) return null

  const allowedTargets = getAllowedManualLeadTransitions(lead.status, canAdminReopenLead)

  const effectiveTarget =
    targetStatus && allowedTargets.includes(targetStatus)
      ? targetStatus
      : (allowedTargets[0] ?? '')

  const requiresReason =
    Boolean(effectiveTarget) && isLeadReopenTransition(lead.status, effectiveTarget as LeadStatus)

  const handleConfirm = () => {
    if (!effectiveTarget) return
    setErrorMsg(null)
    transitionLeadStatus.mutate(
      {
        leadId: lead.id,
        toStatus: effectiveTarget as LeadStatus,
        reason,
      },
      {
        onSuccess: (updated) => {
          notify({
            tone: 'success',
            title: 'Đã chuyển trạng thái khách hàng',
            description: `${updated.fullName} → ${LEAD_STATUS_META[updated.status].label}`,
          })
          handleClose()
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Chuyển trạng thái thất bại.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title={`Đổi trạng thái tư vấn – ${lead.fullName}`}
      onClose={handleClose}
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Đóng
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={allowedTargets.length === 0 || !effectiveTarget}
            loading={transitionLeadStatus.isPending}
          >
            Xác nhận chuyển trạng thái
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5FAFE] p-3">
          <span className="min-w-0 text-xs font-semibold text-[#64748B]">
            Trạng thái hiện tại:
          </span>
          <Badge tone={LEAD_STATUS_META[lead.status].tone}>
            {LEAD_STATUS_META[lead.status].label}
          </Badge>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
            {errorMsg}
          </div>
        )}

        {allowedTargets.length === 0 ? (
          <p className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs leading-relaxed text-[#475569]">
            Khách hàng đang ở trạng thái <strong>{LEAD_STATUS_META[lead.status].label}</strong>,
            hiện không có trạng thái chuyển tiếp khả dụng.
          </p>
        ) : (
          <>
            <SelectField
              id="lead-next-status"
              label="Trạng thái chuyển tới hợp lệ"
              value={effectiveTarget}
              onChange={(e) => {
                setTargetStatus(e.target.value as LeadStatus)
                setErrorMsg(null)
              }}
              options={allowedTargets.map((st) => ({
                value: st,
                label: LEAD_STATUS_META[st].label,
              }))}
            />

            <InputField
              id="lead-status-reason"
              label={
                requiresReason
                  ? 'Lý do mở lại hồ sơ (Bắt buộc) *'
                  : 'Ghi chú chuyển trạng thái (Tùy chọn)'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                requiresReason
                  ? 'VD: Khách liên hệ lại xin lịch khai giảng đợt mới...'
                  : 'Ghi chú ngắn lưu vào lịch sử trạng thái...'
              }
            />
          </>
        )}
      </div>
    </Modal>
  )
}

export function LogConsultationModal({
  open,
  lead,
  courses,
  classes,
  onClose,
}: {
  open: boolean
  lead: SalesLeadDto | null
  courses: readonly ManagedCourseRecord[]
  classes: readonly CenterClassOfferingDto[]
  onClose: () => void
}) {
  const { notify } = useToast()
  const { createConsultation } = useSalesLeadMutations()

  const [channel, setChannel] = useState<ConsultationChannel>('phone')
  const [advisedCourseId, setAdvisedCourseId] = useState(
    lead?.interestedCourseIds[0] ?? '',
  )
  const [advisedClassId, setAdvisedClassId] = useState(lead?.interestedClassId ?? '')
  const [identifiedNeed, setIdentifiedNeed] = useState(lead?.learningNeed ?? '')
  const [summary, setSummary] = useState('')
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  if (!lead) return null

  const matchingOpenClasses = classes.filter(
    (cls) =>
      isClassOpenForRegistration(cls) &&
      (!advisedCourseId || cls.courseId === advisedCourseId),
  )

  const handleSave = () => {
    setErrorMsg(null)
    createConsultation.mutate(
      {
        leadId: lead.id,
        channel,
        advisedCourseId: advisedCourseId || undefined,
        advisedClassId: advisedClassId || undefined,
        identifiedNeed,
        summary,
        outcome,
        note,
      },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: 'Đã ghi nhận bản ghi tư vấn mới',
            description: `Đã lưu vào lịch sử tư vấn của ${lead.fullName}.`,
          })
          setSummary('')
          setOutcome('')
          setNote('')
          handleClose()
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu buổi tư vấn.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title={`Ghi nhận lần tư vấn mới – ${lead.fullName}`}
      onClose={handleClose}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} loading={createConsultation.isPending}>
            Lưu bản ghi tư vấn
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {errorMsg && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <SelectField
            id="cons-channel"
            label="Hình thức tư vấn"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ConsultationChannel)}
            options={CONSULTATION_CHANNELS.map((ch) => ({
              value: ch,
              label: CONSULTATION_CHANNEL_LABELS[ch],
            }))}
          />
          <SelectField
            id="cons-course"
            label="Khóa học đề xuất"
            value={advisedCourseId}
            placeholder="-- Chọn khóa học --"
            onChange={(e) => {
              setAdvisedCourseId(e.target.value)
              setAdvisedClassId('')
            }}
            options={courses
              .filter((c) => c.status === 'active')
              .map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <SelectField
          id="cons-class"
          label="Lớp đang mở dự kiến (Tùy chọn)"
          value={advisedClassId}
          placeholder="-- Chưa chọn lớp cụ thể --"
          onChange={(e) => setAdvisedClassId(e.target.value)}
          options={matchingOpenClasses.map((cls) => ({
            value: cls.id,
            label: `${cls.classCode} – ${cls.endTime ? `${cls.studyDays} (${cls.startTime}-${cls.endTime})` : cls.studyDays} • KG ${cls.startDateDisplay ?? formatDate(cls.startDate)}`,
          }))}
        />

        <InputField
          id="cons-need"
          label="Nhu cầu & Trình độ ghi nhận *"
          value={identifiedNeed}
          onChange={(e) => setIdentifiedNeed(e.target.value)}
          placeholder="VD: Cần lớp tối 2-4-6, đầu vào khoảng 400..."
        />

        <div>
          <label
            htmlFor="cons-summary"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
          >
            Nội dung trao đổi chính *
          </label>
          <textarea
            id="cons-summary"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tóm tắt nội dung đã giải đáp cho khách hàng..."
            className="w-full rounded-xl border border-[#DCEAF3] p-3 text-sm outline-none focus:border-[#75BDEB]"
          />
        </div>

        <InputField
          id="cons-outcome"
          label="Kết quả buổi tư vấn *"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="VD: Khách đồng ý làm bài test đầu vào / Hẹn tối mai chốt lớp..."
        />

        <InputField
          id="cons-note"
          label="Ghi chú bổ sung"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  )
}

export function ScheduleFollowUpModal({
  open,
  lead,
  defaultDateYmd,
  onClose,
}: {
  open: boolean
  lead: SalesLeadDto | null
  defaultDateYmd: string
  onClose: () => void
}) {
  const { notify } = useToast()
  const { createFollowUp } = useSalesLeadMutations()

  const [dueAt, setDueAt] = useState(`${defaultDateYmd}T19:00`)
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  if (!lead) return null

  const handleSave = () => {
    setErrorMsg(null)
    createFollowUp.mutate(
      {
        leadId: lead.id,
        dueAt,
        note,
      },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: 'Đã đặt lịch liên hệ lại',
            description: `Đã thêm lịch hẹn gọi lại cho ${lead.fullName}.`,
          })
          setNote('')
          handleClose()
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Không thể đặt lịch liên hệ.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title={`Đặt lịch liên hệ lại – ${lead.fullName}`}
      onClose={handleClose}
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} loading={createFollowUp.isPending}>
            Lưu lịch hẹn
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {errorMsg && (
          <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3 text-xs font-semibold text-[#B93A2E]">
            {errorMsg}
          </div>
        )}

        <InputField
          id="fup-due"
          label="Thời điểm liên hệ lại *"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />

        <div>
          <label
            htmlFor="fup-note"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
          >
            Nội dung cần trao đổi khi gọi lại *
          </label>
          <textarea
            id="fup-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Hỏi kết quả xếp lịch học ở trường và chốt lớp khai giảng..."
            className="w-full rounded-xl border border-[#DCEAF3] p-3 text-sm outline-none focus:border-[#75BDEB]"
          />
        </div>
      </div>
    </Modal>
  )
}
