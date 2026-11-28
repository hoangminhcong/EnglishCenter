> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/api-contract/API_CONTRACT.md`.

# HỢP ĐỒNG GIAO TIẾP API FRONTEND – BACKEND (FRONTEND API CONTRACT)

Tài liệu này định nghĩa chuẩn giao tiếp RESTful API giữa Frontend **English Center** và Backend **Node.js** sắp triển khai.
- Tầng cấu hình cơ sở: `src/services/api/apiConfig.ts` (`VITE_API_BASE_URL`, `VITE_USE_MOCK_API`) & `src/services/api/endpoints.ts`.
- HTTP Client: `src/services/api/httpClient.ts` (Axios kèm Bearer Token / Cookie sẵn sàng và xử lý tự động mã `401 Unauthorized`).

---

## 1. QUY ƯỚC CHUNG CHO TOÀN BỘ API

### 1.1. Định dạng Response chuẩn (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": {},
  "message": "Thành công",
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4
  }
}
```

### 1.2. Định dạng Lỗi chuẩn (`ApiErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_RESOURCE",
    "message": "Bạn không có quyền truy cập lượt làm bài của tài khoản khác.",
    "details": []
  }
}
```

### 1.3. Quy tắc Thời gian, Tiền tệ & Phân quyền
- **Thời gian:** Chuỗi chuẩn `ISO-8601` UTC (ví dụ `2026-11-24T05:00:00.000Z`), hiển thị tại Frontend theo múi giờ `Asia/Ho_Chi_Minh` (`UTC+7`).
- **Tiền tệ:** Số nguyên dương đơn vị **VND** (`integer`, ví dụ `3900000`), tuyệt đối không dùng số thực dấu phẩy động.
- **Xác thực & Phân quyền:**
  - `Public`: Không yêu cầu token; Backend chỉ trả các bản ghi có `status = 'published'` / `'active'`.
  - `Authenticated (Student)`: Yêu cầu JWT hợp lệ (`Authorization: Bearer <token>` hoặc `HttpOnly Cookie`). Backend **bắt buộc** lấy `userId` từ Token đã giải mã, không tin tưởng `userId` do client gửi lên body/query.

---

## 2. DANH MỤC ENDPOINT FRONTEND ĐÃ ĐỊNH NGHĨA (`src/services/api/endpoints.ts`)

### 2.1. Phân hệ Xác thực (`Auth`)
| Endpoint | Method | Auth | Request Payload | Response `data` | Mã lỗi cần xử lý |
| --- | --- | --- | --- | --- | --- |
| `/auth/login` | `POST` | Public | `{ identifier: string, password: string, rememberMe?: boolean }` | `{ user: AuthUser, accessToken: string }` | `400`, `401` (sai thông tin), `423` (khóa TK) |
| `/auth/register` | `POST` | Public | `{ fullName, email, phone, password }` | `{ user: AuthUser, accessToken: string }` | `400`, `409` (trùng email/SĐT) |
| `/auth/logout` | `POST` | Auth | `{}` | `{ loggedOut: true }` | `401` |
| `/auth/me` | `GET` | Auth | — | `AuthUser` (không chứa mật khẩu) | `401` |
| `/auth/forgot-password` | `POST` | Public | `{ email: string }` | `{ resetTokenSent: true }` | `400`, `429` |
| `/auth/reset-password` | `POST` | Public | `{ token: string, newPassword: string }` | `{ updated: true }` | `400`, `410` (token hết hạn) |
| `/auth/change-password` | `POST` | Auth | `{ currentPassword: string, newPassword: string }` | `{ updated: true }` | `400`, `401` (mật khẩu hiện tại sai) |

### 2.2. Phân hệ Public Website (`Center, Courses, Schedules, News, Careers, Consultations`)
| Endpoint | Method | Auth | Query / Body | Response `data` | Ghi chú nghiệp vụ |
| --- | --- | --- | --- | --- | --- |
| `/branches` | `GET` | Public | `?activeOnly=true` | `Branch[]` | Danh sách cơ sở đào tạo |
| `/courses` | `GET` | Public | `?category=...` | `Course[]` | Chỉ trả khóa học đang mở tuyển sinh |
| `/courses/:slug` | `GET` | Public | — | `CourseDetail` | Chi tiết lộ trình, cam kết đầu ra, học phí VND |
| `/schedules` | `GET` | Public | `?branchId=&month=&page=&limit=` | `{ items: PublicScheduleItem[], meta }` | Join sẵn tên khóa học & cơ sở chuẩn |
| `/news` | `GET` | Public | `?category=&page=&limit=` | `NewsArticle[]` | Chỉ trả bài `status = 'published'` |
| `/news/:slug` | `GET` | Public | — | `NewsArticle` | `404` nếu bài ở trạng thái `draft`/`archived` |
| `/careers` | `GET` | Public | — | `JobPost[]` | Kèm `branchName` chuẩn hóa từ `branchId` |
| `/careers/:slug` | `GET` | Public | — | `JobPost` | Frontend khóa ứng tuyển nếu `closed` hoặc quá `deadline` |
| `/consultations` | `POST` | Public | `{ fullName, phone, email?, branchId?, courseId?, scheduleId?, targetScore?, note? }` | `{ consultationId: string, createdAt: string }` | Validate SĐT Việt Nam, chống spam (`429`) |
| `/learning-materials` | `GET` | Public | `?category=listening-reading\|exam-review` | `LearningMaterialPost[]` | Kho tài liệu TOEIC miễn phí công khai |

### 2.3. Phân hệ Cổng học viên (`Student Portal` – Đề xuất chuẩn hóa cho `studentPortal.repository.ts`)
| Endpoint | Method | Auth / RBAC | Request Payload | Response `data` | Ghi chú đồng bộ |
| --- | --- | --- | --- | --- | --- |
| `/student-portal/me` | `GET` | `student` | — | `StudentPortalDataset` | Trả `hasEnrollment: false` nếu HV chưa được Giáo vụ xếp lớp |
| `/student-portal/assignments/:assignmentId/submissions` | `POST` | `student` | `{ driveLink?: string, partScores?: { lc: number, rc: number }, demoScores?: { lc: number, rc: number } }` | `AssignmentSubmission` | Kiểm tra HV thuộc lớp được giao bài và `assignedDate <= today` |
| `/student-portal/support-requests` | `POST` | `student` | `{ type: 'leave' \| 'transfer' \| 'retake' \| 'other', reason: string, desiredBranchId?: string }` | `SupportRequestRecord` | Lưu yêu cầu học vụ gửi Giáo vụ xử lý |

### 2.4. Phân hệ Tự luyện `Study Zone`
| Endpoint | Method | Auth | Query / Params | Response `data` | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `/study-zone/categories/:category` | `GET` | Public | `grammar \| vocabulary \| listening` | `StudyStageGroup[]` | Danh sách chuyên đề & bài luyện tập |
| `/study-zone/exercises/:exerciseId` | `GET` | Public | — | `StudyExercise` | Trả câu hỏi tự luyện kèm audio nghe lại tự do |
| `/study-zone/exercises/:exerciseId/submit` | `POST` | Public / Optional Auth | `{ answers: Record<string, string> }` | `StudySubmissionResult` | Chấm điểm & trả giải thích chi tiết |

### 2.5. Phân hệ Thi trực tuyến `Test Online TOEIC`
| Endpoint | Method | Auth / Bảo mật | Request Payload | Response `data` | Quy tắc bảo mật bắt buộc trên Backend |
| --- | --- | --- | --- | --- | --- |
| `/tests` | `GET` | Public | `?skillCategory=listening_reading` | `TestSummaryItem[]` | Chỉ trả đề `status = 'published'` |
| `/tests/:slug` | `GET` | Public | — | `Test` (cấu trúc Part, thời lượng, hướng dẫn) | **TUYỆT ĐỐI KHÔNG** trả `correctOptionId` và `explanation` trong payload đề thi |
| `/attempts/start` | `POST` | Auth (hoặc Guest Session Token) | `{ testId, mode: 'full' \| 'practice', selectedParts: number[], durationMinutes: number }` | `TestAttempt` | Kiểm tra `allowPartSelection`, `allowStandaloneSelection`, lưu snapshot phiên bản đề `testVersionId` |
| `/attempts/:attemptId` | `GET` | Owner Only | — | `TestAttempt` + Đề thi (ẩn đáp án nếu `status = 'in_progress'`) | Trả `403` / `404` nếu `attempt.userId !== req.user.id` |
| `/attempts/:attemptId/progress` | `PATCH` | Owner Only | `{ answers, flaggedQuestionIds, currentQuestionIndex, currentPartNumber, audioPlayedKeys }` | `{ savedAt: string }` | Từ chối ghi đè nếu `status === 'submitted'` hoặc đã quá `expiresAt` + ân hạn mạng (5s) |
| `/attempts/:attemptId/submit` | `POST` | Owner Only | `{ answers, flaggedQuestionIds, submitReason: 'manual' \| 'timeout' }` | `TestAttemptResult` | Chấm điểm trên Server bằng `serverTestAnswerKeys` + `ScoreConversionTable` của phiên bản đề lúc bắt đầu thi |
| `/attempts/:attemptId/result` | `GET` | Owner Only | — | `TestAttemptResult` (có đáp án đúng & `explanation`) | Chỉ mở khóa đáp án & giải thích sau khi `attempt.status === 'submitted'` |
| `/test-history` | `GET` | Auth (`student`) | `?page=&limit=` | `TestHistorySummary[]` | Lọc cứng `WHERE user_id = req.user.id` |
| `/test-history/:attemptId` | `GET` | Owner Only | — | `TestAttemptResult` | Đọc từ bản ghi kết quả bất biến (Snapshot) |

---

## 3. CÁC ENDPOINT BACKOFFICE ĐỀ XUẤT (ĐỂ ĐỒNG BỘ DỮ LIỆU VỚI ADMIN / GIÁO VỤ / GIẢNG VIÊN / KẾ TOÁN)

Các endpoint dưới đây chưa cần UI trong repo Frontend Học viên hiện tại, nhưng Backend Node.js cần xây dựng để cung cấp dữ liệu nguồn cho các API ở Mục 2:
- **Admin:** `PUT /admin/center-info`, `CRUD /admin/branches`, `CRUD /admin/courses`, `CRUD /admin/news`, `CRUD /admin/careers`, `CRUD /admin/tests` (tạo phiên bản đề mới `TestVersion` khi sửa đề đã có học viên làm bài).
- **Giáo vụ:** `CRUD /academic/classes`, `POST /academic/enrollments` (xếp học viên vào lớp), `PUT /academic/support-requests/:id/resolve`, `POST /academic/exam-results` (nhập điểm Mid-test / Final-test).
- **Giảng viên:** `POST /teacher/classes/:classId/assignments`, `PATCH /teacher/submissions/:id/grade` (xác nhận Đạt / Cần làm lại), `PUT /teacher/lessons/:lessonId/attendance`.
- **Kế toán:** `POST /accounting/tuition-payments` (ghi nhận thu học phí & chốt `agreedTuitionVnd` cho `Enrollment`).
