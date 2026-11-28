# AGENTS.md — Modular Monolith Backend Template

> **Lưu ý:** File này là quy ước cố định do người dùng quản lý. Agent **chỉ đọc**, tuyệt đối không tự ý chỉnh sửa file này.

## 1. Dự án & Tech Stack
- **Dự án:** `quản lý trung tâm tiếng anh` .
- **Stack:** Node.js (ES Modules), TypeScript (`strict: true`), Express, PostgreSQL (`pg`), Redis (`ioredis`, kích hoạt khi cần), Zod, Pino.
- **Kiến trúc:** Modular Monolith phân tầng trong `src/modules/<feature>/`.
- **Phong cách code:** viết code chuẩn kỹ thuật, cú pháp trực diện, giàu nghĩa , ít boilerplate (tham chiếu module mẫu đầu tiên đã hoàn thiện trong `src/modules/`). Chỉ dùng `class` khi thực sự cần (ví dụ `AppError`); không tạo class, interface hay DI container thừa.
- **Trách nhiệm phản biện kỹ thuật:** Không tuân thủ máy móc nếu quy ước mặc định khiến giải pháp bị gượng ép, kém hiệu năng hoặc phải "tự viết lại bánh xe". Khi thấy dùng pattern khác (state machine, class, stream...) hoặc cài thư viện chuẩn tốt hơn hẳn tự code chay vòng vo, **bắt buộc dừng ở Vùng Đỏ để đề xuất ngắn gọn** thay vì âm thầm viết code đối phó.

## 2. Kiến trúc & Quy tắc bắt buộc
**Cấu trúc linh hoạt theo bản chất bài toán:**
- **Module nghiệp vụ REST:** Gồm **tối đa 5 file phẳng** (`route.ts`, `schema.ts`, `controller.ts`, `service.ts`, `repository.ts`) — chỉ tạo file thực sự có logic, không tạo file rỗng cho đủ bộ. Luồng request một chiều: `route` (gắn auth + validate bằng `schema`) -> `controller` -> `service` -> `repository`.
- **Module tích hợp ngoài hoặc luồng đặc thù** (storage, payment, AI, realtime/SSE, worker...): Được dùng `*.adapter.ts` / `*.provider.ts` phù hợp bản chất kỹ thuật, miễn là mọi giao tiếp với module khác đều đi qua `*.service.ts`.

1. **Giao tiếp chéo module:** CHỈ gọi qua `*.service.ts`. Cấm import `*.repository.ts` của module khác.
2. **Chiều phụ thuộc một chiều (DAG — tuyệt đối cấm vòng lặp):**
   - **Tầng tài nguyên nền (Core / Master Data):** Các module quản lý thực thể độc lập (tài khoản, danh mục, cấu hình...) -> **không gọi** module khác.
   - **Tầng nghiệp vụ trung gian:** Các module vận hành dựa trên tài nguyên nền (xác thực, đối tượng nghiệp vụ chính...) -> **chỉ gọi** tầng nền.
   - **Tầng điều phối & tổng hợp:** Các module xử lý giao dịch đa bảng, báo cáo, thống kê -> được gọi hai tầng trên; **cấm** tầng dưới gọi ngược lên tầng này.
   - **Xử lý khi phát sinh nhu cầu gọi hai chiều:** Không import ngược; tách phần dùng chung xuống `src/shared/` hoặc đẩy sang xử lý bất đồng bộ (`src/jobs/`).
3. **Transaction liên module:** Mọi hàm trong `*.repository.ts` (và các hàm ghi trong `*.service.ts` có thể được gọi chéo) phải nhận tham số tùy chọn `db: Pool | PoolClient = pool`.
4. **Ranh giới tầng:**
   - `controller`: đọc `req`, gọi `service`, trả `res`, đẩy lỗi qua `next(err)`. Không viết SQL hay logic nghiệp vụ.
   - `service`: xử lý luật nghiệp vụ, transaction và cache Redis. Không đụng `req`/`res`; mọi lỗi nghiệp vụ ném qua `AppError` (`src/shared/errors/app-error.ts`).
   - `schema`: định nghĩa Zod schema và export kiểu dữ liệu bằng `z.infer<typeof ...>`, không khai báo trùng interface.
5. **An toàn TypeScript & Linux/Docker:**
   - Mọi đường dẫn `import` nội bộ phải viết **đúng hoa–thường** và **giữ đuôi `.ts`**.
   - Dùng `path.join()` cho đường dẫn file; đọc biến môi trường qua `src/config/env.ts`, không hardcode host/port/secret.

## 3. Quy chuẩn cơ sở dữ liệu (tự động tuân thủ, không cần hỏi lại)
- **Nguồn sự thật:** `src/db/schema.sql` phản ánh toàn bộ cấu trúc bảng hiện tại. Mọi thay đổi DDL bắt buộc tạo file migration đánh số tăng dần trong `src/db/migrations/00X_<mo_ta>.sql` (cấm sửa file migration cũ đã chạy) và cập nhật đồng bộ vào `src/db/schema.sql`.
- **Khóa chính:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Tiền tệ:** Lưu theo đơn vị nhỏ nhất dạng `INTEGER` hoặc `BIGINT`, cấm dùng `FLOAT`/`DOUBLE`.
- **Thời gian:** Dùng `TIMESTAMPTZ`; mọi bảng nghiệp vụ có `created_at` và `updated_at`.
- **Trạng thái:** Dùng `VARCHAR` kèm ràng buộc `CHECK (status IN (...))` viết IN HOA.
- **An toàn dữ liệu:** Dữ liệu người dùng và giao dịch chính không xóa cứng (dùng `is_active` hoặc `deleted_at`), ưu tiên khóa ngoại `ON DELETE RESTRICT`.

