import type { SyntheticEvent } from 'react'
import { Search } from 'lucide-react'

export interface FilterSelect {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: string[]
  disabled?: boolean
}

interface Props {
  keyword: string
  onKeywordChange: (value: string) => void
  placeholder: string
  selects?: FilterSelect[]
  submitLabel?: string
  onSubmit?: () => void
}

const field =
  'w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-[#243B53] outline-none focus:ring-2 focus:ring-[#F26522] disabled:cursor-not-allowed disabled:opacity-60'

export default function FilterBar({ keyword, onKeywordChange, placeholder, selects = [], submitLabel, onSubmit }: Props) {
  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-[#75BDEB] p-3 shadow-md md:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718096]" />
        <input
          type="text"
          value={keyword}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => onKeywordChange(e.target.value)}
          className={`${field} pl-9 placeholder:text-[#718096]`}
        />
      </div>

      {selects.map((s) => (
        <div key={s.id} className="md:w-52">
          <select
            value={s.value}
            disabled={s.disabled}
            aria-label={s.placeholder}
            onChange={(e) => s.onChange(e.target.value)}
            className={`${field} cursor-pointer`}
          >
            <option value="">{s.placeholder}</option>
            {s.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ))}

      {onSubmit && (
        <button
          type="submit"
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#F26522] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#d95314]"
        >
          <Search className="h-4 w-4" />
          {submitLabel ?? 'Tìm kiếm'}
        </button>
      )}
    </form>
  )
}
