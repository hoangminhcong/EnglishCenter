# HANDOFF.md — Bàn giao & Trí nhớ dự án

## 1. Phiên vừa rồi (ghi đè mỗi phiên)
- **Yêu cầu** — Thiết kế và sinh toàn bộ cơ sở dữ liệu PostgreSQL cho toàn hệ thống English Center (đối chiếu từ `english-center-mini/docs/` và `@english-center/contracts`), cấu hình kết nối Supabase trong `.env` / `src/config/db.ts` và đẩy toàn bộ bảng lên Supabase. Luật đã chốt: tuân thủ quy chuẩn `AGENTS.md` (`UUID DEFAULT gen_random_uuid()`, tiền tệ `BIGINT` VND, `TIMESTAMPTZ` kèm trigger `set_updated_at()`, `status` viết `IN HOA` có `CHECK`, ưu tiên `ON DELETE RESTRICT`, tách bảng đáp án riêng để chống lộ `AnswerKey`).
- **Công việc đã làm** — Tạo bộ 5 file migration (`001` → `005`), đồng bộ `src/db/schema.sql`, cập nhật `src/config/env.ts`, triển khai `pg.Pool` tự động bật SSL cho host từ xa trong `src/config/db.ts`, viết trình chạy migration có bảng `_migrations` trong `src/db/migrate.ts` (script `npm run db:migrate`), và thêm bài kiểm thử `tests/db/schema.test.ts`.
- **Thay đổi DB** — Khởi tạo mới toàn bộ 64 bảng nghiệp vụ & kiểm toán (cộng 1 bảng hệ thống `_migrations`) trên Supabase qua 5 file: `001_init_schema.sql` (15 bảng Core/Auth/RBAC/Catalog), `002_cms_and_classes.sql` (6 bảng CMS/Classes/Student Profiles), `003_sales_crm.sql` (7 bảng Sales CRM & Registrations), `004_academic_accounting_teaching.sql` (18 bảng Học vụ/Kế toán/Giảng dạy), `005_learning_and_toeic_exam.sql` (18 bảng Học liệu/Study Zone/Thi TOEIC Online).
- **Kiểm chứng** — Đã chạy `npm run db:migrate` áp dụng thành công cả 5 migration lên Supabase; `npm run typecheck` (0 lỗi) và `npm test` đều pass 100%.
- **Việc cần người dùng làm** — Mở Supabase Table Editor / Schema Visualizer để xem toàn bộ 64 bảng đã tạo; khi bắt đầu viết integration test có ghi/xóa DB, nên tách `TEST_DATABASE_URL` trong `.env` sang một database riêng để tránh ảnh hưởng dữ liệu dev.

## 2. Các điểm tạm / Lưu ý đang mở (xóa khi đã xử lý xong)
- `src/config/logger.ts`, `src/config/redis.ts`, `src/db/seeds/seed.ts` và `src/shared/middlewares/validate.middleware.ts` đang là file khung chờ triển khai cùng module nghiệp vụ đầu tiên (`auth` / `user`).
- Trong `.env` hiện `TEST_DATABASE_URL` đang dùng chung chuỗi kết nối với `DATABASE_URL`; cần trỏ sang DB test riêng trước khi viết integration test có `TRUNCATE`/`DELETE`.
- Khi viết tầng `service`/`repository` nối với Frontend `english-center-mini`, cần ánh xạ các giá trị `status` lưu `IN HOA` trong PostgreSQL sang union chữ thường/PascalCase tương ứng của `@english-center/contracts`.

## 3. Kinh nghiệm & Bẫy kỹ thuật (tích lũy, tối đa 20 dòng)
- `pg` trả về `COUNT(*)`, `SUM()` và `BIGINT` dạng `string` -> luôn ép `Number(...)` tại tầng `repository` (toàn bộ cột tiền tệ `*_vnd` dùng `BIGINT`).
- `req.query` của Express luôn là `string` -> dùng `z.coerce.number()` / `z.coerce.boolean()` trong Zod schema cho phân trang và bộ lọc.
- Nếu `tsx` báo `uv_os_get_passwd` trong sandbox Windows, kiểm tra lại cùng lệnh trong môi trường người dùng.
- `tsconfig.json` dùng `moduleResolution: "NodeNext"` không bật `allowImportingTsExtensions` -> các `import` nội bộ giữa file `.ts` phải ghi đuôi `.js` và dùng `import type` cho kiểu để qua cả `tsc --noEmit` lẫn `npm run build`.
- Kết nối PostgreSQL tới Supabase từ xa bắt buộc bật `ssl: { rejectUnauthorized: false }` trên `pg.Pool`; chỉ tắt SSL khi hostname là `127.0.0.1` / `localhost`.
- Mật khẩu DB trong `DATABASE_URL` nếu chứa ký tự đặc biệt như `@` nên mã hóa phần trăm (`%40`) để `new URL()` phân tích đúng hostname.
