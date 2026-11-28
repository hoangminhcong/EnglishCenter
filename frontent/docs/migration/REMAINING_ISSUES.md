# CÁC HẠNG MỤC CÒN LẠI & PHỤ THUỘC BACKEND (`REMAINING_ISSUES`)

Tài liệu này ghi nhận trung thực các hạng mục chưa triển khai trong phạm vi nhiệm vụ tái cấu trúc Monorepo hiện tại vì thuộc giai đoạn phát triển **Backend NestJS** và **CRUD chi tiết của Staff Web** tiếp theo.

---

## 1. HẠNG MỤC THUỘC GIAI ĐOẠN XÂY DỰNG BACKEND (`apps/backend`)

1. **Khởi tạo ứng dụng NestJS & Cơ sở dữ liệu PostgreSQL:**
   - Hiện tại `apps/backend/` chỉ chứa `README.md` định hướng kiến trúc Modular Monolith và chưa tham gia npm Workspaces đúng theo yêu cầu thiết kế.
2. **Bảo mật Đáp án Đề thi TOEIC (`Answer Key`) & Đồng hồ Phòng thi trên Server:**
   - Trên `apps/client-web`, dữ liệu đáp án Mock (`serverTestAnswerKeys` / `serverAnswerKeys`) đã được tách khỏi kiểu dữ liệu câu hỏi hiển thị, nhưng khi chạy thuần Mock ở trình duyệt thì dữ liệu vẫn nằm trong async chunk phía client. Chỉ khi chuyển chấm điểm sang Backend NestJS (`VITE_USE_MOCK_API=false`), đáp án mới được ẩn tuyệt đối khỏi trình duyệt trong suốt thời gian làm bài.
3. **Xác thực JWT + `HttpOnly Cookie`, Gửi Email Đặt lại Mật khẩu & Rate Limiting:**
   - Các màn hình Quên mật khẩu (`/forgot-password`) và Đặt lại mật khẩu (`/reset-password`) đã hoàn chỉnh giao diện và kiểm tra đầu vào, cần Backend tích hợp dịch vụ gửi email chứa Reset Token thật.

---

## 2. HẠNG MỤC MỞ RỘNG NGHIỆP VỤ TRÊN `apps/staff-web` & `apps/client-web`

1. **Các màn hình CRUD nghiệp vụ chi tiết trên `apps/staff-web`:**
   - Giai đoạn hiện tại đã hoàn thành đầy đủ Login, RBAC 6 vai trò, `StaffLayout`, Sidebar lọc theo quyền, `AuthGuard`, `PermissionGuard`, `Dashboard` và trang `403`/`404`. Các màn hình quản trị chuyên sâu (Quản lý khóa học, Xếp lớp, Điểm danh giảng viên, Kế toán thu/hoàn học phí, Quản trị ngân hàng đề TOEIC) đang hiển thị qua `PlannedModulePage` có kiểm soát quyền và sẽ được xây dựng cuốn chiếu cùng từng module Backend.
2. **Đồng bộ dữ liệu thời gian thực giữa `staff-web` và `client-web`:**
   - Ở chế độ Mock hiện tại, dữ liệu mẫu của `staff-web` (`:5174`) và `client-web` (`:5173`) là độc lập, không đồng bộ giả qua trình duyệt; luồng đồng bộ xuyên ứng dụng sẽ hoạt động chính thức khi cả hai kết nối vào cùng Backend PostgreSQL.
3. **Phân hệ Thi TOEIC Speaking & Writing:**
   - Tab `Speaking & Writing` trên `/test-online` đang hiển thị thông báo phát triển rõ ràng, tách biệt hoàn toàn với cấu trúc 7 Part của `Listening & Reading`.
