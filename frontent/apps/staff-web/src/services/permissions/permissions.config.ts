import {
  type AccessScopeType,
  type AuthenticatedStaffSessionDto,
  type DataScope,
  type PermissionCode,
  type PermissionScopeGrant,
  type StaffRole,
  type StaffUser,
} from '@/types/rbac.types'

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: 'Quản trị hệ thống (Admin)',
  SALES: 'Tư vấn tuyển sinh (Sale)',
  ACCOUNTANT: 'Kế toán & Học phí',
  ACADEMIC: 'Giáo vụ đào tạo',
  TEACHER: 'Giảng viên TOEIC',
}

export const ACCESS_SCOPE_LABELS: Record<AccessScopeType, string> = {
  OWN: 'OWN – Chỉ dữ liệu do chính nhân sự phụ trách / lớp được phân công',
  TEAM: 'TEAM – Dữ liệu thuộc phòng ban / nhóm quản lý',
  BRANCH: 'BRANCH – Dữ liệu thuộc cơ sở được phân quyền',
  ALL: 'ALL – Toàn trung tâm (Tất cả cơ sở)',
}

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: 'Toàn hệ thống (ALL)',
  own: 'Chỉ dữ liệu cá nhân phụ trách (OWN)',
  branch: 'Theo cơ sở công tác (BRANCH)',
  assigned_classes_only: 'Chỉ các lớp được phân công giảng dạy (OWN)',
  own_department: 'Trong phạm vi phòng ban / nhóm (TEAM)',
}

interface RoleDefinitionMeta {
  role: StaffRole
  label: string
  shortBadge: string
  defaultScopeType: AccessScopeType
  scope: DataScope
  defaultLandingRoute: string
  description: string
}

export const ROLE_DEFINITIONS: readonly RoleDefinitionMeta[] = [
  {
    role: 'ADMIN',
    label: STAFF_ROLE_LABELS.ADMIN,
    shortBadge: 'Admin',
    defaultScopeType: 'ALL',
    scope: 'all',
    defaultLandingRoute: '/dashboard',
    description:
      'Quản trị tài khoản nhân sự, danh mục khóa học, chính sách học phí, nội dung Website, kho đề TOEIC và báo cáo tổng hợp.',
  },
  {
    role: 'SALES',
    label: STAFF_ROLE_LABELS.SALES,
    shortBadge: 'Sale',
    defaultScopeType: 'OWN',
    scope: 'own',
    defaultLandingRoute: '/sales/dashboard',
    description:
      'Quản lý khách hàng tiềm năng được phân công, lịch sử tư vấn, lịch liên hệ lại và lập hồ sơ đăng ký khóa học.',
  },
  {
    role: 'ACCOUNTANT',
    label: STAFF_ROLE_LABELS.ACCOUNTANT,
    shortBadge: 'Kế toán',
    defaultScopeType: 'ALL',
    scope: 'all',
    defaultLandingRoute: '/accounting/dashboard',
    description:
      'Quản lý khoản phải thu, ghi nhận thanh toán học phí, công nợ, sổ giao dịch, xuất phiếu thu, hoàn tiền và báo cáo tài chính.',
  },
  {
    role: 'ACADEMIC',
    label: STAFF_ROLE_LABELS.ACADEMIC,
    shortBadge: 'Giáo vụ',
    defaultScopeType: 'ALL',
    scope: 'all',
    defaultLandingRoute: '/academic/dashboard',
    description:
      'Quản lý học viên, điều phối lớp học, xếp lớp hàng tháng, duyệt hồ sơ đăng ký và xử lý yêu cầu học vụ.',
  },
  {
    role: 'TEACHER',
    label: STAFF_ROLE_LABELS.TEACHER,
    shortBadge: 'Giảng viên',
    defaultScopeType: 'OWN',
    scope: 'assigned_classes_only',
    defaultLandingRoute: '/teacher/dashboard',
    description:
      'Quản lý kế hoạch giảng dạy, điểm danh, bài tập, bảng điểm, tiến độ học tập và lịch dạy của các lớp được phân công.',
  },
] as const

