# MA TRẬN TRẠNG THÁI CHỨC NĂNG CLIENT WEB (`FRONTEND_FEATURE_MATRIX.md`)

Bảng dưới đây ghi nhận chính xác trạng thái thực tế của từng chức năng trong mã nguồn `apps/client-web` của **English Center**.

**Quy ước trạng thái:**
- **Hoàn thành (Mock-Backed & API-Ready):** Giao diện hoàn chỉnh, tương tác đầy đủ trên Mock Repository/Service, đã có nhánh gọi `httpClient` sẵn sàng cho Backend.
- **Bị chặn bởi Backend (Requires Backend Authority):** Giao diện và luồng gửi/nhận đã hoàn chỉnh trên Frontend, nhưng tính bảo mật/xác thực cuối cùng bắt buộc do Backend quyết định.
- **Không thuộc phạm vi hiện tại (Out of Scope):** Thuộc Management/Admin Portal.

---

## 1. Khu vực A: Public Website

| Chức năng | Route | Trạng thái | Mức hoàn thiện | Ghi chú & Việc cần làm khi có Backend |
|---|---|---|---|---|
| Trang chủ & Banner giới thiệu | `/` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Kết nối API danh sách khóa học nổi bật & form đăng ký tư vấn. |
| Danh sách & Chi tiết Khóa học | `/courses`, `/courses/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Tự động ẩn các khóa học `draft`/`archived` và ẩn các section chưa có dữ liệu. |
| Lịch khai giảng theo Cơ sở & Tháng | `/schedule` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Đã đồng bộ nguồn dữ liệu `courses` và `branches` dùng chung. |
| Câu chuyện Học viên điểm cao | `/hoc-vien`, `/hoc-vien/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hỗ trợ tìm kiếm, lọc điểm mục tiêu và phân trang. |
| Tài liệu Listening & Reading công khai | `/tai-lieu/listening-reading`, `/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Render nội dung qua `ArticleContentRenderer` an toàn, không dùng `dangerouslySetInnerHTML`. |
| Review Đề thi TOEIC | `/tai-lieu/review-de-thi`, `/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hiển thị bài viết review đề thi và tài liệu đính kèm. |
| Hệ thống Cơ sở & Bản đồ | `/about/branches` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hiển thị danh sách cơ sở Offline/Online và bản đồ tương tác. |
| Tin tức & Sự kiện | `/about/news`, `/about/news/:id` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Đã chuẩn hóa font đọc `Be Vietnam Pro` dễ nhìn. |
| Tuyển dụng | `/about/careers`, `/about/careers/:id` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hiển thị vị trí tuyển dụng, mức lương, hạn nộp và nút ứng tuyển. |
| Form Đăng ký Tư vấn Lộ trình | Footer / `/contact` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Kiểm tra SĐT Việt Nam, URL Facebook, chống double-submit, gọi `POST /public/consultations`. |

---

## 2. Khu vực B: Hệ thống Tài khoản & Student Portal (`Cổng học viên`)

