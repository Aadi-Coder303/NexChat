import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Specifically handle Zod validation errors (usually from request body parsing)
  const isZodError = err instanceof ZodError || err.name === 'ZodError';
  if (isZodError) {
    status = 400;
    const errors = err.errors || err.issues;
    if (Array.isArray(errors)) {
      message = errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    } else {
      message = err.message;
    }
  }

  // Log the error for server-side debugging
  console.error(`[Error Handler] ${req.method} ${req.path} - ${status} - ${message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Surfacing logic:
  // - Always show the message if it's a client error (status < 500)
  // - Always show the message if we are NOT in production
  // - Always show the message if it's explicitly an AppError (expected error)
  const isProduction = process.env.NODE_ENV === 'production';
  // Temporarily surfacing message in production for debugging
  const displayMessage = message; 

  res.status(status).json({
    error: displayMessage,
    // Include extra details for developers if not in production
    ...( !isProduction && { 
      stack: err.stack,
      originalError: message,
      details: isZodError ? (err.errors || err.issues) : undefined
    })
  });
};
