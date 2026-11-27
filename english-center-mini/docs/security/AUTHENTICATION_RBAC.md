# KIẾN TRÚC XÁC THỰC & PHÂN QUYỀN TẬP TRUNG (`AUTHENTICATION_RBAC`)

Tài liệu này quy định cơ chế xác thực (Authentication), phân quyền (Authorization / RBAC) và các nguyên tắc bảo mật giữa `apps/client-web`, `apps/staff-web` và `apps/backend`.

---

## 1. TÁCH BIỆT PHIÊN ĐĂNG NHẬP GIỮA HAI ỨNG DỤNG FRONTEND

| Tiêu chí | `apps/client-web` (`:5173`) | `apps/staff-web` (`:5174`) |
| --- | --- | --- |
| **Đối tượng sử dụng** | Khách truy cập & Học viên (`STUDENT`) | Quản trị viên & Nhân sự nội bộ (`STAFF_ROLES`) |
| **React Context & Query Cache** | `AuthContext` + `queryClient` độc lập | `StaffAuthContext` + `staffQueryClient` độc lập |
| **Khóa lưu trữ phiên (Mock Mode)** | `ec_auth_session_user_v1` | `ec_staff_auth_session_v1` (`sessionStorage`) |
| **Cookie xác thực (Production)** | `ec_student_session` (`HttpOnly, Secure, SameSite=Lax`) | `ec_staff_session` (`HttpOnly, Secure, SameSite=Strict`) |
| **Khi nhận `401 Unauthorized`** | Xóa phiên học viên + `queryClient.clear()` | Xóa phiên nhân sự + `staffQueryClient.clear()` + chuyển về `/login` |

---

## 2. MÔ HÌNH RBAC `MODULE.ACTION` TRÊN `apps/staff-web`

- Nguồn định nghĩa chuẩn: [`packages/contracts/src/auth/rbac.types.ts`](file:///d:/Web/english-center-mini/packages/contracts/src/auth/rbac.types.ts) và [`apps/staff-web/src/services/permissions/permissions.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/permissions.config.ts).
- **6 vai trò nội bộ (`StaffRole`):**
  1. `ADMIN` — Toàn quyền quản trị hệ thống, nhân sự, tài chính và đào tạo.
  2. `ACCOUNTANT` — Quản lý học phí, khoản phải thu (`payments.view`, `payments.create`, `payments.refund`), xem báo cáo tài chính.
  3. `TEACHER` — Xem lớp phụ trách, điểm danh (`attendance.*`), giao & chấm bài tập (`assignments.*`), xem ngân hàng đề.
  4. `ACADEMIC` — Quản lý khóa học (`courses.*`), lớp học (`classes.*`), ghi danh/xếp lớp (`enrollments.*`), ngân hàng đề TOEIC (`tests.*`).
  5. `SALES` — Xử lý đăng ký tư vấn (`consultations.*`), xem khóa học/lịch khai giảng và tạo hồ sơ ghi danh mới (`enrollments.create`).
  6. `HR` — Quản lý hồ sơ nhân sự (`employees.*`) và tin tuyển dụng (`recruitment.*`).

### Nguyên tắc kiểm tra quyền trên UI & Backend:
1. **Không hardcode tên Role rải rác trong JSX:** Mọi kiểm tra trên `staff-web` đều đi qua `hasPermission(user, 'module.action')`, `<PermissionGuard permission="..." />` và cấu hình tập trung `STAFF_NAVIGATION_ITEMS`.
2. **Ẩn Sidebar/Button chỉ là UX, không phải bảo mật:** Backend NestJS bắt buộc kiểm tra JWT + `@RequirePermissions('module.action')` và phạm vi dữ liệu (ví dụ Giảng viên chỉ sửa được điểm danh của lớp mình phụ trách) trên từng API request.

---

## 3. QUY TẮC BẢO MẬT BẮT BUỘC

- Tuyệt đối không đặt `DATABASE_URL`, `JWT_SECRET` hoặc khóa API nội bộ vào biến `VITE_*` của Frontend.
- Không bao giờ lưu mật khẩu dạng rõ hoặc băm trong `localStorage` / `sessionStorage`.
- Tự đăng ký tại `/register` trên `client-web` luôn bị khóa cứng vai trò `student`; tài khoản nhân sự chỉ được tạo bởi `ADMIN` / `HR` có quyền `accounts.create`.
