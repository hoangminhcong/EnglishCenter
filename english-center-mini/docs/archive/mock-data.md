> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/backend/BACKEND_READINESS.md`.

# Hướng dẫn Mock Data & Chuyển đổi API – HMC TOEIC Student Portal

## 1. Vị trí lưu trữ Mock Data

Toàn bộ dữ liệu mẫu của Cổng học viên được đặt tại:
- `src/features/student-portal/mocks/studentPortalMockData.ts`
- `src/features/student-portal/repositories/studentPortal.repository.ts`

## 2. Tài khoản Học viên Mẫu để Kiểm thử

Khi đăng nhập tại `/login`:
1. **`hocvien01` (Đỗ Như Đạt)** hoặc **`minhanh.toeic` (Nguyễn Minh Anh)**:
   - Đã được xếp vào lớp **HMC-S01** – Khóa **Submarine 700+** (Giảng viên: Cô Lan Hương, Cơ sở 1 – Cầu Giấy, 24 buổi / 8 tuần).
   - Có đầy đủ tiến độ 24 buổi học, BTVN, Demo Test, Lịch sử điểm danh, Kết quả Middle Test (635/990) và Thời khóa biểu.
2. **Tài khoản mới tự đăng ký tại `/register`**:
   - Chưa được giáo vụ xếp lớp chính thức (`hasEnrollment: false`), hệ thống hiển thị màn hình hướng dẫn tham khảo khóa học hoặc tự luyện tại Study Zone / Test Online.

## 3. Lưu trữ tương tác trong chế độ Mock

- Khi học viên nộp link Google Drive, điền điểm Demo Test hoặc gửi yêu cầu hỗ trợ sau khóa học, dữ liệu được lưu theo từng `studentId` trong `localStorage`:
  - `hmc_portal_submissions_v1_<studentId>`
  - `hmc_portal_support_requests_v1_<studentId>`
- Để reset dữ liệu về trạng thái ban đầu, chỉ cần xóa 2 khóa trên trong `localStorage` của trình duyệt.

## 4. Cách chuyển sang chế độ Backend API thật

Khi Backend Node.js hoàn thành, cấu hình file `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=api
```
`studentPortalRepository` sẽ tự động chuyển sang `apiStudentPortalRepository` mà không cần sửa bất kỳ Component hay Page nào.
