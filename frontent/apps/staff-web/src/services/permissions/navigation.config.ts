import type { PermissionCode } from '@/types/rbac.types'

export type StaffNavIconName =
  | 'dashboard'
  | 'accounts'
  | 'roles'
  | 'courses'
  | 'tuition'
  | 'training'
  | 'cms_hub'
  | 'center_info'
  | 'branches'
  | 'news'
  | 'jobs'
  | 'achievements'
  | 'learning_hub'
  | 'materials'
  | 'study_zone'
  | 'tests'
  | 'toeic_config'
  | 'reports'
  | 'sales_dashboard'
  | 'sales_courses'
  | 'sales_new_reg'
  | 'sales_registrations'
  | 'acc_dashboard'
  | 'acc_payments'
  | 'acc_receivables'
  | 'acc_transactions'
  | 'acc_receipts'
  | 'acc_reports'
  | 'aca_dashboard'
  | 'aca_students'
  | 'aca_classes'
  | 'aca_placement'
  | 'aca_requests'
  | 'aca_course_content'
  | 'tea_dashboard'
  | 'tea_classes'
  | 'tea_plans'
  | 'tea_attendance'
  | 'tea_assignments'
  | 'tea_gradebook'
  | 'tea_progress'
  | 'tea_schedule'

export type StaffNavGroup =
  | 'Quản trị hệ thống (Admin)'
  | 'Tuyển sinh (Sales CRM)'
  | 'Kế toán & Học phí'
  | 'Giáo vụ & Học viên'
  | 'Giảng viên'

export interface MenuDefinition {
  key: string
  label: string
  path: string
  end?: boolean
  group: StaffNavGroup
  icon: StaffNavIconName
  requiredPermissions: readonly PermissionCode[]
  anyOfPermissions?: readonly PermissionCode[]
  children?: readonly MenuDefinition[]
}

export const STAFF_NAV_GROUPS_ORDER: readonly StaffNavGroup[] = [
  'Quản trị hệ thống (Admin)',
  'Tuyển sinh (Sales CRM)',
  'Kế toán & Học phí',
  'Giáo vụ & Học viên',
  'Giảng viên',
]

