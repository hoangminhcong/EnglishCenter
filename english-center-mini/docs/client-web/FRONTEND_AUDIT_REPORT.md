# BÁO CÁO KIỂM TOÁN TOÀN DIỆN FRONTEND – ENGLISH CENTER

- **Dự án:** English Center (`english-center-mini`)
- **Phạm vi kiểm toán:** Public Website, Student Portal, Study Zone, Test Online TOEIC, Hệ thống màu sắc & thương hiệu, Đồng bộ nguồn dữ liệu (Single Source of Truth), Responsive, Bảo mật Client-side & Khả năng sẵn sàng tích hợp Backend Node.js.
- **Ngày hoàn tất:** 24/11/2026

---

## 1. TỔNG QUAN CÔNG NGHỆ & KIẾN TRÚC THỰC TẾ

### 1.1. Stack công nghệ đang vận hành trong dự án
| Nhóm công nghệ | Thư viện / Phiên bản (`package.json`) | Hiện trạng sử dụng thực tế |
| --- | --- | --- |
| UI Runtime | `react@^19.2.4`, `react-dom@^19.2.4` | Toàn bộ ứng dụng SPA |
| Ngôn ngữ & Kiểu dữ liệu | `typescript@~6.0.2` (`strict: true`) | Kiểm tra kiểu nghiêm ngặt `tsc -b` không lỗi |
| Bundler | `vite@^8.0.8` | Build production & Code-splitting theo từng trang (`lazy()`) |
| Styling | `tailwindcss@^4.2.2`, `@tailwindcss/vite` | Một file CSS gốc duy nhất `src/index.css` |
| Định tuyến | `react-router-dom@^7.14.1` | `createBrowserRouter` tại `src/app/router.tsx` |
| HTTP Client | `axios@^1.15.0` | Đã cấu hình Interceptor Bearer Token + bắt lỗi `401` tại `src/services/api/httpClient.ts` |
| Server State | `@tanstack/react-query@^5.99.1` | Dùng chính thức trong `student-portal` (`useStudentPortal.ts`) và bọc toàn app qua `QueryClientProvider` |
| Validation | `zod@^4.3.6` | Xác thực schema form nộp bài tập & yêu cầu học vụ tại `studentPortal.schema.ts` |
| Iconography | `lucide-react@^1.16.0` | Đồng bộ bộ icon vector trên toàn hệ thống |
| Linter | `oxlint@^1.60.0` | Chạy kiểm tra tĩnh với **0 warnings, 0 errors** |

> **Ghi chú trung thực về thư viện chưa cài đặt:** `zustand` và `react-hook-form` không được cài trong `package.json`. Dự án hiện quản lý phiên đăng nhập qua `AuthContext` (`src/features/auth/context/AuthProvider.tsx`) và quản lý form bằng Controlled State kết hợp `validators.ts` / `zod`. Thiết kế này nhẹ, rõ ràng và không phát sinh xung đột state.

