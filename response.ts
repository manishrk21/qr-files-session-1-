// lib/api/response.ts
import { NextResponse } from 'next/server';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function err(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

// lib/api/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof AppError) {
    return err(error.code, error.message, error.status, error.details);
  }
  console.error('[unhandled]', error);
  return err('INTERNAL_ERROR', 'An unexpected error occurred.', 500);
}

// Named error constructors
export const Errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Forbidden') => new AppError('FORBIDDEN', msg, 403),
  notFound: (resource = 'Resource') => new AppError('NOT_FOUND', `${resource} not found.`, 404),
  conflict: (msg: string) => new AppError('CONFLICT', msg, 409),
  validation: (msg: string, details?: unknown) => new AppError('VALIDATION_ERROR', msg, 422, details),
  rateLimited: (msg: string, retryAfterSeconds?: number) =>
    new AppError('RATE_LIMITED', msg, 429, retryAfterSeconds ? { retryAfterSeconds } : undefined),
  restaurantClosed: () => new AppError('RESTAURANT_CLOSED', 'This restaurant is not accepting orders right now.', 503),
  internal: (msg = 'Internal server error') => new AppError('INTERNAL_ERROR', msg, 500),
};
