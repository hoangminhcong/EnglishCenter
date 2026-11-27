import { useMemo } from 'react'
import PageBanner from '@/components/ui/PageBanner'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useStudyTopics } from '@/features/study-zone/hooks/useStudyZone'
import StudyZoneTabs from '@/features/study-zone/components/StudyZoneTabs'
import StudyTimelineAccordion from '@/features/study-zone/components/StudyTimelineAccordion'
import { STUDY_CATEGORY_LABELS, type StudyZoneCategory } from '@/features/study-zone/types'

interface StudyZoneCategoryPageProps {
  category: StudyZoneCategory
}

const CATEGORY_META: Record<StudyZoneCategory, { subtitle: string }> = {
  grammar: {
    subtitle:
      'Lộ trình luyện tập ngữ pháp TOEIC trọng tâm từ nền tảng 350+ đến chuyên sâu 800+ với hệ thống bài TEST trắc nghiệm tương tác theo từng chủ điểm.',
  },
  vocabulary: {
    subtitle:
      'Hệ thống bài luyện tập từ vựng TOEIC theo từng chủ đề thông dụng trong đề thi thật, chấm điểm và giải thích chi tiết ngay sau khi nộp bài.',
  },
  listening: {
    subtitle:
      'Kho bài luyện nghe TOEIC Part 1–4 chuẩn cấu trúc đề thi thật với âm thanh trực tiếp từng câu hỏi và đáp án giải thích chi tiết.',
  },
}

export default function StudyZoneCategoryPage({ category }: StudyZoneCategoryPageProps) {
  const { data, loading, error, retry } = useStudyTopics(category)
  const topics = useMemo(() => data ?? [], [data])

  const meta = CATEGORY_META[category]
  const categoryLabel = STUDY_CATEGORY_LABELS[category]

  return (
    <div className="ec-font min-h-screen bg-white pb-16">
      {/* Banner đầu trang STUDY ZONE */}
      <PageBanner
        title="STUDY ZONE"
        badge={`Chuyên mục: ${categoryLabel}`}
        subtitle={meta.subtitle}
        image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400"
      />

      <div className="mx-auto max-w-6xl px-4 pt-8 lg:px-6">
        {/* Thanh 3 Tab chuyển đổi: Ngữ pháp | Từ vựng | Luyện nghe */}
        <StudyZoneTabs activeCategory={category} />

        {/* Danh sách Lộ trình & Bài TEST theo mẫu giao diện */}
        <div className="mt-7">
          {loading && (
            <LoadingBlock label={`Đang tải danh sách ${categoryLabel.toLowerCase()}...`} />
          )}

          {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

          {!loading && !error && topics.length === 0 && (
            <EmptyBlock
              title={`Chưa có nội dung ${categoryLabel.toLowerCase()}`}
              description="Nội dung chuyên mục đang được cập nhật."
            />
          )}

          {!loading && !error && topics.length > 0 && (
            <StudyTimelineAccordion key={category} topics={topics} defaultOpenIndex={0} />
          )}
        </div>
      </div>
    </div>
  )
}
