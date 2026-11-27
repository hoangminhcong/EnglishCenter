# KIẾN TRÚC PHÂN HỆ GIÁO VỤ (`ACADEMIC_ARCHITECTURE`)

## 1. Phạm vi & Vai trò

Phân hệ **Giáo vụ (`Academic / Student Management Portal`)** phục vụ hai vai trò `ACADEMIC` (Giáo vụ đào tạo) và `HR_ACADEMIC` (Nhân sự – Giáo vụ kết hợp), ưu tiên trọng tâm vận hành học vụ:
- Tiếp nhận hồ sơ đăng ký khóa học đã duyệt (`Approved`) từ Sales CRM để xếp lớp hàng tháng.
- Quản lý vòng đời học viên (`waiting_placement` → `studying` → `hold` / `completed` / `dropped`).
- Điều phối kho dữ liệu Lớp học dùng chung toàn hệ thống (`ec_staff_mock_center_classes_v1`).
- Phê duyệt nguyện vọng nhận lớp mới của Giảng viên.
- Quản lý đơn Bảo lưu / Chuyển lớp / Học lại và phiên bản Khung chương trình đào tạo (`CourseSyllabusVersionDto`).

## 2. Cấu trúc Thư mục Module

```text
apps/staff-web/src/features/academic/
├── hooks/
│   └── useAcademic.ts                    # Query Keys & Actor Context của Giáo vụ
├── pages/
│   ├── AcademicDashboardPage.tsx         # /academic/dashboard
│   ├── AcademicStudentsPage.tsx          # /academic/students
│   ├── AcademicStudentDetailPage.tsx     # /academic/students/:studentId
│   ├── AcademicClassesPage.tsx           # /academic/classes (+ Duyệt nguyện vọng GV)
│   ├── AcademicClassDetailPage.tsx       # /academic/classes/:classId
│   ├── AcademicPlacementPage.tsx         # /academic/placement
│   ├── AcademicRequestsPage.tsx          # /academic/requests
│   └── AcademicCourseContentPage.tsx     # /academic/course-content
├── services/
│   └── academicApi.ts                    # Xử lý xếp lớp, chuyển lớp, kiểm tra trùng lịch
└── types/
    └── academic.types.ts                 # Kiểu dữ liệu view-model của Giáo vụ
```

## 3. Tách bạch Ranh giới Nghiệp vụ

- **Không sửa Danh mục khóa học công khai Website**: Giáo vụ chỉ quản lý phiên bản nội dung buổi học nội bộ (`CourseSyllabusVersionDto`); thông tin tiếp thị khóa học trên Website thuộc Admin (`/courses`).
- **Không thu tiền hay tự tính hoàn phí**: Khi Giáo vụ xếp lớp hoặc chuyển lớp, hệ thống tạo/cập nhật `Enrollment` và bảo toàn công nợ hiện hữu để Kế toán đối soát độc lập.
- **Không sửa điểm thi của Giảng viên**: Bảng điểm hiển thị trong hồ sơ học viên của Giáo vụ ở chế độ `Chỉ đọc (Read-only)`.
