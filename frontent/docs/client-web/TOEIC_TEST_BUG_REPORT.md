# BÁO CÁO LỖI & TÌNH HUỐNG KIỂM THỬ (TOEIC TEST BUG REPORT)

- **Dự án**: ENGLISH CENTER – Client Web Frontend
- **Phân hệ kiểm tra**: `src/features/test-online`
- **Ngày kiểm định**: 24/11/2026

---

## 1. Kết quả kiểm tra 15 tình huống chuẩn (Phần 8)

| STT | Tình huống kiểm thử | Kết quả mong muốn | Trạng thái | Ghi chú đối chiếu mã nguồn |
|---|---|---|---|---|
| 1 | Học viên bắt đầu bài thi | Timer bắt đầu đúng thời điểm (không trừ giờ ở trang giới thiệu đề & giới thiệu Part) | **PASS** | `TestDetailPage` chưa tạo timer; `PartIntroduction` dùng `timerPausedAt`, chỉ trừ giờ khi bấm `BẮT ĐẦU` vào câu hỏi (`confirmPartIntroduction`). |
| 2 | Học viên chưa chọn đáp án | Câu hỏi xác định là chưa trả lời (`unanswered`) | **PASS** | `scoringService.ts` (dòng 83–86) phân loại chính xác `isAnswered = false` -> tăng `unansweredCount`, không nhầm thành câu sai. |
| 3 | Học viên chọn đáp án | Đáp án lưu đúng câu, không nhảy cuộn trang ở nhóm nhiều câu | **PASS** | `handleSelectAnswer` lưu `answers[questionId] = optionId`; hiệu ứng cuộn trang chỉ chạy theo `currentStepIndex`. |
| 4 | Audio đã phát xong | Không thể phát lại trái quy định trong lúc thi | **FAIL** | Hiện tại audio trong lúc thi (`mode === 'exam'`) đang bị tắt hẳn cả phát tiếng lẫn UI (`TestAudioPlayer` trả về `null`), chưa chạy luồng phát ngầm 1 lần. |
| 5 | Học viên tải lại trang (F5) | Trạng thái bài thi, đáp án và thời gian còn lại không bị đặt lại | **PASS (Mock)** | Khôi phục từ `ec_toeic_test_attempts_v2` và tính giờ còn lại từ mốc tuyệt đối `deadlineAt`. *(Cần Backend lưu phiên để chống xóa `localStorage`).* |
| 6 | Học viên mở nhiều tab | Không tạo nhiều phiên thi trái phép / không ghi đè mất đáp án | **PARTIAL** | Mở lại trang đề sẽ hiện modal `Tiếp tục làm bài` thay vì tạo phiên mới. Tuy nhiên nếu nhân đôi tab phòng thi `/attempt/:id`, 2 tab chưa đồng bộ `storage` event nên tab cũ có thể ghi đè đáp án tab mới. |
| 7 | Học viên hết thời gian (`00:00:00`) | Hệ thống tự động khóa và nộp bài (`expired`) | **PASS** | `useTestTimer` kích hoạt `handleAutoExpire` đúng 1 lần và chuyển sang trang kết quả. |
| 8 | Học viên bấm nộp bài liên tục | Không tạo nhiều kết quả trùng lặp | **PASS** | Khóa nút bằng `submitting = true` và chặn ghi đè trong `finalizeAttempt`. |
| 9 | Học viên đã nộp bài | Không thể quay lại sửa đáp án | **PASS** | `saveAttemptProgress` từ chối cập nhật khi `status !== 'in_progress'`; truy cập lại URL phòng thi tự động redirect sang trang kết quả. |
| 10 | Học viên đăng xuất | Xóa dữ liệu riêng tư khỏi trạng thái giao diện | **PASS** | `logout()` xóa phiên đăng nhập và `queryClient.clear()` làm sạch cache bộ nhớ. |
| 11 | Học viên khác đăng nhập | Không nhìn thấy danh sách lịch sử người trước | **PARTIAL** | Danh sách `/test-history` lọc đúng theo `currentUserId`, nhưng truy cập trực tiếp bằng URL `/test-history/:attemptId` chưa kiểm tra `studentId` (xem BUG-02). |
| 12 | Đề thi chuyển sang lưu trữ (`hidden`/`draft`) | Không xuất hiện trong danh sách thi mới | **PARTIAL** | Ẩn hoàn toàn khỏi `TestListPage` và `TestDetailPage`, nhưng `attemptApi.startAttempt` (mock) chưa chặn nếu gọi trực tiếp bằng `testId`. |
| 13 | Admin cập nhật đề | Không làm sai lệch lịch sử lượt thi cũ | **FAIL / MISSING** | Chưa có `TestVersion` snapshot; trang xem lại đọc trực tiếp từ `mockTests` hiện hành. |
| 14 | Audio bị lỗi tải file | Có thông báo phù hợp, không âm thầm khóa lượt nghe | **FAIL** | Trong phiên bản mới nhất của `src/features/test-online/components/AudioPlayer.tsx`, nhánh xử lý `onError` và thông báo lỗi audio phòng thi đã bị lược bỏ khi ẩn trình phát. |
| 15 | Ảnh không tải được | Có trạng thái lỗi hiển thị rõ ràng | **PASS** | `ImageViewer.tsx` bắt sự kiện `onError` và hiển thị khung fallback có biểu tượng ảnh + mô tả `alt`. |

