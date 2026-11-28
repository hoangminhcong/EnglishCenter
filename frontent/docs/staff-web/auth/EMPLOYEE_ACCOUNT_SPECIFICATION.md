# ĐẶC TẢ QUẢN LÝ TÀI KHOẢN & HỒ SƠ NHÂN VIÊN (`EMPLOYEE_ACCOUNT_SPECIFICATION`)

## 1. Trạng thái Triển khai

- **Giao diện & Luồng thao tác Frontend (`/accounts`, `/accounts/roles`):** **Đã triển khai** tại [`AccountsPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/AccountsPage.tsx), [`RolesPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/RolesPage.tsx) và [`accountsApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/api/accountsApi.ts).
- **Lưu trữ & Gửi Email kích hoạt thực tế:** Đang chạy **Mock State** (ghi nhận trung thực trạng thái `PENDING_ACTIVATION`, không giả lập gửi email SMTP thật khi chưa có Backend).

---

## 2. Cấu trúc Bảng Danh sách Tài khoản (`/accounts` – 11 Cột Chuẩn)

Bảng danh sách nhân sự hiển thị đầy đủ 11 cột:
1. **Mã nhân viên** (`employeeCode`)
2. **Họ tên** (`fullName`)
3. **Loại hồ sơ** (`EMPLOYEE` / `TEACHER`)
4. **Vai trò** (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER` + `Scope`)
5. **Email** (kèm `@username`)
6. **Điện thoại**
7. **Cơ sở**
8. **Phòng ban**
9. **Trạng thái tài khoản** (`PENDING_ACTIVATION`, `ACTIVE`, `PASSWORD_RESET_REQUIRED`, `LOCKED`, `DISABLED`)
10. **Lần đăng nhập gần nhất**
11. **Thao tác:**
    - `Xem` (xem tách biệt `UserAccount`, `EmployeeProfile`, `Role` cố định & lịch sử Audit; không bao giờ hiển thị mật khẩu).
    - `Xem Role` (mở trang `/accounts/roles?role=...` ở chế độ chỉ đọc).
    - `Sửa hồ sơ` (`accounts.update` -> `PATCH /api/v1/staff/users/:id`).
    - `Mời kích hoạt` (`accounts.update` -> `POST /api/v1/staff/users/:id/activate`, chỉ hiện khi `PENDING_ACTIVATION`).
    - `Đặt lại MK` (`accounts.reset_password` -> `POST /api/v1/staff/users/:id/password-reset`).
    - `Khóa` / `Mở khóa` (`accounts.lock` -> `POST /api/v1/staff/users/:id/lock` hoặc `/unlock`, chặn tự khóa chính mình).

> **Giới hạn quyền nghiêm ngặt của Admin:** Không có nút sửa từng Permission, không có Permission Matrix Editor, không tự nâng quyền tài khoản đang đăng nhập, không chuyển tùy tiện tài khoản Sale thành Admin.

---

## 3. Đặc tả Modal Tạo Tài khoản Nhân sự / Giảng viên (3 Khu vực)

### Khu vực 1 – Thông tin Hồ sơ Nhân viên (`EmployeeProfile`)
- Trường: Loại hồ sơ (`EMPLOYEE` / `TEACHER`), Mã nhân viên, Họ và tên, Số điện thoại, Email công vụ, Chức danh, Cơ sở công tác (lấy từ `cmsApi.listBranches()`), Phòng ban (lấy từ `DEPARTMENT_CATALOG`), và thông tin TOEIC nếu là `TEACHER`.
- Kiểm tra hợp lệ: Không để trống Họ tên/Mã NV; kiểm tra duy nhất `employeeCode` và `email` trên toàn hệ thống; chuẩn hóa SĐT 10 số Việt Nam; kiểm tra tồn tại Cơ sở và Phòng ban.

### Khu vực 2 – Thông tin Tài khoản Đăng nhập (`UserAccount`)
- Trường: `Username` (tự gợi ý từ họ tên, kiểm tra không trùng), `Email đăng nhập`, và lựa chọn phương thức kích hoạt:
  - **Phương thức A – Mời nhân viên tự đặt mật khẩu (`INVITE_LINK` – Mặc định ưu tiên):** Tạo tài khoản ở trạng thái `PENDING_ACTIVATION`.
  - **Phương thức B – Mật khẩu tạm thời (`TEMPORARY_PASSWORD`):** Gồm mật khẩu tạm, xác nhận mật khẩu, nút Hiện/Ẩn, nút sinh mật khẩu ngẫu nhiên mạnh bằng CSPRNG (`crypto.getRandomValues`), thanh đo độ mạnh 5 tiêu chí và cờ bắt buộc đổi mật khẩu lần đầu (`PASSWORD_RESET_REQUIRED`). Mật khẩu tạm chỉ hiển thị **duy nhất 01 lần** trên hộp thoại RAM ngay sau khi tạo rồi xóa vĩnh viễn.

### Khu vực 3 – Vai trò Cố định (`Fixed Role Template`)
- Chỉ cho phép chọn từ 5 Role Template cố định (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER`). Tài khoản không có quyền `accounts.grant_admin` không thể chọn `ADMIN`.
- Hiển thị bản tóm tắt **chỉ đọc** số lượng Permission cố định và trang đích mặc định của Role được chọn.
