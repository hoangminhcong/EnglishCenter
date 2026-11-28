# BÁO CÁO KIỂM ĐỊNH CẤU TRÚC ĐỀ THI TOEIC (TOEIC TEST STRUCTURE AUDIT)

- **Dự án**: ENGLISH CENTER – Client Web Frontend
- **Phân hệ kiểm tra**: `src/features/test-online`
- **Ngày kiểm định**: 24/11/2026
- **Vai trò thực hiện**: Senior QA Engineer, TOEIC Test System Analyst & Frontend Architect

---

## 1. Đánh giá phân loại bài thi TOEIC (Phần 1)

| Hạng mục kiểm tra | Trạng thái | Đối chiếu mã nguồn hiện tại | Nhận xét & Đánh giá |
|---|---|---|---|
| Phân biệt **TOEIC Listening & Reading** với kỹ năng khác | **PARTIAL** | `TestSkillCategory = 'listening_reading' \| 'speaking_writing'` (`test.types.ts`); `TestListPage.tsx` có 2 tab chuyển đổi | Đã tách tab và lọc danh sách theo `skillCategory`. Tuy nhiên mới gộp chung `'speaking_writing'`, chưa tách riêng 2 loại độc lập **TOEIC Speaking** và **TOEIC Writing**. |
| Cấu trúc đề và cách tính điểm riêng cho Speaking / Writing | **MISSING** | `Test`, `TestPart` (`1..7`), `scoringService.ts` | Toàn bộ schema câu hỏi trắc nghiệm và hàm `gradeTestAttempt` hiện tại chỉ phục vụ **Listening & Reading**. Chưa có schema thu âm (Speaking) hoặc tự luận/chấm rubric (Writing). |
| Thông tin nhận diện riêng cho từng đề thi | **PASS** | `Test` có `id`, `code` (`ETS-2026-T01`...), `title`, `slug`, `collectionGroup`, `difficulty`, `testType`, `status` | Mỗi đề có định danh duy nhất (`id`, `slug`, `code`). Lưu ý: dữ liệu mẫu của `TEST 5`–`TEST 10` đang tái sử dụng bộ câu hỏi demo `buildStandardParts('t01'..'t06')`. |
| Phân biệt **Full Test** và **Practice Test (từng Part)** | **PASS** | `TestPracticeMode = 'full' \| 'custom_parts'` (`TestDetailPage.tsx`, `scoringService.ts`) | Học viên có thể thi Full Test (7 Part, 120 phút) hoặc tích chọn từng Part kèm thời lượng tùy chỉnh (`availableDurationOptions`). Khi không làm đủ Part, hệ thống không quy đổi điểm `/990`. |
| Cấu hình thời gian, số câu và cấu trúc từng đề | **PASS** | `duration`, `availableDurationOptions`, `totalQuestions`, `standardTotalQuestions`, `allowPartSelection`, `allowStandaloneSelection` | Cho phép cấu hình linh hoạt thời gian mặc định (60 / 90 / 120 phút), danh sách mốc thời gian luyện tập (`15..120` phút) và số câu thực tế độc lập với mốc chuẩn 200 câu. |
| Lưu **Phiên bản đề thi (Test Version)** bảo toàn lịch sử | **MISSING** | `Test`, `TestAttempt`, `TestAttemptResult` (`test.types.ts`, `attemptService.ts`) | Chưa có thực thể `TestVersion` hoặc `testVersionId`. Lịch sử bài thi đang tham chiếu trực tiếp vào `mockTests` theo `testId`; nếu Admin sửa nội dung đề gốc, kết quả xem lại của lượt thi cũ sẽ bị lệch. |

---

## 2. Đối chiếu cấu trúc đề TOEIC Listening & Reading 200 câu (Phần 2)

> **Lưu ý về dữ liệu Mock hiện tại**: Kiến trúc dữ liệu (`TestPart` -> `QuestionGroup` -> `TestQuestion`) khai báo đầy đủ cả `standardToeicCount` (chuẩn 200 câu ETS: `6 + 25 + 39 + 30 + 30 + 16 + 54`) và `questionCount` thực tế trong từng đề mẫu (18 câu đại diện đầy đủ 7 Part để phục vụ kiểm thử nhanh trên Frontend).

### 2.1. Phần A – LISTENING (Chuẩn: 100 câu / ~45 phút / 4 Part)

