import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { AppError } from '../errors/app-error.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Đường dẫn API không tồn tại.'));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId, path: req.originalUrl }, 'Unhandled API error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Máy chủ đang gặp sự cố xử lý. Vui lòng thử lại sau.',
    },
  });
}
