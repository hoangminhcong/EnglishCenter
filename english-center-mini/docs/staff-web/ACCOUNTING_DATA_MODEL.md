# MÔ HÌNH DỮ LIỆU KẾ TOÁN (`ACCOUNTING_DATA_MODEL`)

## 1. Các Thực thể Chính (`@english-center/contracts`)

### 1.1. `AccountingReceivableDto` (Khoản phải thu)
| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` / `receivableCode` | `string` | Định danh ổn định & mã hiển thị (`RCV-2026-0001`) |
| `studentId` / `enrollmentId` | `string` | Khóa ngoại bắt buộc trỏ tới Học viên & Bản ghi Ghi danh |
| `courseId` / `classId` / `branchId` | `string` | Liên kết Khóa học, Lớp học và Cơ sở |
| `tuitionPolicyId` / `tuitionPolicyCode` | `string?` | Chính sách học phí tham chiếu tại thời điểm lập |
| `listedTuitionVnd` / `discountAmountVnd` | `number` | Giá niêm yết và mức giảm trừ |
| `totalReceivableVnd` | `number` | Tổng nghĩa vụ phải thu (`> 0`) |
| `dueDate` | `IsoDateString` | Ngày hạn thanh toán (`YYYY-MM-DD`) |
| `isCancelled` | `boolean` | Trạng thái hủy nghiệp vụ khoản phải thu |

### 1.2. `PaymentTransactionDto` (Giao dịch thu tiền)
| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` / `transactionCode` | `string` | Định danh & mã giao dịch (`GD-2026-0001`) |
| `receivableId` | `string` | Khoản phải thu được thanh toán |
| `amountVnd` | `number` | Số tiền đợt thanh toán (`> 0`) |
| `paymentMethod` | `'cash' \| 'bank_transfer'` | Phương thức thanh toán |
| `status` | `'Confirmed' \| 'PendingVerification' \| 'Voided'` | Trạng thái hạch toán |
| `bankTransferMeta` | `object?` | `bankName`, `referenceCode`, `transferContent`, `verifiedByName`, `verifiedAt` |
| `receiptId` / `receiptNumber` | `string?` | Liên kết 1–1 tới Phiếu thu (nếu đã xuất) |

### 1.3. `PaymentReceiptDto` (Phiếu thu)
- Lưu `receiptNumber` (`PT-2026-0001`), `transactionId`, `receivableId`, `payerName`, `cashierUserId`, `amountVnd`, `reasonContent`, `issuedAt`.

### 1.4. `RefundRequestDto` (Yêu cầu hoàn tiền)
- Lưu `refundCode` (`RF-2026-0001`), `originalTransactionId`, `receivableId`, `amountVnd`, `reason`, `status` (`Requested | PendingApproval | Approved | Rejected | Completed | Cancelled`), `reviewedByName`, `completedAt`.

## 2. Quy tắc Toàn vẹn Liên phân hệ

- Kế toán **đọc** `Student` và `Enrollment` từ kho học vụ chung (`ec_staff_mock_academic_ops_v1`) và `TuitionPolicy` từ Admin (`tuitionApi`).
- Kế toán **không bao giờ** chỉnh sửa trạng thái lớp học, điểm danh hay bảng điểm học viên.
