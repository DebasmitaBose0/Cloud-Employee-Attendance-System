import mongoose, { Document, Model, Schema } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Late Entry' | 'Absent';

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkInIso: string | null;
  checkOutTime: string | null;
  checkOutIso: string | null;
  workingHours: number;
  meetsSixPmCheckout: boolean;
  meetsTenHours: boolean;
  markedBy: mongoose.Types.ObjectId;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      uppercase: true,
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Attendance date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    status: {
      type: String,
      enum: ['Present', 'Late Entry', 'Absent'],
      required: [true, 'Attendance status is required'],
    },
    checkInTime: {
      type: String,
      default: null,
    },
    checkInIso: {
      type: String,
      default: null,
    },
    checkOutTime: {
      type: String,
      default: null,
    },
    checkOutIso: {
      type: String,
      default: null,
    },
    workingHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    meetsSixPmCheckout: {
      type: Boolean,
      default: false,
    },
    meetsTenHours: {
      type: Boolean,
      default: false,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'MarkedBy user reference is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [250, 'Notes cannot exceed 250 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Strictly enforce one attendance record per employee per date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employeeId: 1, date: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema);
