# ĐẶC TẢ SOẠN THẢO, KIỂM ĐỊNH & XEM THỬ ĐỀ THI TEST ONLINE (`TEST_ONLINE_AUTHORING_SPEC`)

Tài liệu này mô tả kiến trúc nghiệp vụ của phân hệ **Ngân hàng Đề thi TOEIC (`/learning/tests` & `/learning/tests/:testId`)** trong `apps/staff-web`, bảo đảm tương thích 100% với cấu trúc phòng thi trên `apps/client-web`.

---

## 1. PHẠM VI KỸ NĂNG & CẤU TRÚC PART 1–7

### 1.1. Ràng buộc kỹ năng trung thực với Client Web
- **`listening_reading`:** Đang kích hoạt đầy đủ luồng Tạo đề -> Soạn thảo Part 1–7 -> Kiểm định -> Xuất bản -> Xem thử.
- **`speaking_writing`:** Hiển thị rõ trạng thái khóa kèm nhãn `CLIENT CHƯA HỖ TRỢ LÀM BÀI` trong hộp thoại tạo đề để không tạo dữ liệu mồ côi chưa thể thi trên Client Web.

### 1.2. Đặc tả chi tiết từng Part theo chuẩn ETS TOEIC

| Part | Kỹ năng | Mô hình nhóm (`groupedMode`) | Số lựa chọn | Quy tắc nội dung câu hỏi & phương tiện |
| :--- | :--- | :--- | :--- | :--- |
| **Part 1: Photographs** | Listening | Câu đơn (`false` – mỗi câu 1 khung nhóm đơn) | `4` (`A, B, C, D`) | Bắt buộc có `audioUrl`; lựa chọn `A–D` cho phép để trống chữ (vì thí sinh nghe trong băng); cảnh báo nếu thiếu `imageUrl`. |
| **Part 2: Question-Response** | Listening | Câu đơn (`false`) | **`3` (`A, B, C`)** | Bắt buộc có `audioUrl`; đúng 3 lựa chọn `A, B, C` (cho phép để trống chữ). |
| **Part 3: Conversations** | Listening | Chùm câu hỏi (`true` – `QuestionGroup`) | `4` (`A, B, C, D`) | Dùng chung `group.audioUrl` (và `group.imageUrl` nếu có bảng biểu); mỗi câu hỏi con bắt buộc có `questionText` và nội dung 4 lựa chọn `A–D`. |
| **Part 4: Talks** | Listening | Chùm câu hỏi (`true` – `QuestionGroup`) | `4` (`A, B, C, D`) | Dùng chung `group.audioUrl` (và `group.imageUrl` tùy chọn); mỗi câu con bắt buộc có `questionText` và 4 lựa chọn `A–D`. |
| **Part 5: Incomplete Sentences** | Reading | Câu đơn (`false`) | `4` (`A, B, C, D`) | Không có đoạn văn chung; bắt buộc có `questionText` và nội dung 4 lựa chọn `A–D`. |
| **Part 6: Text Completion** | Reading | Chùm câu hỏi (`true` – `QuestionGroup`) | `4` (`A, B, C, D`) | Bắt buộc có `group.passageText` (hoặc ảnh văn bản); mỗi câu con điền từ có `questionText` và 4 lựa chọn `A–D`. |
| **Part 7: Reading Comprehension** | Reading | Chùm câu hỏi (`true` – `QuestionGroup`) | `4` (`A, B, C, D`) | Bắt buộc có `group.passageText` (đơn/đa đoạn văn) hoặc `group.imageUrl`; mỗi câu con có `questionText` và 4 lựa chọn `A–D`. |

---

## 2. TÁCH BIỆT `ANSWER KEY` & BẢO MẬT ĐỀ THI

