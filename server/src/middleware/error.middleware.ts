import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.message}`);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Don't leak stack traces in production
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message,
  });
};
