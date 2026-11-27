import { Link } from 'react-router-dom'
import { STUDY_CATEGORY_LABELS, STUDY_CATEGORY_PATHS, type StudyZoneCategory } from '@/features/study-zone/types'

interface StudyZoneTabsProps {
  activeCategory: StudyZoneCategory
}

const CATEGORIES: StudyZoneCategory[] = ['grammar', 'vocabulary', 'listening']

export default function StudyZoneTabs({ activeCategory }: StudyZoneTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Danh mục Study Zone"
      className="grid grid-cols-3 overflow-hidden border border-[#DCEAF3] bg-white shadow-xs"
    >
      {CATEGORIES.map((category, index) => {
        const isActive = category === activeCategory
        return (
          <Link
            key={category}
            to={STUDY_CATEGORY_PATHS[category]}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center justify-center px-3 py-3.5 text-center text-sm font-bold tracking-wide transition sm:py-4 sm:text-base md:text-lg ${
              index > 0 ? 'border-l border-white/60' : ''
            } ${
              isActive
                ? 'bg-[#F26522] text-white'
                : 'bg-[#75BDEB] text-white hover:bg-[#5aaee3]'
            }`}
          >
            {STUDY_CATEGORY_LABELS[category]}
          </Link>
        )
      })}
    </div>
  )
}