### 1.2. Kiến trúc phân tầng (Feature-Based Architecture)
Dự án tuân thủ cấu trúc `feature-sliced` rõ ràng:
- `src/app/`: `App.tsx`, `router.tsx`, `ProtectedRoute.tsx`.
- `src/config/`: `center-info.ts` (nguồn chuẩn thương hiệu `English Center`, hotline, email, địa chỉ, thông số tư vấn), `navigation.ts`.
- `src/layouts/`: `PublicLayout.tsx` (Topbar `z-[60]` + Sticky Blue Header `z-40` + Footer), `StudentLayout.tsx` (Sidebar học viên + Print layout).
- `src/services/api/`: `apiConfig.ts` (`VITE_USE_MOCK_API`), `endpoints.ts`, `httpClient.ts`, `queryClient.ts`, `mockUtils.ts`.
- `src/features/`:
  1. `auth`: Đăng nhập, Đăng ký, Quên mật khẩu, Đặt lại mật khẩu, Đổi mật khẩu, Dropdown tài khoản.
  2. `about`: Giới thiệu, Cơ sở đào tạo, Tin tức, Tuyển dụng.
  3. `courses`: Danh sách khóa học, Chi tiết khóa học, Form nhận tư vấn lộ trình.
  4. `schedules`: Lịch khai giảng theo cơ sở/tháng, Modal đăng ký tư vấn lớp.
  5. `student-news` & `articles`: Thành tích học viên công khai & Kho bài viết phương pháp học.
  6. `learning-materials`: Tài liệu Luyện Nghe – Đọc và Tổng hợp đề thi chuẩn ETS.
  7. `student-portal`: Tổng quan khóa học, Kế hoạch học tập, Thời khóa biểu, Bài tập Giảng viên giao, Điểm danh, Kết quả thi Mid/Final, Yêu cầu bảo lưu/chuyển lớp/hỗ trợ.
  8. `study-zone`: Kho tự luyện Ngữ pháp, Từ vựng, Luyện nghe mở tự do (có trình phát âm thanh hình viên thuốc nghe lại nhiều lần).
  9. `test-online`: Hệ thống thi trực tuyến TOEIC Listening & Reading (12 đề, chế độ Full Test & Practice theo Part, đồng hồ đếm ngược, âm thanh ẩn phát 1 lần tự chuyển câu ở Part 1–4, chuyển câu tự do ở Part 5–7, bảng điểm quy đổi LC/RC, lịch sử bài làm và màn hình xem lại đáp án chi tiết).

---

## 2. KIỂM TRA THƯƠNG HIỆU & HỆ THỐNG MÀU SẮC

### 2.1. Đồng bộ thương hiệu `English Center`
- Toàn bộ giao diện hiển thị (Header, Footer, Trang chủ, Giới thiệu, Liên hệ, Đăng nhập/Đăng ký/Quên mật khẩu, Cổng học viên `StudentLayout`, Study Zone, Test Online, Bảng kết quả thi, Tiêu đề tab `document.title`) đã được chuẩn hóa thống nhất thành **`English Center`** / **`ENGLISH CENTER`**.
- Toàn bộ chuỗi thương hiệu cũ còn sót (`HMC TOEIC`, email `@hmctoeic.edu.vn`, mã lớp `HMC-S01`, mã đề `HMC-2025-T01/T02`, khóa lưu trữ `hmc_portal_*`) đã được thay thế hoàn toàn sang chuẩn `English Center` (`@englishcenter.edu.vn`, `EC-S01`, `EC-2025-T01/T02`, `ec_portal_*`).

### 2.2. Hệ thống màu sắc chuẩn (Sky Blue & Clean Academic UI)
Hệ thống biến CSS tại `src/index.css` và các utility Tailwind tuân thủ nhất quán bảng màu xanh dương nhạt dịu mắt:
- **Màu chủ đạo thương hiệu (`--ec-primary`):** `#75BDEB` (Header chính, thanh nhấn dọc khung câu hỏi, tab/viền chủ đạo).
- **Màu xanh đậm tạo độ tương phản chữ (`--ec-primary-dark`):** `#2878B8` (Chữ nhấn, link, badge thông tin, nút phụ).
- **Màu nền xanh nhạt (`--ec-soft-blue` / `--ec-bg`):** `#EAF6FD` / `#F5FAFE`.
- **Nền thẻ nội dung:** `#FFFFFF`, viền `#DCEAF3`.
- **Văn bản:** Chính `#243B53`, phụ `#718096`.
- **Điểm nhấn hành động chính (CTA):** `#F26522` (Nút `TEST ONLINE`, `NỘP BÀI`, `LÀM LẠI`, `NHẬN TƯ VẤN`).
- **Trạng thái ngữ nghĩa:** Đúng/Đạt `#1F7A4C` (`#E3F5EC`), Cảnh báo `#9E6300` (`#FFF3D6`), Lỗi/Sai `#B93A2E` (`#FDECE9`).

---

## 3. KIỂM TRA CHỨC NĂNG THEO 4 PHÂN KHU

