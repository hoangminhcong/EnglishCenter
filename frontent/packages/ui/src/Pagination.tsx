import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const itemBaseClass =
  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition'

function buildPaginationTokens(
  current: number,
  total: number,
): readonly (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const tokens: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) {
    tokens.push('ellipsis-start')
  }
  for (let p = start; p <= end; p += 1) {
    tokens.push(p)
  }
  if (end < total - 1) {
    tokens.push('ellipsis-end')
  }
  tokens.push(total)
  return tokens
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const tokens = buildPaginationTokens(page, totalPages)

  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-2 pt-4">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className={`${itemBaseClass} bg-white text-[#243B53] shadow-sm hover:bg-[#EAF6FD] disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {tokens.map((token) =>
        typeof token === 'number' ? (
          <button
            key={token}
            type="button"
            aria-current={token === page ? 'page' : undefined}
            onClick={() => onChange(token)}
            className={`${itemBaseClass} ${
              token === page
                ? 'bg-[#2878B8] text-white shadow'
                : 'bg-white text-[#243B53] shadow-sm hover:bg-[#EAF6FD]'
            }`}
          >
            {token}
          </button>
        ) : (
          <span
            key={token}
            aria-hidden="true"
            className="flex h-10 w-8 items-center justify-center text-sm font-bold text-[#64748B]"
          >
            …
          </span>
        ),
      )}

      <button
        type="button"
        aria-label="Trang sau"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className={`${itemBaseClass} bg-white text-[#243B53] shadow-sm hover:bg-[#EAF6FD] disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
