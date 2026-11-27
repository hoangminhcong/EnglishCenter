# BÁO CÁO KIỂM THỬ XÁC THỰC, TÀI KHOẢN & PHÂN QUYỀN (`AUTHENTICATION_TEST_REPORT`)

## 1. Phạm vi & Phương pháp Kiểm định

- **Phạm vi kiểm định:** Mã nguồn Frontend `apps/staff-web` và gói hợp đồng dùng chung `packages/contracts` ở chế độ Mock Auth (`USE_STAFF_MOCK_API = true`), bảo đảm `apps/client-web` không bị thay đổi.
- **Công cụ xác minh tự động đã chạy:**
  - `npm run typecheck` (TypeScript `~7.0.2` trên toàn bộ `packages/*`, `apps/client-web`, `apps/staff-web`).
  - `npm run lint` & `npm run lint:staff` (Oxlint toàn monorepo).
  - `npm run build` (`build:client` + `build:staff` qua Vite production bundle).
- **Ghi chú trung thực:** Các kịch bản dưới đây được đối chiếu trực tiếp trên logic thực thi của `mockAuthAdapter.ts`, `accountsApi.ts`, `permissions.config.ts`, `StaffSidebar.tsx`, `PermissionGuard.tsx`, `StaffLoginPage.tsx` và kiểm chứng biên dịch sạch 100%.

---

## 2. Kết quả Đối chiếu 9 Kịch bản Nghiệp vụ & Bảo mật (Mục XVI)

| # | Kịch bản kiểm thử | Dữ liệu / Tài khoản đối chiếu | Kết quả thực thi trong mã nguồn | Trạng thái |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Tạo tài khoản nhân viên mới** | `/accounts` -> Modal 3 khu vực A/B/C | Kiểm tra bắt buộc Họ tên, Mã NV duy nhất, SĐT chuẩn hóa 10 số VN, Email duy nhất, Username duy nhất `[a-z0-9._-]`, Cơ sở từ `cmsApi.listBranches()`, Phòng ban từ `DEPARTMENT_CATALOG`. Hỗ trợ `INVITE_LINK` (`PENDING_ACTIVATION`) và `TEMPORARY_PASSWORD` (sinh CSPRNG, băm SHA-256, hiển thị 1 lần duy nhất trong RAM). | **ĐẠT** |
| **2** | **Đăng nhập đúng và sai mật khẩu** | `admin.demo`, `sale.demo`, ... | Nhập đúng `username` hoặc `email` + mật khẩu riêng từng tài khoản -> nạp phiên `/auth/me`. Nhập sai mật khẩu hoặc sai `username` -> trả `401` với cùng thông báo chung *"Tên đăng nhập hoặc mật khẩu không chính xác."* (không lộ tài khoản có tồn tại hay không). | **ĐẠT** |
| **3** | **Tài khoản bị khóa / ngừng hoạt động / chờ kích hoạt** | `locked.demo` (`LOCKED`), hoặc tài khoản `DISABLED` / `PENDING_ACTIVATION` | Đăng nhập với `locked.demo` bị chặn `403` (*"Tài khoản của bạn hiện không được phép truy cập. Vui lòng liên hệ quản trị viên."*). Khi Admin khóa một tài khoản đang mở ở tab khác, sự kiện đồng bộ thu hồi phiên ngay lập tức. Tài khoản `PASSWORD_RESET_REQUIRED` buộc qua bước đổi mật khẩu mới trước khi cấp phiên. | **ĐẠT** |
| **4** | **Tài khoản Admin mặc định (Không xem toàn bộ bộ phận)** | `admin.demo` (`ADMIN`) | Sau đăng nhập điều hướng về `/dashboard`. Sidebar **chỉ** hiển thị các mục Quản trị, Tài khoản & Phân quyền, Đào tạo & Học phí, CMS, Học liệu/TOEIC, Cấu hình. **Ẩn hoàn toàn** menu của Sales CRM, Kế toán, Giáo vụ và Giảng viên. Gõ trực tiếp `/sales/dashboard`, `/accounting/dashboard`, `/academic/dashboard`, `/teacher/dashboard` đều bị `PermissionGuard` chặn `403 – Forbidden`. | **ĐẠT** |
| **5** | **Tài khoản Sale (`OWN` Scope)** | `sale.demo` (`acc-stf-002`) & `sale2.demo` (`acc-stf-008`) | Sau đăng nhập vào thẳng `/sales/dashboard`. Chỉ thấy menu Tư vấn Tuyển sinh; `useSalesActor()` suy diễn `scope = 'own'` từ `session.scopes['sales.leads.view']` nên mỗi Sale chỉ thấy Lead do mình phụ trách, không thấy menu Admin/Kế toán/Giáo vụ/Giảng viên. | **ĐẠT** |
| **6** | **Tài khoản Kế toán (`ACCOUNTANT`)** | `accountant.demo` (`acc-stf-003`) | Sau đăng nhập vào thẳng `/accounting/dashboard`. Hiển thị đầy đủ 6 màn hình Kế toán + Báo cáo tổng hợp được cấp; gõ URL `/accounts` hoặc `/sales/dashboard` bị chặn `403`. | **ĐẠT** |
| **7** | **Tài khoản Giáo vụ (`ACADEMIC`)** | `academic.demo` (`acc-stf-005`) | Sau đăng nhập vào thẳng `/academic/dashboard`. Thấy khu vực Giáo vụ & Học viên (Học viên, Lớp học, Xếp lớp, Yêu cầu học vụ, Nội dung khóa học) và quyền xét duyệt hồ sơ từ Sale; không thấy khu vực tạo phiếu thu Kế toán hay quản trị RBAC. | **ĐẠT** |
| **8** | **Tài khoản Giảng viên (`OWN` Assigned Classes)** | `teacher.demo` (`acc-stf-007`) & `teacher2.demo` (`acc-tea-002`) | Sau đăng nhập vào thẳng `/teacher/dashboard`. `teacher.demo` chỉ thấy các lớp được phân công (`EC-S01`, `ONL-SB01`...), `teacher2.demo` chỉ thấy lớp của mình (`TOEIC-FD01`...), không thấy dữ liệu lớp giảng viên khác hay dữ liệu tài chính trung tâm. | **ĐẠT** |
| **9** | **Tài khoản đa vai trò & Tài khoản `0` quyền** | `hr.academic.demo` (`HR` + `ACADEMIC`) & gỡ quyền cá nhân | `hr.academic.demo` nhận hợp nhất quyền của cả `HR` và `ACADEMIC`, điều hướng vào `/academic/dashboard` và mở được cả Tuyển dụng nhân sự lẫn Giáo vụ. Khi tài khoản có `0` quyền (`customGrantedPermissions = []`), điều hướng về `/no-access` hiển thị rõ thông báo và nút Đăng xuất, không rơi vào vòng lặp redirect. | **ĐẠT** |

---

## 3. Rà soát Bảo mật Mã nguồn (`Static Security Audit`)

- Số nơi còn dùng mật khẩu dùng chung cũ `Staff@2026`: **`0`**.
- Số nơi lưu mật khẩu văn bản thuần trong `UserAccount`, `localStorage`, `sessionStorage`: **`0`**.
- Số nơi kiểm tra cứng `user.role === 'ADMIN'` để mở menu/trang: **`0`**.
- Số tệp bị sửa đổi trong `apps/client-web`: **`0`**.
