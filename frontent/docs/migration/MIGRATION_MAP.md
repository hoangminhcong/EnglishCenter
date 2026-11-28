# BẢN ĐỒ & KẾ HOẠCH TÁI CẤU TRÚC MONOREPO – ENGLISH CENTER (`MIGRATION_MAP`)

- **Dự án:** English Center
- **Giai đoạn hiện tại:** Giai đoạn 0 (Baseline) & Giai đoạn 1 (Audit + Migration Plan)
- **Kiến trúc mục tiêu:** `npm Workspaces Monorepo` = **2 Frontend độc lập** (`apps/client-web`, `apps/staff-web`) + **4 Shared Packages có kiểm soát** (`packages/api-client`, `packages/contracts`, `packages/ui`, `packages/utils`) + **Định hướng Backend Modular Monolith** (`apps/backend/README.md`, chưa tham gia workspace ở giai đoạn này).
- **Nguyên tắc bất biến:** **DI CHUYỂN, CHUẨN HÓA VÀ BẢO TOÀN — KHÔNG XÂY LẠI TỪ ĐẦU, KHÔNG ĐỔI URL, KHÔNG ĐỔI NGHIỆP VỤ.**

---

## 1. TÓM TẮT KẾT QUẢ BASELINE TRƯỚC KHI DI CHUYỂN (GIAI ĐOẠN 0)

### 1.1. Trạng thái Git hiện tại (Cần xác nhận trước Giai đoạn 2)
- **Nhánh hiện tại:** `main...origin/main`
- **Các file đã sửa chưa commit (`3` files):**
  1. `M src/app/router.tsx`
  2. `M src/features/about/pages/CareerDetailPage.tsx`
  3. `M src/features/test-online/components/TestResultSummary.tsx`
- **File untracked hiện có (`1` file + báo cáo này):**
  - `?? project-tree.txt`
  - `?? docs/MIGRATION_MAP.md` *(tạo mới ở Giai đoạn 1)*
- **Quy tắc an toàn Git:** Không tự động `stash`, `commit`, `reset` hay `clean`. Trước khi bắt đầu Giai đoạn 2 (`git mv` sang `apps/client-web`), người phát triển cần xác nhận: **(a)** commit trạng thái sạch hiện tại và tạo nhánh `chore/monorepo-migration`, hoặc **(b)** giữ nguyên trên nhánh mới để thực hiện di chuyển.

### 1.2. Thư viện & Phiên bản thực tế (`package.json` & `npm ls --depth=0`)
| Gói thư viện | Khai báo `package.json` | Phiên bản cài thực tế | Ghi chú kiến trúc |
| --- | --- | --- | --- |
| `react` / `react-dom` | `^19.3.1` | `19.3.1` | Cần giữ duy nhất 1 bản tại root `node_modules` (hoisted) |
| `react-router-dom` | `^7.18.5` | `7.18.5` | `createBrowserRouter` |
| `@tanstack/react-query` | `^5.108.0` | `5.108.0` | Mỗi app khởi tạo `QueryClient` độc lập |
| `tailwindcss` / `@tailwindcss/vite` | `^4.3.5` | `4.3.5` | Tailwind v4 CSS-first (`@import "tailwindcss"`), cần `@source` khi dùng `packages/ui` |
| `lucide-react` | `^1.73.0` | `1.73.0` | Bộ icon dùng chung |
| `vite` | `^8.3.6` | `8.3.8` | Rolldown bundler (`rolldownOptions`) |
| `@vitejs/plugin-react` | `^6.1.2` | `6.3.0` | Oxc-based React plugin |
| `typescript` | `~7.0.2` | `7.0.2` | Bật `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleResolution: "bundler"` |
| `oxlint` | `^1.90.0` | `1.94.0` | Linter tĩnh tốc độ cao |
| `@types/node` / `@types/react` / `@types/react-dom` | `^24.19.2` / `^19.3.0` | `24.19.2` / `19.3.0` | Dev types |

> **Xác nhận trung thực:** Dự án hiện dùng **`fetch` thuần** trong `src/services/api/httpClient.ts` (không cài `axios`) và các hàm kiểm tra thuần TypeScript trong `src/utils/validators.ts` & `studentPortal.schema.ts` (không cài `zod`). Không nâng cấp hay cài thêm thư viện ngoài danh sách trên khi chưa có xác nhận.

