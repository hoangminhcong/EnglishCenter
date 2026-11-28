# MA TRẬN PHÂN QUYỀN GIÁO VỤ (`ACADEMIC_PERMISSION_MATRIX`)

| Mã quyền (`PermissionCode`) | Mô tả thao tác | `ACADEMIC` | `HR_ACADEMIC` | `ADMIN` (Giám sát) | `SALES` / `ACCOUNTANT` / `TEACHER` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `academic.dashboard.view` | Xem Dashboard Giáo vụ | Có | Có | Có (Chỉ xem) | Không |
| `students.view` | Xem danh sách & hồ sơ chi tiết học viên | Có | Có | Có (Chỉ xem) | Không |
| `students.create` | Tạo hồ sơ học viên mới | Có | Có | Không | Không |
| `students.update` | Cập nhật thông tin cá nhân học viên | Có | Có | Không | Không |
| `classes.view` | Xem danh sách & chi tiết lớp học | Có | Có | Có (Chỉ xem) | Không |
| `classes.create` | Mở lớp đào tạo mới | Có | Có | Không | Không |
| `classes.update` | Sửa lớp, phòng học, phân công GV & duyệt nguyện vọng dạy | Có | Có | Không | Không |
| `classes.assign_students` | Thêm học viên vào lớp (tạo `Enrollment`) | Có | Có | Không | Không |
| `classes.transfer_students` | Chuyển lớp cho học viên (lưu lịch sử) | Có | Có | Không | Không |
| `class-placement.view` | Xem hàng đợi xếp lớp theo tháng | Có | Có | Có (Chỉ xem) | Không |
| `class-placement.assign` | Ghi chú liên hệ & xác nhận xếp lớp hàng tháng | Có | Có | Không | Không |
| `student-status.view` | Xem đơn Bảo lưu / Chuyển lớp / Học lại | Có | Có | Có (Chỉ xem) | Không |
| `student-status.manage` | Tạo & phê duyệt đơn Bảo lưu / Chuyển lớp / Học lại | Có | Có | Không | Không |
| `course-content.view` | Xem phiên bản giáo trình nội dung khóa học | Có | Có | Có (Chỉ xem) | Không |
| `course-content.update` | Tạo phiên bản mới & cập nhật buổi học mẫu | Có | Có | Không | Không |
| `sales.registrations.review` | Xét duyệt hồ sơ đăng ký từ bộ phận Sale | Có | Có | Có | Không |
