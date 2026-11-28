import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import AuthFormField from '../components/AuthFormField';
import { authService, authValidators } from '../services/authService';

export function ForgotPasswordPage() {
  usePageTitle('Quên mật khẩu');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = authValidators.email(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setEmailError(undefined);
    setIsSubmitting(true);

    try {
      const response = await authService.requestPasswordReset({ email });
      setConfirmationMessage(response.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ec-reading-font bg-[#F5FAFE] py-10 md:py-14">
      <div className="mx-auto max-w-[440px] px-4">
        <div className="rounded-[18px] border border-[#DCEAF3] bg-white p-6 shadow-[0_8px_24px_rgba(36,59,83,0.06)] sm:p-7">
          <div className="mb-5">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#243B53]">
              Quên mật khẩu
            </h1>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#64748B]">
              Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
            </p>
          </div>

          {confirmationMessage ? (
            <div className="flex items-start gap-2.5 rounded-[12px] border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-[13.5px] leading-relaxed text-[#065F46]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              <span>{confirmationMessage}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <AuthFormField
                id="forgot-email"
                type="email"
                label="Email đăng ký"
                autoComplete="email"
                placeholder="Nhập địa chỉ email của bạn"
                value={email}
                onChange={(val) => {
                  setEmail(val);
                  if (emailError) {
                    setEmailError(undefined);
                  }
                }}
                error={emailError}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1F6399] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <span>Gửi yêu cầu đặt lại mật khẩu</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 border-t border-[#DCEAF3] pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2878B8] transition-colors hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
