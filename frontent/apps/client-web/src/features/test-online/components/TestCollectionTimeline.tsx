import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronUp, Flame } from 'lucide-react'
import type { Test } from '@/features/test-online/types/test.types'

interface TestCollectionTimelineProps {
  tests: Test[]
  headingTitle?: string
}

/**
 * Hiển thị bộ đề thi theo lộ trình nhóm bộ đề (Collection Group).
 */
export function TestCollectionTimeline({
  tests,
  headingTitle = 'TOEIC LISTENING & READING - FULL TEST',
}: TestCollectionTimelineProps) {
  const groups = Array.from(new Set(tests.map((t) => t.collectionGroup)))
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) init[g] = true
    return init
  })

  return (
    <div className="relative flex flex-col gap-5">
      <div className="relative flex items-center gap-4 rounded-lg border border-[#DCEAF3] bg-white px-5 py-3.5 shadow-2xs">
        {groups.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-24px] left-[33px] top-10 z-10 w-[3px] bg-[#75BDEB]"
          />
        )}
        <span className="relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#75BDEB]" />
        <h2 className="text-base font-extrabold uppercase tracking-wide text-[#243B53] sm:text-[17px]">
          {headingTitle}
        </h2>
      </div>

      {groups.map((groupName, idx) => {
        const groupTests = tests.filter((t) => t.collectionGroup === groupName)
        const isOpen = Boolean(openGroups[groupName])
        const isLast = idx === groups.length - 1

        return (
          <div
            key={groupName}
            className="relative rounded-lg border border-[#DCEAF3] bg-white p-5 shadow-2xs sm:p-6"
          >
            {(isOpen || !isLast) && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-[33px] top-12 z-10 w-[3px] bg-[#75BDEB] ${
                  isLast ? 'bottom-5' : 'bottom-[-24px]'
                }`}
              />
            )}

            <button
              type="button"
              onClick={() => setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-4">
                <span className="relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#75BDEB] text-xs font-extrabold text-white">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-[#F26522]">{groupName}</span>
                  {groupName.toLowerCase().includes('new') && (
                    <Flame className="h-5 w-5 fill-[#F26522] text-[#F26522]" />
                  )}
                </div>
              </div>

              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[#75BDEB] hover:bg-[#EAF6FD]">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
            </button>

            {isOpen && (
              <div className="mt-5 grid grid-cols-1 gap-3.5 pl-9 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:pl-11">
                {groupTests.map((test) => (
                  <Link
                    key={test.id}
                    to={`/test-online/${test.slug}`}
                    className="group flex flex-col justify-between rounded-lg border border-[#75BDEB] bg-white px-4 py-3.5 transition hover:bg-[#F5FAFE] hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold uppercase text-[#243B53] group-hover:text-[#2878B8]">
                        {test.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#243B53] transition group-hover:translate-x-0.5 group-hover:text-[#2878B8]" />
                    </div>
                    <p className="mt-1.5 text-xs text-[#4A5568]">
                      {test.attemptsCount.toLocaleString('vi-VN')} lượt hoàn thành
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TestCollectionTimeline
