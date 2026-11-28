# ĐẶC TẢ CHỨC NĂNG, WORKFLOW, MÁY TRẠNG THÁI & PHÂN QUYỀN – MODULE SALES CRM (`SALES_SPECIFICATION`)

- **Ứng dụng:** `apps/staff-web` (`@english-center/staff-web`)
- **Định tuyến Sales CRM:** `/sales/dashboard`, `/sales/leads/:leadId`, `/sales/courses`, `/sales/courses/:courseId`, `/sales/registrations/new`, `/sales/registrations`, `/sales/registrations/:id`
- **Hợp đồng kiểu dữ liệu tập trung:** [`packages/contracts/src/sales/sales.types.ts`](file:///d:/Web/english-center-mini/packages/contracts/src/sales/sales.types.ts)

---

## 1. PHẠM VI & RANH GIỚI NGHIỆP VỤ BẮT BUỘC

Luồng công việc của nhân viên **Sale (`SALES`)** bắt đầu từ tiếp nhận khách hàng tiềm năng và kết thúc tại **nộp & theo dõi hồ sơ đăng ký khóa học (`CourseRegistration`)**:

| Nghiệp vụ | Vai trò thực hiện | Trạng thái trong Sales CRM |
| :--- | :--- | :--- |
| Tiếp nhận `Lead`, ghi `Consultation` bất biến, đặt `FollowUp` | `SALES` (hoặc `ADMIN` giám sát) | **Đã triển khai đầy đủ** |
| Xem toàn bộ Khóa học & Lớp đang mở tại tất cả 7 cơ sở | `SALES`, `ADMIN` | **Đã triển khai đầy đủ (Chỉ đọc nguồn chung)** |
| Tạo & nộp `CourseRegistration` gắn `classId` cụ thể + chụp `RegistrationSnapshot` | `SALES` | **Đã triển khai đầy đủ** |
| Xét duyệt hồ sơ (`Reviewing -> Approved / NeedAdditionalInfo / Rejected`) | `ACADEMIC`, `HR_ACADEMIC`, `ADMIN` (`sales.registrations.review`) | **Đã triển khai đầy đủ** *(Sale chỉ xem kết quả, không thấy nút duyệt)* |
| Tạo `Enrollment` chính thức & xếp lớp | `ACADEMIC` | **Ngoài phạm vi** *(Chỉ giữ trạng thái `Converted` trong enum để theo dõi)* |
| Thu học phí, lập `PaymentReceipt`, quản lý công nợ | `ACCOUNTANT` | **Ngoài phạm vi** *(Sale chỉ tư vấn học phí dự kiến từ `TuitionPolicy`)* |
| Mời học viên lần đầu vào nhóm (Mục VI.5) | *(Chờ xác nhận nền tảng nhóm)* | **TẠM DỪNG theo phê duyệt Audit Giai đoạn 1** |

---

## 2. ĐIỀU HƯỚNG 4 MỤC MENU & MA TRẬN QUYỀN (`RBAC + DATA SCOPE`)

Khi đăng nhập bằng tài khoản vai trò **`SALES`**, thanh điều hướng trái chỉ hiển thị đúng **4 mục menu**:
1. **Dashboard** (`/sales/dashboard` – `sales.dashboard.view`)
2. **Xem khóa học để tư vấn** (`/sales/courses` – `sales.courses.view`)
3. **Đăng ký khóa học** (`/sales/registrations/new` – `sales.registrations.create`)
4. **Danh sách đăng ký** (`/sales/registrations` – `sales.registrations.view`)

Route `/sales/leads/:leadId` (`sales.leads.view`) mở từ bảng khách hàng trên Dashboard mà không tạo thêm mục menu thứ 5.

### Ma trận quyền & Phạm vi dữ liệu (`DataScope`)

| Mã quyền | `SALES` (`scope: own`) | `ACADEMIC` / `HR_ACADEMIC` (`scope: all` khi xét duyệt) | `ADMIN` (`scope: all`) |
| :--- | :---: | :---: | :---: |
| `sales.dashboard.view` | Có (`own`) | Không | Có (`all`) |
| `sales.leads.view` | Có (`own` – chặn `403` Lead của Sale khác) | Có (`all` – tra cứu đối chiếu hồ sơ) | Có (`all`) |
| `sales.leads.create` / `update` | Có (`own`) | Không | Có (`all`) |
| `sales.consultations.view` / `create` | Có (`own`) | Chỉ `view` | Có (`all`) |
| `sales.followups.view` / `create` / `update` | Có (`own`) | Không | Có (`all`) |
| `sales.courses.view` | Có (**Đọc toàn bộ khóa & lớp mọi cơ sở**) | *(Dùng `/courses`, `/training`)* | Có |
| `sales.registrations.view` | Có (`own`) | Có (`all`) | Có (`all`) |
| `sales.registrations.create` / `update` | Có (`own`) | Không | Có (`all`) |
| `sales.registrations.review` | **Không** | **Có** | **Có** |
| `sales.group-invitations.create` | *Tạm khóa (Chờ xác nhận Mục VI.5)* | *Tạm khóa* | *Tạm khóa* |

---

## 3. MÁY TRẠNG THÁI HỢP LỆ (`STATE MACHINES`)

### 3.1. `LeadStatus` (`LEAD_ALLOWED_MANUAL_TRANSITIONS`)
- `New` → `Contacting | NotInterested | Lost`
- `Contacting` → `Consulting | FollowUp | NotInterested | Lost`
- `Consulting` → `FollowUp | Interested | NotInterested | Lost`
- `FollowUp` → `Contacting | Consulting | Interested | NotInterested | Lost`
- `Interested` → `FollowUp | NotInterested | Lost`
- `NotInterested | Lost` → `Contacting` *(Bắt buộc nhập lý do mở lại)*
- `Registered`: **Không cho phép đặt tay**; hệ thống tự động đặt khi một `CourseRegistration` của khách được nộp sang `Submitted` (chỉ `ADMIN` mới được mở lại về `Contacting` kèm lý do).

### 3.2. `FollowUpStatus` (`FOLLOW_UP_ALLOWED_TRANSITIONS`)
- `Scheduled` → `Completed | Missed | Cancelled`.
- Nhãn **"Quá hạn"** không lưu cứng trong store mà được suy diễn thuần khiết khi `status === 'Scheduled' && dueAt < nowIso` thông qua `useCurrentTime()`.

### 3.3. `CourseRegistrationStatus`
- `Draft` → `Submitted` (Sale), `Cancelled` (Sale)
- `Submitted` → `Reviewing` (Giáo vụ/Admin), `Cancelled` (Sale/Admin)
- `Reviewing` → `NeedAdditionalInfo | Approved | Rejected` (Giáo vụ/Admin – bắt buộc ghi chú khi yêu cầu bổ sung hoặc từ chối)
- `NeedAdditionalInfo` → `Submitted` (Sale nộp lại sau khi bổ sung trong Stepper), `Cancelled` (Sale/Admin)
- `Approved` → `Cancelled` (Admin); chuyển tiếp sang `Converted` thuộc quy trình tạo `Enrollment` của Giáo vụ.

---

## 4. QUY TRÌNH ĐĂNG KÝ 6 BƯỚC GẮN LỚP CỤ THỂ (`SalesNewRegistrationPage`)

1. **Bước 1 – Khách hàng:** Chọn khách đã có trong CRM, đối chiếu các hồ sơ đăng ký hiện có.
2. **Bước 2 – Khóa học → Cơ sở → Lớp cụ thể:** Chỉ cho chọn lớp `open` hoặc `upcoming` còn chỗ; chạy `evaluatePreRegistrationChecks()` kiểm tra khớp khóa/cơ sở, sĩ số còn lại, trùng hồ sơ cùng lớp và **xung đột lịch học** (trùng thứ + giao khung giờ trong cùng giai đoạn học).
3. **Bước 3 – Mục tiêu điểm:** Đọc khung thang điểm đang kích hoạt (`TOEIC-SCALE-V2`) và `Milestones` từ `toeicConfigApi`.
4. **Bước 4 – Thông tin Cam kết tư vấn:** Ghi nhận mục tiêu đầu ra được tư vấn, điều kiện chuyên cần/bài tập và xác nhận đã tư vấn rõ với khách.
5. **Bước 5 – Học phí dự kiến:** Tra cứu tự động từ `tuitionApi` (chính sách đang `active`), chỉ hiện ưu đãi khi chính sách có quy tắc thật; nếu không có giá hiển thị `Chưa có dữ liệu học phí`.
6. **Bước 6 – Kiểm tra lại & Xác nhận:** Hỗ trợ **Lưu nháp (`Draft`)** hoặc **Nộp hồ sơ (`Submitted`)** sinh mã `REG-2026-XXXX`, đóng băng `RegistrationSnapshot` và tự động đặt `Lead.status = 'Registered'`.
