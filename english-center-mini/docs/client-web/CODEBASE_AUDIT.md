# BÁO CÁO KIỂM KÊ MÃ NGUỒN & PHÂN TÍCH ĐỒ THỊ PHỤ THUỘC (CODEBASE AUDIT)

- **Dự án:** English Center (`d:\Web\english-center-mini`)
- **Điểm khởi phát phân tích (Entry Point):** `src/main.tsx` -> `src/app/App.tsx` -> `src/app/router.tsx`
- **Phương pháp:** Quét toàn bộ cây thư mục `src/` bằng trình phân tích đồ thị import tĩnh (`import` / `export ... from` / `lazy(() => import(...))`), đối chiếu với Git working tree (không tự động commit/push).

---

## 1. THỐNG KÊ TỔNG QUAN MÃ NGUỒN TRƯỚC & SAU KHI DỌN DẸP

| Chỉ số kiểm kê | Trước khi dọn dẹp | Sau khi dọn dẹp & chuẩn hóa |
| --- | --- | --- |
| Tổng số file trong `src/` | `184` files | `179` files |
| Số file kết nối trực tiếp vào đồ thị chạy từ `src/main.tsx` | `174` files | `178` files |
| Số file mồ côi / không bao giờ được gọi (`Unreachable`) | `10` files (`5` component cũ + `4` file barrel `index.ts` bị bỏ quên + `1` ambient type) | **`1` file duy nhất** (`src/vite-env.d.ts` — file khai báo kiểu môi trường của trình biên dịch Vite, bắt buộc giữ) |
| Số file CSS toàn cục | `1` (`src/index.css`) | `1` (`src/index.css`) |
| Số lần xuất hiện thương hiệu cũ (`HMC TOEIC` / `Zenlish`) trong UI & code | `28+` vị trí | **`0` vị trí** |

---

## 2. KIỂM KÊ CẤU TRÚC THƯ MỤC HIỆN TẠI (`179 FILES`)

- **`src/main.tsx` & `src/vite-env.d.ts` (2 files):** Khởi tạo React Root và khai báo kiểu Vite.
- **`src/index.css` (1 file):** Cấu hình Tailwind CSS v4, biến màu `--ec-*`, typography `.ec-font` / `.ec-reading-font` và `@media print`.
- **`src/app/` (3 files):** `App.tsx`, `router.tsx`, `ProtectedRoute.tsx`.
- **`src/config/` (2 files):** `center-info.ts` (Single Source of Truth cho thương hiệu `English Center`), `navigation.ts`.
- **`src/layouts/` (8 files):** `PublicLayout.tsx`, `StudentLayout.tsx`, `Header.tsx`, `Footer.tsx`, `FooterAbout.tsx`, `FooterContact.tsx`, `FooterSocial.tsx`, `FloatingContact.tsx`, `BackToTop.tsx`, `ScrollToTop.tsx` (tổng 10 files trong `layouts/`).
- **`src/components/` (19 files):** Hệ thống UI dùng chung (`Button`, `Container`, `SectionHeading`, `CourseCard`, `ArticleCard`, `Breadcrumb`, `EmptyState`, `LoadingState`, `Pagination`, `SearchModal`, `ConsultFormCard`, `PageHeroBanner`, ...).
- **`src/services/api/` (5 files):** `apiConfig.ts`, `endpoints.ts`, `httpClient.ts`, `queryClient.ts`, `mockUtils.ts`.
- **`src/hooks/` & `src/utils/` (5 files):** `useAsync.ts`, `usePageTitle.ts`, `format.ts`, `safeUrl.ts`, `validators.ts`.
- **`src/pages/` (4 files):** `HomePage.tsx`, `ContactPage.tsx`, `NotFoundPage.tsx`, `RouteErrorPage.tsx`.
- **`src/features/` (128 files chia thành 10 module nghiệp vụ):**
  - `about` (15 files), `articles` (4 files), `auth` (15 files), `courses` (9 files), `learning-materials` (7 files), `schedules` (11 files), `student-news` (2 files), `student-portal` (17 files), `study-zone` (17 files), `test-online` (29 files).

---

## 3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ: TẠI SAO GIAO DIỆN CŨ / TÊN CŨ / DỮ LIỆU CŨ TỪNG XUẤT HIỆN LẠI?

Qua kiểm tra toàn bộ luồng nạp module, router và bộ nhớ trình duyệt, đội ngũ xác định **4 nguyên nhân gốc rễ chính xác**:

1. **Bộ nhớ đệm `localStorage` giữ lại bản ghi Mock thế hệ cũ (Nguyên nhân lớn nhất gây hiện lại dữ liệu cũ):**
   - Các dịch vụ `attemptService.ts`, `studentPortalMockData.ts` và `authService.ts` lưu dữ liệu giả lập vào `localStorage` của trình duyệt. Khi cấu trúc đề thi hoặc email/tên thương hiệu trong code được sửa nhưng khóa lưu trữ (`storage key`) không tăng phiên bản, trình duyệt vẫn ưu tiên đọc JSON cũ đã lưu từ phiên trước.
   - **Cách khắc phục triệt để:** Nâng phiên bản toàn bộ khóa lưu trữ sang chuẩn mới (`ec_toeic_test_seeded_v5`, `ec_portal_submissions_v2_*`, `ec_portal_support_requests_v2_*`) và tự động chuẩn hóa trường dữ liệu qua `normalizeQuestionMedia`.
2. **Tồn tại 2 đường dẫn Router song song cho cùng một màn hình Lịch sử bài làm:**
   - `/student/history` và `/test-history` từng cùng trỏ tới `TestHistoryPage`, khiến menu tài khoản (`UserAccountDropdown`) dẫn người dùng vào một URL khác với các nút điều hướng nội bộ trong trang kết quả thi.
   - **Cách khắc phục triệt để:** Hợp nhất về đường dẫn chuẩn `/test-history` và `/test-history/:attemptId`, chuyển `/student/history*` thành `<Navigate replace />`.
3. **Phân mảnh nguồn thương hiệu giữa các đợt phát triển tính năng:**
   - Phần khung Website ban đầu đọc từ `src/config/center-info.ts` (`English Center`), nhưng các trang xây dựng bổ sung sau (`StudentLayout`, `AuthPage`, `StudyExercisePage`, `TestListPage`, `TestResultSummary`) lại viết cứng chuỗi `"HMC TOEIC"` trực tiếp trong JSX.
   - **Cách khắc phục triệt để:** Quy chiếu toàn bộ về `centerInfo` và chuẩn hóa thống nhất thương hiệu `English Center` trên mọi file.
4. **Còn sót 5 file Component từ thiết kế cũ chưa xóa khỏi thư mục `src/`:**
   - Sau khi nâng cấp giao diện Study Zone & Test Online theo bộ 9 ảnh mẫu mới, 5 component cũ (`StudyTopicCard`, `DurationSelector`, `PartSelector`, `TestInfo`, `TestSummary`) không còn được trang nào gọi nhưng vẫn nằm trong thư mục `components/`, dễ gây nhầm lẫn khi bảo trì.
   - **Cách khắc phục triệt để:** Xác minh đồ thị import = 0 tham chiếu và xóa sạch cả 5 file.
