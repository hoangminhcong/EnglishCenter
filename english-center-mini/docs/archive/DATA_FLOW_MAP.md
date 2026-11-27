> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/data-model/DATA_FLOW.md`.

# SƠ ĐỒ LUỒNG DỮ LIỆU HỆ THỐNG (DATA FLOW MAP) – ENGLISH CENTER

Tài liệu này mô tả chi tiết luồng đi của dữ liệu giữa các tác nhân nghiệp vụ (**Admin, Giáo vụ, Giảng viên, Kế toán, Tư vấn tuyển sinh, Học viên, Khách truy cập**) và các phân khu Frontend (**Public Website, Student Portal, Study Zone, Test Online**), phục vụ trực tiếp cho việc xây dựng Backend Node.js & Database.

---

## 1. SƠ ĐỒ TỔNG THỂ LUỒNG DỮ LIỆU LIÊN PHÂN KHU

```mermaid
flowchart TD
    subgraph Backoffice["Hệ thống Quản trị Nội bộ (Backend / Admin sẽ triển khai)"]
        ADM["Admin Hệ thống"]
        GVU["Giáo vụ (Academic)"]
        GV["Giảng viên / Trợ giảng"]
        KT["Kế toán (Accounting)"]
        SALE["Tư vấn Tuyển sinh (Sale)"]
    end

    subgraph CoreDB["Nguồn Dữ liệu Chuẩn (Single Source of Truth)"]
        CFG["CenterInfo & Branches"]
        CMS["News, Careers & Public Achievements"]
        CRS["Courses & Tuition Catalog"]
        CLS["Classes, Schedules & Enrollments"]
        LMS["Learning Plans, Materials & Assignments"]
        ATT["Attendance & Official Exam Results"]
        SZ["Study Zone Practice Bank"]
        EXM["TOEIC Tests, Answer Keys & Attempts"]
    end

    subgraph FrontendApp["Ứng dụng Frontend Hiện tại (English Center)"]
        PUB["Public Website"]
        PORTAL["Student Portal (/student/*)"]
        STUDY["Study Zone (/study-zone/*)"]
        TEST["Test Online (/test-online/* & /test-history)"]
    end

    ADM --> CFG
    ADM --> CMS
    ADM --> CRS
    ADM --> EXM

    GVU --> CLS
    GVU --> LMS
    GVU --> ATT

    GV --> LMS
    GV --> ATT

    KT --> CLS
    SALE <--> PUB

    CFG --> PUB
    CFG --> PORTAL
    CFG --> TEST

    CMS --> PUB
    CRS --> PUB
    CRS --> PORTAL

    CLS --> PUB
    CLS --> PORTAL

    LMS --> PORTAL
    ATT --> PORTAL
    SZ --> STUDY
    EXM --> TEST