## 4. Quy trình làm việc 3 giai đoạn

### Giai đoạn 1: Bắt đầu & Phân tích khoảng trống (Bootstrap & Gap Analysis)
Trước khi sửa hoặc tạo bất kỳ file nào:
1. Liệt kê cây thư mục `src/` để nắm cấu trúc hiện tại (**không** đọc hết nội dung tất cả các file).
2. Đọc `src/db/schema.sql` để nắm toàn bộ bảng, cột, kiểu dữ liệu, index và ràng buộc.
3. Đọc `HANDOFF.md` để nắm bối cảnh phiên vừa rồi, điểm tạm đang mở và các bẫy kỹ thuật cần tránh.
4. Chỉ mở đọc các file `.ts` liên quan trực tiếp đến yêu cầu phiên này (và 1 module mẫu trong `src/modules/` khi cần đối chiếu quy ước).
5. **Phân tích khoảng trống:** Đối chiếu hiện trạng với yêu cầu để xác định cần thêm/sửa/xóa gì ở DB, cần bổ sung ngược gì vào module cũ và cần tạo mới gì.
6. **Cổng duyệt Vùng Xanh / Vùng Đỏ:**
   - **Vùng Xanh (thực thi thẳng, không dừng hỏi):** Tạo bảng mới tuân thủ Quy chuẩn DB, thêm cột mới (`NULL` hoặc có `DEFAULT`), thêm `INDEX`, thêm hàm/API mở rộng không phá đồ cũ.
   - **Vùng Đỏ (bắt buộc dừng hỏi trước khi sửa):** Xóa bảng/cột/file cũ; đổi tên hoặc đổi kiểu cột đang có; thay đổi contract của API cũ (breaking change); hoặc luật nghiệp vụ mơ hồ có từ 2 cách hiểu trở lên.
   - **Cách hỏi khi rơi vào Vùng Đỏ (tối đa 5 dòng, bằng ngôn ngữ nghiệp vụ):** (1) Mục đích thay đổi, (2) Tác động tới tính năng cũ, (3) Đề xuất phương án A/B để người dùng chọn nhanh.

### Giai đoạn 2: Thực thi & Chốt test (Execute & Verify)
1. **Cập nhật DB trước khi code TypeScript (nếu có thay đổi):** Tạo file migration mới trong `src/db/migrations/` và cập nhật đồng bộ `src/db/schema.sql`.
2. **Triển khai & bổ sung ngược an toàn:** Khi mở rộng module cũ, ưu tiên thêm hàm mới hoặc tham số tùy chọn để giữ tương thích ngược. Nếu thực hiện thay đổi phá vỡ tương thích đã được duyệt ở Vùng Đỏ, phải cập nhật đồng bộ toàn bộ nơi liên quan trong `src/`.
3. **Viết test chốt cho yêu cầu vừa hoàn thành:** Tập trung viết **Integration/E2E test** (gọi qua `app` với DB test thật cho luồng chính, phân quyền, lỗi đầu vào) và **test cho logic nghiệp vụ phức tạp** (tính toán, chuyển trạng thái, transaction rollback). Không viết unit test thừa cho CRUD đơn giản.
4. **Cổng kiểm chứng bắt buộc:** Chạy `npm run typecheck` (0 lỗi) và `npm test` (chạy **toàn bộ** test cũ + mới, pass 100%, khi dự án đã cài bộ test) trước khi chuyển sang Giai đoạn 3.

### Giai đoạn 3: Kết thúc (Handoff)
1. Kiểm tra lần cuối để chắc chắn `src/db/schema.sql` khớp hoàn toàn với tổng `src/db/migrations/` và code `repository`.
2. Chỉ cập nhật `HANDOFF.md` (không sửa `AGENTS.md`):
   - **Mục 1 (Ghi đè hoàn toàn):** Đúng 5 ý — Yêu cầu (kèm luật nghiệp vụ đã chốt), Công việc đã làm (gồm phần bổ sung ngược và file test mới), Thay đổi DB, Kết quả kiểm chứng, Việc cần người dùng làm.
   - **Mục 2 (Cập nhật):** Xóa các điểm tạm đã xử lý xong, thêm điểm tạm mới nếu phát sinh.
   - **Mục 3 (Tích lũy chọn lọc, tối đa 20 dòng):** Chỉ thêm 1 dòng mệnh lệnh ngắn nếu phiên này vấp lỗi thực tế có thể tái diễn (bẫy thư viện, SQL, test, nghiệp vụ); đầy thì gộp ý trùng, không ghi lỗi vặt `typecheck` tự bắt.
3. Báo ngắn cho người dùng: danh sách file tạo/sửa, thay đổi DB, kết quả `typecheck`/test, và nhắc chạy migration mới lên PostgreSQL local (nếu có).