# CHECKLIST TÍCH HỢP BACKEND NODE.JS CHO MONOREPO (`BACKEND_INTEGRATION_CHECKLIST`)

Checklist thực hành dành cho kỹ sư Backend và Fullstack khi kết nối `apps/client-web` và `apps/staff-web` với `apps/backend` (NestJS).

---

## 1. Cấu hình Biến Môi trường Từng Ứng dụng

- **`apps/client-web/.env.local`:**
  ```env
  VITE_API_BASE_URL=http://localhost:4000/api/v1
  VITE_USE_MOCK_API=false
  VITE_DATA_SOURCE=api
  ```
- **`apps/staff-web/.env.local`:**
  ```env
  VITE_STAFF_API_BASE_URL=http://localhost:4000/api/v1
  VITE_STAFF_USE_MOCK_API=false
  VITE_STAFF_DATA_SOURCE=api
  ```
- **`apps/backend/.env` (Chỉ đặt tại Server, tuyệt đối không dùng tiền tố `VITE_`):**
  ```env
  PORT=4000
  DATABASE_URL=postgresql://...
  JWT_ACCESS_SECRET=...
  JWT_REFRESH_SECRET=...
  CLIENT_WEB_ORIGIN=http://localhost:5173
  STAFF_WEB_ORIGIN=http://localhost:5174
  ```

---

## 2. Checklist Kỹ thuật Trên Backend NestJS

- [ ] **CORS đa Origin có kiểm soát:** Cho phép chính xác `CLIENT_WEB_ORIGIN` (`http://localhost:5173`) và `STAFF_WEB_ORIGIN` (`http://localhost:5174`) với `credentials: true`.
- [ ] **Cookie & Token tách biệt:** Dùng tên cookie phiên riêng cho Học viên và Nhân sự để tránh ghi đè khi mở hai cổng trên cùng trình duyệt.
- [ ] **Chuẩn Envelope & Error Filter:** Trả `{ success: true, data, meta? }` cho thành công và `{ success: false, error: { code, message, details? } }` cho mọi ngoại lệ HTTP `400/401/403/404/409/422/429/500`.
- [ ] **RBAC & Ownership Guard:**
  - Mọi route `/api/v1/staff/*` bắt buộc kiểm tra `PermissionCode` (`module.action`).
  - Mọi route `/api/v1/students/me/*` và `/api/v1/public/test-attempts/*` bắt buộc lấy `userId` từ phiên xác thực, chống IDOR.
- [ ] **Bảo mật Đề thi TOEIC:** Không serialize `correctOptionId` và `explanation` trước khi `attempt.status` chuyển sang `'submitted'` hoặc `'expired'`.
- [ ] **Bảo toàn Snapshot lịch sử:** Chốt cứng `agreedTuitionVnd` trong `Enrollment` và `testVersionId` + `scoreScaleVersionId` trong `TestAttempt`.
