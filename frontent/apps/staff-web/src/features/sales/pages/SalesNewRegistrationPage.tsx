import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Save,
  Send,
  XCircle,
} from 'lucide-react'
import {
  computeRemainingClassSeats,
  isClassOpenForRegistration,
  type CourseRegistrationDto,
} from '@english-center/contracts'
import {
  Badge,
  Button,
  EmptyBlock,
  ErrorBlock,
  InputField,
  LoadingBlock,
  SelectField,
} from '@english-center/ui'
import { formatDate, formatVnd, matchText } from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { ForbiddenPage } from '@/components/StaffSystemPages'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import { calculateNetTuition } from '@/features/tuition/api/tuitionApi'
import {
  useAccessibleSalesLeads,
  useSalesLeadMutations,
  useSalesReferenceCatalogs,
  useSalesRegistrationDetail,
  useSalesRegistrationsList,
} from '@/features/sales/hooks/useSalesCrm'
import { evaluatePreRegistrationChecks } from '@/features/sales/services/salesApi'
import {
  CLASS_RECRUITMENT_STATUS_META,
  LEAD_STATUS_META,
  REGISTRATION_STATUS_META,
} from '@/features/sales/types/sales.types'
import { StaffApiClientError } from '@/services/api/httpClient'
import { hasPermission } from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/feedback/ConfirmDialog'
import { useToast } from '@/shared/feedback/useToast'
import { useCurrentTime } from '@/shared/time/useCurrentTime'

const STEP_TITLES = [
  { step: 1, label: '1. Khách hàng' },
  { step: 2, label: '2. Khóa, Cơ sở & Lớp' },
  { step: 3, label: '3. Mục tiêu điểm' },
  { step: 4, label: '4. Cam kết tư vấn' },
  { step: 5, label: '5. Học phí dự kiến' },
  { step: 6, label: '6. Xác nhận hồ sơ' },
] as const

export function SalesNewRegistrationPage() {
  useDocumentTitle('Đăng ký khóa học – Sales CRM')
  const { session } = useStaffAuth()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId') ?? ''
  const isEditing = Boolean(editId)

  const canCreateReg = hasPermission(session, 'sales.registrations.create')
  const canUpdateReg = hasPermission(session, 'sales.registrations.update')

  const catalogs = useSalesReferenceCatalogs()
  const leadsQuery = useAccessibleSalesLeads()
  const regsQuery = useSalesRegistrationsList()
  const editDetailQuery = useSalesRegistrationDetail(editId)

  if (isEditing && !canUpdateReg) {
    return <ForbiddenPage />
  }
  if (!isEditing && !canCreateReg) {
    return <ForbiddenPage />
  }

  if (
    catalogs.isLoadingCatalogs ||
    leadsQuery.isLoading ||
    regsQuery.isLoading ||
    (isEditing && editDetailQuery.isLoading)
  ) {
    return <LoadingBlock label="Đang chuẩn bị dữ liệu biểu mẫu đăng ký khóa học..." />
  }

  if (isEditing) {
    if (
      editDetailQuery.error instanceof StaffApiClientError &&
      editDetailQuery.error.status === 403
    ) {
      return <ForbiddenPage />
    }
    if (editDetailQuery.error || !editDetailQuery.data?.registration) {
      return (
        <ErrorBlock
          message={
            editDetailQuery.error instanceof Error
              ? editDetailQuery.error.message
              : 'Không tìm thấy hồ sơ đăng ký cần chỉnh sửa.'
          }
          onRetry={() => {
            void editDetailQuery.refetch()
          }}
        />
      )
    }
  }

  const initialReg = isEditing ? editDetailQuery.data?.registration : undefined

  return (
    <RegistrationStepperWorkspace
      key={initialReg?.id ?? 'new-reg'}
      initialRegistration={initialReg}
      defaultLeadId={searchParams.get('leadId') ?? ''}
      defaultCourseId={searchParams.get('courseId') ?? ''}
      defaultBranchId={searchParams.get('branchId') ?? ''}
      defaultClassId={searchParams.get('classId') ?? ''}
      accessibleLeads={leadsQuery.data ?? []}
      existingRegistrations={regsQuery.data ?? []}
      catalogs={catalogs}
    />
  )
}

