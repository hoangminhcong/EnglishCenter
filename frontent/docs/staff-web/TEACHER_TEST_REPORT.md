# BÁO CÁO KIỂM THỬ PHÂN HỆ GIẢNG VIÊN (`TEACHER_TEST_REPORT`)

## 1. Kết quả Kiểm tra Kỹ thuật

| Lệnh kiểm tra | Phạm vi | Kết quả |
| :--- | :--- | :--- |
| `npm run typecheck` | Toàn bộ Monorepo | **PASS** (`0` lỗi) |
| `npm run lint` | Toàn bộ Monorepo (`packages`, `client-web`, `staff-web`) | **PASS** (`0` cảnh báo, `0` lỗi) |
| `npm run build:staff` | Production build `apps/staff-web` | **PASS** (`3.52s`) |

## 2. Kịch bản Nghiệp vụ & Cô lập Phạm vi (`assigned_classes_only`)

| Mã kịch bản | Nội dung kiểm tra | Kết quả |
| :--- | :--- | :--- |
| `TEA-TC-01` | Đăng nhập `teacher@englishcenter.edu.vn` (`Cô Lan Hương` – `acc-stf-007`) chỉ thấy các lớp của Cô Lan Hương; đăng nhập `thay.duc.minh@englishcenter.edu.vn` (`Thầy Đức Minh` – `acc-tea-002`) chỉ thấy các lớp của Thầy Đức Minh. | **PASS** |
| `TEA-TC-02` | Cô Lan Hương truy cập trực tiếp URL `/teacher/classes/sch-hd-01` (lớp của Thầy Đức Minh) bị dịch vụ chặn `403` và hiển thị màn hình `403 Forbidden`. | **PASS** |
| `TEA-TC-03` | Kế hoạch giảng dạy (`/teacher/teaching-plans`) cho phép cập nhật chủ đề, nội dung LC/RC, mục tiêu, học liệu đính kèm nhưng khóa cứng ngày học, giờ học và phòng học của Giáo vụ. | **PASS** |
| `TEA-TC-04` | Điểm danh buổi học (`/teacher/attendance`): buổi hôm nay mặc định `Chưa điểm danh (Unmarked)` thay vì tự điền Có mặt; chặn điểm danh buổi tương lai (`Buổi 16`); yêu cầu hộp thoại xác nhận trước khi lưu và lưu vết khi sửa buổi cũ. | **PASS** |
| `TEA-TC-05` | Quản lý bài tập (`/teacher/assignments`) tách biệt khỏi Study Zone; hỗ trợ giao toàn lớp/nhóm/cá nhân, chấm điểm kiểm tra biên `[0, maxScore]` và yêu cầu nộp lại (`ReturnedForRevision`). | **PASS** |
| `TEA-TC-06` | Bảng điểm (`/teacher/gradebook`) tách biệt 3 loại `regular / mid / final`, phân biệt rõ `null` (`Chưa đánh giá`) với `0` điểm và lưu nhật ký chỉnh sửa điểm. | **PASS** |
| `TEA-TC-07` | Tiến độ học tập (`/teacher/progress`) đánh dấu học viên `Phạm Thùy Dương` (`HV-2026-0155`) cần hỗ trợ kèm danh sách lý do định lượng minh bạch. | **PASS** |
| `TEA-TC-08` | Lịch giảng dạy (`/teacher/schedule`) hỗ trợ xem Ngày/Tuần/Tháng và gửi nguyện vọng nhận lớp trống (`status: 'Requested'`) sau khi kiểm tra không trùng ca dạy. | **PASS** |
