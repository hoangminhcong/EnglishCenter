# BÁO CÁO KIỂM TOÁN HỆ THỐNG XÁC THỰC (`AUTHENTICATION_AUDIT`)

> **Giai đoạn:** Giai đoạn 1 – Audit hiện trạng (Chưa chỉnh sửa mã nguồn ứng dụng).
> **Phạm vi rà soát:** `apps/client-web`, `apps/staff-web`, `packages/contracts`, `packages/api-client`.

---

## 1. Tổng quan Hiện trạng Hai Frontend Độc lập

| Tiêu chí đối chiếu | `apps/client-web` (Port `5173`) | `apps/staff-web` (Port `5174`) | Đánh giá so với Kiến trúc Mục tiêu |
| :--- | :--- | :--- | :--- |
| **Chế độ vận hành hiện tại** | Mock Service (`USE_MOCK_API = true`) | Mock Auth Adapter (`USE_STAFF_MOCK_API = true`) | Đúng phạm vi Frontend-Only (Chưa có Backend) |
| **Giao diện chọn Role / Portal trên Login** | Không có dropdown chọn Role/Portal | Không có dropdown chọn Role/Portal | **Đạt** |
| **Xác thực mật khẩu trong Mock** | **CHƯA KIỂM TRA MẬT KHẨU** ([`authService.ts:144-175`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/services/authService.ts#L144-L175)) | Kiểm tra băm một chiều `SHA-256` ([`mockAuthAdapter.ts:97-100`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/repositories/mockAuthAdapter.ts#L97-L100)) | **Cần khắc phục ở `client-web`** |
| **Mật khẩu mẫu dùng chung (`Shared Password`)** | **ĐANG DÙNG CHUNG `'English123'`** cho mọi nút Demo ([`AuthPage.tsx:180-184`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/pages/AuthPage.tsx#L180-L184)) | Đã loại bỏ `Staff@2026`; mỗi tài khoản Demo có mật khẩu riêng | **Cần khắc phục ở `client-web` + bổ sung `student.demo`** |
| **Hiển thị tài khoản Demo ngoài DEV** | Hiển thị cố định trên UI, chưa bọc `import.meta.env.DEV` ([`AuthPage.tsx:321-343`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/pages/AuthPage.tsx#L321-L343)) | Đã bọc `import.meta.env.DEV && USE_STAFF_MOCK_API` ([`authService.ts:67-72`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/services/authService.ts#L67-L72)) | **Cần khắc phục ở `client-web`** |
| **Phân biệt `AccountType` & `PortalType`** | **Chưa có** (`role: 'student' \| 'staff' \| 'admin'` nội bộ) | **Chưa có** trong `AuthenticatedStaffSessionDto` | **Thiếu trên cả 2 Frontend & `packages/contracts`** |
| **Tài khoản mẫu `student.demo`** | Chưa có (`hocvien01`, `minhanh.toeic`) | Chưa nhận diện được `student.demo` để trả `portal: 'CLIENT'` | **Cần bổ sung đồng bộ** |
| **Xóa Query Cache khi Logout / Đổi tài khoản** | Đã gọi `queryClient.clear()` ([`authService.ts:134, 281`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/services/authService.ts#L134)) | Đã gọi `staffQueryClient.clear()` ([`StaffAuthProvider.tsx:84, 110`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/context/StaffAuthProvider.tsx#L84)) | **Đạt** |
| **Kiểm tra thương hiệu `English Center`** | `0` tham chiếu `HMC` | `0` tham chiếu `HMC` | **Đạt** |

---

## 2. Chi tiết Các Lỗ hổng & Bất cập Xác thực Phát hiện được

### 2.1. `apps/client-web` tự động đăng nhập thành Học viên với bất kỳ chuỗi nào và bỏ qua mật khẩu
- **Vị trí:** [`apps/client-web/src/features/auth/services/authService.ts#L144-L175`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/services/authService.ts#L144-L175).
- **Hiện trạng:**
  1. Hàm `login(payload)` hoàn toàn **không kiểm tra `payload.password`**. Nhập mật khẩu bất kỳ đều thành công.
  2. Khi không tìm thấy `identifier` trong `initialMockUsers`, nhánh `if (!matched)` tự động nhân bản `stu-001` và gán `role: 'student'`. Hệ quả là nếu nhân viên gõ `admin.demo` hoặc `sale.demo` trên `client-web`, hệ thống biến họ thành Học viên thay vì xác định `{ accountType: 'STAFF', portal: 'STAFF' }` để điều hướng sang `STAFF_APP_URL`!
  3. Chưa có phân lớp `mockAuthAdapter` / `httpAuthAdapter` rõ ràng ở `client-web` và chưa có `GET /api/v1/auth/me`.

### 2.2. `apps/client-web` đang dùng mật khẩu mẫu chung `'English123'` và hiển thị lộ ngoài DEV
- **Vị trí:** [`apps/client-web/src/features/auth/pages/AuthPage.tsx#L180-L184`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/pages/AuthPage.tsx#L180-L184) và [`#L321-L343`](file:///d:/Web/english-center-mini/apps/client-web/src/features/auth/pages/AuthPage.tsx#L321-L343).
- **Hiện trạng:** Hàm `fillDemoAccount` điền cứng `'English123'` cho mọi tài khoản mẫu, chưa có tài khoản chuẩn `student.demo`, và khối gợi ý tài khoản mẫu chưa ẩn khi build Production.

### 2.3. `apps/staff-web` chưa nhận diện tài khoản `STUDENT` để điều hướng sang `CLIENT` Portal
- **Vị trí:** [`apps/staff-web/src/features/auth/repositories/mockAuthAdapter.ts#L75-L84`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/repositories/mockAuthAdapter.ts#L75-L84).
- **Hiện trạng:** `mockAuthAdapter` chỉ tra cứu trong `userAccounts` của nhân sự. Nếu học viên (`student.demo`) đăng nhập nhầm tại `staff-web`, hệ thống báo sai mật khẩu (`401`) thay vì mô phỏng đúng luồng Backend: xác thực thành công -> trả `{ accountType: 'STUDENT', portal: 'CLIENT' }` -> `PortalResolver` chuyển hướng an toàn về `CLIENT_APP_URL` và từ chối tạo phiên trên `staff-web`.

### 2.4. Cấu trúc thư mục `features/auth/` trong `staff-web`
- Hiện tại `mockAuthAdapter.ts` và `httpAuthAdapter.ts` đang nằm trong `features/auth/repositories/`. Cần chuẩn hóa sang `features/auth/adapters/` (giữ gọn gàng, không tạo file rỗng) và đảm bảo HTTP Adapter có đủ `login()`, `getCurrentUser()` (`getMe`), `logout()`, `refreshSession()`.

---

## 3. Các Phần Đang Hoạt động Tốt Cần Kế thừa

1. **Xử lý lỗi đăng nhập chuẩn bảo mật trên `staff-web`** ([`StaffLoginPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/pages/StaffLoginPage.tsx)):
   - Sai tài khoản hoặc mật khẩu đều trả thông báo chung: `"Tên đăng nhập hoặc mật khẩu không chính xác."` (`401`).
   - Tài khoản `LOCKED` / `DISABLED` trả: `"Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên."` (`403`).
   - Tài khoản `PENDING_ACTIVATION` trả thông báo chờ kích hoạt rõ ràng (`403`).
   - Phân biệt rõ lỗi mạng (`NETWORK_ERROR` / `TIMEOUT_ERROR`), lỗi cấu hình/server (`500`) với lỗi xác thực (`401`).
2. **Quản lý Session & Interceptor `401` vs `403`** ([`httpClient.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/api/httpClient.ts)):
   - Gặp `401`: tự động xóa token RAM, xóa `staffQueryClient`, quay về `/login?reason=session_expired`.
   - Gặp `403`: giữ nguyên phiên làm việc, hiển thị trang `403 – Forbidden`.
