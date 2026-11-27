interface MonthSelectorProps {
  selectedMonth: number
  onSelectMonth: (month: number) => void
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function MonthSelector({ selectedMonth, onSelectMonth }: MonthSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-5">
      <span className="shrink-0 text-sm font-semibold text-[#243B53]">Chọn tháng:</span>

      <div role="group" aria-label="Chọn tháng khai giảng" className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {MONTHS.map((month) => {
          const isSelected = month === selectedMonth

          return (
            <button
              key={month}
              type="button"
              aria-pressed={isSelected}
              title={`Tháng ${month}`}
              onClick={() => onSelectMonth(month)}
              className="group relative flex h-9 w-9 items-center justify-center focus:outline-none"
            >
              {isSelected ? (
                <span className="flex h-7 w-7 rotate-45 items-center justify-center rounded-[3px] bg-[#F26522] text-xs font-extrabold text-white shadow-sm transition-transform">
                  <span className="-rotate-45">{month}</span>
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded border border-[#DCEAF3] bg-white text-xs font-semibold text-[#243B53] transition-colors group-hover:border-[#75BDEB] group-hover:bg-[#EAF6FD] group-hover:text-[#2878B8]">
                  {month}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
