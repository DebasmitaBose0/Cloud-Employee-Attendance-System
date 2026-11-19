import { NextFunction, Response } from 'express';
import { Employee } from '../models/Employee.ts';
import { User } from '../models/User.ts';
import { Attendance } from '../models/Attendance.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { AppError } from '../middleware/errorMiddleware.ts';
import { env } from '../config/env.ts';
import { normalizeDateString } from '../utils/dateUtils.ts';

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

export async function getNextEmployeeId(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const nextId = await generateUniqueEmployeeId();
    res.status(200).json({ success: true, employeeId: nextId });
  } catch (error) {
    next(error);
  }
}

export async function getEmployees(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '').trim();
    const department = String(req.query.department || '').trim();
    const status = String(req.query.status || '').trim();

    const filter: Record<string, unknown> = {};

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (status && status !== 'All') {
      filter.employmentStatus = status;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { employeeId: regex },
        { email: regex },
        { designation: regex },
      ];
    }

    const [employees, total, departments] = await Promise.all([
      Employee.find(filter)
        .sort({ createdAt: -1, employeeId: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Employee.countDocuments(filter),
      Employee.distinct('department'),
    ]);

    res.status(200).json({
      success: true,
      data: employees,
      departments: departments.sort(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      return next(new AppError('Employee not found.', 404));
    }

    if (
      req.user?.role === 'employee' &&
      String(req.user.employee?._id || req.user.employee) !== String(employee._id)
    ) {
      return next(
        new AppError('You are only authorized to view your own profile.', 403)
      );
    }

    const [presentCount, absentCount, recentAttendance] = await Promise.all([
      Attendance.countDocuments({
        employee: employee._id,
        status: { $in: ['Present', 'Late Entry'] },
      }),
      Attendance.countDocuments({ employee: employee._id, status: 'Absent' }),
      Attendance.find({ employee: employee._id })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ]);

    const totalRecorded = presentCount + absentCount;

    res.status(200).json({
      success: true,
      data: {
        ...employee,
        attendanceSummary: {
          presentDays: presentCount,
          absentDays: absentCount,
          recordedDays: totalRecorded,
          attendancePercentage:
            totalRecorded > 0
              ? Number(((presentCount / totalRecorded) * 100).toFixed(1))
              : null,
        },
        recentAttendance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      employeeId,
      email,
      phone,
      department,
      designation,
      joiningDate,
      employmentStatus,
      initialPassword,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !department ||
      !designation ||
      !joiningDate
    ) {
      return next(new AppError('All required employee fields must be provided.', 400));
    }

    const normalizedJoiningDate = normalizeDateString(String(joiningDate));
    if (!normalizedJoiningDate) {
      return next(
        new AppError('Joining date must be a valid date in YYYY-MM-DD format.', 400)
      );
    }

    const resolvedEmployeeId = employeeId?.trim()
      ? String(employeeId).trim().toUpperCase()
      : await generateUniqueEmployeeId();

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(
        new AppError('A user account with this email address already exists.', 409)
      );
    }

    const employee = await Employee.create({
      employeeId: resolvedEmployeeId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      department: String(department).trim(),
      designation: String(designation).trim(),
      joiningDate: normalizedJoiningDate,
      employmentStatus: employmentStatus || 'Active',
    });

    const passwordToUse =
      initialPassword && String(initialPassword).length >= 8
        ? String(initialPassword)
        : env.defaultEmployeePassword;

    await User.create({
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      password: passwordToUse,
      role: 'employee',
      employee: employee._id,
      isActive: employee.employmentStatus !== 'Inactive',
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError('Employee not found.', 404));
    }

    const {
      firstName,
      lastName,
      employeeId,
      email,
      phone,
      department,
      designation,
      joiningDate,
      employmentStatus,
    } = req.body;

    if (joiningDate !== undefined) {
      const normalized = normalizeDateString(String(joiningDate));
      if (!normalized) {
        return next(
          new AppError('Joining date must be a valid date in YYYY-MM-DD format.', 400)
        );
      }
      employee.joiningDate = normalized;
    }

    const oldEmployeeId = employee.employeeId;

    if (firstName !== undefined) employee.firstName = String(firstName).trim();
    if (lastName !== undefined) employee.lastName = String(lastName).trim();
    if (employeeId !== undefined && String(employeeId).trim()) {
      employee.employeeId = String(employeeId).trim().toUpperCase();
    }
    if (email !== undefined) employee.email = String(email).trim().toLowerCase();
    if (phone !== undefined) employee.phone = String(phone).trim();
    if (department !== undefined) employee.department = String(department).trim();
    if (designation !== undefined) employee.designation = String(designation).trim();
    if (employmentStatus !== undefined) employee.employmentStatus = employmentStatus;

    await employee.save();

    if (oldEmployeeId !== employee.employeeId) {
      await Attendance.updateMany(
        { employee: employee._id },
        { $set: { employeeId: employee.employeeId } }
      );
    }

    await User.findOneAndUpdate(
      { employee: employee._id },
      {
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        isActive: employee.employmentStatus !== 'Inactive',
      }
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return next(new AppError('Employee not found.', 404));
    }

    await Promise.all([
      Attendance.deleteMany({ employee: employee._id }),
      User.deleteMany({ employee: employee._id }),
      Employee.deleteOne({ _id: employee._id }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Employee and associated records deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}
