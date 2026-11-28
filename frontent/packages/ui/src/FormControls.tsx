import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  hint?: string
}

export function InputField({
  id,
  label,
  error,
  hint,
  className = '',
  ...rest
}: InputFieldProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#243B53] outline-none transition focus:border-[#75BDEB] focus:ring-2 focus:ring-[#EAF6FD] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? 'border-[#B93A2E]' : 'border-[#DCEAF3]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-[#B93A2E]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#64748B]">{hint}</p>
      ) : null}
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: readonly SelectOption[]
  placeholder?: string
  error?: string | null
}

export function SelectField({
  id,
  label,
  options,
  placeholder,
  error,
  className = '',
  ...rest
}: SelectFieldProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#243B53]"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#243B53] outline-none transition focus:border-[#75BDEB] focus:ring-2 focus:ring-[#EAF6FD] disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? 'border-[#B93A2E]' : 'border-[#DCEAF3]'
        } ${className}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-[#B93A2E]">{error}</p>}
    </div>
  )
}
