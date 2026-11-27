# ĐẶC TẢ QUẢN TRỊ & BIÊN TẬP STUDY ZONE (`STUDY_ZONE_AUTHORING_SPEC`)

Tài liệu này mô tả thiết kế dữ liệu và luồng biên tập của phân hệ **Study Zone (`/learning/study-zone` & `/learning/study-zone/:exerciseId`)** trên `apps/staff-web`.

---

## 1. BẢO TOÀN ĐỊNH TUYẾN VỚI 3 DANH MỤC GỐC (`LOCKED ROUTE SLUGS`)

Trên `apps/client-web`, khu vực tự học Study Zone sử dụng 3 đường dẫn tĩnh:
- `/study-zone/grammar` (`slug: 'grammar'`)
- `/study-zone/vocabulary` (`slug: 'vocabulary'`)
- `/study-zone/listening` (`slug: 'listening'`)

Để bảo đảm Admin không vô tình đổi tên slug hoặc thêm danh mục thứ 4 gây lỗi `404` trên Client Web:
- `LockedStudyZoneCategorySlug` được khóa cứng vào tập `'grammar' | 'vocabulary' | 'listening'`.
- Admin được phép chỉnh sửa tên hiển thị phụ, mô tả giới thiệu và trạng thái kích hoạt của 3 danh mục này, nhưng trường `slug` luôn ở chế độ chỉ đọc.

---

## 2. MÔ HÌNH DỮ LIỆU CHỦ ĐỀ & BÀI LUYỆN TẬP

1. **Chủ đề (`ManagedStudyTopicRecord`):**
   - Khởi tạo đồng bộ với các chủ đề thực tế của `client-web` (`gram-03`, `gram-01`, `vocab-01`, `list-01`).
   - Liên kết chặt chẽ vào một trong 3 danh mục gốc (`category`), có thứ tự hiển thị (`orderNumber`), cấp độ gợi ý (`level`) và trạng thái xuất bản (`isPublished`).
2. **Bài luyện tập (`ManagedStudyExerciseRecord`):**
   - Tách bạch hoàn toàn với **Bài tập về nhà theo lớp (`ClassAssignment`)** do Giảng viên giao trong Student Portal.
   - Mảng câu hỏi công khai `questions: StudyQuestionPublicItem[]` gồm `displayOrder`, `questionText`, `imageUrl`, `audioUrl` và 4 lựa chọn `A, B, C, D`.
   - Bản đồ đáp án `answerKeys: Record<questionId, StudyQuestionAnswerKeyItem>` lưu riêng `correctOptionId`, `explanation` và `audioTranscript`.

---

## 3. LUỒNG SOẠN THẢO, KIỂM ĐỊNH & XEM THỬ

Tại màn hình [`StudyZoneExerciseEditorPage.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/features/learning/pages/StudyZoneExerciseEditorPage.tsx):
- **Thao tác biên tập câu hỏi:** Thêm mới, chỉnh sửa, nhân bản câu hỏi (`Duplicate`), sắp xếp thứ tự bằng nút `↑` / `↓` (tự động đánh lại `displayOrder`), xóa câu hỏi, đính kèm hình ảnh hoặc tạo âm thanh mẫu WAV ngoại tuyến qua `MediaUploadBox`.
- **Kiểm định trước xuất bản (`validateStudyExerciseForPublish`):**
  - Chặn xuất bản nếu bài tập có `0` câu hỏi.
  - Chặn xuất bản nếu bất kỳ lựa chọn `A–D` nào để trống.
  - Chặn xuất bản nếu danh mục `listening` thiếu tệp âm thanh (`audioUrl`).
  - Chặn xuất bản nếu câu hỏi chưa có `correctOptionId` hợp lệ trong `answerKeys`.
- **Xem thử giao diện Học viên:** Mở hộp thoại làm thử ngay trên `staff-web`, cho phép bấm chọn đáp án, nghe âm thanh và bật/tắt chế độ xem lời giải thích chi tiết.
