import { MapPin, Phone } from 'lucide-react'
import type { Branch } from '@/features/about/types'

interface Props {
  branches: Branch[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function BranchList({ branches, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col bg-white">
      <div className="border-b border-[#DCEAF3] bg-[#F5FAFE] px-5 py-3.5 text-center text-sm text-[#718096]">
        Tìm được <span className="font-bold text-[#243B53]">{branches.length}</span> cơ sở
      </div>

      <ul className="max-h-[520px] divide-y divide-[#DCEAF3] overflow-y-auto">
        {branches.map((b) => {
          const active = b.id === selectedId
          return (
            <li
              key={b.id}
              className={`border-l-4 p-4 transition ${active ? 'border-[#2878B8] bg-[#EAF6FD]' : 'border-transparent hover:bg-[#F5FAFE]'}`}
            >
              <h3 className="text-sm font-bold text-[#243B53]">{b.name}</h3>
              <p className="mt-1.5 flex gap-2 text-xs leading-relaxed text-[#64748B]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2878B8]" />
                {b.address}
              </p>
              {b.phone.trim() && (
                <a
                  href={`tel:${b.phone.replace(/\s+/g, '')}`}
                  className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-[#243B53] hover:text-[#2878B8]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#2878B8]" />
                  {b.phone}
                </a>
              )}
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                className={`mt-3 rounded-md px-4 py-1.5 text-xs font-bold uppercase transition ${
                  active ? 'bg-[#2878B8] text-white' : 'border border-[#2878B8] text-[#2878B8] hover:bg-[#2878B8] hover:text-white'
                }`}
              >
                {active ? 'Đang xem' : 'Xem bản đồ'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