| Part | Chuẩn ETS | Hiện trạng dữ liệu & UI | Trạng thái | Chi tiết kiểm tra kỹ thuật |
|---|---|---|---|---|
| **Part 1 – Photographs** | 6 câu, 1 ảnh/câu, 4 đáp án nghe A–D | `standardToeicCount: 6` (`questionCount: 2` mẫu), `stimulus` chứa `image` + `audio`, 4 phương án `A, B, C, D` | **PARTIAL** | **Hình ảnh**: Hiển thị rõ qua `ImageViewer` (`object-contain`, không méo tỷ lệ, có phóng to Lightbox và fallback khi lỗi ảnh).<br>**Phương án**: Đủ 4 đáp án A, B, C, D.<br>**Vấn đề**: Âm thanh đang bị tắt/ẩn hoàn toàn trong lúc làm bài (`mode === 'exam'`) do chỉnh sửa giao diện gần nhất (xem mục Lỗi P0/P1). |
| **Part 2 – Question-Response** | 25 câu, nghe câu hỏi + 3 phản hồi A–C | `standardToeicCount: 25` (`questionCount: 2` mẫu), 3 phương án `A, B, C` (`testMockData.ts` dòng 206–209) | **PARTIAL** | **Cấu trúc đáp án**: Chính xác chuẩn TOEIC Part 2 (chỉ có **3 lựa chọn A, B, C**, không hiển thị nội dung chữ của đáp án khi đang thi).<br>**Vấn đề**: Khi đang làm bài, `TestAudioPlayer` trả về `null` nên học viên không nghe được câu hỏi và 3 phương án. |
| **Part 3 – Conversations** | 39 câu (13 đoạn hội thoại × 3 câu), 4 đáp án A–D | `standardToeicCount: 39` (`questionCount: 3` mẫu: Câu 32–34), 1 `QuestionGroup` dùng chung `audioGroupId` cho 3 câu | **PARTIAL** | **Nhóm câu hỏi**: Hỗ trợ đúng 1 đoạn hội thoại liên kết 3 câu hỏi hiển thị cùng lúc, lưu đáp án tách biệt theo từng `question.id`, chọn đáp án câu dưới không bị nhảy cuộn trang.<br>**Bảng biểu đi kèm (Graphic questions)**: Kiến trúc `stimulus: TestContentBlock[]` hỗ trợ ghép thêm `image`/`text` vào nhóm câu hỏi.<br>**Vấn đề**: Audio trong lúc thi đang bị vô hiệu hóa. |
| **Part 4 – Talks** | 30 câu (10 bài nói × 3 câu), 4 đáp án A–D | `standardToeicCount: 30` (`questionCount: 3` mẫu: Câu 71–73), dùng chung `audioGroupId` + lịch trình `ANNUAL TECH SUMMIT` | **PARTIAL** | **Nhóm câu hỏi & Graphic**: Minh họa tốt dạng câu hỏi kết hợp bài nói với lịch trình/biểu đồ (`Look at the graphic...`), lưu đáp án độc lập từng câu.<br>**Vấn đề**: Audio trong lúc thi đang bị vô hiệu hóa. |
| **Thời lượng riêng cho Listening** | ~45 phút cố định theo băng nghe | Dùng chung 1 đồng hồ tổng `selectedDuration` (120 phút) cho cả bài | **PARTIAL** | Chưa tách bộ đếm thời gian riêng cho phần Listening và phần Reading (75 phút). |

### 2.2. Phần B – READING (Chuẩn: 100 câu / 75 phút / 3 Part)

| Part | Chuẩn ETS | Hiện trạng dữ liệu & UI | Trạng thái | Chi tiết kiểm tra kỹ thuật |
|---|---|---|---|---|
| **Part 5 – Incomplete Sentences** | 30 câu đơn điền khuyết, 4 phương án A–D | `standardToeicCount: 30` (`questionCount: 3` mẫu: Câu 101–103), `stimulus: []`, 4 lựa chọn A–D | **PASS** | Hiển thị rõ vị trí chỗ trống `_______`, đủ 4 phương án A–D, chuyển từng câu đơn mượt mà, lưu đáp án độc lập từng câu. |
| **Part 6 – Text Completion** | 16 câu (4 đoạn văn × 4 chỗ trống, có câu điền cả câu văn) | `standardToeicCount: 16` (`questionCount: 2` mẫu: Câu 131–132 trên 1 `MEMORANDUM`) | **PASS** | Hỗ trợ đoạn văn dùng chung chứa nhiều chỗ trống đánh số `_______ (131) _______`, `_______ (132) _______`. Hỗ trợ đầy đủ cả dạng điền câu hoàn chỉnh (`q14`) và điền từ/cụm từ (`q15`). Giữ đúng thứ tự đoạn văn bên trái – câu hỏi bên phải. |
| **Part 7 – Reading Comprehension** | 54 câu (Single, Double & Triple Passages) | `standardToeicCount: 54` (`questionCount: 3` mẫu: Câu 147–149 kết hợp `EMAIL` + `POLICY`) | **PARTIAL** | **Kiến trúc**: `group.stimulus` nhận mảng `TestContentBlock[]` không giới hạn số lượng khối nên hỗ trợ đầy đủ **Single, Double và Triple Passages** cũng như hình ảnh chụp văn bản/bảng biểu. Cột văn bản bên trái có `lg:sticky lg:top-20 lg:max-h-[74vh] lg:overflow-y-auto` cuộn độc lập, không mất đoạn đọc khi làm câu hỏi bên phải.<br>**Dữ liệu mẫu**: Đã có mẫu Double Passage (Email + Service Policy); chưa có dữ liệu mẫu cho Single Passage và Triple Passage, đồng thời văn bản đang trình bày dạng `whitespace-pre-line` thay vì khung định dạng chuyên biệt cho bảng biểu HTML/chat message chuỗi. |

---

## 3. Kết luận tổng quan về cấu trúc đề thi

1. **Về mô hình cấu trúc (Architecture)**: **Đạt 85% chuẩn TOEIC Listening & Reading** — phân tách đúng `Section` -> `Part (1..7)` -> `QuestionGroup` (stimulus dùng chung) -> `TestQuestion` -> `TestOption`, phân biệt chuẩn xác số phương án của Part 2 (3 đáp án A–C) với các Part còn lại (4 đáp án A–D), và hỗ trợ cả Full Test lẫn Practice theo Part.
2. **Điểm nghẽn cần khắc phục trước khi vận hành thực tế**:
   - Khôi phục cơ chế **phát âm thanh ngầm 1 lần không hiển thị thanh tua** cho phần Listening trong lúc thi (`mode === 'exam'`), thay vì tắt hẳn thẻ `<audio>`.
   - Bổ sung cơ chế **Test Versioning** và hoàn thiện bộ dữ liệu đề đủ 200 câu (bao gồm Single/Double/Triple Passages ở Part 7) khi kết nối Backend.
