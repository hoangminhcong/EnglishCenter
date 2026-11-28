# HỢP ĐỒNG GIAO TIẾP API THỐNG NHẤT (`API_CONTRACT`)

- **Nguồn chuẩn kỹ thuật (Single Source of Contract):**
  - OpenAPI 3.1: [`packages/contracts/openapi/openapi.yaml`](../../packages/contracts/openapi/openapi.yaml)
  - TypeScript DTOs & Error Codes: [`packages/contracts/src/index.ts`](../../packages/contracts/src/index.ts)
- **Tiền tố gốc (Base URL):** `/api/v1`

---

## 1. CHUẨN PHẢN HỒI & PHÂN TRANGStaff@2026

### 1.1. Thành công đơn lẻ (`ApiSuccessResponse<T>`)
```json
{
  "success": true,
  "data": {},
  "message": "Thao tác thành công"
}
```

### 1.2. Thành công có phân trang (`ApiPaginatedResponse<T>`)
- **Query chuẩn:** `?page=1&limit=20&search=...&sortBy=createdAt&sortOrder=desc`
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

---

## 2. CHUẨN XỬ LÝ MÃ LỖI HTTP (`400` – `500`)

`@english-center/api-client` ánh xạ từng mã trạng thái HTTP sang `ApiErrorCode` riêng biệt (không gộp chung một thông báo mờ nhạt):

| HTTP Status | `error.code` | Ý nghĩa nghiệp vụ & Cách Frontend xử lý |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | Tham số truy vấn hoặc yêu cầu sai quy cách -> Hiển thị thông báo cụ thể từ máy chủ. |
| `401` | `UNAUTHORIZED` | Chưa đăng nhập hoặc hết hạn phiên -> Gọi callback `onUnauthorized`, dọn sạch phiên cục bộ & `queryClient.clear()`, chuyển về `/login`. |
| `403` | `FORBIDDEN` | Không đủ `Permission` (`staff-web`) hoặc truy cập tài nguyên của học viên khác (`client-web`) -> Hiển thị trang `403` hoặc thông báo từ chối quyền. |
| `404` | `NOT_FOUND` | Bản ghi không tồn tại hoặc chưa xuất bản (`draft`/`archived`) -> Hiển thị `EmptyBlock` / trang `404` thân thiện, không retry. |
| `409` | `CONFLICT` | Trùng email/username đăng ký hoặc nộp lại lượt thi đã đóng -> Hiển thị cảnh báo xung đột trạng thái. |
| `422` | `VALIDATION_ERROR` | Dữ liệu form không hợp lệ -> Trả mảng `error.details: [{ field, message }]` để gắn lỗi vào đúng ô nhập liệu. |
| `429` | `TOO_MANY_REQUESTS` | Gửi quá nhiều yêu cầu đăng nhập / tư vấn -> Thông báo người dùng tạm đợi trước khi thử lại. |
| `500` | `INTERNAL_SERVER_ERROR` | Sự cố máy chủ -> Cho phép retry tối đa 2 lần đối với truy vấn `GET` và hiển thị nút `"Thử lại"`. |

---

## 3. TÓM TẮT NHÓM ENDPOINT TRONG `client-web` VÀ `staff-web`

### A. Nhóm Endpoint `client-web` (`apps/client-web/src/services/api/endpoints.ts`)
- **Auth Học viên:** `POST /auth/login`, `POST /auth/register`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `POST /auth/logout`, `GET /auth/me`.
- **Public Website:** `GET /public/branches`, `GET /public/courses`, `GET /public/courses/:slug`, `GET /public/schedules`, `GET /public/news`, `GET /public/news/:id`, `GET /public/articles`, `GET /public/articles/:slug`, `GET /public/careers`, `GET /public/careers/:id`, `POST /public/consultations`.
- **Student Portal:** `GET /students/me/portal-overview`, `POST /assignments/:assignmentId/submissions`, `POST /support-requests`.
- **Study Zone:** `GET /public/study-zone/topics`, `GET /public/study-zone/topics/:slug`, `GET /public/study-zone/exercises/:id`, `POST /public/study-zone/exercises/:id/submit`.
- **Test Online TOEIC:** `GET /public/tests`, `GET /public/tests/:slug`, `GET /public/tests/id/:testId`, `GET /public/test-attempts/in-progress`, `POST /public/test-attempts/start`, `GET /public/test-attempts/:attemptId`, `PATCH /public/test-attempts/:attemptId/progress`, `POST /public/test-attempts/:attemptId/discard`, `POST /public/test-attempts/:attemptId/submit`, `GET /public/test-attempts/:attemptId/result`, `GET /public/test-history`, `GET /public/test-history/:attemptId`.

### B. Nhóm Endpoint `staff-web` (`apps/staff-web/src/services/api/endpoints.ts`)
- **Auth & Tổng quan:** `POST /staff/auth/login`, `POST /staff/auth/logout`, `GET /staff/auth/me`, `GET /staff/dashboard/overview` (`dashboard.view`).
- **Admin Portal:** `/staff/accounts` (`accounts.*`), `/staff/roles` (`roles.*`), `/staff/courses` (`courses.*`), `/staff/tuition-policies` (`tuition.*`), `/staff/training/classes` & `/staff/training/public-schedules` (`training.view` / `sales.courses.view`), `/staff/cms/*` (`center_info.*`, `branches.*`, `news.*`, `jobs.*`, `achievements.*`), `/staff/learning/*` (`materials.*`, `study_zone.*`, `tests.*`), `/staff/config/toeic/*` (`toeic_config.*`), `/staff/reports/summary` (`reports.view`).
- **Sales CRM (`/api/v1/staff/sales/*` – kiểm tra bắt buộc cả `PermissionCode` và `DataScope: own | all` tại Backend):**
  - `GET /staff/sales/dashboard?period=today|7d|30d` (`sales.dashboard.view`)
  - `GET /staff/sales/leads`, `POST /staff/sales/leads`, `GET /staff/sales/leads/:id`, `PUT /staff/sales/leads/:id`, `PATCH /staff/sales/leads/:id/status` (`sales.leads.*`; trả `409 CONFLICT` khi trùng SĐT/email chưa xác nhận override, `403 FORBIDDEN` khi truy cập Lead ngoài phạm vi `own`)
  - `POST /staff/sales/consultations` (`sales.consultations.create` – chỉ thêm mới bản ghi tư vấn bất biến, không ghi đè)
  - `POST /staff/sales/follow-ups`, `PATCH /staff/sales/follow-ups/:id` (`sales.followups.*`)
  - `GET /staff/sales/registrations`, `POST /staff/sales/registrations`, `GET /staff/sales/registrations/:id`, `PUT /staff/sales/registrations/:id`, `PATCH /staff/sales/registrations/:id/status` (`sales.registrations.*`; các trạng thái `Reviewing | NeedAdditionalInfo | Approved | Rejected` yêu cầu quyền `sales.registrations.review` của Giáo vụ/Admin; khi nộp `Submitted` Server kiểm tra lại sức chứa lớp để chống tranh chấp chỗ cuối cùng).
