import { pool } from '../../config/db.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { AuthenticatedContext } from '../../shared/types/express.js';
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../shared/utils/crypto.js';
import * as userService from '../user/user.service.js';
import type { UserIdentityRecord } from '../user/user.schema.js';
import * as authRepository from './auth.repository.js';
import type {
  AuthenticatedClientSessionDto,
  ClientLoginOutcomeDto,
  LoginBody,
  RegisteredStudentUserDto,
  RegisterStudentBody,
} from './auth.schema.js';

const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SHORT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STUDENT_LANDING_ROUTE = '/student/dashboard';

export type LoginServiceResult =
  | {
      kind: 'authenticated';
      data: ClientLoginOutcomeDto;
      rawToken: string;
      cookieMaxAgeMs: number | undefined;
    }
  | {
      kind: 'portal_redirect';
      data: ClientLoginOutcomeDto;
    };

function assertAccountCanAuthenticate(identity: UserIdentityRecord): void {
  if (!identity.isActive || identity.status === 'LOCKED' || identity.status === 'DISABLED') {
    throw AppError.forbidden('Tài khoản của bạn hiện đang bị khóa hoặc tạm ngừng truy cập.');
  }

  if (identity.status === 'PENDING_ACTIVATION') {
    throw AppError.forbidden('Tài khoản của bạn đang chờ kích hoạt.');
  }
}

export function buildClientSessionDto(
  identity: Pick<
    UserIdentityRecord,
    | 'id'
    | 'username'
    | 'displayName'
    | 'email'
    | 'phone'
    | 'status'
    | 'avatarUrl'
    | 'createdAt'
    | 'lastLoginAt'
  >,
): AuthenticatedClientSessionDto {
  return {
    user: {
      id: identity.id,
      username: identity.username,
      displayName: identity.displayName,
      email: identity.email,
      phone: identity.phone,
      status: identity.status,
      ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
      createdAt: identity.createdAt,
      lastLoginAt: identity.lastLoginAt,
    },
    accountType: 'STUDENT',
    portal: 'CLIENT',
    role: 'STUDENT',
    permissions: [],
    defaultLandingRoute: DEFAULT_STUDENT_LANDING_ROUTE,
  };
}

export async function loginStudentPortal(
  input: LoginBody,
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<LoginServiceResult> {
  const identity = await userService.findByIdentifier(input.identifier);
  if (!identity) {
    throw AppError.unauthorized('Tên đăng nhập hoặc mật khẩu không chính xác.');
  }

  const passwordValid = await verifyPassword(input.password, identity.passwordHash);
  if (!passwordValid) {
    throw AppError.unauthorized('Tên đăng nhập hoặc mật khẩu không chính xác.');
  }

  assertAccountCanAuthenticate(identity);

  if (identity.accountType !== 'STUDENT') {
    return {
      kind: 'portal_redirect',
      data: {
        outcome: 'PORTAL_REDIRECT_REQUIRED',
        accountType: 'STAFF',
        targetPortal: 'STAFF',
        username: identity.username,
        displayName: identity.displayName,
        message:
          'Tài khoản này thuộc Cổng Nhân sự. Vui lòng chuyển sang ứng dụng dành cho nhân sự.',
      },
    };
  }

  const ttlMs = input.rememberMe ? REMEMBER_ME_TTL_MS : SHORT_SESSION_TTL_MS;
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  const client = await pool.connect();
  let lastLoginAt: string;
  try {
    await client.query('BEGIN');
    await authRepository.insertSession(
      {
        userId: identity.id,
        tokenHash,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
      client,
    );
    lastLoginAt = await userService.recordLoginTimestamp(identity.id, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const sessionDto = buildClientSessionDto({
    ...identity,
    lastLoginAt,
  });

  return {
    kind: 'authenticated',
    rawToken,
    cookieMaxAgeMs: input.rememberMe ? REMEMBER_ME_TTL_MS : undefined,
    data: {
      outcome: 'AUTHENTICATED',
      session: sessionDto,
      accessToken: rawToken,
    },
  };
}

export async function registerStudentPortal(
  input: RegisterStudentBody,
): Promise<RegisteredStudentUserDto> {
  const passwordHash = await hashPassword(input.password);

  const client = await pool.connect();
  let created: UserIdentityRecord;
  try {
    await client.query('BEGIN');
    created = await userService.createStudentAccount(
      {
        fullName: input.fullName,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash,
      },
      client,
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    id: created.id,
    username: created.username,
    fullName: created.displayName,
    email: created.email,
    phone: created.phone,
    role: 'student',
    accountType: 'STUDENT',
    portal: 'CLIENT',
    accountStatus: created.status,
    defaultLandingRoute: DEFAULT_STUDENT_LANDING_ROUTE,
    ...(created.avatarUrl ? { avatarUrl: created.avatarUrl } : {}),
    createdAt: created.createdAt,
  };
}

export async function verifyAccessToken(rawToken: string): Promise<AuthenticatedContext> {
  const tokenHash = hashToken(rawToken);
  const activeSession = await authRepository.findValidSessionByTokenHash(tokenHash);
  if (!activeSession) {
    throw AppError.unauthorized('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
  }

  const identity = await userService.findById(activeSession.userId);
  if (!identity) {
    throw AppError.unauthorized('Không tìm thấy tài khoản của phiên đăng nhập.');
  }

  if (!identity.isActive || identity.status !== 'ACTIVE') {
    throw AppError.unauthorized('Tài khoản hiện không ở trạng thái hoạt động.');
  }

  return {
    sessionId: activeSession.sessionId,
    rawToken,
    userId: identity.id,
    username: identity.username,
    email: identity.email,
    displayName: identity.displayName,
    phone: identity.phone,
    ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
    accountType: identity.accountType,
    status: identity.status,
    role: identity.role,
    createdAt: identity.createdAt,
    lastLoginAt: identity.lastLoginAt,
  };
}

export function getStudentMeSession(auth: AuthenticatedContext): AuthenticatedClientSessionDto {
  if (auth.accountType !== 'STUDENT') {
    throw AppError.forbidden('Tài khoản nhân sự không truy cập Cổng Học viên.');
  }

  return buildClientSessionDto({
    id: auth.userId,
    username: auth.username,
    displayName: auth.displayName,
    email: auth.email,
    phone: auth.phone,
    status: auth.status,
    avatarUrl: auth.avatarUrl ?? null,
    createdAt: auth.createdAt,
    lastLoginAt: auth.lastLoginAt,
  });
}

export async function logoutByRawToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) {
    return;
  }
  const tokenHash = hashToken(rawToken);
  await authRepository.revokeSessionByTokenHash(tokenHash);
}
