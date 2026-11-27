# HỆ THỐNG TÀI LIỆU KỸ THUẬT – ENGLISH CENTER MONOREPO

Thư mục `docs/` được quy hoạch chuẩn hóa theo từng miền kiến trúc, không trùng lặp và phản ánh chính xác mã nguồn thực tế của Monorepo **English Center**.

---

## 1. TÀI LIỆU KIẾN TRÚC MONOREPO, HỢP ĐỒNG API & NỀN TẢNG DỮ LIỆU

1. **Kiến trúc tổng thể:** [architecture/PROJECT_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/architecture/PROJECT_ARCHITECTURE.md)
2. **Cấu trúc thư mục Monorepo:** [architecture/PROJECT_FOLDER_STRUCTURE.md](file:///d:/Web/english-center-mini/docs/architecture/PROJECT_FOLDER_STRUCTURE.md)
3. **Bản đồ di chuyển Monorepo:** [migration/MIGRATION_MAP.md](file:///d:/Web/english-center-mini/docs/migration/MIGRATION_MAP.md)
4. **Nhật ký thay đổi Migration:** [migration/MIGRATION_CHANGELOG.md](file:///d:/Web/english-center-mini/docs/migration/MIGRATION_CHANGELOG.md)
5. **Mô hình dữ liệu nghiệp vụ:** [data-model/DATA_MODEL.md](file:///d:/Web/english-center-mini/docs/data-model/DATA_MODEL.md)
6. **Hợp đồng API thống nhất (`/api/v1/*`):** [api-contract/API_CONTRACT.md](file:///d:/Web/english-center-mini/docs/api-contract/API_CONTRACT.md) *(đi kèm OpenAPI 3.1 tại [`packages/contracts/openapi/openapi.yaml`](file:///d:/Web/english-center-mini/packages/contracts/openapi/openapi.yaml))*
7. **Luồng dữ liệu hệ thống:** [data-model/DATA_FLOW.md](file:///d:/Web/english-center-mini/docs/data-model/DATA_FLOW.md)
8. **Xác thực & Phân quyền RBAC nền tảng:** [security/AUTHENTICATION_RBAC.md](file:///d:/Web/english-center-mini/docs/security/AUTHENTICATION_RBAC.md)
9. **Kiến trúc Shared Packages:** [architecture/SHARED_PACKAGES.md](file:///d:/Web/english-center-mini/docs/architecture/SHARED_PACKAGES.md)
10. **Sẵn sàng tích hợp Backend Node.js:** [backend/BACKEND_READINESS.md](file:///d:/Web/english-center-mini/docs/backend/BACKEND_READINESS.md) *(kèm [backend/BACKEND_INTEGRATION_CHECKLIST.md](file:///d:/Web/english-center-mini/docs/backend/BACKEND_INTEGRATION_CHECKLIST.md))*
11. **Nhật ký sửa lỗi & cảnh báo:** [migration/BUG_FIX_LOG.md](file:///d:/Web/english-center-mini/docs/migration/BUG_FIX_LOG.md)
12. **Xác minh Build Monorepo:** [migration/BUILD_VERIFICATION.md](file:///d:/Web/english-center-mini/docs/migration/BUILD_VERIFICATION.md)
13. **Hạng mục tích hợp Monorepo còn lại:** [migration/REMAINING_ISSUES.md](file:///d:/Web/english-center-mini/docs/migration/REMAINING_ISSUES.md)

---

## 2. TÀI LIỆU STAFF WEB (`docs/staff-web/`)

### 2.1. Nền tảng Staff Web, Admin Portal & Báo cáo Liên thông Tổng hợp
1. **Kiến trúc ứng dụng Staff Web:** [staff-web/STAFF_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/staff-web/STAFF_ARCHITECTURE.md)
2. **Đặc tả chức năng Admin Portal:** [staff-web/ADMIN_FEATURE_SPECIFICATION.md](file:///d:/Web/english-center-mini/docs/staff-web/ADMIN_FEATURE_SPECIFICATION.md)
3. **Đối chiếu dữ liệu Staff Web & Client Web:** [staff-web/ADMIN_CLIENT_DATA_MAPPING.md](file:///d:/Web/english-center-mini/docs/staff-web/ADMIN_CLIENT_DATA_MAPPING.md)
4. **Thiết kế phân quyền & Data Scope (`STAFF_RBAC`):** [staff-web/STAFF_RBAC.md](file:///d:/Web/english-center-mini/docs/staff-web/STAFF_RBAC.md)
5. **Đặc tả soạn thảo & kiểm định Test Online:** [staff-web/TEST_ONLINE_AUTHORING_SPEC.md](file:///d:/Web/english-center-mini/docs/staff-web/TEST_ONLINE_AUTHORING_SPEC.md)
6. **Đặc tả biên tập Study Zone:** [staff-web/STUDY_ZONE_AUTHORING_SPEC.md](file:///d:/Web/english-center-mini/docs/staff-web/STUDY_ZONE_AUTHORING_SPEC.md)
7. **Báo cáo kiểm định Build & Rà soát thương hiệu:** [staff-web/STAFF_BUILD_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/STAFF_BUILD_REPORT.md)
8. **Báo cáo tích hợp liên thông 5 phân hệ (`STAFF_INTEGRATION_REPORT`):** [staff-web/STAFF_INTEGRATION_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/STAFF_INTEGRATION_REPORT.md)
9. **Hạng mục còn lại & phụ thuộc Backend (`STAFF_REMAINING_ISSUES`):** [staff-web/STAFF_REMAINING_ISSUES.md](file:///d:/Web/english-center-mini/docs/staff-web/STAFF_REMAINING_ISSUES.md)

### 2.2. Module Sales CRM (`docs/staff-web/sales/`)
1. [staff-web/sales/SALES_SPECIFICATION.md](file:///d:/Web/english-center-mini/docs/staff-web/sales/SALES_SPECIFICATION.md)
2. [staff-web/sales/SALES_DATA_MAPPING.md](file:///d:/Web/english-center-mini/docs/staff-web/sales/SALES_DATA_MAPPING.md)
3. [staff-web/sales/SALES_TEST_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/sales/SALES_TEST_REPORT.md)
4. [staff-web/sales/SALES_REMAINING_ISSUES.md](file:///d:/Web/english-center-mini/docs/staff-web/sales/SALES_REMAINING_ISSUES.md)

### 2.3. Phân hệ Kế toán (`Accounting Portal` – 6 tài liệu)
1. [staff-web/ACCOUNTING_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_ARCHITECTURE.md)
2. [staff-web/ACCOUNTING_WORKFLOW.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_WORKFLOW.md)
3. [staff-web/ACCOUNTING_DATA_MODEL.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_DATA_MODEL.md)
4. [staff-web/ACCOUNTING_PERMISSION_MATRIX.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_PERMISSION_MATRIX.md)
5. [staff-web/ACCOUNTING_API_CONTRACT.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_API_CONTRACT.md)
6. [staff-web/ACCOUNTING_TEST_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/ACCOUNTING_TEST_REPORT.md)

### 2.4. Phân hệ Giáo vụ (`Academic Portal` – 6 tài liệu)
1. [staff-web/ACADEMIC_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_ARCHITECTURE.md)
2. [staff-web/ACADEMIC_WORKFLOW.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_WORKFLOW.md)
3. [staff-web/ACADEMIC_DATA_MODEL.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_DATA_MODEL.md)
4. [staff-web/ACADEMIC_PERMISSION_MATRIX.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_PERMISSION_MATRIX.md)
5. [staff-web/ACADEMIC_API_CONTRACT.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_API_CONTRACT.md)
6. [staff-web/ACADEMIC_TEST_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/ACADEMIC_TEST_REPORT.md)

### 2.5. Phân hệ Giảng viên (`Teacher Portal` – 6 tài liệu)
1. [staff-web/TEACHER_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_ARCHITECTURE.md)
2. [staff-web/TEACHER_WORKFLOW.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_WORKFLOW.md)
3. [staff-web/TEACHER_DATA_MODEL.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_DATA_MODEL.md)
4. [staff-web/TEACHER_PERMISSION_MATRIX.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_PERMISSION_MATRIX.md)
5. [staff-web/TEACHER_API_CONTRACT.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_API_CONTRACT.md)
6. [staff-web/TEACHER_TEST_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/TEACHER_TEST_REPORT.md)

### 2.6. Xác thực, Tài khoản Nhân viên, Phân quyền Cố định & Điều hướng Hai Frontend (`docs/staff-web/auth/` – 9 tài liệu chuẩn)
1. [staff-web/auth/AUTH_ARCHITECTURE.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/AUTH_ARCHITECTURE.md)
2. [staff-web/auth/ACCOUNT_MODEL.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/ACCOUNT_MODEL.md)
3. [staff-web/auth/EMPLOYEE_ACCOUNT_SPECIFICATION.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/EMPLOYEE_ACCOUNT_SPECIFICATION.md)
4. [staff-web/auth/FIXED_ROLE_PERMISSION_MATRIX.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/FIXED_ROLE_PERMISSION_MATRIX.md)
5. [staff-web/auth/PORTAL_RESOLUTION.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/PORTAL_RESOLUTION.md)
6. [staff-web/auth/ROUTE_ACCESS_MATRIX.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/ROUTE_ACCESS_MATRIX.md)
7. [staff-web/auth/AUTH_API_CONTRACT.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/AUTH_API_CONTRACT.md)
8. [staff-web/auth/AUTHENTICATION_TEST_REPORT.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/AUTHENTICATION_TEST_REPORT.md)
9. [staff-web/auth/AUTH_REMAINING_ISSUES.md](file:///d:/Web/english-center-mini/docs/staff-web/auth/AUTH_REMAINING_ISSUES.md)

---

## 3. TÀI LIỆU CLIENT WEB & KHO LƯU TRỮ

- **`docs/client-web/`:** Lưu trữ đầy đủ bộ báo cáo kiểm toán giao diện, đồng bộ dữ liệu, responsive, router và kiểm định chuyên sâu hệ thống thi TOEIC trực tuyến của `apps/client-web`.
- **`docs/archive/`:** Lưu trữ các tài liệu giai đoạn cũ đã được hợp nhất hoặc thay thế.
