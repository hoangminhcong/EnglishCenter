import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/app-error.js';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join('.') || 'body',
        message: issue.message,
      }));
      const firstMessage = details[0]?.message ?? 'Dữ liệu đầu vào không hợp lệ.';
      next(AppError.validation(firstMessage, details));
      return;
    }
    req.body = parsed.data;
    next();
  };
}
