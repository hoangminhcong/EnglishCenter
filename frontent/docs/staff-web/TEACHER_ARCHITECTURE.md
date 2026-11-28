# KIẾN TRÚC PHÂN HỆ GIẢNG VIÊN (`TEACHER_ARCHITECTURE`)

## 1. Nguyên tắc Cô lập Phạm vi Dữ liệu (`assigned_classes_only`)

Phân hệ **Giảng viên (`Teacher Portal`)** được thiết kế với rào chắn dữ liệu hai lớp:
1. **Lớp Router (`PermissionGuard`)**: Chỉ vai trò có quyền `teacher.*` mới truy cập được các đường dẫn `/teacher/*`.
2. **Lớp Dịch vụ (`assertTeacherOwnsClass` trong `teacherApi.ts`)**: Mọi truy vấn và thao tác ghi đều kiểm tra `cls.teacherId === actor.userId`.
   - Ví dụ thực tế: `Cô Lan Hương` (`acc-stf-007`) chỉ thấy các lớp `EC-S01`, `ONL-SB01`, `TOEIC-CB02`, `TOEIC-SB03`, `HBT-SB01`. Nếu gõ trực tiếp URL `/teacher/classes/sch-hd-01` (lớp `TOEIC-FD01` của `Thầy Đức Minh` `acc-tea-002`), dịch vụ ném lỗi `403` và giao diện hiển thị ngay trang `403 Forbidden`.

## 2. Cấu trúc Thư mục Module

```text
apps/staff-web/src/features/teacher/
├── hooks/
│   └── useTeacher.ts                     # Query Keys gắn userId & TeacherActor
├── pages/
│   ├── TeacherDashboardPage.tsx          # /teacher/dashboard
│   ├── TeacherClassesPage.tsx            # /teacher/classes
│   ├── TeacherClassDetailPage.tsx        # /teacher/classes/:classId (Chặn 403 lớp người khác)
│   ├── TeacherTeachingPlansPage.tsx      # /teacher/teaching-plans
│   ├── TeacherAttendancePage.tsx         # /teacher/attendance
│   ├── TeacherAssignmentsPage.tsx        # /teacher/assignments
│   ├── TeacherGradebookPage.tsx          # /teacher/gradebook
│   ├── TeacherProgressPage.tsx           # /teacher/progress
│   └── TeacherSchedulePage.tsx           # /teacher/schedule
├── services/
│   └── teacherApi.ts                     # Nghiệp vụ chuyên môn & kiểm soát phạm vi lớp
└── types/
    └── teacher.types.ts                  # Kiểu dữ liệu chuyên môn giảng dạy
```

## 3. Tách bạch Ranh giới Chuyên môn

- **Bài tập lớp (`TeacherAssignmentRecordDto`) vs Study Zone**: Giảng viên tạo bài tập gắn với `classId` + `sessionId`; không trộn vào kho bài luyện tự do Study Zone của Admin.
- **Bảng điểm kiểm tra (`StudentAssessmentGradeDto`)**: Tách biệt 3 nhóm `regular` / `mid` / `final`; không trộn điểm BTVN hay điểm thi thử trực tuyến vào kết quả thi chính thức.
- **Không tự phân công lớp mới**: Giảng viên chỉ gửi `TeachingScheduleRequestDto` (`status: 'Requested'`), Giáo vụ là bên duy nhất phê duyệt phân công.
