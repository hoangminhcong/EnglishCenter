import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'

interface Props {
  title: string
  subtitle?: string
  badge?: string
  image?: string
}

export default function PageBanner({ title, subtitle, badge, image }: Props) {
  usePageTitle(title)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(image) && failedSrc !== image

  return (
    <section className="ec-font relative overflow-hidden bg-gradient-to-r from-[#2878B8] to-[#75BDEB] py-12 text-white lg:py-16">
      {showImage && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
          onError={() => setFailedSrc(image ?? null)}
        />
      )}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-white/10" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        {badge && (
          <span className="mb-3 inline-block rounded-full bg-[#F26522] px-3 py-1 text-xs font-bold uppercase tracking-widest">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-extrabold uppercase tracking-wider sm:text-4xl lg:text-[42px]">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>}
      </div>
    </section>
  )
}
