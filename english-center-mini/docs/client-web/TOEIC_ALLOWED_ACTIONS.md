# BÁO CÁO KIỂM SOÁT HÀNH ĐỘNG CỦA HỌC VIÊN (TOEIC ALLOWED & FORBIDDEN ACTIONS AUDIT)

- **Dự án**: ENGLISH CENTER – Client Web Frontend
- **Phân hệ kiểm tra**: Quyền thao tác, ràng buộc phòng thi và phân quyền dữ liệu học viên (`src/features/test-online`)
- **Ngày kiểm định**: 24/11/2026

> **Nguyên tắc đánh giá**: Phân tách rõ khả năng kiểm soát tại **Frontend hiện tại (Mock Mode)** và những cơ chế bắt buộc phải thực thi tại **Backend Node.js** khi tích hợp thực tế. Không coi việc ẩn nút giao diện là bảo mật hoàn chỉnh.

---

## 1. Kiểm tra nhóm hành động HỌC VIÊN ĐƯỢC PHÉP (Mục 4.1)

| STT | Hành động được phép | Trạng thái | Kiểm chứng thực tế trong mã nguồn |
|---|---|---|---|
| 1 | Xem các đề thi đã được công khai (`published`) | **PASS** | `testApi.getTests()` và `testApi.getTestBySlug()` chỉ trả về đề có `status === 'published'`. |
| 2 | Bắt đầu bài thi theo điều kiện thiết lập (Full Test hoặc chọn Part) | **PASS** | `TestDetailPage.tsx` tạo `TestAttempt` mới với `selectedParts` và `selectedDuration`, chặn bấm bắt đầu nếu bỏ tích hết toàn bộ các Part (`canStart = selectedParts.length > 0`). |
| 3 | Nghe nội dung Listening theo quy định phát audio | **FAIL** | Hiện tại audio trong phòng thi (`mode === 'exam'`) đang bị tắt hoàn toàn (`TestAudioPlayer` trả về `null`), khiến học viên không nghe được bài nghe khi thi. |
| 4 | Chọn 1 phương án trả lời cho từng câu hỏi | **PASS** | `handleSelectAnswer` lưu cặp `questionId -> optionId` duy nhất trong `attempt.answers`. |
| 5 | Thay đổi đáp án trong thời gian làm bài hợp lệ | **PASS** | Học viên đổi sang phương án khác trước khi nộp sẽ ghi đè `attempt.answers[questionId]`. |
| 6 | Chuyển qua lại giữa các câu hỏi thuộc phần Reading | **PASS** | Hỗ trợ qua nút `CÂU TRƯỚC` / `CÂU TIẾP`, thanh `P5–P7` và ngăn `QuestionNavigator`. |
| 7 | Xem trạng thái câu đã trả lời, chưa trả lời và đánh dấu | **PASS** | Hiển thị qua huy hiệu `answeredCount/totalQuestions` và màu sắc + chấm đánh dấu trên `QuestionNavigator`. |
| 8 | Xem thời gian còn lại theo thời gian thực | **PASS** | `TestTimer` đếm ngược chính xác từ `deadlineAt`, đổi sang vàng khi còn ≤ 5 phút và nhấp nháy đỏ khi còn ≤ 1 phút. |
| 9 | Chủ động nộp bài khi hoàn thành | **PASS** | Nút `NỘP BÀI` mở hộp thoại xác nhận `TestSubmitModal` và thực thi `submitAttempt`. |
| 10 | Nhận kết quả chấm điểm ngay sau khi nộp | **PASS** | Điều hướng sang `/test-online/result/:attemptId` hiển thị kết quả và giải thích. |
| 11 | Xem lại lịch sử các lần thi đã lưu | **PASS** | Trang `/test-history` nhóm theo bài thi, hỗ trợ lọc theo đề/trạng thái/ngày và xem từng lần thi riêng biệt (`/test-history/:attemptId`). |

---

## 2. Kiểm tra nhóm hành động HỌC VIÊN KHÔNG ĐƯỢC PHÉP (Mục 4.2)

### 2.1. Nhóm hành động liên quan đến Audio

| Hành động bị cấm | Trạng thái | Mức độ rủi ro | Đánh giá cơ chế ngăn chặn hiện tại |
|---|---|---|---|
| Phát lại audio Listening đã hoàn thành | **PARTIAL** | **P1** | Trong lúc thi không có nút phát lại vì UI audio bị ẩn; tuy nhiên cần kích hoạt lại chế độ phát ngầm 1 lần gắn với `audioStates[audioGroupId] = 'LOCKED'`. |
| Tua ngược / tua tiến audio trong khi thi | **PASS** | — | Không render thanh kéo tua audio trong chế độ `exam`. |
| Tự ý thay đổi tốc độ phát trong khi thi | **PASS** | — | Menu đổi tốc độ (`0.75x..1.5x`) chỉ tồn tại ở `AudioPlayer` của Study Zone và chế độ `review` sau khi nộp bài. |
| Tải file audio đề thi xuống nếu không có quyền | **PARTIAL** | **P2** | Không có nút Download trên giao diện, nhưng ở chế độ `review` trình duyệt vẫn có thể đọc `src` trong DOM. Khi lên Production cần dùng Signed URL ngắn hạn / HLS stream từ Backend. |
| Làm mất giới hạn phát 1 lần bằng F5 tải lại trang hoặc mở nhiều tab | **PARTIAL** | **P1** | `audioStates` được lưu vào `localStorage` để giữ trạng thái qua F5, nhưng hiện đang bị gán cứng `'LOCKED'` ngay khi khởi tạo và người dùng có kinh nghiệm vẫn có thể xóa `localStorage` nếu chưa có Backend xác thực trạng thái phiên thi. |