type PermissionModuleGroup =
  | 'Dashboard'
  | 'Accounts & Fixed Roles'
  | 'Courses & Tuition'
  | 'Sales'
  | 'Accounting'
  | 'Academic'
  | 'Teacher'
  | 'Content CMS'
  | 'Learning Content'
  | 'TOEIC Configuration'
  | 'Reports'

export interface PermissionMetaItem {
  code: PermissionCode
  group: PermissionModuleGroup
  label: string
}

export const PERMISSION_CATALOG: readonly PermissionMetaItem[] = [
  // 1. Dashboard
  { code: 'dashboard.view', group: 'Dashboard', label: 'Xem Admin Dashboard tổng quan' },
  { code: 'training.view', group: 'Dashboard', label: 'Xem giám sát tổng quan lớp đào tạo & lịch khai giảng' },

  // 2. Accounts & Fixed Roles
  { code: 'accounts.view', group: 'Accounts & Fixed Roles', label: 'Xem danh sách tài khoản & hồ sơ nhân sự' },
  { code: 'accounts.create', group: 'Accounts & Fixed Roles', label: 'Tạo tài khoản nhân sự mới theo Role Template cố định' },
  { code: 'accounts.update', group: 'Accounts & Fixed Roles', label: 'Chỉnh sửa hồ sơ nhân sự & gửi lại lời mời kích hoạt' },
  { code: 'accounts.lock', group: 'Accounts & Fixed Roles', label: 'Khóa / Mở khóa / Vô hiệu hóa tài khoản' },
  { code: 'accounts.reset_password', group: 'Accounts & Fixed Roles', label: 'Yêu cầu đặt lại mật khẩu / cấp mật khẩu tạm thời' },
  { code: 'accounts.grant_admin', group: 'Accounts & Fixed Roles', label: 'Được phép chọn Role Template ADMIN khi tạo tài khoản' },
  { code: 'roles.view', group: 'Accounts & Fixed Roles', label: 'Xem danh sách Role cố định & bộ Permission tương ứng (Chỉ đọc)' },

  // 3. Courses & Tuition Policy
  { code: 'courses.view', group: 'Courses & Tuition', label: 'Xem danh mục khóa học' },
  { code: 'courses.create', group: 'Courses & Tuition', label: 'Tạo khóa học mới' },
  { code: 'courses.update', group: 'Courses & Tuition', label: 'Chỉnh sửa thông tin khóa học' },
  { code: 'courses.publish', group: 'Courses & Tuition', label: 'Xuất bản / Tạm dừng khóa học trên Website' },
  { code: 'tuition.view', group: 'Courses & Tuition', label: 'Xem chính sách học phí & ưu đãi' },
  { code: 'tuition.create', group: 'Courses & Tuition', label: 'Tạo chính sách học phí mới' },
  { code: 'tuition.update', group: 'Courses & Tuition', label: 'Cập nhật / Lưu trữ chính sách học phí' },

  // 4. Sales
  { code: 'sales.dashboard.view', group: 'Sales', label: 'Xem Sales Dashboard' },
  { code: 'sales.leads.view', group: 'Sales', label: 'Xem khách hàng tiềm năng (Lead) theo phạm vi' },
  { code: 'sales.leads.create', group: 'Sales', label: 'Tạo mới khách hàng tiềm năng' },
  { code: 'sales.leads.update', group: 'Sales', label: 'Cập nhật & chuyển trạng thái Lead' },
  { code: 'sales.leads.reopen', group: 'Sales', label: 'Mở lại chăm sóc Lead kèm lý do bắt buộc' },
  { code: 'sales.consultations.view', group: 'Sales', label: 'Xem lịch sử các lần tư vấn' },
  { code: 'sales.consultations.create', group: 'Sales', label: 'Ghi nhận lần tư vấn mới' },
  { code: 'sales.followups.view', group: 'Sales', label: 'Xem lịch liên hệ lại' },
  { code: 'sales.followups.create', group: 'Sales', label: 'Tạo lịch liên hệ lại' },
  { code: 'sales.followups.update', group: 'Sales', label: 'Cập nhật trạng thái lịch liên hệ' },
  { code: 'sales.courses.view', group: 'Sales', label: 'Xem danh mục khóa học để tư vấn' },
  { code: 'sales.classes.view', group: 'Sales', label: 'Xem các lớp đang mở tuyển sinh toàn hệ thống' },
  { code: 'sales.registrations.view', group: 'Sales', label: 'Xem danh sách đăng ký khóa học' },
  { code: 'sales.registrations.create', group: 'Sales', label: 'Lập hồ sơ đăng ký khóa học' },
  { code: 'sales.registrations.update', group: 'Sales', label: 'Cập nhật hồ sơ đăng ký khóa học' },
  { code: 'sales.registrations.review', group: 'Sales', label: 'Xét duyệt hồ sơ đăng ký chuyển sang Xếp lớp (Giáo vụ)' },

  // 5. Accounting
  { code: 'finance.dashboard.view', group: 'Accounting', label: 'Xem Accounting Dashboard' },
  { code: 'finance.receivables.view', group: 'Accounting', label: 'Xem khoản phải thu & công nợ' },
  { code: 'finance.receivables.create', group: 'Accounting', label: 'Tạo & hủy khoản phải thu học viên' },
  { code: 'finance.payments.view', group: 'Accounting', label: 'Xem danh sách thanh toán học phí' },
  { code: 'finance.payments.create', group: 'Accounting', label: 'Ghi nhận thanh toán tiền mặt / chuyển khoản' },
  { code: 'finance.payments.update', group: 'Accounting', label: 'Xác nhận chuyển khoản / Hủy giao dịch sai' },
  { code: 'finance.transactions.view', group: 'Accounting', label: 'Xem sổ lịch sử giao dịch bất biến' },
  { code: 'finance.receipts.view', group: 'Accounting', label: 'Xem & in phiếu thu học phí' },
  { code: 'finance.receipts.create', group: 'Accounting', label: 'Phát hành phiếu thu chính thức' },
  { code: 'finance.refunds.view', group: 'Accounting', label: 'Xem danh sách hoàn tiền' },
  { code: 'finance.refunds.create', group: 'Accounting', label: 'Tạo yêu cầu hoàn tiền' },
  { code: 'finance.refunds.approve', group: 'Accounting', label: 'Phê duyệt & hoàn tất yêu cầu hoàn tiền' },
  { code: 'finance.reports.view', group: 'Accounting', label: 'Xem báo cáo tài chính' },

  // 6. Academic
  { code: 'academic.dashboard.view', group: 'Academic', label: 'Xem Academic Dashboard' },
  { code: 'students.view', group: 'Academic', label: 'Xem danh sách & hồ sơ học viên' },
  { code: 'students.create', group: 'Academic', label: 'Tạo hồ sơ học viên mới' },
  { code: 'students.update', group: 'Academic', label: 'Cập nhật hồ sơ & trạng thái học tập học viên' },
  { code: 'classes.view', group: 'Academic', label: 'Xem danh sách & chi tiết lớp học' },
  { code: 'classes.create', group: 'Academic', label: 'Mở lớp học mới' },
  { code: 'classes.update', group: 'Academic', label: 'Cập nhật lớp học & phân công giảng viên' },
  { code: 'classes.assign_students', group: 'Academic', label: 'Gán học viên vào lớp (Enrollment)' },
  { code: 'classes.transfer_students', group: 'Academic', label: 'Điều chuyển lớp học viên' },
  { code: 'class-placement.view', group: 'Academic', label: 'Xem danh sách chờ xếp lớp theo tháng' },
  { code: 'class-placement.assign', group: 'Academic', label: 'Thực hiện xếp lớp theo tháng' },
  { code: 'student-status.view', group: 'Academic', label: 'Xem yêu cầu Bảo lưu / Khôi phục / Chuyển lớp / Học lại' },
  { code: 'student-status.manage', group: 'Academic', label: 'Xử lý duyệt Bảo lưu / Khôi phục / Chuyển lớp / Học lại' },
  { code: 'course-content.view', group: 'Academic', label: 'Xem nội dung đào tạo khóa học' },
  { code: 'course-content.update', group: 'Academic', label: 'Cập nhật khung chương trình đào tạo' },

  // 7. Teacher
  { code: 'teacher.dashboard.view', group: 'Teacher', label: 'Xem Teacher Dashboard' },
  { code: 'teacher.classes.view', group: 'Teacher', label: 'Xem Lớp của tôi & tiến độ học tập' },
  { code: 'teacher.schedule.view', group: 'Teacher', label: 'Xem Lịch giảng dạy' },
  { code: 'teacher.schedule.request', group: 'Teacher', label: 'Gửi nguyện vọng nhận lớp giảng dạy' },
  { code: 'teaching-plan.view', group: 'Teacher', label: 'Xem kế hoạch giảng dạy' },
  { code: 'teaching-plan.update', group: 'Teacher', label: 'Cập nhật kế hoạch giảng dạy từng buổi' },
  { code: 'attendance.view', group: 'Teacher', label: 'Xem điểm danh buổi học' },
  { code: 'attendance.create', group: 'Teacher', label: 'Điểm danh buổi học lớp phụ trách' },
  { code: 'attendance.update', group: 'Teacher', label: 'Chỉnh sửa điểm danh kèm Audit Log' },
  { code: 'assignments.view', group: 'Teacher', label: 'Xem bài tập lớp phụ trách' },
  { code: 'assignments.create', group: 'Teacher', label: 'Giao bài tập mới' },
  { code: 'assignments.update', group: 'Teacher', label: 'Chỉnh sửa nội dung & hạn nộp bài tập' },
  { code: 'assignments.close', group: 'Teacher', label: 'Đóng nhận bài tập' },
  { code: 'assignments.grade', group: 'Teacher', label: 'Chấm điểm & nhận xét bài nộp' },
  { code: 'grades.view', group: 'Teacher', label: 'Xem bảng điểm lớp phụ trách' },
  { code: 'grades.create', group: 'Teacher', label: 'Nhập điểm kiểm tra' },
  { code: 'grades.update', group: 'Teacher', label: 'Cập nhật điểm kiểm tra kèm Audit Log' },

  // 8. Content CMS
  { code: 'center_info.view', group: 'Content CMS', label: 'Xem thông tin trung tâm' },
  { code: 'center_info.update', group: 'Content CMS', label: 'Cập nhật thông tin trung tâm' },
  { code: 'branches.view', group: 'Content CMS', label: 'Xem hệ thống cơ sở' },
  { code: 'branches.create', group: 'Content CMS', label: 'Tạo cơ sở mới' },
  { code: 'branches.update', group: 'Content CMS', label: 'Cập nhật thông tin cơ sở' },
  { code: 'news.view', group: 'Content CMS', label: 'Xem tin tức & thông báo' },
  { code: 'news.create', group: 'Content CMS', label: 'Soạn tin tức mới' },
  { code: 'news.update', group: 'Content CMS', label: 'Chỉnh sửa tin tức' },
  { code: 'news.publish', group: 'Content CMS', label: 'Xuất bản / Ẩn tin tức' },
  { code: 'jobs.view', group: 'Content CMS', label: 'Xem tin tuyển dụng' },
  { code: 'jobs.create', group: 'Content CMS', label: 'Tạo tin tuyển dụng' },
  { code: 'jobs.update', group: 'Content CMS', label: 'Cập nhật tin tuyển dụng' },
  { code: 'jobs.publish', group: 'Content CMS', label: 'Xuất bản / Đóng tin tuyển dụng' },
  { code: 'achievements.view', group: 'Content CMS', label: 'Xem vinh danh học viên' },
  { code: 'achievements.create', group: 'Content CMS', label: 'Thêm hồ sơ thành tích' },
  { code: 'achievements.update', group: 'Content CMS', label: 'Cập nhật hồ sơ & trạng thái Consent' },
  { code: 'achievements.publish', group: 'Content CMS', label: 'Xuất bản vinh danh học viên' },

  // 9. Learning Content
  { code: 'materials.view', group: 'Learning Content', label: 'Xem tài liệu học tập' },
  { code: 'materials.create', group: 'Learning Content', label: 'Tạo tài liệu học tập' },
  { code: 'materials.update', group: 'Learning Content', label: 'Cập nhật tài liệu học tập' },
  { code: 'materials.publish', group: 'Learning Content', label: 'Xuất bản tài liệu học tập' },
  { code: 'study_zone.view', group: 'Learning Content', label: 'Xem Study Zone' },
  { code: 'study_zone.create', group: 'Learning Content', label: 'Tạo bài luyện tập Study Zone' },
  { code: 'study_zone.update', group: 'Learning Content', label: 'Biên tập câu hỏi Study Zone' },
  { code: 'study_zone.publish', group: 'Learning Content', label: 'Xuất bản bài Study Zone' },
  { code: 'tests.view', group: 'Learning Content', label: 'Xem đề thi Test Online' },
  { code: 'tests.create', group: 'Learning Content', label: 'Tạo đề thi TOEIC' },
  { code: 'tests.update', group: 'Learning Content', label: 'Biên tập đề thi TOEIC' },
  { code: 'tests.publish', group: 'Learning Content', label: 'Kiểm định & Xuất bản đề thi' },

  // 10. TOEIC Configuration
  { code: 'toeic_config.view', group: 'TOEIC Configuration', label: 'Xem cấu hình thang điểm & quy đổi TOEIC' },
  { code: 'toeic_config.create', group: 'TOEIC Configuration', label: 'Tạo phiên bản cấu hình TOEIC' },
  { code: 'toeic_config.update', group: 'TOEIC Configuration', label: 'Cập nhật bản nháp cấu hình TOEIC' },
  { code: 'toeic_config.activate', group: 'TOEIC Configuration', label: 'Kích hoạt phiên bản cấu hình TOEIC' },

  // 11. Reports
  { code: 'reports.view', group: 'Reports', label: 'Xem báo cáo thống kê tổng hợp' },
] as const

