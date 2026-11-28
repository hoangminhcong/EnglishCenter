import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { formatDateTimeVi } from '@/utils/format';
import { useStudentPortalData } from '../hooks/useStudentPortal';
import { NoEnrollmentCard } from '../components/NoEnrollmentCard';
import {
  LessonSessionStatusChip,
  LessonTypeChip,
  ResourceDocChip,
} from '../components/PortalUiBits';
import { formatShortWeekdayDate } from '../utils/portalDateUtils';

export function StudentLearningPlanPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStudentPortalData();

  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const maxWeekIndex = useMemo(() => {
    const lessons = data?.lessons;
    if (!lessons || lessons.length === 0) return 0;
    return Math.max(...lessons.map((s) => s.weekIndex));
  }, [data]);

  const filteredLessons = useMemo(() => {
    const lessons = data?.lessons;
    if (!lessons) return [];
    const q = searchQuery.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const weekMatch =
        selectedWeek === 'all' || lesson.weekIndex === Number(selectedWeek);
      if (!weekMatch) return false;
      if (!q) return true;

      const haystack = [
        lesson.title,
        lesson.lcContent,
        lesson.rcContent,
        lesson.learningObjectives ?? '',
        lesson.homeworkSummary ?? '',
        ...lesson.resources.map((r) => r.title),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [data, searchQuery, selectedWeek]);

  if (isLoading) {
    return <LoadingBlock label="Đang tải tài liệu và kế hoạch học tập..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải kế hoạch học tập. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data.hasEnrollment || !data.classInfo) {
    return <NoEnrollmentCard studentName={data.student.fullName} />;
  }

  const { classInfo } = data;
  const assignmentBySession = new Map(
    data.assignments.map((a) => [a.sessionNumber, a])
  );

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      // ignore print error
    }
  };

  return (
    <div>
      {/* 1. Thanh công cụ */}
      {data.lessons.length > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2.5">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            aria-label="Lọc theo tuần"
            className="min-w-[150px] flex-1 rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-[9px] text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
          >
            <option value="all">Tất cả các tuần</option>
            {Array.from({ length: maxWeekIndex + 1 }, (_, w) => (
              <option key={w} value={String(w)}>
                Tuần {w + 1}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung, mục tiêu, tài liệu..."
            aria-label="Tìm kiếm"
            className="min-w-[150px] flex-1 rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-[9px] text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
          />

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              viewMode === 'list'
                ? 'border-[#2878B8] bg-[#2878B8] text-white'
                : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
            }`}
          >
            Danh sách
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              viewMode === 'table'
                ? 'border-[#2878B8] bg-[#2878B8] text-white'
                : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
            }`}
          >
            Bảng tổng hợp
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2878B8] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1F6399]"
          >
            <Printer className="h-4 w-4" />
            <span>In kế hoạch</span>
          </button>
        </div>
      )}

      {/* 2. Tài liệu chung của khóa */}
      <section
        className={`print-card ${data.lessons.length > 0 ? 'mt-4' : ''} rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]`}
      >
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Tài liệu chung của khóa
        </h2>
        {data.generalResources.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {data.generalResources.map((doc) => (
              <ResourceDocChip key={doc.id} resource={doc} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-[#64748B]">Chưa có tài liệu.</p>
        )}
      </section>

      {/* 3. Danh sách buổi học hoặc Bảng tổng hợp */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        {data.lessons.length === 0 ? (
          <EmptyBlock title="Chưa có tài liệu." />
        ) : filteredLessons.length === 0 ? (
          <EmptyBlock
            title="Không tìm thấy buổi học phù hợp"
            description="Hãy bỏ bộ lọc tuần hoặc đổi từ khóa."
          />
        ) : viewMode === 'table' ? (
          <div className="print-card overflow-x-auto rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
            <table className="w-full min-w-[680px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#DCEAF3] text-[#243B53]">
                  <th className="p-2.5 font-bold">Tuần</th>
                  <th className="p-2.5 font-bold">Buổi</th>
                  <th className="p-2.5 font-bold">Ngày &amp; Ca học</th>
                  <th className="p-2.5 font-bold">Nội dung</th>
                  <th className="p-2.5 font-bold">BTVN</th>
                  <th className="p-2.5 font-bold">Hạn nộp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.map((lesson) => {
                  const assignment = assignmentBySession.get(
                    lesson.sessionNumber
                  );
                  const sessionTime =
                    lesson.startTime && lesson.endTime
                      ? `${lesson.startTime}–${lesson.endTime}`
                      : (lesson.startTime ?? classInfo.scheduleTime);
                  const sessionRoom = lesson.roomName ?? classInfo.roomName;

                  return (
                    <tr
                      key={lesson.id}
                      className="border-b border-[#DCEAF3] align-top last:border-b-0"
                    >
                      <td className="p-2.5">{lesson.weekIndex + 1}</td>
                      <td className="p-2.5">{lesson.sessionNumber}</td>
                      <td className="p-2.5">
                        <div>{formatShortWeekdayDate(lesson.date)}</div>
                        <div className="text-[12.5px] text-[#64748B]">
                          {sessionTime} • {sessionRoom}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <span className="mr-2">{lesson.title}</span>
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <LessonTypeChip type={lesson.type} />
                          {lesson.sessionStatus &&
                          lesson.sessionStatus !== 'scheduled' ? (
                            <LessonSessionStatusChip
                              status={lesson.sessionStatus}
                            />
                          ) : null}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {assignment
                          ? assignment.code
                          : (lesson.homeworkSummary ?? 'Không có')}
                      </td>
                      <td className="p-2.5">
                        {assignment
                          ? formatDateTimeVi(assignment.dueDate)
                          : 'Không có'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const assignment = assignmentBySession.get(lesson.sessionNumber);
            const isExpanded = expandedSession === lesson.sessionNumber;
            const sessionTime =
              lesson.startTime && lesson.endTime
                ? `${lesson.startTime}–${lesson.endTime}`
                : (lesson.startTime ?? classInfo.scheduleTime);
            const sessionRoom = lesson.roomName ?? classInfo.roomName;
            const sessionTeacher = lesson.teacherName ?? classInfo.teacherName;

            return (
              <article
                key={lesson.id}
                className="print-card rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#64748B]">
                      Tuần {lesson.weekIndex + 1}, buổi {lesson.sessionNumber},{' '}
                      {formatShortWeekdayDate(lesson.date)} • {sessionTime} •{' '}
                      {sessionRoom} • {sessionTeacher}
                    </div>
                    <h3 className="text-[15.5px] font-bold text-[#243B53]">
                      {lesson.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {lesson.sessionStatus ? (
                      <LessonSessionStatusChip status={lesson.sessionStatus} />
                    ) : null}
                    <LessonTypeChip type={lesson.type} />
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedSession((prev) =>
                          prev === lesson.sessionNumber
                            ? null
                            : lesson.sessionNumber
                        )
                      }
                      className="no-print inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95"
                    >
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </button>
                  </div>
                </div>

                <div
                  className={`print-expand ${
                    isExpanded ? 'block' : 'hidden'
                  } mt-3 border-t border-[#DCEAF3] pt-2`}
                >
                  {lesson.learningObjectives ? (
                    <>
                      <h4 className="mb-0.5 mt-2.5 text-[14px] font-bold text-[#243B53]">
                        Mục tiêu buổi học
                      </h4>
                      <p className="text-[15px] text-[#243B53]">
                        {lesson.learningObjectives}
                      </p>
                    </>
                  ) : null}

                  <h4 className="mb-0.5 mt-2.5 text-[14px] font-bold text-[#243B53]">
                    I. Listening Comprehension (LC)
                  </h4>
                  <p className="text-[15px] text-[#243B53]">
                    {lesson.lcContent}
                  </p>

                  <h4 className="mb-0.5 mt-3 text-[14px] font-bold text-[#243B53]">
                    II. Reading Comprehension (RC)
                  </h4>
                  <p className="text-[15px] text-[#243B53]">
                    {lesson.rcContent}
                  </p>

                  {lesson.homeworkSummary ? (
                    <>
                      <h4 className="mb-0.5 mt-3 text-[14px] font-bold text-[#243B53]">
                        Hướng dẫn tự học / Dặn dò giảng viên
                      </h4>
                      <p className="text-[15px] text-[#243B53]">
                        {lesson.homeworkSummary}
                      </p>
                    </>
                  ) : null}

                  {lesson.resources.length > 0 ? (
                    <>
                      <h4 className="mb-1.5 mt-3 text-[14px] font-bold text-[#243B53]">
                        Tài liệu
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        {lesson.resources.map((doc) => (
                          <ResourceDocChip key={doc.id} resource={doc} />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {assignment ? (
                    <>
                      <h4 className="mb-1 mt-3 text-[14px] font-bold text-[#243B53]">
                        Bài tập về nhà
                      </h4>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[14px] text-[#243B53]">
                          {assignment.code}, hạn{' '}
                          {formatDateTimeVi(assignment.dueDate)}
                        </span>
                        {assignment.isUnlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/student/assignments?open=${assignment.id}`
                              )
                            }
                            className="no-print inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95"
                          >
                            Mở bài
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
