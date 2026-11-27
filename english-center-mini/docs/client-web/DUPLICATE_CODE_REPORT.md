# BÁO CÁO PHÂN TÍCH MÃ TRÙNG LẶP & RANH GIỚI MODULE (DUPLICATE CODE REPORT)

Tài liệu này rà soát tất cả các thành phần có tên gọi hoặc chức năng tương đồng trong codebase **English Center**, phân loại rõ trường hợp nào là **trùng lặp dư thừa cần hợp nhất/xóa bỏ** và trường hợp nào là **tách biệt có chủ đích theo ranh giới miền nghiệp vụ (Bounded Context)**.

---

## 1. CÁC TRÙNG LẶP DƯ THỪA ĐÃ ĐƯỢC HỢP NHẤT HOẶC LOẠI BỎ

| Hạng mục trùng lặp | Các file / Đường dẫn liên quan | Vấn đề trước khi xử lý | Hành động đã thực hiện |
| --- | --- | --- | --- |
| **Route Lịch sử bài làm bị nhân đôi** | `/test-history` vs `/student/history` (`src/app/router.tsx`, `UserAccountDropdown.tsx`) | Hai URL khác nhau cùng render `TestHistoryPage` và `TestHistoryDetailPage`, làm phân tán lịch sử điều hướng và breadcrumb. | Chọn `/test-history` & `/test-history/:attemptId` làm Canonical Route duy nhất; chuyển `/student/history*` thành `<Navigate replace />`. |
| **Component thông tin & chọn cấu hình đề thi thế hệ cũ** | `DurationSelector.tsx`, `PartSelector.tsx`, `TestInfo.tsx`, `TestSummary.tsx` vs giao diện tích hợp trong `TestDetailPage.tsx` & `TestResultSummary.tsx` | Bốn component cũ trùng chức năng với bảng chọn Part/thời gian mới trong `TestDetailPage.tsx` và bảng điểm `TestResultSummary.tsx`. | Đã xóa bỏ hoàn toàn 4 component cũ không còn sử dụng. |
| **Component thẻ chuyên đề Study Zone cũ** | `StudyTopicCard.tsx` vs `StudyTimelineAccordion.tsx` | `StudyTopicCard.tsx` là thiết kế dạng lưới cũ, đã được thay bằng timeline accordion phân tầng giống mẫu chuẩn. | Đã xóa bỏ `StudyTopicCard.tsx`. |
| **Định nghĩa hằng số thông tin liên hệ rời rạc** | `branches.ts`, `jobs.ts`, `studentPortalMockData.ts` vs `src/config/center-info.ts` | Hotline và tên cơ sở được gõ lặp lại thủ công dẫn tới lệch tên cơ sở (`Cầu Giấy` vs `Hà Đông`). | Đã hợp nhất tham chiếu về `centerInfo` và mảng chuẩn `branches` / `courses`. |

---

## 2. CÁC COMPONENT CÙNG TÊN NHƯNG KHÁC NGHIỆP VỤ (GIỮ NGUYÊN CÓ CHỦ ĐÍCH)

Trong hai module `src/features/study-zone/` và `src/features/test-online/`, có 3 cặp component mang tên tương tự nhưng phục vụ **quy tắc nghiệp vụ trái ngược nhau**. Theo nguyên tắc kiến trúc Feature-Sliced, việc giữ riêng từng cặp trong module của nó giúp tránh acoplamiento (coupling) phức tạp và ngăn lỗi hồi quy chéo:

| Cặp Component | Module `study-zone` (Tự luyện mở) | Module `test-online` (Phòng thi TOEIC nghiêm ngặt) | Lý do kiến trúc giữ tách biệt theo miền nghiệp vụ |
| --- | --- | --- | --- |
| **`AudioPlayer.tsx`** | Luôn hiển thị thanh điều khiển hình viên thuốc (`#F1F3F4`), cho phép Play/Pause, kéo thanh tua, chỉnh âm lượng và nghe lại vô hạn lần. | Trong phòng thi (`exam_strict_once`): Ẩn hoàn toàn giao diện (`<audio className="hidden" />`), phát tự động 1 lần duy nhất, chặn tua/nghe lại và kích hoạt `onEnded` để tự sang câu kế tiếp. Khi xem lại đáp án (`review`): Tái sử dụng trực tiếp `StudyZoneAudioPlayer` để học viên nghe lại! | Đã tái sử dụng `StudyZoneAudioPlayer` ở chế độ chữa bài (`TestQuestionRenderer.tsx` import từ `@/features/study-zone/components/AudioPlayer`), đồng thời giữ engine khóa âm thanh riêng cho phòng thi thật. |
| **`QuestionNavigator.tsx`** | Cho phép chuyển tự do giữa mọi câu hỏi bất kỳ lúc nào trong quá trình luyện tập. | Thực thi máy trạng thái khóa Part nghiêm ngặt của kỳ thi TOEIC: Khóa chuyển câu khi đang ở Part 1–4, khóa Reading khi chưa xong Listening, khóa vĩnh viễn Part 1–4 khi đã sang Part 5–7, và hiển thị phân nhóm theo `Part 1..7`. | Tránh nhồi nhét hàng loạt cờ khóa phòng thi vào bộ điều hướng đơn giản của kho tự luyện. |
| **`AnswerOption.tsx` & Modal Nộp bài (`SubmissionModal` vs `TestSubmitModal`)** | Chấm bài tập ngắn (5–15 câu) không có cờ `flagged` hay đếm ngược hết giờ tự động. | Hỗ trợ chế độ phòng thi 200 câu, hiển thị thống kê câu đã làm / câu bỏ trống / cảnh báo nộp sớm khi còn giờ thi. | Mỗi modal gắn chặt với kiểu dữ liệu `StudyExercise` hoặc `TestAttempt` riêng biệt, gọn nhẹ (~100 dòng) và dễ bảo trì. |