### A. Public Website
- **Hoạt động ổn định:** Trang chủ (`/`), Về chúng tôi (`/about`), Cơ sở đào tạo (`/branches`), Tin tức (`/news`, `/news/:slug`), Tuyển dụng (`/careers`, `/careers/:slug`), Khóa học (`/courses`, `/courses/:slug`), Lịch khai giảng (`/schedule`), Thành tích học viên (`/students`, `/students/:slug`), Tài liệu TOEIC (`/learning-materials/*`), Liên hệ (`/contact`).
- **Cải tiến sau kiểm toán:**
  - Chi nhánh trực tuyến (`branches.ts`) lấy trực tiếp `centerInfo.hotline` và `centerInfo.name`.
  - Tin tuyển dụng (`jobs.ts`, `CareerDetailPage.tsx`) liên kết khóa ngoại `branchId` với `branches.ts` và tự động khóa nút `"Ứng tuyển ngay"` khi vị trí đóng tuyển (`closed`) hoặc quá hạn `deadline`.
  - Lịch khai giảng (`scheduleMockData.ts`) đồng bộ 100% `courseId` với `courses/mocks.ts` (khắc phục lỗi 2 lịch khai giảng bị ẩn do lệch mã khóa học).

### B. Authentication & Authorization
- **Luồng xác thực:** Đăng nhập / Đăng ký (`/auth`), Quên mật khẩu (`/auth/forgot-password`), Đặt lại mật khẩu (`/auth/reset-password`), Đổi mật khẩu (`/student/change-password`).
- **Sau đăng nhập:** Chuyển hướng mặc định về trang chủ Website (`/`) hoặc trang người dùng đang truy cập dở (`state.from`), không ép chuyển sang `/student` đối với học viên chưa có lớp học.
- **Bảo vệ route (`ProtectedRoute.tsx`):** Kiểm tra trạng thái đăng nhập và `allowedRoles`, hiển thị skeleton mượt mà khi khôi phục phiên và tránh vòng lặp redirect.
- **Bảo mật dữ liệu phiên:** `AuthUser` không chứa `password` hay `passwordHash`; mật khẩu mẫu chỉ đối chiếu nội bộ tại tầng giả lập Server (`authMockData.ts`).

### C. Student Portal (`/student/*`)
- **Phân tách rõ 2 trạng thái tài khoản:**
  1. Học viên đã được xếp lớp (`stu-001` Đỗ Như Đạt, `stu-002` Nguyễn Minh Anh): Xem đầy đủ Dashboard, Kế hoạch học tập 24 buổi, Thời khóa biểu theo tuần, Bài tập Giảng viên giao & Nộp bài (kèm Zod validation link Google Drive), Điểm danh, Kết quả Mid-test / Final-test và Gửi yêu cầu học vụ.
  2. Học viên mới đăng ký chưa ghi danh lớp (`stu-003` hoặc tài khoản đăng ký mới): Hiển thị `NoEnrollmentCard` hướng dẫn xem khóa học, lịch khai giảng hoặc tự luyện tại Study Zone / Test Online mà không gặp lỗi crash dữ liệu rỗng (`null`).

### D. Study Zone & Test Online TOEIC
- **Tách biệt rạch ròi nghiệp vụ:**
  - **Study Zone (`/study-zone/*`):** Kho tự luyện mở tự do, không giới hạn thời gian, cho phép chuyển câu tự do và hiển thị trình phát âm thanh hình viên thuốc (`#F1F3F4`) nghe lại nhiều lần.
  - **Bài tập Giảng viên giao (`/student/assignments`):** Gắn chặt với lớp học (`classInfo`), buổi học (`sessionNumber`), hạn nộp (`dueDate`) và trạng thái Giảng viên xác nhận.
  - **Test Online (`/test-online/*`):**
    - Hỗ trợ 12 đề TOEIC Listening & Reading (10 đề bộ 2026 + 2 đề bộ 2025), mỗi đề có tiền tố mã câu hỏi và đáp án riêng (`t01`..`t12`).
    - Cấu trúc chuẩn khung câu hỏi 2 cột thống nhất cho mọi Part 1–7, mỗi câu hỏi đều hỗ trợ bộ 3 trường `{ questionText, audioUrl, imageUrl }` (ẩn gọn phần khuyết mà vẫn giữ nguyên bố cục 2 cột).
    - **Chế độ thi nghiêm ngặt (`exam`):** Nút `BẮT ĐẦU` căn giữa dưới bảng hướng dẫn mỗi Part; Part 1–4 phát âm thanh ngầm 1 lần duy nhất (ẩn thanh điều khiển audio), khóa chuyển câu/Part thủ công và tự động sang câu/cụm câu kế tiếp ngay khi hết audio; sang Part 5–7 khóa vĩnh viễn Part 1–4 và mở tự do chuyển qua lại mọi câu đơn lẫn cụm câu đọc hiểu mà không bị nhảy cuộn lên đầu trang.
    - **Chữa bài & Lịch sử (`/test-online/results/:attemptId`, `/test-history`):** Hiển thị lại thanh âm thanh hình viên thuốc để nghe lại, khung `Giải thích:` nền xanh nhạt `#F0F7FF` in đậm phương án đúng, phông số `tabular-nums` đồng bộ và phân lập quyền sở hữu dữ liệu bài làm (`ownerId`) giữa các tài khoản.

