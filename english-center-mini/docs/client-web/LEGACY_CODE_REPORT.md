# BÁO CÁO MÃ NGUỒN CŨ, FILE MỒ CÔI & ĐƯỜNG DẪN CHUYỂN TIẾP (LEGACY CODE REPORT)

Tài liệu này ghi nhận chi tiết toàn bộ các file legacy không còn sử dụng đã được gỡ bỏ an toàn, các route chuyển tiếp tương thích ngược (Backward-Compatible Redirects) đang duy trì và cơ chế làm sạch khóa lưu trữ cũ.

---

## 1. DANH SÁCH 5 FILE LEGACY / ORPHAN ĐÃ XÓA KHỎI DỰ ÁN

Trước khi xóa, cả 5 file dưới đây đã được kiểm tra bằng công cụ quét đồ thị phụ thuộc (`audit.mjs`) và xác nhận **0 lượt import tĩnh hoặc động** trên toàn bộ `src/`:

1. **`src/features/study-zone/components/StudyTopicCard.tsx`**
   - *Nguồn gốc:* Thẻ hiển thị chủ đề dạng card lưới ở phiên bản đầu của Study Zone.
   - *Component thay thế hiện tại:* `src/features/study-zone/components/StudyTimelineAccordion.tsx` (hiển thị danh sách chuyên đề theo từng chặng có đóng/mở các bài Test 1..5).
2. **`src/features/test-online/components/DurationSelector.tsx`**
   - *Nguồn gốc:* Bộ chọn thời gian rời ở bản phác thảo đầu tiên của Test Online.
   - *Component thay thế hiện tại:* Khối chọn thời gian tích hợp trực tiếp trong `src/features/test-online/pages/TestDetailPage.tsx`.
3. **`src/features/test-online/components/PartSelector.tsx`**
   - *Nguồn gốc:* Bộ chọn Part dạng thẻ cũ.
   - *Component thay thế hiện tại:* Bảng cấu trúc `LISTENING (Part 1–4)` & `READING (Part 5–7)` tích hợp checkbox `"Chọn từng phần"` trong `src/features/test-online/pages/TestDetailPage.tsx`.
4. **`src/features/test-online/components/TestInfo.tsx`**
   - *Nguồn gốc:* Khối mô tả đề thi cũ mang tông màu xanh đậm cũ.
   - *Component thay thế hiện tại:* Khung thông tin đề thi chuẩn hóa trong `src/features/test-online/pages/TestDetailPage.tsx`.
5. **`src/features/test-online/components/TestSummary.tsx`**
   - *Nguồn gốc:* Bản tóm tắt kết quả sơ khai chưa có phân tách LC/RC 495 điểm.
   - *Component thay thế hiện tại:* `src/features/test-online/components/TestResultSummary.tsx`.

---

## 2. CÁC FILE BARREL (`index.ts`) ĐÃ ĐƯỢC KẾT NỐI LẠI VÀO HỆ THỐNG

Trước khi kiểm toán, 4 file barrel `index.ts` tại `courses`, `schedules`, `study-zone` và `test-online` bị bỏ quên do `router.tsx` import sâu vào đường dẫn con. Hiện tại:
- `src/app/router.tsx` đã chuyển sang lazy-import qua các barrel chính thức (`@/features/courses`, `@/features/schedules`, `@/features/study-zone`, `@/features/test-online`, `@/features/student-portal`).
- Toàn bộ 5 barrel module đều hoạt động đúng vai trò cổng xuất (Public API) của từng feature mà vẫn bảo toàn khả năng tách gói `React.lazy()` của Vite.

---

## 3. CÁC ROUTE TƯƠNG THÍCH NGƯỢC (`LEGACY REDIRECTS`) ĐANG DUY TRÌ AN TOÀN

Để tránh lỗi `404` nếu người dùng mở lại dấu trang (bookmark) cũ, `src/app/router.tsx` duy trì các lệnh `<Navigate replace />` gọn nhẹ sau:

| Đường dẫn cũ (Legacy URL) | Chuyển hướng tự động (`replace`) tới Canonical URL | Lý do duy trì |
| --- | --- | --- |
| `/documents/listening-reading` | `/learning-materials/listening-reading` | Đường dẫn tài liệu phiên bản cũ |
| `/documents/exam-overview` | `/learning-materials/exam-review` | Đường dẫn tổng hợp đề thi cũ |
| `/study-zone` | `/study-zone/grammar` | Mặc định mở tab Ngữ pháp đầu tiên |
| `/student/my-courses` | `/student` | Đồng bộ về trang Tổng quan khóa học của tôi |
| `/student/history` | `/test-history` | Hợp nhất trang Lịch sử làm bài |
| `/student/history/:attemptId` | `/test-history/:attemptId` | Hợp nhất chi tiết Lịch sử làm bài (`LegacyStudentHistoryDetailRedirect`) |

---

## 4. CƠ CHẾ VÔ HIỆU HÓA DỮ LIỆU LEGACY TRONG `localStorage`

| Phân hệ | Khóa cũ (Legacy Key) | Khóa chuẩn hiện tại (Active Key) | Tác dụng |
| --- | --- | --- | --- |
| Phiên đăng nhập | — | `ec_auth_session_user_v1` | Lưu thông tin `AuthUser` không chứa mật khẩu |
| Tài khoản đăng ký mới | — | `ec_auth_registered_users_v1` | Danh sách tài khoản đăng ký trên trình duyệt |
| Nộp bài tập Student Portal | `hmc_portal_submissions_v1_${studentId}` | `ec_portal_submissions_v2_${studentId}` | Bỏ tiền tố thương hiệu cũ, phân tách theo `studentId` |
| Yêu cầu hỗ trợ học vụ | `hmc_portal_support_requests_v1_${studentId}` | `ec_portal_support_requests_v2_${studentId}` | Bỏ tiền tố thương hiệu cũ, phân tách theo `studentId` |
| Khởi tạo dữ liệu mẫu Test Online | `ec_toeic_test_seeded_v1..v4` | `ec_toeic_test_seeded_v5` | Nạp lại lịch sử thi sạch theo `ownerId` (`stu-001`, `stu-002`) và mã câu hỏi `t01..t12` |
