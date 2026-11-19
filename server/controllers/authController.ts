import { NextFunction, Response } from 'express';
import { Employee } from '../models/Employee.ts';
import { User } from '../models/User.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { AppError } from '../middleware/errorMiddleware.ts';
import { toDateString } from '../utils/dateUtils.ts';
import { signToken } from '../utils/jwt.ts';

function sanitizeUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    employee: user.employee || null,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

async function generateUniqueEmployeeId(): Promise<string> {
  const existing = await Employee.find({}, { employeeId: 1 }).lean();
  let maxNumber = 1000;
  for (const item of existing) {
    const match = String(item.employeeId).match(/EMP-(\d+)/i);
    if (match) {
      const num = Number(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  }
  return `EMP-${maxNumber + 1}`;
}

export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      password,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !department ||
      !designation ||
      !password
    ) {
      return next(
        new AppError('Please fill in all required registration fields.', 400)
      );
    }

    if (String(password).length < 8) {
      return next(
        new AppError('Password must be at least 8 characters long.', 400)
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUser, existingEmployee] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Employee.findOne({ email: normalizedEmail }),
    ]);

    if (existingUser || existingEmployee) {
      return next(
        new AppError('An account with this email address already exists.', 409)
      );
    }

    const employeeId = await generateUniqueEmployeeId();
    const employee = await Employee.create({
      employeeId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      department: String(department).trim(),
      designation: String(designation).trim(),
      joiningDate: toDateString(),
      employmentStatus: 'Active',
    });

    // Public self-registration is strictly restricted to the 'employee' role
    const user = await User.create({
      name: `${employee.firstName} ${employee.lastName}`,
      email: normalizedEmail,
      password: String(password),
      role: 'employee',
      employee: employee._id,
      isActive: true,
      mustChangePassword: false,
    });

    const populated = await User.findById(user._id).populate('employee');
    const token = signToken({ id: String(user._id), role: 'employee' });

    res.status(201).json({
      success: true,
      message: 'Employee account registered successfully.',
      token,
      user: sanitizeUser(populated),
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required.', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password')
      .populate('employee');

    if (!user || !(await user.comparePassword(String(password)))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      return next(
        new AppError('Your account has been deactivated. Contact HR administration.', 403)
      );
    }

    const token = signToken({ id: String(user._id), role: user.role });

    res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const user = await User.findById(req.user._id).populate('employee');
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(
        new AppError('Current password and new password are required.', 400)
      );
    }

    if (String(newPassword).length < 8) {
      return next(
        new AppError('New password must be at least 8 characters long.', 400)
      );
    }

    if (currentPassword === newPassword) {
      return next(
        new AppError('New password must be different from your current password.', 400)
      );
    }

    const user = await User.findById(req.user._id).select('+password').populate('employee');
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    const isMatch = await user.comparePassword(String(currentPassword));
    if (!isMatch) {
      return next(new AppError('Current password is incorrect.', 401));
    }

    user.password = String(newPassword);
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}
