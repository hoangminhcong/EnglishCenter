> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/architecture/PROJECT_ARCHITECTURE.md`.

# Kiến trúc Frontend – HMC TOEIC Student Portal

## 1. Tổng quan Kiến trúc

Hệ thống Frontend của **HMC TOEIC** được chia thành 3 khu vực giao diện độc lập nhưng dùng chung hạ tầng API, Xác thực và Design System:

1. **Public Website (`PublicLayout`)**: Trang chủ, Khóa học công khai (`/courses`), Lịch khai giảng (`/schedule`), Tin tức, Tài liệu công khai.
2. **Khu tự luyện & Thi thử (`Study Zone` & `Test Online`)**: Luyện tập Ngữ pháp/Từ vựng/Nghe tương tác và phòng thi TOEIC trực tuyến toàn màn hình.
3. **Cổng học viên – Khóa học của tôi (`StudentLayout` – `/student/*`)**: Khu vực quản lý lộ trình học tập chính thức của học viên đã đăng ký lớp tại trung tâm.

## 2. Phân tầng dữ liệu (Layered Architecture)

Luồng dữ liệu trong Student Portal tuân thủ chặt chẽ quy tắc một chiều:

```text
Pages (StudentDashboardPage, StudentLearningPlanPage, ...)
  ↓
Custom Hooks (useStudentPortalData, useSubmitHomeworkMutation, ...) [TanStack Query]
  ↓
Repository Interface (StudentPortalRepository)
  ├── Mock Repository (mockStudentPortalRepository -> LocalStorage + Seed Data)
  └── API Repository  (apiStudentPortalRepository  -> httpClient -> Node.js Backend)
```

### Quy tắc phụ thuộc (Dependency Rules)
- **Component & Page** không gọi `fetch` / `httpClient` trực tiếp và không chứa dữ liệu mẫu cứng.
- **Validation & Business Rules** (kiểm tra link Google Drive/Docs, giới hạn điểm LC/RC 0–495, kiểm tra lý do yêu cầu hỗ trợ) được đặt tại tầng `model/studentPortal.schema.ts`.
- **Chuyển đổi Mock / API** được điều khiển tập trung qua biến môi trường `VITE_USE_MOCK_API` / `VITE_DATA_SOURCE` tại `src/services/api/apiConfig.ts`.
