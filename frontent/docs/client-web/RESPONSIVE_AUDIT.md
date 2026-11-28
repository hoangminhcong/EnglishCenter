# BÁO CÁO KIỂM TOÁN & TỐI ƯU GIAO DIỆN ĐA THIẾT BỊ (RESPONSIVE AUDIT)

Tài liệu này tổng hợp kết quả rà soát và tối ưu bố cục Responsive, khả năng truy cập (Accessibility) và xử lý nội dung dài/đa phương tiện của dự án **English Center** trên dải kích thước màn hình từ **Mobile nhỏ (`320×640`) đến Desktop rộng (`1920×1080`)**.

---

## 1. MA TRẬN KÍCH THƯỚC MÀN HÌNH ĐỐI CHIẾU

| Nhóm thiết bị | Độ phân giải chuẩn kiểm tra | Breakpoint Tailwind CSS tương ứng | Cách tổ chức bố cục chính |
| --- | --- | --- | --- |
| **Mobile nhỏ & tiêu chuẩn** | `320×640`, `360×800`, `375×812`, `390×844`, `412×915` | Mặc định (`< 640px`) | 1 cột dọc, Menu Hamburger ngăn kéo, Sidebar học viên thu gọn thành thanh tab ngang cuộn mượt, Phòng thi TOEIC xếp chồng câu hỏi dưới ngữ liệu đọc/nghe, Drawer danh sách câu hỏi trượt phủ màn hình. |
| **Tablet dọc & ngang** | `768×1024`, `820×1180`, `1024×768` | `md:` (`>= 768px`), `lg:` (`>= 1024px`) | Lưới 2 cột cho thẻ Khóa học / Tin tức / Đề thi; Header chuyển đổi sang thanh điều hướng ngang ở `lg:`; Phòng thi bắt đầu chia 2 cột song song từ `lg:` (`1024px`). |
| **Laptop & Desktop lớn** | `1280×800`, `1366×768`, `1440×900`, `1920×1080` | `xl:` (`>= 1280px`), `2xl:` (`>= 1536px`) | Giới hạn chiều rộng đọc tối ưu (`max-w-7xl` trên Website, `max-w-[1240px]` trên Cổng học viên, `max-w-[1380px]` trong Phòng thi TOEIC) để câu văn không quá dài trên màn `1920px`. |

---

## 2. KIỂM TRA CHI TIẾT TỪNG KHU VỰC GIAO DIỆN

### 2.1. Header, Topbar, Dropdown Tài khoản & Footer (`PublicLayout`)
- **Thanh công cụ xanh dương (`Header.tsx`):**
  - Topbar đặt `relative z-[60]` và `<header>` chính đặt `sticky top-0 z-40` giúp thanh menu màu xanh `#75BDEB` luôn bám dính đầu màn hình khi cuộn xuống, đồng thời menu thả xuống của tài khoản (`UserAccountDropdown`) không bao giờ bị che khuất bởi thanh Header bên dưới.
  - Ở màn hình `< 1024px` (`320px–820px`), hệ thống chuyển gọn sang nút Hamburger (`aria-expanded`, `aria-label`) kèm accordion con cho `Về chúng tôi`, `Tài liệu TOEIC`, `Study Zone`.
- **Nút liên hệ nổi (`FloatingContact.tsx`) & Nút lên đầu trang (`BackToTop.tsx`):**
  - Được ẩn tự động khi vào Phòng thi trực tuyến (`TestTakingPage` không dùng `PublicLayout`), tránh che khuất phương án D hoặc nút nộp bài trên điện thoại.

### 2.2. Bảng dữ liệu (Tables) trên Mobile `320px–412px`
- **Lịch khai giảng (`ScheduleTable.tsx`):** Bọc trong `overflow-x-auto` với `min-w-[900px]`, giữ nguyên độ rõ ràng của 8 cột và nút `"Nhận tư vấn"` `whitespace-nowrap`.
- **Kế hoạch học tập dạng bảng (`StudentLearningPlanPage.tsx`):** Đã bổ sung `min-w-[640px]` bên trong container `overflow-x-auto` để không ép chữ cột `Nội dung` và `Hạn nộp` trên màn `320px`.
- **Cấu trúc Part đề thi (`TestDetailPage.tsx`):** Đã tối ưu lưới cột từ `grid-cols-[52px_1fr_140px]` thành `grid-cols-[44px_minmax(0,1fr)_96px] sm:grid-cols-[52px_minmax(0,1fr)_140px]`, hiển thị trọn vẹn từ `320px` trở lên mà không sinh thanh cuộn ngang thừa.
- **Lịch sử bài làm (`TestHistoryPage.tsx`):** Bọc `overflow-x-auto` kèm `tabular-nums` đồng bộ toàn bộ cột điểm, phần trăm và thời gian làm bài.

