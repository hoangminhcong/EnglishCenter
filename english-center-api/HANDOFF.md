# HANDOFF.md — Bàn giao & Trí nhớ dự án

## 1. Phiên vừa rồi (ghi đè mỗi phiên)
- phiên 0: hướng dẫn
- **Yêu cầu** — Commit bộ khung backend và đẩy lên repo GitHub `badoannguyen/english-center`.
- **Công việc đã làm** — Khởi tạo nhánh `main` tại thư mục gốc `english-center`. Thêm `.gitkeep` để bản clone giữ hai thư mục `english-center-api/docker/` và `english-center-api/src/modules/auth/`.
- **Thay đổi DB** — Không.
- **Kiểm chứng** — `npm run typecheck` và `npm test` đều qua. File `auth.test.ts` hiện là khung trống. Các URL trong `.env.example` dùng cấu hình local và mật khẩu mẫu.
- **Việc cần người dùng làm** — Khi clone sang máy khác, sao chép `english-center-api/.env.example` thành `english-center-api/.env` để cấu hình local.

## 2. Các điểm tạm / Lưu ý đang mở (xóa khi đã xử lý xong)
- `src/config/logger.ts` và `src/shared/middlewares/validate.middleware.ts` đang là file khung.
- Chưa có ca test nghiệp vụ. Khi viết test tích hợp đầu tiên, cần bổ sung bước kết nối PostgreSQL test và áp dụng migration.

## 3. Kinh nghiệm & Bẫy kỹ thuật (tích lũy, tối đa 20 dòng)
- `pg` trả về `COUNT(*)`, `SUM()` và `BIGINT` dạng `string` -> luôn ép `Number(...)` tại tầng `repository`.
- `req.query` của Express luôn là `string` -> dùng `z.coerce.number()` / `z.coerce.boolean()` trong Zod schema cho phân trang và bộ lọc.
- Nếu `tsx` báo `uv_os_get_passwd` trong sandbox Windows, kiểm tra lại cùng lệnh trong môi trường người dùng.
