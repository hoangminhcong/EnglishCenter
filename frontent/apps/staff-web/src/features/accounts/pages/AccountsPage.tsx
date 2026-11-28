import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Lock,
  MailCheck,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Unlock,
  UserCheck,
} from 'lucide-react'
import type {
  AccessScopeType,
  AccountProvisioningMethod,
  EmployeeProfileType,
  EmployeeWorkStatus,
  StaffAccountStatus,
  StaffRole,
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
  Modal,
  Pagination,
  SelectField,
} from '@english-center/ui'
import {
  formatDate,
  formatDateTimeVi,
  matchText,
  paginate,
  removeDiacritics,
} from '@english-center/utils'
import { ActionGuard } from '@/app/guards/ActionGuard'
import { DEPARTMENT_CATALOG } from '@/config/departments.config'
import {
  evaluatePasswordPolicy,
  generateStrongTemporaryPassword,
} from '@/config/passwordPolicy'
import { cmsApi } from '@/features/content/api/cmsApi'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'
import {
  accountsApi,
  getDisplayNameForAccount,
  getProfileCodeForAccount,
} from '@/features/accounts/api/accountsApi'
import type {
  AccountActorContext,
  ManagedAccountRecord,
} from '@/features/accounts/types/accounts.types'
import {
  ACCESS_SCOPE_LABELS,
  ROLE_DEFINITIONS,
  STAFF_ROLE_LABELS,
  hasPermission,
} from '@/services/permissions/permissions.config'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/feedback/useToast'

const ACCOUNT_STATUS_META: Record<
  StaffAccountStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
> = {
  ACTIVE: { label: 'ACTIVE (Đang hoạt động)', tone: 'success' },
  PENDING_ACTIVATION: { label: 'PENDING_ACTIVATION (Chờ kích hoạt)', tone: 'info' },
  PASSWORD_RESET_REQUIRED: { label: 'PASSWORD_RESET_REQUIRED (Đổi MK lần đầu)', tone: 'warning' },
  LOCKED: { label: 'LOCKED (Tạm khóa)', tone: 'danger' },
  DISABLED: { label: 'DISABLED (Ngừng hoạt động)', tone: 'neutral' },
}

const WORK_STATUS_LABELS: Record<EmployeeWorkStatus, string> = {
  ACTIVE: 'Đang công tác (ACTIVE)',
  INACTIVE: 'Tạm ngừng công tác (INACTIVE)',
}

function suggestUsernameFromFullName(fullName: string): string {
  const normalized = removeDiacritics(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
  if (!normalized) return ''
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 24)
  const givenName = parts[parts.length - 1] ?? ''
  const familyAndMiddle = parts
    .slice(0, -1)
    .map((p) => p[0] ?? '')
    .join('')
  return `${givenName}.${familyAndMiddle}`.slice(0, 28)
}

interface OneTimePasswordRevealState {
  fullName: string
  username: string
  email: string
  temporaryPassword: string
  title: string
}

