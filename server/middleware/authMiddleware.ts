import { NextFunction, Request, Response } from 'express';
import { IUser, User, UserRole } from '../models/User.ts';
import { verifyToken } from '../utils/jwt.ts';
import { AppError } from './errorMiddleware.ts';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function protect(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Authentication token is missing.', 401));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).populate('employee');

    if (!user || !user.isActive) {
      return next(
        new AppError('User account is inactive or no longer exists.', 401)
      );
    }

    req.user = user;
    next();
  } catch {
    next(new AppError('Invalid or expired authentication token.', 401));
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
}
