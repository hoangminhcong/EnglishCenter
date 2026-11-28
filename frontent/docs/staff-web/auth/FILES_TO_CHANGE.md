# DANH SÁCH TỆP DỰ KIẾN CẬP NHẬT TRONG GIAI ĐOẠN 2 → 7 (`FILES_TO_CHANGE`)

> **Giai đoạn:** Giai đoạn 1 – Lập kế hoạch tệp thay đổi (Hiện tại **chưa chỉnh sửa bất kỳ tệp mã nguồn nào**).

---

## 1. Shared Contracts (`packages/contracts/`)

1. **`packages/contracts/src/auth/rbac.types.ts`** *(Sửa)*:
   - Bổ sung `ACCOUNT_TYPES = ['STUDENT', 'STAFF']`, `AccountType`, `PORTAL_TYPES = ['CLIENT', 'STAFF']`, `PortalType`, `StudentRole = 'STUDENT'`.
   - Chuẩn hóa `STAFF_ROLES` về đúng 5 vai trò cố định: `'ADMIN' | 'SALES' | 'ACCOUNTANT' | 'ACADEMIC' | 'TEACHER'`.
   - Loại bỏ `roles.update`, `permissions.assign`; bổ sung `sales.classes.view`, `finance.transactions.view` cho khớp đầy đủ ma trận cố định.
2. **`packages/contracts/src/auth/authSession.types.ts`** *(Sửa)*:
   - Bổ sung `accountType: AccountType`, `portal: PortalType` vào `StaffUserAccountDto` và `AuthenticatedStaffSessionDto` + tạo `UnifiedAuthSessionDto` / `PortalRedirectOutcomeDto` dùng chung cho cả `client-web` và `staff-web`.
   - Chuẩn hóa `EmployeeWorkStatus = 'ACTIVE' | 'INACTIVE'` trên `StaffEmployeeProfileDto`.
   - Loại bỏ `UpdateUserRolesRequestDto` (vì không cho phép sửa Permission cá nhân hay đổi Role tùy tiện).

---

## 2. Staff Web (`apps/staff-web/`)

3. **`apps/staff-web/.env.example` & `src/services/api/apiConfig.ts`** *(Sửa)*:
   - Bổ sung `VITE_CLIENT_APP_URL`, `VITE_STAFF_APP_URL`, `VITE_API_BASE_URL` và cấu hình Allowlist URL.
4. **`apps/staff-web/src/services/portal/portalResolver.ts`** *(Tạo mới)*:
   - `resolvePortalAccess()` kiểm tra `accountType`, `portal` và validate URL theo Allowlist môi trường (chống Open Redirect).
