> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/backend/BACKEND_READINESS.md`.

# DANH SÁCH KIỂM TRA SẴN SÀNG TÍCH HỢP BACKEND NODE.JS (BACKEND READINESS CHECKLIST)

Tài liệu này xác nhận mức độ sẵn sàng của Frontend **English Center** trước khi kết nối với Backend Node.js & Cơ sở dữ liệu thực tế, đồng thời liệt kê rõ các hạng mục Backend bắt buộc thực thi để hệ thống vận hành an toàn ở môi trường Production.

---

## 1. HẠNG MỤC ĐÃ HOÀN TẤT TRÊN FRONTEND (`READY`)

- [x] **Tách biệt hoàn toàn tầng giao tiếp dữ liệu khỏi UI Components:**
  - Mọi trang và component gọi qua `api/*`, `services/*`, `repositories/*` và custom hooks (`useAuth`, `useStudentPortalData`, `useTests`, `useAttemptSession`, `useSchedules`, `useStudyZone`).
- [x] **Cờ chuyển đổi môi trường linh hoạt (`src/services/api/apiConfig.ts`):**
  - Hỗ trợ biến môi trường `VITE_API_BASE_URL` và `VITE_USE_MOCK_API` (`true` / `false`). Khi chuyển `VITE_USE_MOCK_API=false`, ứng dụng tự động gọi API thật qua `httpClient` (`axios`).
- [x] **Cấu hình sẵn HTTP Client & Global Query Client:**
  - `src/services/api/httpClient.ts` tự động đính kèm Access Token (nếu dùng Bearer) và phát sự kiện đăng xuất sạch khi nhận mã `401 Unauthorized`.
  - `src/services/api/queryClient.ts` cấu hình sẵn `QueryClient` với chính sách retry và staleTime hợp lý, phân tách `queryKey` theo `user.id`.
- [x] **Chuẩn hóa mô hình dữ liệu & Validation đầu vào:**
  - Mọi form tương tác (Đăng nhập, Đăng ký, Quên/Đổi mật khẩu, Tư vấn khóa học, Nộp bài tập Google Drive, Yêu cầu học vụ) đều có validation chặt chẽ ở client (`validators.ts` và `zod` schema tại `studentPortal.schema.ts`), chống double-submit khi đang gửi (`isSubmitting` / `isPending`).
- [x] **Đầy đủ trạng thái giao diện (`Loading`, `Empty`, `Error`, `NotFound`):**
  - Có `RouteErrorPage.tsx` bắt lỗi cấp Router, `NotFoundPage.tsx` cho đường dẫn `404`, `NoEnrollmentCard.tsx` cho học viên mới chưa xếp lớp, cùng trạng thái loading/retry trên mọi danh sách dữ liệu.
- [x] **Phân lập dữ liệu theo người dùng (`Multi-tenant / User Isolation`):**
  - Toàn bộ lịch sử bài làm, lượt thi đang làm dở, bài nộp BTVN và yêu cầu hỗ trợ đã gắn và kiểm tra `ownerId` (`user.id`), không rò rỉ dữ liệu khi đổi tài khoản trên cùng trình duyệt.
- [x] **Vệ sinh bảo mật phía Client:**
  - Không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng nhập; kiểm tra URL ngoài qua `toSafeExternalUrl` chống `javascript:` URI; không lưu mật khẩu vào `localStorage` hay `sessionStorage`.

---

## 2. HẠNG MỤC BACKEND NODE.JS CẦN TRIỂN KHAI KHI KẾT NỐI THỰC TẾ

### 2.1. Xác thực, Phiên đăng nhập & Phân quyền (Auth & RBAC)
- [ ] Cấp phát `Access Token` ngắn hạn (15 phút) kết hợp `Refresh Token` lưu trong **`HttpOnly, Secure, SameSite=Lax/Strict Cookie`** (thay thế việc lưu đối tượng phiên giả lập trong `localStorage`).
- [ ] Triển khai Middleware phân quyền RBAC trên Server (`student`, `teacher`, `academic`, `accounting`, `sale`, `admin`), luôn lấy `userId` từ JWT đã xác thực.
- [ ] Áp dụng `bcrypt` / `argon2` băm mật khẩu và Rate Limiting (`express-rate-limit`) cho `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/consultations`.

### 2.2. Bảo mật Ngân hàng Đề thi & Chấm điểm TOEIC (`Test Online`)
- [ ] Lưu bảng `server_test_answer_keys` trong Database và **không bao giờ serialize** `correctOptionId` hoặc `explanation` trong API `GET /tests/:slug` và `GET /attempts/:attemptId` khi `status = 'in_progress'`.
- [ ] Xác thực thời gian nộp bài trên Server: so sánh `now()` với `attempt.startedAt + attempt.durationSeconds + 5s (ân hạn trễ mạng)` để chống can thiệp đồng hồ trình duyệt.
- [ ] Thực thi cơ chế phiên bản đề (`test_versions`): khi Admin sửa câu hỏi hoặc thang quy đổi điểm của đề đã xuất bản, tạo bản ghi `test_version` mới để các lượt thi cũ giữ nguyên kết quả lịch sử.
- [ ] Lưu trữ file âm thanh và hình ảnh đề thi trên Object Storage / CDN (S3, Cloudflare R2...) kèm Signed URL ngắn hạn cho phần thi Listening nhằm hạn chế tải trộm đề gốc.

### 2.3. Nghiệp vụ Đào tạo, Học phí & Quản trị (`Student Portal` & `Public Website`)
- [ ] Khi Kế toán xác nhận học phí và Giáo vụ tạo `Enrollment`, sao lưu cứng `agreed_tuition_vnd`, `entry_score`, `goal_score` vào bảng `enrollments`.
- [ ] Chỉ trả về các bản ghi có `status = 'published'` cho các endpoint công khai (`/courses`, `/schedules`, `/news`, `/careers`, `/tests`).
- [ ] Cấu hình CORS khớp chính xác domain Frontend và chuẩn hóa múi giờ `UTC` trong Database.

---

## 3. QUY TRÌNH CHUYỂN ĐỔI SANG BACKEND THẬT (3 BƯỚC)

1. Tạo file `.env.local` tại thư mục gốc Frontend:
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api/v1
   VITE_USE_MOCK_API=false
   ```
2. Cập nhật `withCredentials: true` trong `src/services/api/httpClient.ts` nếu Backend sử dụng `HttpOnly Refresh Cookie`.
3. Kiểm thử tích hợp lần lượt theo thứ tự: `Auth` -> `Public Catalog (Courses/Schedules/Branches)` -> `Consultations` -> `Student Portal` -> `Study Zone` -> `Test Online`.