---

## 2. Danh sách chi tiết các lỗi phát hiện (Phân loại P0 – P3)

### [BUG-01] Tắt hoàn toàn âm thanh trong phòng thi làm mất khả năng nghe đề Listening & mất khóa chuyển phần Listening → Reading
- **Mức độ nghiêm trọng**: **P1 – High** *(Nâng lên **P0** nếu áp dụng cho kỳ thi đánh giá thật)*
- **Vị trí mã nguồn**:
  - `src/features/test-online/components/AudioPlayer.tsx` (dòng 25–27)
  - `src/features/test-online/components/TestQuestionRenderer.tsx` (dòng 81–87)
  - `src/features/test-online/services/attemptService.ts` (dòng 72, 294: `listeningCompleted: true`)
  - `src/features/test-online/pages/TestTakingPage.tsx` & `QuestionNavigator.tsx`
- **Mô tả & Cách tái hiện**:
  1. Mở một đề bất kỳ (`/test-online/toeic-test-01-2026`) -> nhấn `BẮT ĐẦU` -> nhấn `BẮT ĐẦU` vào Part 1.
  2. Giao diện ẩn thanh điều khiển âm thanh theo yêu cầu UI, nhưng do component trả về `null` trước khi render thẻ `<audio>`, âm thanh câu hỏi Part 1–4 cũng không phát ngầm.
  3. Đồng thời vì `listeningCompleted` được gán `true` từ đầu để tránh kẹt điều hướng khi tắt audio, học viên có thể bấm `P5`–`P7` làm Reading trước hoặc từ Reading quay ngược lại Part 1–4 sửa đáp án.
- **Hướng khắc phục đề xuất**:
  - Tách bạch giữa **ẩn thanh điều khiển UI** (không cho nhìn thanh tua / nút pause) và **engine phát âm thanh ngầm 1 lần** (`<audio className="hidden" />`) kèm xử lý `onError` / nút kích hoạt phát nếu trình duyệt chặn autoplay sau khi F5, đồng thời bật lại khóa một chiều `Listening -> Reading` khi đề có file audio thật.

---

### [BUG-02] Thiếu kiểm tra quyền sở hữu (`studentId`) khi mở trực tiếp URL phòng thi, kết quả hoặc chi tiết lịch sử (IDOR phía Client Mock)
- **Mức độ nghiêm trọng**: **P0 – Critical**
- **Vị trí mã nguồn**:
  - `src/features/test-online/api/attemptApi.ts` (`getAttemptById` dòng 73, `getAttemptResult` dòng 220)
  - `src/features/test-online/api/historyApi.ts` (`getHistoryDetail` dòng 106)
- **Mô tả & Cách tái hiện**:
  1. Tài khoản A (`stu-001`) có lượt thi `ATT-20261120-202`.
  2. Đăng xuất tài khoản A, đăng nhập tài khoản B (`stu-002`) trên cùng trình duyệt.
  3. Vào `/test-history` sẽ không thấy bài của A, nhưng nếu gõ trực tiếp `/test-history/ATT-20261120-202` hoặc `/test-online/result/ATT-20261120-202` lên thanh địa chỉ, hệ thống vẫn hiển thị đầy đủ bài làm của A.
- **Hướng khắc phục đề xuất**:
  - Kiểm tra `attempt.studentId === currentUser?.id` trong `getAttemptById`, `getAttemptResult` và `getHistoryDetail` (trả về `null` / lỗi `403 Forbidden` nếu không khớp), và bắt buộc xác thực JWT + ownership tại Backend khi triển khai thật.