5. **`apps/staff-web/src/services/permissions/permissions.config.ts`** *(Sửa)*:
   - Chuyển sang `FIXED_ROLE_PERMISSIONS` bất biến (`as const`); **xóa hoàn toàn** `ROLE_OVERRIDES_STORAGE_KEY` và `writeRolePermissionsOverride()`.
   - Chuẩn hóa 5 Role cố định (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER`).
6. **`apps/staff-web/src/services/permissions/navigation.config.ts` & `src/app/router/index.tsx`** *(Sửa)*:
   - Cập nhật nhãn menu `/accounts/roles` thành `"Vai trò cố định"` (Read-Only) và gắn `finance.transactions.view` cho `/accounting/transactions`.
7. **`apps/staff-web/src/features/auth/adapters/mockAuthAdapter.ts` & `httpAuthAdapter.ts`** *(Chuyển từ `repositories/` sang `adapters/` + Cập nhật)*:
   - Hỗ trợ nhận diện `student.demo` (`accountType: 'STUDENT'`, `portal: 'CLIENT'`) để trả kết quả điều hướng sang `CLIENT_APP_URL`.
   - Chuẩn hóa phương thức `login()`, `getCurrentUser()`, `logout()`, `refreshSession()`.
8. **`apps/staff-web/src/features/auth/mocks/staffIdentityMockStore.ts`** *(Sửa)*:
   - Loại bỏ `customUserPermissions` và 2 role cũ `HR`/`HR_ACADEMIC`; chuẩn hóa danh sách tài khoản Demo môi trường DEV: `admin.demo`, `sale.demo`, `sale2.demo` (kiểm chứng Scope `OWN`), `accountant.demo`, `academic.demo`, `teacher.demo`, `teacher2.demo` (kiểm chứng lớp phân công), `locked.demo`, và nhận diện `student.demo`.
9. **`apps/staff-web/src/features/auth/pages/StaffLoginPage.tsx` & `src/app/guards/AuthGuard.tsx`** *(Sửa)*:
   - Tích hợp `PortalResolver`: nếu người dùng đăng nhập bằng tài khoản `STUDENT` (`portal === 'CLIENT'`), hiển thị thông báo rõ và điều hướng sang `CLIENT_APP_URL` hợp lệ; chặn tuyệt đối tài khoản `STUDENT` tại `AuthGuard`.
10. **`apps/staff-web/src/features/accounts/api/accountsApi.ts`, `types/accounts.types.ts`, `pages/AccountsPage.tsx`, `pages/RolesPage.tsx`** *(Sửa)*:
    - `AccountsPage.tsx`: Hiển thị đủ 11 cột tường minh; chọn Role Template cố định khi tạo tài khoản; dùng `PATCH /staff/users/:id` cho cập nhật hồ sơ và `POST` cho `activate`, `lock`, `unlock`, `password-reset`; **xóa hoàn toàn** nút/modal chỉnh sửa Permission cá nhân.
    - `RolesPage.tsx`: Chuyển thành trang **Xem Vai trò & Quyền hạn Cố định (Chỉ đọc – Read-Only)**, xóa mọi checkbox sửa quyền và nút Lưu phân quyền.
11. **`apps/staff-web/src/services/api/endpoints.ts`** *(Sửa)*:
    - Đồng bộ đúng 14 endpoint chuẩn Mục XII (`PATCH /staff/users/:id`, `POST .../activate`, `POST .../lock`, `POST .../unlock`, `POST .../password-reset`, `GET /staff/roles`, `GET /staff/permissions`; xóa `PUT /staff/roles/:role/permissions`).

---

## 3. Client Web (`apps/client-web/`)

12. **`apps/client-web/.env.example` & `src/services/api/apiConfig.ts`** *(Sửa)*:
    - Bổ sung `VITE_CLIENT_APP_URL`, `VITE_STAFF_APP_URL` và Allowlist Portal URL.
13. **`apps/client-web/src/features/auth/types/auth.types.ts`, `mocks/authMockData.ts`, `services/authService.ts`** *(Sửa)*:
    - Bổ sung `accountType: 'STUDENT'`, `portal: 'CLIENT'`, tài khoản chuẩn `student.demo` (mật khẩu riêng băm `SHA-256`, loại bỏ mật khẩu chung `'English123'` và loại bỏ hành vi tự tạo phiên học viên cho chuỗi bất kỳ!).
    - Nhận diện nếu nhân sự (`admin.demo`, `sale.demo`, `accountant.demo`, `academic.demo`, `teacher.demo`) đăng nhập trên `client-web` -> trả `{ accountType: 'STAFF', portal: 'STAFF' }` để điều hướng sang `STAFF_APP_URL` an toàn.
    - Chuẩn bị `httpAuthAdapter` / `getCurrentUser()` (`/api/v1/auth/me`) tương thích chung Backend.
14. **`apps/client-web/src/features/auth/pages/AuthPage.tsx` & `src/layouts/StudentLayout.tsx`** *(Sửa)*:
    - Ẩn gợi ý tài khoản Demo khi không phải môi trường `import.meta.env.DEV`.
    - Xử lý kết quả `portal === 'STAFF'` bằng chuyển hướng an toàn qua Allowlist `STAFF_APP_URL`.
    - Kiểm tra nghiêm ngặt `user.accountType === 'STUDENT' && user.portal === 'CLIENT'` tại `StudentLayout` và `ChangePasswordPage`.

---

## 4. Tài liệu Bàn giao Cuối cùng (`docs/staff-web/auth/`)

Ở Giai đoạn 7 sẽ hoàn thiện và đồng bộ đầy đủ 9 tài liệu bàn giao theo Mục XVIII:
1. `AUTH_ARCHITECTURE.md`
2. `ACCOUNT_MODEL.md`
3. `EMPLOYEE_ACCOUNT_SPECIFICATION.md`
4. `FIXED_ROLE_PERMISSION_MATRIX.md`
5. `PORTAL_RESOLUTION.md`
6. `ROUTE_ACCESS_MATRIX.md`
7. `AUTH_API_CONTRACT.md`
8. `AUTHENTICATION_TEST_REPORT.md`
9. `AUTH_REMAINING_ISSUES.md`
