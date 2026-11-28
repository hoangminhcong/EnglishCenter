> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/migration/MIGRATION_CHANGELOG.md`.

# NHẬT KÝ THAY ĐỔI DỌN DẸP & CHUẨN HÓA HỆ THỐNG (CLEANUP CHANGELOG)

Tài liệu này liệt kê đầy đủ và chính xác các file đã **xóa**, **chỉnh sửa** và **tạo mới** trong quá trình thực hiện Kiểm toán Toàn diện, Đồng bộ Nguồn dữ liệu và Dọn dẹp Mã nguồn cho dự án **English Center**.

---

## 1. CÁC FILE MÃ NGUỒN ĐÃ XÓA (`5 FILES`)

| STT | Đường dẫn file đã xóa | Lý do xóa |
| --- | --- | --- |
| 1 | `src/features/study-zone/components/StudyTopicCard.tsx` | Component cũ không còn bất kỳ nơi nào import (đã thay bằng `StudyTimelineAccordion.tsx`). |
| 2 | `src/features/test-online/components/DurationSelector.tsx` | Component chọn giờ rời thế hệ cũ không còn sử dụng (đã tích hợp vào `TestDetailPage.tsx`). |
| 3 | `src/features/test-online/components/PartSelector.tsx` | Component chọn Part cũ không còn sử dụng (đã tích hợp bảng Part vào `TestDetailPage.tsx`). |
| 4 | `src/features/test-online/components/TestInfo.tsx` | Component mô tả đề thi cũ không còn sử dụng. |
| 5 | `src/features/test-online/components/TestSummary.tsx` | Component tóm tắt kết quả sơ khai cũ (đã thay bằng `TestResultSummary.tsx`). |

---

## 2. CÁC FILE MÃ NGUỒN ĐÃ CHỈNH SỬA & CHUẨN HÓA (`22 FILES`)

### Nhóm Định tuyến & Khung Bố cục (`Router & Layouts`)
1. [router.tsx](file:///d:/Web/english-center-mini/src/app/router.tsx): Kết nối lazy-import qua các barrel `index.ts` của feature; hợp nhất `/student/history` và `/student/history/:attemptId` thành `<Navigate replace />` về `/test-history` và `/test-history/:attemptId`.
2. [StudentLayout.tsx](file:///d:/Web/english-center-mini/src/layouts/StudentLayout.tsx): Chuẩn hóa thương hiệu `ENGLISH CENTER`, đọc `centerInfo.slogan` và bổ sung `usePageTitle('Cổng học viên')`.
3. [Header.tsx](file:///d:/Web/english-center-mini/src/layouts/components/Header.tsx): Tách Topbar (`relative z-[60]`) và thanh `<header>` xanh dương (`sticky top-0 z-40`) để thanh menu luôn bám dính đầu màn hình khi cuộn mà không che khuất dropdown tài khoản.

### Nhóm Xác thực (`Auth`)
4. [UserAccountDropdown.tsx](file:///d:/Web/english-center-mini/src/features/auth/components/UserAccountDropdown.tsx): Đồng bộ đường dẫn Lịch sử làm bài về Canonical Route `/test-history`.
5. [authMockData.ts](file:///d:/Web/english-center-mini/src/features/auth/mocks/authMockData.ts): Chuẩn hóa tên miền email mẫu sang `@student.englishcenter.edu.vn` và tên hiển thị `English Center`.
6. [authService.ts](file:///d:/Web/english-center-mini/src/features/auth/services/authService.ts): Chuẩn hóa thông báo nghiệp vụ theo thương hiệu `English Center`.
7. [AuthPage.tsx](file:///d:/Web/english-center-mini/src/features/auth/pages/AuthPage.tsx): Đồng bộ tiêu đề, thương hiệu `English Center` và luồng điều hướng sau đăng nhập về `/`.
8. [ForgotPasswordPage.tsx](file:///d:/Web/english-center-mini/src/features/auth/pages/ForgotPasswordPage.tsx): Chuẩn hóa placeholder email mẫu và tiêu đề trang.
9. [ResetPasswordPage.tsx](file:///d:/Web/english-center-mini/src/features/auth/pages/ResetPasswordPage.tsx): Chuẩn hóa thương hiệu `English Center`.

### Nhóm Dữ liệu Dùng chung Website & Cổng học viên (`Public Website & Student Portal`)
10. [center-info.ts](file:///d:/Web/english-center-mini/src/config/center-info.ts): Đồng bộ mã lộ trình tư vấn (`consultationOptions.routes`) khớp 100% với danh mục `courses/mocks.ts`.
11. [branches.ts](file:///d:/Web/english-center-mini/src/features/about/mocks/branches.ts): Chi nhánh Trực tuyến tham chiếu trực tiếp `centerInfo.hotline` và `centerInfo.name`.
12. [types.ts](file:///d:/Web/english-center-mini/src/features/about/types.ts): Bổ sung kiểu chuẩn `PublishStatus`, `JobStatus` và khóa ngoại `branchId` cho tin tuyển dụng.
13. [jobs.ts](file:///d:/Web/english-center-mini/src/features/about/mocks/jobs.ts): Liên kết tin tuyển dụng trực tiếp với `branches` qua `branchId` (xóa bỏ tên cơ sở lệch `Cầu Giấy`).
14. [careerApi.ts](file:///d:/Web/english-center-mini/src/features/about/api/careerApi.ts): Chỉ lọc các tin không phải `draft`/`archived` cho trang công khai.
15. [CareerDetailPage.tsx](file:///d:/Web/english-center-mini/src/features/about/pages/CareerDetailPage.tsx): Tự động khóa nút `"Ứng tuyển ngay"` khi vị trí đóng tuyển (`closed`) hoặc quá hạn `deadline`.
16. [scheduleMockData.ts](file:///d:/Web/english-center-mini/src/features/schedules/mocks/scheduleMockData.ts): Sửa 2 bản ghi lịch khai giảng bị lệch `courseId` sang đúng ID khóa học chuẩn trong `courses/mocks.ts`.
17. [studentPortal.types.ts](file:///d:/Web/english-center-mini/src/features/student-portal/model/studentPortal.types.ts): Chuẩn hóa mô tả Domain Model `English Center`.
18. [studentPortalMockData.ts](file:///d:/Web/english-center-mini/src/features/student-portal/mocks/studentPortalMockData.ts): Tham chiếu tên khóa học và tên cơ sở trực tiếp từ `courses` & `branches`, đổi mã lớp sang `EC-S01`, nâng cấp khóa lưu trữ `ec_portal_*_v2_*`.
19. [StudentLearningPlanPage.tsx](file:///d:/Web/english-center-mini/src/features/student-portal/pages/StudentLearningPlanPage.tsx): Bổ sung `min-w-[640px]` cho bảng tổng hợp kế hoạch học tập trên màn hình nhỏ.

### Nhóm Tự luyện `Study Zone` & Thi trực tuyến `Test Online`
20. [StudyExercisePage.tsx](file:///d:/Web/english-center-mini/src/features/study-zone/pages/StudyExercisePage.tsx): Đồng bộ thương hiệu `ENGLISH CENTER` và tối ưu padding thanh công cụ trên Mobile.
21. [testMockData.ts](file:///d:/Web/english-center-mini/src/features/test-online/mocks/testMockData.ts): Cấp tiền tố câu hỏi & đáp án độc lập `'t01'`..`'t12'` cho toàn bộ 12 đề TOEIC; đổi mã đề `HMC-2025-T01/T02` sang `EC-2025-T01/T02`.
22. [attemptService.ts](file:///d:/Web/english-center-mini/src/features/test-online/services/attemptService.ts), [attemptApi.ts](file:///d:/Web/english-center-mini/src/features/test-online/api/attemptApi.ts), [historyApi.ts](file:///d:/Web/english-center-mini/src/features/test-online/api/historyApi.ts), [TestDetailPage.tsx](file:///d:/Web/english-center-mini/src/features/test-online/pages/TestDetailPage.tsx), [TestListPage.tsx](file:///d:/Web/english-center-mini/src/features/test-online/pages/TestListPage.tsx), [TestResultSummary.tsx](file:///d:/Web/english-center-mini/src/features/test-online/components/TestResultSummary.tsx), [TestSubmitModal.tsx](file:///d:/Web/english-center-mini/src/features/test-online/components/TestSubmitModal.tsx), [QuestionNavigator.tsx](file:///d:/Web/english-center-mini/src/features/test-online/components/QuestionNavigator.tsx): Vá triệt để lỗi IDOR (`ownerId`), thực thi cờ `allowStandaloneSelection`, bổ sung `aria-label` trạng thái câu hỏi, tối ưu bảng Part trên màn `320px` và đồng bộ thương hiệu `English Center`.

---

## 3. BỘ TÀI LIỆU KIỂM TOÁN & KỸ THUẬT TRONG `docs/` (`16 BÁO CÁO TRỌNG TÂM`)

- **Nhóm Part A (8 files):** `FRONTEND_AUDIT_REPORT.md`, `SHARED_DATA_SYNC_AUDIT.md`, `DATA_FLOW_MAP.md`, `RESPONSIVE_AUDIT.md`, `FRONTEND_API_CONTRACT.md`, `FRONTEND_DATA_MODEL.md`, `BACKEND_READINESS_CHECKLIST.md`, `BUG_FIX_LOG.md`.
- **Nhóm Part B (8 files):** `CODEBASE_AUDIT.md`, `DUPLICATE_CODE_REPORT.md`, `LEGACY_CODE_REPORT.md`, `ROUTER_AUDIT.md`, `CSS_CONFLICT_REPORT.md`, `CLEANUP_CHANGELOG.md`, `REGRESSION_TEST_REPORT.md`, `REMAINING_ISSUES.md`.