export const STAFF_NAVIGATION_ITEMS: readonly MenuDefinition[] = [
  {
    key: 'dashboard',
    label: 'Admin Dashboard',
    path: '/dashboard',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'dashboard',
    requiredPermissions: ['dashboard.view'],
  },
  {
    key: 'accounts',
    label: 'Quản lý tài khoản',
    path: '/accounts',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'accounts',
    requiredPermissions: ['accounts.view'],
  },
  {
    key: 'courses',
    label: 'Quản lý khóa học',
    path: '/courses',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'courses',
    requiredPermissions: ['courses.view'],
  },
  {
    key: 'tuition',
    label: 'Chính sách học phí',
    path: '/tuition',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'tuition',
    requiredPermissions: ['tuition.view'],
  },
  {
    key: 'training',
    label: 'Tổng quan đào tạo',
    path: '/training',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'training',
    requiredPermissions: ['training.view'],
  },
  {
    key: 'cms-hub',
    label: 'Nội dung Website (CMS)',
    path: '/content/center-info',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'cms_hub',
    requiredPermissions: ['center_info.view'],
    anyOfPermissions: [
      'center_info.view',
      'branches.view',
      'news.view',
      'jobs.view',
      'achievements.view',
    ],
    children: [
      {
        key: 'center-info',
        label: 'Thông tin trung tâm',
        path: '/content/center-info',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'center_info',
        requiredPermissions: ['center_info.view'],
      },
      {
        key: 'branches',
        label: 'Hệ thống cơ sở',
        path: '/content/branches',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'branches',
        requiredPermissions: ['branches.view'],
      },
      {
        key: 'news',
        label: 'Tin tức & Thông báo',
        path: '/content/news',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'news',
        requiredPermissions: ['news.view'],
      },
      {
        key: 'jobs',
        label: 'Tin tuyển dụng',
        path: '/content/jobs',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'jobs',
        requiredPermissions: ['jobs.view'],
      },
      {
        key: 'achievements',
        label: 'Vinh danh học viên',
        path: '/content/achievements',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'achievements',
        requiredPermissions: ['achievements.view'],
      },
    ],
  },
  {
    key: 'learning-hub',
    label: 'Học liệu & Test Online',
    path: '/learning/materials',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'learning_hub',
    requiredPermissions: ['materials.view'],
    anyOfPermissions: ['materials.view', 'study_zone.view', 'tests.view'],
    children: [
      {
        key: 'materials',
        label: 'Tài liệu học tập',
        path: '/learning/materials',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'materials',
        requiredPermissions: ['materials.view'],
      },
      {
        key: 'study-zone',
        label: 'Study Zone',
        path: '/learning/study-zone',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'study_zone',
        requiredPermissions: ['study_zone.view'],
      },
      {
        key: 'tests',
        label: 'Đề thi Test Online',
        path: '/learning/tests',
        group: 'Quản trị hệ thống (Admin)',
        icon: 'tests',
        requiredPermissions: ['tests.view'],
      },
    ],
  },
  {
    key: 'toeic-config',
    label: 'Cấu hình TOEIC',
    path: '/config/toeic',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'toeic_config',
    requiredPermissions: ['toeic_config.view'],
  },
  {
    key: 'reports',
    label: 'Báo cáo thống kê',
    path: '/reports',
    group: 'Quản trị hệ thống (Admin)',
    icon: 'reports',
    requiredPermissions: ['reports.view'],
  },

  {
    key: 'sales-dashboard',
    label: 'Sales Dashboard & Khách hàng',
    path: '/sales/dashboard',
    group: 'Tuyển sinh (Sales CRM)',
    icon: 'sales_dashboard',
    requiredPermissions: ['sales.dashboard.view'],
  },
  {
    key: 'sales-courses',
    label: 'Khóa học & Lớp đang mở',
    path: '/sales/courses',
    group: 'Tuyển sinh (Sales CRM)',
    icon: 'sales_courses',
    requiredPermissions: ['sales.courses.view'],
  },
  {
    key: 'sales-registrations-new',
    label: 'Đăng ký khóa học',
    path: '/sales/registrations/new',
    end: true,
    group: 'Tuyển sinh (Sales CRM)',
    icon: 'sales_new_reg',
    requiredPermissions: ['sales.registrations.create'],
  },
  {
    key: 'sales-registrations',
    label: 'Danh sách đăng ký',
    path: '/sales/registrations',
    end: true,
    group: 'Tuyển sinh (Sales CRM)',
    icon: 'sales_registrations',
    requiredPermissions: ['sales.registrations.view'],
  },

  {
    key: 'acc-dashboard',
    label: 'Accounting Dashboard',
    path: '/accounting/dashboard',
    group: 'Kế toán & Học phí',
    icon: 'acc_dashboard',
    requiredPermissions: ['finance.dashboard.view'],
  },
  {
    key: 'acc-receivables',
    label: 'Khoản phải thu & Công nợ',
    path: '/accounting/receivables',
    group: 'Kế toán & Học phí',
    icon: 'acc_receivables',
    requiredPermissions: ['finance.receivables.view'],
  },
  {
    key: 'acc-payments',
    label: 'Thanh toán học phí',
    path: '/accounting/payments',
    group: 'Kế toán & Học phí',
    icon: 'acc_payments',
    requiredPermissions: ['finance.payments.view'],
  },
  {
    key: 'acc-transactions',
    label: 'Lịch sử giao dịch & Hoàn tiền',
    path: '/accounting/transactions',
    group: 'Kế toán & Học phí',
    icon: 'acc_transactions',
    requiredPermissions: ['finance.transactions.view'],
  },
  {
    key: 'acc-receipts',
    label: 'Phiếu thu',
    path: '/accounting/receipts',
    group: 'Kế toán & Học phí',
    icon: 'acc_receipts',
    requiredPermissions: ['finance.receipts.view'],
  },
  {
    key: 'acc-reports',
    label: 'Báo cáo tài chính',
    path: '/accounting/reports',
    group: 'Kế toán & Học phí',
    icon: 'acc_reports',
    requiredPermissions: ['finance.reports.view'],
  },

  {
    key: 'aca-dashboard',
    label: 'Academic Dashboard',
    path: '/academic/dashboard',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_dashboard',
    requiredPermissions: ['academic.dashboard.view'],
  },
  {
    key: 'aca-students',
    label: 'Quản lý học viên',
    path: '/academic/students',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_students',
    requiredPermissions: ['students.view'],
  },
  {
    key: 'aca-classes',
    label: 'Quản lý lớp học',
    path: '/academic/classes',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_classes',
    requiredPermissions: ['classes.view'],
  },
  {
    key: 'aca-placement',
    label: 'Xếp lớp theo tháng',
    path: '/academic/placement',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_placement',
    requiredPermissions: ['class-placement.view'],
  },
  {
    key: 'aca-requests',
    label: 'Bảo lưu / Chuyển lớp / Học lại',
    path: '/academic/requests',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_requests',
    requiredPermissions: ['student-status.view'],
  },
  {
    key: 'aca-course-content',
    label: 'Quản lý nội dung đào tạo',
    path: '/academic/course-content',
    group: 'Giáo vụ & Học viên',
    icon: 'aca_course_content',
    requiredPermissions: ['course-content.view'],
  },

  {
    key: 'tea-dashboard',
    label: 'Teacher Dashboard',
    path: '/teacher/dashboard',
    group: 'Giảng viên',
    icon: 'tea_dashboard',
    requiredPermissions: ['teacher.dashboard.view'],
  },
  {
    key: 'tea-classes',
    label: 'Lớp của tôi',
    path: '/teacher/classes',
    group: 'Giảng viên',
    icon: 'tea_classes',
    requiredPermissions: ['teacher.classes.view'],
  },
  {
    key: 'tea-plans',
    label: 'Kế hoạch giảng dạy',
    path: '/teacher/teaching-plans',
    group: 'Giảng viên',
    icon: 'tea_plans',
    requiredPermissions: ['teaching-plan.view'],
  },
  {
    key: 'tea-attendance',
    label: 'Điểm danh',
    path: '/teacher/attendance',
    group: 'Giảng viên',
    icon: 'tea_attendance',
    requiredPermissions: ['attendance.view'],
  },
  {
    key: 'tea-assignments',
    label: 'Bài tập',
    path: '/teacher/assignments',
    group: 'Giảng viên',
    icon: 'tea_assignments',
    requiredPermissions: ['assignments.view'],
  },
  {
    key: 'tea-gradebook',
    label: 'Bảng điểm',
    path: '/teacher/gradebook',
    group: 'Giảng viên',
    icon: 'tea_gradebook',
    requiredPermissions: ['grades.view'],
  },
  {
    key: 'tea-progress',
    label: 'Tiến độ học tập',
    path: '/teacher/progress',
    group: 'Giảng viên',
    icon: 'tea_progress',
    requiredPermissions: ['teacher.classes.view'],
  },
  {
    key: 'tea-schedule',
    label: 'Lịch giảng dạy',
    path: '/teacher/schedule',
    group: 'Giảng viên',
    icon: 'tea_schedule',
    requiredPermissions: ['teacher.schedule.view'],
  },
]

