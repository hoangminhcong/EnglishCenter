import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export interface AuthFormFieldProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  placeholder?: string
  autoComplete?: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export default function AuthFormField({
  id,
  label,
  type = 'text',
  value,
  placeholder,
  autoComplete,
  error,
  disabled = false,
  onChange,
}: AuthFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="ec-reading-font">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-semibold text-[#243B53]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[44px] w-full rounded-[10px] border bg-white px-[13px] text-[14px] text-[#243B53] outline-none transition ${
            isPassword ? 'pr-[42px]' : ''
          } ${
            error
              ? 'border-[#B83A3A] focus:border-[#B83A3A] focus:ring-3 focus:ring-[#B83A3A]/15'
              : 'border-[#DCEAF3] focus:border-[#75BDEB] focus:ring-3 focus:ring-[#75BDEB]/25'
          } disabled:cursor-not-allowed disabled:bg-[#F5FAFE] disabled:opacity-65`}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-[8px] text-[#718096] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#B83A3A]">{error}</p>
      )}
    </div>
  )
}
