# CÁC HẠNG MỤC CÒN LẠI & PHỤ THUỘC TÍCH HỢP BACKEND (`STAFF_REMAINING_ISSUES`)

Tài liệu này ghi nhận trung thực các giới hạn tự nhiên của giai đoạn **Frontend + Mock Store** và danh mục công việc cần thực hiện khi triển khai **Backend Node.js (NestJS) + Database**.

---

## 1. HIỆN TRẠNG 5 PHÂN HỆ TRÊN `apps/staff-web`

Hiện tại cả **5 khu vực nghiệp vụ cốt lõi** trên `apps/staff-web` đã được triển khai hoàn chỉnh ở tầng Frontend + Session Mock Store liên thông:
1. **Admin Portal (`ADMIN`)**: Quản trị tài khoản, phân quyền RBAC, danh mục khóa học Website, chính sách học phí, giám sát đào tạo, CMS, học liệu/Study Zone/Test Online, cấu hình TOEIC và báo cáo tổng hợp.
2. **Sales CRM (`SALES`)**: Quản lý Lead theo phạm vi `own`, tư vấn bất biến, lịch hẹn Follow-up, tra cứu lớp mở toàn trung tâm và nộp hồ sơ đăng ký khóa học kèm Snapshot.
3. **Accounting Portal (`ACCOUNTANT`)**: Khoản phải thu theo `Enrollment`, thu học phí tiền mặt & chuyển khoản thủ công từng đợt, sổ cái bất biến (`Void`), phiếu thu in trình duyệt, hoàn tiền theo trần giao dịch gốc và báo cáo tài chính tách bạch.
4. **Academic Portal (`ACADEMIC` / `HR_ACADEMIC`)**: Quản lý học viên giữ nguyên lịch sử lớp cũ, điều phối lớp học dùng chung, xếp lớp theo tháng từ hồ sơ Sale đã duyệt (`Approved` → `Converted`), duyệt nguyện vọng dạy lớp của Giảng viên, đơn Bảo lưu / Chuyển lớp / Học lại và phiên bản nội dung khóa học (`Syllabus Versioning`).
5. **Teacher Portal (`TEACHER`)**: Cô lập nghiêm ngặt theo `assigned_classes_only` (chặn `403` lớp giảng viên khác), kế hoạch giảng dạy từng buổi, điểm danh 3 trạng thái có hộp thoại xác nhận, giao & chấm bài tập lớp, bảng điểm tách biệt (`null` vs `0`), tiến độ đa tiêu chí minh bạch và gửi nguyện vọng dạy lớp mới.

---

## 2. HẠNG MỤC PHỤ THUỘC BACKEND NODE.JS & OBJECT STORAGE

| Mã | Hạng mục | Hiện trạng trên `staff-web` / `client-web` | Giải pháp khi triển khai Backend |
| :--- | :--- | :--- | :--- |
| `REM-01` | **Đồng bộ dữ liệu thời gian thực giữa Staff Web (`:5174`) và Client Web (`:5173`)** | Hai ứng dụng chạy trên 2 origin khác nhau (`localhost:5174` và `localhost:5173`) nên `sessionStorage` cô lập theo chuẩn trình duyệt. Trong nội bộ `staff-web`, cả 5 phân hệ đã liên thông thời gian thực qua kho Mock chung. | Chuyển `VITE_STAFF_USE_MOCK_API=false` và kết nối cả 2 ứng dụng vào chung API `/api/v1/*` trên một cơ sở dữ liệu thống nhất. |
| `REM-02` | **Khóa giao dịch cạnh tranh (Concurrency Control) khi xếp lớp & thu tiền** | Mock Store kiểm tra sĩ số lớp và trần thu/hoàn tiền tuần tự trên trình duyệt hiện tại. | Backend bắt buộc dùng Database Transaction (`SELECT ... FOR UPDATE`) khi xếp lớp chỗ trống cuối cùng, cấp số phiếu thu `PT-YYYY-NNNN` và hạch toán thu/hoàn tiền. |
| `REM-03` | **Lưu trữ bền vững tệp Media (`Audio`, `Image`, `PDF/DOCX`)** | `MediaUploadBox` và link đính kèm bài tập dùng URL tạm trong phiên trình duyệt. | Tích hợp API Presigned Upload (`POST /api/v1/staff/media/presign`) đẩy tệp lên S3 / Cloudflare R2. |
| `REM-04` | **Bảo mật đáp án đề thi (`AnswerKey`) phía Client Web** | Trên `staff-web`, `answerKeys` đã tách rời khỏi payload đề thi; trên `client-web` (giữ nguyên không sửa), `scoringService` hiện vẫn chấm điểm Mock tại trình duyệt. | Chuyển chấm điểm sang Server (`POST /api/v1/tests/:id/attempts/:attemptId/submit`) và gỡ đáp án khỏi bundle `client-web`. |
| `REM-05` | **Xác thực phiên nhân sự chuẩn Production (`HttpOnly Cookie + RBAC Guard`)** | Mock Auth lưu phiên tại `sessionStorage` (`ec_staff_auth_session_v1`). | Backend cấp `HttpOnly, Secure, SameSite=Lax` cookie và kiểm tra bắt buộc cả `PermissionCode` lẫn `DataScope` (`own`, `assigned_classes_only`, `all`) tại mọi Controller/Service. |

---

## 3. HẠNG MỤC NGOÀI PHẠM VI (ĐÃ CHỦ ĐỘNG LOẠI TRỪ THEO ĐẶC TẢ)

1. **Kế toán**: Không xây dựng tính lương nhân sự/giảng viên, thuế TNCN, bảo hiểm, đối soát ngân hàng tự động qua API, hóa đơn điện tử hay nhắc nợ SMS/Email/Zalo tự động.
2. **Nhân sự chuyên sâu (`HR`)**: Chưa triển khai hồ sơ hợp đồng lao động, chấm công nội bộ hay quy trình phỏng vấn ứng viên chuyên sâu khi chưa có đặc tả riêng.
3. **Sales CRM**: Tính năng mời học viên lần đầu vào nhóm (`sales.group-invitations.create`) tiếp tục giữ trạng thái tạm dừng chờ đặc tả kênh gửi thực tế.
