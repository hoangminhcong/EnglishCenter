import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoadingBlock } from '@english-center/ui'
import { AuthGuard } from '@/app/guards/AuthGuard'
import { PermissionGuard } from '@/app/guards/PermissionGuard'
import { StaffHomeRedirect } from '@/app/guards/StaffHomeRedirect'
import {
  AcademicClassDetailPage,
  AcademicClassesPage,
  AcademicCourseContentPage,
  AcademicDashboardPage,
  AcademicPlacementPage,
  AcademicRequestsPage,
  AcademicStudentDetailPage,
  AcademicStudentsPage,
  AccountingDashboardPage,
  AccountingPaymentsPage,
  AccountingReceiptsPage,
  AccountingReceivableDetailPage,
  AccountingReceivablesPage,
  AccountingReportsPage,
  AccountingTransactionsPage,
  AccountsPage,
  AchievementsPage,
  BranchesPage,
  CenterInfoPage,
  CoursesPage,
  JobsPage,
  MaterialsPage,
  NewsPage,
  ReportsPage,
  RolesPage,
  SalesCourseDetailPage,
  SalesCoursesPage,
  SalesDashboardPage,
  SalesLeadDetailPage,
  SalesNewRegistrationPage,
  SalesRegistrationDetailPage,
  SalesRegistrationsListPage,
  StaffDashboardPage,
  StaffProfilePage,
  StudyZoneExerciseEditorPage,
  StudyZoneListPage,
  TeacherAssignmentsPage,
  TeacherAttendancePage,
  TeacherClassDetailPage,
  TeacherClassesPage,
  TeacherDashboardPage,
  TeacherGradebookPage,
  TeacherProgressPage,
  TeacherSchedulePage,
  TeacherTeachingPlansPage,
  TestAuthoringPage,
  TestsListPage,
  ToeicConfigPage,
  TrainingSupervisionPage,
  TuitionPoliciesPage,
} from '@/app/router/lazyPages'
import {
  ForbiddenPage,
  NoAccessPage,
  StaffNotFoundPage,
  StaffRouteErrorPage,
  StudentPortalRedirectPage,
} from '@/components/StaffSystemPages'
import { StaffLayout } from '@/layouts/StaffLayout/StaffLayout'
import { StaffLoginPage } from '@/features/auth/pages/StaffLoginPage'

const renderLazy = (node: ReactNode) => (
  <Suspense fallback={<LoadingBlock label="Đang tải phân hệ nghiệp vụ..." />}>{node}</Suspense>
)

