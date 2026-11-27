# MA TRẬN VAI TRÒ, QUYỀN TRUY CẬP & PHẠM VI DỮ LIỆU (`RBAC_PERMISSION_MATRIX`)

## 1. Nguyên tắc Phân quyền Cốt lõi

1. **Kiểm tra thuần theo Permission (`resource.action`):** Toàn bộ Sidebar, Route Guard (`PermissionGuard`), nút thao tác (`ActionGuard`) và điều hướng sau đăng nhập chỉ kiểm tra `session.permissions` và `session.scopes`. Đã loại bỏ hoàn toàn các phép kiểm tra cứng `user.role === 'ADMIN'` để mở tắt giao diện.
2. **Nguyên tắc Đặc quyền Tối thiểu cho `ADMIN`:** Vai trò `ADMIN` mặc định **chỉ** nắm quyền Quản trị Hệ thống, Tài khoản, Phân quyền, Khóa học/Học phí, CMS, Kho đề TOEIC và Báo cáo giám sát tổng hợp. `ADMIN` **không** mặc định nhận quyền tác nghiệp riêng của Tư vấn (`sales.*`), Kế toán (`finance.*`), Giáo vụ (`academic.*`, `class-placement.*`, `student-status.*`) hay Giảng viên (`teacher.*`, `grades.*`, `teaching-plan.*`) trừ khi được gán tường minh và lưu vết Audit Log.
3. **Hỗ trợ Đa vai trò & Quyền ghi đè cá nhân:** Một nhân sự kiêm nhiệm (ví dụ `HR_ACADEMIC` hoặc nhân viên vừa làm `TEACHER` vừa phụ trách `ACADEMIC`) nhận hợp nhất (`union`) tập quyền và mức `AccessScopeType` rộng nhất trên từng mã quyền.

---

## 2. Mô hình Phạm vi Dữ liệu (`AccessScopeType`)

| Mã Scope | Ý nghĩa kiểm soát dữ liệu (Thực thi bắt buộc tại Backend khi tích hợp) | Vai trò mặc định sử dụng |
| :--- | :--- | :--- |
| `OWN` | Chỉ xem và thao tác trên dữ liệu do chính nhân sự phụ trách (Lead được giao cho Sale, lớp được phân công cho Giảng viên) | `SALES`, `TEACHER` |
| `TEAM` | Dữ liệu trong phạm vi phòng ban hoặc nhóm chuyên môn quản lý | `HR` (hoặc Trưởng nhóm Sale khi cấu hình) |
| `BRANCH` | Dữ liệu thuộc danh sách cơ sở cụ thể được cấp trong `scopeIds` | Quản lý cơ sở / Giáo vụ điểm cơ sở |
| `ALL` | Toàn bộ cơ sở thuộc hệ thống English Center | `ADMIN`, `ACCOUNTANT`, `ACADEMIC`, `HR_ACADEMIC` |

---

## 3. Ma trận Nhóm Quyền Theo 7 Vai trò Hệ thống Mặc định

Nguồn cấu hình chuẩn: [`permissions.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/permissions.config.ts).

| Nhóm chức năng / Mã quyền tiêu biểu | `ADMIN` | `SALES` | `ACCOUNTANT` | `ACADEMIC` | `TEACHER` | `HR_ACADEMIC` | `HR` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Quản trị chung (`dashboard.view`, `reports.view`)** | Có (`ALL`) | Không | Chỉ `reports.view` | Không | Không | Có (`ALL`) | Không |
| **Tài khoản nhân sự (`accounts.view/create/update/lock/reset_password`)** | Có (`ALL`) | Không | Không | Không | Không | Chỉ `view`, `create`, `update` | Chỉ `view`, `create`, `update` |
| **Cấp quyền nhạy cảm (`accounts.grant_admin`, `roles.view/update`, `permissions.assign`)** | Có (`ALL`) | Không | Không | Không | Không | Không | Không |
| **Danh mục Khóa học & Học phí (`courses.*`, `tuition.*`)** | Toàn quyền | Chỉ `view` | Chỉ `tuition.view` | Chỉ `courses.view` | Không | Chỉ `courses.view` | Không |
| **Nội dung Website CMS (`center_info.*`, `branches.*`, `news.*`, `jobs.*`, `achievements.*`)** | Toàn quyền | Không | Không | Không | Không | `jobs.view` | `jobs.*`, `recruitment.*` |
| **Học liệu, Study Zone & Kho đề TOEIC (`materials.*`, `study_zone.*`, `tests.*`, `toeic_config.*`)** | Toàn quyền | Không | Không | Xem & tạo học liệu | Xem/tạo/sửa học liệu & đề nháp (không xuất bản) | Xem học liệu | Không |
| **Sales CRM (`sales.dashboard.view`, `sales.leads.*`, `sales.consultations.*`, `sales.followups.*`, `sales.registrations.view/create/update`)** | **Không mặc định** | Có (`OWN`) | Không | Chỉ `sales.registrations.view/review` | Không | Chỉ `sales.registrations.view/review` | Không |
| **Accounting Portal (`finance.dashboard.view`, `finance.receivables.*`, `finance.payments.*`, `finance.receipts.*`, `finance.refunds.*`, `finance.reports.view`)** | **Không mặc định** | Không | Toàn quyền (`ALL`) | Không | Không | Không | Không |
| **Academic Portal (`academic.dashboard.view`, `students.*`, `classes.*`, `class-placement.*`, `student-status.*`, `course-content.*`)** | **Không mặc định** (chỉ giám sát `/training`) | Không | Không | Toàn quyền (`ALL`) | Không | Toàn quyền (`ALL`) | Không |
| **Teacher Portal (`teacher.dashboard.view`, `teacher.classes.view`, `teacher.schedule.*`, `teaching-plan.*`, `attendance.*`, `assignments.*`, `grades.*`)** | **Không mặc định** | Không | Không | Xem điểm danh/điểm số lớp | Toàn quyền trên lớp phân công (`OWN`) | Xem điểm danh | Không |

---

## 4. Quản trị Động Ma trận Quyền & Nhật ký Kiểm toán (`Audit Log`)

- Trang `/accounts/roles` ([`RolesPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/accounts/pages/RolesPage.tsx)) cho phép tài khoản có `roles.update` điều chỉnh danh sách quyền của từng vai trò kèm lý do bắt buộc (`ROLE_PERMISSIONS_UPDATED`).
- Hệ thống chặn tự gỡ `roles.view` / `roles.update` trên vai trò quản trị duy nhất của người đang thao tác để bảo vệ tính liên tục vận hành mà không cần khóa cứng tên vai trò `ADMIN`.
