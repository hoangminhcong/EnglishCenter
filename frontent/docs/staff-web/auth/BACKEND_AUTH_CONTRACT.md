# HỢP ĐỒNG API XÁC THỰC & TÀI KHOẢN DÙNG CHUNG HAI FRONTEND (`BACKEND_AUTH_CONTRACT`)

> **Giai đoạn:** Giai đoạn 1 – Đặc tả hợp đồng dự kiến tại `packages/contracts` (Chưa triển khai máy chủ Backend Node.js).

---

## 1. Mô hình Định danh & Phiên Dùng Chung (`packages/contracts`)

```ts
export type AccountType = 'STUDENT' | 'STAFF'
export type PortalType = 'CLIENT' | 'STAFF'

export type StaffRole =
  | 'ADMIN'
  | 'SALES'
  | 'ACCOUNTANT'
  | 'ACADEMIC'
  | 'TEACHER'

export type StudentRole = 'STUDENT'

export type AccountStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'LOCKED'
  | 'DISABLED'
  | 'PASSWORD_RESET_REQUIRED'

export type AccessScopeType = 'OWN' | 'TEAM' | 'BRANCH' | 'ALL'
```

### Cấu trúc Phiên Chuẩn từ `GET /api/v1/auth/me` (`UnifiedAuthSessionDto`)

```json
{
  "user": {
    "id": "acc-stf-002",
    "username": "sale.demo",
    "displayName": "Lê Thanh Thảo",
    "email": "sales@englishcenter.edu.vn",
    "status": "ACTIVE",
    "lastLoginAt": "2026-11-27T08:30:00.000Z"
  },
  "accountType": "STAFF",
  "portal": "STAFF",
  "role": "SALES",
  "employee": {
    "id": "emp-acc-stf-002",
    "employeeCode": "NV-SAL-01",
    "profileType": "EMPLOYEE",
    "phone": "0901234502",
    "branchId": "cs-ha-dong",
    "branchName": "Cơ sở 1 – Hà Đông",
    "departmentId": "dept-sales",
    "departmentName": "Phòng Tư vấn Tuyển sinh",
    "status": "ACTIVE"
  },
  "permissions": [
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
    "sales.classes.view",
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
```

Với Học viên (`student.demo`), cùng endpoint `GET /api/v1/auth/me` trả:

```json
{
  "user": {
    "id": "stu-001",
    "username": "student.demo",
    "displayName": "Đỗ Như Đạt",
    "email": "student@englishcenter.edu.vn",
    "status": "ACTIVE",
    "lastLoginAt": "2026-11-27T09:00:00.000Z"
  },
  "accountType": "STUDENT",
  "portal": "CLIENT",
  "role": "STUDENT",
  "permissions": [],
  "scopes": {},
  "defaultLandingRoute": "/student/dashboard"
}
```

---

## 2. Danh mục 12 Endpoint Chuẩn Cần Chuẩn bị Adapter (Mục XII)

> **Quy tắc nghiêm ngặt:** Không tạo bất kỳ API nào cho phép chỉnh sửa Permission của Role (`PUT /staff/roles/:id/permissions` bị loại bỏ hoàn toàn).

| # | Method & Endpoint | Auth | Permission yêu cầu | Mục đích & Quy tắc nghiệp vụ |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `POST /api/v1/auth/login` | Public | — | Nhận `{ identifier, password }`. Kiểm tra mật khẩu băm, kiểm tra `status`, trả `accountType`, `portal`, `role`, `permissions`, `scopes`, `defaultLandingRoute` (hoặc yêu cầu đổi mật khẩu lần đầu). |
| 2 | `GET /api/v1/auth/me` | Required | Session hợp lệ | Trả `UnifiedAuthSessionDto` hiện tại; trả `401` nếu hết hạn hoặc tài khoản vừa bị khóa. |
| 3 | `POST /api/v1/auth/logout` | Required | Session hợp lệ | Thu hồi phiên/cookie phía Server. |
| 4 | `POST /api/v1/auth/refresh` | Required | Refresh Cookie | Làm mới phiên đăng nhập hợp lệ. |
| 5 | `GET /api/v1/staff/users` | STAFF | `accounts.view` | Danh sách tài khoản nhân sự kèm `EmployeeProfile` và `Role` cố định (không chứa mật khẩu). |
| 6 | `POST /api/v1/staff/users` | STAFF | `accounts.create` | Tạo hồ sơ nhân sự + tài khoản đăng nhập + chọn Role Template cố định (`INVITE_LINK` hoặc `TEMPORARY_PASSWORD`). Chặn cấp `ADMIN` nếu người tạo không có `accounts.grant_admin`. |
| 7 | `GET /api/v1/staff/users/:id` | STAFF | `accounts.view` | Xem chi tiết tách biệt `UserAccount`, `EmployeeProfile` và `Role` cố định. |
| 8 | `PATCH /api/v1/staff/users/:id` | STAFF | `accounts.update` | Cập nhật thông tin `EmployeeProfile` (không dùng để tự nâng quyền hoặc sửa Permission). |
| 9 | `POST /api/v1/staff/users/:id/activate` | STAFF | `accounts.update` | Yêu cầu gửi lại lời mời kích hoạt cho tài khoản `PENDING_ACTIVATION`. |
| 10 | `POST /api/v1/staff/users/:id/lock` | STAFF | `accounts.lock` | Khóa (`LOCKED`) hoặc vô hiệu hóa (`DISABLED`) tài khoản; chặn tự khóa chính mình. |
| 11 | `POST /api/v1/staff/users/:id/unlock` | STAFF | `accounts.lock` | Mở khóa tài khoản về `ACTIVE`. |
| 12 | `POST /api/v1/staff/users/:id/password-reset` | STAFF | `accounts.reset_password` | Yêu cầu đặt lại mật khẩu hoặc cấp mật khẩu tạm thời mới (`PASSWORD_RESET_REQUIRED`). |
| 13 | `GET /api/v1/staff/roles` | STAFF | `roles.view` | Trả danh sách 5 Role cố định và bộ Permission tương ứng ở chế độ **chỉ đọc**. |
| 14 | `GET /api/v1/staff/permissions` | STAFF | `roles.view` | Trả danh mục Permission Registry cố định của hệ thống ở chế độ **chỉ đọc**. |
| 15 | `GET /api/v1/auth/me/profile` | STAFF | Session `STAFF` | Xem thông tin tài khoản đăng nhập (`UserAccount`) & hồ sơ nhân sự (`EmployeeProfile`) của chính người dùng đang đăng nhập. |
| 16 | `PATCH /api/v1/auth/me/profile` | STAFF | Session `STAFF` | Nhân sự tự cập nhật thông tin liên hệ cá nhân được phép (`phone`). |
| 17 | `POST /api/v1/auth/change-password` | STAFF | Session `STAFF` | Nhân sự tự đổi mật khẩu bảo mật cá nhân (`currentPassword`, `newPassword`, `confirmPassword`). |