/**
 * PERMISSION REGISTRY CỐ ĐỊNH BẤT BIẾN (FIXED ROLE PERMISSIONS).
 * - Định nghĩa duy nhất bởi đội phát triển, đồng bộ với Backend.
 * - KHÔNG cho phép Admin tự tạo/sửa/ghi đè Permission trên giao diện hoặc Storage.
 * - KHÔNG mặc định ADMIN = ALL_PERMISSIONS.
 */
export const FIXED_ROLE_PERMISSIONS: Readonly<Record<StaffRole, readonly PermissionCode[]>> = {
  ADMIN: [
    'dashboard.view',
    'training.view',
    'reports.view',
    'accounts.view',
    'accounts.create',
    'accounts.update',
    'accounts.lock',
    'accounts.reset_password',
    'accounts.grant_admin',
    'roles.view',
    'courses.view',
    'courses.create',
    'courses.update',
    'courses.publish',
    'tuition.view',
    'tuition.create',
    'tuition.update',
    'center_info.view',
    'center_info.update',
    'branches.view',
    'branches.create',
    'branches.update',
    'news.view',
    'news.create',
    'news.update',
    'news.publish',
    'jobs.view',
    'jobs.create',
    'jobs.update',
    'jobs.publish',
    'achievements.view',
    'achievements.create',
    'achievements.update',
    'achievements.publish',
    'materials.view',
    'materials.create',
    'materials.update',
    'materials.publish',
    'study_zone.view',
    'study_zone.create',
    'study_zone.update',
    'study_zone.publish',
    'tests.view',
    'tests.create',
    'tests.update',
    'tests.publish',
    'toeic_config.view',
    'toeic_config.create',
    'toeic_config.update',
    'toeic_config.activate',
  ],
  SALES: [
    'sales.dashboard.view',
    'sales.leads.view',
    'sales.leads.create',
    'sales.leads.update',
    'sales.leads.reopen',
    'sales.consultations.view',
    'sales.consultations.create',
    'sales.followups.view',
    'sales.followups.create',
    'sales.followups.update',
    'sales.courses.view',
    'sales.classes.view',
    'sales.registrations.view',
    'sales.registrations.create',
    'sales.registrations.update',
  ],
  ACCOUNTANT: [
    'finance.dashboard.view',
    'finance.receivables.view',
    'finance.receivables.create',
    'finance.payments.view',
    'finance.payments.create',
    'finance.payments.update',
    'finance.transactions.view',
    'finance.receipts.view',
    'finance.receipts.create',
    'finance.refunds.view',
    'finance.refunds.create',
    'finance.refunds.approve',
    'finance.reports.view',
  ],
  ACADEMIC: [
    'academic.dashboard.view',
    'students.view',
    'students.create',
    'students.update',
    'classes.view',
    'classes.create',
    'classes.update',
    'classes.assign_students',
    'classes.transfer_students',
    'class-placement.view',
    'class-placement.assign',
    'student-status.view',
    'student-status.manage',
    'course-content.view',
    'course-content.update',
    'sales.registrations.review',
  ],
  TEACHER: [
    'teacher.dashboard.view',
    'teacher.classes.view',
    'teacher.schedule.view',
    'teacher.schedule.request',
    'teaching-plan.view',
    'teaching-plan.update',
    'attendance.view',
    'attendance.create',
    'attendance.update',
    'assignments.view',
    'assignments.create',
    'assignments.update',
    'assignments.close',
    'assignments.grade',
    'grades.view',
    'grades.create',
    'grades.update',
  ],
}

