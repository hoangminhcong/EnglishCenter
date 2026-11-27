export const ACCOUNT_TYPES = ['STUDENT', 'STAFF'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const PORTAL_TYPES = ['CLIENT', 'STAFF'] as const
export type PortalType = (typeof PORTAL_TYPES)[number]

export const STUDENT_ROLES = ['STUDENT'] as const
export type StudentRole = (typeof STUDENT_ROLES)[number]

export const STAFF_ROLES = [
  'ADMIN',
  'SALES',
  'ACCOUNTANT',
  'ACADEMIC',
  'TEACHER',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export type AccountRole = StudentRole | StaffRole

export const PERMISSION_CODES = [
  // Admin & Governance
  'dashboard.view',
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
  'training.view',
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
  'reports.view',

  // Sales CRM permissions
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
  'sales.registrations.review',

  // Accounting Portal permissions
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

  // Academic Portal permissions
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

  // Teacher Portal permissions
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
] as const

export type PermissionCode = (typeof PERMISSION_CODES)[number]
