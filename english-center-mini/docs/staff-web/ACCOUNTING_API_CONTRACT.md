# HỢP ĐỒNG API PHÂN HỆ KẾ TOÁN (`ACCOUNTING_API_CONTRACT`)

Tất cả hằng số đường dẫn đã được khai báo sẵn tại `STAFF_API_ENDPOINTS.accounting` (`apps/staff-web/src/services/api/endpoints.ts`), tương thích với tiền tố `/api/v1` của `staffHttpClient`.

| Phương thức | Endpoint (`/api/v1/...`) | Quyền yêu cầu | Payload / Query chính | Kết quả trả về |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/staff/accounting/dashboard` | `finance.dashboard.view` | `?date=YYYY-MM-DD` | `AccountingDashboardData` |
| `GET` | `/staff/accounting/receivables` | `finance.receivables.view` | `?status=&courseId=&branchId=&q=` | `EnrichedReceivableItem[]` |
| `GET` | `/staff/accounting/receivables/:id` | `finance.receivables.view` | `id` | `ReceivableDetailBundle` |
| `POST` | `/staff/accounting/receivables` | `finance.receivables.create` | `CreateReceivableInput` | `EnrichedReceivableItem` |
| `GET` | `/staff/accounting/payments` | `finance.payments.view` | `?method=&status=&q=` | `{ transactions, auditLogs }` |
| `POST` | `/staff/accounting/payments` | `finance.payments.create` | `RecordPaymentInput` | `{ transaction, receipt? }` |
| `PATCH` | `/staff/accounting/payments/:id/confirm` | `finance.payments.update` | `{ verifiedNote? }` | `PaymentTransactionDto` |
| `PATCH` | `/staff/accounting/payments/:id/void` | `finance.payments.update` | `{ voidReason: string }` | `PaymentTransactionDto` |
| `GET` | `/staff/accounting/receipts` | `finance.receipts.view` | `?q=` | `{ receipts, eligibleConfirmedTransactions }` |
| `POST` | `/staff/accounting/receipts` | `finance.receipts.create` | `{ transactionId, reasonContent? }` | `PaymentReceiptDto` |
| `GET` | `/staff/accounting/refunds` | `finance.refunds.view` | — | `RefundRequestDto[]` |
| `POST` | `/staff/accounting/refunds` | `finance.refunds.create` | `CreateRefundInput` | `RefundRequestDto` |
| `PATCH` | `/staff/accounting/refunds/:id/status` | `finance.refunds.approve` | `{ toStatus, reviewNote? }` | `RefundRequestDto` |
| `GET` | `/staff/accounting/reports` | `finance.reports.view` | `FinancialReportFilters` | `FinancialReportSummary` |

## Quy tắc Ràng buộc Server-side Bắt buộc khi Triển khai Backend

1. Chạy trong Database Transaction khi ghi nhận `PaymentTransaction` để kiểm tra lại `SUM(amount_vnd) <= total_receivable_vnd`.
2. Sinh `receiptNumber` (`PT-YYYY-NNNN`) bằng tuần tự nguyên tử (Sequence) tại Server để không trùng số phiếu.
3. Ràng buộc `UNIQUE(reference_code)` đối với các giao dịch chuyển khoản không ở trạng thái `Voided`.
