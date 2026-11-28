# NHẬT KÝ TÁI CẤU TRÚC MONOREPO & DỌN DẸP HỆ THỐNG (`MIGRATION_CHANGELOG`)

Tài liệu này ghi lại theo trình tự thời gian toàn bộ các thay đổi đã thực hiện từ giai đoạn chuẩn hóa Single-App đến khi hoàn tất kiến trúc Monorepo **English Center**.

---

## 1. GIAI ĐOẠN TIỀN MIGRATION – DỌN DẸP & ĐỒNG BỘ SINGLE-APP
- Xóa bỏ 5 component legacy mồ côi không còn tham chiếu (`StudyTopicCard`, `DurationSelector`, `PartSelector`, `TestInfo`, `TestSummary`).
- Chuẩn hóa thương hiệu thống nhất **`English Center`** / **`ENGLISH CENTER`** và bảng màu xanh dương nhạt `#75BDEB` trên toàn bộ giao diện và dữ liệu mẫu.
- Đồng bộ Single Source of Truth cho Cơ sở (`branches.ts`), Khóa học (`courses/mocks.ts`), Lịch khai giảng (`scheduleMockData.ts`), Cổng học viên (`studentPortalMockData.ts`) và cấp mã câu hỏi riêng `t01..t12` cho 12 đề TOEIC.
- Vá lỗ hổng đọc chéo lượt làm bài (`IDOR`) theo `studentId`/`ownerId` tại `attemptService.ts`, `attemptApi.ts`, `historyApi.ts`.

## 2. GIAI ĐOẠN 0 & 1 – BASELINE AUDIT & KẾ HOẠCH DI CHUYỂN
- Ghi nhận Baseline trên `179` files gốc (`react@19.3.1`, `vite@8.3.8`, `typescript@7.0.2`, `tailwindcss@4.3.5`, `oxlint@1.94.0`).
- Lập bản đồ di chuyển chi tiết cho toàn bộ dự án tại [MIGRATION_MAP.md](file:///d:/Web/english-center-mini/docs/migration/MIGRATION_MAP.md).

## 3. GIAI ĐOẠN 2 – DI CHUYỂN `apps/client-web`
- Khởi tạo npm Workspaces tại `package.json` gốc và cấu hình kế thừa `tsconfig.base.json`.
- Di chuyển nguyên vẹn `public/`, `src/` (toàn bộ 11 features), `index.html`, `vite.config.ts` (cấu hình `port: 5173`, `strictPort: true`, `server.fs.allow`), `tsconfig.*.json` và `.env.example` vào `apps/client-web/`.
- Bảo toàn 100% toàn bộ 39 route URL, giao diện và dữ liệu Mock.

## 4. GIAI ĐOẠN 3 – KHỞI TẠO `apps/staff-web` & `apps/backend/README.md`
- Xây dựng ứng dụng độc lập `apps/staff-web/` (`port: 5174`, `strictPort: true`) phục vụ 6 vai trò nội bộ (`ADMIN`, `ACCOUNTANT`, `TEACHER`, `ACADEMIC`, `SALES`, `HR`).
- Thiết lập ma trận phân quyền tập trung `ROLE_PERMISSIONS_MAP` (`module.action`), `AuthGuard`, `PermissionGuard`, `StaffLayout` (Sidebar lọc động theo quyền, Header, Breadcrumb), `StaffLoginPage`, `StaffDashboardPage`, trang `403` và `404`.
- Tạo `apps/backend/README.md` định hướng kiến trúc NestJS Modular Monolith + PostgreSQL + Prisma (chưa đưa vào Workspaces).

## 5. GIAI ĐOẠN 4 – TÁCH 4 SHARED PACKAGES CÓ KIỂM SOÁT
- Khởi tạo `@english-center/utils`, `@english-center/contracts` (kèm `openapi/openapi.yaml`), `@english-center/api-client` và `@english-center/ui`.
- Khai báo `@source` trong file CSS của cả `client-web` và `staff-web` để Tailwind CSS 4 quét đầy đủ utility class từ `packages/ui/src`.
- Xác minh `npm ls react` chỉ giữ duy nhất 1 bản `react@19.3.1 deduped`.

## 6. GIAI ĐOẠN 5 & 6 – CHUẨN HÓA DATA ACCESS LAYER, QUERY KEYS & CONTRACTS
- Tạo `CLIENT_QUERY_KEYS` tập trung, tự động invalidate cache lịch sử thi ngay sau khi bắt đầu/hủy/nộp bài tại `attemptApi.ts`.
- Bổ sung đầy đủ các nhánh HTTP (`!USE_MOCK_API`) cho `attemptApi`, `testApi` và cơ chế tự dọn phiên khi gặp `401 Unauthorized` trên cả hai ứng dụng.
- Hoàn thiện đặc tả 6 miền thực thể nghiệp vụ và OpenAPI 3.1 (`/api/v1/*`) trong `@english-center/contracts`.

## 7. GIAI ĐOẠN 7 – XỬ LÝ TRIỆT ĐỂ CẢNH BÁO CODE & BUNDLER
- Chuẩn hóa `apps/client-web/src/app/router/` + `app/providers/` và tách riêng `LegacyStudentHistoryDetailRedirect.tsx`.
- Chuyển xử lý hạn nộp hồ sơ tuyển dụng sang múi giờ chuẩn `Asia/Ho_Chi_Minh` ngoài render tại `careerApi.ts`.
- Chuyển nạp động `studentPortalMockData` và đọc tham chiếu qua `branchApi`/`courseApi`, triệt tiêu hoàn toàn 2 cảnh báo `[INEFFECTIVE_DYNAMIC_IMPORT]` của Vite.

## 8. GIAI ĐOẠN 8 & 9 – KIỂM THỬ TỔNG THỂ & QUY HOẠCH TÀI LIỆU
- Quy hoạch toàn bộ hệ thống tài liệu `docs/` vào 9 phân khu chuẩn (`architecture`, `migration`, `data-model`, `api-contract`, `backend`, `security`, `client-web`, `staff-web`, `archive`) và cập nhật `README.md` gốc của Monorepo.
