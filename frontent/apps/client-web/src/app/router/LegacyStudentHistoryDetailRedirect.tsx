import { Navigate, useParams } from 'react-router-dom'

export function LegacyStudentHistoryDetailRedirect() {
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  return <Navigate to={`/test-history/${encodeURIComponent(attemptId)}`} replace />
}
