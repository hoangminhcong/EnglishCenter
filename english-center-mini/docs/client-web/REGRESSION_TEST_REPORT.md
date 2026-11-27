# BÁO CÁO KIỂM THỬ HỒI QUY & XÁC MINH ĐỘ ỔN ĐỊNH (REGRESSION TEST REPORT)

Tài liệu này tổng hợp kết quả kiểm tra tĩnh, biên dịch Production và rà soát luồng nghiệp vụ sau khi hoàn tất đồng bộ dữ liệu, chuẩn hóa thương hiệu và dọn dẹp mã nguồn cho **English Center**.

---

## 1. KẾT QUẢ KIỂM TRA TỰ ĐỘNG (BUILD, TYPECHECK, LINT & IMPORT GRAPH)

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả thực tế | Đánh giá |
| --- | --- | --- | --- |
| **Phân tích đồ thị phụ thuộc (`Import Graph`)** | `node scratch/audit.mjs` | `178/179` file kết nối từ `src/main.tsx` (file duy nhất còn lại là `src/vite-env.d.ts`). `0` component mồ côi, `0` import đứt gãy. | **PASS** |
| **Quét thương hiệu cũ (`Brand Sweep`)** | `node scratch/audit.mjs` | `0` chuỗi `HMC TOEIC` / `Zenlish` / `@hmctoeic` còn sót trong toàn bộ `src/`. | **PASS** |
| **Kiểm tra Linter tĩnh** | `npm run lint` (`oxlint`) | **0 warnings, 0 errors** (không sử dụng bất kỳ `eslint-disable` hay `oxlint-disable` nào). | **PASS** |
| **Kiểm tra Kiểu TypeScript nghiêm ngặt** | `tsc -b` | **Exit code 0** (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, không dùng `@ts-ignore` hay `any`). | **PASS** |
| **Đóng gói Production Bundle** | `npm run build` (`tsc -b && vite build`) | **Exit code 0** — toàn bộ các chunk lazy-route của Public Website, Auth, Student Portal, Study Zone và Test Online được đóng gói sạch sẽ. | **PASS** |

---

## 2. KẾT QUẢ KIỂM TRA HỒI QUY THEO TỪNG LUỒNG NGHIỆP VỤ

| STT | Luồng nghiệp vụ kiểm tra | Các điểm chốt đã xác minh trong code | Trạng thái |
| --- | --- | --- | --- |
| 1 | **Điều hướng Header & Dropdown Tài khoản** | Header xanh dương `#75BDEB` bám dính đầu trang (`sticky top-0 z-40`), Topbar `z-[60]` hiển thị Dropdown rõ ràng phía trên Header; link `"Lịch sử làm bài"` dẫn tới `/test-history`. | **PASS** |
| 2 | **Đăng nhập / Đăng ký / Đổi tài khoản** | Đăng nhập chuyển về `/` (hoặc trang đang yêu cầu xác thực); đăng xuất xóa sạch phiên; chuyển qua lại giữa `stu-001`, `stu-002` và tài khoản mới đăng ký không bị lẫn dữ liệu. | **PASS** |
| 3 | **Khóa học, Lịch khai giảng & Tư vấn** | Tất cả dòng lịch khai giảng ánh xạ đúng `courseId` chuẩn; lớp `cancelled` khóa nút tư vấn; form tư vấn validate SĐT Việt Nam trước khi gửi. | **PASS** |
| 4 | **Cơ sở đào tạo & Tuyển dụng** | Tên cơ sở nhất quán (`Hà Đông`, `Nam Từ Liêm`, `Hai Bà Trưng`, `Trực tuyến`); tin tuyển dụng đóng/hết hạn tự động khóa nút `"Ứng tuyển ngay"`. | **PASS** |
| 5 | **Student Portal (Có lớp vs Chưa xếp lớp)** | Học viên có lớp xem đủ 6 trang con và nộp BTVN có kiểm tra Zod; học viên mới chưa có lớp nhận `NoEnrollmentCard` an toàn, không văng lỗi runtime. | **PASS** |
| 6 | **Study Zone (Tự luyện)** | Hiển thị thanh âm thanh viên thuốc `#F1F3F4` nghe lại nhiều lần; chọn đáp án ở cụm câu không bị nhảy cuộn lên đầu trang; nộp bài hiện khung `Giải thích:` chuẩn mẫu. | **PASS** |
| 7 | **Test Online – Cấu hình & Vào phòng thi** | Đề `status !== 'published'` bị chặn; cờ `allowPartSelection` và `allowStandaloneSelection` hoạt động đúng (ví dụ `TEST 2 – 2025` khóa chọn lẻ Part 3 & Part 4); hộp thoại tiếp tục bài làm dở chỉ hiện cho đúng `ownerId`. | **PASS** |
| 8 | **Test Online – Quy tắc Listening vs Reading** | Nút `BẮT ĐẦU` căn giữa ở mọi màn giới thiệu Part; Part 1–4 phát audio ẩn 1 lần, khóa chuyển câu, hết audio tự chuyển câu; sang Part 5–7 khóa vĩnh viễn Part 1–4 và mở tự do chuyển qua lại mọi câu/cụm câu. | **PASS** |
| 9 | **Test Online – Chấm điểm, Chữa bài & Lịch sử** | 12 đề dùng mã câu hỏi `t01..t12` độc lập; màn chữa bài mở lại thanh âm thanh viên thuốc + giải thích in đậm câu đúng; số liệu lịch sử dùng `tabular-nums` đều nét; chặn truy cập chéo `attemptId` của tài khoản khác. | **PASS** |

---

## 3. GHI CHÚ TRUNG THỰC VỀ PHẠM VI KIỂM THỬ

- Các kiểm tra trên được thực hiện thông qua phân tích luồng mã nguồn, đối chiếu trạng thái dữ liệu Mock/Repository, kiểm tra đồ thị import, `oxlint`, trình biên dịch `tsc -b` và `vite build` trong môi trường dòng lệnh.
- Dự án hiện chưa cài bộ công cụ E2E tự động trên trình duyệt (như Playwright/Cypress); khi kết nối Backend Node.js trong giai đoạn tiếp theo, khuyến nghị bổ sung bộ test tích hợp API & E2E cho 3 luồng trọng yếu: Đăng nhập, Nộp bài tập và Phòng thi TOEIC.
