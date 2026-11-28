import { ExternalLink, Navigation } from 'lucide-react'
import type { Branch } from '@/features/about/types'

export default function BranchMap({ branch }: { branch: Branch }) {
  const embedUrl = `https://maps.google.com/maps?q=${branch.lat},${branch.lng}&z=16&output=embed`
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`
  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`

  return (
    <div className="relative h-[420px] w-full bg-[#EAF6FD] lg:h-[572px]">
      <iframe
        key={branch.id}
        title={`Bản đồ ${branch.name}`}
        src={embedUrl}
        className="h-full w-full border-0"
        loading="eager"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="absolute left-3 top-3 z-10 w-[min(20rem,calc(100%-1.5rem))] rounded-xl border border-[#DCEAF3] bg-white p-4 shadow-xl">
        <h2 className="text-sm font-bold text-[#243B53]">English Center – {branch.name}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#718096]">{branch.address}</p>
        <div className="mt-3 flex gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2878B8] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1f5f94]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở trong Maps
          </a>
          <a
            href={directionUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chỉ đường"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCEAF3] bg-[#EAF6FD] text-[#2878B8] transition hover:bg-[#A7D8F5]"
          >
            <Navigation className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
