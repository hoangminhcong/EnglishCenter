import { centerInfo } from '@/config/center-info'
import ConsultationSection from '@/features/consultation/components/ConsultationSection'
import FloatingContact from '@/layouts/components/FloatingContact'
import BackToTop from '@/layouts/components/BackToTop'
import FooterAbout from '@/layouts/components/FooterAbout'
import FooterContact from '@/layouts/components/FooterContact'
import FooterSocial from '@/layouts/components/FooterSocial'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <>
      <ConsultationSection />

      <footer className="ec-font ec-clip w-full border-t border-[#111827]/20 bg-[var(--ec-main)] pb-8 pt-12 text-[#111827]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 text-[13px] leading-relaxed md:grid-cols-2 lg:grid-cols-12">
            <FooterAbout />
            <FooterContact />
            <FooterSocial />
          </div>
          <div className="mt-10 border-t border-[#111827]/30 pt-4 text-center text-xs">
            © {CURRENT_YEAR} {centerInfo.name}. {centerInfo.slogan}.
          </div>
        </div>
      </footer>

      <FloatingContact />
      <BackToTop />
    </>
  )
}