export const staffRouter = createBrowserRouter([
  {
    path: '/login',
    element: <StaffLoginPage />,
    errorElement: <StaffRouteErrorPage />,
  },
  {
    path: '/student',
    element: <StudentPortalRedirectPage />,
    errorElement: <StaffRouteErrorPage />,
  },
  {
    path: '/student/*',
    element: <StudentPortalRedirectPage />,
    errorElement: <StaffRouteErrorPage />,
  },
  {
    element: (
      <AuthGuard>
        <StaffLayout />
      </AuthGuard>
    ),
    errorElement: <StaffRouteErrorPage />,
    children: [
      { path: '/', element: <StaffHomeRedirect /> },
      { path: '/staff', element: <Navigate to="/" replace /> },

      // ==================== PERSONAL STAFF ACCOUNT & PASSWORD ====================
      { path: '/profile', element: renderLazy(<StaffProfilePage />) },
      { path: '/account', element: <Navigate to="/profile" replace /> },
      { path: '/change-password', element: <Navigate to="/profile?tab=password" replace /> },

      // ==================== SAFE MODULE ROOT REDIRECTS ====================
      { path: '/admin', element: <Navigate to="/dashboard" replace /> },
      { path: '/admin/dashboard', element: <Navigate to="/dashboard" replace /> },
      { path: '/sales', element: <Navigate to="/sales/dashboard" replace /> },
      { path: '/accounting', element: <Navigate to="/accounting/dashboard" replace /> },
      { path: '/finance', element: <Navigate to="/accounting/dashboard" replace /> },
      { path: '/academic', element: <Navigate to="/academic/dashboard" replace /> },
      { path: '/teacher', element: <Navigate to="/teacher/dashboard" replace /> },
      { path: '/content', element: <Navigate to="/content/center-info" replace /> },
      { path: '/learning', element: <Navigate to="/learning/materials" replace /> },

      {
        path: '/dashboard',
        element: (
          <PermissionGuard permission="dashboard.view">
            {renderLazy(<StaffDashboardPage />)}
          </PermissionGuard>
        ),
      },

      // ==================== ACCOUNTING PORTAL ROUTES ====================
      {
        path: '/accounting/dashboard',
        element: (
          <PermissionGuard permission="finance.dashboard.view">
            {renderLazy(<AccountingDashboardPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/payments',
        element: (
          <PermissionGuard permission="finance.payments.view">
            {renderLazy(<AccountingPaymentsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/receivables',
        element: (
          <PermissionGuard permission="finance.receivables.view">
            {renderLazy(<AccountingReceivablesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/receivables/:id',
        element: (
          <PermissionGuard permission="finance.receivables.view">
            {renderLazy(<AccountingReceivableDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/transactions',
        element: (
          <PermissionGuard permission="finance.transactions.view">
            {renderLazy(<AccountingTransactionsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/receipts',
        element: (
          <PermissionGuard permission="finance.receipts.view">
            {renderLazy(<AccountingReceiptsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounting/reports',
        element: (
          <PermissionGuard permission="finance.reports.view">
            {renderLazy(<AccountingReportsPage />)}
          </PermissionGuard>
        ),
      },

      // ==================== ACADEMIC PORTAL ROUTES ====================
      {
        path: '/academic/dashboard',
        element: (
          <PermissionGuard permission="academic.dashboard.view">
            {renderLazy(<AcademicDashboardPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/students',
        element: (
          <PermissionGuard permission="students.view">
            {renderLazy(<AcademicStudentsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/students/:studentId',
        element: (
          <PermissionGuard permission="students.view">
            {renderLazy(<AcademicStudentDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/classes',
        element: (
          <PermissionGuard permission="classes.view">
            {renderLazy(<AcademicClassesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/classes/:classId',
        element: (
          <PermissionGuard permission="classes.view">
            {renderLazy(<AcademicClassDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/placement',
        element: (
          <PermissionGuard permission="class-placement.view">
            {renderLazy(<AcademicPlacementPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/requests',
        element: (
          <PermissionGuard permission="student-status.view">
            {renderLazy(<AcademicRequestsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/academic/course-content',
        element: (
          <PermissionGuard permission="course-content.view">
            {renderLazy(<AcademicCourseContentPage />)}
          </PermissionGuard>
        ),
      },

      // ==================== TEACHER PORTAL ROUTES ====================
      {
        path: '/teacher/dashboard',
        element: (
          <PermissionGuard permission="teacher.dashboard.view">
            {renderLazy(<TeacherDashboardPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/classes',
        element: (
          <PermissionGuard permission="teacher.classes.view">
            {renderLazy(<TeacherClassesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/classes/:classId',
        element: (
          <PermissionGuard permission="teacher.classes.view">
            {renderLazy(<TeacherClassDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/teaching-plans',
        element: (
          <PermissionGuard permission="teaching-plan.view">
            {renderLazy(<TeacherTeachingPlansPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/attendance',
        element: (
          <PermissionGuard permission="attendance.view">
            {renderLazy(<TeacherAttendancePage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/assignments',
        element: (
          <PermissionGuard permission="assignments.view">
            {renderLazy(<TeacherAssignmentsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/gradebook',
        element: (
          <PermissionGuard permission="grades.view">
            {renderLazy(<TeacherGradebookPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/progress',
        element: (
          <PermissionGuard permission="teacher.classes.view">
            {renderLazy(<TeacherProgressPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/teacher/schedule',
        element: (
          <PermissionGuard permission="teacher.schedule.view">
            {renderLazy(<TeacherSchedulePage />)}
          </PermissionGuard>
        ),
      },

      // ==================== SALES CRM ROUTES ====================
      {
        path: '/sales/dashboard',
        element: (
          <PermissionGuard permission="sales.dashboard.view">
            {renderLazy(<SalesDashboardPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/leads/:leadId',
        element: (
          <PermissionGuard permission="sales.leads.view">
            {renderLazy(<SalesLeadDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/courses',
        element: (
          <PermissionGuard permission="sales.courses.view">
            {renderLazy(<SalesCoursesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/courses/:courseId',
        element: (
          <PermissionGuard permission="sales.courses.view">
            {renderLazy(<SalesCourseDetailPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/registrations/new',
        element: (
          <PermissionGuard permission="sales.registrations.create">
            {renderLazy(<SalesNewRegistrationPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/registrations',
        element: (
          <PermissionGuard permission="sales.registrations.view">
            {renderLazy(<SalesRegistrationsListPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/sales/registrations/:id',
        element: (
          <PermissionGuard anyPermissions={['sales.registrations.view', 'sales.registrations.review']}>
            {renderLazy(<SalesRegistrationDetailPage />)}
          </PermissionGuard>
        ),
      },

      // ==================== ADMIN PORTAL ROUTES ====================
      {
        path: '/accounts',
        element: (
          <PermissionGuard permission="accounts.view">
            {renderLazy(<AccountsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/accounts/roles',
        element: (
          <PermissionGuard permission="roles.view">
            {renderLazy(<RolesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/roles',
        element: <Navigate to="/accounts/roles" replace />,
      },
      {
        path: '/courses',
        element: (
          <PermissionGuard permission="courses.view">
            {renderLazy(<CoursesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/tuition',
        element: (
          <PermissionGuard permission="tuition.view">
            {renderLazy(<TuitionPoliciesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/training',
        element: (
          <PermissionGuard permission="training.view">
            {renderLazy(<TrainingSupervisionPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/content/center-info',
        element: (
          <PermissionGuard permission="center_info.view">
            {renderLazy(<CenterInfoPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/content/branches',
        element: (
          <PermissionGuard permission="branches.view">
            {renderLazy(<BranchesPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/content/news',
        element: (
          <PermissionGuard permission="news.view">
            {renderLazy(<NewsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/content/jobs',
        element: (
          <PermissionGuard permission="jobs.view">
            {renderLazy(<JobsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/content/achievements',
        element: (
          <PermissionGuard permission="achievements.view">
            {renderLazy(<AchievementsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/learning/materials',
        element: (
          <PermissionGuard permission="materials.view">
            {renderLazy(<MaterialsPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/learning/study-zone',
        element: (
          <PermissionGuard permission="study_zone.view">
            {renderLazy(<StudyZoneListPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/learning/study-zone/:exerciseId',
        element: (
          <PermissionGuard permission="study_zone.view">
            {renderLazy(<StudyZoneExerciseEditorPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/learning/tests',
        element: (
          <PermissionGuard permission="tests.view">
            {renderLazy(<TestsListPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/learning/tests/:testId',
        element: (
          <PermissionGuard permission="tests.view">
            {renderLazy(<TestAuthoringPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/config/toeic',
        element: (
          <PermissionGuard permission="toeic_config.view">
            {renderLazy(<ToeicConfigPage />)}
          </PermissionGuard>
        ),
      },
      {
        path: '/reports',
        element: (
          <PermissionGuard permission="reports.view">
            {renderLazy(<ReportsPage />)}
          </PermissionGuard>
        ),
      },
      { path: '/no-access', element: <NoAccessPage /> },
      { path: '/403', element: <ForbiddenPage /> },
      { path: '/404', element: <StaffNotFoundPage /> },
      { path: '*', element: <StaffNotFoundPage /> },
    ],
  },
])
