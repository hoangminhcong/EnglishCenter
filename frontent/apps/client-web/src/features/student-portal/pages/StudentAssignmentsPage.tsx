import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { StudentAttendanceViewStatus } from '@english-center/contracts';
import { toSafeHttpUrl } from '@english-center/utils';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { formatDateTimeVi } from '@/utils/format';
import {
  useStudentPortalData,
  useSubmitDemoScoreMutation,
  useSubmitHomeworkMutation,
} from '../hooks/useStudentPortal';
import { NoEnrollmentCard } from '../components/NoEnrollmentCard';
import {
  AssignmentStatusChip,
  AttendanceStatusChip,
  PortalChip,
} from '../components/PortalUiBits';
import { usePortalToast } from '../components/portalToastContext';
import {
  resolveStudentAttendanceStatus,
  validateDemoScoreSubmission,
  validateHomeworkSubmission,
} from '../model/studentPortal.schema';
import type { AssignmentWithSubmission } from '../model/studentPortal.types';
import { formatShortWeekdayDate } from '../utils/portalDateUtils';

type AssignmentFilterKey =
  | 'all'
  | 'todo'
  | 'done'
  | 'submitted'
  | 'passed'
  | 'failed'
  | 'demo';

const ASSIGNMENT_FILTERS: Array<{ key: AssignmentFilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'todo', label: 'Cần nộp' },
  { key: 'done', label: 'Đã hoàn thiện' },
  { key: 'submitted', label: 'Chờ kiểm tra' },
  { key: 'passed', label: 'Đã đạt' },
  { key: 'failed', label: 'Chưa đạt' },
  { key: 'demo', label: 'Demo Test' },
];

interface SubmissionDraftState {
  assignmentId: string;
  driveLink: string;
  answerNote: string;
  lc: string;
  rc: string;
}

function buildInitialDraftForAssignment(
  item: AssignmentWithSubmission
): SubmissionDraftState {
  if (item.isDemoTest) {
    return {
      assignmentId: item.id,
      driveLink: '',
      answerNote: '',
      lc:
        item.submission.demoScores?.lc !== undefined
          ? String(item.submission.demoScores.lc)
          : '',
      rc:
        item.submission.demoScores?.rc !== undefined
          ? String(item.submission.demoScores.rc)
          : '',
    };
  }

  return {
    assignmentId: item.id,
    driveLink: item.submission.driveLink ?? '',
    answerNote: item.submission.studentAnswerNote ?? '',
    lc:
      item.submission.partScores?.lc !== undefined
        ? String(item.submission.partScores.lc)
        : '',
    rc:
      item.submission.partScores?.rc !== undefined
        ? String(item.submission.partScores.rc)
        : '',
  };
}

