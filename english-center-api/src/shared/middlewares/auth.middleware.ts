import type { NextFunction, Request, Response } from 'express';
import { sessionCookieName } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { parseCookies } from '../utils/response.js';
import { verifyAccessToken } from '../../modules/auth/auth.service.js';

export function extractRequestToken(req: Request): string | undefined {
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      return bearer;
    }
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[sessionCookieName];
  return cookieToken && cookieToken.length > 0 ? cookieToken : undefined;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = extractRequestToken(req);
    if (!rawToken) {
      throw AppError.unauthorized('Vui lòng đăng nhập để tiếp tục.');
    }

    req.auth = await verifyAccessToken(rawToken);
    next();
  } catch (err) {
    next(err);
  }
}
