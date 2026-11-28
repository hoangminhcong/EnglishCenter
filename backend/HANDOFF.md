# HANDOFF.md — Bàn giao & Trí nhớ dự án

## 1. Phiên vừa rồi (ghi đè mỗi phiên)
- **Yêu cầu** — Sửa lỗi `ERR_MODULE_NOT_FOUND` khi khởi động backend bằng `npm run dev`.
- **Công việc đã làm** — Sửa hai dòng import trong `src/config/db.ts` để nạp driver và các kiểu PostgreSQL từ `pg`. Bộ test xác thực hiện có đi qua module này khi khởi động ứng dụng.
- **Thay đổi DB** — Không có thay đổi schema hay migration.
- **Kiểm chứng** — `npm run typecheck` thành công. Cả 4 test backend đều đạt, gồm luồng xác thực E2E với PostgreSQL.
- **Việc cần người dùng làm** — Chế độ `npm run dev` đang theo dõi file sẽ tự khởi động lại sau khi lưu.

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
- Import driver và kiểu PostgreSQL từ `pg` để Node nạp đúng mã JavaScript khi khởi động.
