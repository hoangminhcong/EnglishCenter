# MA TRẬN VAI TRÒ & QUYỀN HẠN CỐ ĐỊNH (`FIXED_ROLE_PERMISSION_MATRIX`)

## 1. Nguyên tắc Phân quyền Cố định

1. **Cố định tuyệt đối trong mã nguồn:** Định nghĩa tại [`FIXED_ROLE_PERMISSIONS`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/permissions.config.ts). Admin **không** có giao diện hay API để thêm, xóa, sửa Permission hoặc chỉnh sửa bộ quyền của Role.
2. **Trang `/accounts/roles` ở chế độ Chỉ đọc (`Read-Only`):** Chỉ dùng để tra cứu minh bạch mỗi Role cố định bao gồm những Permission nào.
3. **Không cấp `ADMIN = ALL_PERMISSIONS`:** Tài khoản `ADMIN` chỉ có quyền quản trị hệ thống, tài khoản, khóa học, học phí, CMS, học liệu/TOEIC và báo cáo giám sát; không tự động thấy giao diện tác nghiệp riêng của Sale, Kế toán, Giáo vụ hay Giảng viên.
4. **Nguồn quyết định cuối cùng:** Khi kết nối Backend Node.js, Server trả danh sách `permissions` và `scopes` hiệu lực qua `GET /api/v1/auth/me` và kiểm tra lại trên từng API.

---

## 2. Bảng Phân quyền Cố định 5 Vai trò Nhân sự (`STAFF`)

| Nhóm Nghiệp vụ | Mã quyền (`PermissionCode`) | `ADMIN` | `SALES` | `ACCOUNTANT` | `ACADEMIC` | `TEACHER` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin & Giám sát** | `dashboard.view`, `training.view`, `reports.view` | `ALL` | — | — | — | — |
| **Tài khoản & Role cố định** | `accounts.view`, `accounts.create`, `accounts.update`, `accounts.lock`, `accounts.reset_password`, `accounts.grant_admin`, `roles.view` | `ALL` | — | — | — | — |
| **Khóa học & Học phí** | `courses.view`, `courses.create`, `courses.update`, `courses.publish` | `ALL` | — | — | — | — |
| | `tuition.view`, `tuition.create`, `tuition.update` | `ALL` | — | — | — | — |
| **Content CMS** | `center_info.*`, `branches.*`, `news.*`, `jobs.*`, `achievements.*` | `ALL` | — | — | — | — |
| **Học liệu & TOEIC** | `materials.*`, `study_zone.*`, `tests.*`, `toeic_config.*` | `ALL` | — | — | — | — |
| **Sales CRM** | `sales.dashboard.view`, `sales.leads.view/create/update/reopen` | — | `OWN` | — | — | — |
| | `sales.consultations.view/create`, `sales.followups.view/create/update` | — | `OWN` | — | — | — |
| | `sales.courses.view`, `sales.classes.view` | — | `ALL` | — | — | — |
| | `sales.registrations.view/create/update` | — | `OWN` | — | — | — |
| | `sales.registrations.review` | — | — | — | `ALL` | — |
| **Accounting Portal** | `finance.dashboard.view`, `finance.receivables.view/create` | — | — | `ALL` | — | — |
| | `finance.payments.view/create/update`, `finance.transactions.view` | — | — | `ALL` | — | — |
| | `finance.receipts.view/create`, `finance.refunds.view/create/approve`, `finance.reports.view` | — | — | `ALL` | — | — |
| **Academic Portal** | `academic.dashboard.view`, `students.view/create/update` | — | — | — | `ALL` | — |
| | `classes.view/create/update/assign_students/transfer_students` | — | — | — | `ALL` | — |
| | `class-placement.view/assign`, `student-status.view/manage`, `course-content.view/update` | — | — | — | `ALL` | — |
| **Teacher Portal** | `teacher.dashboard.view`, `teacher.classes.view`, `teacher.schedule.view/request` | — | — | — | — | `OWN` |
| | `teaching-plan.view/update`, `attendance.view/create/update` | — | — | — | — | `OWN` |
| | `assignments.view/create/update/close/grade`, `grades.view/create/update` | — | — | — | — | `OWN` |
| **Tài khoản cá nhân (`/profile`)** | Phiên xác thực `STAFF` hợp lệ (`ACTIVE`) | Có | Có | Có | Có | Có |

---

## 3. Vai trò Học viên (`STUDENT` – `CLIENT` Portal)

- `accountType: 'STUDENT'`, `portal: 'CLIENT'`, `role: 'STUDENT'`, `permissions: []`.
- Chỉ được phép truy cập `apps/client-web` (Website công khai & Student Portal `/student/*`). Không có bất kỳ quyền nào trên `apps/staff-web`.
