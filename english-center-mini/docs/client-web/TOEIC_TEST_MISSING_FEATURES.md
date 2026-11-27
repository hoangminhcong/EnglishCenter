# BÁO CÁO CHỨC NĂNG CÒN THIẾU & LỘ TRÌNH HOÀN THIỆN (TOEIC TEST MISSING FEATURES)

- **Dự án**: ENGLISH CENTER – Client Web Frontend
- **Phân hệ kiểm tra**: `src/features/test-online` & Kiến trúc tích hợp hệ thống
- **Ngày kiểm định**: 24/11/2026

---

## 1. Nhóm chức năng còn thiếu phía Học viên (Student Test Online)

| STT | Chức năng còn thiếu | Trạng thái | Mức ưu tiên | Mô tả yêu cầu cần bổ sung |
|---|---|---|---|---|
| 1 | **Tách đồng hồ thời gian riêng cho Listening (45 phút) và Reading (75 phút)** | **MISSING** | **P1** | Khi thi Full Test chuẩn TOEIC, phần Listening cần giới hạn thời gian riêng (hoặc tự động chuyển theo băng nghe ~45 phút), phần Reading có 75 phút độc lập để học viên không lấy giờ Listening bù sang Reading hoặc ngược lại. |
| 2 | **Cấu hình chính sách xem đáp án sau khi nộp (`reviewPolicy`)** | **MISSING** | **P2** | Bổ sung thuộc tính trên `Test` (ví dụ: `'full_review' \| 'score_only' \| 'after_deadline'`) để hỗ trợ các kỳ thi thử tập trung hoặc kiểm tra xếp lớp không cho xem ngay đáp án và lời giải sau khi nộp. |
| 3 | **Giới hạn số lượt làm bài tối đa (`maxAttempts`) & Kiểm tra quyền truy cập đề nâng cao** | **MISSING** | **P2** | Bổ sung cấu hình `visibility: 'public' \| 'enrolled_only'` và `maxAttempts?: number` cho các đề thi nội bộ chỉ dành cho học viên lớp cam kết đầu ra. |
| 4 | **Bảng quy đổi điểm TOEIC chuẩn 101 mức (0–100 câu đúng)** | **PARTIAL** | **P1** | Thay thế bảng quy đổi rút gọn 9 mức tỷ lệ hiện tại bằng bảng ánh xạ chi tiết từ số câu đúng thực tế (`0..100` câu Listening -> `5..495` điểm; `0..100` câu Reading -> `5..495` điểm) theo từng bộ đề/phiên bản. |
| 5 | **Cơ chế hàng đợi nộp bài khi mất mạng tạm thời (Offline Submit Retry Queue)** | **PARTIAL** | **P2** | Hiện tại nếu nộp bài lỗi đã giữ nguyên dữ liệu và hiện thông báo thử lại trong `TestSubmitModal`; khi kết nối REST API thật cần thêm cơ chế tự động gửi lại kèm `idempotencyKey` khi có mạng trở lại. |
| 6 | **Loại bài thi TOEIC Speaking, TOEIC Writing & Speaking + Writing** | **MISSING** | **P3** | Hiện mới có tab giao diện `Speaking & Writing` hiển thị thông báo đang cập nhật. Để triển khai thực tế cần luồng ghi âm Microphone (`MediaRecorder`), đếm ngược thời gian chuẩn bị (`Preparation Time`) / thời gian nói (`Response Time`), trình soạn thảo đếm từ (Writing) và quy trình giáo viên chấm điểm bán tự động. |

---

## 2. Nhóm chức năng Quản trị đề thi (Admin / Management Portal – Phần 6)

> **Lưu ý phạm vi dự án**: Theo phạm vi hiện tại của dự án, **Management Portal (Admin)** và **Backend Node.js** chưa được xây dựng. Toàn bộ 16 hạng mục dưới đây được ghi nhận trung thực ở trạng thái **MISSING** để làm đặc tả kỹ thuật cho giai đoạn xây dựng Admin CMS & Backend tiếp theo.

