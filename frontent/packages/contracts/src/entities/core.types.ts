/* ============================================================================
 * SHARED CORE STATUS & CATEGORY UNIONS
 * - Chỉ giữ các kiểu dùng chung thực tế; các hợp đồng nghiệp vụ chi tiết nằm tại
 *   authSession.types.ts, sales.types.ts và operations.types.ts để tránh trùng lặp.
 * ============================================================================ */

export const ACCOUNT_STATUSES = ['active', 'suspended', 'deactivated'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const PUBLISH_STATUSES = ['draft', 'published', 'archived'] as const
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]

export const COURSE_VISIBILITY_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export type CourseVisibilityStatus = (typeof COURSE_VISIBILITY_STATUSES)[number]

export const JOB_POST_STATUSES = ['draft', 'published', 'closed', 'archived'] as const
export type JobPostStatus = (typeof JOB_POST_STATUSES)[number]

export const TOEIC_SKILL_CATEGORIES = [
  'listening_reading',
  'speaking',
  'writing',
  'speaking_writing',
] as const
export type ToeicSkillCategory = (typeof TOEIC_SKILL_CATEGORIES)[number]
