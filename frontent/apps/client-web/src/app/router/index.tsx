import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LegacyStudentHistoryDetailRedirect } from '@/app/router/LegacyStudentHistoryDetailRedirect'
import PublicLayout from '@/layouts/PublicLayout'
import StudentLayout from '@/layouts/StudentLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'

import HomePage from '@/pages/HomePage'
import ContactPage from '@/pages/ContactPage'
import NotFoundPage from '@/pages/NotFoundPage'
import StaffPortalRedirectPage from '@/pages/StaffPortalRedirectPage'

import { CoursesPage, CourseDetailPage } from '@/features/courses'
import { SchedulePage } from '@/features/schedules'

import StudentsPage from '@/features/student-news/pages/StudentsPage'
import StudentDetailPage from '@/features/student-news/pages/StudentDetailPage'
import ListeningReadingPage from '@/features/learning-materials/pages/ListeningReadingPage'
import ListeningReadingDetailPage from '@/features/learning-materials/pages/ListeningReadingDetailPage'
import ExamReviewPage from '@/features/learning-materials/pages/ExamReviewPage'
import ExamReviewDetailPage from '@/features/learning-materials/pages/ExamReviewDetailPage'

import BranchesPage from '@/features/about/pages/BranchesPage'
import NewsPage from '@/features/about/pages/NewsPage'
import NewsDetailPage from '@/features/about/pages/NewsDetailPage'
import CareersPage from '@/features/about/pages/CareersPage'
import CareerDetailPage from '@/features/about/pages/CareerDetailPage'

import {
  StudyZoneCategoryPage,
  StudyExercisePage,
} from '@/features/study-zone'

import {
  TestListPage,
  TestDetailPage,
  TestTakingPage,
  TestResultPage,
  TestHistoryPage,
  TestHistoryDetailPage,
} from '@/features/test-online'

import { AuthPage } from '@/features/auth/pages/AuthPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage'
import {
  StudentAssignmentsPage,
  StudentDashboardPage,
  StudentExamResultsPage,
  StudentLearningPlanPage,
  StudentProfilePage,
  StudentSchedulePage,
  StudentTuitionPage,
} from '@/features/student-portal'

export const router = createBrowserRouter([
  // Các trang làm bài & thiết lập đề thi độc lập toàn màn hình (không chứa Header và Footer của website)
  {
    path: '/test-online/:slug',
    element: <TestDetailPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/test-online/attempt/:attemptId',
    element: <TestTakingPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/study-zone/practice/:exerciseId',
    element: <StudyExercisePage />,
    errorElement: <RouteErrorPage />,
  },
  // Khu vực CỔNG HỌC VIÊN (English Center Student Portal – Khóa học của tôi)
  {
    element: <StudentLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/student', element: <Navigate to="/student/dashboard" replace /> },
      { path: '/student/my-courses', element: <Navigate to="/student/dashboard" replace /> },
      {
        path: '/student/my-courses/:enrollmentId',
        element: <Navigate to="/student/dashboard" replace />,
      },
      { path: '/student/dashboard', element: <StudentDashboardPage /> },
      { path: '/student/learning-plan', element: <StudentLearningPlanPage /> },
      { path: '/student/assignments', element: <StudentAssignmentsPage /> },
      { path: '/student/exam-results', element: <StudentExamResultsPage /> },
      { path: '/student/schedule', element: <StudentSchedulePage /> },
      { path: '/student/tuition', element: <StudentTuitionPage /> },
      { path: '/student/profile', element: <StudentProfilePage /> },
    ],
  },
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/courses', element: <CoursesPage /> },
      { path: '/courses/:slug', element: <CourseDetailPage /> },

      // Khu vực Học viên & Thành tích công khai
      { path: '/hoc-vien', element: <StudentsPage /> },
      { path: '/hoc-vien/:slug', element: <StudentDetailPage /> },

      // Khu vực Tài liệu học tập công khai (2 danh mục độc lập)
      { path: '/tai-lieu', element: <Navigate to="/tai-lieu/listening-reading" replace /> },
      { path: '/tai-lieu/listening-reading', element: <ListeningReadingPage /> },
      { path: '/tai-lieu/listening-reading/:slug', element: <ListeningReadingDetailPage /> },
      { path: '/tai-lieu/review-de-thi', element: <ExamReviewPage /> },
      { path: '/tai-lieu/review-de-thi/:slug', element: <ExamReviewDetailPage /> },

      // Đường dẫn cũ -> chuyển hướng về đường dẫn chuẩn
      { path: '/documents', element: <Navigate to="/tai-lieu/listening-reading" replace /> },
      { path: '/documents/*', element: <Navigate to="/tai-lieu/listening-reading" replace /> },

      // Khu vực STUDY ZONE (3 danh mục: Ngữ pháp, Từ vựng, Luyện nghe)
      { path: '/study-zone', element: <Navigate to="/study-zone/grammar" replace /> },
      { path: '/study-zone/grammar', element: <StudyZoneCategoryPage category="grammar" /> },
      { path: '/study-zone/vocabulary', element: <StudyZoneCategoryPage category="vocabulary" /> },
      { path: '/study-zone/listening', element: <StudyZoneCategoryPage category="listening" /> },

      // Khu vực TEST ONLINE (Danh sách đề, Kết quả & Lịch sử làm bài chính thức)
      { path: '/test-online', element: <TestListPage /> },
      { path: '/test-online/result/:attemptId', element: <TestResultPage /> },
      { path: '/test-history', element: <TestHistoryPage /> },
      { path: '/test-history/:attemptId', element: <TestHistoryDetailPage /> },

      // Chuyển hướng đường dẫn lịch sử phụ về đường dẫn chính thức duy nhất (/test-history)
      { path: '/student/history', element: <Navigate to="/test-history" replace /> },
      { path: '/student/history/:attemptId', element: <LegacyStudentHistoryDetailRedirect /> },

      // Khu vực Hệ thống Tài khoản Học viên
      { path: '/login', element: <AuthPage defaultTab="login" /> },
      { path: '/register', element: <AuthPage defaultTab="register" /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/change-password', element: <ChangePasswordPage /> },

      { path: '/contact', element: <ContactPage /> },
      { path: '/about/branches', element: <BranchesPage /> },
      { path: '/about/news', element: <NewsPage /> },
      { path: '/about/news/:id', element: <NewsDetailPage /> },
      { path: '/about/careers', element: <CareersPage /> },
      { path: '/about/careers/:id', element: <CareerDetailPage /> },

      // Chuyển hướng rõ ràng nếu người dùng gõ nhầm đường dẫn nhân sự trên Client Web (:5173)
      { path: '/staff', element: <StaffPortalRedirectPage /> },
      { path: '/staff/*', element: <StaffPortalRedirectPage /> },
      { path: '/admin', element: <StaffPortalRedirectPage /> },
      { path: '/admin/*', element: <StaffPortalRedirectPage /> },
      { path: '/sales', element: <StaffPortalRedirectPage /> },
      { path: '/sales/*', element: <StaffPortalRedirectPage /> },
      { path: '/accounting', element: <StaffPortalRedirectPage /> },
      { path: '/accounting/*', element: <StaffPortalRedirectPage /> },
      { path: '/academic', element: <StaffPortalRedirectPage /> },
      { path: '/academic/*', element: <StaffPortalRedirectPage /> },
      { path: '/teacher', element: <StaffPortalRedirectPage /> },
      { path: '/teacher/*', element: <StaffPortalRedirectPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