### 2.2. Nhóm hành động liên quan đến Quy trình thi

| Hành động bị cấm | Trạng thái | Mức độ rủi ro | Đánh giá cơ chế ngăn chặn hiện tại |
|---|---|---|---|
| **Vào thẳng Reading khi chưa hoàn thành Listening** (trong đề có cả Listening & Reading) | **FAIL** | **P1** | `attemptService.createNewAttempt` đang đặt `listeningCompleted: true` ngay từ đầu và `TestTakingPage.tsx` / `QuestionNavigator.tsx` đã bỏ khóa Reading. Học viên có thể bấm nhảy thẳng sang Part 5–7 ngay giây đầu tiên. |
| **Quay lại Listening sau khi đã chuyển sang Reading** | **FAIL** | **P1** | Không có khóa một chiều (`currentSection = 'reading'`) ngăn học viên bấm `P1..P4` hoặc bấm câu 1–100 trong `QuestionNavigator` để quay lại sửa đáp án phần Nghe. |
| Tự ý thay đổi / kéo dài thời gian làm bài | **PARTIAL** | **P1** | Giao diện phòng thi không cho chỉnh giờ, và F5 không reset giờ vì tính theo `deadlineAt`. Tuy nhiên ở Mock Mode, `deadlineAt` nằm trong `localStorage` và tính theo đồng hồ máy khách (`Date.now()`); cần dùng Server Timestamp khi có Backend. |
| Tự ý chuyển trạng thái bài thi từ chưa bắt đầu thành hoàn thành | **PASS (UI)** | **P2** | Phải qua `startAttempt` rồi `submitAttempt`; không có đường dẫn UI tạo kết quả giả mà không có `attempt`. |
| Gửi bài thi nhiều lần tạo nhiều kết quả trùng lặp | **PASS** | — | Khóa bằng state `submitting` + kiểm tra bất biến trong `finalizeAttempt` (`attempt.status !== 'in_progress'`). |
| Tiếp tục thay đổi đáp án sau khi bài thi đã nộp | **PASS** | — | `saveAttemptProgress` từ chối cập nhật khi `current.status !== 'in_progress'`; mở lại URL `/test-online/attempt/:id` tự động chuyển hướng sang `/test-online/result/:id`. |
| Truy cập đề thi nháp (`draft`) hoặc lưu trữ (`hidden`) để thi mới | **PARTIAL** | **P2** | `getTestBySlug` chặn đề không phải `published` trên giao diện, nhưng `attemptApi.startAttempt` (nhánh mock) chưa kiểm tra lại `test.status === 'published'`. |

### 2.3. Nhóm hành động liên quan đến Đáp án & Điểm số

| Hành động bị cấm | Trạng thái | Mức độ rủi ro | Đánh giá cơ chế ngăn chặn hiện tại |
|---|---|---|---|
| Xem đáp án đúng hoặc lời giải trên UI trước khi nộp bài | **PASS** | — | `TestQuestionRenderer` ở `mode="exam"` không nhận `reviewsMap` và kiểu `TestQuestion` hoàn toàn không chứa trường `correctOptionId` hay `explanation`. |
| Truy cập Answer Key qua mã nguồn Frontend / DevTools | **PARTIAL (Mock)** | **P0 (khi lên Prod)** | Đã tách riêng biến `serverTestAnswerKeys` để mô phỏng tầng Server (`scoringService.ts`). Tuy nhiên vì chưa có Backend nên file mock vẫn được đóng gói vào bundle JS phía client. **Bắt buộc chuyển toàn bộ `serverTestAnswerKeys` và logic chấm điểm sang Backend Node.js khi triển khai thật.** |
| Tự sửa điểm số / số câu đúng sai trong kết quả | **PARTIAL (Mock)** | **P1 (khi lên Prod)** | Giao diện chỉ đọc (`read-only`), nhưng bản ghi kết quả mẫu đang lưu ở `localStorage` (`ec_toeic_test_results_v2`). Khi kết nối Backend, kết quả phải được đọc trực tiếp từ Database. |

### 2.4. Nhóm hành động liên quan đến Tài khoản & Dữ liệu riêng tư

| Hành động bị cấm | Trạng thái | Mức độ rủi ro | Đánh giá cơ chế ngăn chặn hiện tại |
|---|---|---|---|
| Tiếp tục thấy dữ liệu tài khoản trước sau khi Đăng xuất | **PASS** | — | Khi đăng xuất, `UserAccountDropdown` gọi `queryClient.clear()` và `useTestHistory` phân tách cache theo `studentScope = user?.id ?? 'guest'`. |
| Học viên B xem danh sách lịch sử của Học viên A trên trang `/test-history` | **PASS (Đã đăng nhập)** | **P2 (Guest)** | Khi đăng nhập tài khoản khác nhau, `historyApi.getHistory` lọc theo `ownerId === currentUserId`. Tuy nhiên khi chưa đăng nhập (`guest`), hệ thống đang cho phép xem dữ liệu mẫu của `stu-001` (`ownerId === 'guest' \|\| ownerId === 'stu-001'`). |
| **Truy cập bài làm / kết quả của người khác bằng cách sửa `attemptId` trên URL (IDOR)** | **FAIL** | **P0** | `attemptApi.getAttemptById(attemptId)`, `attemptApi.getAttemptResult(attemptId)` và `historyApi.getHistoryDetail(attemptId)` **chưa kiểm tra quyền sở hữu `attempt.studentId`**. Nếu biết `attemptId` trên cùng trình duyệt, tài khoản khác có thể mở trực tiếp `/test-history/:attemptId` hoặc `/test-online/result/:attemptId`. |
