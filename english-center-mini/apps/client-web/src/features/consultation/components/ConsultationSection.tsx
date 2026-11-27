import { useState } from 'react'
import { ChevronRight, GraduationCap } from 'lucide-react'
import ConsultationForm from '@/features/consultation/components/ConsultationForm'
import { CONSULTATION_SECTION_ID, centerInfo, consultationHighlights } from '@/config/center-info'

const pills = [
  { bg: 'bg-[var(--ec-accent)]', num: 'text-[var(--ec-accent)]', shift: '' },
  { bg: 'bg-[var(--ec-orange)]', num: 'text-[var(--ec-orange)]', shift: 'sm:translate-x-2' },
  { bg: 'bg-[var(--ec-accent)]', num: 'text-[var(--ec-accent)]', shift: '' },
]

export default function ConsultationSection() {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageFailed = !centerInfo.consultationImage || failedSrc === centerInfo.consultationImage

  return (
    <section
      id={CONSULTATION_SECTION_ID}
      className="ec-font ec-clip relative scroll-mt-24 bg-gradient-to-b from-[var(--ec-soft)] via-[#F0F8FE] to-[var(--ec-bg)] py-8 lg:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
            <h2 className="text-2xl font-extrabold uppercase leading-snug tracking-tight text-[var(--ec-accent)] sm:text-3xl lg:text-[2.2rem]">
              Nhận tư vấn lộ trình TOEIC miễn phí
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--ec-orange)] px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow sm:text-sm">
              <span>Tại đây</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[var(--ec-orange)]">
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            <div className="relative mt-6 flex w-full max-w-lg flex-col items-center sm:block">
              <div className="relative w-72 sm:w-80 lg:w-[360px]">
                {!imageFailed ? (
                  <img
                    src={centerInfo.consultationImage}
                    alt="Học viên đạt thành tích TOEIC"
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                    onError={() => setFailedSrc(centerInfo.consultationImage)}
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-[var(--ec-pastel)] shadow-xl">
                    <GraduationCap className="h-24 w-24 text-white" />
                  </div>
                )}
                <div className="absolute bottom-4 left-2 w-32 -rotate-6 rounded-lg border-2 border-white bg-[var(--ec-accent)] p-2 text-white shadow-2xl">
                  <div className="text-[8px] font-bold uppercase tracking-wider text-[#FFB27A]">
                    {centerInfo.name}
                  </div>
                  <div className="mt-0.5 text-[11px] font-extrabold leading-tight">SUBMARINE</div>
                  <div className="text-[7px] text-white/90">TOEIC READING 700-900+</div>
                </div>
              </div>

              <ul className="z-20 mt-5 flex w-full max-w-[18rem] flex-col gap-3.5 sm:absolute sm:right-0 sm:top-8 sm:mt-0 sm:w-72 sm:max-w-none">
                {consultationHighlights.map((text, i) => {
                  const pill = pills[i] ?? pills[0]!
                  return (
                    <li
                      key={text}
                      className={`flex items-center gap-2 rounded-full border border-white/70 px-3.5 py-2 text-left text-white shadow-lg ${pill.bg} ${pill.shift}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black ${pill.num}`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs font-bold uppercase leading-tight tracking-wide">
                        {text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="w-full lg:col-span-6">
            <ConsultationForm />
          </div>
        </div>
      </div>
    </section>
  )
}
