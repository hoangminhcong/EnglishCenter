import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AuthFormField from '../components/AuthFormField';
import { authService, authValidators } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isStudent } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    form?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthenticated || !isStudent) {
    return <Navigate to="/login" state={{ from: '/change-password' }} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const currentError = authValidators.required(
      currentPassword,
      'Vui lòng nhập mật khẩu hiện tại.'
    );
    const newError = authValidators.passwordStrength(newPassword);
    const samePasswordError =
      !newError && currentPassword && newPassword === currentPassword
        ? 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
        : null;
    const confirmError =
      !confirmNewPassword.trim()
        ? 'Vui lòng nhập lại mật khẩu mới.'
        : confirmNewPassword !== newPassword
          ? 'Mật khẩu xác nhận không khớp.'
          : null;

    if (currentError || newError || samePasswordError || confirmError) {
      setErrors({
        currentPassword: currentError ?? undefined,
        newPassword: (newError || samePasswordError) ?? undefined,
        confirmNewPassword: confirmError ?? undefined,
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      if (!response.success) {
        setErrors({ form: response.message });
        return;
      }

      setSuccessMessage(response.message);
      setCurrentPassword('');
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
              Đổi mật khẩu
            </h1>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#718096]">
              Cập nhật mật khẩu mới để bảo vệ tài khoản học tập của bạn.
            </p>
          </div>

          {successMessage ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-[#A7F3D0] bg-[#ECFDF5] p-3.5 text-[13.5px] text-[#065F46]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {errors.form ? (
            <div className="mb-4 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] font-medium text-[#DC2626]">
              {errors.form}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthFormField
              id="change-current-password"
              type="password"
              label="Mật khẩu hiện tại"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={(val) => {
                setCurrentPassword(val);
                if (errors.currentPassword || errors.form) {
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                    form: undefined,
                  }));
                }
              }}
              error={errors.currentPassword}
            />

            <AuthFormField
              id="change-new-password"
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
              id="change-confirm-password"
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

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-[42px] flex-1 items-center justify-center rounded-[10px] border border-[#DCEAF3] bg-[#F5FAFE] px-4 text-[14px] font-semibold text-[#243B53] transition-colors hover:bg-[#EAF6FD]"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#2878B8] px-4 text-[14px] font-semibold text-white transition-all hover:bg-[#1f639a] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Cập nhật mật khẩu</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
