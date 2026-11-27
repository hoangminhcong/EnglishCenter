import { useState } from 'react'
import { ChevronsDown, FileText, Headset, MessageCircle, Phone, X } from 'lucide-react'
import { CONSULTATION_SECTION_ID, centerInfo } from '@/config/center-info'
import { InstagramIcon, ZaloIcon } from '@/components/ui/SocialIcons'

const btn =
  'flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition hover:scale-110'

export default function FloatingContact() {
  const [open, setOpen] = useState(false)

  const scrollToForm = () => {
    document
      .getElementById(CONSULTATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpen(false)
  }

  return (
    <aside
      aria-label="Kênh liên hệ nhanh"
      className="ec-font fixed bottom-24 right-3 z-50 flex flex-col items-center gap-2.5 md:bottom-14"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở liên hệ nhanh"
        className={`${btn} bg-[var(--ec-accent)] md:hidden`}
      >
        {open ? <X className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
      </button>

      <div className={`${open ? 'flex' : 'hidden'} flex-col items-center gap-2.5 md:flex`}>
        <button
          type="button"
          onClick={scrollToForm}
          className="group mb-1 hidden flex-col items-center text-red-500 md:flex"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-tight transition group-hover:scale-105">
            Tư vấn ngay
          </span>
          <ChevronsDown className="ec-bounce mt-0.5 h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={scrollToForm}
          title="Đăng ký tư vấn"
          aria-label="Đăng ký tư vấn"
          className={`${btn} bg-[var(--ec-accent)]`}
        >
          <FileText className="h-4 w-4" />
        </button>
        <a
          href={centerInfo.social.zalo}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat Zalo"
          aria-label="Zalo"
          className={`${btn} bg-[#0088ff]`}
        >
          <ZaloIcon className="text-[11px] tracking-tighter" />
        </a>
        <a
          href={centerInfo.social.messenger}
          target="_blank"
          rel="noopener noreferrer"
          title="Messenger"
          aria-label="Messenger"
          className={`${btn} bg-[#0084ff]`}
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <a
          href={centerInfo.hotlineHref}
          title="Gọi hotline"
          aria-label="Gọi điện"
          className={`${btn} ec-pulse bg-[#16a34a]`}
        >
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={centerInfo.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          aria-label="Instagram"
          className={`${btn} bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600`}
        >
          <InstagramIcon className="h-5 w-5" />
        </a>
      </div>
    </aside>
  )
}
