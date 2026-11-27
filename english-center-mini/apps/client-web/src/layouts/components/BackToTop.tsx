import { ChevronUp } from 'lucide-react'

export default function BackToTop() {
  return (
    <button
      type="button"
      aria-label="Về đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-gray-700 shadow-md transition hover:bg-white hover:text-[var(--ec-accent)]"
    >
      <ChevronUp className="h-4 w-4" />
    </button>
  )
}