---

### [BUG-03] Chế độ chọn từng Part chưa tôn trọng cờ cấu hình `allowPartSelection` và `allowStandaloneSelection`
- **Mức độ nghiêm trọng**: **P2 – Medium**
- **Vị trí mã nguồn**: `src/features/test-online/pages/TestDetailPage.tsx` (dòng 72–89, 291–301)
- **Mô tả & Cách tái hiện**:
  1. Mở đề `TEST 2 – 2025` (`/test-online/toeic-test-02-2025`), trong đó `generalInstructions` ghi rõ Part 3 và Part 4 khóa chọn lẻ (`allowStandaloneSelection: false`).
  2. Tích vào ô `Chọn từng part`, người dùng vẫn có thể bỏ chọn hoặc chọn lẻ Part 3, Part 4 bình thường.
- **Hướng khắc phục đề xuất**:
  - Chỉ hiển thị checkbox `Chọn từng part` khi `test.allowPartSelection === true`, và vô hiệu hóa thao tác bật/tắt riêng lẻ trên các dòng có `part.allowStandaloneSelection === false`.

---

### [BUG-04] Thiếu hiển thị điểm thành phần Listening `/495`, Reading `/495`, số câu sai và số câu bỏ trống trên trang Kết quả vừa nộp
- **Mức độ nghiêm trọng**: **P2 – Medium**
- **Vị trí mã nguồn**: `src/features/test-online/components/TestResultSummary.tsx` (dòng 63–109)
- **Mô tả & Cách tái hiện**:
  1. Nộp một bài Full Test và xem trang `TestResultPage` (`/test-online/result/:attemptId`).
  2. Mặc dù `scoringService.ts` đã tính sẵn `convertedListeningScore`, `convertedReadingScore`, `incorrectCount`, `unansweredCount`, nhưng `TestResultSummary.tsx` mới chỉ hiển thị tổng điểm `/990` và số câu đúng từng Part (trong khi xem chi tiết ở `TestHistoryPage` chế độ đơn đề thì có hiện `LC` và `RC`).
- **Hướng khắc phục đề xuất**:
  - Bổ sung dòng phụ nhỏ gọn dưới ô `ĐIỂM` trong `TestResultSummary.tsx` (ví dụ: `LC 450 • RC 430 | Đúng 16 • Sai 2 • Bỏ trống 0`) để đầy đủ thông tin chuẩn phiếu điểm TOEIC mà vẫn giữ nguyên bố cục 4 thẻ hiện tại.

---

### [BUG-05] Trùng lặp mã định danh câu hỏi (`question.id`) giữa các đề Mock từ TEST 5 đến TEST 10
- **Mức độ nghiêm trọng**: **P2 – Medium**
- **Vị trí mã nguồn**: `src/features/test-online/mocks/testMockData.ts` (dòng 1136, 1160, 1184, 1208, 1232, 1256, 1283, 1310)
- **Mô tả**:
  - `TEST 5` đến `TEST 10` gọi lại `buildStandardParts('t01'..'t06')` dẫn tới trùng `part.id`, `group.id` và `question.id` với `TEST 1`–`TEST 4` và `TEST 1–2 (2025)`.
- **Hướng khắc phục đề xuất**:
  - Cấp prefix riêng (`'t05'`..`'t12'`) cho từng đề và sinh bảng `serverTestAnswerKeys` tương ứng cho tất cả prefix.

---

### [BUG-06] Phân biệt trạng thái câu hỏi trong `QuestionNavigator` khi xem kết quả mới chỉ dựa vào màu sắc & đồng bộ đa tab
- **Mức độ nghiêm trọng**: **P3 – Low**
- **Vị trí mã nguồn**: `src/features/test-online/components/QuestionNavigator.tsx` (dòng 68–95)
- **Mô tả**:
  - Ở chế độ `review`, câu đúng (xanh lá), câu sai (đỏ) và câu bỏ trống (xám) chỉ khác nhau về màu nền, chưa có `title`/`aria-label` mô tả trạng thái hoặc ký hiệu phụ trợ cho người mù màu.
  - Ngoài ra khi mở 2 tab cùng 1 `attemptId`, sự kiện `window.addEventListener('storage', ...)` chưa được lắng nghe để đồng bộ đáp án tức thời giữa 2 tab.
