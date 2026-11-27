import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useTestHistoryDetail } from '@/features/test-online/hooks/useTestHistory'
import TestAttemptReviewView from '@/features/test-online/components/TestAttemptReviewView'

export default function TestHistoryDetailPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const { data, loading, error, retry } = useTestHistoryDetail(attemptId)

  const attempt = data?.attempt ?? null
  const result = data?.result ?? null
  const test = data?.test ?? null

  return (
    <div className="ec-reading-font min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-7 lg:px-6">
        <div className="mb-4">
          <Link
            to="/test-history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#243B53] hover:text-[#2878B8]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Lịch sử làm bài</span>
          </Link>
        </div>

        {loading && <LoadingBlock label="Đang tải chi tiết lượt thi..." />}

        {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

        {!loading && !error && (!attempt || !result) && (
          <EmptyBlock
            title="Không tìm thấy bản ghi lịch sử"
            description="Lượt thi này không tồn tại hoặc đang trong quá trình làm bài chưa nộp."
          />
        )}

        {!loading && !error && attempt && result && (
          <TestAttemptReviewView
            result={result}
            test={test}
            attempt={attempt}
            onRetakeTest={() => navigate(`/test-online/${attempt.testSlug}`)}
          />
        )}
      </div>
    </div>
  )
}
