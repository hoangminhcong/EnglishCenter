# KIỂM TOÁN ĐIỀU HƯỚNG GIỮA HAI FRONTEND (`PORTAL_ROUTING_AUDIT`)

> **Giai đoạn:** Giai đoạn 1 – Audit hiện trạng (Chưa chỉnh sửa mã nguồn ứng dụng).

---

## 1. Hiện trạng Cấu hình Port & Biến Môi trường Hai Ứng dụng

| Ứng dụng | Dev Port (`vite.config.ts`) | Preview Port | Biến `.env.example` hiện có | Các biến còn thiếu cần bổ sung |
| :--- | :---: | :---: | :--- | :--- |
| **`apps/client-web`** | `5173` (`strictPort: true`) | `4173` | `VITE_API_BASE_URL`, `VITE_USE_MOCK_API`, `VITE_DATA_SOURCE` | `VITE_CLIENT_APP_URL`, `VITE_STAFF_APP_URL` |
| **`apps/staff-web`** | `5174` (`strictPort: true`) | `4174` | `VITE_STAFF_API_BASE_URL`, `VITE_STAFF_USE_MOCK_API`, `VITE_STAFF_DATA_SOURCE` | `VITE_CLIENT_APP_URL`, `VITE_STAFF_APP_URL`, đồng bộ `VITE_API_BASE_URL` |

---

## 2. Phân tích Các Lỗ hổng Điều hướng Portal Hiện tại

### 2.1. Chưa có `PortalResolver` và Allowlist URL giữa `CLIENT` và `STAFF`
- **Hiện trạng:** Cả `apps/client-web` và `apps/staff-web` chưa có module `portalResolver` để kiểm tra trường `portal: 'CLIENT' | 'STAFF'` và `accountType: 'STUDENT' | 'STAFF'` từ kết quả xác thực.
- **Hệ quả thực tế hiện nay:**
  1. Nếu nhân sự (`admin.demo`, `sale.demo`, `teacher.demo`...) đăng nhập tại `client-web` (`http://localhost:5173/login`), `client-web` **tự tạo phiên Học viên giả** thay vì phát hiện `portal === 'STAFF'` và điều hướng sang `http://localhost:5174`.
  2. Nếu học viên (`student.demo`) đăng nhập tại `staff-web` (`http://localhost:5174/login`), `staff-web` báo lỗi sai mật khẩu thay vì xác định `accountType === 'STUDENT'`, `portal === 'CLIENT'`, từ chối mở giao diện `staff-web` và điều hướng an toàn sang `http://localhost:5173`.
  3. Tại `client-web` [`StudentLayout.tsx#L55`](file:///d:/Web/english-center-mini/apps/client-web/src/layouts/StudentLayout.tsx#L55), chỉ kiểm tra `if (!isAuthenticated || !user)` mà chưa kiểm tra `user.accountType === 'STUDENT' && user.portal === 'CLIENT'`.
  4. Tại `client-web` [`AuthPage.tsx#L64-L70`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/pages/AuthPage.tsx#L64-L70), `redirectPath = location.state?.from || '/'` chưa kiểm tra đường dẫn nội bộ hợp lệ (chống open-redirect dạng `//evil.com` hoặc `https://...`) và khi học viên đăng nhập trực tiếp tại `/login` đang đưa về `'/'` thay vì `defaultLandingRoute` (`/student/dashboard`).

---

## 3. Thiết kế Chuẩn `PortalResolver` & Allowlist Sẽ Triển khai ở Giai đoạn 4

### 3.1. Nguyên tắc Allowlist Tuyệt đối (Chống Open Redirect)
- Chỉ chấp nhận điều hướng liên ứng dụng tới đúng gốc (`origin`) nằm trong danh sách cấu hình môi trường:
  - `CLIENT_APP_URL`: từ `import.meta.env.VITE_CLIENT_APP_URL` (mặc định DEV: `http://localhost:5173`).
  - `STAFF_APP_URL`: từ `import.meta.env.VITE_STAFF_APP_URL` (mặc định DEV: `http://localhost:5174`).
- **Tuyệt đối không** đọc `redirectUrl` từ query string của người dùng (`?redirect=https://...`) hoặc dùng `redirectUrl` tùy ý từ JSON response nếu không khớp `origin` trong Allowlist.
- Với điều hướng nội bộ trong cùng ứng dụng (`state.from`), chỉ cho phép đường dẫn tương đối bắt đầu bằng một dấu `/` duy nhất (`pathname.startsWith('/') && !pathname.startsWith('//')`).

### 3.2. Bảng Quyết định của `PortalResolver`

| Ứng dụng đang mở | Kết quả xác thực từ Backend / Mock Adapter | Hành động bắt buộc của Frontend |
| :--- | :--- | :--- |
| **`staff-web` (`STAFF`)** | `accountType: 'STAFF'`, `portal: 'STAFF'` | Lưu phiên `STAFF`, giải quyết `defaultLandingRoute` theo Permission (`/dashboard`, `/sales/dashboard`, `/accounting/dashboard`, `/academic/dashboard`, `/teacher/dashboard`). |
| **`staff-web` (`STAFF`)** | `accountType: 'STUDENT'`, `portal: 'CLIENT'` | **Không tạo phiên `STAFF`**, xóa mọi state cục bộ trên `staff-web`, hiển thị thông báo rõ *"Tài khoản Học viên thuộc Cổng Học viên (Client Web)"* kèm chuyển hướng an toàn tới `CLIENT_APP_URL` đã qua kiểm tra Allowlist. |
| **`client-web` (`CLIENT`)** | `accountType: 'STUDENT'`, `portal: 'CLIENT'` | Lưu phiên `CLIENT`, điều hướng về trang nội bộ đã yêu cầu hoặc `/student/dashboard`. |
| **`client-web` (`CLIENT`)** | `accountType: 'STAFF'`, `portal: 'STAFF'` | **Không tạo phiên Học viên trên `client-web`**, hiển thị thông báo điều hướng sang `STAFF_APP_URL` đã qua kiểm tra Allowlist. |

> **Lưu ý kiến trúc quan trọng:** Vì `localhost:5173` và `localhost:5174` là hai `origin` khác nhau nên `sessionStorage` / `localStorage` của trình duyệt hoàn toàn cô lập giữa hai ứng dụng. Trong giai đoạn Mock (chưa có Backend Cookie dùng chung domain), khi chuyển hướng từ Portal A sang Portal B, ứng dụng sẽ chuyển người dùng sang trang `/login` của đúng Portal đích kèm thông báo hướng dẫn minh bạch (tuyệt đối không truyền mật khẩu hay token nhạy cảm qua URL query string!). Khi có Backend thật, cơ chế SSO / `HttpOnly` Cookie trên domain cha sẽ do Backend thống nhất.
