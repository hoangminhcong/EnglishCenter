import { useMemo, useState } from 'react'
import PageBanner from '@/components/ui/PageBanner'
import FilterBar from '@/components/ui/FilterBar'
import BranchList from '@/features/about/components/BranchList'
import BranchMap from '@/features/about/components/BranchMap'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useBranches } from '@/features/about/hooks/useAboutData'
import { matchText } from '@/utils/format'

interface Filters {
  keyword: string
  city: string
  district: string
}

const emptyFilters: Filters = { keyword: '', city: '', district: '' }

export default function BranchesPage() {
  const { data, loading, error, retry } = useBranches({ scope: 'map' })
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [applied, setApplied] = useState<Filters>(emptyFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const branches = useMemo(() => data ?? [], [data])
  const cities = useMemo(() => Array.from(new Set(branches.map((b) => b.city))), [branches])
  const districts = useMemo(
    () =>
      Array.from(
        new Set(branches.filter((b) => !draft.city || b.city === draft.city).map((b) => b.district)),
      ),
    [branches, draft.city],
  )

  const filtered = useMemo(
    () =>
      branches.filter(
        (b) =>
          (!applied.city || b.city === applied.city) &&
          (!applied.district || b.district === applied.district) &&
          matchText(`${b.name} ${b.address}`, applied.keyword),
      ),
    [branches, applied],
  )

  const selected = filtered.find((b) => b.id === selectedId) ?? filtered[0] ?? null

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <PageBanner
        title="HỆ THỐNG CƠ SỞ"
        subtitle="Khám phá các cơ sở đào tạo của English Center"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {branches.length > 0 && (
          <div className="relative z-10 -mt-6">
            <FilterBar
              keyword={draft.keyword}
              onKeywordChange={(keyword) => setDraft((d) => ({ ...d, keyword }))}
              placeholder="Nhập tên cơ sở..."
              selects={[
                {
                  id: 'city',
                  value: draft.city,
                  placeholder: 'Tỉnh / Thành phố',
                  options: cities,
                  onChange: (city) => setDraft((d) => ({ ...d, city, district: '' })),
                },
                {
                  id: 'district',
                  value: draft.district,
                  placeholder: 'Quận / Huyện',
                  options: districts,
                  onChange: (district) => setDraft((d) => ({ ...d, district })),
                },
              ]}
              submitLabel="Tìm cơ sở"
              onSubmit={() => setApplied(draft)}
            />
          </div>
        )}

        <div className={branches.length > 0 ? 'mt-6' : 'pt-10'}>
          {loading && <LoadingBlock label="Đang tải danh sách cơ sở..." />}
          {!loading && error && <ErrorBlock message={error} onRetry={retry} />}
          {!loading && !error && branches.length === 0 && (
            <EmptyBlock title="Chưa có cơ sở." />
          )}
          {!loading && !error && branches.length > 0 && filtered.length === 0 && (
            <EmptyBlock
              title="Không tìm thấy cơ sở phù hợp"
              description="Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setDraft(emptyFilters)
                    setApplied(emptyFilters)
                  }}
                  className="mt-2 rounded-md bg-[#2878B8] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#1F6399]"
                >
                  Xóa bộ lọc
                </button>
              }
            />
          )}
          {!loading && !error && selected && (
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-[#DCEAF3] bg-white shadow-lg lg:grid-cols-12">
              <div className="border-b border-[#DCEAF3] lg:col-span-4 lg:border-b-0 lg:border-r">
                <BranchList branches={filtered} selectedId={selected.id} onSelect={setSelectedId} />
              </div>
              <div className="lg:col-span-8">
                <BranchMap branch={selected} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
