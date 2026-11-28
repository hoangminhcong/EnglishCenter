# HANDOFF.md — Bàn giao & Trí nhớ dự án

## 1. Phiên vừa rồi (ghi đè mỗi phiên)
- **Yêu cầu** — Triển khai luồng xác thực Học viên (`POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`) theo đúng kiến trúc Modular Monolith của `AGENTS.md` và tương thích trực tiếp với `apps/client-web` (`@english-center/api-client`). Luật nghiệp vụ đã chốt: đăng nhập bằng `username` hoặc `email` không phân biệt hoa–thường; băm mật khẩu bằng `scrypt` (`node:crypto`); lưu hash SHA-256 của session token trong `auth_sessions` và cấp cookie `HttpOnly` (`ec_session_token`) kèm `accessToken`; chặn tài khoản `LOCKED`/`DISABLED`/`PENDING_ACTIVATION` (`403`); nếu nhập tài khoản `STAFF` trên cổng Học viên thì trả `PORTAL_REDIRECT_REQUIRED` về `STAFF`.
- **Công việc đã làm** — Hoàn thiện tầng nền dùng chung (`src/config/logger.ts`, `src/shared/constants/roles.ts`, `src/shared/errors/app-error.ts`, `src/shared/utils/crypto.ts`, `src/shared/utils/response.ts`, `src/shared/types/express.d.ts`, `request-id.middleware.ts`, `validate.middleware.ts`, `auth.middleware.ts`, `error-handler.middleware.ts`), triển khai module tầng nền `user` (`user.schema.ts`, `user.repository.ts`, `user.service.ts`), triển khai module `auth` (`auth.schema.ts`, `auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.route.ts`), gắn router `/api/v1` + `/api` kèm CORS trong `src/app.ts`, viết `src/db/seeds/seed.ts` (`npm run db:seed`) và bộ E2E test `tests/modules/auth.test.ts`.
- **Thay đổi DB** — Không đổi DDL (`src/db/schema.sql` giữ nguyên 64 bảng). Đã chạy `npm run db:seed` nạp 6 `roles`, 2 `branches` (`toeic-online`, `cs-ha-dong`), 2 tài khoản học viên mẫu (`hv.minhquan`, `hv.minhanh` — mật khẩu `Hocvien@123`) và 1 tài khoản `admin` (`Staff@2026`).
- **Kiểm chứng** — `npm run typecheck` (0 lỗi), `npm run build` (0 lỗi) và `npm test` (4/4 ca kiểm thử gồm kiểm chứng schema và E2E Auth thật trên Supabase) đều pass 100%.
- **Việc cần người dùng làm** — Có thể khởi động Backend bằng `npm run dev` trong `english-center-api`, đặt `VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1` và `VITE_USE_MOCK_API=false` bên `apps/client-web` để đăng nhập thật bằng `hv.minhquan` / `Hocvien@123`.

## 2. Các điểm tạm / Lưu ý đang mở (xóa khi đã xử lý xong)
- `src/config/redis.ts`, `rate-limit.middleware.ts`, `rbac.middleware.ts` và các API quản trị tài khoản nhân sự (`/api/v1/staff/auth/*`, `/api/v1/staff/users/*`) đang chờ triển khai ở phiên làm Cổng Nhân sự (`staff-web`).
- Chức năng quên mật khẩu / đặt lại mật khẩu qua email (`/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password`) chưa triển khai trên Backend.
- `TEST_DATABASE_URL` đã được tách sang một project Supabase riêng biệt và tự động áp dụng `runMigrations()` khi chạy integration test.

## 3. Kinh nghiệm & Bẫy kỹ thuật (tích lũy, tối đa 20 dòng)
- `pg` trả về `COUNT(*)`, `SUM()` và `BIGINT` dạng `string` -> luôn ép `Number(...)` tại tầng `repository` (toàn bộ cột tiền tệ `*_vnd` dùng `BIGINT`).
- `req.query` của Express luôn là `string` -> dùng `z.coerce.number()` / `z.coerce.boolean()` trong Zod schema cho phân trang và bộ lọc.
- `tsconfig.json` dùng `moduleResolution: "NodeNext"` không bật `allowImportingTsExtensions` -> các `import` nội bộ giữa file `.ts` phải ghi đuôi `.js` và dùng `import type` cho kiểu để qua cả `tsc --noEmit` lẫn `npm run build`.
- Kết nối PostgreSQL tới Supabase từ xa bắt buộc bật `ssl: { rejectUnauthorized: false }` trên `pg.Pool`; chỉ tắt SSL khi hostname là `127.0.0.1` / `localhost`.
- `@english-center/api-client` tự động bóc trường `data` trong `ApiEnvelope` (`{ success, data, message }`) -> với `POST /auth/register`, `data` phải chứa `{ success: true, message, user }` để khớp `httpClient.post<AuthActionResponse>()`.
- Trong sandbox Windows không mở được kết nối TCP loopback (`connect EACCES 127.0.0.1`) và DNS ngoài -> chạy E2E HTTP/Supabase test trong môi trường người dùng.
