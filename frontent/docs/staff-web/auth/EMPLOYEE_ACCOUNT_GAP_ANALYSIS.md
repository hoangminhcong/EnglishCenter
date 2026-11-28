# PHÂN TÍCH KHOẢNG CÁCH QUẢN LÝ HỒ SƠ & TÀI KHOẢN NHÂN VIÊN (`EMPLOYEE_ACCOUNT_GAP_ANALYSIS`)

> **Giai đoạn:** Giai đoạn 1 – Audit hiện trạng (Chưa chỉnh sửa mã nguồn ứng dụng).
> **Tệp kiểm toán chính:** [`AccountsPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/AccountsPage.tsx), [`RolesPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/RolesPage.tsx), [`accountsApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/api/accountsApi.ts), [`authSession.types.ts`](file:///d:/Web/english-center-mini/packages/contracts/src/auth/authSession.types.ts).

---

## 1. Bảng Đối chiếu Chi tiết Hiện trạng vs Yêu cầu Nghiệp vụ

| Hạng mục kiểm tra | Hiện trạng trong mã nguồn | Khoảng cách / Vi phạm cần xử lý |
| :--- | :--- | :--- |
| **Tách biệt `UserAccount` và `EmployeeProfile`** | Đã tách `StaffUserAccountDto` và `StaffEmployeeProfileDto` trong `packages/contracts`. Không lưu mật khẩu trong `UserAccount`. | Thiếu trường `accountType: 'STUDENT' \| 'STAFF'` trên `UserAccount`; trạng thái `EmployeeProfile` đang để `'WORKING' \| 'ON_LEAVE' \| 'RESIGNED'` thay vì chuẩn hóa `'ACTIVE' \| 'INACTIVE'` rõ ràng để không nhầm với `AccountStatus`. |
| **Modal Tạo tài khoản 3 khu vực** | Đã chia 3 khu vực trong `AccountsPage.tsx`: (A) Hồ sơ nhân sự, (B) Tài khoản & Kích hoạt (`INVITE_LINK` mặc định + `TEMPORARY_PASSWORD` có đo độ mạnh & hiển thị 1 lần), (C) Vai trò. | Khu vực C hiện cho phép **tick nhiều Role cùng lúc** và chứa các Role thừa (`HR`, `HR_ACADEMIC`). Cần chuẩn hóa chọn **Role Template cố định** (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER`). |
| **Chức năng chỉnh sửa Permission cá nhân trên tài khoản** | **VI PHẠM NGHIÊM TRỌNG:** `AccountsPage.tsx` (dòng `207–214`, `604–615`, `967–1129`) đang có nút **"Quyền"** mở Modal 4 cho phép Admin **tự gán/gỡ từng Permission cá nhân (`customGrantedPermissions`)** và đổi Role tùy ý! | **Bắt buộc gỡ bỏ hoàn toàn** Modal chỉnh sửa Permission cá nhân, trường `customUserPermissions` và mã quyền `permissions.assign`. |
| **Trang Quản lý Vai trò (`/accounts/roles` & `/roles`)** | **VI PHẠM NGHIÊM TRỌNG:** [`RolesPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/RolesPage.tsx) đang là **Permission Matrix Editor** có checkbox bật/tắt quyền, nút `"Khôi phục mặc định"`, nút `"Lưu phân quyền"` và hàm `writeRolePermissionsOverride()`! | **Bắt buộc chuyển sang Chế độ Chỉ Đọc (Read-Only Role Reference)**: chỉ xem định nghĩa 5 Role cố định và danh sách Permission cố định tương ứng; gỡ bỏ `roles.update`, `writeRolePermissionsOverride()` và `PUT /staff/roles/:role/permissions`. |
| **Các cột trong Bảng Danh sách Tài khoản (`/accounts`)** | Đã có Mã NV, Họ tên, Loại hồ sơ, Vai trò, Username/Email, SĐT, Cơ sở, Phòng ban, Trạng thái (5 trạng thái), Đăng nhập gần nhất, Thao tác. | Đang gộp một số cột chung ô; cần hiển thị tường minh đủ 11 cột và trên cột Thao tác chỉ giữ: **Xem chi tiết**, **Chỉnh sửa hồ sơ**, **Khóa**, **Mở khóa**, **Gửi lời mời kích hoạt**, **Yêu cầu đặt lại mật khẩu**, **Xem Role cố định** (xóa nút sửa Permission). |
| **Validation & Chống trùng lặp** | Đã kiểm tra Họ tên, Mã NV duy nhất, Email hợp lệ & duy nhất, SĐT 10 số VN, Username duy nhất, Cơ sở từ `cmsApi.listBranches()`, Phòng ban từ `DEPARTMENT_CATALOG`. | Đã hoạt động tốt – cần giữ nguyên và bổ sung kiểm tra trùng Email chéo với tập tài khoản `STUDENT` trong Mock Store dùng chung. |
| **Bảo mật mật khẩu khi tạo / đặt lại** | Dùng CSPRNG (`crypto.getRandomValues`), băm một chiều `SHA-256`, chỉ hiển thị 1 lần trong RAM ngay sau khi tạo rồi xóa khỏi state. | Đã hoạt động tốt – giữ nguyên, đảm bảo không bao giờ ghi console hay lưu plaintext. |

---

## 2. Tổng kết Các Thành phần Dư thừa Phải Loại bỏ ở Giai đoạn 2 & 5

1. Xóa `ROLE_OVERRIDES_STORAGE_KEY` và hàm `writeRolePermissionsOverride()` trong [`permissions.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/permissions.config.ts).
2. Xóa `customUserPermissions` trong [`staffIdentityMockStore.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/auth/mocks/staffIdentityMockStore.ts) và `updateUserRolesAndPermissions` / `updateRolePermissions` trong [`accountsApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/api/accountsApi.ts).
3. Xóa mã quyền `roles.update` và `permissions.assign` khỏi `PERMISSION_CODES` trong [`packages/contracts/src/auth/rbac.types.ts`](file:///d:/Web/english-center-mini/packages/contracts/src/auth/rbac.types.ts).
4. Chuyển [`RolesPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/RolesPage.tsx) thành trang tra cứu **Vai trò cố định (Read-Only)** đúng nguyên tắc Mục III.3.
