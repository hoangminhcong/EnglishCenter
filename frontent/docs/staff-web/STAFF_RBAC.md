# THIẾT KẾ XÁC THỰC, PHÂN QUYỀN & PHẠM VI DỮ LIỆU (`STAFF_RBAC`)

Tài liệu này quy định cơ chế kiểm soát truy cập dựa trên vai trò và quyền chi tiết (`RBAC + Data Scope`) của `apps/staff-web`, sẵn sàng ánh xạ 1:1 sang Guards/Decorators trên Backend NestJS.

---

## 1. DANH MỤC 7 VAI TRÒ NHÂN SỰ & PHẠM VI DỮ LIỆU (`DATA SCOPE`)

Hệ thống hỗ trợ linh hoạt cả mô hình tách riêng **Nhân sự (`HR`) / Giáo vụ (`ACADEMIC`)** và mô hình kiêm nhiệm **Nhân sự – Giáo vụ (`HR_ACADEMIC`)**:

| Mã vai trò (`StaffRole`) | Tên hiển thị | Phạm vi dữ liệu (`DataScope`) | Trạng thái trên `staff-web` hiện tại |
| :--- | :--- | :--- | :--- |
| `ADMIN` | Quản trị hệ thống (Admin) | `all` (Toàn hệ thống, mọi cơ sở) | **Đã triển khai đầy đủ 16 phân hệ Admin Portal** |
| `SALES` | Tư vấn tuyển sinh (Sale) | `branch` (Theo cơ sở công tác) | Đã chuẩn bị RBAC & Scope; chỉ hiển thị các màn hình tra cứu được cấp quyền (`dashboard`, `courses`, `tuition`, `training`, `branches` ở chế độ chỉ xem) |
| `ACCOUNTANT` | Kế toán & Học phí | `all` (Đối soát toàn trung tâm) | Đã chuẩn bị RBAC & Scope; xem chính sách học phí, khóa học và báo cáo tài chính |
| `HR_ACADEMIC` | Nhân sự – Giáo vụ (Kết hợp) | `branch` (Theo cơ sở công tác) | Đã chuẩn bị RBAC & Scope; truy cập tin tuyển dụng, học liệu, giám sát đào tạo theo quyền được cấp |
| `HR` | Nhân sự & Tuyển dụng | `own_department` | Đã chuẩn bị RBAC & Scope; quản lý tin tuyển dụng Website và xem cơ sở |
| `ACADEMIC` | Giáo vụ đào tạo | `branch` | Đã chuẩn bị RBAC & Scope; biên tập học liệu, Study Zone, đề thi nháp (không có quyền `tests.publish` trừ khi Admin cấp thêm) |
| `TEACHER` | Giảng viên TOEIC | `assigned_classes_only` (Chỉ lớp được phân công) | Đã chuẩn bị RBAC & Scope; tra cứu giám sát lớp, học liệu, Study Zone và ngân hàng đề ở chế độ đọc |

---

## 2. QUY TẮC KIỂM SOÁT TRUY CẬP 3 LỚP

1. **Lớp Điều hướng (`StaffSidebar`):**
   - Đọc tập trung từ [`navigation.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/navigation.config.ts).
   - Ẩn hoàn toàn các mục menu mà `hasPermission(user, item.requiredPermission)` trả về `false`.
   - Không hiển thị các menu nghiệp vụ rỗng chưa có đặc tả của các vai trò nhân sự khác.
2. **Lớp Định tuyến (`AuthGuard` + `PermissionGuard`):**
   - Người dùng chưa đăng nhập truy cập URL sâu (ví dụ `/learning/tests/test-2026-01`) sẽ được đẩy về `/login` kèm `location.state.from` để quay lại đúng trang sau khi xác thực.
   - Người dùng đã đăng nhập nhưng gõ trực tiếp URL không có quyền (ví dụ tài khoản `SALES` truy cập `/accounts` hoặc `/roles`) sẽ bị `PermissionGuard` chặn ngay và hiển thị trang `403 Forbidden` kèm mã quyền còn thiếu.
3. **Lớp Thao tác Giao diện (`Action-level Permission`):**
   - Không bao giờ kiểm tra cứng `user.role === 'ADMIN'` để mở khóa nút nghiệp vụ; luôn dùng `hasPermission(user, '<resource>.<action>')`:
     - Ví dụ: `ACADEMIC` có `tests.create` và `tests.update` (được soạn đề nháp), nhưng không có `tests.publish` -> nút **Xuất bản đề thi** tự động ẩn, chỉ Admin hoặc người được gán `tests.publish` mới thực thi được.

---

## 3. CÁC RÀNG BUỘC AN TOÀN QUẢN TRỊ BẮT BUỘC

- **Chống tự nâng quyền (`Anti Self-Escalation`):** Chỉ tài khoản sở hữu quyền `accounts.grant_admin` mới nhìn thấy và gán được vai trò `ADMIN` khi tạo/sửa nhân sự.
- **Chống tự khóa tài khoản đang đăng nhập (`Anti Self-Lockout`):**
  - `accountsApi.setAccountStatus()` chặn cứng thao tác tự khóa chính `user.id` đang đăng nhập.
  - Tại màn hình `/roles`, tập quyền của vai trò `ADMIN` được khóa bảo vệ để tránh vô tình gỡ mất quyền `roles.update` hoặc `accounts.view`.
- **Đồng bộ khóa tài khoản tức thì:** Khi Admin khóa một tài khoản nhân sự tại `/accounts`, phiên đăng nhập mới của tài khoản đó tại `/login` bị từ chối ngay với mã lỗi `403`.
- **Nguyên tắc Backend bắt buộc:** Mọi kiểm tra trên Frontend chỉ phục vụ trải nghiệm UI; khi xây dựng Backend NestJS, tất cả endpoint `/api/v1/staff/*` bắt buộc xác thực JWT/Session Cookie và kiểm tra lại cả `PermissionCode` lẫn `DataScope` tại tầng Server.
