# HỢP ĐỒNG API PHÂN HỆ GIÁO VỤ (`ACADEMIC_API_CONTRACT`)

Các đường dẫn chuẩn hóa tại `STAFF_API_ENDPOINTS.academic` (`apps/staff-web/src/services/api/endpoints.ts`):

| Phương thức | Endpoint (`/api/v1/...`) | Quyền yêu cầu | Payload / Query | Phản hồi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/staff/academic/dashboard` | `academic.dashboard.view` | `?date=YYYY-MM-DD` | `AcademicDashboardData` |
| `GET` | `/staff/academic/students` | `students.view` | `?status=&courseId=&branchId=&q=` | `AcademicStudentDto[]` |
| `GET` | `/staff/academic/students/:id` | `students.view` | `id` | `AcademicStudentDetailBundle` |
| `POST` | `/staff/academic/students` | `students.create` | Thông tin học viên mới | `AcademicStudentDto` |
| `PUT` | `/staff/academic/students/:id` | `students.update` | Thông tin cập nhật | `AcademicStudentDto` |
| `GET` | `/staff/academic/classes` | `classes.view` | `?courseId=&branchId=&status=` | `EnrichedAcademicClassItem[]` |
| `GET` | `/staff/academic/classes/:id` | `classes.view` | `id` | `AcademicClassDetailBundle` |
| `POST` | `/staff/academic/classes` | `classes.create` | `UpsertAcademicClassInput` | `CenterClassOfferingDto` |
| `PUT` | `/staff/academic/classes/:id` | `classes.update` | `UpsertAcademicClassInput` | `CenterClassOfferingDto` |
| `POST` | `/staff/academic/classes/:id/enrollments` | `classes.assign_students` | `{ studentId, note? }` | `StudentEnrollmentRecordDto` |
| `POST` | `/staff/academic/class-transfers` | `classes.transfer_students` | `{ studentId, fromClassId, toClassId, reason }` | `204 / Success` |
| `GET` | `/staff/academic/placement-queue` | `class-placement.view` | `?month=YYYY-MM&courseId=` | `{ candidates, openClasses, contactLogs }` |
| `POST` | `/staff/academic/placement-contact-logs` | `class-placement.assign` | Kết quả liên hệ học viên | `PlacementContactLogDto` |
| `POST` | `/staff/academic/placement-confirm` | `class-placement.assign` | `{ candidateKey, targetClassId, note? }` | `{ studentCode, classCode, enrollmentCode }` |
| `GET` | `/staff/academic/student-requests` | `student-status.view` | `?type=&status=` | `StudentAcademicRequestDto[]` |
| `PATCH` | `/staff/academic/student-requests/:id/status` | `student-status.manage` | `{ toStatus, resolutionNote? }` | `StudentAcademicRequestDto` |
| `GET` | `/staff/academic/course-syllabi` | `course-content.view` | `?courseId=` | `CourseSyllabusVersionDto[]` |
| `POST` | `/staff/academic/course-syllabi` | `course-content.update` | Phiên bản giáo trình mới | `CourseSyllabusVersionDto` |
| `PATCH` | `/staff/academic/teaching-requests/:id/review` | `classes.update` | `{ decision, reviewNote? }` | `TeachingScheduleRequestDto` |
