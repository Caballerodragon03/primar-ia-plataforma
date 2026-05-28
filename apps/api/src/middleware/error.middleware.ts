import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /**
   * Optional stable error code for the frontend to map to localized i18n
   * strings (e.g. EMAIL_NOT_VERIFIED, ACCOUNT_REJECTED, ACCOUNT_SUSPENDED).
   * `message` is the fallback Spanish text — clients prefer `errorCode`.
   */
  public readonly errorCode?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperationalOrCode: boolean | string = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    if (typeof isOperationalOrCode === 'string') {
      this.isOperational = true;
      this.errorCode = isOperationalOrCode;
    } else {
      this.isOperational = isOperationalOrCode;
    }
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.errorCode ? { errorCode: err.errorCode } : {}),
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(400).json({
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Validation error',
    });
    return;
  }

  // Prisma known request errors (constraint violations, etc.)
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code: string; meta?: Record<string, unknown> };
    console.error('Prisma error:', prismaErr.code, prismaErr.meta, prismaErr.message);
    res.status(400).json({
      success: false,
      error: 'Database operation failed',
    });
    return;
  }

  // Prisma validation errors (invalid enum, wrong field type, etc.)
  if (err.constructor?.name === 'PrismaClientValidationError') {
    console.error('Prisma validation error:', err.message);
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
    });
    return;
  }

  console.error('Unhandled error:', err.constructor?.name, err.message, err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