function flattenNavItems(items: readonly MenuDefinition[]): MenuDefinition[] {
  const flat: MenuDefinition[] = []
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      flat.push(...item.children)
    } else {
      flat.push(item)
    }
  }
  return flat
}

export function resolveBreadcrumbMeta(pathname: string): {
  group: string
  label: string
  parent?: { label: string; path: string }
} | null {
  if (pathname === '/profile') {
    return {
      group: 'Tài khoản cá nhân',
      label: 'Thông tin tài khoản & Đổi mật khẩu',
    }
  }

  if (pathname === '/roles' || pathname === '/accounts/roles') {
    return {
      group: 'Quản trị hệ thống (Admin)',
      label: 'Vai trò cố định',
      parent: { label: 'Quản lý tài khoản', path: '/accounts' },
    }
  }

  const allLeafItems = flattenNavItems(STAFF_NAVIGATION_ITEMS)
  const exact = allLeafItems.find((item) => item.path === pathname)
  if (exact) {
    return { group: exact.group, label: exact.label }
  }

  if (pathname.startsWith('/accounting/receivables/')) {
    return {
      group: 'Kế toán & Học phí',
      label: 'Chi tiết khoản phải thu & công nợ',
      parent: { label: 'Khoản phải thu & Công nợ', path: '/accounting/receivables' },
    }
  }

  if (pathname.startsWith('/academic/students/')) {
    return {
      group: 'Giáo vụ & Học viên',
      label: 'Hồ sơ chi tiết học viên',
      parent: { label: 'Quản lý học viên', path: '/academic/students' },
    }
  }

  if (pathname.startsWith('/academic/classes/')) {
    return {
      group: 'Giáo vụ & Học viên',
      label: 'Chi tiết điều phối lớp học',
      parent: { label: 'Quản lý lớp học', path: '/academic/classes' },
    }
  }

  if (pathname.startsWith('/teacher/classes/')) {
    return {
      group: 'Giảng viên',
      label: 'Chi tiết lớp giảng dạy',
      parent: { label: 'Lớp của tôi', path: '/teacher/classes' },
    }
  }

  if (pathname.startsWith('/sales/leads/')) {
    return {
      group: 'Tuyển sinh (Sales CRM)',
      label: 'Hồ sơ khách hàng tiềm năng',
      parent: { label: 'Sales Dashboard & Khách hàng', path: '/sales/dashboard' },
    }
  }

  if (pathname.startsWith('/sales/courses/')) {
    return {
      group: 'Tuyển sinh (Sales CRM)',
      label: 'Chi tiết khóa học tư vấn',
      parent: { label: 'Khóa học & Lớp đang mở', path: '/sales/courses' },
    }
  }

  if (pathname.startsWith('/sales/registrations/') && pathname !== '/sales/registrations/new') {
    return {
      group: 'Tuyển sinh (Sales CRM)',
      label: 'Chi tiết hồ sơ đăng ký',
      parent: { label: 'Danh sách đăng ký', path: '/sales/registrations' },
    }
  }

  if (pathname.startsWith('/learning/tests/')) {
    return {
      group: 'Quản trị hệ thống (Admin)',
      label: 'Soạn thảo & Kiểm định đề thi',
      parent: { label: 'Đề thi Test Online', path: '/learning/tests' },
    }
  }

  if (pathname.startsWith('/learning/study-zone/')) {
    return {
      group: 'Quản trị hệ thống (Admin)',
      label: 'Biên tập bài luyện tập',
      parent: { label: 'Study Zone', path: '/learning/study-zone' },
    }
  }

  return null
}