export function getPermissionsForRole(role: StaffRole): readonly PermissionCode[] {
  return FIXED_ROLE_PERMISSIONS[role]
}

export function getDefaultLandingRouteForRole(role: StaffRole): string {
  return ROLE_DEFINITIONS.find((d) => d.role === role)?.defaultLandingRoute ?? '/no-access'
}

/* ============================================================================
 * PERMISSION RESOLVER (KIỂM TRA DỰA TRÊN QUYỀN THỰC TẾ TỪ SESSION / BACKEND)
 * ============================================================================ */

type PermissionSubject =
  | Pick<StaffUser, 'permissions' | 'scopes' | 'defaultLandingRoute'>
  | Pick<AuthenticatedStaffSessionDto, 'permissions' | 'scopes' | 'defaultLandingRoute'>
  | null
  | undefined

export function hasPermission(
  subject: PermissionSubject,
  permission: PermissionCode,
): boolean {
  if (!subject) return false
  return subject.permissions.includes(permission)
}

export function hasAnyPermission(
  subject: PermissionSubject,
  permissions: readonly PermissionCode[],
): boolean {
  if (!subject) return false
  return permissions.some((p) => subject.permissions.includes(p))
}

export function hasAllPermissions(
  subject: PermissionSubject,
  permissions: readonly PermissionCode[],
): boolean {
  if (!subject) return false
  return permissions.every((p) => subject.permissions.includes(p))
}

