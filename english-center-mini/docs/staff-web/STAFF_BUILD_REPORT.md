# BÁO CÁO KIỂM ĐỊNH BUILD, LINT, TYPECHECK & THƯƠNG HIỆU (`STAFF_BUILD_REPORT`)

- **Ngày kiểm định:** `2026-11-25`
- **Phạm vi kiểm định:** Toàn bộ Monorepo (`apps/staff-web`, `apps/client-web`, `packages/*`)

---

## 1. KẾT QUẢ XÁC MINH KỸ THUẬT TOÀN MONOREPO

| Lệnh kiểm tra | Phạm vi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- |
| `npm run typecheck:packages` | `utils`, `contracts`, `api-client`, `ui` | `0` lỗi TypeScript (`tsc -p tsconfig.json`) | **PASS** |
| `npm run typecheck:client` | `apps/client-web` | `0` lỗi TypeScript (`tsc -b`) | **PASS** |
| `npm run typecheck:staff` | `apps/staff-web` (`79` tệp nguồn) | `0` lỗi TypeScript (`tsc -b`) | **PASS** |
| `npm run lint:packages` | `packages/*` (`20` tệp) | `Found 0 warnings and 0 errors` (`12ms`) | **PASS** |
| `npm run lint:client` | `apps/client-web/src` (`181` tệp) | `Found 0 warnings and 0 errors` (`64ms`) | **PASS** |
| `npm run lint:staff` | `apps/staff-web/src` (`79` tệp) | `Found 0 warnings and 0 errors` (`34ms`, đạt chuẩn React Compiler) | **PASS** |
| `npm run build:client` | `@english-center/client-web` | `2329 modules transformed`, `built in 688ms`, `0` cảnh báo chunk | **PASS** |
| `npm run build:staff` | `@english-center/staff-web` | `2222 modules transformed`, `built in 546ms`, `0` cảnh báo chunk | **PASS** |

### Dung lượng gói biên dịch Production của `apps/staff-web`
- `dist/index.html`: `0.99 kB` (`gzip: 0.53 kB`)
- `dist/assets/index-*.css`: `33.70 kB` (`gzip: 6.70 kB`)
- `dist/assets/index-*.js`: `316.15 kB` (`gzip: 74.16 kB`)
- `dist/assets/vendor-*.js`: `365.67 kB` (`gzip: 114.81 kB`)

---

## 2. XÁC MINH RÀNG BUỘC CÔ LẬP & KHÔNG PHÁ VỠ (`NON-BREAKING GUARANTEES`)

1. **Không sửa đổi `apps/client-web`:** Không có bất kỳ tệp mã nguồn nào trong `apps/client-web/` bị thay đổi trong suốt quá trình phát triển `apps/staff-web`.
2. **Không cài đặt thêm thư viện ngoài:** `package.json` gốc và `apps/staff-web/package.json` giữ nguyên 100% danh mục dependencies hiện có (`React 19.3.1`, `TypeScript ~7.0.2`, `Vite 8.3.6`, `Tailwind CSS 4.3.5`, `React Router 7.18.5`, `TanStack Query 5.108.0`, `Lucide React`).
3. **Không dùng `@ts-ignore`, `any` hay `oxlint-disable`:** Toàn bộ mã nguồn tuân thủ nghiêm ngặt `erasableSyntaxOnly: true` và `verbatimModuleSyntax: true`.

---

## 3. BÁO CÁO QUÉT THƯƠNG HIỆU (`BRAND SWEEP REPORT`)

Thực hiện quét biểu thức chính quy `\bHMC\b` trên toàn bộ kho mã nguồn, phân tách rõ 3 khu vực theo yêu cầu:

| Khu vực kiểm tra | Số lần xuất hiện `HMC` | Chi tiết & Đánh giá |
| :--- | :--- | :--- |
| **1. Mã nguồn ứng dụng đang chạy (`apps/staff-web/**`, `apps/client-web/**`, `packages/**`)** | **`0` vị trí** | **Đạt tuyệt đối.** Toàn bộ tiêu đề trình duyệt, Sidebar, Header, trang Login, cấu hình trung tâm, email mẫu và dữ liệu khởi tạo sử dụng thống nhất **`English Center`**. |
| **2. Tài liệu kiến trúc & đặc tả hiện hành (`docs/staff-web/**`, `docs/architecture/**`, `docs/api-contract/**`, `docs/data-model/**`, `docs/security/**`, `docs/backend/**`)** | **`0` vị trí trong `docs/staff-web/**`** | Chỉ có ghi chú lịch sử sửa lỗi trong `docs/migration/` và báo cáo kiểm toán cũ trong `docs/client-web/` giải thích việc đã thay thế tên cũ sang `English Center` (không thay đổi để giữ tính trung thực của lịch sử kiểm toán). |
| **3. Tài liệu lưu trữ lịch sử (`docs/archive/**`)** | Các tài liệu lịch sử giai đoạn Single-App cũ | Được giữ nguyên văn cảnh lịch sử kèm nhãn cảnh báo `[CŨ – CẦN ĐỐI CHIẾU]` ở đầu tệp theo đúng quy tắc bảo toàn lịch sử. |
