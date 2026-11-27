import { formatDate } from '@/utils/format'
import ScheduleStatusBadge from '@/features/schedules/components/ScheduleStatusBadge'
import type { PublicScheduleItem } from '@/features/schedules/types'

interface ScheduleTableProps {
  items: PublicScheduleItem[]
  startIndex: number
  onConsultClick: (schedule: PublicScheduleItem) => void
}

function formatStudyTime(startTime: string, endTime: string): string {
  if (!endTime) return startTime
  return `${startTime} - ${endTime}`
}

export default function ScheduleTable({ items, startIndex, onConsultClick }: ScheduleTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#DCEAF3] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="bg-[#75BDEB] text-xs font-bold uppercase tracking-wider text-white sm:text-[13px]">
              <th scope="col" className="w-14 px-3 py-3.5 text-center">
                STT
              </th>
              <th scope="col" className="px-4 py-3.5">
                Tên khóa học
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Lớp
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Ngày khai giảng
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Lịch học
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Thời gian
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3.5 text-center">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#DCEAF3] bg-white text-sm text-[#243B53]">
            {items.map((item, idx) => {
              const stt = String(startIndex + idx + 1).padStart(2, '0')
              const displayDate = item.startDateDisplay ?? (item.startDate ? formatDate(item.startDate) : 'Linh hoạt')
              const displayTime = formatStudyTime(item.startTime, item.endTime)
              const isDisabled = item.status === 'cancelled'

              return (
                <tr key={item.id} className="transition-colors hover:bg-[#EAF6FD]/60">
                  <td className="px-3 py-4 text-center text-xs font-semibold text-[#64748B]">{stt}</td>

                  <td className="px-4 py-4">
                    <div className="font-bold text-[#243B53]">{item.courseName}</div>
                    {item.courseSubtitle && (
                      <div className="mt-0.5 text-xs font-medium text-[#64748B]">{item.courseSubtitle}</div>
                    )}
                  </td>

                  <td className="px-3 py-4 text-center">
                    <div className="font-semibold text-[#243B53]">{item.classTypeLabel}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{item.studyMode}</div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-center font-semibold text-[#243B53]">
                    {displayDate}
                  </td>

                  <td className="px-3 py-4 text-center text-[#64748B]">{item.studyDays}</td>

                  <td className="whitespace-nowrap px-3 py-4 text-center text-[#64748B]">{displayTime}</td>

                  <td className="px-3 py-4 text-center">
                    <ScheduleStatusBadge status={item.status} />
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onConsultClick(item)}
                      className="whitespace-nowrap rounded border border-[#75BDEB] bg-white px-4 py-1.5 text-xs font-semibold text-[#2878B8] transition-colors hover:bg-[#2878B8] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Nhận tư vấn
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
