# MA TRẬN ĐƯỜNG DẪN, SIDEBAR MENU & GUARD (`ROUTE_ACCESS_MATRIX`)

## 1. Staff Web (`apps/staff-web`)

Nguồn cấu hình: [`navigation.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/navigation.config.ts) & [`router/index.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/app/router/index.tsx).
Mọi route bên dưới đều nằm sau `<AuthGuard>` (`accountType === 'STAFF' && portal === 'STAFF'`) và `<PermissionGuard>` (trả trang `403 – Forbidden` nếu thiếu quyền, không tự ý mở module khác).

| Đường dẫn (`Path`) | Nhóm giao diện | `requiredPermissions` | Role được phép truy cập | Hành vi khi không đủ quyền |
| :--- | :--- | :--- | :--- | :--- |
| `/profile`, `/profile?tab=password` | Tài khoản cá nhân | Phiên `STAFF` hợp lệ | Tất cả 5 Role (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER`) | Chuyển về `/login` nếu chưa xác thực |
| `/dashboard` | Admin | `dashboard.view` | `ADMIN` | Hiển thị `403` |
| `/accounts` | Admin | `accounts.view` | `ADMIN` | Hiển thị `403` |
| `/accounts/roles`, `/roles` | Admin (Read-Only) | `roles.view` | `ADMIN` | Hiển thị `403` |
| `/courses` | Admin | `courses.view` | `ADMIN` | Hiển thị `403` |
| `/tuition` | Admin | `tuition.view` | `ADMIN` | Hiển thị `403` |
| `/training` | Admin | `training.view` | `ADMIN` | Hiển thị `403` |
| `/content/center-info` | Content CMS | `center_info.view` | `ADMIN` | Hiển thị `403` |
| `/content/branches` | Content CMS | `branches.view` | `ADMIN` | Hiển thị `403` |
| `/content/news` | Content CMS | `news.view` | `ADMIN` | Hiển thị `403` |
| `/content/jobs` | Content CMS | `jobs.view` | `ADMIN` | Hiển thị `403` |
| `/content/achievements` | Content CMS | `achievements.view` | `ADMIN` | Hiển thị `403` |
| `/learning/materials` | Học liệu & TOEIC | `materials.view` | `ADMIN` | Hiển thị `403` |
| `/learning/study-zone` & `/:exerciseId` | Học liệu & TOEIC | `study_zone.view` | `ADMIN` | Hiển thị `403` |
| `/learning/tests` & `/:testId` | Học liệu & TOEIC | `tests.view` | `ADMIN` | Hiển thị `403` |
| `/config/toeic` | Cấu hình hệ thống | `toeic_config.view` | `ADMIN` | Hiển thị `403` |
| `/reports` | Báo cáo | `reports.view` | `ADMIN` | Hiển thị `403` |
| `/sales/dashboard` | Sales CRM | `sales.dashboard.view` | `SALES` (`OWN`) | Hiển thị `403` (`ADMIN` cũng bị chặn mặc định) |
| `/sales/leads/:leadId` | Sales CRM | `sales.leads.view` | `SALES` (`OWN`), `ACADEMIC` (`ALL` chỉ xem) | Hiển thị `403` nếu ngoài Scope `OWN` |
| `/sales/courses` & `/:courseId` | Sales CRM | `sales.courses.view` | `SALES` | Hiển thị `403` |
| `/sales/registrations/new` | Sales CRM | `sales.registrations.create` | `SALES` | Hiển thị `403` |
| `/sales/registrations` & `/:id` | Sales CRM | `sales.registrations.view` | `SALES` (`OWN`), `ACADEMIC` (`ALL` xét duyệt) | Hiển thị `403` |
| `/accounting/dashboard` | Accounting Portal | `finance.dashboard.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/accounting/payments` | Accounting Portal | `finance.payments.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/accounting/receivables` & `/:id` | Accounting Portal | `finance.receivables.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/accounting/transactions` | Accounting Portal | `finance.transactions.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/accounting/receipts` | Accounting Portal | `finance.receipts.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/accounting/reports` | Accounting Portal | `finance.reports.view` | `ACCOUNTANT` | Hiển thị `403` |
| `/academic/dashboard` | Academic Portal | `academic.dashboard.view` | `ACADEMIC` | Hiển thị `403` |
| `/academic/students` & `/:studentId` | Academic Portal | `students.view` | `ACADEMIC` | Hiển thị `403` |
| `/academic/classes` & `/:classId` | Academic Portal | `classes.view` | `ACADEMIC` | Hiển thị `403` |
| `/academic/placement` | Academic Portal | `class-placement.view` | `ACADEMIC` | Hiển thị `403` |
| `/academic/requests` | Academic Portal | `student-status.view` | `ACADEMIC` | Hiển thị `403` |
| `/academic/course-content` | Academic Portal | `course-content.view` | `ACADEMIC` | Hiển thị `403` |
| `/teacher/dashboard` | Teacher Portal | `teacher.dashboard.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/classes` & `/:classId` | Teacher Portal | `teacher.classes.view` | `TEACHER` (`OWN`) | Hiển thị `403` (kể cả khi đổi `:classId` sang lớp GV khác) |
| `/teacher/teaching-plans` | Teacher Portal | `teaching-plan.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/attendance` | Teacher Portal | `attendance.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/assignments` | Teacher Portal | `assignments.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/gradebook` | Teacher Portal | `grades.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/progress` | Teacher Portal | `teacher.classes.view` | `TEACHER` (`OWN`) | Hiển thị `403` |
| `/teacher/schedule` | Teacher Portal | `teacher.schedule.view` | `TEACHER` (`OWN`) | Hiển thị `403` |

---

## 2. Client Web (`apps/client-web`)

| Đường dẫn (`Path`) | Khu vực | Điều kiện truy cập |
| :--- | :--- | :--- |
| `/`, `/courses/*`, `/schedule`, `/hoc-vien/*`, `/tai-lieu/*`, `/study-zone/*`, `/test-online/*`, `/about/*`, `/contact` | Website công khai | Công khai |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Xác thực Học viên | Công khai; nếu tài khoản `STAFF` đăng nhập sẽ kích hoạt `PortalResolver` chuyển sang `STAFF_APP_URL` |
| `/student/dashboard`, `/student/learning-plan`, `/student/assignments`, `/student/exam-results`, `/student/schedule`, `/change-password` | Student Portal | Bắt buộc phiên `accountType === 'STUDENT' && portal === 'CLIENT' && accountStatus === 'ACTIVE'`; nếu chưa đăng nhập chuyển về `/login` |