export function getEffectivePermissionScope(
  subject: PermissionSubject,
  permission: PermissionCode,
): PermissionScopeGrant | null {
  if (!subject || !hasPermission(subject, permission)) return null
  return subject.scopes[permission] ?? { type: 'OWN' }
}

const LANDING_ROUTE_CANDIDATES: readonly {
  path: string
  requiredPermissions: readonly PermissionCode[]
}[] = [
  { path: '/dashboard', requiredPermissions: ['dashboard.view'] },
  { path: '/sales/dashboard', requiredPermissions: ['sales.dashboard.view'] },
  { path: '/accounting/dashboard', requiredPermissions: ['finance.dashboard.view'] },
  { path: '/academic/dashboard', requiredPermissions: ['academic.dashboard.view'] },
  { path: '/teacher/dashboard', requiredPermissions: ['teacher.dashboard.view'] },
  { path: '/accounts', requiredPermissions: ['accounts.view'] },
  { path: '/accounts/roles', requiredPermissions: ['roles.view'] },
  { path: '/courses', requiredPermissions: ['courses.view'] },
  { path: '/tuition', requiredPermissions: ['tuition.view'] },
  { path: '/training', requiredPermissions: ['training.view'] },
  { path: '/sales/courses', requiredPermissions: ['sales.courses.view'] },
  { path: '/sales/registrations', requiredPermissions: ['sales.registrations.view'] },
  { path: '/accounting/payments', requiredPermissions: ['finance.payments.view'] },
  { path: '/accounting/receivables', requiredPermissions: ['finance.receivables.view'] },
  { path: '/accounting/transactions', requiredPermissions: ['finance.transactions.view'] },
  { path: '/accounting/receipts', requiredPermissions: ['finance.receipts.view'] },
  { path: '/accounting/reports', requiredPermissions: ['finance.reports.view'] },
  { path: '/academic/students', requiredPermissions: ['students.view'] },
  { path: '/academic/classes', requiredPermissions: ['classes.view'] },
  { path: '/academic/placement', requiredPermissions: ['class-placement.view'] },
  { path: '/academic/requests', requiredPermissions: ['student-status.view'] },
  { path: '/academic/course-content', requiredPermissions: ['course-content.view'] },
  { path: '/teacher/classes', requiredPermissions: ['teacher.classes.view'] },
  { path: '/teacher/teaching-plans', requiredPermissions: ['teaching-plan.view'] },
  { path: '/teacher/attendance', requiredPermissions: ['attendance.view'] },
  { path: '/teacher/assignments', requiredPermissions: ['assignments.view'] },
  { path: '/teacher/gradebook', requiredPermissions: ['grades.view'] },
  { path: '/teacher/progress', requiredPermissions: ['teacher.classes.view'] },
  { path: '/teacher/schedule', requiredPermissions: ['teacher.schedule.view'] },
  { path: '/content/center-info', requiredPermissions: ['center_info.view'] },
  { path: '/content/branches', requiredPermissions: ['branches.view'] },
  { path: '/content/news', requiredPermissions: ['news.view'] },
  { path: '/content/jobs', requiredPermissions: ['jobs.view'] },
  { path: '/content/achievements', requiredPermissions: ['achievements.view'] },
  { path: '/learning/materials', requiredPermissions: ['materials.view'] },
  { path: '/learning/study-zone', requiredPermissions: ['study_zone.view'] },
  { path: '/learning/tests', requiredPermissions: ['tests.view'] },
  { path: '/config/toeic', requiredPermissions: ['toeic_config.view'] },
  { path: '/reports', requiredPermissions: ['reports.view'] },
]

