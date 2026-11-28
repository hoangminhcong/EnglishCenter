import { useState } from 'react'
import { Camera, MessageCircle, Share2 } from 'lucide-react'
import { centerInfo } from '@/config/center-info'
import { FacebookIcon, InstagramIcon, ZaloIcon } from '@/components/ui/SocialIcons'

export default function FooterSocial() {
  const { fanpage, social, name } = centerInfo
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const activityFailed = !fanpage.activityImage || failedSrc === fanpage.activityImage

  const links = [
    { label: 'Facebook', href: social.facebook, icon: <FacebookIcon className="h-5 w-5" /> },
    { label: 'Zalo', href: social.zalo, icon: <ZaloIcon className="text-[11px]" /> },
    { label: 'Messenger', href: social.messenger, icon: <MessageCircle className="h-5 w-5" /> },
    { label: 'Instagram', href: social.instagram, icon: <InstagramIcon className="h-5 w-5" /> },
  ]

  return (
    <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-4">
      <h2 className="text-base font-extrabold uppercase tracking-wide text-white ec-shadow-text">
        Fanpage {name}
      </h2>

      <div className="overflow-hidden rounded-lg bg-white text-[#243B53] shadow-md">
        <div
          className="relative flex min-h-[75px] items-center justify-between bg-gradient-to-r from-[#2878B8] to-[#75BDEB] p-3 text-white"
          style={
            fanpage.coverImage
              ? { backgroundImage: `url(${fanpage.coverImage})`, backgroundSize: 'cover' }
              : undefined
          }
        >
          <div>
            <span className="text-xs font-black text-[#FFB27A]">{name}</span>
            <p className="text-[11px] font-bold leading-tight">{fanpage.coverTitle}</p>
            <p className="text-[9px] font-medium text-white/90">{fanpage.coverSubtitle}</p>
          </div>
          <FacebookIcon className="h-7 w-7 text-white/90" />
        </div>

        <div className="flex items-center gap-2.5 border-t border-[#DCEAF3] bg-[#F5FAFE] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#2878B8] text-xs font-black text-white">
            EC
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight text-[#2878B8]">{fanpage.name}</h4>
            <p className="text-[11px] text-[#718096]">{fanpage.followers}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#DCEAF3] bg-[#EAF6FD] px-3 py-2 text-xs font-semibold text-[#243B53]">
          <a
            href={social.facebook}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1 transition hover:bg-[#A7D8F5]"
          >
            <FacebookIcon className="h-3.5 w-3.5 text-[#2878B8]" /> Theo dõi Trang
          </a>
          <a
            href={social.facebook}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1 transition hover:bg-[#A7D8F5]"
          >
            <Share2 className="h-3.5 w-3.5" /> Chia sẻ
          </a>
        </div>
      </div>

      <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-white/25">
        {!activityFailed ? (
          <img
            src={fanpage.activityImage}
            alt="Hoạt động trung tâm"
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(fanpage.activityImage)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-[#111827]">
            <Camera className="h-6 w-6" />
            <span className="text-xs">Hình ảnh hoạt động trung tâm</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            aria-label={l.label}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2878B8] transition hover:-translate-y-1 hover:bg-[#A7D8F5]"
          >
            {l.icon}
          </a>
        ))}
      </div>

      <div className="pt-1">
        <a
          href={social.facebook}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded border border-[#111827] bg-[#2878B8] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow transition hover:bg-[#1f5f94]"
        >
          Xem Fanpage
        </a>
      </div>
    </div>
  )
}
