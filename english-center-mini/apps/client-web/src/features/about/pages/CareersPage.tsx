import { useMemo, useState } from 'react'
import PageBanner from '@/components/ui/PageBanner'
import FilterBar from '@/components/ui/FilterBar'
import Pagination from '@/components/ui/Pagination'
import JobCard from '@/features/about/components/JobCard'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useCareers } from '@/features/about/hooks/useAboutData'
import { matchText, paginate } from '@/utils/format'

const PAGE_SIZE = 3

export default function CareersPage() {
  const { data, loading, error, retry } = useCareers()
  const [keyword, setKeyword] = useState('')
  const [position, setPosition] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const jobs = useMemo(() => data ?? [], [data])
  const positions = useMemo(() => Array.from(new Set(jobs.map((j) => j.position))), [jobs])
  const jobTypes = useMemo(() => Array.from(new Set(jobs.map((j) => j.type))), [jobs])

  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!position || j.position === position) &&
          (!type || j.type === type) &&
          matchText(`${j.title} ${j.excerpt}`, keyword),
      ),
    [jobs, position, type, keyword],
  )
  const paged = paginate(filtered, page, PAGE_SIZE)

  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <div className="ec-font bg-[#F5FAFE] pb-14">
      <PageBanner
        title="TUYỂN DỤNG"
        badge="Cơ hội nghề nghiệp tại English Center"
        subtitle="Gia nhập đội ngũ English Center cùng triết lý “Chỉ cần cố gắng - Học là đỗ”."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {jobs.length > 0 && (
          <div className="relative z-10 -mt-6">
            <FilterBar
              keyword={keyword}
              onKeywordChange={(v) => reset(() => setKeyword(v))}
              placeholder="Tìm việc làm..."
              selects={[
                {
                  id: 'position',
                  value: position,
                  placeholder: 'Tất cả vị trí',
                  options: positions,
                  onChange: (v) => reset(() => setPosition(v)),
                },
                {
                  id: 'type',
                  value: type,
                  placeholder: 'Hình thức làm việc',
                  options: jobTypes,
                  onChange: (v) => reset(() => setType(v)),
                },
              ]}
            />
          </div>
        )}

        <div className={`${jobs.length > 0 ? 'mt-8' : 'pt-10'} flex flex-col gap-6`}>
          {loading && <LoadingBlock label="Đang tải tin tuyển dụng..." />}
          {!loading && error && <ErrorBlock message={error} onRetry={retry} />}
          {!loading && !error && jobs.length === 0 && (
            <EmptyBlock title="Chưa có tin tuyển dụng." />
          )}
          {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
            <EmptyBlock
              title="Không tìm thấy tin tuyển dụng phù hợp"
              description="Hãy thử từ khóa hoặc bộ lọc khác."
            />
          )}
          {!loading && !error && paged.items.map((j) => <JobCard key={j.id} job={j} />)}
          {!loading && !error && jobs.length > 0 && (
            <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}