### 2.3. Cổng học viên (`StudentLayout` & `/student/*`)
- Trên Desktop (`>= 900px`), bố cục 2 cột `252px + minmax(0,1fr)` với Sidebar `sticky top-5`.
- Trên Mobile & Tablet dọc (`< 900px`), Sidebar tự động chuyển sang hàng nút điều hướng linh hoạt ở đầu trang; Thời khóa biểu 7 ngày (`StudentSchedulePage.tsx`) tự động xếp 1 cột dọc rõ ràng thay vì ép 7 cột hẹp.
- Tích hợp sẵn quy tắc `@media print` trong `src/index.css` ẩn toàn bộ thanh điều hướng (`.no-print`) khi học viên nhấn **"In kế hoạch"**.

### 2.4. Phòng thi Test Online & Luyện tập Study Zone
- **Header phòng thi (`TestTakingPage.tsx`, `StudyExercisePage.tsx`):**
  - Tối ưu khoảng cách `px-3 sm:px-6`, rút gọn chữ phụ trên màn hình `< 640px` để đảm bảo nút `NỘP BÀI`, đồng hồ đếm ngược `tabular-nums` và nút mở bảng câu hỏi `QuestionNavigator` luôn nằm gọn trên 1 hàng kể cả ở `320px`.
- **Khung câu hỏi 2 cột (`TestQuestionRenderer.tsx`, `QuestionRenderer.tsx`):**
  - Trên Desktop (`lg:grid-cols-12`): Cột trái (hình ảnh / đoạn văn / câu hỏi / audio khi chữa bài) và cột phải (các phương án A, B, C, D và hộp `Giải thích:`) cuộn độc lập trong vùng nhìn, có thanh nhấn dọc `#75BDEB` đặc trưng.
  - Trên Mobile/Tablet dọc: Tự động xếp cột ngữ liệu lên trên, phương án trả lời xuống dưới; khi chọn đáp án ở cụm câu hỏi kép (Part 3, 4, 6, 7), vị trí cuộn được giữ nguyên, tuyệt đối không bị nhảy lên đầu trang.
- **Xử lý ảnh & âm thanh:**
  - Hình ảnh câu hỏi dùng `max-h-[420px] w-auto max-w-full object-contain`, xử lý mượt cả ảnh ngang lẫn ảnh dọc mà không méo tỷ lệ và có fallback thông báo lịch sự nếu URL ảnh lỗi.
  - Trình phát âm thanh viên thuốc (`Study Zone` & `Xem lại đáp án`) dùng `w-full max-w-[460px]` co giãn linh hoạt tới tận màn `320px`.

### 2.5. Hộp thoại (Modals) & Khả năng truy cập (Accessibility)
- Tất cả hộp thoại (`ConsultationModal`, `ExitExamConfirmModal`, `TestSubmitModal`, `SubmissionModal`, Modal tiếp tục bài thi) đều sử dụng `fixed inset-0 z-50 flex items-center justify-center p-4`, có `role="dialog"`, `aria-modal="true"`, khóa cuộn nền hoặc bắt phím `Escape` an toàn.
- Bổ sung đầy đủ `aria-label` và `title` mô tả rõ trạng thái từng câu hỏi (`Đang xem`, `Đã trả lời`, `Đánh dấu xem lại`, `Đúng`, `Sai`, `Bỏ trống`, `Đang khóa`) trong `QuestionNavigator.tsx`, đảm bảo người dùng không phải phân biệt trạng thái chỉ bằng màu sắc.

---

## 3. GHI CHÚ PHẠM VI KIỂM CHỨNG

- Toàn bộ cấu trúc lưới CSS, breakpoint Tailwind v4, tràn ngang (`min-w` / `minmax(0,1fr)` / `overflow-x-auto`), thứ tự lớp xếp chồng (`z-index`) và thuộc tính ARIA đã được kiểm tra trực tiếp trên mã nguồn và xác nhận biên dịch sạch qua `oxlint` + `tsc -b` + `vite build`.
- Khi nghiệm thu trực quan trên trình duyệt thực tế, khuyến nghị mở Chrome DevTools Device Toolbar kiểm tra nhanh ở 3 mốc đại diện: `375×812` (iPhone), `768×1024` (iPad) và `1440×900` (Laptop) cho luồng Phòng thi TOEIC và Cổng học viên.
