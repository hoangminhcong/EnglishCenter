# BÁO CÁO KIỂM THỬ & XÁC MINH BUILD – MODULE SALES CRM (`SALES_TEST_REPORT`)

- **Ngày thực hiện:** `2026-11-25`
- **Phạm vi kiểm tra:** `packages/contracts`, `apps/staff-web` (`features/sales` + tích hợp Admin/RBAC) và hồi quy `apps/client-web`.

---

## 1. KẾT QUẢ CHẠY LỆNH KỸ THUẬT THỰC TẾ

| Lệnh đã chạy thực tế | Phạm vi | Kết quả ghi nhận | Trạng thái |
| :--- | :--- | :--- | :--- |
| `npm run typecheck` | `packages/*`, `client-web`, `staff-web` | `0` lỗi TypeScript (`tsc -p` / `tsc -b`) | **PASS** |
| `npm run lint:staff` | `apps/staff-web/src` (`96` tệp) | `Found 0 warnings and 0 errors` (`45ms`, đạt chuẩn React Purity & React Compiler) | **PASS** |
| `npm run lint` | Toàn bộ Monorepo (`298` tệp) | `Found 0 warnings and 0 errors` | **PASS** |
| `npm run build:staff` | `@english-center/staff-web` | `2240 modules transformed`, `built in 569ms`, `0` cảnh báo chunk | **PASS** |
| `npm run build:client` | `@english-center/client-web` | `2329 modules transformed`, `built in 561ms`, `0` tệp bị thay đổi ở `client-web` | **PASS** |

---

## 2. ĐỐI CHIẾU 8 KỊCH BẢN NGHIỆP VỤ (MỤC X & YÊU CẦU BỔ SUNG)

| STT | Kịch bản kiểm thử | Cơ chế & Tệp mã nguồn đảm nhận | Trạng thái xác minh |
| :--- | :--- | :--- | :--- |
| 1 | **Tạo Lead mới & Cảnh báo trùng SĐT/Email** | `CreateOrEditLeadModal` gọi `salesApi.findDuplicateLeads()`, chuẩn hóa SĐT qua `normalizeVnPhone()`, khóa nút tạo cho đến khi mở hồ sơ sẵn có hoặc tích xác nhận override; invalidate query cập nhật ngay KPI Dashboard. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 2 | **Ghi tư vấn bất biến & Máy trạng thái Lead** | `salesApi.createConsultation()` luôn chèn bản ghi mới vào đầu mảng `consultations`; `transitionLeadStatus()` khóa đặt tay `Registered`, chỉ hiển thị đích hợp lệ từ `getAllowedManualLeadTransitions()` và bắt buộc nhập lý do khi mở lại `NotInterested / Lost`. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 3 | **Follow-up hôm nay / quá hạn / sắp tới** | `isFollowUpOverdue()` suy diễn động từ `status === 'Scheduled' && dueAt < nowIso` qua `useCurrentTime()`; bấm **Hoàn thành** cập nhật ngay KPI *"Chờ liên hệ lại"*. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 4 | **Xem toàn bộ Khóa học & Lớp đang mở tại 7 cơ sở** | `SalesCoursesPage` có 2 tab (`Toàn bộ Khóa học` + `Lớp đang mở tại tất cả cơ sở`) đọc từ `coursesApi`, `cmsApi.listBranches` và `trainingApi.listAllCenterClasses()`; tính chỗ trống qua `computeRemainingClassSeats()` (hiển thị `"Chưa cấu hình sĩ số"` ở lớp `Q1-CB01` khi thiếu `maxStudents`, không bịa số); `SalesCourseDetailPage` gắn khóa vào Lead không tạo hồ sơ đăng ký. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 5 | **Stepper 6 bước đăng ký gắn Lớp cụ thể** | `SalesNewRegistrationPage` giữ nguyên state khi quay lại bước trước, hỗ trợ Lưu nháp (`Draft`), kiểm tra xung đột lịch học qua `checkClassScheduleConflict()`, chụp `RegistrationSnapshot` và tự đặt `Lead.status = 'Registered'` khi nộp `Submitted`. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 6 | **Theo dõi & Xét duyệt hồ sơ theo vai trò** | `SalesRegistrationDetailPage` chỉ hiển thị nút `Tiếp nhận xét duyệt / Duyệt / Yêu cầu bổ sung / Từ chối` khi tài khoản có `sales.registrations.review` (`academic@englishcenter.edu.vn` hoặc `admin@englishcenter.edu.vn`); tài khoản `SALES` hoàn toàn không thấy các nút này. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 7 | **Tính bất biến của `RegistrationSnapshot`** | Khi Admin chỉnh sửa giá khóa học tại `/courses` hoặc chính sách tại `/tuition`, các hồ sơ đã tạo tại `/sales/registrations/:id` đọc từ `registration.snapshot` nên giữ nguyên 100% giá và thông tin lớp lúc chụp. | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |
| 8 | **Phân quyền & Cô lập phạm vi dữ liệu `own` vs `all`** | `sales@englishcenter.edu.vn` (`acc-stf-002`) chỉ thấy Lead/Hồ sơ của `acc-stf-002` và bị chặn `403` nếu truy cập `/sales/leads/lead-005` (thuộc `sales2@englishcenter.edu.vn`) hoặc `/accounts`; `admin@englishcenter.edu.vn` xem được toàn bộ (`all`). | **ĐÃ CÀI ĐẶT & KIỂM TRA LOGIC** |

---

## 3. HẠNG MỤC GHI NHẬN TRUNG THỰC `NOT VERIFIED`

1. **Kiểm tra trực quan từng điểm gãy màn hình (`360px, 768px, 1024px, 1366px, 1920px`) & độ tương phản thực tế trên trình duyệt người dùng:** **`NOT VERIFIED` bằng công cụ chụp màn hình tự động trong phiên này** *(Bố cục đã thiết kế bằng Tailwind responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6`, `DataTableContainer` có `overflow-x-auto` và `Modal` giới hạn `max-h-[90vh] overflow-y-auto`; cần kiểm tra trực quan khi mở trình duyệt tại `http://localhost:5174`)*.
2. **Kiểm thử tích hợp HTTP API thật & Transaction chống tranh chấp chỗ cuối cùng của lớp:** **`NOT VERIFIED` (Chưa có Backend Node.js & Database)**.
