import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.message}`);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Show the real message if it's a client-side error (4xx) 
  // or if we're not in production.
  const displayMessage = (status < 500 || process.env.NODE_ENV !== 'production') 
    ? message 
    : 'An unexpected error occurred';
    
  res.status(status).json({
    error: displayMessage,
  });
};
