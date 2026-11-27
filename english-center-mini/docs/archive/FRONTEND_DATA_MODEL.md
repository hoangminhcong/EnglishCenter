> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/data-model/DATA_MODEL.md`.

# MÔ HÌNH DỮ LIỆU FRONTEND & CHUẨN HÓA THỰC THỂ (FRONTEND DATA MODEL)

Tài liệu này mô tả hệ thống thực thể dữ liệu (Domain Model) đã được chuẩn hóa trên Frontend **English Center**, đảm bảo tính nhất quán, tách biệt rõ trách nhiệm nghiệp vụ và ánh xạ 1–1 sang lược đồ cơ sở dữ liệu (PostgreSQL / MongoDB) khi xây dựng Backend Node.js.

---

## 1. SƠ ĐỒ QUAN HỆ THỰC THỂ CỐT LÕI (ERD)

```mermaid
erDiagram
    BRANCH ||--o{ CLASS : "tổ chức tại"
    BRANCH ||--o{ JOB_POST : "tuyển dụng tại"
    COURSE ||--o{ CLASS : "mở các lớp theo đợt"
    USER ||--o{ ENROLLMENT : "ghi danh"
    CLASS ||--o{ ENROLLMENT : "có học viên"
    ENROLLMENT ||--o{ TUITION_LEDGER : "phát sinh công nợ"
    CLASS ||--|| LEARNING_PLAN : "áp dụng kế hoạch"
    LEARNING_PLAN ||--o{ LESSON_SESSION : "gồm 24 buổi"
    LESSON_SESSION ||--o{ LEARNING_RESOURCE : "đính kèm tài liệu"
    LESSON_SESSION ||--o| ASSIGNMENT : "giao BTVN / Demo"
    ASSIGNMENT ||--o{ ASSIGNMENT_SUBMISSION : "học viên nộp"
    LESSON_SESSION ||--o{ ATTENDANCE_RECORD : "điểm danh"
    ENROLLMENT ||--o{ OFFICIAL_EXAM_RESULT : "điểm Mid / Final"

    TOEIC_TEST ||--o{ TOEIC_TEST_VERSION : "lưu phiên bản"
    TOEIC_TEST_VERSION ||--o{ TOEIC_PART : "gồm 7 Part"
    TOEIC_PART ||--o{ QUESTION_GROUP : "nhóm đoạn văn / hội thoại"
    TOEIC_PART ||--o{ TOEIC_QUESTION : "chứa câu hỏi"
    USER ||--o{ TEST_ATTEMPT : "thực hiện lượt thi"
    TOEIC_TEST_VERSION ||--o{ TEST_ATTEMPT : "chấm theo phiên bản"
```

---

## 2. ĐẶC TẢ CHI TIẾT CÁC NHÓM THỰC THỂ

### 2.1. Phân biệt `Course` – `Class` – `Enrollment` – `Tuition`
1. **`Course` (`src/features/courses/types.ts`):** Chương trình đào tạo chuẩn của trung tâm.
   - `id`: `'foundation-toeic' | 'camp-bomb-toeic' | 'submarine-toeic' | 'master-speaking-writing'`
   - `slug`, `name`, `targetScore`, `durationWeeks`, `totalSessions`, `tuition` (số nguyên VND), `status`: `'draft' | 'published' | 'archived'`.
2. **`Class` (`StudentClassInfo` / `PublicScheduleItem`):** Lớp học thực tế mở theo từng đợt khai giảng.
   - `id` (`cls-ec-s01`), `classCode` (`EC-S01`), `courseId` (FK -> `Course.id`), `branchId` (FK -> `Branch.id`).
   - `teacherId` / `teacherName`, `roomName`, `scheduleDays`, `scheduleTime`, `startDate`, `endDate`.
   - `status`: `'open' | 'closing-soon' | 'full' | 'ongoing' | 'completed' | 'cancelled'`.
3. **`Enrollment`:** Bản ghi liên kết 1 Học viên (`userId`) vào 1 Lớp (`classId`).
   - `id`, `studentId`, `classId`, `enrolledAt` (ISO-8601), `enrollmentStatus`: `'active' | 'reserved' | 'transferred' | 'completed' | 'dropped'`.
   - `agreedTuitionVnd`: Học phí chốt tại thời điểm đăng ký (Snapshot bất biến kể cả khi `Course.tuition` tăng/giảm về sau).
   - `entryScore`: `{ lc: number, rc: number, total: number }`, `goalScore`: `{ lc: number, rc: number, total: number }`.

### 2.2. Phân biệt `Assignment` (Bài tập Giảng viên giao) vs `StudyExercise` (Study Zone)
- **`Assignment` & `AssignmentSubmission` (`src/features/student-portal/model/studentPortal.types.ts`):**
  - Thuộc về một buổi học cụ thể (`lessonId`, `sessionNumber`) của lớp mà học viên đang theo học.
  - Có `assignedDate` (chỉ mở khóa khi tới ngày học), `dueDate` (ISO-8601), `driveLink` bài làm, điểm từng kỹ năng và trạng thái xác nhận của Giảng viên: `'todo' | 'submitted' | 'passed' | 'failed'`.
- **`StudyExercise` (`src/features/study-zone/types.ts`):**
  - Thuộc ngân hàng tự luyện công khai theo chuyên đề (`grammar | vocabulary | listening`), cho phép làm lại không giới hạn, nghe lại âm thanh nhiều lần và không ảnh hưởng tới điều kiện chuyên cần/qua môn của lớp học.

### 2.3. Mô hình Đề thi TOEIC, Khung Câu hỏi Chuẩn hóa & Lượt làm bài (`src/features/test-online/types/test.types.ts`)
1. **`Test` & Phiên bản đề (`TestVersion`):**
   - `id` (`test-2026-01`..`test-2025-02`), `code` (`ETS-2026-T01`, `EC-2025-T01`...), `slug`, `skillCategory`: `'listening_reading' | 'speaking' | 'writing' | 'speaking_writing'`.
   - `status`: `'draft' | 'published' | 'archived'`.
   - `allowPartSelection: boolean`, `availableDurationOptions: number[]`, `scoreConversionTable: ScoreConversionRow[]`.
2. **Mô hình Câu hỏi Chuẩn hóa (`TestQuestion` & `normalizeQuestionMedia` tại `src/features/test-online/utils/questionMedia.ts`):**
   - Để đơn giản hóa việc nhập liệu và hiển thị ổn định trên khung 2 cột cho mọi Part 1–7, mỗi câu hỏi đều hỗ trợ đồng nhất bộ 3 trường nội dung:
     - `questionText?: string` (Văn bản câu hỏi — có thể để trống ở Part 1 & Part 2)
     - `audioUrl?: string` (File âm thanh câu hỏi hoặc kế thừa từ cụm hội thoại `group.audioUrl`)
     - `imageUrl?: string` (Hình ảnh minh họa câu hỏi hoặc bảng biểu `group.imageUrl`)
   - Đi kèm `options: TestAnswerOption[]` (4 phương án A, B, C, D cho Part 1, 3, 4, 5, 6, 7; 3 phương án A, B, C chuẩn ETS hoặc 4 phương án tùy cấu hình cho Part 2).
   - Câu hỏi đơn hay câu hỏi theo cụm (`QuestionGroup` cho Part 3, 4, 6, 7) nếu khuyết trường nào trong 3 trường trên thì giao diện tự động ẩn gọn phần tử rỗng đó mà vẫn giữ nguyên khung 2 cột chuẩn.
3. **Tách biệt Đề thi Client và Đáp án Server (`ServerTestAnswerKey`):**
   - `TestQuestion` gửi xuống phòng thi đang làm bài **không chứa** `correctOptionId` hay `explanation`.
   - `ServerTestAnswerKey` (`{ questionId, correctOptionId, explanation }`) chỉ được dùng trong bước chấm bài (`scoringService.ts`) và trả về bên trong `TestAttemptResult` sau khi `status === 'submitted'`.
4. **`TestAttempt` & `TestAttemptResult` (Bảo toàn kết quả lịch sử):**
   - `TestAttempt`: `id`, `userId` (`ownerId`), `testId`, `testTitle`, `mode` (`'full' | 'practice'`), `selectedParts`, `durationSeconds`, `startedAt`, `expiresAt`, `submittedAt`, `status` (`'in_progress' | 'submitted'`), `answers`, `flaggedQuestionIds`, `audioPlayedKeys`.
   - `TestAttemptResult`: Lưu bất biến `listeningCorrect`, `readingCorrect`, `listeningScore` (`5–495`), `readingScore` (`5–495`), `totalScore` (`10–990`), `isFullTestScore`, `accuracyPercent`, `partBreakdown` và `questionReviews` (snapshot đầy đủ câu hỏi, ảnh, audio, đáp án người dùng chọn, đáp án đúng và giải thích).

---

## 3. QUY TẮC TRẠNG THÁI & CHUẨN DỮ LIỆU TOÀN HỆ THỐNG

| Thuộc tính | Quy chuẩn bắt buộc |
| --- | --- |
| **Trạng thái xuất bản nội dung (`PublishStatus`)** | `'draft' \| 'published' \| 'archived'` |
| **Trạng thái tin tuyển dụng (`JobStatus`)** | `'draft' \| 'published' \| 'closed' \| 'archived'` |
| **Trạng thái lớp khai giảng (`ScheduleStatus`)** | `'open' \| 'closing-soon' \| 'full' \| 'cancelled'` |
| **Vai trò người dùng (`UserRole`)** | `'student' \| 'teacher' \| 'academic' \| 'accounting' \| 'sale' \| 'admin'` (Frontend hiện phục vụ `'student'` & khách `'guest'`) |
| **Định dạng ngày giờ** | Lưu trữ & truyền tải `ISO-8601` (`YYYY-MM-DDTHH:mm:ss.sssZ`); ngày thuần lịch học dùng `YYYY-MM-DD`. |
| **Định dạng tiền tệ** | Số nguyên dương `VND` (`number` nguyên, hiển thị qua `Intl.NumberFormat('vi-VN')`). |
| **Bảo mật URL bên ngoài** | Mọi liên kết tài liệu/Google Drive của học viên đều đi qua `toSafeExternalUrl` (`src/utils/safeUrl.ts`) chỉ chấp nhận giao thức `http:` / `https:`. |
