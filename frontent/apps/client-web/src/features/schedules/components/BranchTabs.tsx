import type { ScheduleBranch } from '@/features/schedules/types'

interface BranchTabsProps {
  branches: ScheduleBranch[]
  selectedBranchId: string
  onSelectBranch: (branchId: string) => void
}

export default function BranchTabs({ branches, selectedBranchId, onSelectBranch }: BranchTabsProps) {
  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Chọn cơ sở đào tạo"
        className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 sm:gap-3"
      >
        {branches.map((branch) => {
          const isActive = branch.id === selectedBranchId
          return (
            <button
              key={branch.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectBranch(branch.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150 sm:px-5 ${
                isActive
                  ? 'bg-[#F26522] font-bold text-white shadow-sm'
                  : 'bg-white font-semibold text-[#243B53] hover:bg-[#EAF6FD] hover:text-[#2878B8]'
              }`}
            >
              {branch.shortLabel}
            </button>
          )
        })}
      </div>
      {/* Thanh viền xanh dương dưới hàng Tab giống thiết kế tham khảo */}
      <div className="h-[3px] w-full rounded-full bg-[#75BDEB]" />
    </div>
  )
}
