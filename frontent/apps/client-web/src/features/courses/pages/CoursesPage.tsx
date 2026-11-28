import { useMemo, useState } from 'react'
import PageBanner from '@/components/ui/PageBanner'
import FilterBar from '@/components/ui/FilterBar'
import Pagination from '@/components/ui/Pagination'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useCourses } from '@/features/courses/hooks/useCourses'
import CourseList from '@/features/courses/components/CourseList'
import { CONSULTATION_SECTION_ID } from '@/config/center-info'
import { matchText, paginate } from '@/utils/format'
import type { Course } from '@/features/courses/types'

const PAGE_SIZE = 6

type SortOption = 'default' | 'name-asc' | 'name-desc'

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Thứ tự đề xuất',
  'name-asc': 'Tên khóa học (A → Z)',
  'name-desc': 'Tên khóa học (Z → A)',
}

export default function CoursesPage() {
  const { data, loading, error, retry } = useCourses()

  const [keyword, setKeyword] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [sortLabel, setSortLabel] = useState('')
  const [page, setPage] = useState(1)

  const courses = useMemo(() => data ?? [], [data])

  const targetOptions = useMemo(
    () => Array.from(new Set(courses.map((c) => c.targetScore).filter(Boolean))),
    [courses],
  )

  const filteredAndSorted = useMemo(() => {
    const matched = courses.filter((course) => {
      if (targetFilter && course.targetScore !== targetFilter) return false
      const searchable = `${course.name} ${course.code} ${course.targetScore} ${course.shortDescription ?? ''} ${course.description}`
      return matchText(searchable, keyword)
    })

    const sortKey = (Object.entries(SORT_LABELS).find(([, label]) => label === sortLabel)?.[0] ??
      'default') as SortOption

    return [...matched].sort((a, b) => {
      if (sortKey === 'name-asc') return a.name.localeCompare(b.name, 'vi')
      if (sortKey === 'name-desc') return b.name.localeCompare(a.name, 'vi')
      return a.displayOrder - b.displayOrder
    })
  }, [courses, targetFilter, keyword, sortLabel])

  const paged = useMemo(
    () => paginate(filteredAndSorted, page, PAGE_SIZE),
    [filteredAndSorted, page],
  )

  const scrollToConsultation = (_course: Course) => {
    document
      .getElementById(CONSULTATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetFilters = () => {
    setKeyword('')
    setTargetFilter('')
    setSortLabel('')
    setPage(1)
  }

  return (
    <main className="ec-font bg-[#F5FAFE]">
      <PageBanner
        title="CÁC KHÓA HỌC TOEIC"
        badge="Lộ trình đào tạo chuẩn"
        subtitle="Hệ thống các khóa học luyện thi TOEIC bài bản từ xây nền đến chinh phục mục tiêu 700+ TOEIC."
        image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400"
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {courses.length > 0 && (
          <div className="relative z-10 -mt-6">
            <FilterBar
              keyword={keyword}
              onKeywordChange={(v) => {
                setKeyword(v)
                setPage(1)
              }}
              placeholder="Tìm kiếm tên khóa học, mức điểm mục tiêu..."
              selects={[
                ...(targetOptions.length > 0
                  ? [
                      {
                        id: 'targetScore',
                        value: targetFilter,
                        placeholder: 'Mức điểm mục tiêu',
                        options: targetOptions,
                        onChange: (v: string) => {
                          setTargetFilter(v)
                          setPage(1)
                        },
                      },
                    ]
                  : []),
                {
                  id: 'sort',
                  value: sortLabel,
                  placeholder: 'Sắp xếp khóa học',
                  options: [SORT_LABELS['name-asc'], SORT_LABELS['name-desc']],
                  onChange: (v: string) => {
                    setSortLabel(v)
                    setPage(1)
                  },
                },
              ]}
            />
          </div>
        )}

        <div className={courses.length > 0 ? 'mt-8' : 'pt-10'}>
          {loading && <LoadingBlock label="Đang tải danh sách khóa học..." />}
          {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

          {!loading && !error && courses.length === 0 && (
            <EmptyBlock title="Chưa có khóa học." />
          )}

          {!loading && !error && courses.length > 0 && filteredAndSorted.length === 0 && (
            <EmptyBlock
              title="Không tìm thấy khóa học phù hợp"
              description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn mức điểm mục tiêu khác."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 rounded-md bg-[#2878B8] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#1F6399]"
                >
                  Xóa bộ lọc
                </button>
              }
            />
          )}

          {!loading && !error && paged.items.length > 0 && (
            <>
              <CourseList courses={paged.items} onConsultClick={scrollToConsultation} />
              <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
