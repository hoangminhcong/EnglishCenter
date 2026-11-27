import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import AuthFormField from '../components/AuthFormField';
import { authService, authValidators } from '../services/authService';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? undefined;

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmNewPassword?: string;
    form?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPasswordError = authValidators.passwordStrength(newPassword);
    const confirmError =
      !confirmNewPassword.trim()
        ? 'Vui lòng nhập lại mật khẩu mới.'
        : confirmNewPassword !== newPassword
          ? 'Mật khẩu xác nhận không khớp.'
          : null;

    if (newPasswordError || confirmError) {
      setErrors({
        newPassword: newPasswordError ?? undefined,
        confirmNewPassword: confirmError ?? undefined,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await authService.resetPassword({
        token,
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      if (!response.success) {
        setErrors({ form: response.message });
        return;
      }

      setSuccessMessage(response.message);
      setNewPassword('');
      setConfirmNewPassword('');
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
              Đặt lại mật khẩu mới
            </h1>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#718096]">
              Thiết lập mật khẩu mới cho tài khoản học viên English Center của bạn.
            </p>
          </div>

          {successMessage ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-[12px] border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-[13.5px] leading-relaxed text-[#065F46]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                <span>{successMessage}</span>
              </div>

              <Link
                to="/login"
                className="inline-flex h-[42px] w-full items-center justify-center rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1f639a]"
              >
                Đến trang Đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errors.form ? (
                <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] font-medium text-[#DC2626]">
                  {errors.form}
                </div>
              ) : null}

              <AuthFormField
                id="reset-new-password"
                type="password"
                label="Mật khẩu mới"
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
                value={newPassword}
                onChange={(val) => {
                  setNewPassword(val);
                  if (errors.newPassword || errors.form) {
                    setErrors((prev) => ({
                      ...prev,
                      newPassword: undefined,
                      form: undefined,
                    }));
                  }
                }}
                error={errors.newPassword}
              />

              <AuthFormField
                id="reset-confirm-password"
                type="password"
                label="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmNewPassword}
                onChange={(val) => {
                  setConfirmNewPassword(val);
                  if (errors.confirmNewPassword || errors.form) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmNewPassword: undefined,
                      form: undefined,
                    }));
                  }
                }}
                error={errors.confirmNewPassword}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1f639a] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Xác nhận mật khẩu mới</span>
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
