import { lazyWithRetry } from '@/app/router/lazyWithRetry'

export const StaffProfilePage = lazyWithRetry(() =>
  import('@/features/auth/pages/StaffProfilePage').then((m) => ({ default: m.StaffProfilePage })),
)
export const StaffDashboardPage = lazyWithRetry(() =>
  import('@/features/dashboard/pages/StaffDashboardPage').then((m) => ({
    default: m.StaffDashboardPage,
  })),
)
export const AccountsPage = lazyWithRetry(() =>
  import('@/features/accounts/pages/AccountsPage').then((m) => ({ default: m.AccountsPage })),
)
export const RolesPage = lazyWithRetry(() =>
  import('@/features/accounts/pages/RolesPage').then((m) => ({ default: m.RolesPage })),
)
export const CoursesPage = lazyWithRetry(() =>
  import('@/features/courses/pages/CoursesPage').then((m) => ({ default: m.CoursesPage })),
)
export const TuitionPoliciesPage = lazyWithRetry(() =>
  import('@/features/tuition/pages/TuitionPoliciesPage').then((m) => ({
    default: m.TuitionPoliciesPage,
  })),
)
export const TrainingSupervisionPage = lazyWithRetry(() =>
  import('@/features/training/pages/TrainingSupervisionPage').then((m) => ({
    default: m.TrainingSupervisionPage,
  })),
)
export const CenterInfoPage = lazyWithRetry(() =>
  import('@/features/content/pages/CenterInfoPage').then((m) => ({ default: m.CenterInfoPage })),
)
export const BranchesPage = lazyWithRetry(() =>
  import('@/features/content/pages/BranchesPage').then((m) => ({ default: m.BranchesPage })),
)
export const NewsPage = lazyWithRetry(() =>
  import('@/features/content/pages/NewsPage').then((m) => ({ default: m.NewsPage })),
)
export const JobsPage = lazyWithRetry(() =>
  import('@/features/content/pages/JobsPage').then((m) => ({ default: m.JobsPage })),
)
export const AchievementsPage = lazyWithRetry(() =>
  import('@/features/content/pages/AchievementsPage').then((m) => ({
    default: m.AchievementsPage,
  })),
)
export const MaterialsPage = lazyWithRetry(() =>
  import('@/features/learning/pages/MaterialsPage').then((m) => ({ default: m.MaterialsPage })),
)
export const StudyZoneListPage = lazyWithRetry(() =>
  import('@/features/learning/pages/StudyZoneListPage').then((m) => ({
    default: m.StudyZoneListPage,
  })),
)
export const StudyZoneExerciseEditorPage = lazyWithRetry(() =>
  import('@/features/learning/pages/StudyZoneExerciseEditorPage').then((m) => ({
    default: m.StudyZoneExerciseEditorPage,
  })),
)
export const TestsListPage = lazyWithRetry(() =>
  import('@/features/learning/pages/TestsListPage').then((m) => ({ default: m.TestsListPage })),
)
export const TestAuthoringPage = lazyWithRetry(() =>
  import('@/features/learning/pages/TestAuthoringPage').then((m) => ({
    default: m.TestAuthoringPage,
  })),
)
export const ToeicConfigPage = lazyWithRetry(() =>
  import('@/features/toeic-config/pages/ToeicConfigPage').then((m) => ({
    default: m.ToeicConfigPage,
  })),
)
export const ReportsPage = lazyWithRetry(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
export const SalesDashboardPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesDashboardPage').then((m) => ({
    default: m.SalesDashboardPage,
  })),
)
export const SalesLeadDetailPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesLeadDetailPage').then((m) => ({
    default: m.SalesLeadDetailPage,
  })),
)
export const SalesCoursesPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesCoursesPage').then((m) => ({
    default: m.SalesCoursesPage,
  })),
)
export const SalesCourseDetailPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesCourseDetailPage').then((m) => ({
    default: m.SalesCourseDetailPage,
  })),
)
export const SalesNewRegistrationPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesNewRegistrationPage').then((m) => ({
    default: m.SalesNewRegistrationPage,
  })),
)
export const SalesRegistrationsListPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesRegistrationsListPage').then((m) => ({
    default: m.SalesRegistrationsListPage,
  })),
)
export const SalesRegistrationDetailPage = lazyWithRetry(() =>
  import('@/features/sales/pages/SalesRegistrationDetailPage').then((m) => ({
    default: m.SalesRegistrationDetailPage,
  })),
)
export const AccountingDashboardPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingDashboardPage').then((m) => ({
    default: m.AccountingDashboardPage,
  })),
)
export const AccountingPaymentsPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingPaymentsPage').then((m) => ({
    default: m.AccountingPaymentsPage,
  })),
)
export const AccountingReceivablesPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingReceivablesPage').then((m) => ({
    default: m.AccountingReceivablesPage,
  })),
)
export const AccountingReceivableDetailPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingReceivableDetailPage').then((m) => ({
    default: m.AccountingReceivableDetailPage,
  })),
)
export const AccountingTransactionsPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingTransactionsPage').then((m) => ({
    default: m.AccountingTransactionsPage,
  })),
)
export const AccountingReceiptsPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingReceiptsPage').then((m) => ({
    default: m.AccountingReceiptsPage,
  })),
)
export const AccountingReportsPage = lazyWithRetry(() =>
  import('@/features/accounting/pages/AccountingReportsPage').then((m) => ({
    default: m.AccountingReportsPage,
  })),
)
export const AcademicDashboardPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicDashboardPage').then((m) => ({
    default: m.AcademicDashboardPage,
  })),
)
export const AcademicStudentsPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicStudentsPage').then((m) => ({
    default: m.AcademicStudentsPage,
  })),
)
export const AcademicStudentDetailPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicStudentDetailPage').then((m) => ({
    default: m.AcademicStudentDetailPage,
  })),
)
export const AcademicClassesPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicClassesPage').then((m) => ({
    default: m.AcademicClassesPage,
  })),
)
export const AcademicClassDetailPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicClassDetailPage').then((m) => ({
    default: m.AcademicClassDetailPage,
  })),
)
export const AcademicPlacementPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicPlacementPage').then((m) => ({
    default: m.AcademicPlacementPage,
  })),
)
export const AcademicRequestsPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicRequestsPage').then((m) => ({
    default: m.AcademicRequestsPage,
  })),
)
export const AcademicCourseContentPage = lazyWithRetry(() =>
  import('@/features/academic/pages/AcademicCourseContentPage').then((m) => ({
    default: m.AcademicCourseContentPage,
  })),
)
export const TeacherDashboardPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherDashboardPage').then((m) => ({
    default: m.TeacherDashboardPage,
  })),
)
export const TeacherClassesPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherClassesPage').then((m) => ({
    default: m.TeacherClassesPage,
  })),
)
export const TeacherClassDetailPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherClassDetailPage').then((m) => ({
    default: m.TeacherClassDetailPage,
  })),
)
export const TeacherTeachingPlansPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherTeachingPlansPage').then((m) => ({
    default: m.TeacherTeachingPlansPage,
  })),
)
export const TeacherAttendancePage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherAttendancePage').then((m) => ({
    default: m.TeacherAttendancePage,
  })),
)
export const TeacherAssignmentsPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherAssignmentsPage').then((m) => ({
    default: m.TeacherAssignmentsPage,
  })),
)
export const TeacherGradebookPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherGradebookPage').then((m) => ({
    default: m.TeacherGradebookPage,
  })),
)
export const TeacherProgressPage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherProgressPage').then((m) => ({
    default: m.TeacherProgressPage,
  })),
)
export const TeacherSchedulePage = lazyWithRetry(() =>
  import('@/features/teacher/pages/TeacherSchedulePage').then((m) => ({
    default: m.TeacherSchedulePage,
  })),
)
