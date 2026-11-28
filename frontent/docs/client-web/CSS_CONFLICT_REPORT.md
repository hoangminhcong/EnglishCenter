# BÁO CÁO KIỂM TRA XUNG ĐỘT CSS, Z-INDEX & HỆ MÀU (CSS CONFLICT REPORT)

Tài liệu này rà soát toàn bộ hệ thống định kiểu (Styling) của dự án **English Center**, xác minh không có xung đột CSS toàn cục, xung đột lớp phủ (`z-index`) hay pha trộn bảng màu cũ.

---

## 1. KIỂM KÊ CÁC FILE STYLESHEET TRONG DỰ ÁN

Kết quả quét toàn bộ thư mục `src/` xác nhận dự án **chỉ có duy nhất 1 file CSS**:
- **[index.css](file:///d:/Web/english-center-mini/src/index.css)** (`108` dòng) — Không có bất kỳ file `.module.css`, `.scss` hay `App.css` thừa nào từ template Vite mặc định gây ghi đè ngầm.

### Phân tích cấu trúc `src/index.css`:
1. **`@import "tailwindcss";` (Tailwind CSS v4):** Không phát sinh xung đột reset CSS.
2. **Hệ biến màu gốc `:root` (`--ec-*`):**
   - `--ec-primary: #75BDEB` (Xanh dương nhạt chủ đạo)
   - `--ec-primary-dark: #2878B8` (Xanh nhấn đậm đảm bảo độ tương phản chữ WCAG)
   - `--ec-secondary: #A7D8F5`
   - `--ec-soft-blue: #EAF6FD`
   - `--ec-bg: #F5FAFE`
   - `--ec-surface: #FFFFFF`
   - `--ec-text: #243B53`
   - `--ec-text-muted: #718096`
   - `--ec-border: #DCEAF3`
   - `--ec-cta: #F26522`
3. **Typography chuyên biệt:**
   - `.ec-font`: `'Be Vietnam Pro'` cho tiêu đề và điều hướng hiện đại.
   - `.ec-reading-font`: `'Plus Jakarta Sans', 'Be Vietnam Pro'` tối ưu khả năng đọc nhanh đoạn văn tiếng Anh dài ở Part 6 & Part 7 mà không gây mỏi mắt, kèm `tabular-nums` cho đồng hồ và bảng điểm.
4. **Quy tắc in ấn `@media print`:**
   - Tự động ẩn `.no-print` (Header, Sidebar, nút lọc) và định dạng `.print-card` gọn gàng trên khổ giấy A4 khi học viên in Kế hoạch học tập.

---

## 2. KIỂM TRA THỨ BẬC LỚP XẾP CHỒNG (`Z-INDEX` STACKING ORDER)

Một lỗi giao diện điển hình đã xảy ra trước đây là menu thả xuống của tài khoản (`UserAccountDropdown`) bị chìm phía sau thanh Header màu xanh khi tách Topbar ra khỏi `<header>` sticky. Hệ thống `z-index` hiện đã được chuẩn hóa theo phân tầng chặt chẽ:

| Tầng hiển thị | Component | Lớp `z-index` | Mục đích & Tương tác |
| --- | --- | --- | --- |
| Tầng 1 – Nội dung nền | Các section, thẻ câu hỏi, bảng dữ liệu | `z-0` / `z-10` | Hiển thị nội dung trang tiêu chuẩn |
| Tầng 2 – Nút nổi góc màn hình | `FloatingContact.tsx`, `BackToTop.tsx` | `z-30` | Nổi trên nội dung nhưng nằm dưới Header & Drawer |
| Tầng 3 – Thanh điều hướng dính | `<header>` chính màu xanh (`Header.tsx`), Thanh công cụ phòng thi (`TestTakingPage.tsx`, `StudyExercisePage.tsx`) | `sticky top-0 z-40` | Luôn bám dính trên đỉnh màn hình khi cuộn trang |
| Tầng 4 – Hộp thoại & Ngăn kéo câu hỏi | `QuestionNavigator` Drawer, `ConsultationModal`, `TestSubmitModal`, `ExitExamConfirmModal`, `SearchModal` | `fixed inset-0 z-50` | Phủ toàn màn hình khi mở modal/drawer |
| Tầng 5 – Topbar & Dropdown Tài khoản | Khối Topbar chứa `UserAccountDropdown` (`Header.tsx`) | `relative z-[60]` | Đảm bảo menu thả xuống của người dùng luôn nổi đè lên trên thanh `<header>` `z-40` ngay bên dưới |

---

## 3. KIỂM TRA TÍNH NHẤT QUÁN MÀU SẮC TOÀN DỰ ÁN

- Đã rà soát và loại bỏ các mảng nền xanh navy tối (`#0B2A4A`, `#1E3A8A`) từng xuất hiện ở giao diện mẫu khác, chuyển đồng bộ sang tông xanh dương nhạt `#75BDEB` kết hợp xanh nhấn `#2878B8` và nền sáng `#F5FAFE` / `#EAF6FD`.
- Độ tương phản văn bản được đảm bảo: chữ trắng chỉ đặt trên nền `#75BDEB` (cỡ chữ đậm `font-bold`/`font-extrabold`), `#2878B8` hoặc `#F26522`; trên nền sáng `#EAF6FD` luôn dùng chữ đậm `#243B53` hoặc `#2878B8`.
