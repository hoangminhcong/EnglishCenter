# MA TRẬN PHÂN QUYỀN KẾ TOÁN (`ACCOUNTING_PERMISSION_MATRIX`)

| Mã quyền (`PermissionCode`) | Ý nghĩa nghiệp vụ | `ACCOUNTANT` | `ADMIN` (Giám sát) | `SALES` / `ACADEMIC` / `TEACHER` |
| :--- | :--- | :---: | :---: | :---: |
| `finance.dashboard.view` | Xem Dashboard Kế toán | Có | Có (Chỉ xem) | Không |
| `finance.receivables.view` | Xem danh sách & chi tiết khoản phải thu | Có | Có (Chỉ xem) | Không |
| `finance.receivables.create` | Khởi tạo khoản phải thu cho HV mới ghi danh | Có | Không | Không |
| `finance.payments.view` | Xem quản lý thu tiền & lịch sử giao dịch | Có | Có (Chỉ xem) | Không |
| `finance.payments.create` | Ghi nhận thu tiền mặt / chuyển khoản từng đợt | Có | Không | Không |
| `finance.payments.update` | Xác nhận sao kê chuyển khoản / Hủy (Void) GD sai | Có | Không | Không |
| `finance.receipts.view` | Tra cứu, xem & in phiếu thu học phí | Có | Có (Chỉ xem) | Không |
| `finance.receipts.create` | Lập phiếu thu chính thức từ GD `Confirmed` | Có | Không | Không |
| `finance.refunds.view` | Xem danh sách yêu cầu hoàn tiền | Có | Có | Không |
| `finance.refunds.create` | Tạo yêu cầu hoàn tiền từ giao dịch gốc | Có | Không | Không |
| `finance.refunds.approve` | Phê duyệt / Từ chối / Xác nhận hoàn tất hoàn tiền | Có | Có | Không |
| `finance.reports.view` | Xem báo cáo tài chính đa chiều | Có | Có (Chỉ xem) | Không |

## Ghi chú Bảo mật Backend

- Tại Frontend, `PermissionGuard` chặn truy cập URL trực tiếp (`/403`) và ẩn nút thao tác nếu thiếu quyền.
- Khi kết nối Backend Node.js (NestJS), mọi API `/api/v1/staff/accounting/*` bắt buộc kiểm tra lại JWT/Cookie + `PermissionCode` + khóa giao dịch Database (`SELECT ... FOR UPDATE`) để chống ghi trùng đồng thời.
