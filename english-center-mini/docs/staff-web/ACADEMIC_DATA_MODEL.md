# MÔ HÌNH DỮ LIỆU GIÁO VỤ (`ACADEMIC_DATA_MODEL`)

## 1. Đối chiếu với Client Web (`studentPortal.types.ts`)

| Thực thể Staff Web (`@english-center/contracts`) | Thực thể tương ứng trên Client Web | Khóa liên kết & Tương thích |
| :--- | :--- | :--- |
| `AcademicStudentDto` | `StudentProfile` | Khớp `studentCode`, `fullName`, `phone`, `email`, `entryScore { lc, rc, total }`, `goalScore { lc, rc, total }` |
| `CenterClassOfferingDto` | `StudentClassInfo` & `ScheduleClassItem` | Dùng chung mã lớp (`EC-S01`, `TOEIC-FD01`, `ONL-SB01`), `courseId`, `branchId`, `studyDays`, `startTime`–`endTime` |
| `StudentEnrollmentRecordDto` | Quan hệ `Student -> Class` | Lưu `status` (`active \| hold \| transferred \| completed \| dropped`), `agreedTuitionVnd`, `enrolledAt`, `endedAt` |
| `StudentAcademicRequestDto` | `SupportRequestRecord` | Tương thích các loại đơn `hold`, `transfer`, `retake` |
| `CourseSyllabusVersionDto` | `LessonSession` (khung mẫu) | Định nghĩa phiên bản `versionCode`, `effectiveFrom`, danh sách `sessions` chuẩn `LessonActivityType` |

## 2. Cấu trúc Lưu trữ Session Mock

- **`ec_staff_mock_center_classes_v1`**: Kho Lớp học trung tâm duy nhất dùng chung giữa Admin (`/training`), Sales (`/sales/courses`, `/sales/registrations/new`), Giáo vụ (`/academic/classes`), Kế toán và Giảng viên.
- **`ec_staff_mock_academic_ops_v1`**: Lưu `students`, `enrollments`, `transferHistory`, `placementContactLogs`, `academicRequests`, `courseSyllabi`.
