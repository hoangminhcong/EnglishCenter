# KIẾN TRÚC PHÂN HỆ KẾ TOÁN (`ACCOUNTING_ARCHITECTURE`)

## 1. Vị trí trong Monorepo English Center

Phân hệ **Kế toán (`Accounting Portal`)** là một khu vực nghiệp vụ tích hợp trực tiếp bên trong ứng dụng quản trị thống nhất `apps/staff-web/`, dùng chung:
- Khung giao diện điều hướng `StaffLayout`, `StaffSidebar`, `StaffBreadcrumb`.
- Nền tảng xác thực phiên nhân sự `AuthGuard` và bảo vệ tuyến `PermissionGuard`.
- Gói giao diện dùng chung `@english-center/ui` và hàm định dạng chuẩn Việt Nam `@english-center/utils`.
- Hợp đồng kiểu dữ liệu chuẩn hóa tại `@english-center/contracts` (`packages/contracts/src/operations/operations.types.ts`).

## 2. Cấu trúc Thư mục Module

```text
apps/staff-web/src/features/accounting/
├── hooks/
│   └── useAccounting.ts                  # Query Keys & Actor Context của Kế toán
├── pages/
│   ├── AccountingDashboardPage.tsx       # /accounting/dashboard
│   ├── AccountingPaymentsPage.tsx        # /accounting/payments
│   ├── AccountingReceivablesPage.tsx     # /accounting/receivables
│   ├── AccountingReceivableDetailPage.tsx# /accounting/receivables/:id
│   ├── AccountingTransactionsPage.tsx    # /accounting/transactions (Sổ cái + Hoàn tiền + Audit)
│   ├── AccountingReceiptsPage.tsx        # /accounting/receipts (Xem & In trình duyệt)
│   └── AccountingReportsPage.tsx         # /accounting/reports
├── services/
│   └── accountingApi.ts                  # Tầng dịch vụ tính toán công nợ, thu từng đợt, hoàn tiền
└── types/
    └── accounting.types.ts               # Nhãn hiển thị & kiểu dữ liệu tổng hợp giao diện
```

## 3. Nguyên tắc Thiết kế Cốt lõi

1. **Tách bạch 4 khái niệm tài chính**:
   - *Học phí niêm yết (`listedTuitionVnd`)*: giá tham chiếu từ chính sách của Admin.
   - *Khoản phải thu (`totalReceivableVnd`)*: nghĩa vụ tài chính gắn với bản ghi `Enrollment` thực tế của học viên.
   - *Tiền thực thu đã xác nhận (`paidConfirmedVnd`)*: tổng các giao dịch ở trạng thái `Confirmed`.
   - *Tiền thu ròng (`netCollectedVnd`)*: `paidConfirmedVnd - refundedCompletedVnd`.
2. **Sổ cái bất biến (Immutable Ledger)**:
   - Giao dịch tài chính không có chức năng xóa cứng. Sai sót được xử lý bằng nghiệp vụ `Void` (Hủy giao dịch kèm lý do bắt buộc) hoặc lập `RefundRequest` gắn với giao dịch gốc.
3. **Không giả lập tích hợp ngoài phạm vi**:
   - Chuyển khoản ngân hàng được ghi nhận và đối chiếu sao kê **thủ công** bởi Kế toán.
   - Không phát sinh tính lương, thuế TNCN, bảo hiểm, hóa đơn điện tử hay nhắc nợ SMS/Zalo tự động.
