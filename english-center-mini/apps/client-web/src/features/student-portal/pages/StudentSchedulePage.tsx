import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { formatDateTimeVi } from '@/utils/format';
import { useStudentPortalData } from '../hooks/useStudentPortal';
import { NoEnrollmentCard } from '../components/NoEnrollmentCard';
import {
  AssignmentStatusChip,
  LessonSessionStatusChip,
  LessonTypeChip,
  PortalChip,
} from '../components/PortalUiBits';
import {
  addDaysToIsoDate,
  formatDayMonthShort,
  formatFullDateVi,
  formatLongWeekdayLabel,
  getWeekIndexFromStart,
} from '../utils/portalDateUtils';

export function StudentSchedulePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStudentPortalData();

  const [selectedWeekState, setSelectedWeekState] = useState<
    number | 'all' | null
  >(null);

  if (isLoading) {
    return <LoadingBlock label="Đang tải thời khóa biểu lớp học..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải thời khóa biểu. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data.hasEnrollment || !data.classInfo) {
    return <NoEnrollmentCard studentName={data.student.fullName} />;
  }

  const { classInfo, lessons, assignments, referenceToday } = data;
  const maxWeekIndex = Math.max(0, ...lessons.map((l) => l.weekIndex));
  const rawCurrentWeek = getWeekIndexFromStart(
    classInfo.startDate,
    referenceToday
  );
  const currentWeekIndex = Math.min(
    Math.max(rawCurrentWeek, 0),
    maxWeekIndex
  );

  const isAllWeeks = selectedWeekState === 'all';
  const activeWeekIndex =
    selectedWeekState === null || selectedWeekState === 'all'
      ? currentWeekIndex
      : selectedWeekState;

  const upcomingDeadlines = assignments
    .filter(
      (a) =>
        a.isUnlocked &&
        !a.isClosed &&
        a.submission.status === 'todo' &&
        !a.isOverdue
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 5);

  const renderWeekGrid = (weekIndex: number) => {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, dayOffset) => {
          const dayIso = addDaysToIsoDate(
            classInfo.startDate,
            weekIndex * 7 + dayOffset
          );
          const isToday = dayIso === referenceToday;

          const dayLessons = lessons.filter((s) => s.date === dayIso);
          const dayDeadlines = assignments.filter(
            (a) => a.dueDate.slice(0, 10) === dayIso
          );

          const hasEvents = dayLessons.length > 0 || dayDeadlines.length > 0;

          return (
            <div
              key={dayIso}
              className={`min-h-0 min-w-0 rounded-[12px] border bg-white p-2.5 text-[13px] lg:min-h-[120px] ${
                isToday
                  ? 'border-[#75BDEB] shadow-[0_0_0_2px_#EAF6FD]'
                  : 'border-[#DCEAF3]'
              }`}
            >
              <div>
                <b className="font-bold text-[#243B53]">
                  {formatLongWeekdayLabel(dayIso)}
                </b>{' '}
                <span className="text-[#64748B]">
                  {formatDayMonthShort(dayIso)}
                </span>
              </div>

              {!hasEvents ? (
                <div className="mt-2 text-[#64748B]">Không có lịch</div>
              ) : (
                <div className="space-y-2">
                  {dayLessons.map((lesson) => {
                    const isTest =
                      lesson.type !== 'class' && lesson.type !== 'review';
                    const sessionTime =
                      lesson.startTime && lesson.endTime
                        ? `${lesson.startTime} – ${lesson.endTime}`
                        : (lesson.startTime ?? classInfo.scheduleTime);
                    const sessionRoom = lesson.roomName ?? classInfo.roomName;
                    const sessionTeacher =
                      lesson.teacherName ?? classInfo.teacherName;

                    return (
                      <div
                        key={lesson.id}
                        className={`mt-2 rounded-[8px] border-l-4 bg-[#EAF6FD] p-2 ${
                          isTest ? 'border-[#2878B8]' : 'border-[#75BDEB]'
                        }`}
                      >
                        <b className="block break-words font-bold text-[#243B53]">
                          {lesson.title}
                        </b>
                        <div className="my-0.5 break-words text-[#64748B]">
                          {sessionTime}, {sessionRoom}
                          <br />
                          {sessionTeacher}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <LessonTypeChip type={lesson.type} />
                          {lesson.sessionStatus &&
                          lesson.sessionStatus !== 'scheduled' ? (
                            <LessonSessionStatusChip
                              status={lesson.sessionStatus}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {dayDeadlines.map((dl) => {
                    const dueClockMatch = dl.dueDate.match(/T(\d{2}:\d{2})/);
                    const dueClock = dueClockMatch ? dueClockMatch[1] : '23:00';
                    return (
                      <div
                        key={dl.id}
                        className="mt-2 rounded-[8px] border-l-4 border-[#F26522] bg-[#FDE9DD] p-2"
                      >
                        <b className="block break-words font-bold text-[#243B53]">
                          Hạn nộp {dl.code}
                        </b>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{dueClock}</span>
                          {dl.isClosed ? (
                            <PortalChip
                              label="Đã đóng nhận bài"
                              variant="muted"
                            />
                          ) : (
                            <AssignmentStatusChip
                              status={dl.submission.status}
                            />
                          )}
                        </div>
                        {dl.isUnlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/student/assignments?open=${dl.id}`)
                            }
                            className="mt-1.5 inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-2.5 py-1 text-[12.5px] font-semibold text-[#2878B8] transition hover:brightness-95"
                          >
                            Mở bài
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* 1. Thông tin lớp */}
      <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Lớp {classInfo.classCode}, {classInfo.courseName}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            ['Giảng viên', classInfo.teacherName],
            ['Cơ sở', classInfo.branchName],
            ['Khai giảng', formatFullDateVi(classInfo.startDate)],
            ['Lịch học', classInfo.scheduleDays],
            ['Ca học', classInfo.scheduleTime],
          ].map(([label, val]) => (
            <div key={label} className="min-w-0">
              <div className="text-[13px] text-[#64748B]">{label}</div>
              <b className="block break-words text-[15px] font-bold text-[#243B53]">
                {val}
              </b>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Bộ lọc tuần */}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={!isAllWeeks && activeWeekIndex === 0}
          onClick={() =>
            setSelectedWeekState(Math.max(0, activeWeekIndex - 1))
          }
          className="inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tuần trước
        </button>

        <button
          type="button"
          onClick={() => setSelectedWeekState(null)}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
            selectedWeekState === null
              ? 'border-[#2878B8] bg-[#2878B8] text-white'
              : 'border-[#DCEAF3] bg-white text-[#243B53] hover:bg-[#EAF6FD]'
          }`}
        >
          Tuần hiện tại
        </button>

        <button
          type="button"
          disabled={!isAllWeeks && activeWeekIndex === maxWeekIndex}
          onClick={() =>
            setSelectedWeekState(Math.min(maxWeekIndex, activeWeekIndex + 1))
          }
          className="inline-flex items-center rounded-[10px] bg-[#EAF6FD] px-3 py-1.5 text-[13px] font-semibold text-[#2878B8] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tuần tiếp theo
        </button>

        <select
          aria-label="Chọn tuần"
          value={isAllWeeks ? 'all' : String(activeWeekIndex)}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedWeekState(val === 'all' ? 'all' : Number(val));
          }}
          className="w-auto rounded-[10px] border border-[#DCEAF3] bg-white px-3 py-[9px] text-[15px] text-[#243B53] outline-none focus:border-[#75BDEB]"
        >
          {Array.from({ length: maxWeekIndex + 1 }, (_, k) => (
            <option key={k} value={String(k)}>
              Tuần {k + 1}
            </option>
          ))}
          <option value="all">Xem toàn khóa</option>
        </select>
      </div>

      {/* 3. Lưới lịch học */}
      <div className="mt-4">
        {isAllWeeks ? (
          Array.from({ length: maxWeekIndex + 1 }, (_, k) => (
            <div key={k} className="mb-4 last:mb-0">
              <h3 className="mb-2 mt-4 text-[15.5px] font-bold text-[#243B53]">
                Tuần {k + 1}
              </h3>
              {renderWeekGrid(k)}
            </div>
          ))
        ) : (
          <>
            <p className="mb-2 text-[13px] text-[#64748B]">
              Tuần {activeWeekIndex + 1}:{' '}
              {formatFullDateVi(
                addDaysToIsoDate(classInfo.startDate, activeWeekIndex * 7)
              )}{' '}
              đến{' '}
              {formatFullDateVi(
                addDaysToIsoDate(classInfo.startDate, activeWeekIndex * 7 + 6)
              )}
            </p>
            {renderWeekGrid(activeWeekIndex)}
          </>
        )}
      </div>

      {/* 4. Hạn nộp BTVN gần nhất */}
      <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Hạn nộp BTVN gần nhất
        </h2>

        {upcomingDeadlines.length > 0 ? (
          <div className="divide-y divide-[#DCEAF3]">
            {upcomingDeadlines.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2.5 py-3 last:pb-0"
              >
                <div>
                  <b className="text-[15px] font-bold text-[#243B53]">
                    {a.title}
                  </b>
                  <div className="text-[13px] text-[#64748B]">
                    Hạn: {formatDateTimeVi(a.dueDate)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AssignmentStatusChip status={a.submission.status} />
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/student/assignments?open=${a.id}`)
                    }
                    className="inline-flex items-center rounded-[10px] bg-[#2878B8] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1F6399]"
                  >
                    Mở bài
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-[#64748B]">
            Không có bài nào sắp đến hạn.
          </p>
        )}
      </section>
    </div>
  );
}
