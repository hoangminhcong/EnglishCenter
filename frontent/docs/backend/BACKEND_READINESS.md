# ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG TÍCH HỢP BACKEND NODE.JS (`BACKEND_READINESS`)

Tài liệu này tổng hợp trạng thái sẵn sàng của toàn bộ Monorepo **English Center** để kết nối với **Backend NestJS + PostgreSQL + Prisma** mà không cần viết lại giao diện hay luồng điều hướng.

---

## 1. CÁC NỀN TẢNG ĐÃ HOÀN TẤT TRÊN MONOREPO (`100% READY`)

1. **Tách biệt hoàn toàn 2 Frontend & Shared Packages:**
   - `apps/client-web` (`:5173`) và `apps/staff-web` (`:5174`) có cấu hình `.env` riêng, `QueryClient` riêng và `httpClient` riêng được khởi tạo từ `@english-center/api-client`.
2. **Không có Page hay Component nào phụ thuộc trực tiếp vào Mock Data:**
   - Toàn bộ dữ liệu Mock trong `client-web` được nạp động (`await import(...)`) bên dưới tầng `api/*`, `services/*` và `repositories/*`. Khi đặt `VITE_USE_MOCK_API=false`, dữ liệu mẫu không còn được thực thi.
3. **Hợp đồng API & Domain DTO thống nhất:**
   - Đã định nghĩa tập trung tại `@english-center/contracts` (`openapi/openapi.yaml` + `src/entities/core.types.ts`) với tiền tố `/api/v1/`, chuẩn phân trang `PaginationMeta` và bộ mã lỗi HTTP `400..500`.
4. **Chuẩn hóa Múi giờ & Tiền tệ:**
   - Toàn bộ hàm xử lý ngày lịch theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) và tiền tệ số nguyên `VND` đã được tập trung tại `@english-center/utils`.

---

## 2. LỘ TRÌNH KHỞI TẠO & KẾT NỐI `apps/backend` (NESTJS)

1. **Bước 1 – Khởi tạo ứng dụng NestJS & Prisma tại `apps/backend/`:**
   - Thêm `"apps/backend"` vào mảng `"workspaces"` trong `package.json` gốc.
   - Thiết lập Prisma Schema ánh xạ đúng 6 miền thực thể trong [`DATA_MODEL.md`](file:///d:/Web/english-center-mini/docs/data-model/DATA_MODEL.md).
2. **Bước 2 – Triển khai Core Auth, RBAC Guard & Danh mục gốc:**
   - Hoàn thiện `/api/v1/auth/*`, `/api/v1/staff/auth/*`, `/api/v1/public/branches`, `/api/v1/public/courses`, `/api/v1/public/schedules`.
3. **Bước 3 – Triển khai Nghiệp vụ Tuyển sinh, Đào tạo & Kế toán:**
   - Kết nối `/api/v1/public/consultations` -> Staff Sale -> Enrollment -> Receivable/Payment -> Student Portal (`/api/v1/students/me/portal-overview`, nộp BTVN, điểm danh, điểm thi).
4. **Bước 4 – Triển khai Engine Đề thi TOEIC Server-side (`TestVersion` & Bảo mật Answer Key):**
   - Di chuyển dữ liệu đáp án chuẩn vào bảng `test_question_answer_keys` trên PostgreSQL; chấm điểm trên Server khi nhận `POST /api/v1/public/test-attempts/:attemptId/submit`.
