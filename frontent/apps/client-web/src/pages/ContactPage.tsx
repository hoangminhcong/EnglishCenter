import { Link } from 'react-router-dom'
import { Clock, Mail, MapPin, Phone, ChevronRight } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { centerInfo } from '@/config/center-info'

export default function ContactPage() {
  return (
    <main className="ec-font bg-[#F5FAFE] pb-16">
      <PageBanner
        title="LIÊN HỆ VỚI CHÚNG TÔI"
        badge="Hỗ trợ học viên"
        subtitle="Đội ngũ tư vấn English Center luôn sẵn sàng giải đáp mọi thắc mắc về lộ trình học và lịch khai giảng."
        image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400"
      />

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF6FD] text-[#2878B8]">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#243B53]">Trụ sở chính</h2>
            <p className="mt-2 text-sm text-[#718096]">{centerInfo.address}</p>
            <Link
              to="/about/branches"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#2878B8] hover:underline"
            >
              Xem toàn bộ hệ thống cơ sở <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF6FD] text-[#2878B8]">
              <Phone className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#243B53]">Hotline &amp; Email</h2>
            <p className="mt-2 text-sm text-[#718096]">
              Điện thoại:{' '}
              <a
                href={centerInfo.hotlineHref}
                className="font-bold text-[#243B53] hover:text-[#2878B8]"
              >
                {centerInfo.hotline}
              </a>
            </p>
            <p className="mt-1.5 text-sm text-[#718096]">
              Email:{' '}
              <a
                href={`mailto:${centerInfo.email}`}
                className="font-bold text-[#243B53] hover:text-[#2878B8]"
              >
                {centerInfo.email}
              </a>
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#2878B8]">
              <Mail className="h-3.5 w-3.5" /> Phản hồi nhanh trong giờ hành chính
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCEAF3] bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF6FD] text-[#2878B8]">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#243B53]">Thời gian làm việc</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-[#718096]">
              {centerInfo.workingHours.map((w) => (
                <li key={w.label}>
                  <strong className="text-[#243B53]">{w.label}:</strong> {w.time} ({w.note})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
