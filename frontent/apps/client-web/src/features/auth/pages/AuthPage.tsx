import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { sanitizeClientInternalPath } from '@/services/portal/portalResolver'
import AuthFormField from '../components/AuthFormField'
import { authService, authValidators } from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import type { ClientPortalRedirectNotice } from '../types/auth.types'

interface AuthPageProps {
  defaultTab?: 'login' | 'register'
}

interface AuthLocationState {
  from?: string
  registeredMessage?: string
  registeredUsername?: string
}

export function AuthPage({ defaultTab = 'login' }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const isRegisterMode = defaultTab === 'register'
  usePageTitle(isRegisterMode ? 'Đăng ký' : 'Đăng nhập')

  const locState = (location.state as AuthLocationState | null) ?? null
  const rawFrom = locState?.from

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState(locState?.registeredUsername ?? '')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginErrors, setLoginErrors] = useState<{
    identifier?: string
    password?: string
    form?: string
  }>({})
  const [portalRedirect, setPortalRedirect] = useState<ClientPortalRedirectNotice | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Register State
  const [regFullName, setRegFullName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regErrors, setRegErrors] = useState<{
    fullName?: string
    username?: string
    email?: string
    password?: string
    confirmPassword?: string
    phone?: string
    form?: string
  }>({})
  const [isRegistering, setIsRegistering] = useState(false)

  const redirectPath = sanitizeClientInternalPath(
    rawFrom,
    user?.defaultLandingRoute ?? '/student/dashboard',
  )

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectPath])

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPortalRedirect(null)

    const identifierError = authValidators.required(
      loginIdentifier,
      'Vui lòng nhập email hoặc tên đăng nhập.',
    )
    const passwordError = authValidators.required(
      loginPassword,
      'Vui lòng nhập mật khẩu.',
    )

    if (identifierError || passwordError) {
      setLoginErrors({
        identifier: identifierError || undefined,
        password: passwordError || undefined,
      })
      return
    }

    setLoginErrors({})
    setIsLoggingIn(true)

    try {
      const response = await authService.login({
        identifier: loginIdentifier,
        password: loginPassword,
        rememberMe,
      })

      if (response.portalRedirect) {
        setPortalRedirect(response.portalRedirect)
        setLoginPassword('')
        return
      }

      if (!response.success) {
        setLoginErrors({ form: response.message })
        return
      }

      const nextTarget = sanitizeClientInternalPath(
        rawFrom,
        response.user?.defaultLandingRoute ?? '/student/dashboard',
      )
      navigate(nextTarget, { replace: true })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const fullNameError = authValidators.required(
      regFullName,
      'Vui lòng nhập họ và tên.',
    )
    const usernameError = authValidators.username(regUsername)
    const emailError = authValidators.email(regEmail)
    const passwordError = authValidators.passwordStrength(regPassword)
    const confirmPasswordError =
      !regConfirmPassword.trim()
        ? 'Vui lòng nhập lại mật khẩu.'
        : regConfirmPassword !== regPassword
          ? 'Mật khẩu xác nhận không khớp.'
          : null
    const phoneError = authValidators.phone(regPhone)

    if (
      fullNameError ||
      usernameError ||
      emailError ||
      passwordError ||
      confirmPasswordError ||
      phoneError
    ) {
      setRegErrors({
        fullName: fullNameError || undefined,
        username: usernameError || undefined,
        email: emailError || undefined,
        password: passwordError || undefined,
        confirmPassword: confirmPasswordError ?? undefined,
        phone: phoneError || undefined,
      })
      return
    }

    setRegErrors({})
    setIsRegistering(true)

    try {
      const response = await authService.register({
        fullName: regFullName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        phone: regPhone,
      })

      if (!response.success) {
        setRegErrors({ form: response.message })
        return
      }

      setLoginIdentifier(regUsername.trim())
      setLoginPassword('')
      setRegPassword('')
      setRegConfirmPassword('')
      navigate('/login', {
        replace: true,
        state: {
          from: rawFrom,
          registeredMessage: response.message,
          registeredUsername: regUsername.trim(),
        } satisfies AuthLocationState,
      })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="ec-reading-font bg-[#F5FAFE] py-10 md:py-14">
      <div className="px-4 sm:px-6">
        {!isRegisterMode ? (
          <section
            aria-label="Đăng nhập"
            className="mx-auto max-w-[440px] rounded-[18px] border border-[#DCEAF3] bg-white p-6 shadow-[0_8px_24px_rgba(36,59,83,0.06)] sm:p-7"
          >
            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#243B53]">
                Đăng nhập
              </h1>
              <p className="mt-1 text-[13.5px] text-[#64748B]">
                Đăng nhập để truy cập khóa học và lịch sử luyện tập của bạn.
              </p>
            </div>

            {portalRedirect && (
              <div
                role="alert"
                className="mb-4 rounded-[12px] border border-[#75BDEB] bg-[#F5FAFE] p-3.5 text-[13px] text-[#243B53]"
              >
                <p className="font-bold text-[#2878B8]">Tài khoản dành cho Cổng Nhân sự</p>
                <p className="mt-1 leading-relaxed">{portalRedirect.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {portalRedirect.safeRedirectUrl ? (
                    <a
                      href={portalRedirect.safeRedirectUrl}
                      className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#2878B8] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1F6399]"
                    >
                      <span>Mở Cổng Nhân sự</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-[12px] font-semibold text-[#B93A2E]">
                      Chưa cấu hình địa chỉ Cổng Nhân sự. Vui lòng liên hệ quản trị viên.
                    </span>
                  )}
                </div>
              </div>
            )}

            {locState?.registeredMessage && !loginErrors.form && !portalRedirect ? (
              <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#A7F3D0] bg-[#ECFDF5] p-3.5 text-[13px] text-[#065F46]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                <span>{locState.registeredMessage}</span>
              </div>
            ) : null}

            {loginErrors.form ? (
              <div className="mb-4 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] font-medium text-[#DC2626]">
                {loginErrors.form}
              </div>
            ) : null}

            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <AuthFormField
                id="login-identifier"
                label="Email hoặc tên đăng nhập"
                autoComplete="username"
                placeholder="Nhập email hoặc tên đăng nhập"
                value={loginIdentifier}
                onChange={(val) => {
                  setLoginIdentifier(val)
                  if (loginErrors.identifier || loginErrors.form) {
                    setLoginErrors((prev) => ({
                      ...prev,
                      identifier: undefined,
                      form: undefined,
                    }))
                  }
                }}
                error={loginErrors.identifier}
              />

              <AuthFormField
                id="login-password"
                type="password"
                label="Mật khẩu"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={loginPassword}
                onChange={(val) => {
                  setLoginPassword(val)
                  if (loginErrors.password || loginErrors.form) {
                    setLoginErrors((prev) => ({
                      ...prev,
                      password: undefined,
                      form: undefined,
                    }))
                  }
                }}
                error={loginErrors.password}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#64748B] select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-[#DCEAF3] accent-[#2878B8]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-[13px] font-semibold text-[#2878B8] transition-colors hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1F6399] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-[#DCEAF3] pt-4 text-center text-[13.5px] text-[#64748B]">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                state={rawFrom ? { from: rawFrom } : undefined}
                className="font-semibold text-[#2878B8] hover:underline"
              >
                Đăng ký ngay
              </Link>
            </div>
          </section>
        ) : (
          <section
            aria-label="Đăng ký tài khoản"
            className="mx-auto max-w-[520px] rounded-[18px] border border-[#DCEAF3] bg-white p-6 shadow-[0_8px_24px_rgba(36,59,83,0.06)] sm:p-7"
          >
            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#243B53]">
                Đăng ký tài khoản
              </h1>
              <p className="mt-1 text-[13.5px] text-[#64748B]">
                Tạo tài khoản để lưu lịch sử làm bài và theo dõi khóa học tại trung tâm.
              </p>
            </div>

            {regErrors.form ? (
              <div className="mb-4 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] font-medium text-[#DC2626]">
                {regErrors.form}
              </div>
            ) : null}

            <form onSubmit={handleRegisterSubmit} noValidate>
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <AuthFormField
                  id="reg-fullname"
                  label="Họ và tên"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={regFullName}
                  onChange={(val) => {
                    setRegFullName(val)
                    if (regErrors.fullName) {
                      setRegErrors((prev) => ({ ...prev, fullName: undefined }))
                    }
                  }}
                  error={regErrors.fullName}
                />

                <AuthFormField
                  id="reg-username"
                  label="Tên đăng nhập"
                  autoComplete="username"
                  placeholder="nguyenvana"
                  value={regUsername}
                  onChange={(val) => {
                    setRegUsername(val)
                    if (regErrors.username || regErrors.form) {
                      setRegErrors((prev) => ({
                        ...prev,
                        username: undefined,
                        form: undefined,
                      }))
                    }
                  }}
                  error={regErrors.username}
                />

                <AuthFormField
                  id="reg-email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={regEmail}
                  onChange={(val) => {
                    setRegEmail(val)
                    if (regErrors.email || regErrors.form) {
                      setRegErrors((prev) => ({
                        ...prev,
                        email: undefined,
                        form: undefined,
                      }))
                    }
                  }}
                  error={regErrors.email}
                />

                <AuthFormField
                  id="reg-phone"
                  type="tel"
                  label="Số điện thoại"
                  autoComplete="tel"
                  placeholder="09xxxxxxxx"
                  value={regPhone}
                  onChange={(val) => {
                    setRegPhone(val)
                    if (regErrors.phone) {
                      setRegErrors((prev) => ({ ...prev, phone: undefined }))
                    }
                  }}
                  error={regErrors.phone}
                />

                <AuthFormField
                  id="reg-password"
                  type="password"
                  label="Mật khẩu"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự (chữ + số)"
                  value={regPassword}
                  onChange={(val) => {
                    setRegPassword(val)
                    if (regErrors.password) {
                      setRegErrors((prev) => ({ ...prev, password: undefined }))
                    }
                  }}
                  error={regErrors.password}
                />

                <AuthFormField
                  id="reg-confirm-password"
                  type="password"
                  label="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={regConfirmPassword}
                  onChange={(val) => {
                    setRegConfirmPassword(val)
                    if (regErrors.confirmPassword) {
                      setRegErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }))
                    }
                  }}
                  error={regErrors.confirmPassword}
                />
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1F6399] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <span>Đăng ký tài khoản</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-[#DCEAF3] pt-4 text-center text-[13.5px] text-[#64748B]">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                state={rawFrom ? { from: rawFrom } : undefined}
                className="font-semibold text-[#2878B8] hover:underline"
              >
                Đăng nhập
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