### 1.3. Kết quả chạy kiểm tra Baseline
- **`npm ls --depth=0`:** Thành công (`0` lỗi xung đột dependency).
- **`npm run lint` (`oxlint`):** **0 warnings, 0 errors** trên `179` files (`76ms`).
- **`npm run build` (`tsc -b && vite build`):** **Thành công (`Exit code 0`, `703ms`)**, `0` lỗi TypeScript.
- **Cảnh báo Vite ghi nhận (`2` cảnh báo `[INEFFECTIVE_DYNAMIC_IMPORT]`):**
  1. `src/features/about/mocks/branches.ts`: được `import()` động trong `branchApi.ts` nhưng lại bị `import` tĩnh trong `jobs.ts` và `studentPortalMockData.ts`.
  2. `src/features/courses/mocks.ts`: được `import()` động trong `courseApi.ts` nhưng lại bị `import` tĩnh trong `studentPortalMockData.ts`.
  - *Lộ trình xử lý:* Giữ nguyên trong Giai đoạn 2 (chỉ di chuyển nguyên trạng); xử lý triệt để ở Giai đoạn 7/8 cùng chuẩn hóa ngày giờ `Asia/Ho_Chi_Minh` tại `CareerDetailPage.tsx` và tách file redirect riêng khỏi `router.tsx`.

---

## 2. BẢNG BẢN ĐỒ DI CHUYỂN TOÀN DIỆN (`FULL MIGRATION MAP`)

### 2.1. Nhóm File Cấu Hình Gốc, Tài Nguyên Tĩnh & Môi Trường (Root, Assets & Config)

