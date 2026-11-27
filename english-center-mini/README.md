# English Center – Monorepo System

Hệ thống phần mềm đào tạo và luyện thi TOEIC **English Center**, tổ chức theo kiến trúc **npm Workspaces Monorepo** gồm 2 ứng dụng Frontend độc lập, 4 gói dùng chung và tầng Adapter sẵn sàng kết nối **Backend Node.js (NestJS) + PostgreSQL**.

---

## 1. Cấu trúc Monorepo

- **`apps/client-web`** (`http://localhost:5173`): Website công khai, Đăng ký tư vấn, Cổng học viên (`Student Portal`), Kho tự luyện (`Study Zone`) và Hệ thống thi trực tuyến (`Test Online TOEIC`).
- **`apps/staff-web`** (`http://localhost:5174`): Cổng quản trị & vận hành nội bộ cho 5 vai trò cố định (`ADMIN`, `SALES`, `ACCOUNTANT`, `ACADEMIC`, `TEACHER`) với cơ chế Fixed RBAC tách biệt hoàn toàn khỏi Student Authorization.
- **`packages/api-client`**: HTTP Client dùng chung (`fetch`, timeout, abort, chuẩn hóa lỗi HTTP & `ApiEnvelope<T>`).
- **`packages/contracts`**: Hợp đồng dữ liệu chuẩn (`openapi/openapi.yaml`, Domain DTOs & RBAC codes).
- **`packages/ui`**: Bộ UI primitives dùng chung (`Button`, `Badge`, `InputField`, `SelectField`, `Modal`, `Pagination`, `StateViews`, `DataTable*`).
- **`packages/utils`**: Các hàm tiện ích thuần túy (ngày giờ chuẩn `Asia/Ho_Chi_Minh`, tiền tệ `VND`, `slugifyVi`, bảo mật URL `safeUrl`, `validators`).

---

## 2. Chế độ Dữ liệu & Kết nối Backend

- Khi chưa cấu hình `VITE_API_BASE_URL` (Backend chưa triển khai), cả hai ứng dụng chạy qua **Empty/Development Adapter**: khởi tạo ở trạng thái **dữ liệu rỗng (`[]`)**, không tự động sinh tài khoản Demo hay số liệu giả trên giao diện, và hiển thị Empty State chuẩn cho từng module.
- Dữ liệu mẫu kiểm thử (`Test Fixtures`) được tách riêng hoàn toàn trong thư mục `tests/fixtures/` của từng ứng dụng và chỉ nạp khi chạy bộ kiểm thử tự động (`npm test`).
- Khi Backend Node.js sẵn sàng: sao chép `.env.example` sang `.env.local`, khai báo `VITE_API_BASE_URL` và đặt `VITE_USE_MOCK_API=false` / `VITE_STAFF_DATA_SOURCE=api` để chuyển sang **HTTP Adapter**.

---

## 3. Lệnh phát triển & Kiểm tra chất lượng

```bash
npm ci                  # Cài đặt dependencies toàn Monorepo
npm run dev:client      # Chạy Client Web tại http://localhost:5173
npm run dev:staff       # Chạy Staff Web tại http://localhost:5174

npm run typecheck       # Kiểm tra kiểu TypeScript toàn dự án
npm run lint            # Kiểm tra Oxlint toàn dự án (src + tests)
npm test                # Chạy kiểm thử tự động cả Client Web và Staff Web
npm run build           # Đóng gói Production cả hai ứng dụng
```

---

## 4. Tài liệu kỹ thuật

Xem mục lục đầy đủ tại [`docs/README.md`](./docs/README.md).
