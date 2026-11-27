# MA TRẬN PHÂN QUYỀN GIẢNG VIÊN (`TEACHER_PERMISSION_MATRIX`)

| Mã quyền (`PermissionCode`) | Mô tả chức năng | `TEACHER` (`assigned_classes_only`) | `ADMIN` / `ACADEMIC` / `ACCOUNTANT` / `SALES` |
| :--- | :--- | :---: | :---: |
| `teacher.dashboard.view` | Xem Dashboard Giảng viên | Có (Chỉ lớp mình dạy) | Không |
| `teacher.classes.view` | Xem Lớp của tôi & Tiến độ học tập học viên | Có (Chỉ lớp mình dạy) | Không |
| `teacher.schedule.view` | Xem Lịch giảng dạy Ngày / Tuần / Tháng | Có (Chỉ lớp mình dạy) | Không |
| `teacher.schedule.request` | Gửi nguyện vọng dạy lớp đang thiếu giảng viên | Có | Không |
| `teaching-plan.view` | Xem kế hoạch giảng dạy từng buổi | Có (Chỉ lớp mình dạy) | Không |
| `teaching-plan.update` | Soạn chủ đề, LC/RC, mục tiêu & học liệu buổi dạy | Có (Chỉ lớp mình dạy) | Không |
| `attendance.view` | Xem bảng điểm danh buổi học | Có (Chỉ lớp mình dạy) | Giáo vụ giám sát qua báo cáo |
| `attendance.create` | Điểm danh buổi học được phân công | Có (Chỉ lớp mình dạy) | Không |
| `attendance.update` | Chỉnh sửa điểm danh (kèm Audit Log) | Có (Chỉ lớp mình dạy) | Không |
| `assignments.view` | Xem danh sách bài tập lớp | Có (Chỉ lớp mình dạy) | Giáo vụ xem tổng quan |
| `assignments.create` | Giao bài tập cho lớp / nhóm / cá nhân trong lớp | Có (Chỉ lớp mình dạy) | Không |
| `assignments.grade` | Chấm điểm, nhận xét & yêu cầu nộp lại bài | Có (Chỉ lớp mình dạy) | Không |
| `grades.view` | Xem bảng điểm thường xuyên / giữa khóa / cuối khóa | Có (Chỉ lớp mình dạy) | Giáo vụ xem Read-only ở Hồ sơ HV |
| `grades.create` | Nhập điểm bài kiểm tra lớp phụ trách | Có (Chỉ lớp mình dạy) | Không |
| `grades.update` | Điều chỉnh điểm bài kiểm tra (kèm Audit Log) | Có (Chỉ lớp mình dạy) | Không |

## Kiểm chứng Thực tế với 2 Tài khoản Giảng viên Demo

1. **`teacher@englishcenter.edu.vn` (`Cô Lan Hương` – `acc-stf-007`)**: Chỉ thấy lớp của Cô Lan Hương (`EC-S01`, `ONL-SB01`, `TOEIC-CB02`, `TOEIC-SB03`, `HBT-SB01`). Truy cập `/teacher/classes/sch-hd-01` bị chặn `403 Forbidden`.
2. **`thay.duc.minh@englishcenter.edu.vn` (`Thầy Đức Minh` – `acc-tea-002`)**: Chỉ thấy lớp của Thầy Đức Minh (`TOEIC-FD01`, `NTL-BG01`, `ONL-FD01`, `EC-FD09`). Truy cập `/teacher/classes/cls-ec-s01` bị chặn `403 Forbidden`.