---

## 4. TỔNG HỢP VẤN ĐỀ PHÁT HIỆN & ĐÃ XỬ LÝ THEO MỨC ĐỘ ƯU TIÊN

| Mã | Mức độ | Khu vực | Mô tả vấn đề | Trạng thái |
| --- | --- | --- | --- | --- |
| `AUD-01` | **P0 (Critical)** | Test Online / Security | Lỗ hổng IDOR ở tầng Mock Service: người dùng khác hoặc khách chưa đăng nhập có thể đọc `Attempt` / `TestHistory` của `stu-001` nếu biết `attemptId` hoặc dùng fallback mặc định. | **Đã sửa triệt để** |
| `AUD-02` | **P1 (High)** | Shared Data Sync | Lệch tên cơ sở (`Cơ sở 1 – Cầu Giấy` vs `Cơ sở 1 – Hà Đông`) và lệch `courseId` (`speaking-writing`, `master-toeic`) giữa `branches.ts`, `jobs.ts`, `scheduleMockData.ts` và `studentPortalMockData.ts`. | **Đã sửa triệt để** |
| `AUD-03` | **P1 (High)** | Test Online Data | Các đề `TEST 5..10 – 2026` và `TEST 1..2 – 2025` dùng trùng tiền tố câu hỏi `t01..t06` và còn mã đề cũ `HMC-2025-T01/T02`. | **Đã sửa triệt để (`t01..t12`, `EC-2025-*`)** |
| `AUD-04` | **P1 (High)** | Test Online Config | Trang chi tiết đề `TestDetailPage.tsx` chưa kiểm tra cờ `test.allowPartSelection` và `part.allowStandaloneSelection` trong hàm `togglePart`. | **Đã sửa triệt để** |
| `AUD-05` | **P2 (Medium)** | Brand Consistency | Còn sót thương hiệu cũ `HMC TOEIC` trong `StudentLayout`, `AuthPage`, `ResetPasswordPage`, `StudyExercisePage`, `TestListPage`, `TestResultSummary` và mock data. | **Đã sửa 100%** |
| `AUD-06` | **P2 (Medium)** | Router & Dead Code | Tồn tại 2 route trùng lặp cho lịch sử bài làm (`/student/history` và `/test-history`) và 5 component cũ không còn được import. | **Đã dọn sạch & chuẩn hóa redirect** |
| `AUD-07` | **P2 (Medium)** | Responsive & A11y | Bảng cấu trúc Part trên màn `320px` hơi chật cột câu; bảng tổng hợp Kế hoạch học tập thiếu `min-w`; nút tròn câu hỏi `QuestionNavigator` chưa có `aria-label` trạng thái chi tiết. | **Đã sửa triệt để** |
| `AUD-08` | **P3 (Backend Dep.)** | Backend Security | Đáp án chuẩn `serverTestAnswerKeys` hiện nằm trong bundle Mock ở client khi `VITE_USE_MOCK_API !== 'false'`; JWT HttpOnly / RBAC thực tế cần Backend Node.js thực thi. | **Đã tách tầng & tài liệu hóa cho Backend** |
