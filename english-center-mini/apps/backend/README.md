# English Center – Backend Service (Planned Architecture)

> **Trạng thái hiện tại:** Định hướng kiến trúc giai đoạn chuẩn bị tích hợp. Thư mục `apps/backend` hiện **chưa khởi tạo `package.json`** và **chưa tham gia npm Workspaces** theo đúng lộ trình tái cấu trúc Monorepo.

---

## 1. Kiến trúc mục tiêu

- **Mô hình:** **Modular Monolith** (1 Backend duy nhất + 1 Cơ sở dữ liệu tập trung phục vụ đồng thời cả `apps/client-web` và `apps/staff-web`).
- **Nền tảng kỹ thuật dự kiến:**
  - **Runtime & Framework:** Node.js LTS + **NestJS** (TypeScript).
  - **API Standard:** RESTful API có phiên bản tiền tố `/api/v1/` + tài liệu chuẩn hóa từ `@english-center/contracts` (`openapi.yaml`).
  - **Database & ORM:** **PostgreSQL** + **Prisma ORM**.
  - **Authentication & Security:** JWT Access Token ngắn hạn + `HttpOnly, Secure, SameSite` Refresh Cookie, phân tách luồng xác thực Học viên (`Student`) và Nhân sự nội bộ (`Staff`) kèm RBAC Guard kiểm tra quyền `module.action` trên từng endpoint.

---

## 2. Danh sách Module Nghiệp vụ Dự kiến (`src/modules/`)

1. `auth` — Đăng nhập, làm mới phiên, đổi/đặt lại mật khẩu cho Học viên & Nhân sự.
2. `users` — Quản lý tài khoản gốc (`UserAccount`).
3. `roles-permissions` — Quản lý vai trò (`ADMIN`, `ACCOUNTANT`, `TEACHER`, `ACADEMIC`, `SALES`, `HR`) và quyền chi tiết (`Permission`).
4. `students` — Hồ sơ học viên (`StudentProfile`), điểm đầu vào và mục tiêu đầu ra.
5. `employees` & `teachers` — Hồ sơ nhân sự nội bộ và hồ sơ giảng viên/trợ giảng.
6. `courses` — Danh mục chương trình đào tạo (`CourseCatalog`).
7. `classes` & `schedules` — Lớp học theo đợt khai giảng, ca học, phòng học và phân công giảng viên.
8. `enrollments` — Ghi danh học viên vào lớp, bảo lưu, chuyển lớp, học lại (bảo toàn lịch sử ghi danh).
9. `tuition` & `accounting` — Chính sách học phí, khoản phải thu (`Receivable`), phiếu thu (`Payment`/`Receipt`), hoàn phí (`Refund`) và công nợ.
10. `attendance` — Điểm danh theo từng buổi học (`ScheduleSession`).
11. `assignments`, `submissions` & `grades` — Bài tập giảng viên giao cho lớp, bài nộp học viên, chấm bài và điểm thi `Mid-test` / `Final-test`.
12. `learning-materials` & `study-zone` — Kho tài liệu học tập và kho bài tập tự luyện mở.
13. `test-online` & `toeic-config` — Ngân hàng đề thi TOEIC có phiên bản (`TestVersion`), thang điểm quy đổi, quản lý lượt làm bài (`TestAttempt`) và chấm điểm bảo mật trên Server (ẩn `AnswerKey` khi đang làm bài).
14. `content-cms` — Thông tin trung tâm, cơ sở, tin tức, tuyển dụng và thành tích học viên được phép công khai.
15. `reports` — Báo cáo vận hành, tuyển sinh, doanh thu và chất lượng đào tạo.

---

## 3. Khi bắt đầu triển khai Backend thực tế

1. Khởi tạo ứng dụng NestJS tại `apps/backend/`.
2. Bổ sung `"apps/backend"` vào mảng `"workspaces"` trong `package.json` gốc.
3. Kết nối schema DTO với `@english-center/contracts` và cấu hình biến môi trường riêng tại `apps/backend/.env` (tuyệt đối không đưa secret DB/JWT sang các biến `VITE_*` của Frontend).