function RegistrationStepperWorkspace({
  initialRegistration,
  defaultLeadId,
  defaultCourseId,
  defaultBranchId,
  defaultClassId,
  accessibleLeads,
  existingRegistrations,
  catalogs,
}: {
  initialRegistration?: CourseRegistrationDto
  defaultLeadId: string
  defaultCourseId: string
  defaultBranchId: string
  defaultClassId: string
  accessibleLeads: ReturnType<typeof useAccessibleSalesLeads>['data'] & object
  existingRegistrations: readonly CourseRegistrationDto[]
  catalogs: ReturnType<typeof useSalesReferenceCatalogs>
}) {
  const { session } = useStaffAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { todayYmdVn } = useCurrentTime()
  const { saveOrSubmitRegistration } = useSalesLeadMutations()

  const canViewClasses = hasPermission(session, 'sales.classes.view')
  const requiredWritePermission = initialRegistration
    ? 'sales.registrations.update'
    : 'sales.registrations.create'

  const { courses, branches, classes, tuitionPolicies, milestones, scales } = catalogs
  const activeScale = scales.find((s) => s.status === 'active') ?? scales[0]

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isDirty, setIsDirty] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  // Step 1 state
  const [leadSearch, setLeadSearch] = useState('')
  const [leadId, setLeadId] = useState(initialRegistration?.leadId ?? defaultLeadId)

  // Step 2 state (Khóa học -> Cơ sở -> Lớp cụ thể)
  const [courseId, setCourseId] = useState(
    initialRegistration?.courseId ?? defaultCourseId,
  )
  const [branchId, setBranchId] = useState(
    initialRegistration?.branchId ?? defaultBranchId,
  )
  const [classId, setClassId] = useState(initialRegistration?.classId ?? defaultClassId)

  // Step 3 state (Mục tiêu điểm từ Cấu hình TOEIC)
  const [currentScoreText, setCurrentScoreText] = useState(
    initialRegistration?.scoreGoal.currentScore !== undefined
      ? String(initialRegistration.scoreGoal.currentScore)
      : '',
  )
  const [targetScore, setTargetScore] = useState<number>(
    initialRegistration?.scoreGoal.targetScore ?? 500,
  )

  // Step 4 state (Cam kết tư vấn)
  const [attendanceConditions, setAttendanceConditions] = useState(
    initialRegistration?.commitment.attendanceAndHomeworkConditions ??
      'Tham gia tối thiểu 90% số buổi học trên lớp và hoàn thành đầy đủ bài tập Giảng viên giao theo tuần.',
  )
  const [consultationNote, setConsultationNote] = useState(
    initialRegistration?.commitment.consultationNote ?? '',
  )
  const [customerConfirmedInfo, setCustomerConfirmedInfo] = useState(
    initialRegistration?.commitment.customerConfirmedInfo ?? false,
  )

  // Step 5 state (Áp dụng quy tắc ưu đãi có thật từ TuitionPolicy)
  const [applyPolicyDiscount, setApplyPolicyDiscount] = useState(
    initialRegistration ? initialRegistration.estimatedTuition.discountAmountVnd > 0 : true,
  )
  const [submitNote, setSubmitNote] = useState('')
  const [stepError, setStepError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const selectedLead = useMemo(
    () => accessibleLeads.find((l) => l.id === leadId),
    [accessibleLeads, leadId],
  )
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId && c.status === 'active'),
    [courses, courseId],
  )
  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === branchId && b.isActive),
    [branches, branchId],
  )
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId],
  )
  const linkedMilestone = useMemo(
    () => milestones.find((m) => m.id === selectedCourse?.milestoneId),
    [milestones, selectedCourse],
  )

  const matchingClasses = useMemo(() => {
    if (!courseId || !branchId) return []
    return classes.filter((cls) => cls.courseId === courseId && cls.branchId === branchId)
  }, [classes, courseId, branchId])

  const existingRegsOfLead = useMemo(
    () => existingRegistrations.filter((r) => r.leadId === leadId),
    [existingRegistrations, leadId],
  )

  const preCheck = useMemo(
    () =>
      evaluatePreRegistrationChecks({
        lead: selectedLead,
        courseExists: Boolean(selectedCourse),
        branchExists: Boolean(selectedBranch),
        selectedClass,
        courseId,
        branchId,
        existingLeadRegistrations: existingRegsOfLead,
        allClasses: classes,
        excludeRegistrationId: initialRegistration?.id,
        todayYmdVn,
      }),
    [
      selectedLead,
      selectedCourse,
      selectedBranch,
      selectedClass,
      courseId,
      branchId,
      existingRegsOfLead,
      classes,
      initialRegistration?.id,
      todayYmdVn,
    ],
  )

  const activePolicy = useMemo(
    () => tuitionPolicies.find((p) => p.courseId === courseId && p.status === 'active'),
    [tuitionPolicies, courseId],
  )

  const estimatedTuition = useMemo(() => {
    const listedVnd = activePolicy?.listedTuitionVnd ?? selectedCourse?.listedTuitionVnd ?? 0
    if (listedVnd <= 0 && !activePolicy) {
      return {
        hasPricingData: false,
        listedTuitionVnd: 0,
        discountAmountVnd: 0,
        netEstimatedTuitionVnd: 0,
      }
    }

    const hasDiscountRule =
      Boolean(activePolicy) &&
      ((activePolicy?.discountPercent ?? 0) > 0 || (activePolicy?.discountFixedVnd ?? 0) > 0)

    const netVnd =
      hasDiscountRule && applyPolicyDiscount && activePolicy
        ? calculateNetTuition(
            listedVnd,
            activePolicy.discountPercent,
            activePolicy.discountFixedVnd,
          )
        : listedVnd

    return {
      policyId: activePolicy?.id,
      policyCode: activePolicy?.policyCode,
      hasPricingData: true,
      listedTuitionVnd: listedVnd,
      discountProgramName:
        hasDiscountRule && applyPolicyDiscount ? activePolicy?.discountProgramName : undefined,
      discountAmountVnd: Math.max(0, listedVnd - netVnd),
      netEstimatedTuitionVnd: netVnd,
    }
  }, [activePolicy, selectedCourse, applyPolicyDiscount])

  const filteredLeadPicker = useMemo(() => {
    return accessibleLeads.filter((l) => {
      if (!leadSearch.trim()) return true
      return (
        matchText(l.fullName, leadSearch) ||
        matchText(l.phone, leadSearch) ||
        matchText(l.email ?? '', leadSearch)
      )
    })
  }, [accessibleLeads, leadSearch])

  const minScaleScore = activeScale?.totalMin ?? 10
  const maxScaleScore = activeScale?.totalMax ?? 990

  const validateCurrentStep = (step: number): string | null => {
    if (step === 1 && !selectedLead) {
      return 'Vui lòng chọn một khách hàng tiềm năng (Lead) trong danh sách CRM.'
    }
    if (step === 2) {
      if (!canViewClasses) {
        return 'Tài khoản của bạn không có quyền xem danh sách lớp tuyển sinh.'
      }
      if (!selectedCourse || !selectedBranch || !selectedClass) {
        return 'Vui lòng chọn đầy đủ Khóa học, Cơ sở và một Lớp cụ thể đang nhận đăng ký.'
      }
      if (preCheck.blockingErrors.length > 0) {
        return preCheck.blockingErrors[0]!
      }
    }
    if (step === 3) {
      if (targetScore < minScaleScore || targetScore > maxScaleScore) {
        return `Điểm mục tiêu phải nằm trong khoảng hợp lệ ${minScaleScore}–${maxScaleScore}.`
      }
      if (currentScoreText.trim()) {
        const parsedCur = Number(currentScoreText)
        if (!Number.isFinite(parsedCur) || parsedCur < 0 || parsedCur > maxScaleScore) {
          return `Điểm hiện tại phải nằm trong khoảng 0–${maxScaleScore}.`
        }
      }
    }
    if (step === 4 && !customerConfirmedInfo) {
      return 'Vui lòng đánh dấu xác nhận đã tư vấn rõ lộ trình & điều kiện học tập cho khách hàng.'
    }
    return null
  }

  const handleJumpToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setStepError(null)
      setCurrentStep(targetStep)
      return
    }
    for (let stepNum = 1; stepNum < targetStep; stepNum += 1) {
      const err = validateCurrentStep(stepNum)
      if (err) {
        setCurrentStep(stepNum)
        setStepError(err)
        return
      }
    }
    setStepError(null)
    setCurrentStep(targetStep)
  }

  const handleNextStep = () => {
    const err = validateCurrentStep(currentStep)
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    setCurrentStep((s) => Math.min(6, s + 1))
  }

  const handleSave = (mode: 'draft' | 'submit') => {
    setStepError(null)
    const parsedCur = currentScoreText.trim() ? Number(currentScoreText) : undefined

    saveOrSubmitRegistration.mutate(
      {
        registrationId: initialRegistration?.id,
        mode,
        leadId,
        courseId,
        branchId,
        classId,
        scoreGoal: {
          skillCategory: 'listening_reading',
          currentScore: parsedCur,
          targetScore,
          milestoneId: linkedMilestone?.id,
          scaleVersionCode: activeScale?.versionCode ?? 'TEMP-UNCONFIGURED-SCALE',
        },
        commitment: {
          advisedOutcomeLabel:
            linkedMilestone?.label ?? selectedCourse?.targetScoreLabel ?? 'Theo lộ trình khóa',
          attendanceAndHomeworkConditions: attendanceConditions,
          consultationNote,
          customerConfirmedInfo,
        },
        estimatedTuition,
        submitNote,
      },
      {
        onSuccess: (saved) => {
          setIsDirty(false)
          notify({
            tone: 'success',
            title:
              mode === 'submit'
                ? `Đã nộp hồ sơ đăng ký ${saved.registrationCode}`
                : `Đã lưu nháp hồ sơ ${saved.registrationCode}`,
            description:
              mode === 'submit'
                ? `Hồ sơ lớp ${saved.snapshot.classCode} đã chuyển sang chờ xét duyệt.`
                : 'Bạn có thể quay lại hoàn thiện và nộp hồ sơ bất cứ lúc nào.',
          })
          navigate(`/sales/registrations/${saved.id}`)
        },
        onError: (err) => {
          setStepError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ đăng ký.')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (isDirty) setLeaveConfirmOpen(true)
            else navigate('/sales/registrations')
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2878B8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về Danh sách hồ sơ đăng ký</span>
        </button>
      </div>

      <PageHeader
        title={
          initialRegistration
            ? `Cập nhật hồ sơ ${initialRegistration.registrationCode}`
            : 'Đăng ký khóa học'
        }
        description="Chọn khách hàng, khóa học, cơ sở và lớp đang mở tuyển sinh."
        badge={
          initialRegistration ? (
            <Badge tone={REGISTRATION_STATUS_META[initialRegistration.status].tone}>
              {REGISTRATION_STATUS_META[initialRegistration.status].label}
            </Badge>
          ) : (
            <Badge tone="info">Hồ sơ mới</Badge>
          )
        }
        actions={
          <ActionGuard permission={requiredWritePermission}>
            <Button
              variant="secondary"
              loading={saveOrSubmitRegistration.isPending}
              onClick={() => handleSave('draft')}
            >
              <Save className="h-4 w-4" />
              <span>Lưu nháp</span>
            </Button>
          </ActionGuard>
        }
      />

      {/* Stepper Navigation Responsive */}
      <nav
        aria-label="Tiến trình đăng ký khóa học"
        className="grid grid-cols-1 gap-2 rounded-2xl border border-[#DCEAF3] bg-white p-3 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      >
        {STEP_TITLES.map((item) => {
          const active = item.step === currentStep
          const completed = item.step < currentStep
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => handleJumpToStep(item.step)}
              className={`min-w-0 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                active
                  ? 'bg-[#2878B8] text-white shadow-2xs'
                  : completed
                    ? 'bg-[#E3F5EC] text-[#1F7A4C]'
                    : 'bg-[#F8FBFD] text-[#64748B] hover:bg-[#EAF6FD]'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {stepError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3.5 text-xs font-semibold text-[#B93A2E]"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Nội dung từng Bước */}
      <div className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
        {/* BƯỚC 1: CHỌN & KIỂM TRA KHÁCH HÀNG */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 1: Chọn khách hàng tư vấn
              </h2>
              <p className="text-xs text-[#64748B]">
                Chọn khách hàng tiềm năng đã có trong danh sách tư vấn.
              </p>
            </div>

            <InputField
              id="reg-lead-search"
              label="Tìm khách hàng theo tên, SĐT hoặc email"
              placeholder="Nhập tên hoặc số điện thoại 0900..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
            />

            {filteredLeadPicker.length === 0 ? (
              <EmptyBlock
                title="Không tìm thấy khách hàng phù hợp"
                description="Nếu là khách mới hoàn toàn, hãy thêm khách hàng tại Sales Dashboard trước."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {filteredLeadPicker.map((item) => {
                  const picked = item.id === leadId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLeadId(item.id)
                        setIsDirty(true)
                        if (!courseId && item.interestedCourseIds[0]) {
                          setCourseId(item.interestedCourseIds[0])
                        }
                        if (!branchId && item.preferredBranchId) {
                          setBranchId(item.preferredBranchId)
                        }
                        if (!classId && item.interestedClassId) {
                          setClassId(item.interestedClassId)
                        }
                      }}
                      className={`min-w-0 rounded-xl border p-3.5 text-left transition ${
                        picked
                          ? 'border-2 border-[#2878B8] bg-[#EAF6FD]/70'
                          : 'border-[#DCEAF3] bg-[#F8FBFD] hover:border-[#75BDEB]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="min-w-0 text-sm font-extrabold text-[#243B53]">
                          {item.fullName}
                        </span>
                        <Badge tone={LEAD_STATUS_META[item.status].tone}>
                          {LEAD_STATUS_META[item.status].label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#475569]">
                        SĐT: {item.phone} {item.email ? `• ${item.email}` : ''}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-[#64748B]">
                        {item.learningNeed}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedLead && existingRegsOfLead.length > 0 && (
              <div className="rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3.5 text-xs text-[#243B53]">
                <strong>Hồ sơ đăng ký hiện có của {selectedLead.fullName}:</strong>{' '}
                {existingRegsOfLead
                  .map(
                    (r) =>
                      `${r.registrationCode} (Lớp ${r.snapshot.classCode} – ${REGISTRATION_STATUS_META[r.status].label})`,
                  )
                  .join('; ')}
              </div>
            )}
          </div>
        )}

        {/* BƯỚC 2: CHỌN KHÓA HỌC -> CƠ SỞ -> LỚP CỤ THỂ & KIỂM TRA LỊCH/SĨ SỐ */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 2: Chọn Khóa học → Chọn Cơ sở → Chọn Lớp cụ thể đang nhận đăng ký
              </h2>
              <p className="text-xs text-[#64748B]">
                Hệ thống tự động kiểm tra trạng thái nhận đăng ký, hạn đăng ký, sức chứa còn lại và
                xung đột lịch học.
              </p>
            </div>

            {!canViewClasses ? (
              <EmptyBlock title="Bạn không có quyền xem danh sách lớp tuyển sinh" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <SelectField
                    id="reg-course"
                    label="1. Chọn Khóa học *"
                    value={courseId}
                    placeholder="-- Chọn khóa học --"
                    onChange={(e) => {
                      const nextCourseId = e.target.value
                      setCourseId(nextCourseId)
                      setClassId('')
                      setIsDirty(true)
                      const ms = milestones.find(
                        (m) => m.id === courses.find((c) => c.id === nextCourseId)?.milestoneId,
                      )
                      if (ms) setTargetScore(ms.minScore)
                    }}
                    options={courses
                      .filter((c) => c.status === 'active')
                      .map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.targetScoreLabel})`,
                      }))}
                  />

                  <SelectField
                    id="reg-branch"
                    label="2. Chọn Cơ sở đào tạo *"
                    value={branchId}
                    placeholder="-- Chọn cơ sở --"
                    onChange={(e) => {
                      setBranchId(e.target.value)
                      setClassId('')
                      setIsDirty(true)
                    }}
                    options={branches
                      .filter((b) => b.isActive)
                      .map((b) => ({ value: b.id, label: b.name }))}
                  />
                </div>

                {courseId && branchId && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#243B53]">
                      3. Các lớp thuộc Khóa & Cơ sở đã chọn ({matchingClasses.length})
                    </p>

                    {matchingClasses.length === 0 ? (
                      <EmptyBlock
                        title="Chưa có lớp được mở cho tổ hợp Khóa học & Cơ sở này"
                        description="Hãy thử đổi sang cơ sở khác hoặc chọn TOEIC Online."
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {matchingClasses.map((cls) => {
                          const deadlineExpired = Boolean(
                            cls.registrationDeadline && cls.registrationDeadline < todayYmdVn,
                          )
                          const selectable =
                            isClassOpenForRegistration(cls) && !deadlineExpired
                          const remaining = computeRemainingClassSeats(cls)
                          const picked = cls.id === classId
                          const stMeta = CLASS_RECRUITMENT_STATUS_META[cls.status]

                          return (
                            <button
                              key={cls.id}
                              type="button"
                              disabled={!selectable}
                              onClick={() => {
                                setClassId(cls.id)
                                setIsDirty(true)
                              }}
                              className={`min-w-0 rounded-xl border p-4 text-left transition ${
                                picked
                                  ? 'border-2 border-[#2878B8] bg-[#EAF6FD]/80'
                                  : selectable
                                    ? 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                                    : 'cursor-not-allowed border-[#EEF4F8] bg-[#F8FAFC] opacity-60'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-sm font-extrabold text-[#243B53]">
                                    {cls.classCode}
                                  </span>
                                </div>
                                <Badge tone={deadlineExpired ? 'danger' : stMeta.tone}>
                                  {deadlineExpired ? 'Quá hạn đăng ký' : stMeta.label}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-[#475569]">
                                {cls.className}
                              </p>
                              <p className="mt-1 text-xs text-[#243B53]">
                                Lịch: <strong>{cls.studyDays}</strong>
                                {cls.endTime
                                  ? ` (${cls.startTime} – ${cls.endTime})`
                                  : cls.startTime && cls.startTime !== cls.studyDays
                                    ? ` (${cls.startTime})`
                                    : ''}
                              </p>
                              <p className="mt-0.5 text-xs text-[#64748B]">
                                KG: <strong>{cls.startDateDisplay ?? formatDate(cls.startDate)}</strong>
                                {cls.registrationDeadline
                                  ? ` • Hạn ĐK: ${formatDate(cls.registrationDeadline)}`
                                  : ''}{' '}
                                • GV: {cls.teacherName ?? 'Chưa phân công'}
                              </p>
                              <p className="mt-1 text-xs font-bold text-[#1F7A4C]">
                                {remaining === null
                                  ? 'Chưa cấu hình sĩ số tối đa'
                                  : `${cls.enrolledStudents}/${cls.maxStudents} HV • Còn ${remaining} chỗ`}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Khung kết quả kiểm tra lịch & sĩ số */}
                {selectedClass && (
                  <div className="space-y-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4 text-xs">
                    <p className="font-extrabold uppercase text-[#2878B8]">
                      Kết quả kiểm tra điều kiện lớp & xung đột lịch học
                    </p>
                    {preCheck.blockingErrors.length === 0 ? (
                      <p className="inline-flex items-center gap-1.5 font-bold text-[#1F7A4C]">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Lớp {selectedClass.classCode} hợp lệ, đang nhận đăng ký và không trùng
                          lịch.
                        </span>
                      </p>
                    ) : (
                      preCheck.blockingErrors.map((errText) => (
                        <p key={errText} className="font-bold text-[#B93A2E]">
                          • {errText}
                        </p>
                      ))
                    )}
                    {preCheck.warnings.map((warnText) => (
                      <p key={warnText} className="inline-flex items-center gap-1.5 text-[#9E6300]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{warnText}</span>
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BƯỚC 3: MỤC TIÊU ĐIỂM */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 3: Thiết lập Mục tiêu điểm theo Cấu hình TOEIC tập trung
              </h2>
              <p className="text-xs text-[#64748B]">
                Thang điểm tham chiếu trực tiếp từ phiên bản cấu hình đang kích hoạt của Admin.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
              <p>
                <strong>Phiên bản thang điểm áp dụng:</strong>{' '}
                {activeScale ? (
                  <span className="text-[#2878B8]">
                    {activeScale.versionCode} – {activeScale.name} (Khoảng hợp lệ:{' '}
                    {minScaleScore}–{maxScaleScore})
                  </span>
                ) : (
                  <span className="text-[#9E6300]">
                    Chưa có cấu hình thang điểm từ Admin (Đang dùng khoảng tạm 10–990)
                  </span>
                )}
              </p>
              {linkedMilestone && (
                <p className="mt-1">
                  <strong>Mốc chuẩn của khóa đã chọn:</strong> {linkedMilestone.code} –{' '}
                  {linkedMilestone.label} ({linkedMilestone.minScore}–{linkedMilestone.maxScore}{' '}
                  điểm)
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <SelectField
                id="reg-skill-cat"
                label="Loại bài thi mục tiêu"
                value="listening_reading"
                disabled
                options={[
                  {
                    value: 'listening_reading',
                    label: 'TOEIC Listening & Reading (Hệ thống đang hỗ trợ)',
                  },
                ]}
              />

              <InputField
                id="reg-cur-score"
                label={`Điểm đầu vào hiện tại (0–${maxScaleScore}, nếu có)`}
                type="number"
                min={0}
                max={maxScaleScore}
                step={5}
                value={currentScoreText}
                onChange={(e) => {
                  setCurrentScoreText(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="VD: 315"
              />

              <InputField
                id="reg-target-score"
                label={`Điểm mục tiêu cam kết phấn đấu (${minScaleScore}–${maxScaleScore}) *`}
                type="number"
                min={minScaleScore}
                max={maxScaleScore}
                step={5}
                value={targetScore}
                onChange={(e) => {
                  setTargetScore(Number(e.target.value) || minScaleScore)
                  setIsDirty(true)
                }}
              />
            </div>
          </div>
        )}

        {/* BƯỚC 4: THÔNG TIN CAM KẾT TƯ VẤN */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 4: Ghi nhận Thông tin Cam kết & Điều kiện áp dụng
              </h2>
              <p className="text-xs text-[#64748B]">
                Ghi nhận mục tiêu đầu ra và điều kiện chuyên cần đã trao đổi với khách hàng.
              </p>
            </div>

            <InputField
              id="reg-advised-outcome"
              label="Mục tiêu đầu ra được tư vấn"
              disabled
              value={
                linkedMilestone?.label ??
                selectedCourse?.targetScoreLabel ??
                'Theo lộ trình khóa học'
              }
            />

            <div>
              <label
                htmlFor="reg-conditions"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
              >
                Điều kiện chuyên cần & bài tập áp dụng
              </label>
              <textarea
                id="reg-conditions"
                rows={3}
                value={attendanceConditions}
                onChange={(e) => {
                  setAttendanceConditions(e.target.value)
                  setIsDirty(true)
                }}
                className="w-full rounded-xl border border-[#DCEAF3] p-3 text-sm outline-none focus:border-[#75BDEB]"
              />
            </div>

            <InputField
              id="reg-consult-note"
              label="Ghi chú tư vấn riêng cho Giáo vụ xét duyệt"
              value={consultationNote}
              onChange={(e) => {
                setConsultationNote(e.target.value)
                setIsDirty(true)
              }}
              placeholder="VD: Học viên xin bảo lưu 2 buổi thi học kỳ vào cuối tháng 2..."
            />

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-3.5 text-xs font-bold text-[#243B53]">
              <input
                type="checkbox"
                checked={customerConfirmedInfo}
                onChange={(e) => {
                  setCustomerConfirmedInfo(e.target.checked)
                  setIsDirty(true)
                }}
              />
              <span>
                Xác nhận khách hàng đã được tư vấn rõ ràng về lịch học, mục tiêu điểm số và điều
                kiện chuyên cần *
              </span>
            </label>
          </div>
        )}

        {/* BƯỚC 5: HỌC PHÍ DỰ KIẾN */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 5: Đối chiếu Học phí dự kiến
              </h2>
              <p className="text-xs text-[#64748B]">
                Đối chiếu mức học phí niêm yết và chương trình ưu đãi đang áp dụng.
              </p>
            </div>

            {!estimatedTuition.hasPricingData ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-center text-sm font-bold text-[#9E6300]">
                Chưa có dữ liệu học phí
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#64748B]">Học phí niêm yết khóa học:</span>
                  <strong className="tabular-nums">
                    {formatVnd(estimatedTuition.listedTuitionVnd)}
                  </strong>
                </div>

                {activePolicy &&
                  (activePolicy.discountPercent > 0 || activePolicy.discountFixedVnd > 0) && (
                    <div className="rounded-xl border border-[#DCEAF3] bg-white p-3.5 text-xs">
                      <label className="flex cursor-pointer items-center justify-between gap-2 font-bold text-[#243B53]">
                        <span className="min-w-0">
                          Áp dụng quy tắc ưu đãi chính thức:{' '}
                          <span className="text-[#2878B8]">
                            {activePolicy.discountProgramName} ({activePolicy.policyCode})
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={applyPolicyDiscount}
                          onChange={(e) => {
                            setApplyPolicyDiscount(e.target.checked)
                            setIsDirty(true)
                          }}
                        />
                      </label>
                      <p className="mt-1 text-[#64748B]">{activePolicy.applicabilityNote}</p>
                    </div>
                  )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#64748B]">Mức giảm ưu đãi dự kiến:</span>
                  <strong className="tabular-nums text-[#2878B8]">
                    -{formatVnd(estimatedTuition.discountAmountVnd)}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DCEAF3] pt-3 text-base">
                  <span className="font-bold text-[#243B53]">Học phí dự kiến sau ưu đãi:</span>
                  <strong className="text-xl font-black tabular-nums text-[#1F7A4C]">
                    {formatVnd(estimatedTuition.netEstimatedTuitionVnd)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BƯỚC 6: KIỂM TRA LẠI & XÁC NHẬN */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#243B53]">
                Bước 6: Kiểm tra tổng thể trước khi Xác nhận Nộp hồ sơ
              </h2>
              <p className="text-xs text-[#64748B]">
                Kiểm tra lại thông tin khách hàng, lớp học và mức học phí dự kiến trước khi gửi xét
                duyệt.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-4 text-xs sm:grid-cols-2">
              <p>
                <span className="text-[#64748B]">Khách hàng:</span>{' '}
                <strong>
                  {selectedLead?.fullName ?? 'Chưa chọn'} ({selectedLead?.phone ?? '—'})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Khóa học:</span>{' '}
                <strong>{selectedCourse?.name ?? 'Chưa chọn'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Cơ sở đào tạo:</span>{' '}
                <strong>{selectedBranch?.name ?? 'Chưa chọn'}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Lớp cụ thể:</span>{' '}
                <strong className="text-[#2878B8]">
                  {selectedClass
                    ? `${selectedClass.classCode} – KG ${selectedClass.startDateDisplay ?? formatDate(selectedClass.startDate)} (${selectedClass.studyDays})`
                    : 'Chưa chọn'}
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Mục tiêu điểm:</span>{' '}
                <strong>
                  {currentScoreText ? `${currentScoreText} → ` : ''}
                  {targetScore}+ TOEIC ({activeScale?.versionCode ?? 'Tạm'})
                </strong>
              </p>
              <p>
                <span className="text-[#64748B]">Học phí dự kiến:</span>{' '}
                <strong className="text-[#1F7A4C]">
                  {estimatedTuition.hasPricingData
                    ? formatVnd(estimatedTuition.netEstimatedTuitionVnd)
                    : 'Chưa có dữ liệu học phí'}
                </strong>
              </p>
            </div>

            {preCheck.blockingErrors.length > 0 && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] p-3.5 text-xs text-[#B93A2E]">
                <p className="font-extrabold">Chưa thể nộp hồ sơ do lỗi kiểm tra trước đăng ký:</p>
                <ul className="mt-1 list-disc pl-5">
                  {preCheck.blockingErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <InputField
              id="reg-submit-note"
              label="Ghi chú bàn giao hồ sơ (Tùy chọn)"
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              placeholder="Ghi chú gửi bộ phận Giáo vụ xét duyệt..."
            />
          </div>
        )}

        {/* Footer điều hướng Stepper */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#EEF4F8] pt-4">
          <Button
            variant="secondary"
            disabled={currentStep === 1}
            onClick={() => {
              setStepError(null)
              setCurrentStep((s) => Math.max(1, s - 1))
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại bước trước</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {currentStep < 6 ? (
              <Button onClick={handleNextStep}>
                <span>Tiếp tục</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <ActionGuard permission={requiredWritePermission}>
                <Button
                  variant="secondary"
                  loading={saveOrSubmitRegistration.isPending}
                  onClick={() => handleSave('draft')}
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu nháp</span>
                </Button>
                <Button
                  variant="cta"
                  disabled={preCheck.blockingErrors.length > 0 || !customerConfirmedInfo}
                  loading={saveOrSubmitRegistration.isPending}
                  onClick={() => handleSave('submit')}
                >
                  <Send className="h-4 w-4" />
                  <span>Xác nhận & Nộp hồ sơ đăng ký</span>
                </Button>
              </ActionGuard>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Rời khỏi biểu mẫu đang điền?"
        description="Bạn có thông tin đăng ký chưa được lưu. Bạn có thể Lưu nháp để không mất dữ liệu hoặc xác nhận rời trang."
        confirmLabel="Rời trang không lưu"
        variant="danger"
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false)
          navigate('/sales/registrations')
        }}
      />
    </div>
  )
}
