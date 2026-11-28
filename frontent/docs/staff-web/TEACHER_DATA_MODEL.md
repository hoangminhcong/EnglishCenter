# MÔ HÌNH DỮ LIỆU GIẢNG VIÊN (`TEACHER_DATA_MODEL`)

## 1. Đối chiếu Thực thể với Student Portal (`client-web`)

| Thực thể Staff Web (`@english-center/contracts`) | Thực thể trên Student Portal (`client-web`) | Liên kết & Ràng buộc |
| :--- | :--- | :--- |
| `ClassScheduleSessionDto` | `LessonSession` | `classId`, `sessionNumber`, `weekIndex`, `sessionDate`, `activityType`, `officialTitle` |
| `TeachingSessionPlanDto` | Nội dung chi tiết `LessonSession` | `sessionId`, `classId`, `teacherId`, `topicTitle`, `lcContent`, `rcContent`, `learningObjectives`, `materialLinks`, `completionStatus` |
| `TeacherAttendanceEntryDto` | `AttendanceRecord` | Khóa duy nhất `(sessionId, studentId)`, `status` (`Unmarked \| Present \| Excused \| Unexcused`) |
| `TeacherAssignmentRecordDto` | `AssignmentItem` | `code`, `classId`, `sessionId`, `dueAt`, `submissionFormat`, `maxScore`, `targetScope` |
| `TeacherSubmissionRecordDto` | `AssignmentSubmission` | `assignmentId`, `studentId`, `status` (`NotSubmitted \| Submitted \| LateSubmitted \| Grading \| Graded \| ReturnedForRevision`), `score`, `teacherFeedback` |
| `StudentAssessmentGradeDto` | `OfficialExamRecord` | `category` (`regular \| mid \| final`), `listeningScore`, `readingScore`, `totalScore` (`null` = Chưa đánh giá vs `0` = 0 điểm) |
| `TeachingScheduleRequestDto` | Nội bộ Staff Web | `classId`, `teacherId`, `status` (`Requested \| UnderReview \| Approved \| Rejected \| Cancelled`) |

## 2. Nhật ký Kiểm toán Chuyên môn

- **`AttendanceAuditEntryDto`**: Tự động ghi nhận khi Giảng viên thay đổi trạng thái điểm danh của một buổi đã điểm danh trước đó (`previousStatus` → `nextStatus`, người sửa, thời điểm, lý do).
- **`GradeAuditEntryDto`**: Tự động ghi nhận khi Giảng viên điều chỉnh điểm tổng của bài kiểm tra (`previousTotal` → `nextTotal`, người sửa, thời điểm, ghi chú).
