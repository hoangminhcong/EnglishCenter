import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyBlock } from '@/components/ui/StateViews'
import type { StudyTopic } from '@/features/study-zone/types'

interface StudyTimelineAccordionProps {
  topics: StudyTopic[]
  defaultOpenIndex?: number
}

export default function StudyTimelineAccordion({
  topics,
  defaultOpenIndex = 0,
}: StudyTimelineAccordionProps) {
  const [openTopicIds, setOpenTopicIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (topics[defaultOpenIndex]) {
      initial[topics[defaultOpenIndex].id] = true
    }
    return initial
  })

  const [openSubTopicIds, setOpenSubTopicIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    const firstTopic = topics[defaultOpenIndex]
    if (firstTopic?.subTopics?.[0]) {
      initial[firstTopic.subTopics[0].id] = true
    }
    return initial
  })

  const toggleTopic = (id: string) => {
    setOpenTopicIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleSubTopic = (id: string) => {
    setOpenSubTopicIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="relative flex flex-col gap-5">
      {topics.map((topic, index) => {
        const isOpen = Boolean(openTopicIds[topic.id])
        const isLast = index === topics.length - 1
        const subTopics = topic.subTopics ?? []

        return (
          <div
            key={topic.id}
            className="relative rounded-xl border border-[#DCEAF3] bg-white px-4 py-4 shadow-xs transition sm:px-7 sm:py-5"
          >
            {(isOpen || !isLast) && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-[31px] top-12 z-10 w-[3px] bg-[#75BDEB] sm:left-[43px] ${
                  isLast ? 'bottom-5' : 'bottom-[-24px]'
                }`}
              />
            )}

            <button
              type="button"
              onClick={() => toggleTopic(topic.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
                <span className="relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#75BDEB] text-sm font-bold text-white shadow-2xs">
                  {topic.orderNumber || index + 1}
                </span>

                <h3 className="min-w-0 break-words text-base font-extrabold uppercase tracking-tight text-[#243B53] sm:text-lg">
                  {topic.title}
                </h3>
              </div>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#243B53] transition hover:bg-[#EAF6FD]">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
            </button>

            {isOpen && (
              <div className="mt-4 pl-10 sm:pl-13">
                {subTopics.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {subTopics.map((sub) => {
                      const isSubOpen = Boolean(openSubTopicIds[sub.id])
                      return (
                        <div
                          key={sub.id}
                          className="overflow-hidden rounded-md border border-[#E2E8F0] bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSubTopic(sub.id)}
                            aria-expanded={isSubOpen}
                            className="flex w-full items-center justify-between gap-3 bg-[#F4F6F8] px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-[#243B53] transition hover:bg-[#EAF6FD]/70"
                          >
                            <span className="min-w-0 break-words">{sub.title}</span>
                            {isSubOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-[#243B53]" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[#243B53]" />
                            )}
                          </button>

                          {isSubOpen && (
                            <div className="bg-white p-4">
                              {sub.exercises.length === 0 ? (
                                <EmptyBlock title="Chưa có bài luyện tập." />
                              ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                  {sub.exercises.map((ex) => (
                                    <Link
                                      key={`${sub.id}-${ex.id}-${ex.title}`}
                                      to={`/study-zone/practice/${ex.id}`}
                                      className="flex min-w-0 items-center rounded-md border border-[#75BDEB] bg-white px-4 py-2.5 text-sm font-medium leading-snug text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                                    >
                                      <span className="min-w-0 break-words">{ex.title}</span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-[#E2E8F0] bg-white p-4">
                    {topic.exercises.length === 0 ? (
                      <EmptyBlock title="Chưa có bài luyện tập." />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {topic.exercises.map((exercise) => (
                          <Link
                            key={exercise.id}
                            to={`/study-zone/practice/${exercise.id}`}
                            className="flex min-w-0 items-center rounded-md border border-[#75BDEB] bg-white px-4 py-2.5 text-sm font-medium leading-snug text-[#243B53] transition hover:bg-[#EAF6FD] hover:text-[#2878B8]"
                          >
                            <span className="min-w-0 break-words">{exercise.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
