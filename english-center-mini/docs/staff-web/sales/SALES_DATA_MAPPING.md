# MÔ HÌNH DỮ LIỆU & ĐỐI CHIẾU VỚI CLIENT WEB – SALES CRM (`SALES_DATA_MAPPING`)

Tài liệu này ghi nhận kết quả đối chiếu trực tiếp giữa module **Sales CRM** (`apps/staff-web`), `@english-center/contracts` và mã nguồn thực tế của `apps/client-web`.

---

## 1. BẢNG ÁNH XẠ `CreateConsultationRequest` (`client-web`) ↔ `SalesLeadDto` (`staff-web`)

Nguồn kiểm tra trên Client Web:
- [`apps/client-web/src/features/consultation/types.ts`](file:///d:/Web/english-center-mini/apps/client-web/src/features/consultation/types.ts)
- [`apps/client-web/src/features/consultation/components/ConsultationForm.tsx`](file:///d:/Web/english-center-mini/apps/client-web/src/features/consultation/components/ConsultationForm.tsx) (`footer-form`)
- [`apps/client-web/src/features/schedules/components/ConsultationModal.tsx`](file:///d:/Web/english-center-mini/apps/client-web/src/features/schedules/components/ConsultationModal.tsx) (`schedule-modal`)

| Trường `CreateConsultationRequest` (`client-web`) | Trường `SalesLeadDto` (`@english-center/contracts`) | Trạng thái & Quy tắc đồng bộ khi nối Backend |
| :--- | :--- | :--- |
| `id` *(chưa sinh ở request)* | `id: string` (`lead-*`) | **ĐÃ CHUẨN HÓA** — Dùng khóa định danh ổn định, không dùng SĐT/tên làm khóa chính. |
| `fullName: string` | `fullName: string` | **ĐÃ KHỚP** |
| `phone: string` | `phone: string` | **ĐÃ KHỚP** — Chuẩn hóa 10 số VN (`normalizeVnPhone`), dùng kiểm tra trùng lặp khách hàng. |
| `email?: string` | `email?: string` | **ĐÃ KHỚP** — Có trên `schedule-modal`; không bắt buộc trên `footer-form`. |
| `facebook?: string`, `school?: string` | `facebookUrl?: string`, `schoolOrWork?: string` | **ĐÃ KHỚP** — Thu thập từ `footer-form`. |
| `purpose?: string`, `note?: string` | `learningNeed: string` | **ĐÃ KHỚP** — Hợp nhất mục đích học ban đầu của khách. |
| `currentLevel?: string`, `targetGoal?: string` | `currentLevelNote?: string`, `targetGoalNote?: string` | **ĐÃ KHỚP** — Bảo toàn mức tự đánh giá từ form Website. |
| `preferredTime?: string` | `preferredContactTime?: string` | **ĐÃ KHỚP** |
| `courseName: string` *(chuỗi tên hiển thị)* | `interestedCourseIds: string[]` | **CẦN ÁNH XẠ Ở BACKEND** — Client Web gửi chuỗi tên khóa; Backend ánh xạ sang `courseId` chuẩn (`foundation-toeic`, `beginners-toeic`, `camp-bomb-toeic`, `submarine-toeic`). |
| `branchName?: string` *(chuỗi tên cơ sở)* | `preferredBranchId?: string` | **CẦN ÁNH XẠ Ở BACKEND** — Ánh xạ về `branchId` (`cs-ha-dong`..`cs-quan-1`, `toeic-online`). |
| `scheduleId?: string` | `interestedClassId?: string` | **ĐÃ KHỚP** — Trỏ trực tiếp tới ID lớp mở tuyển sinh (`sch-hd-01`..). |
| `source: 'footer-form' \| 'schedule-modal' \| 'course-page'` | `source: 'website-consultation' \| 'schedule-modal' \| 'course-page' \| 'manual'` | **ĐÃ KHỚP** |
| *(Hành vi bấm nút Gửi đăng ký)* | `consentSummary: string` | **TRUNG THỰC VỚI HIỆN TRẠNG** — Client Web chưa có checkbox Consent riêng; ghi nhận rõ nguồn khách chủ động gửi biểu mẫu. |

---

## 2. ĐỐI CHIẾU THỰC THỂ DÙNG CHUNG (`Course`, `Branch`, `Class`, `Schedule`, `Enrollment`)

| Thực thể | Nguồn ở `client-web` | Nguồn dùng chung ở `staff-web` | Đối chiếu & Các điểm `CLIENT CHƯA HỖ TRỢ` |
| :--- | :--- | :--- | :--- |
| **`Course`** | `features/courses/mocks.ts` (4 khóa TOEIC) | `coursesApi.listCourses()` | **ĐÃ KHỚP 100% ID:** `foundation-toeic`, `beginners-toeic`, `camp-bomb-toeic`, `submarine-toeic`. |
| **`Branch`** | `features/about/mocks/branches.ts` (7 cơ sở) | `cmsApi.listBranches()` | **ĐÃ KHỚP 100% ID:** `toeic-online`, `cs-ha-dong`, `cs-nam-tu-liem`, `cs-hai-ba-trung`, `cs-tay-son`, `cs-kim-ma`, `cs-quan-1`. |
| **`Class` vs `Schedule` vs `Opening Schedule`** | `features/schedules/types.ts` (`Schedule`) & `studentPortal.types.ts` (`StudentClassInfo`) | `trainingApi.listAllCenterClasses()` (`CenterClassOfferingDto`) | Phân biệt rõ: `Course` là chương trình học; `Class` là lớp cụ thể mở tại cơ sở; `Schedule` là thứ/giờ học; `Opening Schedule` là các `Class` có `isPublishedOnWeb = true`. **Các trường `CLIENT CHƯA HỖ TRỢ` trên bảng `Schedule` công khai của Client Web:** `endDate` (ngày kết thúc dự kiến), `teacherName` (giảng viên phân công), `registrationDeadline` (hạn đăng ký). Đã mở rộng tùy chọn trong `CenterClassOfferingDto` và hiển thị trung thực (`Chưa phân công` / `Chưa cấu hình sĩ số` khi thiếu dữ liệu). |
| **`TuitionPolicy`** | `Course.tuitionFee` | `tuitionApi.listPolicies()` | **ĐÃ DÙNG CHUNG** — Sales đọc chính sách đang `active` của Admin để tính học phí dự kiến và chụp vào `RegistrationSnapshot`. |
| **`ToeicScale` & `Milestone`** | `ScoreConversionPoint` | `toeicConfigApi.listScales()` & `listMilestones()` | **ĐÃ DÙNG CHUNG** — Stepper Bước 3 đọc trực tiếp phiên bản `TOEIC-SCALE-V2` và mốc đầu ra của khóa. |
| **`Enrollment`** | `StudentPortalDataset.hasEnrollment` | *(Thuộc phân hệ Giáo vụ)* | **TÁCH BIỆT TUYỆT ĐỐI** — Nộp `CourseRegistration` không tự tạo `Enrollment` và không tự cộng ảo `enrolledStudents`. |