| STT | Hạng mục Quản lý đề thi (Phần 6) | Trạng thái | Mức ưu tiên khi làm Admin | Yêu cầu kiến trúc bắt buộc |
|---|---|---|---|---|
| 1 | Quản lý thông tin chung, loại bài thi, thời gian & trạng thái (`draft` / `published` / `archived`) | **MISSING** | **P0** | Không cho phép xóa cứng đề đã có lượt thi; chỉ chuyển sang `archived`. |
| 2 | **Quản lý Phiên bản đề thi (`TestVersion`)** | **MISSING** | **P0** | Khi sửa nội dung đề đã xuất bản và đã có học viên thi, hệ thống phải sinh `version` mới (`v2`, `v3`...) để kết quả lịch sử của `v1` giữ nguyên tuyệt đối câu hỏi, đáp án và lời giải cũ. |
| 3 | Quản lý cấu trúc Part 1 – Part 7 & Nhóm câu hỏi (`QuestionGroup`) | **MISSING** | **P0** | Cho phép thêm/sửa/sắp xếp nhóm câu hỏi, cấu hình câu đơn (Part 1, 2, 5) và cụm câu dùng chung đoạn văn/audio (Part 3, 4, 6, 7). |
| 4 | Quản lý câu hỏi, phương án trả lời, đáp án đúng & lời giải + transcript song ngữ | **MISSING** | **P0** | Nhập liệu Rich Text / bảng biểu cho Part 6–7, đánh dấu đáp án đúng và biên tập transcript/dịch nghĩa. |
| 5 | Tải lên & gắn Media (Hình ảnh, Audio theo câu hoặc theo nhóm câu hỏi) | **MISSING** | **P0** | Upload lên Object Storage (S3/Cloudflare R2), tự động đọc `durationSeconds` của file MP3/AAC và liên kết với `audioGroupId`. |
| 6 | **Bộ kiểm định đề tự động trước khi xuất bản (Pre-Publish Validator)** | **MISSING** | **P1** | Chặn chuyển trạng thái sang `published` nếu: thiếu đáp án đúng, Part 1 thiếu ảnh, Part 1–4 thiếu audio, Part 6–7 thiếu đoạn văn, hoặc số thứ tự câu hỏi bị trùng/khuyết (không đủ 200 câu đối với Full Test). |
| 7 | Chế độ **Xem trước đề thi như học viên (Student Preview Mode)** | **MISSING** | **P2** | Cho phép Admin chạy thử giao diện `TestDetailPage` và `TestTakingPage` trên đề `draft` mà không ghi vào thống kê lượt thi thật. |

---

## 3. Các yêu cầu bắt buộc khi tích hợp Backend Node.js & Database (Phần 10)

1. **Tách tuyệt đối Answer Key khỏi API lấy đề thi**:
   - Endpoint `GET /tests/:slug` và `GET /test-attempts/:attemptId` chỉ trả về `TestQuestion` (không có `correctOptionId`, `explanation`, `transcript`).
   - Toàn bộ bảng `serverTestAnswerKeys` và hàm `gradeTestAttempt` phải chạy độc quyền trên Node.js Server khi gọi `POST /test-attempts/:attemptId/submit`.
2. **Quản lý thời gian & trạng thái Audio từ phía Server**:
   - `startedAt`, `deadlineAt`, `submittedAt` tính theo đồng hồ Server (chống chỉnh giờ máy tính cá nhân).
   - Khi một `audioGroupId` chuyển sang `PLAYING` / `LOCKED`, ghi nhận ngay xuống Database để F5, đổi trình duyệt hoặc đăng nhập máy khác cũng không thể phát lại.
3. **Phân quyền RBAC & Chống IDOR**:
   - Mọi API `/test-attempts/*` và `/test-history/*` kiểm tra `req.user.id === attempt.student_id` đối với vai trò `student`; vai trò `admin`/`teacher` được phân quyền qua middleware độc lập trên Backend.
