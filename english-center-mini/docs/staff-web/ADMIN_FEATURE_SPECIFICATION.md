# ĐẶC TẢ CHỨC NĂNG ADMIN PORTAL (`ADMIN_FEATURE_SPECIFICATION`)

Tài liệu này mô tả chi tiết các phân hệ đã triển khai hoàn chỉnh trong `apps/staff-web` dành cho **Admin Portal** và các điểm hiệu chỉnh nghiệp vụ so với file HTML tham khảo ban đầu.

---

## 1. BẢNG TỔNG HỢP 16 PHÂN HỆ & MÀN HÌNH ĐÃ TRIỂN KHAI

| STT | Route | Phân hệ | Quyền truy cập Route | Chức năng chính đã hoàn thiện |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `/login` | Đăng nhập nhân sự | Public (Chuyển hướng nếu đã login) | Đăng nhập công vụ, chọn nhanh 7 vai trò mẫu ở chế độ Mock, tự chặn `403` nếu tài khoản đã bị Admin khóa. |
| 2 | `/dashboard` | Bảng điều khiển | `dashboard.view` | 8 thẻ KPI điều hướng thông minh, bộ lọc kỳ `3 tháng / 6 tháng`, 3 biểu đồ SVG và bảng tiến độ lớp thực tế. |
| 3 | `/accounts` | Quản lý tài khoản | `accounts.view` | Tìm kiếm, lọc đối tượng (`STAFF / TEACHER / STUDENT`), xem tách biệt `UserAccount` và `Profile`, tạo/sửa tài khoản nhân sự, khóa/mở khóa có xác nhận. |
| 4 | `/roles` | Vai trò & Phân quyền | `roles.view` | Xem 7 vai trò kèm `DataScope`, bật/tắt động quyền `module.action` cho các vai trò nhân sự, bảo vệ quyền gốc của `ADMIN`. |
| 5 | `/courses` | Danh mục khóa học | `courses.view` | Quản lý 4 khóa TOEIC chuẩn của trung tâm, liên kết trực tiếp mốc đầu ra từ `/config/toeic`, thêm/sửa/tạm dừng/mở tuyển sinh. |
| 6 | `/tuition` | Chính sách học phí | `tuition.view` | Quản lý bảng giá niêm yết, tỷ lệ/số tiền ưu đãi, ngày hiệu lực, tự tính học phí sau ưu đãi và lưu nhật ký phiên bản bất biến. |
| 7 | `/training` | Giám sát đào tạo | `training.view` | Chế độ giám sát **Chỉ xem (`Read-only`)** gồm 2 tab: Lớp đào tạo thực tế (`EC-S01`...) và Lịch khai giảng công khai Website (`ONL-FD01`...). |
| 8 | `/content/center-info` | Thông tin trung tâm | `center_info.view` | Cập nhật thương hiệu `English Center`, hotline, email, địa chỉ, mạng xã hội (`[Chưa cập nhật]` nếu trống) kèm khung xem trước Header/Footer trực tiếp. |
| 9 | `/content/branches` | Hệ thống cơ sở | `branches.view` | Quản lý 7 cơ sở (`toeic-online` + 6 cơ sở Offline), kiểm tra URL bản đồ an toàn, bật/tắt hiển thị trên Bản đồ và Lịch khai giảng. |
| 10 | `/content/news` | Tin tức & Thông báo | `news.view` | Quản lý bài tin (`Draft / Scheduled / Published / Hidden / Archived`), trình soạn thảo khối cấu trúc (`heading, paragraph, list, image, link`) và xem trước. |
| 11 | `/content/jobs` | Tin tuyển dụng | `jobs.view` | Quản lý tin tuyển dụng theo cơ sở, tự động gắn nhãn quá hạn theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`). |
| 12 | `/content/achievements` | Vinh danh học viên | `achievements.view` | Quản lý bảng vàng điểm TOEIC, tùy chọn viết tắt ẩn danh tên học viên, **chặn cứng xuất bản khi chưa có Consent** và nút **Thu hồi Consent tức thì**. |
| 13 | `/learning/materials` | Tài liệu học tập | `materials.view` | Quản lý học liệu đa định dạng (`PDF, DOCX, PPTX, XLSX, Audio, Video, Image`), phân quyền theo phạm vi và cảnh báo rõ `by_group` (`CLIENT CHƯA HỖ TRỢ`). |
| 14 | `/learning/study-zone` & `/:exerciseId` | Khu vực tự học Study Zone | `study_zone.view` | Khóa cứng 3 danh mục route (`grammar, vocabulary, listening`), quản lý chủ đề, biên tập câu hỏi tách riêng `AnswerKey` và xem thử giao diện học viên. |
| 15 | `/learning/tests` & `/:testId` | Ngân hàng đề Test Online | `tests.view` | Tạo đề L&R (khóa S&W chưa hỗ trợ), soạn thảo Part 1–7 & `QuestionGroup`, tách `AnswerKey`, tự động tách phiên bản `v+1`, bộ kiểm định lỗi bắt buộc và xem thử đề QA. |
| 16 | `/config/toeic` & `/reports` | Cấu hình TOEIC & Báo cáo | `toeic_config.view` / `reports.view` | Phiên bản hóa thang điểm TOEIC, trạng thái rỗng trung thực cho bảng quy đổi chưa xác minh, quản lý Mốc đầu ra và 4 tab Báo cáo thống kê minh họa. |

---

## 2. CÁC HIỆU CHỈNH NGHIỆP VỤ QUAN TRỌNG SO VỚI FILE HTML THAM KHẢO

1. **Chuẩn hóa thương hiệu 100% sang `English Center`:** Loại bỏ hoàn toàn tên `HMC Management` / `HMC TOEIC` và thông tin liên hệ giả định trong file HTML mẫu; đồng bộ với [`center-info.ts`](file:///d:/Web/english-center-mini/apps/client-web/src/config/center-info.ts).
2. **Loại bỏ ô nhập tay "Đã thu / Chưa thu" ở Học phí (`/tuition`):** Tuân thủ ranh giới nghiệp vụ — Admin chỉ ban hành `TuitionPolicy`; giao dịch thu tiền, phiếu thu và công nợ thuộc phân hệ `ACCOUNTANT`.
3. **Chế độ Giám sát Chỉ xem ở Đào tạo (`/training`):** Tách bạch Lớp đào tạo thực tế và Lịch khai giảng Website; không đặt nhầm thao tác xếp lớp/bảo lưu (của Giáo vụ) hay điểm danh/chấm bài (của Giảng viên) vào Admin.
4. **Khóa cứng 3 slug danh mục Study Zone:** File HTML mẫu có thêm mục `Reading`, trong khi `client-web` định tuyến cố định 3 danh mục `grammar`, `vocabulary`, `listening`. `staff-web` khóa cứng 3 slug này để không làm gãy URL của học viên.
5. **Bổ sung kiểm soát quyền riêng tư (`publicConsentGranted`):** Bổ sung cơ chế khóa cứng nút Xuất bản và thu hồi Consent một chạm cho Vinh danh học viên.
