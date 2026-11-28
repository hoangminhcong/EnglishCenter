# HỢP ĐỒNG API XÁC THỰC & QUẢN LÝ TÀI KHOẢN (`AUTH_API_CONTRACT`)

> **Trạng thái:** Hợp đồng API dự kiến tại [`packages/contracts`](file:///d:/Web/english-center-mini/packages/contracts/src/index.ts) và [`endpoints.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/api/endpoints.ts). **Chưa xây dựng API Server / Database trong phạm vi nhiệm vụ này.**

---

## 1. Nhóm Endpoint Xác thực Dùng Chung (`/api/v1/auth/*`)

### 1.1. `POST /api/v1/auth/login`
- **Auth:** Public.
- **Validation:** `identifier` không rỗng, `password` không rỗng; không nhận `role` hay `portal` từ phía Client.
- **Request DTO (`StaffLoginRequestDto`):**
```json
{
  "identifier": "sale.demo",
  "password": "user-entered-password"
}
```
- **Response DTO (`200 OK`):** Trả `outcome: 'AUTHENTICATED'` kèm phiên `UnifiedAuthMeResponseDto` (chứa `accountType`, `portal`, `role`, `permissions`, `scopes`, `defaultLandingRoute`), hoặc `outcome: 'PASSWORD_RESET_REQUIRED'`.
- **Error Responses:**
  - `401`: `"Tên đăng nhập hoặc mật khẩu không chính xác."`
  - `403`: `"Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên."` (`LOCKED` / `DISABLED`) hoặc thông báo chờ kích hoạt (`PENDING_ACTIVATION`).
  - `429`: Quá giới hạn số lần thử đăng nhập.

### 1.2. `GET /api/v1/auth/me`
- **Auth:** Session Cookie / Bearer Token hợp lệ.
- **Response DTO:** `AuthenticatedStaffSessionDto` (`accountType: 'STAFF'`, `portal: 'STAFF'`) hoặc `AuthenticatedClientSessionDto` (`accountType: 'STUDENT'`, `portal: 'CLIENT'`).
- **Error Responses:** `401` khi phiên hết hạn hoặc tài khoản bị chuyển sang `LOCKED` / `DISABLED`.

### 1.3. `POST /api/v1/auth/logout`
- **Auth:** Session hợp lệ. Thu hồi phiên/cookie phía Server.

### 1.4. `POST /api/v1/auth/refresh`
- **Auth:** Refresh Cookie hợp lệ. Gia hạn phiên làm việc.

---

## 2. Nhóm Endpoint Quản lý Tài khoản Nhân sự & Tra cứu Role Cố định (`/api/v1/staff/*`)

> **Quy tắc bất biến:** Không có API tạo/sửa/xóa Permission hoặc cập nhật bộ quyền của Role.

| Endpoint | Method | Permission yêu cầu | Request DTO | Response DTO | Quy tắc nghiệp vụ & Validation |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/api/v1/staff/users` | `GET` | `accounts.view` | Query lọc tùy chọn | `ManagedAccountRecord[]` | Không bao giờ trả trường password/hash |
| `/api/v1/staff/users` | `POST` | `accounts.create` | `CreateStaffUserRequestDto` | `ManagedAccountRecord` | Kiểm tra duy nhất `employeeCode`, `username`, `email`; chỉ nhận 1 trong 5 `StaffRole` cố định; cần `accounts.grant_admin` nếu gán `ADMIN` |
| `/api/v1/staff/users/:id` | `GET` | `accounts.view` | — | `ManagedAccountRecord` | Trả tách biệt `userAccount`, `staffProfile`, `role` |
| `/api/v1/staff/users/:id` | `PATCH` | `accounts.update` | `UpdateStaffUserRequestDto` | `ManagedAccountRecord` | Chỉ cập nhật `EmployeeProfile`, không cho phép tự nâng quyền |
| `/api/v1/staff/users/:id/activate` | `POST` | `accounts.update` | — | `ManagedAccountRecord` | Chỉ áp dụng cho tài khoản `PENDING_ACTIVATION`; Backend gửi email mời thiết lập mật khẩu |
| `/api/v1/staff/users/:id/lock` | `POST` | `accounts.lock` | `{ status: 'LOCKED' \| 'DISABLED', reason }` | `ManagedAccountRecord` | Chặn tự khóa chính mình (`id !== currentUser.id`); thu hồi ngay phiên đang mở |
| `/api/v1/staff/users/:id/unlock` | `POST` | `accounts.lock` | `{ status: 'ACTIVE', reason }` | `ManagedAccountRecord` | Mở khóa tài khoản về `ACTIVE` kèm lý do Audit |
| `/api/v1/staff/users/:id/password-reset` | `POST` | `accounts.reset_password` | `TriggerStaffPasswordResetInput` | `ManagedAccountRecord` | Chuyển sang `PASSWORD_RESET_REQUIRED` kèm lý do Audit |
| `/api/v1/staff/roles` | `GET` | `roles.view` | — | `RoleMatrixItem[]` | **Chỉ đọc** danh sách 5 Role cố định và các Permission tương ứng |
| `/api/v1/staff/permissions` | `GET` | `roles.view` | — | `PermissionMetaItem[]` | **Chỉ đọc** danh mục Permission cố định của hệ thống |
