import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { extractRequestToken } from '../../shared/middlewares/auth.middleware.js';
import {
  clearSessionCookie,
  sendSuccess,
  setSessionCookie,
} from '../../shared/utils/response.js';
import type { LoginBody, RegisterStudentBody } from './auth.schema.js';
import * as authService from './auth.service.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as LoginBody;
    const result = await authService.loginStudentPortal(body, {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
    });

    if (result.kind === 'portal_redirect') {
      clearSessionCookie(res);
      sendSuccess(res, result.data, result.data.outcome);
      return;
    }

    setSessionCookie(res, result.rawToken, result.cookieMaxAgeMs);
    sendSuccess(res, result.data, 'Đăng nhập thành công.');
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as RegisterStudentBody;
    const user = await authService.registerStudentPortal(body);
    const message = 'Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay.';

    sendSuccess(
      res,
      {
        success: true,
        message,
        user,
      },
      message,
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw AppError.unauthorized();
    }
    const session = authService.getStudentMeSession(req.auth);
    sendSuccess(res, session, 'Khôi phục phiên đăng nhập thành công.');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = extractRequestToken(req);
    await authService.logoutByRawToken(rawToken);
    clearSessionCookie(res);
    sendSuccess(res, { loggedOut: true }, 'Đăng xuất thành công.');
  } catch (err) {
    next(err);
  }
}
