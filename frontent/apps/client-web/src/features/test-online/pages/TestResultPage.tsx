import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews'
import { useTestAttemptResult } from '@/features/test-online/hooks/useTestAttempt'
import TestAttemptReviewView from '@/features/test-online/components/TestAttemptReviewView'

export default function TestResultPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const { data, loading, error, retry } = useTestAttemptResult(attemptId)

  const result = data?.result ?? null
  const test = data?.test ?? null
  const attempt = data?.attempt ?? null

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

        {loading && <LoadingBlock label="Đang tải kết quả chấm điểm..." />}

        {!loading && error && <ErrorBlock message={error} onRetry={retry} />}

        {!loading && !error && !result && (
          <EmptyBlock
            title="Không tìm thấy kết quả bài thi"
            description="Lượt thi này chưa được nộp hoặc mã lượt thi không tồn tại."
          />
        )}

        {!loading && !error && result && (
          <TestAttemptReviewView
            result={result}
            test={test}
            attempt={attempt}
            onRetakeTest={() => navigate(`/test-online/${result.testSlug}`)}
          />
        )}
      </div>
    </div>
  )
}
