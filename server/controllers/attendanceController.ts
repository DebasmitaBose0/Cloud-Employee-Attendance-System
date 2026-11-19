import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance, AttendanceStatus } from '../models/Attendance.ts';
import { Employee } from '../models/Employee.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { AppError } from '../middleware/errorMiddleware.ts';
import { isWorkingDay, normalizeDateString, toDateString } from '../utils/dateUtils.ts';
import {
  calculateWorkingHours,
  evaluateCheckInStatus,
  evaluateCheckoutCompliance,
  isValidTimeString,
} from '../utils/attendanceRules.ts';

function buildIsoForDateAndTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000Z`;
}

export async function getAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';
    const status = String(req.query.status || '').trim();
    const department = String(req.query.department || '').trim();
    const employeeFilter = String(req.query.employeeId || '').trim();
    const search = String(req.query.search || '').trim();

    const query: Record<string, unknown> = {};

    if (req.user?.role === 'employee') {
      const ownEmpId = req.user.employee?._id || req.user.employee;
      if (!ownEmpId) {
        return next(new AppError('No employee record linked to this account.', 404));
      }
      query.employee = ownEmpId;
    } else {
      const employeeMatch: Record<string, unknown> = {};
      if (department && department !== 'All') {
        employeeMatch.department = department;
      }
      if (employeeFilter && employeeFilter !== 'All') {
        if (mongoose.Types.ObjectId.isValid(employeeFilter)) {
          employeeMatch._id = employeeFilter;
        } else {
          employeeMatch.employeeId = employeeFilter.toUpperCase();
        }
      }
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        employeeMatch.$or = [
          { firstName: regex },
          { lastName: regex },
          { employeeId: regex },
        ];
      }

      if (Object.keys(employeeMatch).length > 0) {
        const matchedEmployees = await Employee.find(employeeMatch, { _id: 1 }).lean();
        query.employee = { $in: matchedEmployees.map((e) => e._id) };
      }
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (startDate || endDate) {
      const dateQuery: Record<string, string> = {};
      if (startDate) {
        const normStart = normalizeDateString(startDate);
        if (!normStart) return next(new AppError('Invalid startDate format.', 400));
        dateQuery.$gte = normStart;
      }
      if (endDate) {
        const normEnd = normalizeDateString(endDate);
        if (!normEnd) return next(new AppError('Invalid endDate format.', 400));
        dateQuery.$lte = normEnd;
      }
      query.date = dateQuery;
    }

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('employee', 'employeeId firstName lastName department designation email')
        .populate('markedBy', 'name email')
        .sort({ date: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: records,
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

export async function getAttendanceById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate('employee', 'employeeId firstName lastName department designation email')
      .populate('markedBy', 'name email')
      .lean();

    if (!record) {
      return next(new AppError('Attendance record not found.', 404));
    }

    if (
      req.user?.role === 'employee' &&
      String((record.employee as any)?._id || record.employee) !==
        String(req.user.employee?._id || req.user.employee)
    ) {
      return next(
        new AppError('You are not authorized to view this attendance record.', 403)
      );
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

export async function getDailyAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawDate = req.query.date ? String(req.query.date) : toDateString();
    const date = normalizeDateString(rawDate);
    if (!date) {
      return next(new AppError('Date must be in YYYY-MM-DD format.', 400));
    }

    const department = String(req.query.department || '').trim();
    const search = String(req.query.search || '').trim();

    const empFilter: Record<string, unknown> = {
      employmentStatus: { $ne: 'Inactive' },
    };

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

    const [employees, attendanceRecords, allDepartments] = await Promise.all([
      Employee.find(empFilter).sort({ employeeId: 1 }).lean(),
      Attendance.find({ date }).lean(),
      Employee.distinct('department'),
    ]);

    const recordMap = new Map(
      attendanceRecords.map((rec) => [String(rec.employee), rec])
    );

    const sheet = employees.map((emp) => {
      const existing = recordMap.get(String(emp._id));
      return {
        employee: emp,
        attendanceId: existing?._id || null,
        date,
        status: existing ? existing.status : 'Not Marked',
        checkInTime: existing?.checkInTime || null,
        checkInIso: existing?.checkInIso || null,
        checkOutTime: existing?.checkOutTime || null,
        checkOutIso: existing?.checkOutIso || null,
        workingHours: existing?.workingHours || 0,
        meetsSixPmCheckout: existing?.meetsSixPmCheckout || false,
        meetsTenHours: existing?.meetsTenHours || false,
        notes: existing?.notes || '',
        updatedAt: existing?.updatedAt || null,
      };
    });

    const summary = {
      total: sheet.length,
      present: sheet.filter((s) => s.status === 'Present').length,
      lateEntry: sheet.filter((s) => s.status === 'Late Entry').length,
      absent: sheet.filter((s) => s.status === 'Absent').length,
      notMarked: sheet.filter((s) => s.status === 'Not Marked').length,
      isWorkingDay: isWorkingDay(date),
    };

    res.status(200).json({
      success: true,
      date,
      summary,
      departments: allDepartments.sort(),
      data: sheet,
    });
  } catch (error) {
    next(error);
  }
}

export async function biometricCheckIn(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    let empIdToUse: string | null = null;
    if (req.user.role === 'admin' && req.body.employeeId) {
      empIdToUse = String(req.body.employeeId);
    } else if (req.user.employee) {
      empIdToUse = String((req.user.employee as any)._id || req.user.employee);
    }

    if (!empIdToUse) {
      return next(new AppError('No employee profile linked to perform biometric check-in.', 400));
    }

    const emp = mongoose.Types.ObjectId.isValid(empIdToUse)
      ? await Employee.findById(empIdToUse)
      : await Employee.findOne({ employeeId: empIdToUse.toUpperCase() });

    if (!emp) {
      return next(new AppError('Employee record not found.', 404));
    }

    const now = new Date();
    const rawDate = req.body.date ? String(req.body.date) : toDateString(now);
    const date = normalizeDateString(rawDate);
    if (!date) {
      return next(new AppError('Valid date (YYYY-MM-DD) is required.', 400));
    }

    const localHH = String(now.getHours()).padStart(2, '0');
    const localMM = String(now.getMinutes()).padStart(2, '0');
    const checkInTime = req.body.time ? String(req.body.time).trim() : `${localHH}:${localMM}`;
    if (!isValidTimeString(checkInTime)) {
      return next(new AppError('Time must be in HH:mm 24-hour format.', 400));
    }

    const existing = await Attendance.findOne({ employee: emp._id, date });
    if (existing) {
      return next(
        new AppError(
          `Biometric attendance already recorded for ${date} (${existing.status}).`,
          409
        )
      );
    }

    const status = evaluateCheckInStatus(checkInTime);
    const checkInIso =
      status === 'Absent'
        ? null
        : req.body.clientIso && !req.body.isCustomTime
          ? String(req.body.clientIso)
          : buildIsoForDateAndTime(date, checkInTime);

    const notes =
      status === 'Absent'
        ? `Missed 10:00 AM biometric cutoff (attempted at ${checkInTime})`
        : status === 'Late Entry'
          ? `Biometric late entry at ${checkInTime} (between 09:30 AM – 10:00 AM)`
          : `Biometric check-in at ${checkInTime}`;

    const created = await Attendance.create({
      employee: emp._id,
      employeeId: emp.employeeId,
      date,
      status,
      checkInTime: status === 'Absent' ? null : checkInTime,
      checkInIso,
      checkOutTime: null,
      checkOutIso: null,
      workingHours: 0,
      meetsSixPmCheckout: false,
      meetsTenHours: false,
      markedBy: req.user._id,
      notes,
    });

    res.status(201).json({
      success: true,
      message:
        status === 'Absent'
          ? `Marked Absent: Biometric check-in attempted at ${checkInTime} (after 10:00 AM cutoff).`
          : status === 'Late Entry'
            ? `Biometric Late Entry recorded at ${checkInTime}. Working hours calculation started.`
            : `Biometric check-in recorded at ${checkInTime}. Working hours calculation started.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

