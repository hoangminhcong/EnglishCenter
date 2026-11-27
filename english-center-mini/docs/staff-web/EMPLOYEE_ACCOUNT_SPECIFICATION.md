# ĐẶC TẢ QUẢN LÝ HỒ SƠ NHÂN SỰ & TÀI KHOẢN ĐĂNG NHẬP (`EMPLOYEE_ACCOUNT_SPECIFICATION`)

## 1. Tách biệt Thực thể Nghiệp vụ

Hệ thống quản lý nhân sự tại [`AccountsPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/AccountsPage.tsx) và [`accountsApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/api/accountsApi.ts) tách bạch 4 thực thể độc lập theo chuẩn [`authSession.types.ts`](file:///d:/Web/english-center-mini/packages/contracts/src/auth/authSession.types.ts):

| Thực thể | Trách nhiệm dữ liệu | Các trường chính |
| :--- | :--- | :--- |
| **`StaffUserAccountDto`** | Định danh đăng nhập & vòng đời bảo mật | `id`, `username`, `email`, `status` (5 trạng thái), `provisioningMethod`, `mustChangePassword`, `invitationSentAt`, `lastLoginAt`, `createdAt`, `updatedAt` *(tuyệt đối không chứa password/hash)* |
| **`StaffEmployeeProfileDto`** | Hồ sơ nhân sự / giảng viên | `id`, `userId`, `employeeCode`, `fullName`, `phone`, `profileType` (`EMPLOYEE` \| `TEACHER`), `branchId`, `branchName`, `departmentId`, `departmentName`, `jobTitle`, `status` (`WORKING` \| `ON_LEAVE` \| `RESIGNED`), `verifiedToeicScore`, `specializations` |
| **`UserRoleAssignmentDto`** | Gán vai trò & phạm vi dữ liệu | `userId`, `roleId`, `scopeType` (`OWN` \| `TEAM` \| `BRANCH` \| `ALL`), `scopeIds`, `assignedByUserId`, `assignedAt` |
| **`AccountPermissionAuditLogDto`** | Nhật ký kiểm toán bảo mật | `id`, `targetUserId`, `actionType`, `actorUserId`, `actorName`, `occurredAt`, `previousSummary`, `nextSummary`, `reason` |

---

## 2. Cấu trúc Form Tạo Tài khoản Nhân sự / Giảng viên (`/accounts`)

Biểu mẫu khởi tạo được chia thành **3 khu vực rõ ràng**:

### Khu vực A – Thông tin Hồ sơ Nhân sự (`EmployeeProfile`)
- **Loại hồ sơ nhân sự (`profileType`):** `EMPLOYEE` (Nhân viên vận hành) hoặc `TEACHER` (Giảng viên đào tạo).
- **Mã nhân viên / Mã giảng viên (`employeeCode`):** Bắt buộc, tự chuẩn hóa chữ in hoa, kiểm tra không trùng lặp toàn hệ thống.
- **Họ và tên (`fullName`):** Bắt buộc; tự động gợi ý `username` không dấu nếu quản trị viên chưa nhập tay.
- **Số điện thoại (`phone`):** Chuẩn hóa tự động (`+84` -> `0`, loại khoảng trắng) và kiểm tra định dạng 10 số di động Việt Nam.
- **Email công vụ (`email`):** Kiểm tra định dạng email chuẩn và tính duy nhất.
- **Cơ sở công tác (`branchId`):** Lấy động từ `cmsApi.listBranches()` (không hardcode danh sách cơ sở).
- **Phòng ban (`departmentId`):** Lấy từ danh mục cấu hình tập trung [`departments.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/config/departments.config.ts), lọc theo loại hồ sơ, không cho nhập chuỗi tự do dễ sai lệch.
- **Chức danh công việc (`jobTitle`):** Tùy chọn.
- **Thông tin chuyên môn Giảng viên (khi chọn `TEACHER`):** Điểm TOEIC xác minh (`700–990`) và danh sách chuyên môn giảng dạy.

### Khu vực B – Tài khoản Đăng nhập & Quy trình Kích hoạt (`UserAccount`)
- **Username (`username`):** Bắt buộc, `3–32` ký tự `[a-z0-9._-]`, kiểm tra trùng lặp.
- **Email đăng nhập (`loginEmail`):** Đồng bộ mặc định từ Email công vụ hoặc cho phép chỉ định email đăng nhập riêng, kiểm tra trùng lặp.
- **Hai phương thức kích hoạt rõ ràng:**
  1. **`INVITE_LINK` (Mặc định khuyến nghị):** Tạo tài khoản ở trạng thái `PENDING_ACTIVATION`. Trên chế độ Mock hiển thị thông báo trung thực: chỉ ghi nhận trạng thái chờ kích hoạt trên UI, chưa gửi email SMTP thật hay sinh token bảo mật giả ở trình duyệt.
  2. **`TEMPORARY_PASSWORD` (Tùy chọn theo chính sách nội bộ):**
     - Nhập mật khẩu tạm thời + xác nhận mật khẩu tạm thời + nút Hiện/Ẩn.
     - Nút **Sinh mật khẩu mạnh tự động** sử dụng CSPRNG (`crypto.getRandomValues` trong [`passwordPolicy.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/config/passwordPolicy.ts)).
     - Thanh đo độ mạnh trực tiếp theo 5 tiêu chí Password Policy (`>= 8` ký tự, chữ hoa, chữ thường, chữ số, ký tự đặc biệt).
     - Tùy chọn `Bắt buộc đổi mật khẩu ngay lần đăng nhập đầu tiên` (mặc định bật -> trạng thái `PASSWORD_RESET_REQUIRED`).
     - Sau khi tạo thành công, mật khẩu tạm chỉ hiển thị **duy nhất 01 lần** trên hộp thoại RAM để sao chép bàn giao, sau đó xóa vĩnh viễn khỏi bộ nhớ.

