# BÁO CÁO KIỂM THỬ HỆ THỐNG XÁC THỰC, PHÂN QUYỀN CỐ ĐỊNH & PORTAL (`AUTHENTICATION_TEST_REPORT`)

## 1. Phân loại Trạng thái Kiểm chứng Minh bạch

| Hạng mục kiểm chứng | Phương pháp thực hiện | Kết quả |
| :--- | :--- | :---: |
| **TypeScript Typecheck toàn Monorepo (`npm run typecheck`)** | Chạy thực tế qua CLI trên `packages/*`, `client-web`, `staff-web` | **PASS** (`0` lỗi) |
| **Oxlint toàn Monorepo (`npm run lint`, `lint:client`, `lint:staff`)** | Chạy thực tế qua CLI không dùng bất kỳ cờ disable nào | **PASS** (`0` lỗi, `0` cảnh báo) |
| **Production Build (`npm run build`, `build:client`, `build:staff`)** | Đóng gói Vite thực tế cả 2 ứng dụng | **PASS** |
| **Kiểm toán Tĩnh Bảo mật & Ràng buộc Kiến trúc** | Đối chiếu trực tiếp mã nguồn `mockAuthAdapter`, `portalResolver`, `permissions.config`, `AccountsPage`, `RolesPage`, `AuthPage` | **PASS** |
| **Kiểm thử thao tác trực tiếp bằng trình duyệt thực tế (`Browser E2E`)** | Môi trường CLI hiện tại chưa mở phiên tương tác trình duyệt đồ họa cho từng kịch bản click chuột | **NOT VERIFIED** *(Sẵn sàng kiểm tra trực tiếp qua `npm run dev:client` & `npm run dev:staff`)* |

---

## 2. Danh sách Tài khoản Mock Kiểm thử (Chỉ hiện trong môi trường `DEV`)

Mỗi tài khoản sử dụng mật khẩu riêng biệt băm một chiều `SHA-256` (đã loại bỏ hoàn toàn mật khẩu dùng chung `Staff@2026` và `English123`):

| Tài khoản (`username`) | `AccountType` | `Portal` | `Role` cố định | Trạng thái | Mật khẩu DEV Demo |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `admin.demo` | `STAFF` | `STAFF` | `ADMIN` | `ACTIVE` | `Admin@Demo1!` |
| `sale.demo` | `STAFF` | `STAFF` | `SALES` (`OWN`) | `ACTIVE` | `Sales@Demo1!` |
| `sale2.demo` | `STAFF` | `STAFF` | `SALES` (`OWN`) | `ACTIVE` | `Sales@Demo2!` |
| `accountant.demo` | `STAFF` | `STAFF` | `ACCOUNTANT` | `ACTIVE` | `Acc@Demo2026!` |
| `academic.demo` | `STAFF` | `STAFF` | `ACADEMIC` | `ACTIVE` | `Aca@Demo2026!` |
| `teacher.demo` | `STAFF` | `STAFF` | `TEACHER` (`OWN`) | `ACTIVE` | `Teach@Demo1!` |
| `teacher2.demo` | `STAFF` | `STAFF` | `TEACHER` (`OWN`) | `ACTIVE` | `Teach@Demo2!` |
| `locked.demo` | `STAFF` | `STAFF` | `SALES` | `LOCKED` | `Locked@Demo1!` |
| `student.demo` | `STUDENT` | `CLIENT` | `STUDENT` | `ACTIVE` | `Student@Demo1!` |

---

## 3. Đối chiếu Logic Thực thi 8 Kịch bản Bắt buộc (Mục XV)

1. **Admin (`admin.demo`):** Nhận `portal: 'STAFF'`, điều hướng `/dashboard`; chỉ thấy khu vực Quản trị, Tài khoản, Role cố định (chỉ đọc), Khóa học, Học phí, Đào tạo, CMS, Học liệu/TOEIC, Báo cáo. Không có trang sửa Permission; không thấy menu Thanh toán Kế toán, Điểm danh/Chấm bài Giảng viên hay Xếp lớp Giáo vụ. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
2. **Sale (`sale.demo`, `sale2.demo`):** Nhận `portal: 'STAFF'`, vào `/sales/dashboard`; chỉ thấy Sales Menu và Lead thuộc phạm vi `OWN` của mình; truy cập `/accounting/*` hoặc `/teacher/*` bị `<PermissionGuard>` chặn `403`. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
3. **Kế toán (`accountant.demo`):** Nhận `portal: 'STAFF'`, vào `/accounting/dashboard`; chỉ thấy 6 trang tài chính; không thao tác được Giáo vụ hay Giảng viên. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
4. **Giáo vụ (`academic.demo`):** Nhận `portal: 'STAFF'`, vào `/academic/dashboard`; chỉ thấy khu vực đào tạo/xếp lớp và xét duyệt đăng ký từ Sale; không tạo được thanh toán học phí. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
5. **Giảng viên (`teacher.demo`, `teacher2.demo`):** Nhận `portal: 'STAFF'`, vào `/teacher/dashboard`; chỉ thấy lớp được phân công; đổi `:classId` trên URL sang lớp giảng viên khác bị `assertTeacherOwnsClass` trả `403` -> `<ForbiddenPage />`. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
6. **Học viên (`student.demo`):**
   - Đăng nhập tại `client-web` -> Nhận `accountType: 'STUDENT'`, `portal: 'CLIENT'` -> vào `/student/dashboard`.
   - Đăng nhập nhầm tại `staff-web` -> Nhận `PORTAL_REDIRECT_REQUIRED` (`targetPortal: 'CLIENT'`), không tạo phiên `staff-web`, hiển thị liên kết Allowlist sang `CLIENT_APP_URL`. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
7. **Chuyển tài khoản (`Sale` -> `Logout` -> `Accountant`):** Cả `login()` và `logout()` đều gọi `staffQueryClient.clear()` và ghi đè hoàn toàn `session`, không giữ lại quyền hay cache dữ liệu của tài khoản trước. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
8. **Truy cập trực tiếp URL ngoài quyền & Trạng thái khóa (`locked.demo`):** `locked.demo` bị chặn `403` ngay tại bước đăng nhập; mọi route con đều có `<PermissionGuard>` độc lập. *(Đã kiểm chứng mã nguồn; Browser UI: `NOT VERIFIED`)*.
