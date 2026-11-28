import type { ChangeEvent } from 'react'
import { ChevronDown } from 'lucide-react'

export interface ConsultationValues {
  fullName: string
  phone: string
  facebook: string
  school: string
  purpose: string
  level: string
  goal: string
  route: string
  time: string
}

export type ConsultationErrors = Partial<Record<keyof ConsultationValues, string>>

interface BaseProps {
  name: keyof ConsultationValues
  placeholder: string
  value: string
  required?: boolean
  error?: string
  onChange: (name: keyof ConsultationValues, value: string) => void
}

const line =
  'w-full border-0 border-b border-[#111827]/60 bg-transparent px-1 py-3 text-base text-[#111827] outline-none transition placeholder:text-[#111827]/80 focus:border-b-2 focus:border-[#111827]'

function ErrorText({ error }: { error?: string }) {
  if (!error) return null
  return <p className="mt-1 text-xs font-bold text-[#8A1C1C]">{error}</p>
}

export function TextField({
  name,
  placeholder,
  value,
  required,
  error,
  onChange,
  type = 'text',
}: BaseProps & { type?: string }) {
  return (
    <div>
      <input
        type={type}
        value={value}
        aria-label={placeholder}
        placeholder={required ? `${placeholder} *` : placeholder}
        className={line}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)}
      />
      <ErrorText error={error} />
    </div>
  )
}

export function SelectField({
  name,
  placeholder,
  value,
  required,
  error,
  onChange,
  options,
}: BaseProps & { options: string[] }) {
  return (
    <div>
      <div className="relative">
        <select
          value={value}
          aria-label={placeholder}
          className={`${line} cursor-pointer appearance-none pr-8`}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(name, e.target.value)}
        >
          <option value="" className="bg-white text-[#243B53]">
            {required ? `${placeholder} *` : placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-white text-[#243B53]">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111827]" />
      </div>
      <ErrorText error={error} />
    </div>
  )
}