| Nguồn hiện tại | Vị trí mới | Giai đoạn | Hành động | Lý do & Phân tích phụ thuộc | Rủi ro | Cách kiểm tra sau di chuyển |
| --- | --- | --- | --- | --- | --- | --- |
| `package.json` | `package.json` (Root Workspace) + `apps/client-web/package.json` | GĐ 2 | **Tách thành Root Workspace + App Package** | Root quản lý `"workspaces": ["apps/client-web", "apps/staff-web", "packages/*"]` và scripts điều phối (`dev:client`, `build:client`, `lint:client`...). `apps/client-web/package.json` khai báo `@english-center/client-web` với đúng phiên bản thư viện hiện tại. | Sai lệch hoisting `react` hoặc thiếu script gốc `npm run dev`. | `npm ls react`, `npm run lint:client`, `npm run build:client`. |
| `package-lock.json` | `package-lock.json` (Duy nhất tại Root) | GĐ 2–9 | **Giữ tại Root & cập nhật workspace links** | Quy chuẩn npm Workspaces chỉ dùng **1 lockfile duy nhất tại root**, tuyệt đối không tạo `package-lock.json` con trong `apps/*` hay `packages/*`. | Tự ý nâng phiên bản phụ nếu chạy `npm install` không kiểm soát. | Kiểm tra `git diff package-lock.json` và `npm ls --depth=0`. |
| `tsconfig.json` | `tsconfig.base.json` (Root) + `tsconfig.json` (Root references) + `apps/client-web/tsconfig.json` | GĐ 2 | **Chuẩn hóa kế thừa Base TSConfig** | Tạo `tsconfig.base.json` chứa các compilerOptions dùng chung (`target: "es2023"`, `moduleResolution: "bundler"`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`). `apps/client-web/tsconfig.app.json` kế thừa `../../tsconfig.base.json` và giữ nguyên `"paths": { "@/*": ["./src/*"] }`. | Gãy đường dẫn tương đối `extends` hoặc `paths`. | Chạy `tsc -b` tại `apps/client-web` và tại root. |
| `tsconfig.app.json` | `apps/client-web/tsconfig.app.json` | GĐ 2 | **Di chuyển & kế thừa `tsconfig.base.json`** | Cấu hình biên dịch riêng cho mã nguồn `src/` của Client Web, giữ nguyên alias `@/* -> ./src/*` và `"types": ["vite/client"]`. | Sai đường dẫn `tsBuildInfoFile`. | `npm run build:client`. |
| `tsconfig.node.json` | `apps/client-web/tsconfig.node.json` | GĐ 2 | **Di chuyển & kế thừa cơ bản** | Kiểm tra kiểu cho `apps/client-web/vite.config.ts`. | Lỗi phân giải `node:url` nếu thiếu `@types/node`. | `tsc -b` trong `apps/client-web`. |
| `vite.config.ts` | `apps/client-web/vite.config.ts` | GĐ 2 | **Di chuyển & bổ sung cấu hình cổng/fs** | Giữ nguyên `[react(), tailwindcss()]`, alias `'@' -> ./src` và `rolldownOptions`. Bổ sung `server: { port: 5173, strictPort: true, fs: { allow: ['../..'] } }` để đọc an toàn `packages/*` và font/node_modules ở root. | Vite chặn truy cập file ngoài root `apps/client-web` nếu thiếu `server.fs.allow`. | Chạy `npm run dev:client` & `npm run build:client`. |
| `.oxlintrc.json` | `.oxlintrc.json` (Root) | GĐ 2 | **Giữ tại Root & dùng chung** | Áp dụng thống nhất bộ quy tắc `react`, `typescript`, `oxc` cho cả `apps/client-web`, `apps/staff-web` và `packages/*` (cập nhật đường dẫn `$schema` hợp lệ). | Linter quét nhầm thư mục `dist/`. | `oxlint apps/client-web/src` (`npm run lint:client`). |
| `.gitignore` | `.gitignore` (Root) | GĐ 2 | **Giữ tại Root & bổ sung pattern monorepo** | Giữ toàn bộ rule hiện tại, bổ sung `apps/*/dist`, `packages/*/dist`, `*.tsbuildinfo`, `.env.*` (trừ `!.env.example` ở root và từng app). | Vô tình bỏ sót `.env` trong thư mục con `apps/*`. | Kiểm tra `git status` với file `.env.example` mẫu. |
| `.env.example` | `apps/client-web/.env.example` (+ tạo mới `apps/staff-web/.env.example` ở GĐ 3) | GĐ 2–3 | **Di chuyển vào từng App riêng biệt** | Vite đọc biến môi trường theo `root` của từng ứng dụng (`apps/client-web` vs `apps/staff-web`), đảm bảo hai app không đọc nhầm cấu hình của nhau. Hiện không có file `.env` secret nào trên đĩa. | Nhầm lẫn biến giữa hai Frontend. | Kiểm tra `API_BASE_URL` và `USE_MOCK_API` trong từng app. |
| `index.html` | `apps/client-web/index.html` | GĐ 2 | **Di chuyển nguyên trạng** | Entry HTML của Client Web (font `Be Vietnam Pro` & `Montserrat`, tiêu đề `English Center`, `/src/main.tsx`). | Hỏng đường dẫn `/favicon.svg` nếu `public/` không đi cùng. | Mở trang chủ và kiểm tra Network / Console. |
| `public/favicon.svg`, `public/icons.svg` | `apps/client-web/public/favicon.svg`, `apps/client-web/public/icons.svg` | GĐ 2 | **Di chuyển nguyên trạng** | Tài nguyên tĩnh gốc của Client Web. (`apps/staff-web/public/favicon.svg` sẽ có bản icon riêng ở GĐ 3). | Mất favicon trên trình duyệt. | Kiểm tra `dist/favicon.svg` sau khi `build:client`. |
| `README.md` | `README.md` (Root) | GĐ 2–9 | **Cập nhật hướng dẫn Monorepo** | Thay nội dung template Vite mặc định bằng tài liệu kiến trúc và lệnh chạy Monorepo `English Center`. | Không ảnh hưởng runtime. | Đọc đối chiếu các lệnh `npm run *`. |
| `project-tree.txt` | Giữ nguyên hoặc dọn theo xác nhận của Dev | GĐ 1 | **Không tự ý xóa** | File untracked do người phát triển tạo ngoài Git. | Ghi đè file cá nhân nếu tự xóa. | Xin ý kiến người phát triển trước GĐ 2. |

---

### 2.2. Nhóm Entry, App Shell, Layouts, Pages & Config của Client Web (`src/` -> `apps/client-web/src/`)

| Nguồn hiện tại | Vị trí mới | Giai đoạn | Hành động | Lý do & Phân tích phụ thuộc | Rủi ro | Cách kiểm tra sau di chuyển |
| --- | --- | --- | --- | --- | --- | --- |
| `src/main.tsx`, `src/vite-env.d.ts` | `apps/client-web/src/main.tsx`, `apps/client-web/src/vite-env.d.ts` | GĐ 2 | **Di chuyển nguyên trạng** | Entry khởi tạo React 19 của Client Web. | Thấp. | `npm run build:client`. |
| `src/App.tsx` | `apps/client-web/src/App.tsx` (+ tách gọn `app/providers/AppProviders.tsx` nếu cần nhưng giữ nguyên hành vi) | GĐ 2 | **Di chuyển (bảo toàn `QueryClientProvider` + `RouterProvider`)** | Mỗi ứng dụng (`client-web` và `staff-web`) bắt buộc sở hữu `QueryClient` và `Router` độc lập, tuyệt đối không chia sẻ qua Shared Package. | Thấp. | Kiểm tra điều hướng và cache TanStack Query. |
| `src/index.css` | `apps/client-web/src/index.css` | GĐ 2 (và bổ sung `@source` ở GĐ 4) | **Di chuyển nguyên trạng ở GĐ 2; thêm `@source "../../../packages/ui/src";` ở GĐ 4** | Chứa `@import "tailwindcss";`, bộ biến `--ec-*`, font `Montserrat` cho Public Website, `.ec-reading-font` cho phòng thi TOEIC và `@media print` cho Student Portal. Không ép Staff Web dùng chung file CSS này để tránh xung đột font `body`. | Nếu quên `@source` ở GĐ 4, Tailwind v4 sẽ không sinh utility class cho component nằm trong `packages/ui`. | So sánh file CSS build ra và kiểm tra giao diện thực tế. |
| `src/app/router.tsx` | `apps/client-web/src/app/router/index.tsx` (hoặc giữ re-export tương thích tại `app/router.tsx`) | GĐ 2 & GĐ 7 | **Di chuyển nguyên trạng ở GĐ 2; chuẩn hóa thư mục `app/router/` + tách file redirect ở GĐ 7** | Bảo toàn **100% toàn bộ 39 route & URL hiện có** (`/`, `/hoc-vien`, `/tai-lieu/*`, `/study-zone/*`, `/test-online/*`, `/test-history*`, `/student/*`, `/about/*`, `/login`...). | Đổi URL sẽ làm hỏng link nội bộ và bookmark. | Kiểm tra toàn bộ danh mục 39 route sau khi di chuyển. |
| `src/config/center-info.ts` | `apps/client-web/src/config/center-info.ts` | GĐ 2 | **Di chuyển vào Client Web** | Chứa cấu hình hiển thị thương hiệu, hotline, địa chỉ và tùy chọn form tư vấn của Client Web. | Thấp (`18+` file import qua `@/config/center-info`). | `tsc -b` xác nhận alias `@/config/center-info`. |
| `src/layouts/*` (`10` files: `PublicLayout.tsx`, `StudentLayout.tsx`, `components/Header.tsx`, `Footer*.tsx`, `FloatingContact.tsx`, `BackToTop.tsx`, `ScrollToTop.tsx`) | `apps/client-web/src/layouts/*` | GĐ 2 | **Di chuyển vào Client Web** | Toàn bộ Layout công khai và Layout Cổng học viên thuộc riêng Client Web; Staff Web sẽ có `StaffLayout` độc lập. | Thấp. | Kiểm tra Header sticky, Dropdown tài khoản, Footer và 5 tab Cổng học viên. |
| `src/pages/*` (`4` files: `HomePage.tsx`, `ContactPage.tsx`, `NotFoundPage.tsx`, `RouteErrorPage.tsx`) | `apps/client-web/src/pages/*` | GĐ 2 | **Di chuyển vào Client Web** | Các trang cấp cao của Website công khai. | Thấp. | Mở `/`, `/contact` và đường dẫn không tồn tại `/404-check`. |
| `src/hooks/useAsync.ts`, `src/hooks/usePageTitle.ts` | `apps/client-web/src/hooks/useAsync.ts`, `apps/client-web/src/hooks/usePageTitle.ts` | GĐ 2 | **Di chuyển vào Client Web** | `usePageTitle` phụ thuộc `@/config/center-info`; `useAsync` phụ thuộc `ApiClientError` và kiểu trả về `{ data, loading, error, retry }` riêng của các trang Client Web hiện hữu. Giữ tại Client Web để không phá vỡ 10+ custom hooks đang dùng. | Nếu ép chuyển sang `packages/`, sẽ kéo theo phụ thuộc `center-info` hoặc `@tanstack/react-query` không cần thiết. | `tsc -b` & kiểm tra tiêu đề tab trình duyệt. |

---

### 2.3. Phân Tích & Phân Loại `src/components/ui/` (`7` files) — Không Đưa Máy Móc Lên `packages/ui`

Qua đọc chi tiết từng dòng code của cả 7 file trong `src/components/ui/`:

| Nguồn hiện tại | Vị trí Giai đoạn 2 | Vị trí Giai đoạn 4 (Shared Packages) | Lý do phân loại kiến trúc | Dependency liên quan |
| --- | --- | --- | --- | --- |
| `src/components/ui/Pagination.tsx` | `apps/client-web/src/components/ui/Pagination.tsx` | **Trích xuất lên `packages/ui/src/Pagination.tsx`** (giữ re-export mỏng tại `@/components/ui/Pagination` nếu cần để không sửa 10 trang cùng lúc) | Component phân trang thuần túy (`page`, `totalPages`, `onChange`), cả Client Web và các bảng quản trị trong Staff Web đều dùng ngay. | `react`, `lucide-react` |
| `src/components/ui/StateViews.tsx` (`LoadingBlock`, `EmptyBlock`, `ErrorBlock`) | `apps/client-web/src/components/ui/StateViews.tsx` | **Trích xuất lên `packages/ui/src/StateViews.tsx`** (cùng các primitive `Button`, `Input`, `Select`, `Badge`, `Modal` dùng chung cho Staff Web) | Bộ trạng thái tải / rỗng / lỗi thuần UI, không dính nghiệp vụ khóa học hay bài thi, dùng trực tiếp cho cả hai Frontend. | `react`, `lucide-react` |
| `src/components/ui/PageBanner.tsx` | `apps/client-web/src/components/ui/PageBanner.tsx` | **GIỮ LẠI `apps/client-web`** | Phụ thuộc trực tiếp `@/hooks/usePageTitle` (`centerInfo`) và là Hero Banner quảng bá của Public Website, không dùng trong giao diện quản trị Staff Web. | `@/hooks/usePageTitle` |
| `src/components/ui/FilterBar.tsx` | `apps/client-web/src/components/ui/FilterBar.tsx` | **GIỮ LẠI `apps/client-web`** | Thanh tìm kiếm marketing nền `#75BDEB` + nút cam `#F26522` đặc thù của trang Khóa học/Tin tức công khai. | `lucide-react` |
| `src/components/ui/ImageBox.tsx` | `apps/client-web/src/components/ui/ImageBox.tsx` | **GIỮ LẠI `apps/client-web`** | Khung ảnh bài viết/khóa học với nền gradient thương hiệu Website. | `lucide-react` |
| `src/components/ui/SocialIcons.tsx` | `apps/client-web/src/components/ui/SocialIcons.tsx` | **GIỮ LẠI `apps/client-web`** | Icon mạng xã hội (`Facebook`, `Instagram`, `Zalo`) cho Footer và nút nổi tư vấn của Website công khai. | `react` |
| `src/components/ui/SubmissionConfirmModal.tsx` | `apps/client-web/src/components/ui/SubmissionConfirmModal.tsx` | **GIỮ LẠI `apps/client-web`** | Hộp thoại xác nhận nộp bài thi/bài luyện TOEIC (`variant: 'study' \| 'exam'`, đếm số câu đã làm/đánh dấu), thuộc miền nghiệp vụ làm bài của học viên. | `lucide-react` |

---

### 2.4. Phân Tích & Phân Loại `src/services/api/` (`5` files) & `src/utils/` (`3` files)

| Nguồn hiện tại | Vị trí Giai đoạn 2 | Vị trí Giai đoạn 4 (Shared Packages) | Lý do & Cách tách an toàn | Rủi ro & Kiểm tra |
| --- | --- | --- | --- | --- |
| `src/services/api/httpClient.ts` | `apps/client-web/src/services/api/httpClient.ts` | **Tách lõi thuần sang `packages/api-client`** (`createApiClient`, `ApiClientError`, hỗ trợ `JSON` & `FormData`, `getAccessToken`, `onUnauthorized`, **KHÔNG đọc `import.meta.env`**). File `apps/client-web/src/services/api/httpClient.ts` khởi tạo instance từ `API_CONFIG` của Client Web. | Tuân thủ nghiêm ngặt mục VIII.1: `packages/api-client` không tự đọc `import.meta.env`, không chứa `QueryClient` và không chứa endpoint nghiệp vụ. Đồng thời giữ nguyên export `httpClient` & `ApiClientError` tại `@/services/api/httpClient` nên toàn bộ `api/*` của Client Web không phải sửa lại! | Kiểm tra cả chế độ Mock và chế độ gọi HTTP (`ApiClientError` status `400/401/403/404/500`). |
| `src/services/api/apiConfig.ts` | `apps/client-web/src/services/api/apiConfig.ts` | **GIỮ LẠI `apps/client-web`** (`staff-web` có `services/apiConfig.ts` riêng đọc env của Staff Web) | Đọc `import.meta.env.VITE_API_BASE_URL`, `VITE_USE_MOCK_API`, `VITE_DATA_SOURCE` riêng của Client Web. | Hai app có cấu hình môi trường hoàn toàn độc lập. |
| `src/services/api/endpoints.ts` | `apps/client-web/src/services/api/endpoints.ts` | **GIỮ LẠI `apps/client-web`** (đồng bộ chuẩn đường dẫn với `packages/contracts`) | Danh mục endpoint dành cho Website & Học viên (`/public/*`, `/auth/*`, `/students/me/*`...). Staff Web sẽ định nghĩa endpoint quản trị riêng (`/api/v1/admin/*`, `/api/v1/staff/*`). | Tránh lộ hoặc trộn lẫn route quản trị vào Client Web. |
| `src/services/api/queryClient.ts` | `apps/client-web/src/services/api/queryClient.ts` | **GIỮ LẠI `apps/client-web`** (`staff-web` khởi tạo `QueryClient` riêng) | Tuyệt đối không chia sẻ Query Cache giữa hai ứng dụng độc lập. | Kiểm tra `QueryClientProvider` từng app. |
| `src/services/api/mockUtils.ts` | `apps/client-web/src/services/api/mockUtils.ts` | **GIỮ LẠI `apps/client-web`** (hoặc hàm `delay` thuần nếu cần) | Chỉ giả lập độ trễ mạng cho tầng Mock. | Thấp. |
| `src/utils/format.ts` (`removeDiacritics`, `matchText`, `formatDate`, `paginate`) | `apps/client-web/src/utils/format.ts` | **Trích xuất lên `packages/utils/src/format.ts`** (+ bổ sung `formatCurrencyVnd`, `getTodayIsoInVietnam` chuẩn `Asia/Ho_Chi_Minh`) và re-export tại `@/utils/format` | Hàm thuần túy 100%, không phụ thuộc React hay DOM, dùng chung cho cả Client Web và Staff Web. | Kiểm tra định dạng ngày `dd/mm/yyyy` và tiền tệ `VND`. |
| `src/utils/safeUrl.ts` (`toSafeHttpUrl`, `toSafeVideoFileUrl`, `toSafeEmbedUrl`) | `apps/client-web/src/utils/safeUrl.ts` | **Trích xuất lên `packages/utils/src/safeUrl.ts`** và re-export tại `@/utils/safeUrl` | Hàm bảo mật URL thuần túy chống `javascript:` / `data:` URI, cần thiết ở cả Client Web lẫn Staff Web (khi nhân viên duyệt link bài nộp / tài liệu). | Kiểm tra render link ngoài & nhúng video. |
| `src/utils/validators.ts` (`isValidVnPhone`, `isValidEmail`, `isValidFacebookUrl`) | `apps/client-web/src/utils/validators.ts` | **Trích xuất lên `packages/utils/src/validators.ts`** và re-export tại `@/utils/validators` | Bộ regex kiểm tra SĐT Việt Nam và Email dùng chung cho form Tư vấn, Học viên, Nhân sự và Tuyển sinh. | Kiểm tra form Tư vấn & Đăng ký. |

---

### 2.5. Toàn Bộ 11 Feature Nghiệp Vụ Hiện Tại (`src/features/*` -> `apps/client-web/src/features/*`)

Tất cả **11 feature (`142` files)** hiện có đều thuộc phạm vi **Public Website + Student Portal + Study Zone + Test Online**, được **di chuyển nguyên vẹn 100%** sang `apps/client-web/src/features/`:

| Nguồn hiện tại | Số file | Vị trí mới (`Giai đoạn 2`) | Hành động | Kiểm tra phụ thuộc Mock Data hiện tại | Rủi ro & Cách kiểm tra |
| --- | --- | --- | --- | --- | --- |
| `src/features/about` | `18` | `apps/client-web/src/features/about` | **Di chuyển nguyên trạng** | Chỉ `api/branchApi.ts`, `api/careerApi.ts`, `api/newsApi.ts` và `mocks/jobs.ts` chạm vào `mocks/*`. **0 Page/Component import trực tiếp mock.** | Kiểm tra `/about/branches`, `/about/news`, `/about/careers` & chi tiết tin/tuyển dụng. |
| `src/features/articles` | `11` | `apps/client-web/src/features/articles` | **Di chuyển nguyên trạng** | Chỉ `api/articleApi.ts` import động `mocks.ts`. **0 Page/Component import trực tiếp mock.** | Kiểm tra bài viết học viên & tài liệu công khai. |
| `src/features/auth` | `11` | `apps/client-web/src/features/auth` | **Di chuyển nguyên trạng** | Chỉ `services/authService.ts` import `authMockData.ts`. Phiên đăng nhập học viên tách rời hoàn toàn khỏi phiên đăng nhập nhân viên của `staff-web`. | Kiểm tra `/login`, `/register`, `/forgot-password`, `/reset-password`, `/change-password`, Dropdown tài khoản. |
| `src/features/consultation` | `5` | `apps/client-web/src/features/consultation` | **Di chuyển nguyên trạng** | `api/consultationApi.ts` đã qua `USE_MOCK_API` & `httpClient`. | Kiểm tra gửi form đăng ký tư vấn ở chân trang và Modal lịch khai giảng. |
| `src/features/courses` | `17` | `apps/client-web/src/features/courses` | **Di chuyển nguyên trạng** | Chỉ `api/courseApi.ts` import động `mocks.ts`. | Kiểm tra `/courses` và `/courses/:slug`. |
| `src/features/learning-materials` | `4` | `apps/client-web/src/features/learning-materials` | **Di chuyển nguyên trạng** | Gọi qua `articles` hooks/api, không import mock trực tiếp. | Kiểm tra `/tai-lieu/listening-reading` và `/tai-lieu/review-de-thi`. |
| `src/features/schedules` | `12` | `apps/client-web/src/features/schedules` | **Di chuyển nguyên trạng** | Chỉ `api/scheduleApi.ts` import động `scheduleMockData.ts`. | Kiểm tra lọc cơ sở/tháng và mở Modal tư vấn tại `/schedule`. |
| `src/features/student-news` | `2` | `apps/client-web/src/features/student-news` | **Di chuyển nguyên trạng** | Gọi qua `articles` hooks/api. | Kiểm tra `/hoc-vien` và `/hoc-vien/:slug`. |
| `src/features/student-portal` | `16` | `apps/client-web/src/features/student-portal` | **Di chuyển nguyên trạng** | Chỉ `repositories/studentPortal.repository.ts` import `studentPortalMockData.ts`; các trang dùng `useStudentPortalData` (TanStack Query). *(Xác nhận: hiện có 5 trang `dashboard`, `learning-plan`, `assignments`, `exam-results`, `schedule`; chưa có trang `StudentProfile` hay `MyCourses` riêng).* | Kiểm tra toàn bộ 5 tab `/student/*` với tài khoản có lớp (`stu-001`) và chưa xếp lớp (`stu-003`). |
| `src/features/study-zone` | `17` | `apps/client-web/src/features/study-zone` | **Di chuyển nguyên trạng** | Chỉ `api/studyZoneApi.ts` import động `studyZoneMockData.ts`. | Kiểm tra 3 danh mục Ngữ pháp/Từ vựng/Luyện nghe, trình phát audio viên thuốc và nộp bài. |
| `src/features/test-online` | `29` | `apps/client-web/src/features/test-online` | **Di chuyển nguyên trạng** | Chỉ `api/*` và `services/*` import `testMockData.ts`. **0 Page/Component import trực tiếp mock.** | Kiểm tra `/test-online`, chọn Part, làm bài Listening (audio ẩn 1 lần tự chuyển) & Reading (chuyển tự do), chấm điểm, `/test-online/result/:attemptId` và `/test-history`. |

---

### 2.6. Các Hạng Mục Khởi Tạo Mới Ở Các Giai Đoạn Tiếp Theo (Giai Đoạn 3 – 10)

| Vị trí mục tiêu | Giai đoạn | Phạm vi khởi tạo có kiểm soát (Không tạo file/thư mục rỗng) |
| --- | --- | --- |
| `apps/staff-web/` | **Giai đoạn 3** | Ứng dụng React 19 + Vite (port `5174`, `strictPort: true`) + Tailwind CSS 4 độc lập cho nội bộ trung tâm (`ADMIN`, `ACCOUNTANT`, `TEACHER`, `ACADEMIC`, `SALES`, `HR`). Chỉ xây dựng nền tảng: `StaffLayout` (Sidebar lọc theo Permission, Header, Breadcrumb), `features/auth` (Login + Mock Staff Auth tách riêng storage key), `features/dashboard` (Tổng quan theo vai trò), `app/guards` (`AuthGuard`, `PermissionGuard`), cấu hình Permission tập trung (`module.action`), trang `403 Forbidden` và `404 NotFound`. **Không tạo trước các thư mục module nghiệp vụ rỗng.** |
| `apps/backend/README.md` | **Giai đoạn 3 / 6** | Chỉ tạo duy nhất `README.md` định hướng kiến trúc **NestJS Modular Monolith + PostgreSQL + Prisma** (`/api/v1/*`), **chưa tạo `package.json` và không đưa vào `workspaces`**. |
| `packages/api-client/` | **Giai đoạn 4** | HTTP Client thuần (`fetch`, timeout, `ApiClientError` phân loại `400/401/403/404/409/422/429/500`, `JSON` & `FormData`, `TokenProvider` callback), nhận cấu hình từ từng app, không đọc `import.meta.env`, không chứa `QueryClient`. |
| `packages/contracts/` | **Giai đoạn 4 & 6** | Nguồn chuẩn duy nhất cho API Contract (`openapi/openapi.yaml` + các kiểu nghiệp vụ cốt lõi dùng chung có kiểm soát: `Role`, `Permission`, `PublishStatus`, phân trang `PaginatedResponse`, chuẩn lỗi `ApiErrorResponse` và các DTO cốt lõi không mâu thuẫn). Không đưa Prisma/DB entity lên Frontend. |
| `packages/ui/` | **Giai đoạn 4** | Chỉ chứa các UI primitive thực sự dùng chung giữa `client-web` và `staff-web`: `Button`, `Input`, `Select`, `Modal`, `Pagination`, `Badge`, `Table` primitives, `StateViews` (`LoadingBlock`, `EmptyBlock`, `ErrorBlock`). Khai báo `react` & `react-dom` trong `peerDependencies`. |
| `packages/utils/` | **Giai đoạn 4** | Chỉ chứa hàm thuần túy: định dạng ngày giờ chuẩn `Asia/Ho_Chi_Minh`, định dạng tiền tệ `VND`, `removeDiacritics`/`matchText`/`paginate`, `safeUrl`, `validators`. |
| `docs/` (`28` tài liệu hiện có) | **Giai đoạn 9–10** | Kiểm kê nội dung toàn bộ `28` file hiện có trong `docs/`, tổ chức lại vào `architecture/`, `migration/`, `data-model/`, `api-contract/`, `backend/`, `security/`, `client-web/`, `staff-web/`, `archive/` mà không làm mất báo cáo TOEIC hay nhật ký kiểm toán. *(Xác nhận: file tham khảo `hmc-admin-portal.html` **không tồn tại** trong repository nên không tạo thư mục `docs/reference/` giả định).* |

---

## 3. LỘ TRÌNH THỰC HIỆN THEO ĐIỂM DỪNG AN TOÀN

| Giai đoạn | Nội dung thực hiện | Điều kiện nghiệm thu để chuyển bước | Trạng thái |
| --- | --- | --- | --- |
| **Giai đoạn 0** | Kiểm tra Baseline (`package.json`, configs, routes, mock imports, env, Git status, `npm ls`, `lint`, `build`) | Ghi nhận đầy đủ kết quả thực tế, không sửa source code | **HOÀN THÀNH** |
| **Giai đoạn 1** | Lập bản đồ di chuyển toàn diện (`docs/MIGRATION_MAP.md`) | **DỪNG & CHỜ NGƯỜI DÙNG XÁC NHẬN** | **HOÀN THÀNH** |
| **Giai đoạn 2** | Cấu hình Root npm Workspaces + `tsconfig.base.json` + Di chuyển nguyên vẹn ứng dụng hiện tại sang `apps/client-web/` (port `5173`, `strictPort: true`) | `npm run lint:client` & `npm run build:client` PASS, giữ nguyên 100% URL & giao diện | **HOÀN THÀNH** |
| **Giai đoạn 3** | Khởi tạo `apps/staff-web/` (port `5174`, `strictPort: true`) + `apps/backend/README.md`: Staff Login, Layout, Sidebar theo quyền, RBAC tập trung, Dashboard cơ bản, `403`/`404` | `npm run lint:staff` & `npm run build:staff` PASS | **HOÀN THÀNH** |
| **Giai đoạn 4** | Trích xuất có kiểm soát 4 Shared Packages (`api-client`, `contracts`, `ui`, `utils`) + khai báo `@source` Tailwind v4 | `npm ls react` chỉ có 1 bản React; cả 2 app build & lint PASS, không vòng lặp phụ thuộc | **HOÀN THÀNH** |
| **Giai đoạn 5–6** | Chuẩn hóa Data Access Layer, API Contract (`openapi.yaml` `/api/v1/*`) & Data Model nghiệp vụ | UI tách bạch hoàn toàn khỏi Mock, hợp đồng lỗi HTTP `400..500` thống nhất | **HOÀN THÀNH** |
| **Giai đoạn 7** | Xử lý triệt để 2 cảnh báo `[INEFFECTIVE_DYNAMIC_IMPORT]`, tách file redirect của Router và chuẩn hóa ngày lịch `Asia/Ho_Chi_Minh` tại `CareerDetailPage.tsx` | `npm run lint` = `0` warnings & `npm run build` = `0` cảnh báo dynamic import | **HOÀN THÀNH** |
| **Giai đoạn 8–9** | Kiểm thử tổng thể toàn Monorepo (`npm run lint`, `npm run build`, kiểm tra TypeScript từng app) & Quy hoạch bộ 13 tài liệu bàn giao trong `docs/` | Toàn bộ tiêu chí nghiệm thu đạt `PASS` | **HOÀN THÀNH** |
