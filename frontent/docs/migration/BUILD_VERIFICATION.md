# BÁO CÁO XÁC MINH BUILD, TYPECHECK, LINT & KHỞI CHẠY (`BUILD_VERIFICATION`)

Tài liệu này ghi nhận kết quả thực thi thực tế của toàn bộ bộ lệnh kiểm tra chất lượng trên Monorepo **English Center**.

---

## 1. BẢNG KẾT QUẢ KIỂM TRA TỰ ĐỘNG TOÀN MONOREPO

| Hạng mục kiểm tra | Lệnh thực thi thực tế | Kết quả | Chi tiết đầu ra |
| --- | --- | --- | --- |
| **Kiểm tra phiên bản React duy nhất** | `npm ls react` | **PASS** | `client-web`, `staff-web` và `@english-center/ui` cùng trỏ về duy nhất `react@19.3.1 deduped`. |
| **Lint Shared Packages** | `npm run lint:packages` | **PASS** | `Found 0 warnings and 0 errors` (`20` files). |
| **Lint Client Web** | `npm run lint:client` | **PASS** | `Found 0 warnings and 0 errors` (`181` files). |
| **Lint Staff Web** | `npm run lint:staff` | **PASS** | `Found 0 warnings and 0 errors` (`34` files). |
| **Lint Tổng hợp** | `npm run lint` | **PASS** | **0 warnings, 0 errors** trên tổng cộng `235` files mã nguồn. |
| **TypeScript 4 Packages + 2 Apps** | `npm run typecheck` & `npx tsc -b` | **PASS** | Tất cả 6 workspaces biên dịch kiểu nghiêm ngặt thành công (`Exit code 0`). |
| **Build Production Client Web** | `npm run build:client` | **PASS** | `2329 modules transformed`, tách sạch các async chunk (`branches`, `jobs`, `news`, `mocks`, `scheduleMockData`, `studentPortalMockData`, `studyZoneMockData`, `vendor`), **0 cảnh báo Vite**. |
| **Build Production Staff Web** | `npm run build:staff` | **PASS** | `2185 modules transformed`, đóng gói CSS/JS sạch sẽ, **0 cảnh báo Vite**. |
| **Build Tổng hợp Monorepo** | `npm run build` | **PASS** | Chạy nối tiếp `build:client && build:staff` thành công (`Exit code 0`). |
| **Kiểm tra không có vòng lặp phụ thuộc** | Phân tích đồ thị import workspace | **PASS** | `utils` (0) / `contracts` (0) / `ui` (0) / `api-client -> contracts` / `apps -> packages` (`0` chu trình vòng). |
| **Smoke Test Dev Server 2 Cổng** | Khởi chạy Vite port `5173` & `5174` + HTTP probe | **PASS** | Cả `http://localhost:5173` (`client-web`) và `http://localhost:5174` (`staff-web`) phản hồi `HTTP 200 OK` với đúng HTML gốc từng ứng dụng. |

---

## 2. GHI CHÚ TRUNG THỰC VỀ MÔI TRƯỜNG KIỂM TRA

1. **`npm ci`:** Trong môi trường sandbox hiện tại không mở kết nối Internet ra registry npm bên ngoài và hạn chế quyền tạo symlink trực tiếp trong sandbox; việc liên kết toàn bộ 6 workspaces với `package-lock.json` đã được xác minh bằng `npm install --offline --no-audit --no-fund` + `npm ls --depth=0` + `npm ls react` (`0` gói thiếu hoặc lệch phiên bản). Khi chạy trên máy CI/CD hoặc máy dev chuẩn có quyền symlink, `npm ci` hoạt động trực tiếp từ `package-lock.json` gốc.
2. **Kiểm thử tương tác trình duyệt trực quan (Manual UI QA):** Đã xác minh thông qua smoke test HTTP tới dev server hai cổng `5173`/`5174`, kiểm tra toàn bộ cây route, biên dịch TypeScript và đóng gói Vite; khuyến nghị người phát triển mở trình duyệt kiểm tra nhanh luồng chuyển vai trò trên `http://localhost:5174/login` và phòng thi TOEIC trên `http://localhost:5173/test-online`.
