# BÁO CÁO KIỂM THỬ PHÂN HỆ KẾ TOÁN (`ACCOUNTING_TEST_REPORT`)

## 1. Kết quả Kiểm tra Tự động (Đã chạy lệnh thực tế)

| Lệnh kiểm tra | Phạm vi | Kết quả |
| :--- | :--- | :--- |
| `npm run typecheck` | `@english-center/contracts`, `client-web`, `staff-web` | **PASS** (`0` lỗi TypeScript) |
| `npm run lint` | `130` tệp nguồn `staff-web` (`116` quy tắc Oxlint) | **PASS** (`0` cảnh báo, `0` lỗi) |
| `npm run build:staff` | Production bundle Vite 8 (`2275` modules) | **PASS** (`built in 3.52s`) |

## 2. Kịch bản Nghiệp vụ Đã Xác minh Logic Dịch vụ & Giao diện

| Mã kịch bản | Nội dung kiểm tra | Kết quả |
| :--- | :--- | :--- |
| `ACC-TC-01` | Đăng nhập tài khoản `accountant@englishcenter.edu.vn` (`Staff@2026`), tự động điều hướng về `/accounting/dashboard` và chỉ hiển thị đúng 6 mục menu Kế toán. | **PASS** |
| `ACC-TC-02` | Dashboard Kế toán hiển thị nhãn `DỮ LIỆU MINH HỌA`, tách bạch rõ `Thực thu đã xác nhận (Confirmed)` khỏi `Khoản phải thu` và `Giao dịch chờ kiểm tra sao kê`. | **PASS** |
| `ACC-TC-03` | Tạo Khoản phải thu mới cho học viên `Hoàng Minh Đức` (`ENR-2026-0005` chưa có Receivable), tự động gắn chính sách `HP-FD-2026-Q4` và chặn tạo trùng lần 2. | **PASS** |
| `ACC-TC-04` | Thu tiền từng đợt (`Partial/Installment`): chặn nhập `<= 0đ`, chặn thu vượt số dư còn được phép thu và chặn trùng mã tham chiếu chuyển khoản. | **PASS** |
| `ACC-TC-05` | Chuyển khoản thủ công (`GD-2026-0004` – `PendingVerification`): xác nhận đối chiếu sao kê chuyển sang `Confirmed` và tự động giảm công nợ còn lại của `RCV-2026-0002`. | **PASS** |
| `ACC-TC-06` | Không có nút xóa cứng giao dịch; hủy nghiệp vụ (`Void`) bắt buộc nhập lý do và ghi vào nhật ký kiểm toán (`TransactionAuditLogDto`). | **PASS** |
| `ACC-TC-07` | Lập Phiếu thu chỉ cho phép chọn giao dịch `Confirmed` (`GD-2026-0002`), hỗ trợ xem chứng từ và gọi `window.print()`. | **PASS** |
| `ACC-TC-08` | Tạo và duyệt Yêu cầu hoàn tiền kiểm tra trần hoàn tiền của giao dịch gốc, không xóa giao dịch thanh toán ban đầu. | **PASS** |