### Khu vực C – Vai trò RBAC, Phạm vi Dữ liệu & Lý do Cấp phát
- Chọn 1 hoặc nhiều vai trò (`roles` multi-select). Quản trị viên không có quyền `accounts.grant_admin` không thể gán vai trò `ADMIN`.
- Chọn `AccessScopeType` (`OWN`, `TEAM`, `BRANCH`, `ALL`); khi chọn `BRANCH`, bắt buộc chọn danh sách cơ sở được phép truy cập (`scopeIds`).
- Ghi nhận căn cứ/lý do khởi tạo vào nhật ký kiểm toán (`ACCOUNT_CREATED`).

---

## 3. Vòng đời 5 Trạng thái Tài khoản & Thao tác Quản trị

| Trạng thái | Ý nghĩa vận hành | Hành vi khi đăng nhập | Thao tác quản trị hỗ trợ |
| :--- | :--- | :--- | :--- |
| `PENDING_ACTIVATION` | Mới tạo theo luồng mời kích hoạt | Chặn đăng nhập, nhắc hoàn tất kích hoạt | Gửi lại lời mời (`accounts.update`), hoặc cấp mật khẩu tạm (`accounts.reset_password`), Khóa |
| `PASSWORD_RESET_REQUIRED` | Cấp mật khẩu tạm hoặc Admin yêu cầu đổi MK | Yêu cầu đổi sang mật khẩu cá nhân mới ngay tại bước đăng nhập trước khi vào hệ thống | Cấp lại mật khẩu tạm mới, Khóa |
| `ACTIVE` | Đang hoạt động bình thường | Cho phép đăng nhập và nạp phiên `/auth/me` | Sửa hồ sơ, Đổi quyền (`permissions.assign`), Đặt lại MK, Khóa (`LOCKED`), Vô hiệu hóa (`DISABLED`) |
| `LOCKED` | Tạm khóa bảo mật / bàn giao | Chặn đăng nhập & thu hồi phiên đang mở ngay lập tức | Mở khóa (`ACTIVE`), Vô hiệu hóa (`DISABLED`) |
| `DISABLED` | Nhân sự nghỉ việc / ngừng vĩnh viễn | Chặn đăng nhập hoàn toàn, không cho đặt lại MK | Mở khóa lại khi có quyết định khôi phục kèm lý do Audit |

### Quy tắc Chống Tự Khóa & Chống Tự Nâng Quyền
- Người thao tác **không thể** tự khóa (`LOCKED`) hoặc tự vô hiệu hóa (`DISABLED`) chính tài khoản đang đăng nhập.
- Người thao tác **không thể** tự thay đổi vai trò hoặc tự nâng quyền cá nhân của chính mình (`input.userId === actor.userId` bị chặn `403`).
- Mọi thao tác đổi vai trò, đổi ma trận quyền, khóa/mở khóa hoặc đặt lại mật khẩu đều bắt buộc nhập `reason` và ghi bản ghi vào tab **Nhật ký Phân quyền & Bảo mật (Audit Log)**.
