import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { centerInfo } from '@/config/center-info'
import { useBranches } from '@/features/about/hooks/useAboutData'

export default function FooterAbout() {
  const { data } = useBranches({ scope: 'map' })
  const footerBranches = (data ?? []).slice(0, 5)

  return (
    <div className="space-y-3.5 lg:col-span-4">
      <h2 className="text-base font-extrabold uppercase tracking-wide text-white ec-shadow-text">
        {centerInfo.name}
      </h2>
      <p className="font-semibold italic">“{centerInfo.slogan}”</p>
      <p>{centerInfo.intro}</p>

      {footerBranches.length > 0 && (
        <ul className="space-y-2">
          {footerBranches.map((b) => (
            <li key={b.id}>
              <strong>{b.shortLabel}:</strong> {b.address}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <Link
          to="/about/branches"
          className="inline-flex items-center gap-1.5 rounded border border-[#111827] px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[#111827] hover:text-white"
        >
          Xem bản đồ cơ sở <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
