import { useState, type SyntheticEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  LoaderCircle,
  WifiOff,
} from 'lucide-react'
import type { PortalRedirectRequirementDto } from '@english-center/contracts'
import { Button, InputField, Modal } from '@english-center/ui'
import { evaluatePasswordPolicy } from '@/config/passwordPolicy'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaffApiClientError } from '@/services/api/httpClient'
import {
  isPermittedStaffRoute,
  resolveStaffDefaultHomePath,
} from '@/services/permissions/permissions.config'
import {
  resolveStaffAppPortalAccess,
  sanitizeInternalRoutePath,
} from '@/services/portal/portalResolver'
import { useStaffAuth } from '@/features/auth/hooks/useStaffAuth'

interface LocationRedirectState {
  from?: string
}

interface LoginErrorBannerState {
  kind: 'auth' | 'network' | 'server'
  message: string
}

export function StaffLoginPage() {
  useDocumentTitle('Đăng nhập nhân sự')
  const { session, isAuthenticated, login, completeFirstLoginPassword } = useStaffAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState<LoginErrorBannerState | null>(null)
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [portalRedirectInfo, setPortalRedirectInfo] =
    useState<PortalRedirectRequirementDto | null>(null)

  const [resetChallenge, setResetChallenge] = useState<{
    challengeId: string
    username: string
    displayName: string
    message: string
    currentPassword: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const redirectState = location.state as LocationRedirectState | null
  const sessionExpiredReason = searchParams.get('reason') === 'session_expired'
  const switchedFromClient = searchParams.get('portal_notice') === 'staff_required'

  const resolveDestinationAfterAuth = (
    activeSession: NonNullable<typeof session>,
  ): string => {
    const defaultLanding = resolveStaffDefaultHomePath(activeSession)
    const rawFrom = redirectState?.from
    if (!rawFrom) return defaultLanding
    const safeCandidate = sanitizeInternalRoutePath(rawFrom, defaultLanding)
    return isPermittedStaffRoute(activeSession, safeCandidate) ? safeCandidate : defaultLanding
  }

  if (isAuthenticated && session && session.portal === 'STAFF') {
    return <Navigate to={resolveDestinationAfterAuth(session)} replace />
  }

  const classifyError = (err: unknown): LoginErrorBannerState => {
    if (err instanceof StaffApiClientError) {
      if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT_ERROR' || err.status === 0) {
        return { kind: 'network', message: err.message }
      }
      if (err.status >= 500 || err.code === 'CONFIG_ERROR') {
        return { kind: 'server', message: err.message }
      }
      return { kind: 'auth', message: err.message }
    }
    return {
      kind: 'auth',
      message: err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.',
    }
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorBanner(null)
    setPortalRedirectInfo(null)
    setSubmitting(true)
    try {
      const outcome = await login({ identifier, password, rememberMe })
      if (outcome.outcome === 'PORTAL_REDIRECT_REQUIRED') {
        setPortalRedirectInfo(outcome)
        setPassword('')
        return
      }

      if (outcome.outcome === 'PASSWORD_RESET_REQUIRED') {
        setResetChallenge({
          challengeId: outcome.challengeId,
          username: outcome.username,
          displayName: outcome.displayName,
          message: outcome.message,
          currentPassword: password,
        })
        setNewPassword('')
        setConfirmNewPassword('')
        return
      }

      const resolvedLanding = resolveDestinationAfterAuth(outcome.session)
      navigate(resolvedLanding, { replace: true, state: null })
    } catch (err) {
      setErrorBanner(classifyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFirstPasswordChange = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resetChallenge) return
    setErrorBanner(null)
    setSubmitting(true)
    try {
      const activatedSession = await completeFirstLoginPassword({
        challengeId: resetChallenge.challengeId,
        currentPassword: resetChallenge.currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      })
      setResetChallenge(null)
      navigate(resolveDestinationAfterAuth(activatedSession), { replace: true, state: null })
    } catch (err) {
      setErrorBanner(classifyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const passwordEval = evaluatePasswordPolicy(newPassword)
  const portalResolution = portalRedirectInfo
    ? resolveStaffAppPortalAccess({
        accountType: portalRedirectInfo.accountType,
        portal: portalRedirectInfo.targetPortal,
      })
    : null

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F5FAFE] px-4 py-10">
      <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl border border-[#DCEAF3] bg-white shadow-lg lg:grid lg:grid-cols-12">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[#2878B8] to-[#1B5583] p-7 text-white lg:col-span-5 lg:p-8">
          <div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight">
              <span className="text-[#F26522]">E</span>NGLISH CENTER
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/85">
              Cổng Quản trị & Vận hành
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/95">
              Không gian làm việc trực tuyến dành cho đội ngũ nhân sự và giảng viên trung tâm.
            </p>
          </div>

          <div className="mt-8 space-y-1.5 rounded-xl bg-white/10 p-4 text-xs leading-relaxed text-white/95">
            <strong className="block font-bold uppercase tracking-wide">
              Lưu ý bảo mật
            </strong>
            <p>
              Sử dụng tài khoản công vụ được cấp riêng và đăng xuất khi rời khỏi thiết bị dùng chung.
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-8 lg:col-span-7">
          {sessionExpiredReason && !errorBanner && (
            <div className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs font-semibold text-[#92400E]">
              Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
            </div>
          )}

          {switchedFromClient && !errorBanner && (
            <div className="mb-4 rounded-xl border border-[#BAE6FD] bg-[#F5FAFE] px-3.5 py-2.5 text-xs font-semibold text-[#243B53]">
              Tài khoản nhân sự thuộc Cổng Quản trị & Vận hành. Vui lòng đăng nhập tại đây.
            </div>
          )}

          {portalRedirectInfo && portalResolution && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-[#75BDEB] bg-[#F5FAFE] p-4 text-xs text-[#243B53]"
            >
              <p className="font-extrabold uppercase tracking-wide text-[#2878B8]">
                Tài khoản thuộc Cổng Học viên
              </p>
              <p className="mt-1.5 leading-relaxed">{portalRedirectInfo.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {portalResolution.safeRedirectUrl ? (
                  <a
                    href={`${portalResolution.safeRedirectUrl}?portal_notice=client_required`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2878B8] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1f6399]"
                  >
                    <span>Mở Cổng Học viên</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="font-semibold text-[#B93A2E]">
                    Chưa cấu hình địa chỉ Cổng Học viên.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPortalRedirectInfo(null)}
                  className="rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2 text-xs font-bold text-[#243B53] hover:bg-[#EAF6FD]"
                >
                  Đăng nhập tài khoản khác
                </button>
              </div>
            </div>
          )}

          {errorBanner && (
            <div
              role="alert"
              className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
                errorBanner.kind === 'network' || errorBanner.kind === 'server'
                  ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                  : 'border-[#F5C2C7] bg-[#FDECE9] text-[#B93A2E]'
              }`}
            >
              {errorBanner.kind === 'network' ? (
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                {errorBanner.kind !== 'auth' && (
                  <strong className="block text-xs uppercase">
                    {errorBanner.kind === 'network' ? 'Lỗi kết nối mạng' : 'Lỗi cấu hình / Máy chủ'}
                  </strong>
                )}
                <span>{errorBanner.message}</span>
              </div>
            </div>
          )}

          {!resetChallenge ? (
            <>
              <h2 className="text-xl font-bold text-[#243B53]">Đăng nhập hệ thống</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Nhập tên đăng nhập hoặc email công vụ để tiếp tục.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="staff-identifier"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
                  >
                    Tên đăng nhập hoặc Email công vụ *
                  </label>
                  <input
                    id="staff-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nhập tên đăng nhập hoặc email công vụ"
                    className="w-full rounded-xl border border-[#DCEAF3] bg-white px-3.5 py-2.5 text-sm text-[#243B53] outline-none transition focus:border-[#75BDEB] focus:ring-2 focus:ring-[#EAF6FD]"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="staff-password"
                      className="text-xs font-bold uppercase tracking-wide text-[#243B53]"
                    >
                      Mật khẩu *
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2878B8] hover:underline"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Quên mật khẩu?</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="w-full rounded-xl border border-[#DCEAF3] bg-white py-2.5 pr-10 pl-3.5 text-sm text-[#243B53] outline-none transition focus:border-[#75BDEB] focus:ring-2 focus:ring-[#EAF6FD]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B] hover:text-[#2878B8]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#DCEAF3] text-[#2878B8]"
                  />
                  <span>Duy trì đăng nhập trên thiết bị cá nhân</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2878B8] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1f6399] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Đăng nhập</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleFirstPasswordChange} className="space-y-4">
              <h2 className="text-xl font-bold text-[#243B53]">
                Thiết lập mật khẩu mới ({resetChallenge.username})
              </h2>
              <p className="text-xs leading-relaxed text-[#475569]">{resetChallenge.message}</p>

              <div className="relative">
                <InputField
                  id="first-new-pwd"
                  type={showNewPassword ? 'text' : 'password'}
                  label="Mật khẩu mới *"
                  placeholder="Tối thiểu 8 ký tự gồm Hoa, thường, số và ký tự đặc biệt"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="absolute top-8 right-3 text-xs font-semibold text-[#2878B8]"
                >
                  {showNewPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>

              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Độ mạnh mật khẩu:</span>
                  <strong className="text-[#2878B8]">{passwordEval.strengthLabel}</strong>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordEval.score >= step ? 'bg-[#1F7A4C]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                  ))}
                </div>
                {passwordEval.issues.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-[#B93A2E]">{passwordEval.issues[0]}</p>
                )}
              </div>

              <InputField
                id="first-confirm-pwd"
                type={showNewPassword ? 'text' : 'password'}
                label="Xác nhận mật khẩu mới *"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setResetChallenge(null)
                    setErrorBanner(null)
                  }}
                >
                  Quay lại
                </Button>
                <Button type="submit" loading={submitting}>
                  Lưu mật khẩu & Tiếp tục
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Modal
        open={forgotModalOpen}
        title="Hướng dẫn cấp lại mật khẩu"
        onClose={() => setForgotModalOpen(false)}
        maxWidthClassName="max-w-md"
        footer={<Button onClick={() => setForgotModalOpen(false)}>Đã hiểu</Button>}
      >
        <div className="space-y-2 text-xs leading-relaxed text-[#475569]">
          <p>
            Vui lòng liên hệ <strong>Quản trị viên Hệ thống</strong> để được cấp lại mật khẩu tạm
            thời hoặc yêu cầu đặt lại mật khẩu công vụ.
          </p>
        </div>
      </Modal>
    </div>
  )
}
