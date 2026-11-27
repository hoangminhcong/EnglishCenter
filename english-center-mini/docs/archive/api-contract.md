> **[CŨ – CẦN ĐỐI CHIẾU]** Tài liệu này thuộc giai đoạn Single-App trước khi tái cấu trúc Monorepo. Nội dung mới nhất đã được hợp nhất và thay thế bởi: `docs/api-contract/API_CONTRACT.md`.

# Hợp đồng API Dự kiến (API Contract) – HMC TOEIC Student Portal

> **Lưu ý quan trọng:** Các endpoint dưới đây là hợp đồng giao tiếp dự kiến (Proposed API Contract) giữa Frontend và Backend Node.js trong tương lai. Hiện tại Backend chưa triển khai nên Frontend đang hoạt động ở chế độ Mock Repository.

## 1. Danh sách Endpoint Dự kiến (`src/services/api/endpoints.ts`)

| Nghiệp vụ | HTTP Method | Endpoint | Mô tả |
|---|---|---|---|
| Tổng quan Cổng học viên | `GET` | `/api/v1/students/me` | Lấy hồ sơ học viên, lớp học hiện tại, kế hoạch học tập, bài tập, điểm danh, kết quả thi và yêu cầu hỗ trợ |
| Nộp BTVN / Điền điểm Demo Test | `POST` | `/api/v1/assignments/:assignmentId/submissions` | Học viên gửi link Google Drive/Docs kèm số câu đúng LC/RC hoặc điểm tự nhập Demo Test |
| Gửi yêu cầu hỗ trợ sau khóa học | `POST` | `/api/v1/support-requests` | Học viên gửi yêu cầu Học lại, Bảo lưu, Bảo lưu quay lại học hoặc Chuyển lớp |

## 2. Cấu trúc Request Body

### `POST /api/v1/assignments/:assignmentId/submissions`

**Trường hợp 1: Nộp BTVN thường**
```json
{
  "submissionType": "homework",
  "driveLink": "https://drive.google.com/drive/folders/b05-bai-nop",
  "partScores": {
    "lc": 16,
    "rc": 15
  }
}
```

**Trường hợp 2: Điền điểm Demo Test**
```json
{
  "submissionType": "demo",
  "demoScores": {
    "lc": 320,
    "rc": 295,
    "total": 615
  }
}
```

### `POST /api/v1/support-requests`
```json
{
  "type": "hold",
  "reason": "Công việc hoặc học tập bận",
  "content": "Em xin phép bảo lưu 2 tháng do lịch thực tập tại trường.",
  "contact": "0987654321"
}
```

## 3. Cấu trúc Response Chuẩn

`httpClient` tại `src/services/api/httpClient.ts` hỗ trợ tự động mở gói (unwrap) đối tượng `{ success: true, data: ... }` hoặc trả trực tiếp JSON payload, đồng thời chuẩn hóa mọi lỗi HTTP `4xx`/`5xx` thành `ApiClientError`.
