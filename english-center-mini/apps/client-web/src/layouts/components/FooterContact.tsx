import { Mail, MapPin, Phone } from 'lucide-react'
import { centerInfo } from '@/config/center-info'

export default function FooterContact() {
  return (
    <div className="space-y-4 lg:col-span-4">
      <h2 className="text-base font-extrabold uppercase leading-snug tracking-wide text-white ec-shadow-text">
        Thông tin liên hệ
      </h2>

      <div className="space-y-2.5">
        <a
          href={centerInfo.hotlineHref}
          className="flex items-center gap-2.5 text-[13.5px] font-bold hover:underline"
        >
          <Phone className="h-4 w-4 shrink-0" />
          <span>Hotline tư vấn: {centerInfo.hotline}</span>
        </a>
        <a
          href={`mailto:${centerInfo.email}`}
          className="flex items-center gap-2.5 font-semibold hover:underline"
        >
          <Mail className="h-4 w-4 shrink-0" />
          <span>{centerInfo.email}</span>
        </a>
        <div className="flex items-start gap-2.5 font-semibold">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{centerInfo.address}</span>
        </div>
      </div>

      <div className="pt-2">
        <h3 className="mb-1.5 text-sm font-extrabold uppercase tracking-wide">Thời gian làm việc</h3>
        <div className="space-y-1 text-xs sm:text-[13px]">
          {centerInfo.workingHours.map((w) => (
            <p key={w.label}>
              <strong>{w.label}:</strong> {w.time} <em>({w.note})</em>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