| Chức năng | Route | Trạng thái | Mức hoàn thiện | Ghi chú & Việc cần làm khi có Backend |
|---|---|---|---|---|
| Đăng nhập Học viên | `/login` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hỗ trợ Username/Email, ẩn/hiện mật khẩu, Ghi nhớ đăng nhập. |
| Đăng ký Tài khoản Học viên | `/register` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Cố định vai trò `student`, không tự động xếp lớp khi mới tạo tài khoản. |
| Quên mật khẩu & Đặt lại mật khẩu | `/forgot-password`, `/reset-password` | Bị chặn bởi Backend | 95% | UI & Validation hoàn chỉnh; cần Backend gửi email chứa Reset Token thật. |
| Đổi mật khẩu | `/change-password` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Bảo vệ route, kiểm tra độ mạnh mật khẩu mới, không lưu mật khẩu dạng rõ. |
| Đăng xuất & Xóa Cache phiên | Header Dropdown | Hoàn thành (Mock-Backed & API-Ready) | 100% | Có Modal xác nhận riêng, tự động gọi `queryClient.clear()` để xóa sạch cache cá nhân. |
| Trang chủ Cổng học viên (Dashboard) | `/student/dashboard` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hiển thị thông tin lớp, ribbon tiến độ 24 buổi, 4 thẻ KPI, BTVN cần nộp & lịch tuần này. |
| Tài liệu & Kế hoạch học tập | `/student/learning-plan` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Lọc theo tuần, tìm kiếm, chuyển chế độ Danh sách/Bảng tổng hợp, hỗ trợ In kế hoạch (`@media print`). |
| Nộp BTVN & Điền điểm Demo Test | `/student/assignments` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Validate chặt link Google Drive/Docs, giới hạn câu đúng LC/RC và điểm Demo Test 0–495, cập nhật Badge tức thì. |
| Lịch sử Điểm danh | `/student/assignments?tab=attendance` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Chỉ hiển thị (Read-only), học viên không thể tự sửa trạng thái điểm danh. |
| Kết quả thi Mid & Final | `/student/exam-results` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Phân tích chi tiết từng Part Listening/Reading và biểu đồ tiến bộ điểm tổng trên thang 990. |
| Gửi Yêu cầu Hỗ trợ sau khóa học | `/student/exam-results` (Modal) | Hoàn thành (Mock-Backed & API-Ready) | 100% | 4 loại yêu cầu (*Học lại*, *Bảo lưu*, *Bảo lưu quay lại học*, *Chuyển lớp*), ghi nhận trạng thái `Chờ tiếp nhận`. |
| Thời khóa biểu Lớp học | `/student/schedule` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Lịch 7 ngày theo tuần hoặc toàn khóa, hiển thị cả buổi học, kỳ thi và hạn nộp BTVN 23:00. |
| Trạng thái Học viên chưa xếp lớp | `/student/*` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hiển thị `NoEnrollmentCard` hướng dẫn đăng ký khóa học hoặc tự luyện tại Study Zone. |

---

## 3. Khu vực C: Study Zone & Test Online

| Chức năng | Route | Trạng thái | Mức hoàn thiện | Ghi chú & Việc cần làm khi có Backend |
|---|---|---|---|---|
| Danh mục & Chi tiết bài học Study Zone | `/study-zone/:category`, `/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | 3 phân mục (`Grammar`, `Vocabulary`, `Listening`) kèm lý thuyết, bảng từ vựng và danh sách bài tập. |
| Phòng luyện tập Study Zone toàn màn hình | `/study-zone/practice/:exerciseId` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Độc lập không Header/Footer, chuyển từng câu 1, có xác nhận thoát 1 chạm và xác nhận nộp bài. |
| Danh sách & Cấu hình Đề thi TOEIC | `/test-online`, `/test-online/:slug` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hỗ trợ thi Full Test 200 câu (120 phút) hoặc chọn từng Part và thời lượng tùy chỉnh. |
| Phòng thi TOEIC trực tuyến | `/test-online/attempt/:attemptId` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Có màn hình giới thiệu từng Part (tạm dừng đồng hồ), Audio Listening phát 1 lần, khóa Reading khi chưa xong Listening, tự động nộp khi hết giờ. |
| Kết quả & Giải thích chi tiết sau thi | `/test-online/result/:attemptId` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Hỗ trợ 2 kiểu xem: *Theo câu* và *Danh sách*, hiển thị transcript, bản dịch và giải thích từng câu. |
| Lịch sử làm bài theo tài khoản | `/test-history`, `/student/history` | Hoàn thành (Mock-Backed & API-Ready) | 100% | Đã cô lập dữ liệu theo `studentId`, hỗ trợ xem tổng quan theo đề thi hoặc xem từng lượt làm bài. |
| Quản trị Đề thi / Chấm điểm Giáo vụ | Management Portal | Không thuộc phạm vi hiện tại | — | Sẽ được xây dựng trong dự án Admin / Management Portal riêng. |
