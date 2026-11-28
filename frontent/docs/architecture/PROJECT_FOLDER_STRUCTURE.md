# CẤU TRÚC THƯ MỤC MONOREPO – ENGLISH CENTER (`PROJECT_FOLDER_STRUCTURE`)

Tài liệu này mô tả chính xác cấu trúc thư mục thực tế của repository **English Center** sau khi hoàn tất tái cấu trúc Monorepo.

---

## 1. CÂY THƯ MỤC TỔNG THỂ THỰC TẾ

```text
english-center/
├── apps/
│   ├── client-web/                          # Ứng dụng Website công khai & Học viên (Port 5173)
│   │   ├── public/                          # favicon.svg, icons.svg
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── providers/               # AppProviders.tsx (QueryClientProvider riêng)
│   │   │   │   └── router/                  # index.tsx (39 routes) + LegacyStudentHistoryDetailRedirect.tsx
│   │   │   ├── components/ui/               # UI đặc thù Website/Phòng thi + cầu nối re-export @english-center/ui
│   │   │   ├── config/                      # center-info.ts (thông tin thương hiệu English Center)
│   │   │   ├── features/
│   │   │   │   ├── about/                   # Cơ sở, Tin tức, Tuyển dụng
│   │   │   │   ├── articles/                # Động cơ bài viết công khai
│   │   │   │   ├── auth/                    # Đăng nhập, Đăng ký, Quên/Đặt lại/Đổi mật khẩu học viên
│   │   │   │   ├── consultation/            # Đăng ký nhận tư vấn khóa học
│   │   │   │   ├── courses/                 # Danh mục & chi tiết khóa học
│   │   │   │   ├── learning-materials/      # Tài liệu Luyện Nghe-Đọc & Review đề thi
│   │   │   │   ├── schedules/               # Lịch khai giảng theo cơ sở/tháng
│   │   │   │   ├── student-news/            # Thành tích học viên công khai
│   │   │   │   ├── student-portal/          # Cổng học viên 5 tab (Dashboard, Kế hoạch, BTVN, Điểm thi, Lịch học)
│   │   │   │   ├── study-zone/              # Kho tự luyện mở (Grammar, Vocabulary, Listening)
│   │   │   │   └── test-online/             # Phòng thi TOEIC trực tuyến, chấm điểm & lịch sử làm bài
│   │   │   ├── hooks/                       # useAsync.ts, usePageTitle.ts
│   │   │   ├── layouts/                     # PublicLayout.tsx, StudentLayout.tsx, Header, Footer...
│   │   │   ├── pages/                       # HomePage, ContactPage, NotFoundPage, RouteErrorPage
│   │   │   ├── services/api/                # apiConfig.ts, endpoints.ts, httpClient.ts, queryClient.ts, queryKeys.ts
│   │   │   ├── utils/                       # Re-export từ @english-center/utils
│   │   │   ├── App.tsx
│   │   │   ├── index.css                    # Tailwind CSS 4 + @source "../../../packages/ui/src"
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   │
│   ├── staff-web/                           # Ứng dụng Quản trị & Nhân sự nội bộ (Port 5174)
│   │   ├── public/                          # favicon.svg riêng
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── guards/                  # AuthGuard.tsx, PermissionGuard.tsx
│   │   │   │   ├── providers/               # AppProviders.tsx (staffQueryClient + StaffAuthProvider)
│   │   │   │   └── router/                  # index.tsx (staffRouter)
│   │   │   ├── components/                  # StaffSystemPages.tsx (403, 404, RouteError)
│   │   │   ├── features/
│   │   │   │   ├── auth/                    # StaffLoginPage, StaffAuthProvider, staffAuthApi, mocks
│   │   │   │   └── dashboard/               # StaffDashboardPage, PlannedModulePage, dashboardApi, mocks
│   │   │   ├── hooks/                       # useDocumentTitle.ts
│   │   │   ├── layouts/StaffLayout/         # StaffLayout, StaffSidebar, StaffHeader, StaffBreadcrumb
│   │   │   ├── services/
│   │   │   │   ├── api/                     # apiConfig.ts, endpoints.ts, httpClient.ts, queryClient.ts
│   │   │   │   └── permissions/             # permissions.config.ts, navigation.config.ts
│   │   │   ├── styles/                      # index.css (Tailwind CSS 4 + @source "../../../../packages/ui/src")
│   │   │   ├── types/                       # rbac.types.ts
│   │   │   ├── utils/                       # format.ts (kết nối @english-center/utils)
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   │
│   └── backend/
│       └── README.md                        # Định hướng NestJS Modular Monolith (chưa tham gia Workspaces)
│
├── packages/
│   ├── api-client/                          # @english-center/api-client (client/, errors/, auth/)
│   ├── contracts/                           # @english-center/contracts (openapi/openapi.yaml, common/, auth/, entities/)
│   ├── ui/                                  # @english-center/ui (Button, Badge, Modal, Pagination, StateViews, Table, Form)
│   └── utils/                               # @english-center/utils (format Asia/Ho_Chi_Minh & VND, safeUrl, validators)
│
├── docs/                                    # Hệ thống tài liệu kỹ thuật phân nhóm rõ ràng
│   ├── architecture/
│   ├── migration/
│   ├── data-model/
│   ├── api-contract/
│   ├── backend/
│   ├── security/
│   ├── client-web/
│   ├── staff-web/
│   └── archive/
│
├── .gitignore
├── .oxlintrc.json
├── package.json                             # Root npm Workspaces & Orchestration Scripts
├── package-lock.json                        # Lockfile duy nhất cho toàn Monorepo
├── tsconfig.base.json                       # CompilerOptions gốc dùng chung
├── tsconfig.json                            # Root TypeScript Project References
└── README.md
```

---

## 2. QUY TẮC TỔ CHỨC MODULE TRONG QUÁ TRÌNH MỞ RỘNG

1. **Không tạo sẵn thư mục feature rỗng:** Trong `apps/staff-web/src/features/`, hiện chỉ có `auth/` và `dashboard/`. Khi bắt đầu phát triển nghiệp vụ nào (ví dụ `courses`, `accounting`, `attendance`), mới tạo thư mục feature tương ứng và thay `<PlannedModulePage />` trong `staffRouter` bằng Page thực tế.
2. **Giữ ranh giới Alias `@`:** Trong từng ứng dụng (`client-web` hoặc `staff-web`), `@/*` luôn trỏ nội bộ về `./src/*` của chính ứng dụng đó. Mọi giao tiếp sang Shared Packages đều đi qua tên gói tường minh `@english-center/*`.
