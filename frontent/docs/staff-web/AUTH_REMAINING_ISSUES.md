# CÁC HẠNG MỤC AUTH & RBAC PHỤ THUỘC BACKEND (`AUTH_REMAINING_ISSUES`)

Tài liệu này ghi nhận minh bạch ranh giới giữa phần **Frontend Architecture & Mock Auth** đã hoàn thiện trong `apps/staff-web` và các hạng mục bắt buộc phải do **Backend Node.js + Database** thực thi ở giai đoạn tiếp theo.

---

## 1. Hạng mục Bảo mật Bắt buộc Triển khai tại Backend Node.js

1. **Băm mật khẩu chuẩn máy chủ (`Argon2id` / `bcrypt`):**
   - Hiện tại `mockAuthAdapter` sử dụng Web Crypto `SHA-256` kèm salt định danh để không lưu mật khẩu văn bản thuần khi kiểm thử cục bộ.
   - Khi xây dựng Backend, mật khẩu nhân viên bắt buộc được băm bằng `Argon2id` (hoặc `bcrypt` cost >= 12) tại tầng Server; trình duyệt chỉ gửi mật khẩu qua kênh `HTTPS` trong thân request `POST /api/v1/auth/login` và `POST /api/v1/auth/first-login-password`.
2. **Quản lý Phiên bằng `HttpOnly Secure Cookie` & Refresh Token Rotation:**
   - `httpClient.ts` và `httpAuthAdapter.ts` đã cấu hình sẵn `credentials: 'include'`. Backend cần phát hành Refresh/Session Cookie với cờ `HttpOnly; Secure; SameSite=Lax` và cơ chế thu hồi phiên tập trung trên Redis/Database ngay khi tài khoản chuyển sang `LOCKED` hoặc `DISABLED`.
3. **Chống Tấn công Dò mật khẩu (`Rate Limiting` & `Account Lockout`):**
   - Backend cần áp dụng giới hạn tần suất theo IP và theo `identifier` trên `/api/v1/auth/login` (ví dụ tối đa 5 lần sai liên tiếp trong 15 phút sẽ tự động tạm khóa `LOCKED` và ghi `AccountPermissionAuditLog`).
4. **Dịch vụ Gửi Email Kích hoạt & Đặt lại Mật khẩu (`SMTP` / `Transactional Email`):**
   - Ở chế độ Mock hiện tại, phương thức `INVITE_LINK` và nút **Mời lại** chỉ ghi nhận trạng thái `PENDING_ACTIVATION` + thời điểm `invitationSentAt` một cách trung thực trên giao diện, không sinh token kích hoạt giả trên trình duyệt.
   - Backend cần sinh One-Time Activation/Reset Token ký mật mã có thời hạn ngắn (VD: 30 phút – 24 giờ), lưu hash của token trong Database và gửi đường dẫn kích hoạt qua dịch vụ email thực tế.
5. **Thực thi Phân quyền (`PermissionGuard`) & Lọc Phạm vi Dữ liệu (`AccessScopeType`) ở Tầng API/SQL:**
   - Mọi kiểm tra ẩn/hiện trên React (`AuthGuard`, `PermissionGuard`, `ActionGuard`) chỉ phục vụ trải nghiệm người dùng.
   - Backend bắt buộc gắn Middleware kiểm tra `PermissionCode` trên từng endpoint và tự động nối điều kiện `WHERE` theo `OWN` (`assignedSaleId = currentUser.id` / `teacherId = currentUser.id`), `TEAM` (`departmentId`), hoặc `BRANCH` (`branchId IN scopeIds`) trong mọi câu truy vấn cơ sở dữ liệu.
6. **Lưu trữ Bất biến Nhật ký Kiểm toán (`Immutable Audit Log`):**
   - Bảng `account_permission_audit_logs` trên Database chỉ cho phép `INSERT` (append-only), không cho phép `UPDATE` hoặc `DELETE` kể cả với vai trò `ADMIN`.

---

## 2. Hướng dẫn Chuyển đổi từ Mock Auth sang HTTP Auth Adapter

Khi máy chủ Backend Node.js sẵn sàng tại `/api/v1`, chỉ cần thiết lập biến môi trường cho `apps/staff-web`:

```env
VITE_STAFF_API_URL=https://api.englishcenter.edu.vn/api/v1
VITE_STAFF_USE_MOCK=false
```

Khi `VITE_STAFF_USE_MOCK=false`:
- `authService` tự động chuyển sang [`httpAuthAdapter.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/repositories/httpAuthAdapter.ts).
- Khối gợi ý tài khoản Demo (`getDevMockHints()`) tự động ẩn hoàn toàn khỏi màn hình `/login`.
- Toàn bộ `StaffAuthProvider`, `StaffLoginPage`, `AccountsPage`, `RolesPage`, `StaffSidebar` và `Router` giữ nguyên 100% không phải viết lại.
