# CƠ CHẾ XÁC ĐỊNH ỨNG DỤNG & ĐIỀU HƯỚNG LIÊN PORTAL (`PORTAL_RESOLUTION`)

## 1. Luồng Quyết định Ứng dụng (`AccountType` -> `PortalType`)

Backend (hoặc Mock Auth Adapter trong giai đoạn hiện tại) xác định ứng dụng được phép truy cập ngay sau khi xác thực định danh:

| Nhóm người dùng | `accountType` | `portal` | Ứng dụng đích | Trang đích mặc định (`defaultLandingRoute`) |
| :--- | :---: | :---: | :--- | :--- |
| Học viên (`student.demo`) | `STUDENT` | `CLIENT` | `apps/client-web` (`VITE_CLIENT_APP_URL`) | `/student/dashboard` |
| Quản trị (`admin.demo`) | `STAFF` | `STAFF` | `apps/staff-web` (`VITE_STAFF_APP_URL`) | `/dashboard` |
| Tư vấn (`sale.demo`) | `STAFF` | `STAFF` | `apps/staff-web` (`VITE_STAFF_APP_URL`) | `/sales/dashboard` |
| Kế toán (`accountant.demo`) | `STAFF` | `STAFF` | `apps/staff-web` (`VITE_STAFF_APP_URL`) | `/accounting/dashboard` |
| Giáo vụ (`academic.demo`) | `STAFF` | `STAFF` | `apps/staff-web` (`VITE_STAFF_APP_URL`) | `/academic/dashboard` |
| Giảng viên (`teacher.demo`) | `STAFF` | `STAFF` | `apps/staff-web` (`VITE_STAFF_APP_URL`) | `/teacher/dashboard` |

---

## 2. Cấu hình Môi trường & Allowlist Chống Open Redirect

Cả hai ứng dụng khai báo thống nhất trong `.env.example`:
- `VITE_API_BASE_URL`
- `VITE_CLIENT_APP_URL` (mặc định DEV: `http://localhost:5173`)
- `VITE_STAFF_APP_URL` (mặc định DEV: `http://localhost:5174`)

### Thực thi Allowlist tại Frontend
- Tệp thực thi:
  - Staff Web: [`apps/staff-web/src/services/portal/portalResolver.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/portal/portalResolver.ts)
  - Client Web: [`apps/client-web/src/services/portal/portalResolver.ts`](file:///d:/Web/english-center-mini/apps/client-web/src/services/portal/portalResolver.ts)
- **Quy tắc an toàn:**
  1. Chỉ trích xuất tập `origin` hợp lệ từ `CLIENT_APP_URL` và `STAFF_APP_URL` cấu hình trong biến môi trường.
  2. Không bao giờ đọc tham số `?redirect=...` tùy ý trên thanh địa chỉ hoặc điều hướng đến một `redirectUrl` lạ ngoài Allowlist.
  3. Đường dẫn nội bộ `location.state.from` bắt buộc qua `sanitizeInternalRoutePath` (chỉ chấp nhận đường dẫn tương đối bắt đầu bằng đúng một dấu `/`, loại bỏ `//evil.com` hoặc `https://...`).

---

## 3. Hành vi Khi Đăng nhập Chéo Ứng dụng

1. **Học viên (`student.demo`) đăng nhập tại `staff-web` (`/login`):**
   - Adapter trả `outcome: 'PORTAL_REDIRECT_REQUIRED'` (`accountType: 'STUDENT'`, `targetPortal: 'CLIENT'`).
   - `staff-web` **từ chối tạo phiên làm việc**, xóa sạch state cục bộ và hiển thị hộp điều hướng an toàn sang `CLIENT_APP_URL` (`/login?portal_notice=client_required`).
   - Nếu học viên cố gõ URL trực tiếp `/dashboard` hoặc `/accounts` trên `staff-web`, `AuthGuard` kiểm tra `session.accountType === 'STAFF' && session.portal === 'STAFF'` và chặn ngay lập tức.
2. **Nhân sự (`admin.demo`, `sale.demo`...) đăng nhập tại `client-web` (`/login`):**
   - `client-web` xác định `accountType: 'STAFF'`, `portal: 'STAFF'`, **không tạo phiên Học viên**, và hiển thị hộp điều hướng an toàn sang `STAFF_APP_URL` (`/login?portal_notice=staff_required`).
   - `StudentLayout` trên `client-web` kiểm tra bắt buộc `user.accountType === 'STUDENT' && user.portal === 'CLIENT'`.