Trong [`testAuthoring.types.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/learning/types/testAuthoring.types.ts):
- Thực thể `AuthoringQuestion` **chỉ chứa dữ liệu hiển thị cho thí sinh** (`questionNumber`, `partNumber`, `groupId`, `questionText`, `audioUrl`, `imageUrl`, `options`, `displayOrder`).
- Đáp án đúng và lời giải được lưu riêng trong bản đồ `answerKeys: Record<questionId, AuthoringAnswerKey>` (`correctOptionId`, `explanation`, `transcript`, `translation`).
- Hàm `projectPublicStudentTestPayload(record)` trong [`testAuthoringApi.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/learning/api/testAuthoringApi.ts) tách bỏ hoàn toàn `answerKeys` trước khi truyền dữ liệu vào `TestPreviewModal` — mô phỏng chính xác API công khai `GET /api/v1/tests/:slug/exam-paper` khi nối Backend.

---

## 3. QUẢN LÝ PHIÊN BẢN BẤT BIẾN (`TEST VERSIONING`)

- Mỗi đề thi lưu `activeVersionNumber`, `scoreScaleVersionCode` (mặc định gắn `TOEIC-SCALE-V2`) và mảng lịch sử `versionHistory: TestVersionSnapshot[]`.
- **Quy tắc bảo toàn lịch sử làm bài:** Khi một đề thi đang ở trạng thái `published` **hoặc** đã có `attemptsCount > 0`, nếu Admin chỉnh sửa cấu trúc câu hỏi và nhấn Lưu, `saveTestAuthoring()` tự động tách sang phiên bản nháp mới (`v(N+1)`) và giữ nguyên bản chụp `vN` trong `versionHistory`.

---

## 4. BỘ KIỂM ĐỊNH TRƯỚC XUẤT BẢN (`PRE-PUBLISH VALIDATOR`)

Hàm `validateTestBeforePublish()` phân tách rõ 2 mức độ:

1. **Lỗi chặn cứng (`errors` – Khóa nút Xuất bản khi `errors.length > 0`):**
   - Thiếu `code`, `title` hoặc `slug`; hoặc `skillCategory !== 'listening_reading'`.
   - Tổng số câu hỏi bằng `0`, hoặc đề loại `Full Test 7 Parts` bị trống bất kỳ Part nào từ 1 đến 7.
   - Tồn tại `QuestionGroup` rỗng không có câu hỏi con, hoặc câu hỏi có `groupId` mồ côi.
   - Câu hỏi Listening (Part 1–4) thiếu `audioUrl` ở cả cấp câu hỏi lẫn cấp nhóm cha.
   - Nhóm Reading (Part 6–7) thiếu cả `passageText` lẫn `imageUrl`.
   - Sai số lượng lựa chọn (Part 2 khác 3 lựa chọn; các Part khác khác 4 lựa chọn) hoặc bỏ trống nội dung lựa chọn ở Part 3–7.
   - Chưa chọn `correctOptionId` hợp lệ trong `answerKeys`.
2. **Cảnh báo khuyến nghị (`warnings` – Hiển thị rõ nhưng không chặn xuất bản đề rút gọn):**
   - Chưa nhập `explanation` giải thích chi tiết trong `answerKeys`.
   - Câu Part 1 chưa đính kèm ảnh chụp (`imageUrl`).
   - Tổng số câu thực tế khác với `standardTotalQuestions` (ví dụ đề luyện tập rút gọn so với chuẩn 200 câu ETS).
   - Chưa nhập `generalInstructions`.

---

## 5. CƠ CHẾ XEM THỬ ĐỀ ĐỘC LẬP (`TestPreviewModal`)

Sử dụng phương án **Standalone Preview Component ngay trong `apps/staff-web`** ([`TestPreviewModal.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/learning/components/TestPreviewModal.tsx)):
- Không import chéo component nội bộ của `apps/client-web`, giữ ranh giới biên dịch độc lập giữa 2 app.
- Cho phép Admin/QA kiểm tra giao diện từng Part 1–7, nghe/tua kiểm tra tệp âm thanh, bấm chọn đáp án thử, duyệt bảng `Question Navigator` và bật/tắt chế độ đối chiếu `AnswerKey` dành riêng cho QA.
