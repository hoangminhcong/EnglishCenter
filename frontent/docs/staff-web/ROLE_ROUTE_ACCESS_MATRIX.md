# MA TRẬN ĐƯỜNG DẪN (`ROUTE`), MENU SIDEBAR & ĐIỀU HƯỚNG SAU ĐĂNG NHẬP (`ROLE_ROUTE_ACCESS_MATRIX`)

## 1. Quy tắc Điều hướng Sau Đăng nhập (`Post-Login Landing Resolution`)

Hàm `resolveStaffDefaultHomePath(session)` tại [`permissions.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/permissions.config.ts) quyết định trang đích hoàn toàn dựa trên `permissions`:

1. Nếu `session` rỗng hoặc `session.permissions.length === 0` -> Điều hướng tới `/no-access` ([`NoAccessPage`](file:///d:/Web/english-center-mini/apps/staff-web/src/components/StaffSystemPages.tsx)).
2. Kiểm tra `session.defaultLandingRoute` (trả về từ phiên `/auth/me`): nếu route này tồn tại trong danh mục điều hướng và tài khoản có đủ `requiredPermissions` của route đó -> Điều hướng tới `defaultLandingRoute`.
3. Nếu không có `defaultLandingRoute` hoặc không đủ quyền cho `defaultLandingRoute` -> Duyệt danh sách chuẩn ưu tiên và chọn route đầu tiên mà tài khoản có đủ `requiredPermissions`.
4. Nếu không khớp bất kỳ route giao diện nào -> Điều hướng về `/no-access` (tuyệt đối không gây vòng lặp redirect vô hạn).

| Vai trò mẫu | `defaultLandingRoute` | Điều kiện quyền để vào trang đích |
| :--- | :--- | :--- |
| `ADMIN` (`admin.demo`) | `/dashboard` | `dashboard.view` |
| `SALES` (`sale.demo`, `sale2.demo`) | `/sales/dashboard` | `sales.dashboard.view` |
| `ACCOUNTANT` (`accountant.demo`) | `/accounting/dashboard` | `finance.dashboard.view` |
| `ACADEMIC` (`academic.demo`) | `/academic/dashboard` | `academic.dashboard.view` |
| `TEACHER` (`teacher.demo`, `teacher2.demo`) | `/teacher/dashboard` | `teacher.dashboard.view` |
| `HR_ACADEMIC` (`hr.academic.demo`) | `/academic/dashboard` | `academic.dashboard.view` |
| `HR` | `/accounts` | `accounts.view` |
| Tài khoản `0` quyền | `/no-access` | Hiển thị thông báo chưa được cấp quyền + nút Đăng xuất |

---

## 2. Bảng Ánh xạ Toàn bộ Route, Menu Sidebar & Quyền Bảo vệ (`PermissionGuard`)

Nguồn cấu hình chuẩn: [`navigation.config.ts`](file:///d:/Web/english-center-mini/apps/staff-web/src/services/permissions/navigation.config.ts) và [`router/index.tsx`](file:///d:/Web/english-center-mini/apps/staff-web/src/app/router/index.tsx).

### 2.1. Nhóm Quản trị Hệ thống, CMS, Học liệu & Giám sát
| Đường dẫn (`Path`) | Hiển thị trên Sidebar | Nhóm Menu | Mã quyền bắt buộc (`requiredPermissions`) | Hành vi khi gõ URL trực tiếp mà thiếu quyền |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | Có | Tổng quan & Giám sát | `dashboard.view` | Hiển thị `403 – Forbidden` |
| `/training` | Có | Tổng quan & Giám sát | `training.view` | Hiển thị `403 – Forbidden` |
| `/reports` | Có | Tổng quan & Giám sát | `reports.view` | Hiển thị `403 – Forbidden` |
| `/accounts` | Có | Tài khoản & Phân quyền | `accounts.view` | Hiển thị `403 – Forbidden` |
| `/accounts/roles` *(alias `/roles`)* | Có | Tài khoản & Phân quyền | `roles.view` | Hiển thị `403 – Forbidden` |
| `/courses` | Có | Đào tạo & Học phí | `courses.view` | Hiển thị `403 – Forbidden` |
| `/tuition` | Có | Đào tạo & Học phí | `tuition.view` | Hiển thị `403 – Forbidden` |
| `/content/center-info` | Có | Nội dung Website (CMS) | `center_info.view` | Hiển thị `403 – Forbidden` |
| `/content/branches` | Có | Nội dung Website (CMS) | `branches.view` | Hiển thị `403 – Forbidden` |
| `/content/news` | Có | Nội dung Website (CMS) | `news.view` | Hiển thị `403 – Forbidden` |
| `/content/jobs` | Có | Nội dung Website (CMS) | `jobs.view` | Hiển thị `403 – Forbidden` |
| `/content/achievements` | Có | Nội dung Website (CMS) | `achievements.view` | Hiển thị `403 – Forbidden` |
| `/learning/materials` | Có | Học liệu & Kho đề TOEIC | `materials.view` | Hiển thị `403 – Forbidden` |
| `/learning/study-zone` & `/:exerciseId` | Có (trang danh sách) | Học liệu & Kho đề TOEIC | `study_zone.view` | Hiển thị `403 – Forbidden` |
| `/learning/tests` & `/:testId` | Có (trang danh sách) | Học liệu & Kho đề TOEIC | `tests.view` | Hiển thị `403 – Forbidden` |
| `/config/toeic` | Có | Cấu hình hệ thống | `toeic_config.view` | Hiển thị `403 – Forbidden` |

### 2.2. Nhóm Tư vấn Tuyển sinh (`Sales CRM`)
| Đường dẫn (`Path`) | Hiển thị trên Sidebar | Mã quyền bắt buộc (`requiredPermissions`) | Mặc định `ADMIN` có thấy Menu không? |
| :--- | :--- | :--- | :--- |
| `/sales/dashboard` | Có | `sales.dashboard.view` | **Không** (ẩn trên Sidebar & trả `403` nếu truy cập URL) |
| `/sales/leads/:leadId` | Trang chi tiết | `sales.leads.view` | **Không** |
| `/sales/courses` & `/:courseId` | Có | `sales.courses.view` | **Không** |
| `/sales/registrations/new` | Có | `sales.registrations.create` | **Không** |
| `/sales/registrations` & `/:id` | Có | `sales.registrations.view` | **Không** |

### 2.3. Nhóm Kế toán & Học phí (`Accounting Portal`)
| Đường dẫn (`Path`) | Hiển thị trên Sidebar | Mã quyền bắt buộc (`requiredPermissions`) | Mặc định `ADMIN` có thấy Menu không? |
| :--- | :--- | :--- | :--- |
| `/accounting/dashboard` | Có | `finance.dashboard.view` | **Không** |
| `/accounting/payments` | Có | `finance.payments.view` | **Không** |
| `/accounting/receivables` & `/:id` | Có | `finance.receivables.view` | **Không** |
| `/accounting/transactions` | Có | `finance.payments.view` | **Không** |
| `/accounting/receipts` | Có | `finance.receipts.view` | **Không** |
| `/accounting/reports` | Có | `finance.reports.view` | **Không** |

### 2.4. Nhóm Giáo vụ & Học viên (`Academic Portal`)
| Đường dẫn (`Path`) | Hiển thị trên Sidebar | Mã quyền bắt buộc (`requiredPermissions`) | Mặc định `ADMIN` có thấy Menu không? |
| :--- | :--- | :--- | :--- |
| `/academic/dashboard` | Có | `academic.dashboard.view` | **Không** |
| `/academic/students` & `/:studentId` | Có | `students.view` | **Không** |
| `/academic/classes` & `/:classId` | Có | `classes.view` | **Không** |
| `/academic/placement` | Có | `class-placement.view` | **Không** |
| `/academic/requests` | Có | `student-status.view` | **Không** |
| `/academic/course-content` | Có | `course-content.view` | **Không** |

### 2.5. Nhóm Cổng Giảng viên (`Teacher Portal`)
| Đường dẫn (`Path`) | Hiển thị trên Sidebar | Mã quyền bắt buộc (`requiredPermissions`) | Mặc định `ADMIN` có thấy Menu không? |
| :--- | :--- | :--- | :--- |
| `/teacher/dashboard` | Có | `teacher.dashboard.view` | **Không** |
| `/teacher/classes` & `/:classId` | Có | `teacher.classes.view` | **Không** |
| `/teacher/teaching-plans` | Có | `teaching-plan.view` | **Không** |
| `/teacher/attendance` | Có | `attendance.view` | **Không** |
| `/teacher/assignments` | Có | `assignments.view` | **Không** |
| `/teacher/gradebook` | Có | `grades.view` | **Không** |
| `/teacher/progress` | Có | `teacher.classes.view` | **Không** |
| `/teacher/schedule` | Có | `teacher.schedule.view` | **Không** |
