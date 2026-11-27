# CÁC HẠNG MỤC CÒN LẠI & PHỤ THUỘC BACKEND (`AUTH_REMAINING_ISSUES`)

## 1. Bảng Phân định Rõ Trạng thái Triển khai

| Hạng mục | Trạng thái hiện tại | Ghi chú kỹ thuật |
| :--- | :---: | :--- |
| Giao diện Login không chọn Role / Portal (`client-web` & `staff-web`) | **Đã triển khai** | Sẵn sàng sử dụng |
| Quản lý Tài khoản tách biệt `UserAccount` / `EmployeeProfile` (11 cột + Modal 3 khu vực) | **Đã triển khai** | Sẵn sàng sử dụng |
| `Fixed Role & Permission Registry` + Trang Role chỉ đọc (`/accounts/roles`) | **Đã triển khai** | Không có bất kỳ chức năng sửa Permission nào cho Admin |
| `PortalResolver` + Allowlist `VITE_CLIENT_APP_URL` / `VITE_STAFF_APP_URL` | **Đã triển khai** | Chống Open Redirect giữa hai Frontend |
| `mockAuthAdapter` (băm `SHA-256`, mật khẩu riêng từng tài khoản Demo) | **Mock (Development)** | Chỉ dùng kiểm thử giao diện khi chưa có Backend; không tuyên bố bảo mật thực tế |
| `httpAuthAdapter` (`/api/v1/auth/*`, `/api/v1/staff/*`) | **Đã chuẩn bị Adapter** | Chờ máy chủ Backend Node.js hoạt động |
| Kiểm thử trình duyệt thực tế (`Interactive Browser Verification`) | **Chưa kiểm thử tự động (`NOT VERIFIED`)** | Cần người dùng/QA mở trình duyệt trên `:5173` và `:5174` để nghiệm thu trực quan |
| Máy chủ Backend Node.js, Database, Hash `Argon2id/bcrypt`, SMTP Email, Cookie SSO | **Cần Backend triển khai** | Tuyệt đối không xây trong nhiệm vụ Frontend này |

---

## 2. Yêu cầu Bắt buộc Khi Xây dựng Backend Node.js Tiếp theo

1. **Xác thực & Băm Mật khẩu Thực tế:**
   - Sử dụng `Argon2id` hoặc `bcrypt` tại tầng Server; áp dụng Rate Limiting & tạm khóa khi đăng nhập sai nhiều lần liên tiếp.
2. **Thống nhất Cơ chế Session / `HttpOnly Cookie` & CORS giữa Hai Origin:**
   - Thống nhất với Backend Developer việc dùng `HttpOnly; Secure; SameSite=Lax` Cookie trên domain chung (ví dụ `.englishcenter.edu.vn` cho `englishcenter.edu.vn` và `staff.englishcenter.edu.vn`) để khi Backend điều hướng chéo Portal, phiên được nhận diện an toàn mà không bao giờ truyền token qua URL hoặc lưu Refresh Token dài hạn trong `localStorage`.
3. **Nguồn Quyền & Data Scope Thực thi trên Từng API:**
   - Backend quản lý bảng ánh xạ `ROLE_PERMISSIONS` cố định chính thức và kiểm tra `PermissionCode` + điều kiện lọc `OWN / TEAM / BRANCH / ALL` trực tiếp trong mọi truy vấn Database (Frontend Guard chỉ có vai trò hỗ trợ UX).
4. **Dịch vụ Email Kích hoạt & Đặt lại Mật khẩu:**
   - Phát hành token một lần có thời hạn ngắn khi gọi `POST /api/v1/staff/users` (`INVITE_LINK`), `POST /api/v1/staff/users/:id/activate` và `POST /api/v1/staff/users/:id/password-reset`.
5. **Nhật ký Kiểm toán Bất biến (`Audit Log`):**
   - Lưu lịch sử tạo tài khoản, khóa/mở khóa, đặt lại mật khẩu tại bảng chỉ ghi thêm (`append-only`) trên Database.