```

---

## 2. LUỒNG DỮ LIỆU CHI TIẾT THEO TỪNG NGHIỆP VỤ TRỌNG TÂM

### 2.1. Luồng Tư vấn Tuyển sinh -> Ghi danh -> Xếp lớp -> Học phí
```mermaid
sequenceDiagram
    actor Visitor as Khách / Học viên tiềm năng
    participant Web as Public Website (/courses, /schedule, /contact)
    participant API as Backend API / Lead Store
    actor Sale as Tư vấn viên
    actorKT as Kế toán
    actor Academic as Giáo vụ
    participant Portal as Student Portal (/student/*)

    Visitor->>Web: Xem Khóa học & Lịch khai giảng (chỉ lớp status != cancelled)
    Visitor->>Web: Gửi Form Nhận Tư Vấn (Họ tên, SĐT, Cơ sở, Khóa/Lộ trình)
    Web->>API: POST /api/consultations (Validate SĐT VN, lưu Lead)
    API-->>Sale: Tạo hồ sơ tư vấn & kiểm tra đầu vào (Entry Score)
    Sale->>actorKT: Chuyển thông tin đăng ký khóa học
    actorKT->>API: Xác nhận thu học phí (chốt snapshot agreedTuitionVnd)
    Academic->>API: Tạo Enrollment gắn Student -> Class (cls-ec-s01)
    Visitor->>Portal: Đăng nhập tài khoản Học viên
    Portal->>API: GET /api/student-portal/me
    API-->>Portal: Trả về ClassInfo, Kế hoạch 24 buổi, Thời khóa biểu & Bài tập
```

### 2.2. Luồng Học tập trên lớp: Kế hoạch học tập -> Bài tập -> Nộp bài -> Chấm bài & Điểm danh
```mermaid
sequenceDiagram
    actor Teacher as Giảng viên
    participant API as Backend / StudentPortal Repository
    actor Student as Học viên (Đã xếp lớp)
    participant Portal as Student Portal (/student, /schedule, /assignments)

    Teacher->>API: Công bố Kế hoạch buổi học, Tài liệu lớp & BTVN (kèm hạn nộp 23:00)
    Student->>Portal: Truy cập Cổng học viên
    Portal->>API: Fetch dữ liệu theo user.id (React Query ['student-portal', user.id])
    API-->>Portal: Chỉ mở khóa nộp bài các buổi có assignedDate <= today
    Student->>Portal: Nhập link Google Drive hợp lệ + số câu đúng LC/RC (Zod schema)
    Portal->>API: POST /api/student-portal/assignments/:id/submissions
    API-->>Portal: Cập nhật status = 'submitted', đồng bộ ngay trên Dashboard & Lịch học
    Teacher->>API: Chấm bài & xác nhận (status = 'passed' | 'failed', teacherComment)
    Teacher->>API: Điểm danh buổi học ('on' | 'late' | 'excused' | 'absent')
    API-->>Portal: Học viên xem kết quả chấm bài & tỷ lệ chuyên cần (Read-only)
```

### 2.3. Luồng Thi trực tuyến TOEIC (`Test Online`) & Bảo toàn lịch sử (`Snapshot`)
```mermaid
sequenceDiagram
    actor User as Học viên / Thí sinh
    participant UI as Test Online UI
    participant AttemptSvc as AttemptService / Backend Exam API
    participant Scoring as ScoringService (Server-side khi lên Production)

    User->>UI: Chọn đề thi Published tại /test-online/:slug
    UI->>AttemptSvc: Kiểm tra lượt làm dở theo (testSlug, ownerId)
    alt Có bài đang làm dở của đúng ownerId
        UI-->>User: Hiển thị hộp thoại "Tiếp tục làm bài" hoặc "HỦY" (làm mới)
    end
    User->>UI: Chọn Full Test (120p) hoặc Tự chọn Part + Thời gian -> BẮT ĐẦU
    UI->>AttemptSvc: Tạo TestAttempt (lưu snapshot selectedParts, durationSeconds, startedAt)
    loop Trong phòng thi (/test-online/attempt/:attemptId)
        UI->>UI: Part 1–4 phát audio ẩn 1 lần, khóa chuyển câu, hết audio tự chuyển tiếp
        UI->>UI: Part 5–7 khóa vĩnh viễn Part 1–4, mở chuyển câu/cụm câu tự do
        UI->>AttemptSvc: Lưu tự động phương án chọn & câu đánh dấu xem lại
    end
    User->>UI: Nhấn NỘP BÀI (hoặc hết giờ tự động nộp)
    UI->>AttemptSvc: POST /api/attempts/:attemptId/submit
    AttemptSvc->>Scoring: Đối chiếu serverTestAnswerKeys & bảng quy đổi điểm của đề
    Scoring-->>AttemptSvc: Sinh bất biến TestAttemptResult (LC, RC, Total, QuestionReviews)
    AttemptSvc-->>UI: Điều hướng sang /test-online/results/:attemptId & lưu vào /test-history
```

---

## 3. RANH GIỚI TRÁCH NHIỆM DỮ LIỆU TRÊN FRONTEND

1. **Tầng Component / Page (`src/features/*/pages`, `components`):**
   - Chỉ nhận dữ liệu đã chuẩn hóa từ Custom Hooks (`useStudentPortalData`, `useTests`, `useAttemptSession`, `useSchedules`, `useAuth`), hiển thị trạng thái `loading` / `error` / `empty` và gửi sự kiện thao tác của người dùng.
   - Không truy cập trực tiếp `localStorage` trong JSX.
2. **Tầng Hook & Query (`src/features/*/hooks`):**
   - Quản lý vòng đời bất đồng bộ, phân tách cache theo `user.id` và vô hiệu hóa cache khi dữ liệu thay đổi.
3. **Tầng API / Repository / Service (`src/features/*/api`, `services`, `repositories`):**
   - Kiểm tra cờ `USE_MOCK_API` tại `src/services/api/apiConfig.ts`:
     - Khi `VITE_USE_MOCK_API !== 'false'` (mặc định giai đoạn hiện tại): Đọc/ghi qua Mock Data chuẩn hóa & `localStorage` có phân lập `ownerId`.
     - Khi `VITE_USE_MOCK_API === 'false'` (khi kết nối Backend Node.js): Gọi thẳng `httpClient` (`axios`) tới các hằng số `API_ENDPOINTS` mà **không cần sửa bất kỳ Component giao diện nào**.
