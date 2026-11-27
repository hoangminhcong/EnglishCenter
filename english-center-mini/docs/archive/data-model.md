> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/data-model/DATA_MODEL.md`.

# Mô hình Dữ liệu (Domain Models) – HMC TOEIC Student Portal

Tài liệu mô tả các thực thể nghiệp vụ trong `src/features/student-portal/model/studentPortal.types.ts` để đồng bộ với thiết kế Database của Backend Node.js.

## 1. Quan hệ giữa các thực thể

- **StudentProfile (`Student`)**: Thông tin hồ sơ học viên (`id`, `studentCode`, `fullName`, `email`, `phone`, `entryScore`, `goalScore`).
- **StudentClassInfo (`Class` & `Course`)**: Thông tin lớp học chính thức mà học viên đang theo học (`id`, `classCode`, `courseId`, `courseName`, `teacherName`, `branchName`, `scheduleDays`, `scheduleTime`, `roomName`, `startDate`, `endDate`).
- **LessonSession (`Lesson`)**: Từng buổi học trong kế hoạch đào tạo 24 buổi / 8 tuần (`id`, `sessionNumber`, `weekIndex`, `date`, `type`: `class` | `review` | `demo` | `mid` | `final`, `lcContent`, `rcContent`, `resources`).
- **LearningResource**: Tài liệu học tập chung của khóa hoặc tài liệu theo từng buổi (`PDF`, `Audio`, `Video`, `Link`).
- **AssignmentItem & AssignmentSubmission**: Tách bạch giữa đề bài được giao (`AssignmentItem`) và bài nộp của học viên (`AssignmentSubmission`).
  - Trạng thái bài nộp (`AssignmentSubmissionStatus`):
    - `todo`: Cần nộp
    - `submitted`: Chờ kiểm tra (học viên vừa nộp link Google Drive hoặc tự nhập điểm Demo Test)
    - `passed`: Đã đạt (giáo viên đã xác nhận)
    - `failed`: Chưa đạt (giáo viên yêu cầu làm lại)
- **AttendanceRecord**: Lịch sử điểm danh do giáo viên ghi nhận (`on`: Đúng giờ, `late`: Muộn, `excused`: Có phép, `absent`: Không phép, `none`: Chưa học). Học viên chỉ có quyền xem.
- **OfficialExamRecord (`ExamResult`)**: Kết quả kỳ thi Middle Test và Final Test chính thức do giáo viên cập nhật, bao gồm điểm LC, RC, Tổng điểm và độ chính xác từng Part (`p1`..`p4`, `p5`, `p6`, `p7s`, `p7d`, `p7t`).
- **SupportRequestRecord**: Yêu cầu hỗ trợ sau khóa học (`retake`: Học lại, `hold`: Bảo lưu, `resume`: Bảo lưu quay lại học, `transfer`: Chuyển lớp).
