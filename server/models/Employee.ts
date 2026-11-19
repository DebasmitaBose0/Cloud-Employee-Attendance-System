import mongoose, { Document, Model, Schema } from 'mongoose';

export type EmploymentStatus = 'Active' | 'On Leave' | 'Inactive';

export interface IEmployee extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [60, 'First name cannot exceed 60 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [60, 'Last name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [25, 'Phone number cannot exceed 25 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    joiningDate: {
      type: String,
      required: [true, 'Joining date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Joining date must be in YYYY-MM-DD format'],
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ department: 1, employmentStatus: 1 });
employeeSchema.index({ firstName: 1, lastName: 1 });

export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', employeeSchema);
