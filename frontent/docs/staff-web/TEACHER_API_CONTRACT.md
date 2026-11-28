# HỢP ĐỒNG API PHÂN HỆ GIẢNG VIÊN (`TEACHER_API_CONTRACT`)

Các đường dẫn chuẩn hóa tại `STAFF_API_ENDPOINTS.teacher` (`apps/staff-web/src/services/api/endpoints.ts`):

| Phương thức | Endpoint (`/api/v1/...`) | Quyền & Scope bắt buộc tại Server | Payload / Query | Phản hồi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/staff/teacher/dashboard` | `teacher.dashboard.view` + `assigned_classes_only` | `?date=YYYY-MM-DD` | `TeacherDashboardData` |
| `GET` | `/staff/teacher/classes` | `teacher.classes.view` + `assigned_classes_only` | — | `AssignedTeacherClassItem[]` |
| `GET` | `/staff/teacher/classes/:id` | `teacher.classes.view` + `cls.teacherId === req.user.id` | `id` | `TeacherClassDetailBundle` (hoặc `403`) |
| `GET` | `/staff/teacher/teaching-plans` | `teaching-plan.view` + `assigned_classes_only` | `?classId=` | `SessionWithPlanItem[]` |
| `PUT` | `/staff/teacher/teaching-plans/:sessionId` | `teaching-plan.update` + `assigned_classes_only` | Nội dung bài giảng buổi học | `TeachingSessionPlanDto` |
| `GET` | `/staff/teacher/attendance` | `attendance.view` + `assigned_classes_only` | `?sessionId=` | `AttendanceSheetBundle` |
| `POST` | `/staff/teacher/attendance` | `attendance.create` / `attendance.update` | `{ sessionId, entries, editReason? }` | `204 / Success` |
| `GET` | `/staff/teacher/assignments` | `assignments.view` + `assigned_classes_only` | `?classId=` | `AssignmentWithSubmissionsItem[]` |
| `POST` | `/staff/teacher/assignments` | `assignments.create` + `assigned_classes_only` | Thông tin bài tập mới | `TeacherAssignmentRecordDto` |
| `PATCH` | `/staff/teacher/submissions/:id/grade` | `assignments.grade` + `assigned_classes_only` | `{ decision, score, teacherFeedback }` | `TeacherSubmissionRecordDto` |
| `GET` | `/staff/teacher/grades` | `grades.view` + `assigned_classes_only` | `?classId=&category=` | `GradebookBundle` |
| `POST` | `/staff/teacher/grades` | `grades.create` / `grades.update` | Điểm LC/RC & đợt kiểm tra | `StudentAssessmentGradeDto` |
| `GET` | `/staff/teacher/progress` | `teacher.classes.view` + `assigned_classes_only` | `?classId=` | `StudentProgressSummary[]` |
| `GET` | `/staff/teacher/schedule` | `teacher.schedule.view` | — | `{ mySessions, openClassesNeedingTeacher, myRequests }` |
| `POST` | `/staff/teacher/teaching-requests` | `teacher.schedule.request` | `{ classId, note }` | `TeachingScheduleRequestDto` (`status: 'Requested'`) |
