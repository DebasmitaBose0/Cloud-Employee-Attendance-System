import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance.ts';
import { Employee } from '../models/Employee.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { AppError } from '../middleware/errorMiddleware.ts';
import {
  getRecentWorkingDays,
  getWorkingDaysInMonth,
  isWorkingDay,
  toDateString,
} from '../utils/dateUtils.ts';
import { env } from '../config/env.ts';

function parseMonthYear(query: Record<string, unknown>) {
  const now = new Date();
  const year = Number(query.year) || now.getFullYear();
  const month = Number(query.month) || now.getMonth() + 1;
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    return null;
  }
  return { year, month };
}

export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user?.role === 'employee') {
      const empId = req.user.employee?._id || req.user.employee;
      if (!empId) {
        return next(new AppError('No employee profile linked to this account.', 404));
      }
      req.params.employeeId = String(empId);
      return getEmployeeReport(req, res, next);
    }

    const today = toDateString();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [
      totalEmployees,
      activeEmployees,
      todayRecords,
      departmentAgg,
      recentAdditions,
      recentActivity,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ employmentStatus: { $ne: 'Inactive' } }),
      Attendance.find({ date: today }).lean(),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Employee.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('employeeId firstName lastName department designation joiningDate employmentStatus')
        .lean(),
      Attendance.find()
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate('employee', 'employeeId firstName lastName department')
        .populate('markedBy', 'name')
        .lean(),
    ]);

    const onTimeToday = todayRecords.filter((r) => r.status === 'Present').length;
    const lateToday = todayRecords.filter((r) => r.status === 'Late Entry').length;
    const presentToday = onTimeToday + lateToday;
    const absentToday = todayRecords.filter((r) => r.status === 'Absent').length;
    const recordedToday = presentToday + absentToday;
    const notMarkedToday = Math.max(0, activeEmployees - recordedToday);
    const todayPercentage =
      recordedToday > 0
        ? Number(((presentToday / recordedToday) * 100).toFixed(1))
        : null;

    const recentWorkingDays = getRecentWorkingDays(7, today);
    const weeklyRecords = await Attendance.find({
      date: { $in: recentWorkingDays },
    }).lean();

    const weeklyChart = recentWorkingDays.map((dateStr) => {
      const dayRecords = weeklyRecords.filter((r) => r.date === dateStr);
      const present = dayRecords.filter(
        (r) => r.status === 'Present' || r.status === 'Late Entry'
      ).length;
      const absent = dayRecords.filter((r) => r.status === 'Absent').length;
      const total = present + absent;
      const [, m, d] = dateStr.split('-');
      return {
        date: dateStr,
        label: `${m}/${d}`,
        present,
        absent,
        percentage: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
      };
    });

    const monthlyTrend = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const dt = new Date(Date.UTC(currentYear, currentMonth - 1 - offset, 1));
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth() + 1;
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const recs = await Attendance.find({
        date: { $regex: `^${prefix}` },
      }).lean();

      const present = recs.filter(
        (r) => r.status === 'Present' || r.status === 'Late Entry'
      ).length;
      const absent = recs.filter((r) => r.status === 'Absent').length;
      const total = present + absent;
      const monthName = dt.toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      });

      monthlyTrend.push({
        month: `${monthName} ${y}`,
        shortMonth: monthName,
        present,
        absent,
        percentage: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
      });
    }

    res.status(200).json({
      success: true,
      date: today,
      stats: {
        totalEmployees,
        activeEmployees,
        presentToday,
        onTimeToday,
        lateToday,
        absentToday,
        notMarkedToday,
        recordedToday,
        attendancePercentage: todayPercentage,
      },
      weeklyChart,
      monthlyTrend,
      departmentDistribution: departmentAgg.map((d) => ({
        department: d._id,
        count: d.count,
      })),
      recentActivity,
      recentAdditions,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMonthlyReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = parseMonthYear(req.query as Record<string, unknown>);
    if (!parsed) {
      return next(new AppError('Valid month (1-12) and year are required.', 400));
    }

    const { year, month } = parsed;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const today = toDateString();
    const isCurrentMonth = today.startsWith(monthPrefix);

    const scheduledWorkingDays = getWorkingDaysInMonth(year, month);
    const elapsedWorkingDays = getWorkingDaysInMonth(
      year,
      month,
      isCurrentMonth ? today : undefined
    );

    const department = String(req.query.department || '').trim();
    const search = String(req.query.search || '').trim();

    const empFilter: Record<string, unknown> = {};
    if (department && department !== 'All') {
      empFilter.department = department;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      empFilter.$or = [
        { firstName: regex },
        { lastName: regex },
        { employeeId: regex },
      ];
    }

    const [employees, attendanceRecords, departments] = await Promise.all([
      Employee.find(empFilter).sort({ employeeId: 1 }).lean(),
      Attendance.find({ date: { $regex: `^${monthPrefix}` } }).lean(),
      Employee.distinct('department'),
    ]);

    const employeeSummaries = employees.map((emp) => {
      const empRecords = attendanceRecords.filter(
        (rec) => String(rec.employee) === String(emp._id) && isWorkingDay(rec.date)
      );

      const onTimeDays = empRecords.filter((r) => r.status === 'Present').length;
      const lateEntryDays = empRecords.filter((r) => r.status === 'Late Entry').length;
      const presentDays = onTimeDays + lateEntryDays;
      const absentDays = empRecords.filter((r) => r.status === 'Absent').length;
      const recordedWorkingDays = presentDays + absentDays;

      const recordsWithHours = empRecords.filter((r) => (r.workingHours || 0) > 0);
      const totalHours = recordsWithHours.reduce((acc, r) => acc + (r.workingHours || 0), 0);
      const avgWorkingHours =
        recordsWithHours.length > 0
          ? Number((totalHours / recordsWithHours.length).toFixed(2))
          : 0;
      const compliantDays = empRecords.filter(
        (r) => r.meetsTenHours && r.meetsSixPmCheckout
      ).length;

      const applicableElapsedDays = elapsedWorkingDays.filter(
        (d) => d >= emp.joiningDate
      ).length;
      const unmarkedDays = Math.max(0, applicableElapsedDays - recordedWorkingDays);
      const isIncomplete = applicableElapsedDays > 0 && unmarkedDays > 0;

      const attendancePercentage =
        recordedWorkingDays > 0
          ? Number(((presentDays / recordedWorkingDays) * 100).toFixed(1))
          : null;

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        employmentStatus: emp.employmentStatus,
        totalWorkingDays: scheduledWorkingDays.length,
        elapsedWorkingDays: applicableElapsedDays,
        recordedWorkingDays,
        presentDays,
        onTimeDays,
        lateEntryDays,
        absentDays,
        unmarkedDays,
        avgWorkingHours,
        compliantDays,
        isIncomplete,
        attendancePercentage,
      };
    });

    const deptMap = new Map<
      string,
      {
        department: string;
        employees: number;
        presentDays: number;
        lateEntryDays: number;
        absentDays: number;
        recordedDays: number;
      }
    >();

    for (const row of employeeSummaries) {
      const existing = deptMap.get(row.department) || {
        department: row.department,
        employees: 0,
        presentDays: 0,
        lateEntryDays: 0,
        absentDays: 0,
        recordedDays: 0,
      };
      existing.employees += 1;
      existing.presentDays += row.presentDays;
      existing.lateEntryDays += row.lateEntryDays;
      existing.absentDays += row.absentDays;
      existing.recordedDays += row.recordedWorkingDays;
      deptMap.set(row.department, existing);
    }

    const departmentSummary = Array.from(deptMap.values()).map((d) => ({
      ...d,
      attendancePercentage:
        d.recordedDays > 0
          ? Number(((d.presentDays / d.recordedDays) * 100).toFixed(1))
          : null,
    }));

    const totalPresent = employeeSummaries.reduce((acc, r) => acc + r.presentDays, 0);
    const totalLate = employeeSummaries.reduce((acc, r) => acc + r.lateEntryDays, 0);
    const totalAbsent = employeeSummaries.reduce((acc, r) => acc + r.absentDays, 0);
    const totalRecorded = totalPresent + totalAbsent;

    res.status(200).json({
      success: true,
      period: {
        year,
        month,
        monthPrefix,
        scheduledWorkingDays: scheduledWorkingDays.length,
        elapsedWorkingDays: elapsedWorkingDays.length,
        weekendDays: env.weekendDays,
        holidaysInMonth: env.publicHolidays.filter((h) => h.startsWith(monthPrefix)),
      },
      totals: {
        employeesCount: employeeSummaries.length,
        presentDays: totalPresent,
        lateEntryDays: totalLate,
        absentDays: totalAbsent,
        recordedWorkingDays: totalRecorded,
        incompleteRecordsCount: employeeSummaries.filter((e) => e.isIncomplete).length,
        overallPercentage:
          totalRecorded > 0
            ? Number(((totalPresent / totalRecorded) * 100).toFixed(1))
            : null,
      },
      departments: departments.sort(),
      departmentSummary,
      data: employeeSummaries,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramId = req.params.employeeId;
    const emp = mongoose.Types.ObjectId.isValid(paramId)
      ? await Employee.findById(paramId).lean()
      : await Employee.findOne({ employeeId: paramId.toUpperCase() }).lean();

    if (!emp) {
      return next(new AppError('Employee not found.', 404));
    }

    if (
      req.user?.role === 'employee' &&
      String(req.user.employee?._id || req.user.employee) !== String(emp._id)
    ) {
      return next(
        new AppError('You are only authorized to access your own attendance report.', 403)
      );
    }

    const parsed = parseMonthYear(req.query as Record<string, unknown>);
    if (!parsed) {
      return next(new AppError('Valid month (1-12) and year are required.', 400));
    }

    const { year, month } = parsed;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const today = toDateString();
    const isCurrentMonth = today.startsWith(monthPrefix);

    const scheduledWorkingDays = getWorkingDaysInMonth(year, month);
    const elapsedWorkingDays = getWorkingDaysInMonth(
      year,
      month,
      isCurrentMonth ? today : undefined
    ).filter((d) => d >= emp.joiningDate);

    const [monthRecords, todayRecord, recentHistory] = await Promise.all([
      Attendance.find({
        employee: emp._id,
        date: { $regex: `^${monthPrefix}` },
      })
        .sort({ date: -1 })
        .lean(),
      Attendance.findOne({ employee: emp._id, date: today }).lean(),
      Attendance.find({ employee: emp._id }).sort({ date: -1 }).limit(15).lean(),
    ]);

    const workingMonthRecords = monthRecords.filter((r) => isWorkingDay(r.date));
    const onTimeDays = workingMonthRecords.filter((r) => r.status === 'Present').length;
    const lateEntryDays = workingMonthRecords.filter((r) => r.status === 'Late Entry').length;
    const presentDays = onTimeDays + lateEntryDays;
    const absentDays = workingMonthRecords.filter((r) => r.status === 'Absent').length;
    const recordedWorkingDays = presentDays + absentDays;
    const unmarkedDays = Math.max(0, elapsedWorkingDays.length - recordedWorkingDays);

    const recordsWithHours = workingMonthRecords.filter((r) => (r.workingHours || 0) > 0);
    const avgWorkingHours =
      recordsWithHours.length > 0
        ? Number(
            (
              recordsWithHours.reduce((acc, r) => acc + (r.workingHours || 0), 0) /
              recordsWithHours.length
            ).toFixed(2)
          )
        : 0;

    const monthlyChart = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const dt = new Date(Date.UTC(year, month - 1 - offset, 1));
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth() + 1;
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const recs = await Attendance.find({
        employee: emp._id,
        date: { $regex: `^${prefix}` },
      }).lean();
      const validRecs = recs.filter((r) => isWorkingDay(r.date));
      const p = validRecs.filter(
        (r) => r.status === 'Present' || r.status === 'Late Entry'
      ).length;
      const a = validRecs.filter((r) => r.status === 'Absent').length;
      const t = p + a;
      monthlyChart.push({
        month: dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        present: p,
        absent: a,
        percentage: t > 0 ? Number(((p / t) * 100).toFixed(1)) : 0,
      });
    }

    res.status(200).json({
      success: true,
      employee: emp,
      today: {
        date: today,
        status: todayRecord ? todayRecord.status : 'Not Marked',
        checkInTime: todayRecord?.checkInTime || null,
        checkInIso: todayRecord?.checkInIso || null,
        checkOutTime: todayRecord?.checkOutTime || null,
        checkOutIso: todayRecord?.checkOutIso || null,
        workingHours: todayRecord?.workingHours || 0,
        meetsSixPmCheckout: todayRecord?.meetsSixPmCheckout || false,
        meetsTenHours: todayRecord?.meetsTenHours || false,
        notes: todayRecord?.notes || '',
      },
      summary: {
        year,
        month,
        totalWorkingDays: scheduledWorkingDays.length,
        elapsedWorkingDays: elapsedWorkingDays.length,
        recordedWorkingDays,
        presentDays,
        onTimeDays,
        lateEntryDays,
        absentDays,
        unmarkedDays,
        avgWorkingHours,
        isIncomplete: elapsedWorkingDays.length > 0 && unmarkedDays > 0,
        attendancePercentage:
          recordedWorkingDays > 0
            ? Number(((presentDays / recordedWorkingDays) * 100).toFixed(1))
            : null,
      },
      monthlyRecords: monthRecords,
      recentHistory,
      monthlyChart,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  return getMonthlyReport(req, res, next);
}
