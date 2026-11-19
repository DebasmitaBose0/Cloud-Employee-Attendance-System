import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.ts';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`API route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(
  err: Error & { statusCode?: number; code?: number; keyValue?: Record<string, unknown> },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose invalid ObjectId
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    const errors = Object.values(err.errors).map((val) => val.message);
    message = errors.join('. ');
  }

  // MongoDB duplicate key error
  if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    const keys = Object.keys(err.keyValue);
    if (keys.includes('employee') && keys.includes('date')) {
      message = 'Attendance has already been recorded for this employee on the selected date.';
    } else {
      message = `Duplicate value for ${keys.join(', ')}. Please use a unique value.`;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
}
