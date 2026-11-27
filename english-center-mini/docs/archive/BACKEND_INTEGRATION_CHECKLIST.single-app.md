> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/backend/BACKEND_INTEGRATION_CHECKLIST.md`.

# CHECKLIST TÍCH HỢP BACKEND NODE.JS (`BACKEND_INTEGRATION_CHECKLIST.md`)

Tài liệu này hướng dẫn từng bước để đội ngũ phát triển chuyển đổi Frontend HMC TOEIC từ chế độ **Mock Data** sang kết nối **Backend Node.js & Database** trong môi trường thực tế.

---

## 1. Cấu hình Biến Môi trường (`.env`)

Tại thư mục gốc của dự án Frontend, tạo file `.env.production` hoặc `.env.local`:

```env
# Địa chỉ REST API của Backend Node.js
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Chuyển nguồn dữ liệu từ 'mock' sang 'api'
VITE_DATA_SOURCE=api
VITE_USE_MOCK_API=false
```

Khi `VITE_DATA_SOURCE=api`:
- `USE_MOCK_API` tại `src/services/api/apiConfig.ts` sẽ nhận giá trị `false`.
- Nếu quên cấu hình `VITE_API_BASE_URL` trên bản build production, `API_CONFIG_ERROR` sẽ chặn request và hiển thị thông báo rõ ràng thay vì âm thầm rơi về dữ liệu mẫu.

---

## 2. Xác thực (Authentication), Cookie & CORS

- [ ] **HttpOnly Cookie Session:** `httpClient.ts` đã được cấu hình `credentials: 'include'`. Backend Node.js cần cấu hình `cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true })`.
- [ ] **Không lưu mật khẩu/token nhạy cảm ở LocalStorage:** Khi đăng nhập thành công (`POST /auth/login`), Backend trả về thông tin hồ sơ cơ bản `AuthUser` trong body và đặt `access_token` / `refresh_token` vào `HttpOnly; Secure; SameSite=Lax` Cookie.
- [ ] **Xóa Cache khi Đăng xuất:** Hàm `authService.logout()` trên Frontend đã tự động gọi `POST /auth/logout`, xóa `authSessionStore` và gọi `queryClient.clear()` để xóa toàn bộ cache `TanStack Query`.
- [ ] **Xử lý `401 Unauthorized`:** Khi phiên đăng nhập hết hạn và Backend trả `HTTP 401`, Backend trả thông báo chuẩn để Frontend điều hướng học viên về `/login`.

---

## 3. Phân quyền & Quyền Sở hữu Dữ liệu (Authorization & Data Ownership)

- [ ] **Tự đăng ký tài khoản (`POST /auth/register`):** Backend bắt buộc gán cứng `role = 'student'`, bỏ qua mọi trường `role` nếu client cố tình gửi lên.
- [ ] **Cô lập dữ liệu Cổng học viên (`/students/me`, `/assignments/me`, `/attendance/me`, `/exam-results/me`):** Backend phải lấy `studentId` trực tiếp từ phiên xác thực (`req.user.id`), tuyệt đối không nhận `studentId` từ query params để tránh lỗ hổng IDOR (Insecure Direct Object Reference).
- [ ] **Quyền Điểm danh & Điểm số chính thức:**
  - Học viên chỉ có quyền `GET /attendance/me` (chỉ đọc).
  - Khi học viên gửi `POST /assignments/:id/submissions`, Backend luôn lưu trạng thái là `'submitted'` (*Chờ kiểm tra*) và `isConfirmedByTeacher = false`. Chỉ Giảng viên/Giáo vụ trên Management Portal mới có quyền chuyển trạng thái sang `'passed'` / `'failed'`.

---

## 4. Đồng bộ Quy tắc Phòng thi TOEIC (`Test Online`) và `Study Zone`

- [ ] **Không trả đáp án đúng khi đang làm bài:**
  - `GET /public/tests/:slug` và `GET /public/study-zone/exercises/:id` chỉ trả về nội dung câu hỏi và các phương án `A, B, C, D`.
  - Chỉ trả về `correctOptionId`, `explanation`, `transcript`, `translation` sau khi lượt thi đã nộp (`status === 'submitted' | 'expired'`).
- [ ] **Quản lý thời gian thi trên Server:**
  - Khi gọi `POST /public/test-attempts/start`, Backend tính toán `startedAt` và `deadlineAt` theo đồng hồ máy chủ.
  - Khi học viên xác nhận qua màn hình giới thiệu Part (`action: 'confirm_part_intro'`), Backend cộng bù khoảng thời gian dừng ở màn hình giới thiệu vào `deadlineAt` (có giới hạn trần hợp lý để chống gian lận).
- [ ] **Chống phát lại Audio Listening 1 lần:**
  - Khi nhóm Audio chuyển sang `PLAYING` hoặc `LOCKED` qua `POST /public/test-attempts/:attemptId/progress`, Backend ghi nhận trạng thái bất biến (không cho phép lùi từ `LOCKED` về `NOT_PLAYED`).

---

## 5. Xử lý File, Tài liệu & Múi giờ

- [ ] **Múi giờ chuẩn:** Toàn bộ mốc thời gian (`startedAt`, `deadlineAt`, `submittedAt`, `dueDate`) trao đổi qua API ở định dạng **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ss.sssZ`) và hiển thị trên giao diện học viên theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, `vi-VN`).
- [ ] **Liên kết nộp BTVN:** Backend cần kiểm tra lại URL bài nộp bằng Regex chỉ chấp nhận giao thức `https://` thuộc tên miền `drive.google.com` hoặc `docs.google.com` khớp với `validateHomeworkSubmission` trên Frontend.
