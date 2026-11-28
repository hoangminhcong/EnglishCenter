# TÀI LIỆU KIẾN TRÚC SHARED PACKAGES (`SHARED_PACKAGES`)

Tài liệu này quy định phạm vi, nguyên tắc phụ thuộc và hướng dẫn sử dụng 4 gói dùng chung trong thư mục `packages/` của Monorepo **English Center**.

---

## 1. BIỂU ĐỒ PHỤ THUỘC MỘT CHIỀU (DAG – KHÔNG VÒNG LẶP)

```text
@english-center/utils       (0 phụ thuộc nội bộ)
@english-center/contracts   (0 phụ thuộc nội bộ)
@english-center/api-client  ──▶ @english-center/contracts
@english-center/ui          (0 phụ thuộc nội bộ; peerDependencies: react, react-dom)
```

- Tuyệt đối **không** package nào trong `packages/*` được import ngược từ `apps/client-web` hay `apps/staff-web`.
- Tất cả 4 package xuất mã nguồn TypeScript qua `"exports": { ".": "./src/index.ts" }`, tương thích trực tiếp với `moduleResolution: "bundler"` của Vite 8 và TypeScript 7.

---

## 2. CHI TIẾT TỪNG PACKAGE

### 2.1. `@english-center/api-client` (`packages/api-client/`)
- **Trách nhiệm:** Quản lý giao tiếp HTTP dùng chung (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), timeout bằng `AbortController`, tuần tự hóa `JSON` & `FormData`, truyền `credentials: 'include'`, gắn Bearer Token qua `AuthTokenProvider` và chuẩn hóa lỗi `ApiClientError` (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`).
- **Giới hạn nghiêm ngặt:**
  - **Không** đọc `import.meta.env` (ứng dụng chủ truyền `baseUrl` và `configError` vào `createApiClient`).
  - **Không** chứa `QueryClient` (mỗi Frontend tự khởi tạo `QueryClient` riêng).
  - **Không** chứa logic nghiệp vụ Khóa học, Học viên, Kế toán hay Đề thi.

### 2.2. `@english-center/contracts` (`packages/contracts/`)
- **Trách nhiệm:** Nguồn chuẩn duy nhất định nghĩa hợp đồng giao tiếp giữa `client-web`, `staff-web` và `backend`:
  - `openapi/openapi.yaml`: Đặc tả OpenAPI 3.1 cho `/api/v1/*`.
  - `src/common/api.types.ts`: `ApiSuccessResponse<T>`, `ApiPaginatedResponse<T>`, `PaginationQuery`, `ApiErrorResponse`, `IsoDateString`, `IsoDateTimeString`, `VndAmount`.
  - `src/auth/rbac.types.ts`: `STAFF_ROLES`, `StaffRole`, `AccountRole`, `PERMISSION_CODES`, `PermissionCode`.
  - `src/entities/core.types.ts`: Hợp đồng thực thể chuẩn của 6 miền nghiệp vụ.
- **Giới hạn nghiêm ngặt:** Không đưa Prisma Model hoặc cấu trúc bảng vật lý của Database vào package này; View Model nội bộ riêng của từng màn hình vẫn đặt tại `features/*/types` của ứng dụng đó.

### 2.3. `@english-center/ui` (`packages/ui/`)
- **Trách nhiệm:** Cung cấp các UI primitive thực sự dùng chung giữa Website/Portal và Staff Portal:
  - `Button`, `Badge`, `InputField`, `SelectField`, `Modal`, `Pagination`, `LoadingBlock`, `EmptyBlock`, `ErrorBlock`, `DataTable*` primitives.
- **Cấu hình Tailwind CSS 4 bắt buộc:**
  - `apps/client-web/src/index.css`: `@source "../../../packages/ui/src";`
  - `apps/staff-web/src/styles/index.css`: `@source "../../../../packages/ui/src";`
- **Giới hạn nghiêm ngặt:** Không đưa `PageBanner`, `FilterBar`, `Header`, `StaffSidebar`, `StudentLayout` hay các component phòng thi TOEIC vào `@english-center/ui`.

### 2.4. `@english-center/utils` (`packages/utils/`)
- **Trách nhiệm:** Chỉ chứa hàm thuần túy không trạng thái:
  - Ngày giờ & Tiền tệ: `formatDate`, `formatDateTimeVi`, `getTodayIsoInVietnam`, `isIsoDateExpiredInVietnam` (`Asia/Ho_Chi_Minh`), `formatVnd`.
  - Xử lý chuỗi & Phân trang: `removeDiacritics`, `matchText`, `paginate`.
  - Bảo mật URL & Kiểm tra định dạng: `toSafeHttpUrl`, `toSafeVideoFileUrl`, `toSafeEmbedUrl`, `isValidVnPhone`, `isValidEmail`, `isValidFacebookUrl`.
