import { Link } from 'react-router-dom';
import { BookOpen, Calendar, GraduationCap, PlayCircle } from 'lucide-react';

export function NoEnrollmentCard({ studentName }: { studentName: string }) {
  return (
    <section className="rounded-[14px] border border-[#DCEAF3] bg-white p-7 text-center shadow-[0_6px_20px_rgba(36,59,83,0.04)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF6FD] text-[#2878B8]">
        <GraduationCap className="h-6 w-6" />
      </div>
      <h1 className="mt-3 text-[20px] font-bold text-[#243B53]">
        Chào {studentName}, bạn chưa có lớp học chính thức trong Cổng học viên
      </h1>
      <p className="mx-auto mt-1.5 max-w-xl text-[14px] text-[#718096]">
        Tài khoản học viên của bạn chưa được giáo vụ xếp vào lớp học chính thức. Bạn có thể tham khảo lịch khai giảng để đăng ký khóa học hoặc tự luyện tập miễn phí tại Study Zone và Test Online.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2878B8] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110"
        >
          <GraduationCap className="h-4 w-4" />
          <span>Xem khóa học tại trung tâm</span>
        </Link>
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#EAF6FD] px-4 py-2.5 text-[14px] font-semibold text-[#2878B8] transition hover:brightness-95"
        >
          <Calendar className="h-4 w-4" />
          <span>Lịch khai giảng</span>
        </Link>
        <Link
          to="/study-zone/grammar"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DCEAF3] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#243B53] transition hover:bg-[#EAF6FD]"
        >
          <BookOpen className="h-4 w-4 text-[#2878B8]" />
          <span>Tự học Study Zone</span>
        </Link>
        <Link
          to="/test-online"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DCEAF3] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#243B53] transition hover:bg-[#EAF6FD]"
        >
          <PlayCircle className="h-4 w-4 text-[#2878B8]" />
          <span>Thi thử Test Online</span>
        </Link>
      </div>
    </section>
  );
}