export function resolveStaffDefaultHomePath(subject: PermissionSubject): string {
  if (!subject) return '/login'
  if (subject.permissions.length === 0) return '/no-access'

  if (subject.defaultLandingRoute) {
    const matchedCandidate = LANDING_ROUTE_CANDIDATES.find(
      (c) => c.path === subject.defaultLandingRoute,
    )
    if (matchedCandidate && hasAllPermissions(subject, matchedCandidate.requiredPermissions)) {
      return matchedCandidate.path
    }
  }

  const firstPermitted = LANDING_ROUTE_CANDIDATES.find((c) =>
    hasAllPermissions(subject, c.requiredPermissions),
  )

  return firstPermitted?.path ?? '/no-access'
}

const VALID_DYNAMIC_STAFF_ROUTE_RULES: readonly {
  pattern: RegExp
  anyPermissions: readonly PermissionCode[]
}[] = [
  { pattern: /^\/accounting\/receivables\/[^/]+$/, anyPermissions: ['finance.receivables.view'] },
  { pattern: /^\/academic\/students\/[^/]+$/, anyPermissions: ['students.view'] },
  { pattern: /^\/academic\/classes\/[^/]+$/, anyPermissions: ['classes.view'] },
  { pattern: /^\/teacher\/classes\/[^/]+$/, anyPermissions: ['teacher.classes.view'] },
  { pattern: /^\/sales\/leads\/[^/]+$/, anyPermissions: ['sales.leads.view'] },
  { pattern: /^\/sales\/courses\/[^/]+$/, anyPermissions: ['sales.courses.view'] },
  { pattern: /^\/sales\/registrations\/new$/, anyPermissions: ['sales.registrations.create'] },
  {
    pattern: /^\/sales\/registrations\/[^/]+$/,
    anyPermissions: ['sales.registrations.view', 'sales.registrations.review'],
  },
  { pattern: /^\/learning\/study-zone\/[^/]+$/, anyPermissions: ['study_zone.view'] },
  { pattern: /^\/learning\/tests\/[^/]+$/, anyPermissions: ['tests.view'] },
  { pattern: /^\/roles$/, anyPermissions: ['roles.view'] },
  { pattern: /^\/admin(\/dashboard)?$/, anyPermissions: ['dashboard.view'] },
  { pattern: /^\/sales$/, anyPermissions: ['sales.dashboard.view'] },
  { pattern: /^\/(accounting|finance)$/, anyPermissions: ['finance.dashboard.view'] },
  { pattern: /^\/academic$/, anyPermissions: ['academic.dashboard.view'] },
  { pattern: /^\/teacher$/, anyPermissions: ['teacher.dashboard.view'] },
  { pattern: /^\/content$/, anyPermissions: ['center_info.view'] },
  { pattern: /^\/learning$/, anyPermissions: ['materials.view'] },
]

export function isPermittedStaffRoute(
  subject: PermissionSubject,
  rawPath: string | null | undefined,
): boolean {
  if (!subject || subject.permissions.length === 0 || typeof rawPath !== 'string' || !rawPath) {
    return false
  }

  const cleanPathname = (rawPath.split('?')[0]?.split('#')[0] ?? '').replace(/\/+$/, '') || '/'
  if (
    cleanPathname === '/' ||
    cleanPathname === '/login' ||
    cleanPathname === '/no-access' ||
    cleanPathname === '/403' ||
    cleanPathname === '/404'
  ) {
    return false
  }

  if (
    cleanPathname === '/profile' ||
    cleanPathname === '/account' ||
    cleanPathname === '/change-password'
  ) {
    return true
  }

  const staticMatch = LANDING_ROUTE_CANDIDATES.find((c) => c.path === cleanPathname)
  if (staticMatch) {
    return hasAllPermissions(subject, staticMatch.requiredPermissions)
  }

  const dynamicMatch = VALID_DYNAMIC_STAFF_ROUTE_RULES.find((rule) =>
    rule.pattern.test(cleanPathname),
  )
  if (dynamicMatch) {
    return hasAnyPermission(subject, dynamicMatch.anyPermissions)
  }

  return false
}
