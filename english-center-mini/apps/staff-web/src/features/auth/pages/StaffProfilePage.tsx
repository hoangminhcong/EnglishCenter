import { useState, type SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCheck,
  UserCog,
} from 'lucide-react'
import {
  Badge,
  Button,
  ErrorBlock,
  InputField,
  LoadingBlock,
} from '@english-center/ui'
import { formatDateTimeVi } from '@english-center/utils'
import { evaluatePasswordPolicy } from '@/config/passwordPolicy'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { authService } from '@/features/auth/services/authService'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  ACCESS_SCOPE_LABELS,
  PERMISSION_CATALOG,
  STAFF_ROLE_LABELS,
} from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'
import { getInitials } from '@/shared/utils/staffFormatters'

export function StaffProfilePage() {
  useDocumentTitle('Thông tin tài khoản & Đổi mật khẩu')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'password' ? 'password' : 'info'

  const { session, user, updateOwnProfile, changeOwnPassword } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  // State cho biểu mẫu cập nhật SĐT liên hệ cá nhân
  const [editedPhone, setEditedPhone] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showAllPermissions, setShowAllPermissions] = useState(false)

  // State cho biểu mẫu đổi mật khẩu cá nhân
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const profileQueryKey = ['staff', 'auth', 'my-profile', session?.user.id ?? 'guest'] as const

  const {
    data: bundle,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => authService.getMyProfileBundle(),
    enabled: Boolean(session?.user.id),
  })

  const switchTab = (nextTab: 'info' | 'password') => {
    setProfileError(null)
    setPasswordError(null)
    if (nextTab === 'password') {
      setSearchParams({ tab: 'password' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const updateProfileMutation = useMutation({
    mutationFn: (phoneValue: string) => updateOwnProfile({ phone: phoneValue }),
    onSuccess: (updatedBundle) => {
      setEditedPhone(null)
      setProfileError(null)
      queryClient.setQueryData(profileQueryKey, updatedBundle)
      notify({
        tone: 'success',
        title: 'Đã cập nhật thông tin liên hệ',
        description: `Số điện thoại liên hệ mới (${updatedBundle.employee.phone}) đã được lưu.`,
      })
    },
    onError: (err) => {
      setProfileError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin cá nhân.')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      changeOwnPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
      setPasswordSuccess(
        'Mật khẩu mới đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.',
      )
      void queryClient.invalidateQueries({ queryKey: profileQueryKey })
      notify({
        tone: 'success',
        title: 'Đổi mật khẩu thành công',
        description: 'Mật khẩu bảo mật của tài khoản nhân sự đã được cập nhật.',
      })
    },
    onError: (err) => {
      setPasswordSuccess(null)
      setPasswordError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.')
    },
  })

  if (isLoading) {
    return <LoadingBlock label="Đang tải thông tin tài khoản và hồ sơ nhân sự..." />
  }

  if (error || !bundle || !session || !user) {
    return (
      <ErrorBlock
        message="Không thể tải thông tin tài khoản hiện tại."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const { account, employee } = bundle
  const displayedPhone = editedPhone ?? employee.phone
  const isPhoneChanged = displayedPhone.trim() !== employee.phone.trim()
  const passwordEval = evaluatePasswordPolicy(newPassword)

  const handleProfileSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileError(null)
    updateProfileMutation.mutate(displayedPhone)
  }

  const handlePasswordSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    changePasswordMutation.mutate()
  }

  const grantedPermissionDetails = PERMISSION_CATALOG.filter((item) =>
    session.permissions.includes(item.code),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông tin tài khoản & Đổi mật khẩu"
        description="Quản lý thông tin liên hệ cá nhân và bảo mật tài khoản."
        badge={
          <Badge tone="info">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {STAFF_ROLE_LABELS[session.role]}
          </Badge>
        }
      />

      {/* Thẻ nhận diện tổng quan nhân sự */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2878B8] to-[#1B5583] text-lg font-black text-white shadow-xs">
            {getInitials(employee.fullName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-lg font-extrabold text-[#243B53]">{employee.fullName}</h2>
              <Badge tone="success">ACTIVE</Badge>
              <span className="rounded-lg bg-[#EAF6FD] px-2.5 py-0.5 text-xs font-bold text-[#2878B8]">
                {employee.employeeCode}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              @{account.username} • {employee.jobTitle ?? STAFF_ROLE_LABELS[session.role]} •{' '}
              {employee.departmentName} • {employee.branchName}
            </p>
          </div>
        </div>

        {/* Thanh chuyển Tab */}
        <div className="inline-flex flex-wrap rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => switchTab('info')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${
              activeTab === 'info'
                ? 'bg-white text-[#2878B8] shadow-2xs'
                : 'text-[#64748B] hover:text-[#243B53]'
            }`}
          >
            <UserCog className="h-3.5 w-3.5" />
            <span>Thông tin tài khoản</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('password')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${
              activeTab === 'password'
                ? 'bg-white text-[#2878B8] shadow-2xs'
                : 'text-[#64748B] hover:text-[#243B53]'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Cột trái: Tài khoản đăng nhập & Vai trò cố định */}
          <div className="space-y-6 lg:col-span-5">
            <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EEF4F8] pb-3">
                <UserCheck className="h-4 w-4 text-[#2878B8]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#243B53]">
                  1. Tài khoản đăng nhập
                </h3>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2.5">
                  <dt className="text-xs font-semibold text-[#64748B]">Tên đăng nhập</dt>
                  <dd className="font-bold text-[#243B53]">@{account.username}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2.5">
                  <dt className="text-xs font-semibold text-[#64748B]">Email đăng nhập</dt>
                  <dd className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[#243B53]">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#2878B8]" />
                    <span className="break-all">{account.email}</span>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2.5">
                  <dt className="text-xs font-semibold text-[#64748B]">Đăng nhập gần nhất</dt>
                  <dd className="text-xs font-medium text-[#243B53]">
                    {account.lastLoginAt ? formatDateTimeVi(account.lastLoginAt) : 'Phiên đầu tiên'}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-xs font-semibold text-[#64748B]">Ngày cấp tài khoản</dt>
                  <dd className="text-xs font-medium text-[#243B53]">
                    {formatDateTimeVi(account.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EEF4F8] pb-3">
                <ShieldCheck className="h-4 w-4 text-[#2878B8]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#243B53]">
                  2. Vai trò & Phạm vi quyền
                </h3>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-xl border border-[#DCEAF3] bg-[#F5FAFE] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Vai trò hệ thống
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-[#2878B8]">
                    {STAFF_ROLE_LABELS[session.role]}
                  </p>
                </div>

                <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Phạm vi dữ liệu
                  </span>
                  <p className="mt-1 font-semibold text-[#243B53]">
                    {ACCESS_SCOPE_LABELS[user.scopeType]}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="min-w-0 font-semibold text-[#64748B]">
                    Quyền nghiệp vụ hiệu lực: <strong>{grantedPermissionDetails.length}</strong> mã
                    quyền
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllPermissions((prev) => !prev)}
                    className="inline-flex items-center gap-1 font-bold text-[#2878B8] hover:underline"
                  >
                    <span>{showAllPermissions ? 'Thu gọn danh sách' : 'Xem chi tiết quyền'}</span>
                    {showAllPermissions ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {showAllPermissions && (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3">
                    {grantedPermissionDetails.map((perm) => (
                      <div
                        key={perm.code}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-2xs"
                      >
                        <span className="min-w-0 font-medium text-[#243B53]">{perm.label}</span>
                        <code className="shrink-0 font-bold text-[#2878B8]">{perm.code}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Cột phải: Hồ sơ nhân sự / Giảng viên & Cập nhật SĐT */}
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EEF4F8] pb-3">
                <Building2 className="h-4 w-4 text-[#2878B8]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#243B53]">
                  3. Hồ sơ nhân sự
                </h3>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Mã nhân sự
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-[#243B53]">
                    {employee.employeeCode}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Loại hồ sơ
                  </span>
                  <p className="mt-1 text-sm font-bold text-[#243B53]">
                    {employee.profileType === 'TEACHER' ? 'Giảng viên' : 'Nhân viên vận hành'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Họ và tên đầy đủ
                  </span>
                  <p className="mt-1 text-sm font-bold text-[#243B53]">{employee.fullName}</p>
                </div>
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Chức danh công tác
                  </span>
                  <p className="mt-1 text-sm font-bold text-[#243B53]">
                    {employee.jobTitle ?? STAFF_ROLE_LABELS[session.role]}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Cơ sở làm việc chính
                  </span>
                  <p className="mt-1 text-sm font-bold text-[#243B53]">{employee.branchName}</p>
                </div>
                <div className="rounded-xl border border-[#EEF4F8] bg-[#F8FBFD] p-3">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">
                    Phòng ban / Tổ chuyên môn
                  </span>
                  <p className="mt-1 text-sm font-bold text-[#243B53]">
                    {employee.departmentName}
                  </p>
                </div>
              </div>

              {employee.profileType === 'TEACHER' && (
                <div className="mt-4 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] p-4 text-xs">
                  <p className="font-extrabold uppercase tracking-wide text-[#2878B8]">
                    Thông tin chuyên môn Giảng viên TOEIC
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-[#64748B]">Điểm TOEIC xác minh:</span>{' '}
                      <strong className="text-[#243B53]">
                        {employee.verifiedToeicScore !== undefined
                          ? `${employee.verifiedToeicScore}/990`
                          : 'Chưa cập nhật'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Lớp đang phụ trách:</span>{' '}
                      <strong className="text-[#2878B8]">
                        {employee.assignedClassCodes && employee.assignedClassCodes.length > 0
                          ? employee.assignedClassCodes.join(', ')
                          : 'Chưa phân công'}
                      </strong>
                    </div>
                  </div>
                  {employee.specializations && employee.specializations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {employee.specializations.map((spec) => (
                        <Badge key={spec} tone="info">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Cập nhật thông tin liên hệ cá nhân */}
            <section className="rounded-2xl border border-[#DCEAF3] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EEF4F8] pb-3">
                <Phone className="h-4 w-4 text-[#2878B8]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#243B53]">
                  4. Cập nhật thông tin liên hệ cá nhân
                </h3>
              </div>

              <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
                {profileError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#F5C2C7] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]"
                  >
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    id="own-profile-phone"
                    label="Số điện thoại liên hệ *"
                    placeholder="VD: 0901234567"
                    value={displayedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    required
                  />
                  <InputField
                    id="own-profile-email-readonly"
                    label="Email công vụ (Chỉ đọc)"
                    value={employee.email}
                    disabled
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-[#64748B]">
                    Nếu cần điều chỉnh Họ tên, Cơ sở hoặc Phòng ban, vui lòng liên hệ bộ phận Quản
                    trị / Nhân sự.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => switchTab('password')}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Sang Đổi mật khẩu</span>
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!isPhoneChanged}
                      loading={updateProfileMutation.isPending}
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Lưu số điện thoại</span>
                    </Button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-2xs">
          <div className="border-b border-[#EEF4F8] pb-4">
            <h3 className="text-base font-extrabold text-[#243B53]">
              Đổi mật khẩu tài khoản nhân sự (@{account.username})
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Vui lòng xác minh mật khẩu hiện tại và đặt mật khẩu mới đáp ứng tiêu chuẩn bảo mật nội
              bộ của English Center.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
            {passwordError && (
              <div
                role="alert"
                className="rounded-xl border border-[#F5C2C7] bg-[#FDECE9] px-4 py-3 text-xs font-semibold text-[#B93A2E]"
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs font-semibold text-[#1F7A4C]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="relative">
              <InputField
                id="staff-current-pwd"
                type={showCurrentPwd ? 'text' : 'password'}
                label="Mật khẩu hiện tại *"
                placeholder="Nhập mật khẩu bạn đang sử dụng"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPwd((p) => !p)}
                aria-label={showCurrentPwd ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                className="absolute top-8 right-3 text-[#64748B] hover:text-[#2878B8]"
              >
                {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <InputField
                id="staff-new-pwd"
                type={showNewPwd ? 'text' : 'password'}
                label="Mật khẩu mới *"
                placeholder="Tối thiểu 8 ký tự gồm chữ Hoa, chữ thường, số và ký tự đặc biệt"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPwd((p) => !p)}
                aria-label={showNewPwd ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                className="absolute top-8 right-3 text-[#64748B] hover:text-[#2878B8]"
              >
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Thanh đánh giá tiêu chuẩn mật khẩu */}
            <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#64748B]">Độ mạnh mật khẩu mới:</span>
                <strong className="text-[#2878B8]">{passwordEval.strengthLabel}</strong>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passwordEval.score >= step ? 'bg-[#1F7A4C]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                ))}
              </div>
              <ul className="mt-2.5 grid grid-cols-1 gap-1 text-[11px] text-[#475569] sm:grid-cols-2">
                <li className={passwordEval.checks.minLength ? 'font-bold text-[#1F7A4C]' : ''}>
                  • Tối thiểu 8 ký tự
                </li>
                <li className={passwordEval.checks.uppercase ? 'font-bold text-[#1F7A4C]' : ''}>
                  • Có ít nhất 1 chữ in hoa (A–Z)
                </li>
                <li className={passwordEval.checks.lowercase ? 'font-bold text-[#1F7A4C]' : ''}>
                  • Có ít nhất 1 chữ thường (a–z)
                </li>
                <li className={passwordEval.checks.digit ? 'font-bold text-[#1F7A4C]' : ''}>
                  • Có ít nhất 1 chữ số (0–9)
                </li>
                <li
                  className={`sm:col-span-2 ${
                    passwordEval.checks.special ? 'font-bold text-[#1F7A4C]' : ''
                  }`}
                >
                  • Có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
                </li>
              </ul>
            </div>

            <div className="relative">
              <InputField
                id="staff-confirm-pwd"
                type={showConfirmPwd ? 'text' : 'password'}
                label="Xác nhận mật khẩu mới *"
                placeholder="Nhập lại chính xác mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd((p) => !p)}
                aria-label={showConfirmPwd ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                className="absolute top-8 right-3 text-[#64748B] hover:text-[#2878B8]"
              >
                {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError(null)
                  setPasswordSuccess(null)
                }}
              >
                Nhập lại
              </Button>
              <Button type="submit" loading={changePasswordMutation.isPending}>
                <KeyRound className="h-4 w-4" />
                <span>Cập nhật mật khẩu mới</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