export async function biometricCheckOut(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    let empIdToUse: string | null = null;
    if (req.user.role === 'admin' && req.body.employeeId) {
      empIdToUse = String(req.body.employeeId);
    } else if (req.user.employee) {
      empIdToUse = String((req.user.employee as any)._id || req.user.employee);
    }

    if (!empIdToUse) {
      return next(new AppError('No employee profile linked to perform biometric check-out.', 400));
    }

    const emp = mongoose.Types.ObjectId.isValid(empIdToUse)
      ? await Employee.findById(empIdToUse)
      : await Employee.findOne({ employeeId: empIdToUse.toUpperCase() });

    if (!emp) {
      return next(new AppError('Employee record not found.', 404));
    }

    const now = new Date();
    const rawDate = req.body.date ? String(req.body.date) : toDateString(now);
    const date = normalizeDateString(rawDate);
    if (!date) {
      return next(new AppError('Valid date (YYYY-MM-DD) is required.', 400));
    }

    const record = await Attendance.findOne({ employee: emp._id, date });
    if (!record) {
      return next(new AppError('No biometric check-in found for this date.', 404));
    }
    if (record.status === 'Absent') {
      return next(new AppError('Cannot check out because status is Absent for this date.', 400));
    }
    if (record.checkOutTime) {
      return next(new AppError(`Already checked out at ${record.checkOutTime}.`, 409));
    }

    const localHH = String(now.getHours()).padStart(2, '0');
    const localMM = String(now.getMinutes()).padStart(2, '0');
    const checkOutTime = req.body.time ? String(req.body.time).trim() : `${localHH}:${localMM}`;
    if (!isValidTimeString(checkOutTime)) {
      return next(new AppError('Check-out time must be in HH:mm 24-hour format.', 400));
    }

    const checkOutIso =
      req.body.clientIso && !req.body.isCustomTime
        ? String(req.body.clientIso)
        : buildIsoForDateAndTime(date, checkOutTime);

    const workingHours = calculateWorkingHours(
      record.checkInTime,
      checkOutTime,
      record.checkInIso,
      checkOutIso
    );

    if (workingHours <= 0 && record.checkInTime && checkOutTime <= record.checkInTime) {
      return next(new AppError('Check-out time must be after check-in time.', 400));
    }

    const compliance = evaluateCheckoutCompliance(checkOutTime, workingHours);

    record.checkOutTime = checkOutTime;
    record.checkOutIso = checkOutIso;
    record.workingHours = workingHours;
    record.meetsSixPmCheckout = compliance.meetsSixPmCheckout;
    record.meetsTenHours = compliance.meetsTenHours;
    record.notes = compliance.isCompliant
      ? `Biometric shift completed (${workingHours.toFixed(2)}h, out at ${checkOutTime})`
      : `${compliance.complianceMessage} (${workingHours.toFixed(2)}h)`;

    await record.save();

    res.status(200).json({
      success: true,
      message: `Biometric check-out recorded at ${checkOutTime} · Total worked: ${workingHours.toFixed(2)}h. ${compliance.complianceMessage}.`,
      data: record,
      compliance,
    });
  } catch (error) {
    next(error);
  }
}

