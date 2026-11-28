# HẠNG MỤC TẠM DỪNG, GIỚI HẠN MOCK & PHỤ THUỘC BACKEND – SALES CRM (`SALES_REMAINING_ISSUES`)

Tài liệu này liệt kê rõ ràng những phần **đã hoàn thành**, những phần **tạm dừng theo quy định**, những điểm **đang chạy bằng Mock Store** và những yêu cầu bắt buộc khi xây dựng **Backend Node.js (NestJS)**.

---

## 1. HẠNG MỤC TẠM DỪNG CHỜ ĐẶC TẢ NGHIỆP VỤ

### Mục VI.5 – Mời học viên lần đầu vào nhóm (`sales.group-invitations.create`)
- **Trạng thái hiện tại:** **TẠM DỪNG (Chưa xây dựng UI & không giả lập gửi lời mời)** đúng theo yêu cầu gốc và phê duyệt tại Audit Giai đoạn 1.
- **Các câu hỏi nghiệp vụ cần chốt trước khi mở Giai đoạn 6 sau này:**
  1. "Nhóm" là nhóm lớp nội bộ trên hệ thống, nhóm Zalo hay nhóm Facebook và do Giáo vụ hay Admin khởi tạo?
  2. Điều kiện "học viên lần đầu" được xác định dựa trên việc khách chưa từng có `Enrollment` hay dựa trên hồ sơ `CourseRegistration` đầu tiên đạt `Approved`?
  3. Nhân viên Sale gửi đường dẫn thủ công bên ngoài rồi đánh dấu ghi nhận trên CRM hay tích hợp Webhook/API chính thức?
  4. Các trạng thái theo dõi lời mời cần lưu là gì (`Pending -> Invited -> Joined`?)?

---

## 2. GIỚI HẠN TỰ NHIÊN CỦA MÔI TRƯỜNG MOCK & YÊU CẦU TÍCH HỢP BACKEND

| Mã | Vấn đề / Giới hạn hiện tại | Hiện trạng trong dự án | Yêu cầu xử lý khi xây dựng Backend NestJS |
| :--- | :--- | :--- | :--- |
| `SALES-REM-01` | **Cô lập dữ liệu Mock giữa Client Web (`:5173`) và Staff Web (`:5174`)** | Hai ứng dụng chạy độc lập trên 2 cổng khác nhau; khi khách gửi form tư vấn trên `:5173`, bản ghi chưa tự xuất hiện trong Mock Store `ec_staff_mock_sales_crm_v1` của `:5174`. | Kết nối `POST /api/v1/public/consultations` (Client Web) và `GET /api/v1/staff/sales/leads` (Staff Web) vào cùng bảng `leads` trên PostgreSQL. |
| `SALES-REM-02` | **Ánh xạ `courseName` / `branchName` từ form tư vấn Website** | `ConsultationForm` và `ConsultationModal` trên Client Web hiện gửi chuỗi tên khóa/cơ sở thay vì `courseId` / `branchId` (không tự ý sửa Client Web trong nhiệm vụ này). | Khi nối Backend, cập nhật payload form tư vấn gửi kèm `courseId` & `branchId` (hoặc để Backend tra cứu theo `scheduleId` / `slug`). |
| `SALES-REM-03` | **Kiểm soát cạnh tranh chỗ trống cuối cùng của lớp (`Race Condition`)** | Ở chế độ Mock một trình duyệt, `evaluatePreRegistrationChecks()` kiểm tra `remainingSeats > 0` tại Frontend trước khi nộp hồ sơ. | Khi hai nhân viên Sale cùng nộp hồ sơ vào chỗ trống cuối cùng của một lớp, Backend bắt buộc kiểm tra lại sức chứa & trạng thái lớp trong Database Transaction (`SELECT ... FOR UPDATE`). |
| `SALES-REM-04` | **Kiểm tra quyền & phạm vi dữ liệu `own` trên Server** | Frontend đang ẩn/chặn `403` các Lead và Hồ sơ đăng ký không thuộc `assignedSaleId === currentUser.id` đối với `SALES`. | Mọi API `/api/v1/staff/sales/*` trên Backend bắt buộc gắn Guard lọc `WHERE assigned_sale_id = req.user.id` khi `scope === 'own'` (không tin cậy tham số từ client). |
| `SALES-REM-05` | **Chuyển tiếp `Approved -> Converted` tạo `Enrollment` chính thức** | Hồ sơ đăng ký sau khi được Giáo vụ/Admin duyệt dừng ở trạng thái `Approved`. | Khi xây dựng module Giáo vụ (`ACADEMIC`), bổ sung nghiệp vụ chuyển hồ sơ `Approved` thành `Enrollment` chính thức, tăng `enrolledStudents` của lớp và thông báo sang Kế toán tạo `Receivable`. |
