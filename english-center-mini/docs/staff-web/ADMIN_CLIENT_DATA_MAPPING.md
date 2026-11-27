# BẢNG ĐỐI CHIẾU DỮ LIỆU STAFF WEB & CLIENT WEB (`ADMIN_CLIENT_DATA_MAPPING`)

Tài liệu này đối chiếu từng thực thể giữa `apps/staff-web`, `apps/client-web` và `@english-center/contracts` để bảo đảm **không tạo nguồn dữ liệu mâu thuẫn** và sẵn sàng nối chung một Backend Node.js + Database duy nhất.

---

## 1. BẢNG ÁNH XẠ THỰC THỂ TOÀN HỆ THỐNG

| Module Staff | Module Client | Thực thể | Source Type (`client-web`) | Source Mock/Service (`client-web`) | API Contract (`@english-center/contracts`) | Khóa định danh (ID) | Trạng thái đồng bộ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/accounts` | `auth` & `student-portal` | `UserAccount` + `StudentProfile / TeacherProfile / EmployeeProfile` | `auth/types.ts`, `studentPortal.types.ts` | `studentPortalMockData.ts` | `UserAccountContract`, `StudentProfileContract`, `TeacherProfileContract`, `EmployeeProfileContract` | `id` (`acc-*`, `stu-*`, `tea-*`, `emp-*`) | **ĐÃ KHỚP** |
| `/roles` | *(Nội bộ Staff)* | `RoleDefinition` + `PermissionCode` | *(Không hiển thị ở Client)* | *(Staff RBAC)* | `StaffRole`, `PermissionCode` (mở rộng chi tiết tại `staff-web/src/types/rbac.types.ts`) | `role` (`ADMIN`, `SALES`...) | **CẦN MỞ RỘNG CONTRACT** *(Đồng bộ mã quyền chi tiết từ `staff-web` lên `packages/contracts` khi dựng Backend)* |
| `/courses` | `courses` | `Course` | `features/courses/types.ts` | `features/courses/mocks.ts` | `CourseCatalogContractDto` | `id` & `slug` (`foundation-toeic`, `beginners-toeic`, `camp-bomb-toeic`, `submarine-toeic`) | **ĐÃ KHỚP** |
| `/tuition` | `courses` (`tuitionFee`) | `TuitionPolicy` | `Course.tuitionFee` | `features/courses/mocks.ts` | `TuitionPolicyContractDto` | `id` (`tp-*`) -> `courseId` | **CẦN MỞ RỘNG CONTRACT** *(Bổ sung trường ưu đãi & `history[]` vào DTO chung)* |
| `/training` (Tab 1) | `student-portal` | `Class` (Lớp thực tế) | `studentPortal.types.ts` | `studentPortalMockData.ts` (`EC-S01`) | `ClassContractDto` | `id` / `classCode` (`EC-S01`, `EC-CB02`...) | **ĐÃ KHỚP** |
| `/training` (Tab 2) | `schedules` | `Schedule` (Lịch khai giảng Website) | `features/schedules/types.ts` | `scheduleMockData.ts` | `ClassContractDto` / `ScheduleOpeningStatus` | `id` (`sch-onl-01`...) | **ĐÃ KHỚP** |
| `/content/center-info` | `config` & Layouts | `CenterInfo` | `config/center-info.ts` | `centerInfo` | *(Endpoint cấu hình `/cms/center-info`)* | Singleton (`center-info`) | **CẦN MỞ RỘNG CONTRACT** *(Đưa schema `CenterInfoSettings` vào `packages/contracts`)* |
| `/content/branches` | `about` & `schedules` | `Branch` | `features/about/types.ts` | `about/mocks/branches.ts` | `BranchContractDto` | `id` (`toeic-online`, `cs-ha-dong` .. `cs-quan-1`) | **ĐÃ KHỚP** |
| `/content/news` | `about` (`/about/news`) | `NewsPost` | `features/about/types.ts` | `about/mocks/news.ts` | `PublishStatus` + `StructuredContentBlock` | `id` / `slug` (`chuan-dau-ra-toeic`...) | **CẦN MỞ RỘNG CONTRACT** *(Hợp nhất `NewsPost.content: string[]` lên `StructuredContentBlock[]` giống `Article`)* |
| `/content/jobs` | `about` (`/about/careers`) | `JobPost` | `features/about/types.ts` | `about/mocks/jobs.ts` | `JobPostStatus` | `id` / `slug` (`giao-vien-toeic`...) | **ĐÃ KHỚP** |
| `/content/achievements` | `student-news` (`/hoc-vien`) | `StudentAchievement` | `features/articles/types.ts` (`category: 'student'`) | `articles/mocks.ts` | `StudentAchievementContractDto` | `id` (`ach-*`) | **ĐÃ KHỚP** *(Bổ sung kiểm soát cứng `publicConsentGranted`)* |
| `/learning/materials` (Public) | `learning-materials` | `Article` (`listening-reading`, `exam-review`) | `features/articles/types.ts` | `articles/mocks.ts` | `PublishStatus` | `id` / `slug` | **ĐÃ KHỚP** |
| `/learning/materials` (Theo nhóm) | `student-portal` | `ManagedMaterial` (`accessScope: 'by_group'`) | `studentPortal.types.ts` (Chỉ có tài liệu theo buổi lớp) | `studentPortalMockData.ts` | *(Chưa có trang Kho tài liệu nhóm trên Student Portal)* | `id` (`mat-*`) | **CLIENT CHƯA HỖ TRỢ** |
| `/learning/study-zone` | `study-zone` | `StudyCategory`, `StudyTopic`, `StudyExercise` | `features/study-zone/types.ts` | `studyZoneMockData.ts` | *(Cần đưa `StudyExercise` & `AnswerKey` tách rời vào `contracts`)* | `category` (`grammar`, `vocabulary`, `listening`), `topic.id`, `exercise.id` | **ĐÃ KHỚP** |
| `/learning/tests` (L&R) | `test-online` | `Test`, `TestPart`, `QuestionGroup`, `TestQuestion`, `ServerTestAnswerKey` | `test-online/types/test.types.ts` | `testMockData.ts` | `TestDefinitionContractDto`, `TestVersionContractDto` | `id` (`test-2026-01`, `test-2025-01`...) | **ĐÃ KHỚP** |
| `/learning/tests` (S&W) | `test-online` | `skillCategory: 'speaking_writing'` | *(Chưa hỗ trợ thu âm/tự luận)* | *(Chưa có)* | `ToeicSkillCategory` | — | **CLIENT CHƯA HỖ TRỢ** |
| `/config/toeic` | `test-online` & `courses` | `ScoreScaleVersion`, `ScoreConversionTable`, `ToeicMilestone` | `ScoreConversionPoint` | `scoringService.ts` | `TestVersionContractDto.scoreScaleVersionId` | `versionCode` (`TOEIC-SCALE-V2`), `milestone.id` (`ms-700`...) | **CẦN MỞ RỘNG CONTRACT** |

---

## 2. GAP ANALYSIS CHUYÊN SÂU: TEST ONLINE & STUDY ZONE

### 2.1. Khoảng cách tích hợp `Test Online` (Staff Authoring vs. Client Exam Room)

| Khía cạnh | Hiện trạng `apps/client-web` | Thiết kế đã chuẩn hóa tại `apps/staff-web` | Hành động khi nối Backend NestJS |
| :--- | :--- | :--- | :--- |
| **Lưu trữ Đáp án (`AnswerKey`)** | `serverTestAnswerKeys` nằm trong bundle Frontend Mock để chấm điểm tạm thời tại trình duyệt. | Tách hẳn `answerKeys` khỏi cây `parts -> groups -> questions`; có hàm `projectPublicStudentTestPayload()` loại bỏ sạch đáp án. | Chuyển logic chấm điểm (`scoringService`) về API `POST /api/v1/tests/:id/submit` trên Server. |
| **Phiên bản đề (`TestVersion`)** | Đề thi trên Client hiện chưa gắn `versionNumber` tường minh. | Tự động tăng `activeVersionNumber` (`v+1`) khi Admin sửa đề đã xuất bản hoặc đã có lượt làm bài (`attemptsCount > 0`). | Lưu bảng `test_versions` bất biến; mỗi `test_attempt` tham chiếu `testVersionId` cố định. |
| **Tệp âm thanh & Hình ảnh (`MediaRef`)** | Dùng WAV Data URL nội tuyến và URL ảnh tĩnh. | Quản lý qua `MediaRef` (`temporary \| ready \| failed`) kèm cảnh báo tệp phiên trình duyệt tạm thời. | Nối API Presigned Upload lên S3 / Cloudflare R2 để nhận URL lưu trữ bền vững (`status: 'ready'`). |

### 2.2. Khoảng cách tích hợp `Study Zone`

| Khía cạnh | Hiện trạng `apps/client-web` | Thiết kế đã chuẩn hóa tại `apps/staff-web` | Hành động khi nối Backend NestJS |
| :--- | :--- | :--- | :--- |
| **Danh mục kỹ năng** | Cố định 3 route `/study-zone/grammar`, `/vocabulary`, `/listening`. | Khóa cứng 3 slug danh mục, chỉ cho phép sửa mô tả & trạng thái kích hoạt. | Giữ nguyên enum 3 danh mục hoặc chuyển sang dynamic route nếu mở rộng kỹ năng thứ 4. |
| **Gắn bài tập vào Chủ đề con (`subTopics`)** | `gram-03` có thêm cấp `subTopics` lồng bên dưới `StudyTopic`. | Quản lý trực tiếp liên kết `Exercise -> Topic` và thứ tự câu hỏi. | Bổ sung bảng tùy chọn `study_sub_topics` nếu cần phân cấp 3 tầng cho chủ đề lớn. |