export async function markCutoffAbsent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const rawDate = req.body.date ? String(req.body.date) : toDateString();
    const date = normalizeDateString(rawDate);
    if (!date) {
      return next(new AppError('Date must be in YYYY-MM-DD format.', 400));
    }

    const [activeEmployees, existingRecords] = await Promise.all([
      Employee.find({ employmentStatus: { $ne: 'Inactive' } }).lean(),
      Attendance.find({ date }, { employee: 1 }).lean(),
    ]);

    const markedSet = new Set(existingRecords.map((r) => String(r.employee)));
    const unmarkedEmployees = activeEmployees.filter(
      (e) => !markedSet.has(String(e._id))
    );

    if (unmarkedEmployees.length === 0) {
      res.status(200).json({
        success: true,
        count: 0,
        message: `All active employees already have attendance recorded for ${date}.`,
      });
      return;
    }

    const docs = unmarkedEmployees.map((emp) => ({
      employee: emp._id,
      employeeId: emp.employeeId,
      date,
      status: 'Absent' as const,
      checkInTime: null,
      checkInIso: null,
      checkOutTime: null,
      checkOutIso: null,
      workingHours: 0,
      meetsSixPmCheckout: false,
      meetsTenHours: false,
      markedBy: req.user!._id,
      notes: 'Auto-marked Absent: did not enter by 10:00 AM',
    }));

    await Attendance.insertMany(docs);

    res.status(200).json({
      success: true,
      count: docs.length,
      message: `Marked ${docs.length} unmarked employee(s) as Absent for ${date} (10:00 AM cutoff).`,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (Array.isArray(req.body.records)) {
      const rawDate = req.body.date ? String(req.body.date) : toDateString();
      const date = normalizeDateString(rawDate);
      if (!date) {
        return next(new AppError('Date must be in YYYY-MM-DD format.', 400));
      }

      const records = req.body.records as Array<{
        employeeId: string;
        status: AttendanceStatus;
        checkInTime?: string | null;
        checkOutTime?: string | null;
        notes?: string;
      }>;

      if (records.length === 0) {
        return next(new AppError('No attendance entries were provided.', 400));
      }

      const validResults = [];
      for (const item of records) {
        if (
          !item.employeeId ||
          !['Present', 'Late Entry', 'Absent'].includes(item.status)
        ) {
          return next(
            new AppError(
              'Each attendance record must include a valid employeeId and status (Present, Late Entry, or Absent).',
              400
            )
          );
        }

        const emp = mongoose.Types.ObjectId.isValid(item.employeeId)
          ? await Employee.findById(item.employeeId)
          : await Employee.findOne({ employeeId: String(item.employeeId).toUpperCase() });

        if (!emp) {
          return next(
            new AppError(`Employee not found for reference: ${item.employeeId}`, 404)
          );
        }

        let resolvedStatus: AttendanceStatus = item.status;
        const cleanIn = item.checkInTime?.trim() || null;
        const cleanOut = item.checkOutTime?.trim() || null;

        if (cleanIn && !isValidTimeString(cleanIn)) {
          return next(new AppError(`Invalid check-in time (${cleanIn}). Use HH:mm.`, 400));
        }
        if (cleanOut && !isValidTimeString(cleanOut)) {
          return next(new AppError(`Invalid check-out time (${cleanOut}). Use HH:mm.`, 400));
        }

        if (cleanIn && resolvedStatus !== 'Absent') {
          resolvedStatus = evaluateCheckInStatus(cleanIn);
        }

        const checkInTime = resolvedStatus === 'Absent' ? null : cleanIn;
        const checkOutTime = resolvedStatus === 'Absent' ? null : cleanOut;
        const checkInIso = checkInTime ? buildIsoForDateAndTime(date, checkInTime) : null;
        const checkOutIso = checkOutTime ? buildIsoForDateAndTime(date, checkOutTime) : null;

        const workingHours =
          checkInTime && checkOutTime
            ? calculateWorkingHours(checkInTime, checkOutTime, checkInIso, checkOutIso)
            : 0;
        const compliance = evaluateCheckoutCompliance(checkOutTime, workingHours);

        const updated = await Attendance.findOneAndUpdate(
          { employee: emp._id, date },
          {
            $set: {
              employee: emp._id,
              employeeId: emp.employeeId,
              date,
              status: resolvedStatus,
              checkInTime,
              checkInIso,
              checkOutTime,
              checkOutIso,
              workingHours,
              meetsSixPmCheckout: compliance.meetsSixPmCheckout,
              meetsTenHours: compliance.meetsTenHours,
              markedBy: req.user._id,
              notes: item.notes ? String(item.notes).trim() : '',
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
        validResults.push(updated);
      }

      res.status(200).json({
        success: true,
        message: `Attendance saved for ${validResults.length} employee(s) on ${date}.`,
        count: validResults.length,
        data: validResults,
      });
      return;
    }

    // Single attendance creation (strict duplicate prevention)
    const {
      employeeId,
      employee,
      date: rawDate,
      status,
      checkInTime: rawIn,
      checkOutTime: rawOut,
      notes,
    } = req.body;
    const empLookup = employee || employeeId;
    if (!empLookup || !rawDate || !status) {
      return next(
        new AppError('employeeId, date, and status are required.', 400)
      );
    }

    if (!['Present', 'Late Entry', 'Absent'].includes(status)) {
      return next(new AppError('Status must be Present, Late Entry, or Absent.', 400));
    }

    const date = normalizeDateString(String(rawDate));
    if (!date) {
      return next(new AppError('Date must be in YYYY-MM-DD format.', 400));
    }

    const emp = mongoose.Types.ObjectId.isValid(String(empLookup))
      ? await Employee.findById(empLookup)
      : await Employee.findOne({ employeeId: String(empLookup).toUpperCase() });

    if (!emp) {
      return next(new AppError('Employee not found.', 404));
    }

    const duplicate = await Attendance.findOne({ employee: emp._id, date });
    if (duplicate) {
      return next(
        new AppError(
          `Attendance is already marked as ${duplicate.status} for ${emp.firstName} ${emp.lastName} on ${date}. Use PUT to update.`,
          409
        )
      );
    }

    const cleanIn = rawIn ? String(rawIn).trim() : null;
    const cleanOut = rawOut ? String(rawOut).trim() : null;
    const resolvedStatus: AttendanceStatus =
      cleanIn && status !== 'Absent' ? evaluateCheckInStatus(cleanIn) : status;
    const checkInTime = resolvedStatus === 'Absent' ? null : cleanIn;
    const checkOutTime = resolvedStatus === 'Absent' ? null : cleanOut;
    const checkInIso = checkInTime ? buildIsoForDateAndTime(date, checkInTime) : null;
    const checkOutIso = checkOutTime ? buildIsoForDateAndTime(date, checkOutTime) : null;
    const workingHours =
      checkInTime && checkOutTime
        ? calculateWorkingHours(checkInTime, checkOutTime, checkInIso, checkOutIso)
        : 0;
    const compliance = evaluateCheckoutCompliance(checkOutTime, workingHours);

    const created = await Attendance.create({
      employee: emp._id,
      employeeId: emp.employeeId,
      date,
      status: resolvedStatus,
      checkInTime,
      checkInIso,
      checkOutTime,
      checkOutIso,
      workingHours,
      meetsSixPmCheckout: compliance.meetsSixPmCheckout,
      meetsTenHours: compliance.meetsTenHours,
      markedBy: req.user._id,
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const { status, checkInTime, checkOutTime, notes } = req.body;
    if (status && !['Present', 'Late Entry', 'Absent'].includes(status)) {
      return next(new AppError('Status must be Present, Late Entry, or Absent.', 400));
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return next(new AppError('Attendance record not found.', 404));
    }

    if (checkInTime !== undefined) {
      const cleanIn = checkInTime ? String(checkInTime).trim() : null;
      if (cleanIn && !isValidTimeString(cleanIn)) {
        return next(new AppError('Check-in time must be in HH:mm format.', 400));
      }
      record.checkInTime = cleanIn;
      record.checkInIso = cleanIn ? buildIsoForDateAndTime(record.date, cleanIn) : null;
    }

    if (checkOutTime !== undefined) {
      const cleanOut = checkOutTime ? String(checkOutTime).trim() : null;
      if (cleanOut && !isValidTimeString(cleanOut)) {
        return next(new AppError('Check-out time must be in HH:mm format.', 400));
      }
      record.checkOutTime = cleanOut;
      record.checkOutIso = cleanOut ? buildIsoForDateAndTime(record.date, cleanOut) : null;
    }

    if (status === 'Absent') {
      record.status = 'Absent';
      record.checkInTime = null;
      record.checkInIso = null;
      record.checkOutTime = null;
      record.checkOutIso = null;
      record.workingHours = 0;
      record.meetsSixPmCheckout = false;
      record.meetsTenHours = false;
    } else {
      if (record.checkInTime) {
        record.status = evaluateCheckInStatus(record.checkInTime);
      } else if (status) {
        record.status = status;
      }

      if (record.checkInTime && record.checkOutTime) {
        record.workingHours = calculateWorkingHours(
          record.checkInTime,
          record.checkOutTime,
          record.checkInIso,
          record.checkOutIso
        );
        const compliance = evaluateCheckoutCompliance(
          record.checkOutTime,
          record.workingHours
        );
        record.meetsSixPmCheckout = compliance.meetsSixPmCheckout;
        record.meetsTenHours = compliance.meetsTenHours;
      }
    }

    if (notes !== undefined) record.notes = String(notes).trim();
    record.markedBy = req.user._id as mongoose.Types.ObjectId;

    await record.save();

    const populated = await Attendance.findById(record._id)
      .populate('employee', 'employeeId firstName lastName department designation email')
      .populate('markedBy', 'name email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeAttendance(
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
        new AppError('You are only authorized to access your own attendance history.', 403)
      );
    }

    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';
    const status = String(req.query.status || '').trim();

    const query: Record<string, unknown> = { employee: emp._id };
    if (status && status !== 'All') query.status = status;
    if (startDate || endDate) {
      const dateQuery: Record<string, string> = {};
      if (startDate) dateQuery.$gte = startDate;
      if (endDate) dateQuery.$lte = endDate;
      query.date = dateQuery;
    }

    const records = await Attendance.find(query).sort({ date: -1 }).lean();

    res.status(200).json({
      success: true,
      employee: emp,
      data: records,
    });
  } catch (error) {
    next(error);
  }
}
