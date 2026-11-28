/**
 * Bảng định tuyến Endpoint của Client Web (Website công khai & Cổng học viên).
 * Endpoint quản trị nội bộ thuộc riêng ứng dụng `apps/staff-web`.
 */
export const API_ENDPOINTS = {
  courses: {
    publicList: '/public/courses',
    publicDetailBySlug: (slug: string) => `/public/courses/${encodeURIComponent(slug)}`,
  },
  branches: {
    publicList: '/public/branches',
  },
  schedules: {
    publicList: '/public/schedules',
  },
  news: {
    publicList: '/public/news',
    publicDetail: (id: string) => `/public/news/${encodeURIComponent(id)}`,
  },
  articles: {
    publicList: '/public/articles',
    publicDetailBySlug: (slug: string) => `/public/articles/${encodeURIComponent(slug)}`,
  },
  careers: {
    publicList: '/public/careers',
    publicDetail: (id: string) => `/public/careers/${encodeURIComponent(id)}`,
  },
  studyZone: {
    topicsList: '/public/study-zone/topics',
    exerciseDetail: (exerciseId: string) =>
      `/public/study-zone/exercises/${encodeURIComponent(exerciseId)}`,
    submitExercise: (exerciseId: string) =>
      `/public/study-zone/exercises/${encodeURIComponent(exerciseId)}/submit`,
  },
  testOnline: {
    testsList: '/public/tests',
    testDetailBySlug: (slug: string) => `/public/tests/${encodeURIComponent(slug)}`,
    testDetailById: (testId: string) => `/public/tests/id/${encodeURIComponent(testId)}`,
    inProgressByTestSlug: '/public/test-attempts/in-progress',
    startAttempt: '/public/test-attempts/start',
    attemptDetail: (attemptId: string) =>
      `/public/test-attempts/${encodeURIComponent(attemptId)}`,
    saveProgress: (attemptId: string) =>
      `/public/test-attempts/${encodeURIComponent(attemptId)}/progress`,
    discardAttempt: (attemptId: string) =>
      `/public/test-attempts/${encodeURIComponent(attemptId)}/discard`,
    submitAttempt: (attemptId: string) =>
      `/public/test-attempts/${encodeURIComponent(attemptId)}/submit`,
    attemptResult: (attemptId: string) =>
      `/public/test-attempts/${encodeURIComponent(attemptId)}/result`,
    historyList: '/public/test-history',
    historyDetail: (attemptId: string) =>
      `/public/test-history/${encodeURIComponent(attemptId)}`,
  },
  consultations: {
    submit: '/public/consultations',
  },
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  studentPortal: {
    profileMe: '/students/me/portal-overview',
    tuitionMe: '/students/me/tuition-overview',
    submitAssignment: (assignmentId: string) =>
      `/assignments/${encodeURIComponent(assignmentId)}/submissions`,
    createSupportRequest: '/support-requests',
  },
} as const
