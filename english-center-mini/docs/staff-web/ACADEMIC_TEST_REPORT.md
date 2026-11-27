# BÁO CÁO KIỂM THỬ PHÂN HỆ GIÁO VỤ (`ACADEMIC_TEST_REPORT`)

## 1. Kết quả Kiểm tra Kỹ thuật

| Lệnh kiểm tra | Phạm vi | Kết quả |
| :--- | :--- | :--- |
| `npm run typecheck` | Toàn bộ Monorepo (`packages/*`, `client-web`, `staff-web`) | **PASS** (`0` lỗi) |
| `npm run lint` | `staff-web` (`130` tệp) & `client-web` (`181` tệp) | **PASS** (`0` cảnh báo, `0` lỗi) |
| `npm run build:staff` | Production build `apps/staff-web` | **PASS** (`3.52s`) |

## 2. Kịch bản Nghiệp vụ Đã Xác minh

| Mã kịch bản | Nội dung kiểm tra | Kết quả |
| :--- | :--- | :--- |
| `ACA-TC-01` | Đăng nhập `academic@englishcenter.edu.vn` hoặc `hr-academic@englishcenter.edu.vn`, điều hướng thẳng tới `/academic/dashboard` với đầy đủ 6 mục menu Giáo vụ + mục xét duyệt hồ sơ Sale. | **PASS** |
| `ACA-TC-02` | Hồ sơ chi tiết học viên `HV-2026-0108` (`Nguyễn Minh Khôi`) hiển thị đầy đủ lịch sử khóa trước (`EC-FD09` – `completed`) và khóa hiện tại (`EC-S01` – `active`), bảng điểm ở chế độ Chỉ đọc. | **PASS** |
| `ACA-TC-03` | Mở lớp mới / cập nhật lớp tại `/academic/classes`: kiểm tra mã lớp duy nhất và phát hiện xung đột lịch dạy của Giảng viên (`checkClassScheduleConflict`). | **PASS** |
| `ACA-TC-04` | Chuyển lớp cho học viên: bảo toàn bản ghi `Enrollment` cũ ở trạng thái `'transferred'`, tạo `Enrollment` mới `'active'`, lưu `ClassTransferHistoryDto`, cập nhật sĩ số hai lớp và không tự ý sửa công nợ Kế toán. | **PASS** |
| `ACA-TC-05` | Hàng đợi Xếp lớp theo tháng (`/academic/placement`) tự động nạp hồ sơ Sale đã duyệt (`REG-2026-0001` – `Ngô Tuấn Kiệt`), hỗ trợ sao chép SĐT, ghi chú cuộc gọi và xác nhận xếp lớp chuyển hồ sơ Sale sang `'Converted'`. | **PASS** |
| `ACA-TC-06` | Duyệt nguyện vọng dạy lớp `TRQ-2026-001` của Giảng viên tại tab 2 của `/academic/classes` tự động phân công chính thức giảng viên cho lớp `TOEIC-B01`. | **PASS** |
| `ACA-TC-07` | Quản lý phiên bản nội dung khóa học (`/academic/course-content`) khóa sửa phiên bản `archived` và tách biệt với Danh mục khóa học Website của Admin. | **PASS** |
