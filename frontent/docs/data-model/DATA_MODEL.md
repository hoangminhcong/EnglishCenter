# MÔ HÌNH DỮ LIỆU NGHIỆP VỤ CHUẨN HÓA (`DATA_MODEL`)

Tài liệu này định nghĩa ranh giới thực thể nghiệp vụ chính thức của hệ thống **English Center**, đồng bộ trực tiếp với gói [`@english-center/contracts`](file:///d:/Web/english-center-mini/packages/contracts/src/entities/core.types.ts) và phục vụ thiết kế lược đồ PostgreSQL / Prisma tại `apps/backend`.

---

## 1. SƠ ĐỒ QUAN HỆ THỰC THỂ LIÊN PHÂN HỆ (ERD)

```mermaid
erDiagram
    USER_ACCOUNT ||--o| STUDENT_PROFILE : "1-1 nếu là học viên"
    USER_ACCOUNT ||--o| TEACHER_PROFILE : "1-1 nếu là giảng viên"
    USER_ACCOUNT ||--o| EMPLOYEE_PROFILE : "1-1 nếu là nhân sự"

    BRANCH ||--o{ CLASS : "tổ chức tại"
    COURSE_CATALOG ||--o{ TUITION_POLICY : "có lịch sử chính sách giá"
    COURSE_CATALOG ||--o{ CLASS : "mở lớp theo đợt"
    TEACHER_PROFILE ||--o{ CLASS : "phụ trách giảng dạy"

    LEAD ||--o{ CONSULTATION : "nhật ký tư vấn bất biến"
    LEAD ||--o{ FOLLOW_UP : "lịch hẹn liên hệ lại"
    LEAD ||--o{ LEAD_STATUS_HISTORY : "lịch sử trạng thái Lead"
    LEAD ||--o{ COURSE_REGISTRATION : "nộp hồ sơ đăng ký"
    CLASS ||--o{ COURSE_REGISTRATION : "gắn classId cụ thể"
    COURSE_REGISTRATION ||--|| REGISTRATION_SNAPSHOT : "chụp bất biến lúc nộp"
    COURSE_REGISTRATION ||--o{ REGISTRATION_STATUS_HISTORY : "lịch sử xét duyệt"

    STUDENT_PROFILE ||--o{ ENROLLMENT : "ghi danh"
    CLASS ||--o{ ENROLLMENT : "tiếp nhận"
    ENROLLMENT ||--o{ RECEIVABLE : "phát sinh khoản phải thu"
    RECEIVABLE ||--o{ PAYMENT_RECEIPT : "thu tiền từng đợt"
    RECEIVABLE ||--o{ REFUND_RECORD : "hoàn phí (nếu có)"

    CLASS ||--o{ SCHEDULE_SESSION : "gồm các buổi học"
    SCHEDULE_SESSION ||--o{ ATTENDANCE_RECORD : "điểm danh"
    SCHEDULE_SESSION ||--o| CLASS_ASSIGNMENT : "giao BTVN / Demo Test"
    CLASS_ASSIGNMENT ||--o{ ASSIGNMENT_SUBMISSION : "học viên nộp bài"
    ENROLLMENT ||--o{ OFFICIAL_EXAM_GRADE : "điểm Mid-test / Final-test"

    TEST_DEFINITION ||--o{ TEST_VERSION : "quản lý phiên bản đề"
    SCORE_SCALE_VERSION ||--o{ TEST_VERSION : "áp dụng thang quy đổi"
    TEST_VERSION ||--o{ QUESTION_GROUP : "chứa cụm ngữ liệu"
    QUESTION_GROUP ||--o{ QUESTION : "chứa câu hỏi"
    QUESTION ||--o{ QUESTION_OPTION : "lựa chọn A/B/C/D"
    TEST_VERSION ||--o{ TEST_ATTEMPT : "thí sinh làm bài"
    TEST_ATTEMPT ||--o{ STUDENT_ANSWER : "lưu đáp án chọn"
    TEST_ATTEMPT ||--o| TEST_RESULT : "kết quả bất biến"
```

---

## 2. RANH GIỚI 6 MIỀN NGHIỆP VỤ BẮT BUỘC

### 2.1. User & Account
- **`UserAccount`:** Chỉ quản lý thông tin đăng nhập (`id`, `email`, `username`, `passwordHash` ở DB, `role`, `status`).
- **`StudentProfile` / `TeacherProfile` / `EmployeeProfile`:** Chứa thông tin nghiệp vụ riêng gắn qua khóa ngoại `userAccountId`.
- **Quy tắc:** Tuyệt đối không dùng `email` hay `fullName` làm khóa chính hoặc khóa liên kết giữa các bảng.

### 2.2. Courses & Enrollment
- **`CourseCatalog`:** Chương trình đào tạo niêm yết trên Website (`foundation-toeic`, `camp-bomb-toeic`, `submarine-toeic`, `master-speaking-writing`).
- **`Class`:** Lớp học cụ thể mở theo cơ sở, ca học, ngày khai giảng và giảng viên.
- **`Enrollment`:** Bản ghi ghi danh của một học viên vào một lớp (`status: 'active' | 'hold' | 'transferred' | 'completed' | 'dropped'`, `agreedTuitionVnd`).
- **Quy tắc bảo toàn lịch sử:** Khi Admin sửa mô tả hoặc tăng/giảm học phí trên `CourseCatalog`, các bản ghi `Enrollment` đã tạo trước đó không bị biến đổi.

### 2.3. Tuition & Accounting
- **`TuitionPolicy`:** Chính sách giá khóa học có hiệu lực theo mốc thời gian (`effectiveFrom`, `effectiveTo`) do **Admin** cấu hình.
- **`Receivable` (Khoản phải thu), `PaymentReceipt` (Phiếu thu), `RefundRecord` (Hoàn phí):** Do **Kế toán** quản lý. `outstandingBalanceVnd = netReceivableVnd - paidAmountVnd`.
- **Quy tắc kiểm toán:** Cập nhật `CourseCatalog.listedTuitionVnd` không bao giờ tự động sửa ngược `Receivable` lịch sử của học viên cũ.

### 2.4. Training (Đào tạo trên lớp)
- Bao gồm `ScheduleSession` (buổi học), `AttendanceRecord` (điểm danh chỉ đọc với học viên), `ClassAssignment` (BTVN/Demo Test do Giảng viên giao cho lớp), `AssignmentSubmission` (bài nộp chờ Giảng viên duyệt `'passed' | 'failed'`) và `OfficialExamGrade` (`Mid-test` / `Final-test`).
- **Quy tắc tách biệt:** Bài tập Giảng viên giao (`ClassAssignment`) hoàn toàn tách rời khỏi kho bài tự luyện mở (`StudyZoneExercise`).

### 2.5. Learning Content & TOEIC Exam
- Phân tách rõ `LearningMaterial` (tài liệu PDF/Audio/Video), `StudyZoneExercise` (bài tự luyện ngắn có nghe lại tự do) và hệ thống thi chuẩn `TestDefinition` -> `TestVersion` -> `QuestionGroup` -> `Question` -> `QuestionOption`.
- **Bảo mật đáp án & Bảo toàn phiên bản:**
  - Trong thời gian làm bài (`status = 'in_progress'`), API không bao giờ trả `correctOptionId` hoặc `explanation` xuống Frontend.
  - Khi Admin cập nhật nội dung câu hỏi hoặc bảng quy đổi điểm của một đề đã có người làm, hệ thống sinh `TestVersion` mới; mọi `TestAttempt` và `TestResult` cũ vẫn gắn cố định với `testVersionId` và `scoreScaleVersionId` tại thời điểm thi.

### 2.6. Content CMS
- Quản lý `CenterInfo`, `Branch`, `NewsPost`, `JobPost` và `StudentAchievement`.
- Chỉ các bản ghi `status = 'published'` mới xuất hiện trên Public Website.
- Tin tuyển dụng tự động chuyển sang trạng thái đóng nhận hồ sơ (`'closed'`) khi sang ngày kế tiếp sau `deadline` theo múi giờ `Asia/Ho_Chi_Minh`.
- Thành tích học viên chỉ được xuất bản công khai khi `publicConsentGranted === true`.

### 2.7. Sales CRM & Course Registration (`packages/contracts/src/sales/sales.types.ts`)
- Phân biệt rạch ròi 5 thực thể: **`Lead`** (khách tiềm năng), **`Consultation`** (một lần tư vấn bất biến), **`FollowUp`** (lịch liên hệ lại, nhãn "Quá hạn" suy ra động từ `Scheduled` + `dueAt < now`), **`CourseRegistration`** (hồ sơ đăng ký khóa học gắn `classId` cụ thể) và **`Enrollment`** (ghi danh chính thức do Giáo vụ tạo ngoài phạm vi Sales).
- **`RegistrationSnapshot`:** Lưu cứng thông tin khóa học, lớp, lịch học, ngày khai giảng, chính sách học phí và mức giá dự kiến tại thời điểm tạo/nộp hồ sơ. Thay đổi giá hoặc khóa học của Admin về sau không làm biến đổi hồ sơ cũ.
- **Quy tắc máy trạng thái:** `Lead.status = 'Registered'` không được đặt thủ công mà chỉ tự động kích hoạt khi một `CourseRegistration` của Lead được nộp (`Submitted`).

---

## 3. QUY ƯỚC KIỂU DỮ LIỆU CHUNG

- **Định danh (`ID`):** Chuỗi ổn định (`UUID v7` / `ULID` trên DB; slug chỉ dùng cho SEO URL, không thay thế ID khóa ngoại).
- **Ngày giờ:** Chuỗi chuẩn `ISO-8601`; phân biệt rõ **Date** (`YYYY-MM-DD` cho ngày khai giảng, ngày học, hạn nộp theo lịch `Asia/Ho_Chi_Minh`) và **DateTime** (`YYYY-MM-DDTHH:mm:ss.sssZ` cho thời điểm bắt đầu/nộp bài thi, thời điểm thu phí).
- **Tiền tệ:** Số nguyên `VND` (`integer`, không dùng số thực).
