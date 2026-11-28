import type { Response } from 'express';
import { nodeEnv, sessionCookieName } from '../../config/env.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Thao tác thành công',
  statusCode = 200,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const parsed: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = pair.slice(0, eqIdx).trim();
    const rawVal = pair.slice(eqIdx + 1).trim();
    if (key) {
      try {
        parsed[key] = decodeURIComponent(rawVal);
      } catch {
        parsed[key] = rawVal;
      }
    }
  }
  return parsed;
}

export function setSessionCookie(res: Response, rawToken: string, maxAgeMs?: number): void {
  res.cookie(sessionCookieName, rawToken, {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
