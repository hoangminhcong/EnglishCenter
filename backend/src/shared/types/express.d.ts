import type { AccountStatus, AccountType, RoleCode } from '../constants/roles.ts';

export type AuthenticatedContext = {
  sessionId: string;
  rawToken: string;
  userId: string;
  username: string;
  email: string;
  displayName: string;
  phone: string;
  avatarUrl?: string;
  accountType: AccountType;
  status: AccountStatus;
  role: RoleCode;
  createdAt: string;
  lastLoginAt: string | null;
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthenticatedContext;
    }
  }
}
