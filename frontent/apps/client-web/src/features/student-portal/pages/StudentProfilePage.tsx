import { Link } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { formatDate, formatVnd } from '@english-center/utils';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { useStudentPortalData } from '../hooks/useStudentPortal';
import {
  EnrollmentStatusChip,
  LearningStatusChip,
  PortalChip,
  PortalProgressBar,
} from '../components/PortalUiBits';
import {
  BILLING_EXEMPTION_REASON_LABELS,
  STUDENT_LEARNING_STATUS_LABELS,
  type StudentLearningStatus,
} from '../model/studentPortal.types';

export function StudentProfilePage() {
  const { data, isLoading, isError, refetch } = useStudentPortalData();

  if (isLoading) {
    return <LoadingBlock label="Đang tải hồ sơ học viên..." />;
  }

  if (isError || !data) {
    return (
      <ErrorBlock
        message="Không thể tải hồ sơ học viên. Vui lòng thử lại."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const { student, classInfo } = data;
  const enrollments = data.enrollments ?? [];
  const effectiveStatus: StudentLearningStatus =
    student.learningStatus ??
    (data.hasEnrollment ? 'studying' : 'waiting_placement');

  const displayStudentCode = student.studentCode.trim() || 'Chưa cấp mã';
  const displayBranchName =
    student.branchName?.trim() ||
    classInfo?.branchName ||
    'Chưa phân bổ cơ sở';

  const infoItems: Array<[string, string]> = [
    ['Họ và tên', student.fullName],
    ['Mã học viên', displayStudentCode],
    ['Email', student.email.trim() || 'Chưa cập nhật'],
    ['Số điện thoại', student.phone.trim() || 'Chưa cập nhật'],
    ['Trạng thái học tập', STUDENT_LEARNING_STATUS_LABELS[effectiveStatus]],
    ['Cơ sở quản lý', displayBranchName],
  ];

  if (student.dateOfBirth) {
    infoItems.push(['Ngày sinh', formatDate(student.dateOfBirth)]);
  }
  if (student.schoolOrWork) {
    infoItems.push(['Trường học / Đơn vị', student.schoolOrWork]);
  }

  return (
    <div>
      {/* 1. Hồ sơ cá nhân & bảo mật tài khoản */}
      <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DCEAF3] pb-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold text-[#243B53]">
                {student.fullName}
              </h1>
              <LearningStatusChip status={effectiveStatus} />
            </div>
            <p className="mt-1 text-[14px] text-[#64748B]">
              Mã học viên: <b>{displayStudentCode}</b>
              {classInfo
                ? ` • Lớp hiện tại: ${classInfo.classCode} (${classInfo.courseName})`
                : ' • Chưa xếp lớp chính thức'}
            </p>
          </div>

          <Link
            to="/change-password"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#EAF6FD] px-3.5 py-2 text-[13.5px] font-semibold text-[#2878B8] transition hover:brightness-95"
          >
            <KeyRound className="h-4 w-4" />
            <span>Đổi mật khẩu</span>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {infoItems.map(([label, val]) => (
            <div key={label} className="min-w-0">
              <div className="text-[13px] text-[#64748B]">{label}</div>
              <b className="block break-words text-[15px] font-bold text-[#243B53]">
                {val}
              </b>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Điểm đầu vào & Mục tiêu đầu ra */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Điểm đầu vào (Entry / Placement)
          </span>
          <b className="mt-0.5 block text-[26px] font-bold leading-[1.25] text-[#243B53] tabular-nums">
            {student.entryScore.total}/990
          </b>
          <div className="mt-1 text-[13.5px] text-[#243B53] tabular-nums">
            Listening (LC): <b>{student.entryScore.lc}/495</b> • Reading (RC):{' '}
            <b>{student.entryScore.rc}/495</b>
          </div>
          <PortalProgressBar
            percent={Math.round((student.entryScore.total / 990) * 100)}
          />
        </section>

        <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <span className="text-[13px] text-[#64748B]">
            Mục tiêu đầu ra (Goal Score)
          </span>
          <b className="mt-0.5 block text-[26px] font-bold leading-[1.25] text-[#2878B8] tabular-nums">
            {student.goalScore.total}/990
          </b>
          <div className="mt-1 text-[13.5px] text-[#243B53] tabular-nums">
            Listening (LC): <b>{student.goalScore.lc}/495</b> • Reading (RC):{' '}
            <b>{student.goalScore.rc}/495</b>
          </div>
          <PortalProgressBar
            percent={Math.round((student.goalScore.total / 990) * 100)}
          />
        </section>
      </div>

      {/* 3. Cam kết lộ trình đào tạo (nếu có từ hồ sơ Giáo vụ / Tư vấn) */}
      {student.commitmentSummary ? (
        <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
          <h2 className="flex items-center gap-1.5 text-[17px] font-bold text-[#243B53]">
            <ShieldCheck className="h-5 w-5 text-[#2878B8]" />
            <span>Cam kết lộ trình đào tạo</span>
          </h2>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="text-[13px] text-[#64748B]">Mốc đầu ra tư vấn</div>
              <b className="text-[15px] font-bold text-[#243B53]">
                {student.commitmentSummary.advisedOutcomeLabel}
              </b>
            </div>
            {student.commitmentSummary.sourceRegistrationCode ? (
              <div className="min-w-0">
                <div className="text-[13px] text-[#64748B]">
                  Mã hồ sơ đăng ký gốc
                </div>
                <b className="text-[15px] font-bold text-[#243B53]">
                  {student.commitmentSummary.sourceRegistrationCode}
                </b>
              </div>
            ) : null}
          </div>
          <p className="mt-2.5 rounded-[10px] bg-[#F5FAFE] p-3 text-[13.5px] text-[#243B53]">
            <b>Điều kiện chuyên cần &amp; bài tập:</b>{' '}
            {student.commitmentSummary.conditionsText}
          </p>
        </section>
      ) : null}

      {/* 4. Lịch sử ghi danh & xếp lớp (đồng bộ 1-1 StudentEnrollmentRecordDto) */}
      <section className="mt-4 rounded-[14px] border border-[#DCEAF3] bg-white p-[18px]">
        <h2 className="text-[17px] font-bold text-[#243B53]">
          Lịch sử ghi danh &amp; Xếp lớp ({enrollments.length})
        </h2>

        <div className="mt-3">
          {enrollments.length === 0 ? (
            classInfo ? (
              <div className="rounded-[12px] border border-[#DCEAF3] bg-[#F5FAFE] p-3.5 text-[14px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>
                    {classInfo.courseName} — Lớp {classInfo.classCode}
                  </b>
                  <EnrollmentStatusChip status="active" />
                </div>
                <div className="mt-1 text-[13px] text-[#64748B]">
                  Cơ sở: {classInfo.branchName} • Khai giảng:{' '}
                  {formatDate(classInfo.startDate)} • Lịch học:{' '}
                  {classInfo.scheduleDays} ({classInfo.scheduleTime})
                </div>
              </div>
            ) : (
              <EmptyBlock title="Chưa có lịch sử ghi danh lớp học." />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#DCEAF3] text-[#243B53]">
                    <th className="p-2.5 font-bold">Mã ghi danh</th>
                    <th className="p-2.5 font-bold">Khóa học &amp; Lớp</th>
                    <th className="p-2.5 font-bold">Cơ sở</th>
                    <th className="p-2.5 font-bold">Ngày xếp lớp</th>
                    <th className="p-2.5 text-right font-bold">
                      Học phí thỏa thuận
                    </th>
                    <th className="p-2.5 font-bold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enr) => (
                    <tr
                      key={enr.id}
                      className="border-b border-[#DCEAF3] align-top last:border-b-0"
                    >
                      <td className="p-2.5 font-semibold text-[#243B53]">
                        {enr.enrollmentCode}
                      </td>
                      <td className="p-2.5">
                        <b className="block text-[#243B53]">{enr.courseName}</b>
                        <span className="text-[12.5px] text-[#64748B]">
                          Lớp {enr.classCode}
                        </span>
                        {enr.billingExemptionReason ? (
                          <div className="mt-1">
                            <PortalChip
                              label={`Miễn thu mới: ${BILLING_EXEMPTION_REASON_LABELS[enr.billingExemptionReason]}`}
                              variant="bl"
                            />
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-[#243B53]">{enr.branchName}</td>
                      <td className="p-2.5 text-[#64748B]">
                        <div>{formatDate(enr.enrolledAt.slice(0, 10))}</div>
                        {enr.endedAt ? (
                          <div className="text-[12px]">
                            Kết thúc: {formatDate(enr.endedAt.slice(0, 10))}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-right font-bold text-[#243B53] tabular-nums">
                        {formatVnd(enr.agreedTuitionVnd)}
                      </td>
                      <td className="p-2.5">
                        <EnrollmentStatusChip status={enr.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
