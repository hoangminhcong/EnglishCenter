import { useEffect, useMemo, useState } from 'react';
import {
  TOEIC_EXAM_PART_KEYS,
  type AcademicRequestType,
  type ToeicExamPartKey,
} from '@english-center/contracts';
import { formatDateTimeVi } from '@english-center/utils';
import { ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import {
  useCreateSupportRequestMutation,
  useStudentPortalData,
} from '../hooks/useStudentPortal';
import { NoEnrollmentCard } from '../components/NoEnrollmentCard';
import {
  AcademicRequestStatusChip,
  PortalChip,
  PortalProgressBar,
} from '../components/PortalUiBits';
import { usePortalToast } from '../components/portalToastContext';
import {
  SUPPORT_REQUEST_CATEGORIES,
  computePortalWeightedGrades,
  validateSupportRequestInput,
} from '../model/studentPortal.schema';
import {
  ASSESSMENT_CATEGORY_LABELS,
  TOEIC_PART_LABELS,
  type ExamPartAccuracy,
  type OfficialExamRecord,
} from '../model/studentPortal.types';
import { formatFullDateVi } from '../utils/portalDateUtils';

const LISTENING_PARTS: ToeicExamPartKey[] = TOEIC_EXAM_PART_KEYS.slice(
  0,
  4
) as ToeicExamPartKey[];
const READING_PARTS: ToeicExamPartKey[] = TOEIC_EXAM_PART_KEYS.slice(
  4
) as ToeicExamPartKey[];

export function StudentExamResultsPage() {
  const { showToast } = usePortalToast();
  const { data, isLoading, isError, refetch } = useStudentPortalData();
  const createSupportMutation = useCreateSupportRequestMutation();

  const [activeModalType, setActiveModalType] =
    useState<AcademicRequestType | null>(null);
  const [reason, setReason] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [holdUntilDate, setHoldUntilDate] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeModalType) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalType(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalType]);

  const assessmentGrades = useMemo(
    () => data?.assessmentGrades ?? [],
    [data?.assessmentGrades]
  );

  const weightedSummary = useMemo(
    () => computePortalWeightedGrades(assessmentGrades),
    [assessmentGrades]
  );

  if (isLoading) {
    return <LoadingBlock label="Đang tải bảng điểm & yêu cầu học vụ..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải kết quả học tập. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data.hasEnrollment || !data.classInfo) {
    return <NoEnrollmentCard studentName={data.student.fullName} />;
  }

  const { examResults, supportRequests } = data;
  const entryTotal = examResults.entryScore.total;
  const goalTotal = examResults.goalScore.total;

  // Đồng bộ tự động với StudentAssessmentGradeDto ('mid' / 'final') từ Giảng viên nếu examResults chưa điền trực tiếp
  const deriveOfficialFromGrades = (
    cat: 'mid' | 'final'
  ): OfficialExamRecord | null => {
    const matched = assessmentGrades.find(
      (g) =>
        g.category === cat &&
        g.totalScore !== null &&
        g.listeningScore !== null &&
        g.readingScore !== null
    );
    if (!matched || matched.totalScore === null) return null;
    const emptyParts = Object.fromEntries(
      TOEIC_EXAM_PART_KEYS.map((k) => [k, { correct: 0, total: 0 }])
    ) as Record<ToeicExamPartKey, ExamPartAccuracy>;
    return {
      id: matched.id,
      examType: cat,
      examDate: matched.examDate,
      lcScore: matched.listeningScore ?? 0,
      rcScore: matched.readingScore ?? 0,
      totalScore: matched.totalScore,
      isConfirmed: true,
      parts: matched.partBreakdown ?? emptyParts,
    };
  };

  const midTerm = examResults.midTerm ?? deriveOfficialFromGrades('mid');
  const finalTerm = examResults.finalTerm ?? deriveOfficialFromGrades('final');

  const renderPartCell = (partData?: ExamPartAccuracy) => {
    if (!partData || partData.total <= 0) {
      return <span className="text-[#64748B]">Chưa có</span>;
    }
    const percent = Math.round((partData.correct / partData.total) * 100);
    return (
      <div>
        <span className="tabular-nums">
          {partData.correct}/{partData.total} ({percent}%)
        </span>
        <PortalProgressBar percent={percent} />
      </div>
    );
  };

  const renderPartTable = (partKeys: ToeicExamPartKey[]) => (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-[#DCEAF3] text-[#243B53]">
            <th className="p-2.5 font-bold">Phần</th>
            <th className="p-2.5 font-bold">Middle Test</th>
            <th className="p-2.5 font-bold">Final Test</th>
          </tr>
        </thead>
        <tbody>
          {partKeys.map((key) => (
            <tr
              key={key}
              className="border-b border-[#DCEAF3] align-top last:border-b-0"
            >
              <td className="p-2.5">{TOEIC_PART_LABELS[key]}</td>
              <td className="p-2.5">{renderPartCell(midTerm?.parts[key])}</td>
              <td className="p-2.5">{renderPartCell(finalTerm?.parts[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const progressBars: Array<[string, number | null]> = [
    ['Đầu vào', entryTotal],
    ['Middle Test', midTerm?.totalScore ?? null],
    ['Final Test', finalTerm?.totalScore ?? null],
    ['Mục tiêu', goalTotal],
  ];

  const handleOpenModal = (type: AcademicRequestType) => {
    setActiveModalType(type);
    setReason('');
    setContent('');
    setEffectiveDate(data.referenceToday);
    setHoldUntilDate('');
    setContact('');
    setModalError(null);
  };

  const handleSendSupportRequest = async () => {
    if (!activeModalType) return;
    setModalError(null);
    const err = validateSupportRequestInput({ reason, content });
    if (err) {
      setModalError(err);
      return;
    }

    try {
      await createSupportMutation.mutateAsync({
        type: activeModalType,
        reason,
        content,
        effectiveDate: effectiveDate || data.referenceToday,
        holdUntilDate:
          activeModalType === 'hold' && holdUntilDate
            ? holdUntilDate
            : undefined,
        contact,
      });

      setActiveModalType(null);
      showToast('Đã gửi đơn học vụ tới bộ phận Giáo vụ.');
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : 'Không thể gửi yêu cầu học vụ. Vui lòng thử lại.'
      );
    }
  };

  const activeCategory = activeModalType
    ? SUPPORT_REQUEST_CATEGORIES[activeModalType]
    : null;

  return (
    <div>
      {/* 1. Ba khu vực tổng quan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Hồ sơ và điểm đầu vào
          </span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {entryTotal}/990
          </b>
          <span className="text-[13px] text-[#243B53]">
            LC {examResults.entryScore.lc}, RC {examResults.entryScore.rc}. Mục
            tiêu LC {examResults.goalScore.lc}, RC {examResults.goalScore.rc},
            tổng {goalTotal}
          </span>
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Middle Test
            {midTerm ? `, ${formatFullDateVi(midTerm.examDate)}` : ''}
          </span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {midTerm ? `${midTerm.totalScore}/990` : 'Chưa có'}
          </b>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {midTerm ? (
              <>
                <span className="text-[13px] text-[#243B53] tabular-nums">
                  LC {midTerm.lcScore}, RC {midTerm.rcScore}
                </span>
                <PortalChip label="Đã có kết quả" variant="ok" />
              </>
            ) : (
              <span className="text-[13px] text-[#64748B]">
                Chưa cập nhật kết quả.
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Final Test
            {examResults.expectedFinalDate
              ? `, dự kiến ${formatFullDateVi(examResults.expectedFinalDate)}`
              : ''}
          </span>
          <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {finalTerm ? `${finalTerm.totalScore}/990` : 'Chưa có'}
          </b>
          <span className="text-[13px] text-[#64748B] tabular-nums">
            {finalTerm
              ? `LC ${finalTerm.lcScore}, RC ${finalTerm.rcScore}`
              : 'Chưa cập nhật kết quả.'}
          </span>
        </div>
      </div>

      {/* 1B. Bảng điểm học phần & Điểm trung bình trọng số (đồng bộ 1-1 TeacherGradebookPage) */}
      {assessmentGrades.length > 0 ? (
        <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-bold text-[#243B53]">
                Bảng điểm học phần &amp; Điểm trung bình trọng số
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                BTVN 15% • Quiz/TX 15% • Mid 30% • Final 40% (các nhóm chưa chấm
                không tính thành 0)
              </p>
            </div>
            <PortalChip
              label={weightedSummary.completionLabel}
              variant={
                weightedSummary.completionState === 'complete'
                  ? 'ok'
                  : weightedSummary.completionState === 'partial'
                    ? 'bl'
                    : 'muted'
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              [
                'BTVN (15%)',
                weightedSummary.homeworkPercent !== null
                  ? `${weightedSummary.homeworkPercent}%`
                  : 'Chưa chấm',
              ],
              [
                'Quiz / TX (15%)',
                weightedSummary.quizRegularPercent !== null
                  ? `${weightedSummary.quizRegularPercent}%`
                  : 'Chưa chấm',
              ],
              [
                'Giữa khóa (30%)',
                weightedSummary.midPercent !== null
                  ? `${weightedSummary.midPercent}%`
                  : 'Chưa chấm',
              ],
              [
                'Cuối khóa (40%)',
                weightedSummary.finalPercent !== null
                  ? `${weightedSummary.finalPercent}%`
                  : 'Chưa chấm',
              ],
              [
                'TB trọng số học phần',
                weightedSummary.weightedAveragePercent !== null
                  ? `${weightedSummary.weightedAveragePercent}%`
                  : 'Chưa có điểm',
              ],
            ].map(([label, val]) => (
              <div
                key={label}
                className="min-w-0 rounded-[10px] border border-[#DCEAF3] bg-[#F5FAFE] p-3"
              >
                <div className="text-[12.5px] text-[#64748B]">{label}</div>
                <b className="mt-0.5 block text-[18px] font-bold text-[#243B53] tabular-nums">
                  {val}
                </b>
              </div>
            ))}
          </div>

          <div className="mt-3.5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#DCEAF3] text-[#243B53]">
                  <th className="p-2.5 font-bold">Đợt đánh giá</th>
                  <th className="p-2.5 font-bold">Ngày kiểm tra</th>
                  <th className="p-2.5 text-right font-bold">Listening</th>
                  <th className="p-2.5 text-right font-bold">Reading</th>
                  <th className="p-2.5 text-right font-bold">Tổng điểm</th>
                  <th className="p-2.5 font-bold">Nhận xét giảng viên</th>
                </tr>
              </thead>
              <tbody>
                {assessmentGrades.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-[#DCEAF3] align-top last:border-b-0"
                  >
                    <td className="p-2.5">
                      <b className="block text-[#243B53]">
                        {g.assessmentTitle}
                      </b>
                      <span className="text-[12px] text-[#64748B]">
                        {ASSESSMENT_CATEGORY_LABELS[g.category]}
                      </span>
                    </td>
                    <td className="p-2.5 text-[#64748B]">
                      {formatFullDateVi(g.examDate)}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      {g.listeningScore !== null
                        ? `${g.listeningScore}/${g.maxListeningScore}`
                        : 'Chưa chấm'}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      {g.readingScore !== null
                        ? `${g.readingScore}/${g.maxReadingScore}`
                        : 'Chưa chấm'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-[#243B53] tabular-nums">
                      {g.totalScore !== null
                        ? `${g.totalScore}/${g.maxTotalScore}`
                        : 'Chưa đánh giá'}
                    </td>
                    <td className="p-2.5 text-[#64748B]">
                      {g.teacherComment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* 2. Phân tích Listening & Reading */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <h2 className="text-[17px] font-bold text-[#243B53]">
            Phân tích Listening
          </h2>
          {renderPartTable(LISTENING_PARTS)}
        </section>

        <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <h2 className="text-[17px] font-bold text-[#243B53]">
            Phân tích Reading
          </h2>
          {renderPartTable(READING_PARTS)}
        </section>
      </div>

      {/* 3. Biểu đồ tiến bộ điểm tổng */}
      <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Tiến bộ điểm tổng (thang 990)
        </h2>

        <div className="mt-2.5 space-y-2.5">
          {progressBars.map(([label, score]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-[13px]">
                <span>{label}</span>
                <b className="tabular-nums">{score ?? 'Chưa có'}</b>
              </div>
              <PortalProgressBar
                percent={score ? Math.round((score / 990) * 100) : 0}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Yêu cầu Học vụ & Hỗ trợ khóa học (đồng bộ StudentAcademicRequestDto) */}
      <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Đơn từ Học vụ &amp; Hỗ trợ khóa học
        </h2>

        <div className="mt-2.5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(SUPPORT_REQUEST_CATEGORIES).map((cat) => (
            <div
              key={cat.type}
              className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]"
            >
              <h3 className="text-[15.5px] font-bold text-[#243B53]">
                {cat.title}
              </h3>
              <p className="mb-2.5 mt-1 text-[13px] text-[#64748B]">
                {cat.description}
              </p>
              <button
                type="button"
                onClick={() => handleOpenModal(cat.type)}
                className="inline-flex items-center rounded-[10px] bg-[#2878B8] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1F6399]"
              >
                Gửi yêu cầu
              </button>
            </div>
          ))}
        </div>

        <h3 className="mt-[18px] text-[15.5px] font-bold text-[#243B53]">
          Lịch sử đơn học vụ đã gửi
        </h3>
        {supportRequests.length > 0 ? (
          <div className="mt-1 divide-y divide-[#DCEAF3]">
            {supportRequests.map((req) => {
              const reqType = req.requestType ?? req.type;
              const categoryMeta = SUPPORT_REQUEST_CATEGORIES[reqType];
              const submittedLabel = req.submittedAt
                ? formatDateTimeVi(req.submittedAt)
                : req.createdAt;
              const detailText = req.detailNote ?? req.content;

              return (
                <div key={req.id} className="py-3 text-[13px] last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[14px] text-[#243B53]">
                        {categoryMeta.title}
                      </b>
                      {req.requestCode ? (
                        <span className="rounded bg-[#F5FAFE] px-2 py-0.5 text-[12px] font-semibold text-[#2878B8]">
                          {req.requestCode}
                        </span>
                      ) : null}
                    </div>
                    <AcademicRequestStatusChip status={req.status} />
                  </div>

                  <div className="mt-1 text-[#64748B]">
                    Ngày gửi: {submittedLabel}
                    {req.effectiveDate
                      ? ` • Ngày áp dụng: ${formatFullDateVi(req.effectiveDate)}`
                      : ''}
                    {req.targetClassCode
                      ? ` • Lớp đích: ${req.targetClassCode}`
                      : ''}
                  </div>

                  <div className="mt-0.5 text-[#243B53]">
                    <b>{req.reason}:</b> {detailText}
                  </div>

                  {req.resolutionNote || req.reviewedByName ? (
                    <div className="mt-1.5 rounded-[8px] bg-[#F5FAFE] px-3 py-2 text-[12.5px] text-[#243B53]">
                      <b>
                        Phản hồi Giáo vụ
                        {req.reviewedByName ? ` (${req.reviewedByName})` : ''}:
                      </b>{' '}
                      {req.resolutionNote ?? 'Đã tiếp nhận và xử lý hồ sơ.'}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-[#64748B]">
            Bạn chưa gửi yêu cầu nào.
          </p>
        )}
      </section>

      {/* Modal gửi yêu cầu học vụ */}
      {activeCategory ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveModalType(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#243B53]/45 p-4"
        >
          <div className="max-h-[calc(100vh-32px)] w-full max-w-[520px] overflow-auto rounded-[14px] bg-white p-5 shadow-xl">
            <h2 className="text-[17px] font-bold text-[#243B53]">
              {activeCategory.title}
            </h2>
            <p className="mb-3 mt-1 text-[13px] text-[#64748B]">
              {activeCategory.description}
            </p>

            <label className="block text-[13px] text-[#64748B]">
              Loại yêu cầu
              <input
                type="text"
                value={activeCategory.title}
                disabled
                className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-[#F5FAFE] px-3 py-2 text-[15px] text-[#243B53]"
              />
            </label>

            <label className="mt-2.5 block text-[13px] text-[#64748B]">
              Lý do
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
              >
                <option value="">Chọn lý do</option>
                {activeCategory.reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="block text-[13px] text-[#64748B]">
                Ngày áp dụng mong muốn
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                />
              </label>

              {activeModalType === 'hold' ? (
                <label className="block text-[13px] text-[#64748B]">
                  Bảo lưu đến ngày (dự kiến)
                  <input
                    type="date"
                    value={holdUntilDate}
                    onChange={(e) => setHoldUntilDate(e.target.value)}
                    className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                  />
                </label>
              ) : null}
            </div>

            <label className="mt-2.5 block text-[13px] text-[#64748B]">
              Nội dung chi tiết
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mô tả ngắn gọn yêu cầu của bạn"
                className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
              />
            </label>

            <label className="mt-2.5 block text-[13px] text-[#64748B]">
              Thông tin liên hệ (nếu cần)
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Số điện thoại hoặc email"
                className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
              />
            </label>

            <span className="mt-1 block min-h-[18px] text-[13px] text-[#B93A2E]">
              {modalError ?? ''}
            </span>

            <div className="mt-1 flex items-center gap-2.5">
              <button
                type="button"
                disabled={createSupportMutation.isPending}
                onClick={() => void handleSendSupportRequest()}
                className="inline-flex items-center rounded-[10px] bg-[#2878B8] px-4 py-2 text-[15px] font-semibold text-white transition hover:bg-[#1F6399] disabled:opacity-60"
              >
                Gửi yêu cầu
              </button>

              <button
                type="button"
                onClick={() => setActiveModalType(null)}
                className="inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-4 py-2 text-[15px] font-semibold text-[#2878B8] transition hover:brightness-95"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
