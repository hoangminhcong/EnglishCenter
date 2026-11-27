import { useState } from 'react'
import { CheckCircle2, Clock, Headphones, RotateCcw } from 'lucide-react'
import { Badge, Button, Modal } from '@english-center/ui'
import { projectPublicStudentTestPayload } from '@/features/learning/api/testAuthoringApi'
import type {
  ManagedToeicTestRecord,
  ToeicPartNumber,
} from '@/features/learning/types/testAuthoring.types'

export interface TestPreviewModalProps {
  open: boolean
  test: ManagedToeicTestRecord | null
  onClose: () => void
}

function TestPreviewModalBody({
  test,
  onClose,
}: {
  test: ManagedToeicTestRecord
  onClose: () => void
}) {
  const publicPayload = projectPublicStudentTestPayload(test)
  const defaultPart =
    (publicPayload.parts.find((p) =>
      p.questionGroups.some((g) => g.questions.length > 0),
    )?.partNumber as ToeicPartNumber | undefined) ?? 1

  const [selectedPart, setSelectedPart] = useState<ToeicPartNumber>(defaultPart)
  const [pickedAnswers, setPickedAnswers] = useState<Record<string, string>>({})
  const [showQaAnswerKey, setShowQaAnswerKey] = useState(false)
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null)

  const currentPart =
    publicPayload.parts.find((p) => p.partNumber === selectedPart) ?? publicPayload.parts[0]
  const allQuestions = publicPayload.parts.flatMap((p) =>
    p.questionGroups.flatMap((g) =>
      g.questions.map((q) => ({ ...q, partNumber: p.partNumber as ToeicPartNumber })),
    ),
  )

  const answeredCount = allQuestions.filter((q) => Boolean(pickedAnswers[q.id])).length
  const correctCount = allQuestions.filter((q) => {
    const picked = pickedAnswers[q.id]
    if (!picked) return false
    return test.answerKeys[q.id]?.correctOptionId === picked
  }).length

  const handleNavigateToQuestion = (partNumber: ToeicPartNumber, questionId: string) => {
    setSelectedPart(partNumber)
    setFocusedQuestionId(questionId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`preview-question-${questionId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  }

  return (
    <Modal
      open
      title={`Xem thử đề thi – ${publicPayload.title}`}
      onClose={onClose}
      maxWidthClassName="max-w-5xl"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setPickedAnswers({})
              setShowQaAnswerKey(false)
              setFocusedQuestionId(null)
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Làm mới câu chọn</span>
          </Button>
          <Button variant="secondary" onClick={() => setShowQaAnswerKey((prev) => !prev)}>
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {showQaAnswerKey ? 'Ẩn kết quả chấm thử' : 'Chấm thử & Hiện đáp án'}
            </span>
          </Button>
          <Button onClick={onClose}>Đóng chế độ xem thử</Button>
        </>
      }
    >
      <div className="space-y-4">
        {showQaAnswerKey && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]">
            <div>
              <strong className="text-sm font-extrabold">
                Kết quả chấm thử QA: {correctCount}/{allQuestions.length} câu đúng
              </strong>
              <span className="ml-2 text-[#047857]">
                (Đã chọn {answeredCount}/{allQuestions.length} câu • Đáp án sai đã chọn được tô đỏ)
              </span>
            </div>
            <Badge tone="success">
              Tỷ lệ đúng:{' '}
              {allQuestions.length > 0
                ? `${Math.round((correctCount / allQuestions.length) * 100)}%`
                : '0%'}
            </Badge>
          </div>
        )}

        {/* Thanh Part + Đồng hồ */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCEAF3] bg-white p-3">
          <div className="flex flex-wrap gap-1.5">
            {publicPayload.parts.map((part) => {
              const count = part.questionGroups.reduce((s, g) => s + g.questions.length, 0)
              const active = part.partNumber === currentPart?.partNumber
              return (
                <button
                  key={part.partNumber}
                  type="button"
                  onClick={() => setSelectedPart(part.partNumber as ToeicPartNumber)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-[#2878B8] text-white'
                      : 'border border-[#DCEAF3] bg-[#F8FBFD] text-[#243B53] hover:bg-[#EAF6FD]'
                  }`}
                >
                  Part {part.partNumber} ({count})
                </button>
              )
            })}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF3D6] px-3 py-1.5 text-xs font-extrabold text-[#9E6300]">
            <Clock className="h-3.5 w-3.5" />
            <span>{publicPayload.duration}:00 phút</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Vùng câu hỏi chính */}
          <div className="space-y-4 lg:col-span-9">
            {currentPart && (
              <div className="rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] px-4 py-2.5 text-xs text-[#475569]">
                <strong className="text-[#243B53]">{currentPart.title}:</strong>{' '}
                {currentPart.instructions.join(' ')}
              </div>
            )}

            {currentPart && currentPart.questionGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DCEAF3] p-8 text-center text-sm text-[#64748B]">
                Part này hiện chưa có câu hỏi nào.
              </div>
            ) : (
              currentPart?.questionGroups.map((grp) => {
                const isGroupedPart =
                  currentPart.partNumber === 3 ||
                  currentPart.partNumber === 4 ||
                  currentPart.partNumber === 6 ||
                  currentPart.partNumber === 7
                return (
                  <div
                    key={grp.id}
                    className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 shadow-2xs"
                  >
                    {(grp.groupTitle ||
                      grp.passage ||
                      (grp.passages && grp.passages.length > 0) ||
                      grp.audioUrl ||
                      grp.imageUrl) && (
                      <div className="space-y-2 border-b border-[#EEF4F8] pb-3">
                        {isGroupedPart && grp.groupTitle && (
                          <Badge tone="info">{grp.groupTitle}</Badge>
                        )}
                        {grp.audioUrl && (
                          <div className="rounded-xl bg-[#F5FAFE] p-2.5">
                            <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#2878B8]">
                              <Headphones className="h-3.5 w-3.5" />
                              Âm thanh dùng chung cho nhóm câu hỏi
                            </span>
                            <audio controls src={grp.audioUrl} className="h-9 w-full">
                              Trình duyệt không hỗ trợ audio.
                            </audio>
                          </div>
                        )}
                        {grp.passages && grp.passages.length > 1 ? (
                          <div className="space-y-2">
                            {grp.passages.map((pText, pIdx) => (
                              <div
                                key={`${grp.id}-p-${pIdx}`}
                                className="whitespace-pre-line rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs leading-relaxed text-[#243B53]"
                              >
                                {pText}
                              </div>
                            ))}
                          </div>
                        ) : (
                          grp.passage && (
                            <div className="whitespace-pre-line rounded-xl border border-[#DCEAF3] bg-[#F8FBFD] p-3.5 text-xs leading-relaxed text-[#243B53]">
                              {grp.passage}
                            </div>
                          )
                        )}
                        {grp.imageUrl && (
                          <img
                            src={grp.imageUrl}
                            alt={grp.groupTitle ?? 'Group illustration'}
                            className="max-h-56 rounded-xl object-contain"
                          />
                        )}
                      </div>
                    )}

                  <div className="space-y-3">
                    {grp.questions.map((q) => {
                      const picked = pickedAnswers[q.id]
                      const qaKey = test.answerKeys[q.id]
                      const isFocused = focusedQuestionId === q.id
                      return (
                        <div
                          key={q.id}
                          id={`preview-question-${q.id}`}
                          className={`rounded-xl border bg-[#FCFEFF] p-3.5 transition ${
                            isFocused
                              ? 'border-[#2878B8] ring-2 ring-[#BAE6FD]'
                              : 'border-[#EEF4F8]'
                          }`}
                        >
                          <p className="text-sm font-bold text-[#243B53]">
                            Câu {q.questionNumber}.{' '}
                            {q.questionText || '(Nghe âm thanh và chọn đáp án đúng)'}
                          </p>

                          {q.imageUrl && (
                            <img
                              src={q.imageUrl}
                              alt={`Câu ${q.questionNumber}`}
                              className="mt-2 max-h-48 rounded-lg border border-[#DCEAF3] object-contain"
                            />
                          )}

                          {q.audioUrl && (
                            <audio controls src={q.audioUrl} className="mt-2 h-9 w-full">
                              Trình duyệt không hỗ trợ audio.
                            </audio>
                          )}

                          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {q.options.map((opt) => {
                              const isSelected = picked === opt.id
                              const isCorrect = qaKey?.correctOptionId === opt.id
                              const isWrongPicked = showQaAnswerKey && isSelected && !isCorrect
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    setPickedAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                                  }
                                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                                    showQaAnswerKey && isCorrect
                                      ? 'border-[#1F7A4C] bg-[#E3F5EC] font-bold text-[#1F7A4C]'
                                      : isWrongPicked
                                        ? 'border-[#B93A2E] bg-[#FDECE9] font-bold text-[#B93A2E]'
                                        : isSelected
                                          ? 'border-[#2878B8] bg-[#EAF6FD] font-bold text-[#2878B8]'
                                          : 'border-[#DCEAF3] bg-white hover:bg-[#F8FBFD]'
                                  }`}
                                >
                                  <strong>({opt.label})</strong>{' '}
                                  {opt.text || (
                                    <span className="italic text-[#64748B]">Nghe trong băng</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          {showQaAnswerKey && qaKey && (
                            <div className="mt-2 space-y-1.5 rounded-lg bg-[#F0FDF4] px-3 py-2 text-xs text-[#166534]">
                              <div>
                                <strong>Giải thích QA:</strong>{' '}
                                {qaKey.explanation || 'Chưa nhập lời giải thích.'}
                              </div>
                              {qaKey.transcript?.trim() && (
                                <div className="border-t border-[#BBF7D0] pt-1.5 text-[#14532D]">
                                  <strong>Transcript:</strong> {qaKey.transcript}
                                </div>
                              )}
                              {qaKey.translation?.trim() && (
                                <div className="border-t border-[#BBF7D0] pt-1.5 text-[#166534]">
                                  <strong>Dịch nghĩa:</strong> {qaKey.translation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                )
              })
            )}
          </div>

          {/* Question Navigator */}
          <div className="space-y-3 rounded-2xl border border-[#DCEAF3] bg-white p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#243B53]">
                Bảng câu hỏi ({allQuestions.length})
              </p>
              <span className="text-[11px] font-semibold text-[#64748B]">
                {answeredCount}/{allQuestions.length} đã chọn
              </span>
            </div>

            {showQaAnswerKey && (
              <div className="rounded-xl bg-[#F8FBFD] p-2.5 text-[11px] font-semibold text-[#243B53]">
                Kết quả chấm thử:{' '}
                <strong className="text-[#1F7A4C]">
                  {correctCount}/{allQuestions.length} câu đúng
                </strong>
              </div>
            )}

            <div className="grid grid-cols-5 gap-1.5">
              {allQuestions.map((q) => {
                const picked = pickedAnswers[q.id]
                const answered = Boolean(picked)
                const qaKey = test.answerKeys[q.id]
                const isRight = showQaAnswerKey && answered && qaKey?.correctOptionId === picked
                const isWrong = showQaAnswerKey && answered && qaKey?.correctOptionId !== picked
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleNavigateToQuestion(q.partNumber as ToeicPartNumber, q.id)}
                    className={`flex h-8 items-center justify-center rounded-lg border text-xs font-bold transition ${
                      isRight
                        ? 'border-[#1F7A4C] bg-[#1F7A4C] text-white'
                        : isWrong
                          ? 'border-[#B93A2E] bg-[#B93A2E] text-white'
                          : answered
                            ? 'border-[#2878B8] bg-[#2878B8] text-white'
                            : 'border-[#DCEAF3] bg-[#F8FBFD] text-[#243B53] hover:border-[#75BDEB]'
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function TestPreviewModal({ open, test, onClose }: TestPreviewModalProps) {
  if (!open || !test) return null
  return <TestPreviewModalBody key={test.id} test={test} onClose={onClose} />
}
