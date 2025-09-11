import type { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function errorHandler(
  err: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error('API Error:', err);

  if (err instanceof APIError) {
    res.status(err.status).json({
      error: { 
        code: err.code, 
        message: err.message 
      }
    });
  } else {
    // Generic error response
    res.status(500).json({
      error: { 
        code: 'INTERNAL_ERROR', 
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message 
      }
    });
  }
}