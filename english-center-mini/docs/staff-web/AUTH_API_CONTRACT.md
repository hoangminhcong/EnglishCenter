# HỢP ĐỒNG API XÁC THỰC, TÀI KHOẢN NHÂN SỰ & PHÂN QUYỀN (`AUTH_API_CONTRACT`)

Tài liệu này đặc tả hợp đồng REST API `/api/v1/*` mà [`httpAuthAdapter.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/repositories/httpAuthAdapter.ts), [`accountsApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/api/accountsApi.ts) và [`endpoints.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/api/endpoints.ts) đã định nghĩa sẵn để kết nối Backend Node.js.

---

## 1. Nhóm API Xác thực Phiên (`Authentication`)

### 1.1. `POST /api/v1/auth/login`
- **Mô tả:** Xác thực nhân viên bằng `username` hoặc `email` công vụ.
- **Request Body (`StaffLoginRequestDto`):**
```json
{
  "identifier": "sale.demo",
  "password": "********",
  "rememberMe": true
}
```
- **Response `200 OK` – Trường hợp 1 (`AUTHENTICATED`):**
  - Thiết lập `Set-Cookie: ec_staff_session=...; HttpOnly; Secure; SameSite=Lax` (hoặc trả kèm `accessToken` ngắn hạn trong RAM).
```json
{
  "data": {
    "outcome": "AUTHENTICATED",
    "session": {
      "user": {
        "id": "acc-stf-002",
        "username": "sale.demo",
        "displayName": "Lê Thanh Thảo",
        "email": "sales@englishcenter.edu.vn",
        "status": "ACTIVE",
        "lastLoginAt": "2026-11-27T08:30:00.000Z"
      },
      "employee": {
        "id": "emp-acc-stf-002",
        "employeeCode": "NV-SAL-01",
        "profileType": "EMPLOYEE",
        "phone": "0901234502",
        "branchId": "cs-ha-dong",
        "branchName": "Cơ sở 1 – Hà Đông",
        "departmentId": "dept-sales",
        "departmentName": "Phòng Tư vấn Tuyển sinh",
        "jobTitle": "Chuyên viên Tư vấn Tuyển sinh"
      },
      "roles": ["SALES"],
      "permissions": [
        "courses.view",
        "tuition.view",
        "sales.dashboard.view",
        "sales.leads.view",
        "sales.leads.create",
        "sales.leads.update",
        "sales.consultations.view",
        "sales.consultations.create",
        "sales.followups.view",
        "sales.followups.create",
        "sales.followups.update",
        "sales.courses.view",
        "sales.registrations.view",
        "sales.registrations.create",
        "sales.registrations.update",
        "sales.group-invitations.create"
      ],
      "scopes": {
        "sales.leads.view": { "type": "OWN" },
        "sales.registrations.view": { "type": "OWN" }
      },
      "defaultLandingRoute": "/sales/dashboard"
    }
  }
}
```
- **Response `200 OK` – Trường hợp 2 (`PASSWORD_RESET_REQUIRED`):**
```json
{
  "data": {
    "outcome": "PASSWORD_RESET_REQUIRED",
    "challengeId": "chg-9f81c2...",
    "userId": "acc-stf-019",
    "username": "minh.nv",
    "displayName": "Nguyễn Văn Minh",
    "email": "minh.nv@englishcenter.edu.vn",
    "message": "Tài khoản yêu cầu đổi sang mật khẩu cá nhân mới trước khi bắt đầu phiên làm việc."
  }
}
```
- **Mã lỗi chuẩn:**
  - `401 INVALID_CREDENTIALS`: `"Tên đăng nhập hoặc mật khẩu không chính xác."`
  - `403 ACCOUNT_INACCESSIBLE`: `"Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên."` (`LOCKED` / `DISABLED`)
  - `403 ACCOUNT_PENDING_ACTIVATION`: Tài khoản ở trạng thái `PENDING_ACTIVATION`.
  - `429 RATE_LIMITED`: Nhập sai quá ngưỡng cho phép, tạm chặn theo IP/tài khoản tại Backend.

### 1.2. `POST /api/v1/auth/first-login-password`
- **Mô tả:** Hoàn tất đổi mật khẩu bắt buộc lần đầu (`CompleteFirstLoginPasswordRequestDto`), chuyển trạng thái tài khoản sang `ACTIVE` và trả về `AuthenticatedStaffSessionDto`.

### 1.3. `GET /api/v1/auth/me`
- **Mô tả:** Khôi phục phiên đăng nhập và đồng bộ danh sách `roles`, `permissions`, `scopes` mới nhất từ Backend khi tải lại trang hoặc khi có thay đổi phân quyền.
- **Mã lỗi:** `401` nếu phiên hết hạn hoặc tài khoản vừa bị chuyển sang `LOCKED` / `DISABLED`.

### 1.4. `POST /api/v1/auth/logout` & `POST /api/v1/auth/refresh`
- **Mô tả:** Thu hồi Refresh Token / xóa Cookie phiên làm việc tại Server (`logout`) hoặc gia hạn Access Token (`refresh`).

---

## 2. Nhóm API Quản lý Tài khoản Nhân sự & Phân quyền (`/api/v1/staff/*`)

| Phương thức & Endpoint | Quyền Backend bắt buộc | Mô tả nghiệp vụ & Request/Response chính |
| :--- | :--- | :--- |
| `GET /api/v1/staff/users` | `accounts.view` | Danh sách `ManagedAccountRecord[]` (không bao giờ trả trường mật khẩu/hash) |
| `POST /api/v1/staff/users` | `accounts.create` *(+ `accounts.grant_admin` nếu gán `ADMIN`)* | Nhận `CreateStaffUserRequestDto` (tách `profile`, `account`, `authorization`); băm mật khẩu bằng Argon2id/bcrypt ở Server hoặc tạo token mời kích hoạt gửi qua Email |
| `GET /api/v1/staff/users/:id` | `accounts.view` | Chi tiết tách biệt `UserAccount`, `EmployeeProfile`, `RoleAssignments` |
| `PUT /api/v1/staff/users/:id` | `accounts.update` | Cập nhật `UpdateStaffUserRequestDto` (`EmployeeProfile`), ghi Audit Log |
| `POST /api/v1/staff/users/:id/activate` | `accounts.update` | Gửi lại email kích hoạt cho tài khoản `PENDING_ACTIVATION` |
| `PATCH /api/v1/staff/users/:id/lock` | `accounts.lock` | Khóa tài khoản (`LOCKED`) hoặc vô hiệu hóa (`DISABLED`), thu hồi toàn bộ phiên đang mở của user đích |
| `PATCH /api/v1/staff/users/:id/unlock` | `accounts.lock` | Mở khóa tài khoản về `ACTIVE`, ghi lý do Audit Log |
| `POST /api/v1/staff/users/:id/password-reset` | `accounts.reset_password` | Đặt `PASSWORD_RESET_REQUIRED` hoặc sinh mật khẩu tạm băm một chiều |
| `PUT /api/v1/staff/users/:id/roles` | `permissions.assign` | Cập nhật `UpdateUserRolesRequestDto` (`roles`, `scopeType`, `scopeIds`, `reason`); chặn tự nâng quyền cá nhân |
| `GET /api/v1/staff/users/audit-logs` | `accounts.view` | Danh sách `AccountPermissionAuditLogDto[]` |
| `GET /api/v1/staff/roles` | `roles.view` | Ma trận vai trò & số lượng nhân sự đang gán |
| `PUT /api/v1/staff/roles/:role/permissions` | `roles.update` | Cập nhật danh sách `PermissionCode[]` cho vai trò kèm `reason` |
