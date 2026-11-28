# English Center API

Bộ khung Express + TypeScript cho dự án quản lý trung tâm tiếng Anh. `src/app.ts` tạo ứng dụng, `src/server.ts` mở cổng HTTP và `src/routes/index.ts` là nơi gắn các module vào đường dẫn `/api`.

## Chạy tại máy

Dùng Node.js 24 trở lên. Từ thư mục `backend`, chạy:

```sh
npm ci
npm run dev
```

Server mặc định lắng nghe tại `http://127.0.0.1:3000`. Router đang trống nên các đường dẫn trả về HTTP 404. Có thể chỉnh `HOST` và `PORT` trong `.env`. Khi dùng bản sao mới từ Git, sao chép `.env.example` thành `.env` nếu cần đổi cấu hình.

## Thư mục

| Đường dẫn | Mục đích |
| --- | --- |
| `src/config/` | Cấu hình môi trường, PostgreSQL, Redis và logger |
| `src/db/` | Migration SQL và seed |
| `src/modules/` | Các module nghiệp vụ, bắt đầu với `auth` và `user` |
| `src/shared/` | Middleware, kiểu dữ liệu, lỗi và tiện ích dùng chung |
| `src/jobs/`, `tests/` | Tác vụ nền và kiểm thử |
| `docker/` | Thư mục trống dành cho cấu hình Docker sau này |

PostgreSQL và Redis đã có thư viện client. Server có thể khởi động độc lập trong giai đoạn dựng khung.

Chạy `npm run typecheck` để kiểm tra kiểu. Chạy `npm run build` rồi `npm start` để dùng bản biên dịch.
