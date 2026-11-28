export const ACCOUNT_TYPES = ['STUDENT', 'STAFF'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PORTAL_TYPES = ['CLIENT', 'STAFF'] as const;
export type PortalType = (typeof PORTAL_TYPES)[number];

export const ACCOUNT_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'LOCKED',
  'DISABLED',
  'PASSWORD_RESET_REQUIRED',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ROLES = [
  'ADMIN',
  'SALES',
  'ACCOUNTANT',
  'ACADEMIC',
  'TEACHER',
  'STUDENT',
] as const;
export type RoleCode = (typeof ROLES)[number];