export function AccountsPage() {
  useDocumentTitle('Quản lý tài khoản nhân sự')
  const { session, user } = useStaffAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()

  const actor = useMemo<AccountActorContext>(
    () => ({
      userId: user?.id ?? 'anonymous',
      fullName: user?.fullName ?? 'Nhân sự',
      roles: user?.roles ?? [],
      permissions: session?.permissions ?? [],
    }),
    [session?.permissions, user?.fullName, user?.id, user?.roles],
  )

  const canGrantAdmin = hasPermission(session, 'accounts.grant_admin')

  const [activeTab, setActiveTab] = useState<'STAFF' | 'STUDENT' | 'AUDIT'>('STAFF')
  const [search, setSearch] = useState('')
  const [profileTypeFilter, setProfileTypeFilter] = useState<'ALL' | EmployeeProfileType>('ALL')
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | StaffAccountStatus>('ALL')
  const [page, setPage] = useState(1)

  // Modal Tạo tài khoản mới
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [cProfileType, setCProfileType] = useState<EmployeeProfileType>('EMPLOYEE')
  const [cFullName, setCFullName] = useState('')
  const [cEmployeeCode, setCEmployeeCode] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cBranchId, setCBranchId] = useState('')
  const [cDepartmentId, setCDepartmentId] = useState('dept-sales')
  const [cJobTitle, setCJobTitle] = useState('')
  const [cToeicScore, setCToeicScore] = useState('')
  const [cSpecializations, setCSpecializations] = useState('')

  const [cUsername, setCUsername] = useState('')
  const [cUsernameTouched, setCUsernameTouched] = useState(false)
  const [cLoginEmail, setCLoginEmail] = useState('')
  const [cLoginEmailTouched, setCLoginEmailTouched] = useState(false)
  const [cProvisioningMethod, setCProvisioningMethod] =
    useState<AccountProvisioningMethod>('INVITE_LINK')
  const [cTempPassword, setCTempPassword] = useState('')
  const [cConfirmTempPassword, setCConfirmTempPassword] = useState('')
  const [cShowTempPassword, setCShowTempPassword] = useState(false)
  const [cMustChangeFirstLogin, setCMustChangeFirstLogin] = useState(true)

  const [cRole, setCRole] = useState<StaffRole>('SALES')
  const [cScopeType, setCScopeType] = useState<AccessScopeType>('OWN')
  const [cScopeIds, setCScopeIds] = useState<string[]>([])
  const [cInitialStatus, setCInitialStatus] = useState<StaffAccountStatus>('ACTIVE')
  const [cReason, setCReason] = useState('')

  // Modal hiển thị mật khẩu tạm 1 lần duy nhất
  const [oneTimeReveal, setOneTimeReveal] = useState<OneTimePasswordRevealState | null>(null)
  const [copiedOneTime, setCopiedOneTime] = useState(false)

  // Modal Sửa hồ sơ nhân sự
  const [editTarget, setEditTarget] = useState<ManagedAccountRecord | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [eProfileType, setEProfileType] = useState<EmployeeProfileType>('EMPLOYEE')
  const [eFullName, setEFullName] = useState('')
  const [eEmployeeCode, setEEmployeeCode] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [eBranchId, setEBranchId] = useState('')
  const [eDepartmentId, setEDepartmentId] = useState('dept-sales')
  const [eJobTitle, setEJobTitle] = useState('')
  const [eWorkStatus, setEWorkStatus] = useState<EmployeeWorkStatus>('ACTIVE')
  const [eToeicScore, setEToeicScore] = useState('')
  const [eSpecializations, setESpecializations] = useState('')

  // Modal Khóa / Mở khóa / Vô hiệu hóa
  const [statusModalTarget, setStatusModalTarget] = useState<ManagedAccountRecord | null>(null)
  const [statusNextValue, setStatusNextValue] = useState<'ACTIVE' | 'LOCKED' | 'DISABLED'>('LOCKED')
  const [statusReason, setStatusReason] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)

  // Modal Đặt lại mật khẩu
  const [resetModalTarget, setResetModalTarget] = useState<ManagedAccountRecord | null>(null)
  const [resetMode, setResetMode] = useState<'REQUIRE_RESET_ONLY' | 'ISSUE_TEMP_PASSWORD'>(
    'ISSUE_TEMP_PASSWORD',
  )
  const [resetTempPassword, setResetTempPassword] = useState('')
  const [resetShowPassword, setResetShowPassword] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)

  // Modal Xem chi tiết tách biệt
  const [detailTarget, setDetailTarget] = useState<ManagedAccountRecord | null>(null)

  const { data: accounts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['staff', 'accounts'],
    queryFn: () => accountsApi.listAccounts(),
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['staff', 'cms', 'branches'],
    queryFn: () => cmsApi.listBranches(),
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['staff', 'accounts', 'audit-logs'],
    queryFn: () => accountsApi.listAuditLogs(),
  })

  const invalidateAccountsAndRoles = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'accounts'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'roles'] })
    void queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      accountsApi.createStaffUser(actor, {
        profile: {
          profileType: cProfileType,
          fullName: cFullName,
          employeeCode: cEmployeeCode,
          phone: cPhone,
          email: cEmail,
          branchId: cBranchId,
          departmentId: cDepartmentId,
          jobTitle: cJobTitle.trim() || undefined,
          verifiedToeicScore:
            cProfileType === 'TEACHER' && cToeicScore.trim() !== ''
              ? Number(cToeicScore)
              : undefined,
          specializations:
            cProfileType === 'TEACHER'
              ? cSpecializations
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
        },
        account: {
          username: cUsername,
          loginEmail: cLoginEmail || cEmail,
          provisioningMethod: cProvisioningMethod,
          temporaryPassword:
            cProvisioningMethod === 'TEMPORARY_PASSWORD' ? cTempPassword : undefined,
          confirmTemporaryPassword:
            cProvisioningMethod === 'TEMPORARY_PASSWORD' ? cConfirmTempPassword : undefined,
          mustChangePasswordOnFirstLogin: cMustChangeFirstLogin,
          initialStatus: cInitialStatus,
        },
        authorization: {
          role: cRole,
          scopeType: cScopeType,
          scopeIds: cScopeType === 'BRANCH' ? cScopeIds : undefined,
          reason: cReason,
        },
      }),
    onSuccess: (result) => {
      invalidateAccountsAndRoles()
      setCreateOpen(false)
      setCTempPassword('')
      setCConfirmTempPassword('')
      if (result.oneTimeTemporaryPassword) {
        setCopiedOneTime(false)
        setOneTimeReveal({
          title: 'Đã tạo tài khoản – Mật khẩu tạm thời (Hiển thị 1 lần duy nhất)',
          fullName: getDisplayNameForAccount(result.record),
          username: result.record.username ?? '',
          email: result.record.email,
          temporaryPassword: result.oneTimeTemporaryPassword,
        })
      } else {
        notify({
          tone: 'success',
          title: 'Đã khởi tạo tài khoản chờ kích hoạt',
          description: `${getDisplayNameForAccount(result.record)} (@${result.record.username}) đang ở trạng thái PENDING_ACTIVATION.`,
        })
      }
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo tài khoản nhân sự.')
    },
  })

  const editProfileMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) throw new Error('Chưa chọn hồ sơ.')
      return accountsApi.updateStaffProfile(actor, {
        userId: editTarget.id,
        profile: {
          profileType: eProfileType,
          fullName: eFullName,
          employeeCode: eEmployeeCode,
          phone: ePhone,
          email: eEmail,
          branchId: eBranchId,
          departmentId: eDepartmentId,
          jobTitle: eJobTitle.trim() || undefined,
          status: eWorkStatus,
          verifiedToeicScore:
            eProfileType === 'TEACHER' && eToeicScore.trim() !== ''
              ? Number(eToeicScore)
              : undefined,
          specializations:
            eProfileType === 'TEACHER'
              ? eSpecializations
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
        },
      })
    },
    onSuccess: (updated) => {
      invalidateAccountsAndRoles()
      setEditTarget(null)
      notify({
        tone: 'success',
        title: 'Đã cập nhật hồ sơ nhân sự',
        description: `${getDisplayNameForAccount(updated)} (${getProfileCodeForAccount(updated)})`,
      })
    },
    onError: (err) => {
      setEditError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ.')
    },
  })

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!statusModalTarget) throw new Error('Chưa chọn tài khoản.')
      return accountsApi.setStaffAccountStatus(actor, {
        userId: statusModalTarget.id,
        nextStatus: statusNextValue,
        reason: statusReason,
      })
    },
    onSuccess: (updated) => {
      invalidateAccountsAndRoles()
      setStatusModalTarget(null)
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái tài khoản',
        description: `${getDisplayNameForAccount(updated)} -> ${ACCOUNT_STATUS_META[updated.accountStatus].label}`,
      })
    },
    onError: (err) => {
      setStatusError(err instanceof Error ? err.message : 'Không thể đổi trạng thái tài khoản.')
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: (userId: string) => accountsApi.resendActivationInvite(actor, userId),
    onSuccess: (updated) => {
      invalidateAccountsAndRoles()
      notify({
        tone: 'info',
        title: 'Đã ghi nhận yêu cầu gửi lại lời mời kích hoạt',
        description: `Hệ thống đã cập nhật thời điểm gửi lời mời kích hoạt cho tài khoản @${updated.username}.`,
      })
    },
    onError: (err) => {
      notify({
        tone: 'error',
        title: 'Không thể gửi lời mời kích hoạt',
        description: err instanceof Error ? err.message : 'Đã xảy ra lỗi.',
      })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: () => {
      if (!resetModalTarget) throw new Error('Chưa chọn tài khoản.')
      return accountsApi.triggerPasswordReset(actor, {
        userId: resetModalTarget.id,
        mode: resetMode,
        temporaryPassword: resetMode === 'ISSUE_TEMP_PASSWORD' ? resetTempPassword : undefined,
        reason: resetReason,
      })
    },
    onSuccess: (result) => {
      invalidateAccountsAndRoles()
      setResetModalTarget(null)
      setResetTempPassword('')
      if (result.oneTimeTemporaryPassword) {
        setCopiedOneTime(false)
        setOneTimeReveal({
          title: 'Đã cấp mật khẩu tạm thời (Hiển thị 1 lần duy nhất)',
          fullName: getDisplayNameForAccount(result.record),
          username: result.record.username ?? '',
          email: result.record.email,
          temporaryPassword: result.oneTimeTemporaryPassword,
        })
      } else {
        notify({
          tone: 'success',
          title: 'Đã yêu cầu đặt lại mật khẩu',
          description: `Tài khoản @${result.record.username} chuyển sang PASSWORD_RESET_REQUIRED.`,
        })
      }
    },
    onError: (err) => {
      setResetError(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.')
    },
  })

  const staffAccounts = useMemo(
    () => accounts.filter((a) => a.category !== 'STUDENT'),
    [accounts],
  )
  const studentAccounts = useMemo(
    () => accounts.filter((a) => a.category === 'STUDENT'),
    [accounts],
  )

  const filteredStaff = useMemo(() => {
    return staffAccounts.filter((item) => {
      const pType =
        item.staffProfile?.profileType ?? (item.category === 'TEACHER' ? 'TEACHER' : 'EMPLOYEE')
      if (profileTypeFilter !== 'ALL' && pType !== profileTypeFilter) return false
      if (roleFilter !== 'ALL' && item.role !== roleFilter) return false
      if (branchFilter !== 'ALL' && item.staffProfile?.branchId !== branchFilter) return false
      if (statusFilter !== 'ALL' && item.accountStatus !== statusFilter) return false
      if (search.trim()) {
        const displayName = getDisplayNameForAccount(item)
        const code = getProfileCodeForAccount(item)
        const matched =
          matchText(displayName, search) ||
          matchText(code, search) ||
          matchText(item.username ?? '', search) ||
          matchText(item.email, search) ||
          matchText(item.phone, search)
        if (!matched) return false
      }
      return true
    })
  }, [staffAccounts, profileTypeFilter, roleFilter, branchFilter, statusFilter, search])

  const paginatedStaff = paginate(filteredStaff, page, 7)

  const branchSelectOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  )

  const createDepartmentOptions = useMemo(
    () =>
      DEPARTMENT_CATALOG.filter((d) => d.applicableProfileTypes.includes(cProfileType)).map((d) => ({
        value: d.id,
        label: `${d.name} (${d.code})`,
      })),
    [cProfileType],
  )

  const editDepartmentOptions = useMemo(
    () =>
      DEPARTMENT_CATALOG.filter((d) => d.applicableProfileTypes.includes(eProfileType)).map((d) => ({
        value: d.id,
        label: `${d.name} (${d.code})`,
      })),
    [eProfileType],
  )

  const assignableRoleTemplates = useMemo(
    () => ROLE_DEFINITIONS.filter((r) => canGrantAdmin || r.role !== 'ADMIN'),
    [canGrantAdmin],
  )

  const createPasswordEval = useMemo(
    () => evaluatePasswordPolicy(cTempPassword),
    [cTempPassword],
  )
  const resetPasswordEval = useMemo(
    () => evaluatePasswordPolicy(resetTempPassword),
    [resetTempPassword],
  )

  const openCreateModal = () => {
    const defaultBranch = branchSelectOptions[0]?.value ?? ''
    setCreateError(null)
    setCProfileType('EMPLOYEE')
    setCFullName('')
    setCEmployeeCode('')
    setCPhone('')
    setCEmail('')
    setCBranchId(defaultBranch)
    setCDepartmentId('dept-sales')
    setCJobTitle('')
    setCToeicScore('')
    setCSpecializations('')
    setCUsername('')
    setCUsernameTouched(false)
    setCLoginEmail('')
    setCLoginEmailTouched(false)
    setCProvisioningMethod('INVITE_LINK')
    setCTempPassword('')
    setCConfirmTempPassword('')
    setCShowTempPassword(false)
    setCMustChangeFirstLogin(true)
    setCRole('SALES')
    setCScopeType('OWN')
    setCScopeIds(defaultBranch ? [defaultBranch] : [])
    setCInitialStatus('ACTIVE')
    setCReason('')
    setCreateOpen(true)
  }

  const openEditProfileModal = (record: ManagedAccountRecord) => {
    if (!record.staffProfile) return
    setEditError(null)
    setEditTarget(record)
    setEProfileType(record.staffProfile.profileType)
    setEFullName(record.staffProfile.fullName)
    setEEmployeeCode(record.staffProfile.employeeCode)
    setEPhone(record.staffProfile.phone)
    setEEmail(record.staffProfile.email || record.email)
    setEBranchId(record.staffProfile.branchId)
    setEDepartmentId(record.staffProfile.departmentId)
    setEJobTitle(record.staffProfile.jobTitle ?? '')
    setEWorkStatus(record.staffProfile.status)
    setEToeicScore(
      record.staffProfile.verifiedToeicScore !== undefined
        ? String(record.staffProfile.verifiedToeicScore)
        : '',
    )
    setESpecializations((record.staffProfile.specializations ?? []).join(', '))
  }

  const openStatusModal = (
    record: ManagedAccountRecord,
    nextStatus: 'ACTIVE' | 'LOCKED' | 'DISABLED',
  ) => {
    setStatusError(null)
    setStatusModalTarget(record)
    setStatusNextValue(nextStatus)
    setStatusReason('')
  }

  const openResetPasswordModal = (record: ManagedAccountRecord) => {
    setResetError(null)
    setResetModalTarget(record)
    setResetMode('ISSUE_TEMP_PASSWORD')
    setResetTempPassword(generateStrongTemporaryPassword(12))
    setResetShowPassword(true)
    setResetReason('')
  }

  const handleCopyOneTimePassword = async () => {
    if (!oneTimeReveal) return
    try {
      await navigator.clipboard.writeText(oneTimeReveal.temporaryPassword)
      setCopiedOneTime(true)
    } catch {
      notify({
        tone: 'warning',
        title: 'Trình duyệt chặn sao chép tự động',
        description: 'Vui lòng bôi đen và sao chép thủ công mật khẩu tạm trên hộp thoại.',
      })
    }
  }

  const detailAuditLogs = useMemo(() => {
    if (!detailTarget) return []
    return auditLogs.filter((log) => log.targetUserId === detailTarget.id).slice(0, 8)
  }, [auditLogs, detailTarget])

  if (isLoading) return <LoadingBlock label="Đang tải danh sách tài khoản & hồ sơ nhân sự..." />
  if (error) {
    return (
      <ErrorBlock
        message="Không thể tải danh sách tài khoản hệ thống."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Tài khoản & Nhân sự"
        description="Quản lý hồ sơ nhân sự, tài khoản đăng nhập và phân quyền theo vai trò."
        badge={
          <Badge tone="info">
            {staffAccounts.length} nhân sự • {studentAccounts.length} học viên giám sát
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActionGuard permission="roles.view">
              <Link
                to="/accounts/roles"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2 text-xs font-bold text-[#243B53] transition hover:border-[#75BDEB] hover:bg-[#F5FAFE] hover:text-[#2878B8]"
              >
                <Shield className="h-4 w-4 text-[#2878B8]" />
                <span>Xem Role cố định</span>
              </Link>
            </ActionGuard>

            <ActionGuard permission="accounts.create">
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                <span>Tạo tài khoản nhân sự</span>
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* Thanh chuyển Tab */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DCEAF3] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('STAFF')}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            activeTab === 'STAFF'
              ? 'bg-[#2878B8] text-white shadow-2xs'
              : 'bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          Nhân sự & Giảng viên ({staffAccounts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('STUDENT')}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            activeTab === 'STUDENT'
              ? 'bg-[#2878B8] text-white shadow-2xs'
              : 'bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          Học viên giám sát ({studentAccounts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            activeTab === 'AUDIT'
              ? 'bg-[#2878B8] text-white shadow-2xs'
              : 'bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Nhật ký Bảo mật ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH NHÂN SỰ & GIẢNG VIÊN (ĐỦ 11 CỘT CHUẨN MỤC VIII.5) */}
      {activeTab === 'STAFF' && (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="sm:col-span-2">
              <InputField
                id="acc-search"
                label="Tìm kiếm"
                placeholder="Mã NV, họ tên, username, email hoặc SĐT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <SelectField
              id="acc-profile-type"
              label="Loại hồ sơ"
              value={profileTypeFilter}
              onChange={(e) => {
                setProfileTypeFilter(e.target.value as 'ALL' | EmployeeProfileType)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Tất cả loại hồ sơ' },
                { value: 'EMPLOYEE', label: 'EMPLOYEE (Nhân viên)' },
                { value: 'TEACHER', label: 'TEACHER (Giảng viên)' },
              ]}
            />

            <SelectField
              id="acc-role-filter"
              label="Vai trò cố định"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'ALL' | StaffRole)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Tất cả 5 vai trò' },
                ...ROLE_DEFINITIONS.map((r) => ({ value: r.role, label: r.shortBadge })),
              ]}
            />

            <SelectField
              id="acc-branch-filter"
              label="Cơ sở"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value)
                setPage(1)
              }}
              options={[{ value: 'ALL', label: 'Tất cả cơ sở' }, ...branchSelectOptions]}
            />

            <SelectField
              id="acc-status-filter"
              label="Trạng thái tài khoản"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | StaffAccountStatus)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: 'Tất cả 5 trạng thái' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'PENDING_ACTIVATION', label: 'PENDING_ACTIVATION' },
                { value: 'PASSWORD_RESET_REQUIRED', label: 'PASSWORD_RESET_REQUIRED' },
                { value: 'LOCKED', label: 'LOCKED' },
                { value: 'DISABLED', label: 'DISABLED' },
              ]}
            />
          </div>

          {paginatedStaff.items.length === 0 ? (
            <EmptyBlock
              title="Không tìm thấy tài khoản nhân sự phù hợp"
              description="Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm."
            />
          ) : (
            <>
              <DataTableContainer>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Mã nhân viên
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">Họ tên</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Loại hồ sơ
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">Vai trò</DataTableHeaderCell>
                      <DataTableHeaderCell>Email</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Điện thoại
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">Cơ sở</DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Phòng ban
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Trạng thái tài khoản
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap">
                        Lần đăng nhập gần nhất
                      </DataTableHeaderCell>
                      <DataTableHeaderCell className="whitespace-nowrap text-right">
                        Thao tác
                      </DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {paginatedStaff.items.map((item) => {
                      const isSelf = item.id === user?.id
                      const statusMeta = ACCOUNT_STATUS_META[item.accountStatus]
                      const pType = item.staffProfile?.profileType ?? 'EMPLOYEE'
                      const staffRole = item.role as StaffRole

                      return (
                        <DataTableRow key={item.id}>
                          <DataTableCell className="whitespace-nowrap">
                            <code className="rounded bg-[#F5FAFE] px-2 py-0.5 text-xs font-extrabold text-[#2878B8]">
                              {getProfileCodeForAccount(item)}
                            </code>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <p className="font-bold text-[#243B53]">
                              {getDisplayNameForAccount(item)}
                              {isSelf && (
                                <span className="ml-1.5 rounded bg-[#EAF6FD] px-1.5 py-0.5 text-[10px] font-extrabold text-[#2878B8]">
                                  BẠN
                                </span>
                              )}
                            </p>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <span className="text-xs font-semibold text-[#243B53]">
                              {pType === 'TEACHER' ? 'TEACHER' : 'EMPLOYEE'}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <Badge tone={staffRole === 'ADMIN' ? 'info' : 'success'}>
                                {STAFF_ROLE_LABELS[staffRole]}
                              </Badge>
                              <span className="text-[10px] font-semibold text-[#64748B]">
                                Scope: {item.scopeType}
                              </span>
                            </div>
                          </DataTableCell>

                          <DataTableCell>
                            <p className="text-xs font-medium text-[#243B53]">{item.email}</p>
                            <p className="text-[11px] font-semibold text-[#2878B8]">
                              @{item.username ?? '—'}
                            </p>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <span className="text-xs text-[#243B53]">{item.phone}</span>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <span className="text-xs text-[#243B53]">
                              {item.staffProfile?.branchName ?? '—'}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <span className="text-xs text-[#64748B]">
                              {item.staffProfile?.departmentName ?? '—'}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <Badge tone={statusMeta.tone}>{item.accountStatus}</Badge>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap">
                            <span className="text-xs text-[#64748B]">
                              {item.userAccount?.lastLoginAt
                                ? formatDateTimeVi(item.userAccount.lastLoginAt)
                                : 'Chưa đăng nhập'}
                            </span>
                          </DataTableCell>

                          <DataTableCell className="whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailTarget(item)}
                                title="Xem chi tiết tách biệt Tài khoản & Hồ sơ"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Xem</span>
                              </Button>

                              <ActionGuard permission="roles.view">
                                <Link
                                  to={`/accounts/roles?role=${staffRole}`}
                                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#DCEAF3] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2878B8] transition hover:bg-[#EAF6FD]"
                                  title="Xem định nghĩa Role cố định (Chỉ đọc)"
                                >
                                  <Shield className="h-3.5 w-3.5" />
                                  <span>Xem Role</span>
                                </Link>
                              </ActionGuard>

                              <ActionGuard permission="accounts.update">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openEditProfileModal(item)}
                                  title="Chỉnh sửa hồ sơ nhân viên"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Sửa hồ sơ</span>
                                </Button>
                              </ActionGuard>

                              {item.accountStatus === 'PENDING_ACTIVATION' && (
                                <ActionGuard permission="accounts.update">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    loading={
                                      resendInviteMutation.isPending &&
                                      resendInviteMutation.variables === item.id
                                    }
                                    onClick={() => resendInviteMutation.mutate(item.id)}
                                    title="Gửi lời mời kích hoạt"
                                  >
                                    <MailCheck className="h-3.5 w-3.5" />
                                    <span>Mời kích hoạt</span>
                                  </Button>
                                </ActionGuard>
                              )}

                              {item.accountStatus !== 'DISABLED' && (
                                <ActionGuard permission="accounts.reset_password">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openResetPasswordModal(item)}
                                    title="Yêu cầu đặt lại mật khẩu"
                                  >
                                    <KeyRound className="h-3.5 w-3.5" />
                                    <span>Đặt lại MK</span>
                                  </Button>
                                </ActionGuard>
                              )}

                              <ActionGuard permission="accounts.lock">
                                {!isSelf && (
                                  <>
                                    {item.accountStatus === 'LOCKED' ||
                                    item.accountStatus === 'DISABLED' ? (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => openStatusModal(item, 'ACTIVE')}
                                      >
                                        <Unlock className="h-3.5 w-3.5" />
                                        <span>Mở khóa</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => openStatusModal(item, 'LOCKED')}
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>Khóa</span>
                                      </Button>
                                    )}
                                  </>
                                )}
                              </ActionGuard>
                            </div>
                          </DataTableCell>
                        </DataTableRow>
                      )
                    })}
                  </tbody>
                </DataTable>
              </DataTableContainer>

              <Pagination
                page={paginatedStaff.page}
                totalPages={paginatedStaff.totalPages}
                onChange={setPage}
              />
            </>
          )}
        </>
      )}

      {/* TAB 2: HỌC VIÊN GIÁM SÁT */}
      {activeTab === 'STUDENT' && (
        <>
          {studentAccounts.length === 0 ? (
            <EmptyBlock title="Chưa có tài khoản học viên nào để giám sát" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Mã học viên & Họ tên
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Username & Email</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Portal được cấp
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Trạng thái
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap text-right">
                      Thao tác
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {studentAccounts.map((stu) => (
                    <DataTableRow key={stu.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="font-bold text-[#243B53]">{getDisplayNameForAccount(stu)}</p>
                        <p className="text-xs text-[#64748B]">
                          Mã HV: <strong>{getProfileCodeForAccount(stu)}</strong>
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        <p className="text-xs font-extrabold text-[#2878B8]">@{stu.username}</p>
                        <p className="text-xs text-[#243B53]">{stu.email}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone="neutral">STUDENT {'->'} CLIENT PORTAL</Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <Badge tone={stu.status === 'active' ? 'success' : 'danger'}>
                          {stu.accountStatus}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setDetailTarget(stu)}>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem</span>
                          </Button>
                          <ActionGuard permission="accounts.lock">
                            {stu.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openStatusModal(stu, 'LOCKED')}
                              >
                                <Lock className="h-3.5 w-3.5" />
                                <span>Khóa</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openStatusModal(stu, 'ACTIVE')}
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>Mở khóa</span>
                              </Button>
                            )}
                          </ActionGuard>
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

      {/* TAB 3: NHẬT KÝ BẢO MẬT */}
      {activeTab === 'AUDIT' && (
        <>
          {auditLogs.length === 0 ? (
            <EmptyBlock title="Chưa có nhật ký bảo mật nào được ghi nhận" />
          ) : (
            <DataTableContainer>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="whitespace-nowrap">Thời điểm</DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Người thực hiện
                    </DataTableHeaderCell>
                    <DataTableHeaderCell className="whitespace-nowrap">
                      Tài khoản tác động
                    </DataTableHeaderCell>
                    <DataTableHeaderCell>Sự kiện & Nội dung</DataTableHeaderCell>
                    <DataTableHeaderCell>Lý do</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {auditLogs.map((log) => (
                    <DataTableRow key={log.id}>
                      <DataTableCell className="whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#243B53]">
                          {formatDateTimeVi(log.occurredAt)}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="text-xs font-bold text-[#243B53]">{log.actorName}</p>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <p className="text-xs font-bold text-[#2878B8]">{log.targetFullName}</p>
                        <p className="text-[11px] text-[#64748B]">@{log.targetUsername}</p>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone="info">{log.actionType}</Badge>
                          <p className="text-xs font-semibold text-[#243B53]">{log.nextSummary}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="text-xs text-[#64748B]">{log.reason ?? '—'}</span>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableContainer>
          )}
        </>
      )}

      {/* ========================================================================
          MODAL 1: TẠO TÀI KHOẢN NHÂN SỰ / GIẢNG VIÊN MỚI (3 KHU VỰC A / B / C)
         ======================================================================== */}
      <Modal
        open={createOpen}
        title="Tạo Hồ sơ Nhân sự & Tài khoản Đăng nhập mới"
        onClose={() => setCreateOpen(false)}
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Tạo tài khoản
            </Button>
          </>
        }
      >
        <div className="max-h-[74vh] space-y-5 overflow-y-auto pr-1">
          {createError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {createError}
            </div>
          )}

          {/* KHU VỰC 1: HỒ SƠ NHÂN VIÊN */}
          <section className="rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
            <div className="mb-3 border-b border-[#DCEAF3] pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2878B8]">
                1. Hồ sơ nhân sự
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <SelectField
                id="create-profile-type"
                label="Loại hồ sơ nhân sự *"
                value={cProfileType}
                onChange={(e) => {
                  const nextType = e.target.value as EmployeeProfileType
                  setCProfileType(nextType)
                  if (nextType === 'TEACHER') {
                    setCDepartmentId('dept-teaching')
                    setCRole('TEACHER')
                    setCScopeType('OWN')
                  } else {
                    setCDepartmentId('dept-sales')
                    setCRole('SALES')
                    setCScopeType('OWN')
                  }
                }}
                options={[
                  { value: 'EMPLOYEE', label: 'Nhân viên' },
                  { value: 'TEACHER', label: 'Giảng viên' },
                ]}
              />

              <InputField
                id="create-employee-code"
                label={cProfileType === 'TEACHER' ? 'Mã giảng viên *' : 'Mã nhân viên *'}
                value={cEmployeeCode}
                onChange={(e) => setCEmployeeCode(e.target.value.toUpperCase())}
                placeholder={cProfileType === 'TEACHER' ? 'VD: GV-TOEIC-15' : 'VD: NV-SAL-12'}
              />

              <InputField
                id="create-fullname"
                label="Họ và tên *"
                value={cFullName}
                onChange={(e) => {
                  const val = e.target.value
                  setCFullName(val)
                  if (!cUsernameTouched) {
                    setCUsername(suggestUsernameFromFullName(val))
                  }
                }}
                placeholder="Nhập họ và tên"
              />

              <InputField
                id="create-phone"
                label="Số điện thoại *"
                value={cPhone}
                onChange={(e) => setCPhone(e.target.value)}
                placeholder="0901234567"
              />

              <InputField
                id="create-profile-email"
                label="Email công vụ *"
                type="email"
                value={cEmail}
                onChange={(e) => {
                  const val = e.target.value
                  setCEmail(val)
                  if (!cLoginEmailTouched) {
                    setCLoginEmail(val)
                  }
                }}
                placeholder="Nhập email công vụ"
              />

              <InputField
                id="create-job-title"
                label="Chức danh"
                value={cJobTitle}
                onChange={(e) => setCJobTitle(e.target.value)}
                placeholder="Nhập chức danh công tác"
              />

              <SelectField
                id="create-branch"
                label="Cơ sở công tác *"
                value={cBranchId}
                placeholder={
                  branchSelectOptions.length === 0
                    ? '-- Chưa có dữ liệu cơ sở --'
                    : '-- Chọn cơ sở --'
                }
                onChange={(e) => {
                  const nextBranch = e.target.value
                  setCBranchId(nextBranch)
                  setCScopeIds(nextBranch ? [nextBranch] : [])
                }}
                options={branchSelectOptions}
              />

              <SelectField
                id="create-department"
                label="Phòng ban *"
                value={cDepartmentId}
                onChange={(e) => setCDepartmentId(e.target.value)}
                options={createDepartmentOptions}
              />

              {cProfileType === 'TEACHER' && (
                <>
                  <InputField
                    id="create-toeic-score"
                    label="Điểm TOEIC xác minh (0 – 990)"
                    type="number"
                    min={0}
                    max={990}
                    value={cToeicScore}
                    placeholder="Chưa cập nhật"
                    onChange={(e) => setCToeicScore(e.target.value)}
                  />
                  <InputField
                    id="create-specializations"
                    label="Chuyên môn giảng dạy"
                    value={cSpecializations}
                    placeholder="Phân cách bằng dấu phẩy"
                    onChange={(e) => setCSpecializations(e.target.value)}
                  />
                </>
              )}
            </div>
          </section>

          {/* KHU VỰC 2: THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP */}
          <section className="rounded-2xl border border-[#DCEAF3] bg-white p-4">
            <div className="mb-3 border-b border-[#DCEAF3] pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1F7A4C]">
                2. Tài khoản đăng nhập & Phương thức kích hoạt
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <InputField
                id="create-username"
                label="Tên đăng nhập *"
                value={cUsername}
                onChange={(e) => {
                  setCUsernameTouched(true)
                  setCUsername(e.target.value.toLowerCase())
                }}
                placeholder="Nhập tên đăng nhập"
              />

              <InputField
                id="create-login-email"
                label="Email đăng nhập *"
                type="email"
                value={cLoginEmail}
                onChange={(e) => {
                  setCLoginEmailTouched(true)
                  setCLoginEmail(e.target.value)
                }}
                placeholder="Nhập email đăng nhập"
              />
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="text-xs font-bold text-[#243B53]">Phương thức kích hoạt *</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                    cProvisioningMethod === 'INVITE_LINK'
                      ? 'border-[#2878B8] bg-[#EAF6FD]/60'
                      : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                  }`}
                >
                  <input
                    type="radio"
                    name="provisioningMethod"
                    checked={cProvisioningMethod === 'INVITE_LINK'}
                    onChange={() => setCProvisioningMethod('INVITE_LINK')}
                    className="mt-0.5 h-4 w-4 text-[#2878B8]"
                  />
                  <div>
                    <p className="font-extrabold text-[#243B53]">
                      Mời nhân sự tự đặt mật khẩu
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748B]">
                      Tài khoản chờ kích hoạt cho đến khi nhân sự thiết lập mật khẩu cá nhân.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                    cProvisioningMethod === 'TEMPORARY_PASSWORD'
                      ? 'border-[#2878B8] bg-[#EAF6FD]/60'
                      : 'border-[#DCEAF3] bg-white hover:border-[#75BDEB]'
                  }`}
                >
                  <input
                    type="radio"
                    name="provisioningMethod"
                    checked={cProvisioningMethod === 'TEMPORARY_PASSWORD'}
                    onChange={() => setCProvisioningMethod('TEMPORARY_PASSWORD')}
                    className="mt-0.5 h-4 w-4 text-[#2878B8]"
                  />
                  <div>
                    <p className="font-extrabold text-[#243B53]">
                      Cấp mật khẩu tạm thời
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748B]">
                      Hiển thị 1 lần sau khi tạo và yêu cầu đổi mật khẩu ngay lần đầu đăng nhập.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {cProvisioningMethod === 'TEMPORARY_PASSWORD' && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#243B53]">Mật khẩu tạm thời</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const generated = generateStrongTemporaryPassword(12)
                        setCTempPassword(generated)
                        setCConfirmTempPassword(generated)
                        setCShowTempPassword(true)
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#2878B8]" />
                      <span>Sinh mật khẩu mạnh</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCShowTempPassword((p) => !p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DCEAF3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#243B53]"
                    >
                      {cShowTempPassword ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Ẩn</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Hiện</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InputField
                    id="create-temp-pwd"
                    label="Mật khẩu tạm thời *"
                    type={cShowTempPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={cTempPassword}
                    onChange={(e) => setCTempPassword(e.target.value)}
                  />
                  <InputField
                    id="create-confirm-temp-pwd"
                    label="Xác nhận mật khẩu *"
                    type={cShowTempPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={cConfirmTempPassword}
                    onChange={(e) => setCConfirmTempPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>
                      Độ mạnh: <strong>{createPasswordEval.strengthLabel}</strong>
                    </span>
                    <span>{createPasswordEval.score}/5 tiêu chí</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full ${
                          createPasswordEval.score >= step ? 'bg-[#1F7A4C]' : 'bg-[#DCEAF3]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-semibold text-[#243B53]">
                  <input
                    type="checkbox"
                    checked={cMustChangeFirstLogin}
                    onChange={(e) => setCMustChangeFirstLogin(e.target.checked)}
                    className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                  />
                  <span>Yêu cầu đổi mật khẩu ngay lần đầu đăng nhập</span>
                </label>
              </div>
            )}
          </section>

          {/* KHU VỰC 3: VAI TRÒ & PHẠM VI DỮ LIỆU */}
          <section className="rounded-2xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
            <div className="mb-3 border-b border-[#DCEAF3] pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#243B53]">
                3. Vai trò & Phạm vi dữ liệu
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <SelectField
                id="create-fixed-role"
                label="Vai trò hệ thống *"
                value={cRole}
                onChange={(e) => {
                  const nextRole = e.target.value as StaffRole
                  setCRole(nextRole)
                  const foundDef = ROLE_DEFINITIONS.find((d) => d.role === nextRole)
                  if (foundDef) {
                    setCScopeType(foundDef.defaultScopeType)
                  }
                }}
                options={assignableRoleTemplates.map((r) => ({
                  value: r.role,
                  label: r.label,
                }))}
              />

              <SelectField
                id="create-scope-type"
                label="Phạm vi dữ liệu *"
                value={cScopeType}
                onChange={(e) => setCScopeType(e.target.value as AccessScopeType)}
                options={[
                  { value: 'OWN', label: ACCESS_SCOPE_LABELS.OWN },
                  { value: 'TEAM', label: ACCESS_SCOPE_LABELS.TEAM },
                  { value: 'BRANCH', label: ACCESS_SCOPE_LABELS.BRANCH },
                  { value: 'ALL', label: ACCESS_SCOPE_LABELS.ALL },
                ]}
              />

              {cProvisioningMethod === 'TEMPORARY_PASSWORD' && !cMustChangeFirstLogin && (
                <SelectField
                  id="create-initial-status"
                  label="Trạng thái tài khoản ban đầu"
                  value={cInitialStatus}
                  onChange={(e) => setCInitialStatus(e.target.value as StaffAccountStatus)}
                  options={[
                    { value: 'ACTIVE', label: 'Đang hoạt động' },
                    { value: 'LOCKED', label: 'Tạm khóa' },
                  ]}
                />
              )}
            </div>

            {cScopeType === 'BRANCH' && (
              <div className="mt-3 rounded-xl border border-[#DCEAF3] bg-white p-3">
                <p className="mb-2 text-xs font-bold text-[#243B53]">Cơ sở áp dụng phạm vi:</p>
                {branchSelectOptions.length === 0 ? (
                  <p className="text-xs text-[#64748B]">Chưa có dữ liệu cơ sở trong hệ thống.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {branchSelectOptions.map((b) => (
                      <label key={b.value} className="flex items-center gap-2 text-xs text-[#243B53]">
                        <input
                          type="checkbox"
                          checked={cScopeIds.includes(b.value)}
                          onChange={() =>
                            setCScopeIds((prev) =>
                              prev.includes(b.value)
                                ? prev.filter((id) => id !== b.value)
                                : [...prev, b.value],
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-[#DCEAF3] text-[#2878B8]"
                        />
                        <span>{b.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3">
              <InputField
                id="create-reason"
                label="Ghi chú khởi tạo tài khoản"
                value={cReason}
                onChange={(e) => setCReason(e.target.value)}
                placeholder="VD: Tiếp nhận nhân sự mới..."
              />
            </div>
          </section>
        </div>
      </Modal>

      {/* ========================================================================
          MODAL 2: HIỂN THỊ MẬT KHẨU TẠM DUY NHẤT 1 LẦN TRONG RAM
         ======================================================================== */}
      <Modal
        open={Boolean(oneTimeReveal)}
        title={oneTimeReveal?.title ?? 'Mật khẩu tạm thời (Hiển thị 1 lần)'}
        onClose={() => {
          setOneTimeReveal(null)
          setCopiedOneTime(false)
        }}
        maxWidthClassName="max-w-lg"
        footer={
          <Button
            onClick={() => {
              setOneTimeReveal(null)
              setCopiedOneTime(false)
            }}
          >
            Đã sao chép an toàn – Đóng vĩnh viễn
          </Button>
        }
      >
        {oneTimeReveal && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-[#64748B]">
              Vui lòng sao chép và bàn giao mật khẩu tạm thời dưới đây (chỉ hiển thị một lần).
            </p>
            <div className="space-y-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4 text-xs">
              <p>
                <span className="text-[#64748B]">Nhân sự:</span>{' '}
                <strong>{oneTimeReveal.fullName}</strong> (@{oneTimeReveal.username})
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#75BDEB] bg-white px-3.5 py-2.5">
                <code className="min-w-0 break-all text-base font-black tracking-wider text-[#243B53]">
                  {oneTimeReveal.temporaryPassword}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleCopyOneTimePassword()}
                >
                  {copiedOneTime ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#1F7A4C]" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================
          MODAL 3: CHỈNH SỬA HỒ SƠ NHÂN VIÊN (KHÔNG SỬA PERMISSION / KHÔNG NÂNG QUYỀN)
         ======================================================================== */}
      <Modal
        open={Boolean(editTarget)}
        title="Chỉnh sửa hồ sơ nhân sự"
        onClose={() => setEditTarget(null)}
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => editProfileMutation.mutate()}
              loading={editProfileMutation.isPending}
            >
              Lưu hồ sơ
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {editError && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 text-xs font-semibold text-[#B93A2E]">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <SelectField
              id="edit-profile-type"
              label="Loại hồ sơ"
              value={eProfileType}
              onChange={(e) => {
                const nextType = e.target.value as EmployeeProfileType
                setEProfileType(nextType)
                const matchingDepts = DEPARTMENT_CATALOG.filter((d) =>
                  d.applicableProfileTypes.includes(nextType),
                )
                if (!matchingDepts.some((d) => d.id === eDepartmentId) && matchingDepts[0]) {
                  setEDepartmentId(matchingDepts[0].id)
                }
              }}
              options={[
                { value: 'EMPLOYEE', label: 'EMPLOYEE (Nhân viên)' },
                { value: 'TEACHER', label: 'TEACHER (Giảng viên)' },
              ]}
            />
            <SelectField
              id="edit-work-status"
              label="Trạng thái hồ sơ nhân sự"
              value={eWorkStatus}
              onChange={(e) => setEWorkStatus(e.target.value as EmployeeWorkStatus)}
              options={[
                { value: 'ACTIVE', label: WORK_STATUS_LABELS.ACTIVE },
                { value: 'INACTIVE', label: WORK_STATUS_LABELS.INACTIVE },
              ]}
            />
            <InputField
              id="edit-fullname"
              label="Họ và tên *"
              value={eFullName}
              onChange={(e) => setEFullName(e.target.value)}
            />
            <InputField
              id="edit-code"
              label="Mã nhân viên *"
              value={eEmployeeCode}
              onChange={(e) => setEEmployeeCode(e.target.value.toUpperCase())}
            />
            <InputField
              id="edit-email"
              label="Email công vụ *"
              type="email"
              value={eEmail}
              onChange={(e) => setEEmail(e.target.value)}
            />
            <InputField
              id="edit-phone"
              label="Số điện thoại *"
              value={ePhone}
              onChange={(e) => setEPhone(e.target.value)}
            />
            <SelectField
              id="edit-branch"
              label="Cơ sở *"
              value={eBranchId}
              placeholder={
                branchSelectOptions.length === 0
                  ? '-- Chưa có dữ liệu cơ sở --'
                  : '-- Chọn cơ sở --'
              }
              onChange={(e) => setEBranchId(e.target.value)}
              options={branchSelectOptions}
            />
            <SelectField
              id="edit-dept"
              label="Phòng ban *"
              value={eDepartmentId}
              onChange={(e) => setEDepartmentId(e.target.value)}
              options={editDepartmentOptions}
            />
            <div className="sm:col-span-2">
              <InputField
                id="edit-job-title"
                label="Chức danh"
                value={eJobTitle}
                onChange={(e) => setEJobTitle(e.target.value)}
              />
            </div>

            {eProfileType === 'TEACHER' && (
              <>
                <InputField
                  id="edit-toeic"
                  label="Điểm TOEIC xác minh (0 – 990)"
                  type="number"
                  min={0}
                  max={990}
                  value={eToeicScore}
                  placeholder="Chưa cập nhật"
                  onChange={(e) => setEToeicScore(e.target.value)}
                />
                <InputField
                  id="edit-spec"
                  label="Chuyên môn giảng dạy"
                  value={eSpecializations}
                  placeholder="Phân cách bằng dấu phẩy"
                  onChange={(e) => setESpecializations(e.target.value)}
                />
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ========================================================================
          MODAL 4: YÊU CẦU ĐẶT LẠI MẬT KHẨU
         ======================================================================== */}
      <Modal
        open={Boolean(resetModalTarget)}
        title={`Yêu cầu đặt lại mật khẩu: @${resetModalTarget?.username ?? ''}`}
        onClose={() => setResetModalTarget(null)}
        maxWidthClassName="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetModalTarget(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              loading={resetPasswordMutation.isPending}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        {resetModalTarget && (
          <div className="space-y-4 text-xs">
            {resetError && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 font-semibold text-[#B93A2E]">
                {resetError}
              </div>
            )}

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#DCEAF3] p-3">
                <input
                  type="radio"
                  checked={resetMode === 'ISSUE_TEMP_PASSWORD'}
                  onChange={() => setResetMode('ISSUE_TEMP_PASSWORD')}
                  className="mt-0.5 h-4 w-4 text-[#2878B8]"
                />
                <div>
                  <p className="font-bold text-[#243B53]">
                    Cấp mật khẩu tạm thời mới & yêu cầu đổi mật khẩu lần đầu
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#DCEAF3] p-3">
                <input
                  type="radio"
                  checked={resetMode === 'REQUIRE_RESET_ONLY'}
                  onChange={() => setResetMode('REQUIRE_RESET_ONLY')}
                  className="mt-0.5 h-4 w-4 text-[#2878B8]"
                />
                <div>
                  <p className="font-bold text-[#243B53]">
                    Yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp
                  </p>
                </div>
              </label>
            </div>

            {resetMode === 'ISSUE_TEMP_PASSWORD' && (
              <div className="space-y-2 rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 font-bold text-[#243B53]">
                    Độ mạnh: {resetPasswordEval.strengthLabel} ({resetPasswordEval.score}/5)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setResetTempPassword(generateStrongTemporaryPassword(12))}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Sinh mới</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setResetShowPassword((v) => !v)}
                      className="rounded-lg border border-[#DCEAF3] bg-white px-2 py-1 font-semibold"
                    >
                      {resetShowPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
                <InputField
                  id="reset-temp-pwd"
                  label="Mật khẩu tạm thời mới *"
                  type={resetShowPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={resetTempPassword}
                  onChange={(e) => setResetTempPassword(e.target.value)}
                />
              </div>
            )}

            <InputField
              id="reset-reason"
              label="Lý do đặt lại mật khẩu *"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="VD: Nhân viên yêu cầu cấp lại mật khẩu công vụ..."
            />
          </div>
        )}
      </Modal>

      {/* ========================================================================
          MODAL 5: KHÓA / MỞ KHÓA / VÔ HIỆU HÓA TÀI KHOẢN
         ======================================================================== */}
      <Modal
        open={Boolean(statusModalTarget)}
        title="Kiểm soát Trạng thái Tài khoản Đăng nhập"
        onClose={() => setStatusModalTarget(null)}
        maxWidthClassName="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModalTarget(null)}>
              Hủy
            </Button>
            <Button
              variant={statusNextValue === 'ACTIVE' ? 'primary' : 'danger'}
              onClick={() => statusMutation.mutate()}
              loading={statusMutation.isPending}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        {statusModalTarget && (
          <div className="space-y-3.5 text-xs">
            {statusError && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FDECE9] px-3.5 py-2.5 font-semibold text-[#B93A2E]">
                {statusError}
              </div>
            )}

            <p className="text-sm text-[#243B53]">
              Tài khoản:{' '}
              <strong>
                {getDisplayNameForAccount(statusModalTarget)} ({statusModalTarget.email})
              </strong>
            </p>

            <SelectField
              id="status-next-select"
              label="Trạng thái tài khoản *"
              value={statusNextValue}
              onChange={(e) =>
                setStatusNextValue(e.target.value as 'ACTIVE' | 'LOCKED' | 'DISABLED')
              }
              options={[
                { value: 'LOCKED', label: 'Tạm khóa truy cập' },
                { value: 'DISABLED', label: 'Vô hiệu hóa / Ngừng hoạt động' },
                { value: 'ACTIVE', label: 'Mở khóa hoạt động' },
              ]}
            />

            <InputField
              id="status-reason"
              label="Lý do thay đổi trạng thái *"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="VD: Bàn giao công việc..."
            />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        title="Chi tiết tài khoản & Hồ sơ nhân sự"
        onClose={() => setDetailTarget(null)}
        maxWidthClassName="max-w-2xl"
      >
        {detailTarget && (
          <div className="max-h-[74vh] space-y-4 overflow-y-auto pr-1 text-xs">
            <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
              <p className="font-extrabold uppercase tracking-wider text-[#2878B8]">
                1. Tài khoản đăng nhập
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-[#64748B]">ID:</span>{' '}
                  <code className="font-bold">{detailTarget.id}</code>
                </p>
                <p>
                  <span className="text-[#64748B]">Phân loại:</span>{' '}
                  <strong>
                    {detailTarget.category === 'STUDENT' ? 'Học viên' : 'Nhân sự'}
                  </strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Username:</span>{' '}
                  <code className="font-extrabold text-[#2878B8]">@{detailTarget.username}</code>
                </p>
                <p>
                  <span className="text-[#64748B]">Email:</span>{' '}
                  <strong>{detailTarget.email}</strong>
                </p>
                <p>
                  <span className="text-[#64748B]">Trạng thái tài khoản:</span>{' '}
                  <Badge tone={ACCOUNT_STATUS_META[detailTarget.accountStatus].tone}>
                    {detailTarget.accountStatus}
                  </Badge>
                </p>
                <p>
                  <span className="text-[#64748B]">Ngày tạo:</span>{' '}
                  <strong>{formatDate(detailTarget.createdAt)}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#DCEAF3] bg-white p-4">
              <p className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[#1F7A4C]">
                <UserCheck className="h-4 w-4" />
                <span>2. Hồ sơ liên kết</span>
              </p>

              {detailTarget.staffProfile && (
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-[#64748B]">Mã nhân sự:</span>{' '}
                    <strong>{detailTarget.staffProfile.employeeCode}</strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Họ và tên:</span>{' '}
                    <strong>{detailTarget.staffProfile.fullName}</strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Loại hồ sơ:</span>{' '}
                    <strong>
                      {detailTarget.staffProfile.profileType === 'TEACHER'
                        ? 'Giảng viên'
                        : 'Nhân viên'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Trạng thái hồ sơ:</span>{' '}
                    <strong>{WORK_STATUS_LABELS[detailTarget.staffProfile.status]}</strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Cơ sở:</span>{' '}
                    <strong>{detailTarget.staffProfile.branchName}</strong>
                  </p>
                  <p>
                    <span className="text-[#64748B]">Phòng ban:</span>{' '}
                    <strong>{detailTarget.staffProfile.departmentName}</strong>
                  </p>
                </div>
              )}

              {detailTarget.studentProfile && (
                <div className="mt-2.5 space-y-1.5">
                  <p>
                    <span className="text-[#64748B]">Mã học viên:</span>{' '}
                    <strong>{detailTarget.studentProfile.studentCode}</strong> –{' '}
                    {detailTarget.studentProfile.fullName}
                  </p>
                </div>
              )}
            </div>

            {detailTarget.category !== 'STUDENT' && (
              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-4">
                <p className="font-extrabold uppercase tracking-wider text-[#243B53]">
                  3. Vai trò & Quyền hạn ({detailTarget.effectivePermissions?.length ?? 0} quyền)
                </p>
                <p className="mt-2">
                  <span className="text-[#64748B]">Vai trò:</span>{' '}
                  <strong>{STAFF_ROLE_LABELS[detailTarget.role as StaffRole]}</strong> •{' '}
                  <span className="text-[#64748B]">Phạm vi:</span>{' '}
                  <strong>{ACCESS_SCOPE_LABELS[detailTarget.scopeType]}</strong>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {(detailTarget.effectivePermissions ?? []).map((code) => (
                    <code
                      key={code}
                      className="rounded border border-[#DCEAF3] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2878B8]"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {detailAuditLogs.length > 0 && (
              <div className="rounded-xl border border-[#DCEAF3] bg-white p-4">
                <p className="font-extrabold uppercase tracking-wider text-[#64748B]">
                  4. Nhật ký thao tác gần nhất
                </p>
                <div className="mt-2 space-y-2">
                  {detailAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-[#EEF4F8] bg-[#F8FBFD] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 font-bold text-[#2878B8]">{log.actionType}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {formatDateTimeVi(log.occurredAt)} • {log.actorName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[#243B53]">{log.nextSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