export function StudentAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = usePortalToast();
  const { data, isLoading, isError, refetch } = useStudentPortalData();
  const submitHomeworkMutation = useSubmitHomeworkMutation();
  const submitDemoMutation = useSubmitDemoScoreMutation();

  const tabParam = searchParams.get('tab');
  const openParam = searchParams.get('open');

  const activeTab: 'work' | 'attendance' =
    tabParam === 'attendance' ? 'attendance' : 'work';

  const [filterKey, setFilterKey] = useState<AssignmentFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualOpenId, setManualOpenId] = useState<string | null>(null);

  const [draftState, setDraftState] = useState<SubmissionDraftState | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const openAssignmentId = openParam || manualOpenId;

  const populateFormFromAssignment = (item: AssignmentWithSubmission) => {
    setFormError(null);
    setDraftState(buildInitialDraftForAssignment(item));
  };

  const getDraftForItem = (
    item: AssignmentWithSubmission
  ): SubmissionDraftState => {
    if (draftState && draftState.assignmentId === item.id) {
      return draftState;
    }
    return buildInitialDraftForAssignment(item);
  };

  const updateDraftForItem = (
    item: AssignmentWithSubmission,
    patch: Partial<Omit<SubmissionDraftState, 'assignmentId'>>
  ) => {
    setDraftState((prev) => {
      const base =
        prev && prev.assignmentId === item.id
          ? prev
          : buildInitialDraftForAssignment(item);
      return {
        ...base,
        ...patch,
      };
    });
  };

  useEffect(() => {
    if (!openParam || !data?.assignments) return;
    const target = data.assignments.find((a) => a.id === openParam);
    if (target) {
      const el = document.getElementById(`c-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [openParam, data?.assignments]);

  const unlockedAssignments = useMemo(() => {
    const assignments = data?.assignments;
    if (!assignments) return [];
    return assignments.filter((a) => a.isUnlocked);
  }, [data]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unlockedAssignments
      .filter((item) => {
        const status = item.submission.status;
        const matchesFilter =
          filterKey === 'all' ||
          (filterKey === 'todo' && status === 'todo') ||
          (filterKey === 'done' && status !== 'todo') ||
          (filterKey === 'submitted' && status === 'submitted') ||
          (filterKey === 'passed' && status === 'passed') ||
          (filterKey === 'failed' && status === 'failed') ||
          (filterKey === 'demo' && item.isDemoTest);

        if (!matchesFilter) return false;
        if (!q) return true;
        return `${item.title} ${item.code}`.toLowerCase().includes(q);
      })
      .sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );
  }, [filterKey, searchQuery, unlockedAssignments]);

  if (isLoading) {
    return <LoadingBlock label="Đang tải danh sách bài tập và điểm danh..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải dữ liệu bài tập. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data.hasEnrollment || !data.classInfo) {
    return <NoEnrollmentCard studentName={data.student.fullName} />;
  }

  const handleSwitchTab = (tab: 'work' | 'attendance') => {
    if (tab === 'attendance') {
      setSearchParams({ tab: 'attendance' });
    } else {
      setSearchParams({});
    }
  };

  const handleOpenCard = (item: AssignmentWithSubmission) => {
    if (item.isClosed || item.submission.status === 'passed') return;
    populateFormFromAssignment(item);
    setManualOpenId(item.id);
    if (openParam) {
      setSearchParams({});
    }
  };

  const handleCloseCard = () => {
    setManualOpenId(null);
    setDraftState(null);
    setFormError(null);
    if (openParam) {
      setSearchParams({});
    }
  };

  const handleSaveSubmission = async (item: AssignmentWithSubmission) => {
    setFormError(null);

    if (item.isClosed) {
      setFormError('Bài tập này đã đóng nhận bài.');
      return;
    }
    if (item.submission.status === 'passed') {
      setFormError('Bài tập đã đạt yêu cầu, không thể chỉnh sửa.');
      return;
    }

    const currentDraft = getDraftForItem(item);

    try {
      if (item.isDemoTest) {
        if (currentDraft.lc.trim() === '' || currentDraft.rc.trim() === '') {
          setFormError('Hãy nhập đủ điểm LC và RC.');
          return;
        }
        const lcScore = Number(currentDraft.lc);
        const rcScore = Number(currentDraft.rc);
        const err = validateDemoScoreSubmission({
          assignmentId: item.id,
          lcScore,
          rcScore,
        });
        if (err) {
          setFormError(err);
          return;
        }

        await submitDemoMutation.mutateAsync({
          assignmentId: item.id,
          lcScore,
          rcScore,
        });
        handleCloseCard();
        showToast('Đã lưu. Trạng thái: Chờ kiểm tra.');
        return;
      }

      const lcPart = item.parts?.find((p) => p.key === 'lc');
      const rcPart = item.parts?.find((p) => p.key === 'rc');

      if (lcPart && currentDraft.lc.trim() === '') {
        setFormError(`Hãy nhập số câu đúng cho ${lcPart.label}.`);
        return;
      }
      if (rcPart && currentDraft.rc.trim() === '') {
        setFormError(`Hãy nhập số câu đúng cho ${rcPart.label}.`);
        return;
      }

      const lcCorrect = lcPart ? Number(currentDraft.lc) : 0;
      const rcCorrect = rcPart ? Number(currentDraft.rc) : 0;

      const err = validateHomeworkSubmission(item, {
        assignmentId: item.id,
        driveLink: currentDraft.driveLink,
        studentAnswerNote: currentDraft.answerNote,
        lcCorrect,
        rcCorrect,
      });

      if (err) {
        setFormError(err);
        return;
      }

      await submitHomeworkMutation.mutateAsync({
        assignmentId: item.id,
        driveLink: currentDraft.driveLink,
        studentAnswerNote: currentDraft.answerNote,
        lcCorrect,
        rcCorrect,
      });
      handleCloseCard();
      showToast('Đã lưu. Trạng thái: Chờ kiểm tra.');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu bài nộp. Vui lòng thử lại.'
      );
    }
  };

  const countStatus = (st: AssignmentWithSubmission['submission']['status']) =>
    unlockedAssignments.filter((a) => a.submission.status === st).length;

  const normalizedAttendanceStatuses = data.attendance.map((a) =>
    resolveStudentAttendanceStatus(a.status, a.teacherStatus)
  );
  const countAttendance = (st: StudentAttendanceViewStatus) =>
    normalizedAttendanceStatuses.filter((status) => status === st).length;

  return (
    <div>
      <div className="no-print flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleSwitchTab('work')}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
            activeTab === 'work'
              ? 'border-[#2878B8] bg-[#2878B8] text-white'
              : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          Nộp BTVN &amp; điền điểm
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('attendance')}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
            activeTab === 'attendance'
              ? 'border-[#2878B8] bg-[#2878B8] text-white'
              : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          Lịch sử điểm danh
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'attendance' ? (
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Tổng số buổi', data.lessons.length],
                ['Có mặt', countAttendance('on') + countAttendance('late')],
                ['Nghỉ', countAttendance('excused') + countAttendance('absent')],
                ['Đi muộn', countAttendance('late')],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]"
                >
                  <span className="text-[13px] text-[#64748B]">{label}</span>
                  <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
                    {val}
                  </b>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {data.attendance.length === 0 ? (
                <EmptyBlock title="Chưa có dữ liệu điểm danh." />
              ) : (
                <div className="overflow-x-auto rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
                  <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-[#DCEAF3] text-[#243B53]">
                        <th className="p-2.5 font-bold">Buổi</th>
                        <th className="p-2.5 font-bold">Ngày học</th>
                        <th className="p-2.5 font-bold">Nội dung</th>
                        <th className="p-2.5 font-bold">Trạng thái</th>
                        <th className="p-2.5 font-bold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-[#DCEAF3] align-top last:border-b-0"
                        >
                          <td className="p-2.5">{record.sessionNumber}</td>
                          <td className="p-2.5">
                            {formatShortWeekdayDate(record.date)}
                          </td>
                          <td className="p-2.5">{record.lessonTitle}</td>
                          <td className="p-2.5">
                            <AttendanceStatusChip
                              status={record.status}
                              teacherStatus={record.teacherStatus}
                            />
                          </td>
                          <td className="p-2.5 text-[#64748B]">
                            {record.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ['Tổng số bài', unlockedAssignments.length],
                ['Đã nộp', unlockedAssignments.length - countStatus('todo')],
                ['Đã đạt', countStatus('passed')],
                ['Chưa đạt', countStatus('failed')],
                [
                  'Còn thiếu',
                  unlockedAssignments.filter((a) => a.isOverdue).length,
                ],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="min-w-0 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]"
                >
                  <span className="text-[13px] text-[#64748B]">{label}</span>
                  <b className="block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
                    {val}
                  </b>
                </div>
              ))}
            </div>

            {unlockedAssignments.length > 0 && (
              <div className="no-print mt-4 flex flex-wrap items-center gap-2.5">
                {ASSIGNMENT_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilterKey(f.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                      filterKey === f.key
                        ? 'border-[#2878B8] bg-[#2878B8] text-white'
                        : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã bài"
                  aria-label="Tìm bài tập"
                  className="w-full max-w-[260px] rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-[9px] text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                />
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4">
              {unlockedAssignments.length === 0 ? (
                <EmptyBlock title="Chưa có bài tập." />
              ) : filteredAssignments.length === 0 ? (
                <EmptyBlock
                  title="Không có bài tập phù hợp"
                  description="Hãy chọn bộ lọc hoặc từ khóa khác."
                />
              ) : (
                filteredAssignments.map((item) => {
                  const sub = item.submission;
                  const canEditOrSubmit =
                    !item.isClosed && sub.status !== 'passed';
                  const isOpen = canEditOrSubmit && openAssignmentId === item.id;
                  const totalCorrect =
                    sub.partScores && item.parts
                      ? sub.partScores.lc + sub.partScores.rc
                      : 0;
                  const totalMax = item.parts
                    ? item.parts.reduce((acc, p) => acc + p.maxQuestions, 0)
                    : 0;

                  const safeAttachmentUrl = toSafeHttpUrl(item.attachmentUrl);
                  const safeSubmittedLink = toSafeHttpUrl(sub.driveLink);
                  const feedback = sub.teacherFeedback ?? sub.teacherComment;
                  const format = item.submissionFormat ?? 'drive_link';
                  const activeDraft = isOpen ? getDraftForItem(item) : null;

                  return (
                    <article
                      key={item.id}
                      id={`c-${item.id}`}
                      className={`rounded-[14px] border bg-white p-[18px] transition ${
                        isOpen
                          ? 'border-[#75BDEB] shadow-[0_0_0_3px_#EAF6FD]'
                          : 'border-[#DCEAF3]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="text-[13px] text-[#64748B]">
                            {item.code}, tuần {item.weekIndex + 1}, hạn{' '}
                            {formatDateTimeVi(item.dueDate)}
                            {item.isOverdue ? ' (quá hạn)' : ''}
                          </div>
                          <h3 className="text-[15.5px] font-bold text-[#243B53]">
                            {item.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.isClosed ? (
                            <PortalChip
                              label="Đã đóng nhận bài"
                              variant="muted"
                            />
                          ) : null}
                          <AssignmentStatusChip status={sub.status} />
                        </div>
                      </div>

                      {item.instructions ? (
                        <p className="mt-1.5 text-[13.5px] text-[#243B53]">
                          {item.instructions}
                        </p>
                      ) : null}

                      {safeAttachmentUrl ? (
                        <div className="mt-1.5">
                          <a
                            href={safeAttachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2878B8] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Mở đề bài / tài liệu đính kèm</span>
                          </a>
                        </div>
                      ) : null}

                      <div className="mt-1.5 space-y-1 text-[13px]">
                        {item.isDemoTest && sub.demoScores ? (
                          <p className="tabular-nums">
                            LC {sub.demoScores.lc}/495, RC {sub.demoScores.rc}
                            /495, tổng {sub.demoScores.total}/990.
                          </p>
                        ) : safeSubmittedLink ? (
                          <p>
                            Link đã nộp:{' '}
                            <a
                              href={safeSubmittedLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#64748B] underline hover:text-[#2878B8]"
                            >
                              {safeSubmittedLink
                                .replace(/^https?:\/\//, '')
                                .slice(0, 42)}
                              …
                            </a>
                          </p>
                        ) : null}

                        {sub.studentAnswerNote ? (
                          <p>
                            <b>Ghi chú bài nộp:</b> {sub.studentAnswerNote}
                          </p>
                        ) : null}

                        {sub.partScores && item.parts ? (
                          <p className="tabular-nums">
                            {item.parts
                              .map(
                                (p) =>
                                  `${p.label}: ${sub.partScores?.[p.key] ?? 0}/${p.maxQuestions}`
                              )
                              .join(', ')}
                            . Tổng {totalCorrect}/{totalMax} (
                            {totalMax
                              ? Math.round((totalCorrect / totalMax) * 100)
                              : 0}
                            %).
                          </p>
                        ) : null}

                        {sub.score !== undefined && sub.score !== null ? (
                          <p className="tabular-nums">
                            <b>Điểm chấm:</b> {sub.score}
                            {item.maxScore ? `/${item.maxScore}` : ''}
                            {sub.gradedByTeacherName
                              ? ` (${sub.gradedByTeacherName}${sub.gradedAt ? `, ${formatDateTimeVi(sub.gradedAt)}` : ''})`
                              : ''}
                          </p>
                        ) : null}

                        {feedback ? (
                          <p>
                            <b>Nhận xét:</b> {feedback}
                          </p>
                        ) : null}
                      </div>

                      {isOpen && activeDraft ? (
                        <div className="mt-2.5 border-t border-[#DCEAF3] pt-3">
                          {item.isDemoTest ? (
                            <div className="flex flex-wrap gap-2.5">
                              <label className="min-w-[150px] flex-1 text-[13px] text-[#64748B]">
                                Điểm LC (0–495)
                                <input
                                  type="number"
                                  min={0}
                                  max={495}
                                  step={5}
                                  value={activeDraft.lc}
                                  onChange={(e) =>
                                    updateDraftForItem(item, {
                                      lc: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                                />
                              </label>

                              <label className="min-w-[150px] flex-1 text-[13px] text-[#64748B]">
                                Điểm RC (0–495)
                                <input
                                  type="number"
                                  min={0}
                                  max={495}
                                  step={5}
                                  value={activeDraft.rc}
                                  onChange={(e) =>
                                    updateDraftForItem(item, {
                                      rc: e.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                                />
                              </label>
                            </div>
                          ) : (
                            <>
                              {format !== 'note' ? (
                                <label className="block text-[13px] text-[#64748B]">
                                  {format === 'file_url'
                                    ? 'Đường dẫn tệp bài nộp (https://...)'
                                    : format === 'lc_rc_sheet'
                                      ? 'Link bài làm đính kèm (tùy chọn)'
                                      : 'Link Google Drive bài nộp'}
                                  <input
                                    type="url"
                                    value={activeDraft.driveLink}
                                    onChange={(e) =>
                                      updateDraftForItem(item, {
                                        driveLink: e.target.value,
                                      })
                                    }
                                    placeholder={
                                      format === 'drive_link'
                                        ? 'https://drive.google.com/...'
                                        : 'https://...'
                                    }
                                    className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                                  />
                                </label>
                              ) : null}

                              {format === 'note' ? (
                                <label className="block text-[13px] text-[#64748B]">
                                  Nội dung bài làm / Ghi chú nộp bài
                                  <textarea
                                    rows={3}
                                    value={activeDraft.answerNote}
                                    onChange={(e) =>
                                      updateDraftForItem(item, {
                                        answerNote: e.target.value,
                                      })
                                    }
                                    placeholder="Nhập câu trả lời hoặc ghi chú nộp bài của bạn..."
                                    className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                                  />
                                </label>
                              ) : null}

                              {item.parts && item.parts.length > 0 ? (
                                <div className="mt-2.5 flex flex-wrap gap-2.5">
                                  {item.parts.map((part) => (
                                    <label
                                      key={part.key}
                                      className="min-w-[150px] flex-1 text-[13px] text-[#64748B]"
                                    >
                                      {part.label}: số câu đúng (0–
                                      {part.maxQuestions})
                                      <input
                                        type="number"
                                        min={0}
                                        max={part.maxQuestions}
                                        step={1}
                                        value={
                                          part.key === 'lc'
                                            ? activeDraft.lc
                                            : activeDraft.rc
                                        }
                                        onChange={(e) =>
                                          part.key === 'lc'
                                            ? updateDraftForItem(item, {
                                                lc: e.target.value,
                                              })
                                            : updateDraftForItem(item, {
                                                rc: e.target.value,
                                              })
                                        }
                                        className="mt-1 w-full rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-2 text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
                                      />
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          )}

                          <span className="mt-1 block min-h-[18px] text-[13px] text-[#B93A2E]">
                            {formError ?? ''}
                          </span>

                          <div className="mt-1 flex items-center gap-2.5">
                            <button
                              type="button"
                              disabled={
                                submitHomeworkMutation.isPending ||
                                submitDemoMutation.isPending
                              }
                              onClick={() => void handleSaveSubmission(item)}
                              className="inline-flex items-center rounded-[10px] bg-[#2878B8] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1F6399] disabled:opacity-60"
                            >
                              {item.isDemoTest ? 'Lưu điểm' : 'Lưu bài nộp'}
                            </button>

                            <button
                              type="button"
                              onClick={handleCloseCard}
                              className="inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : canEditOrSubmit ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCard(item)}
                          className="mt-2 inline-flex items-center rounded-[10px] bg-[#2878B8] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1F6399]"
                        >
                          {sub.status === 'todo'
                            ? item.isDemoTest
                              ? 'Điền điểm'
                              : 'Nộp bài'
                            : 'Chỉnh sửa'}
                        </button>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
