export type UserRole = 'admin' | 'employee';

export type EmploymentStatus = 'Active' | 'On Leave' | 'Inactive';
export type AttendanceStatus = 'Present' | 'Late Entry' | 'Absent';
export type DailyAttendanceStatus = AttendanceStatus | 'Not Marked';

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employee: Employee | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  _id: string;
  employee: Employee | string;
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
  markedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendanceRow {
  employee: Employee;
  attendanceId: string | null;
  date: string;
  status: DailyAttendanceStatus;
  checkInTime: string | null;
  checkInIso: string | null;
  checkOutTime: string | null;
  checkOutIso: string | null;
  workingHours: number;
  meetsSixPmCheckout: boolean;
  meetsTenHours: boolean;
  notes: string;
  updatedAt: string | null;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminDashboardData {
  date: string;
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    presentToday: number;
    onTimeToday: number;
    lateToday: number;
    absentToday: number;
    notMarkedToday: number;
    recordedToday: number;
    attendancePercentage: number | null;
  };
  weeklyChart: Array<{
    date: string;
    label: string;
    present: number;
    absent: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    shortMonth: string;
    present: number;
    absent: number;
    percentage: number;
  }>;
  departmentDistribution: Array<{
    department: string;
    count: number;
  }>;
  recentActivity: AttendanceRecord[];
  recentAdditions: Employee[];
}

export interface EmployeeReportData {
  employee: Employee;
  today: {
    date: string;
    status: DailyAttendanceStatus;
    checkInTime: string | null;
    checkInIso: string | null;
    checkOutTime: string | null;
    checkOutIso: string | null;
    workingHours: number;
    meetsSixPmCheckout: boolean;
    meetsTenHours: boolean;
    notes: string;
  };
  summary: {
    year: number;
    month: number;
    totalWorkingDays: number;
    elapsedWorkingDays: number;
    recordedWorkingDays: number;
    presentDays: number;
    onTimeDays: number;
    lateEntryDays: number;
    absentDays: number;
    unmarkedDays: number;
    avgWorkingHours: number;
    isIncomplete: boolean;
    attendancePercentage: number | null;
  };
  monthlyRecords: AttendanceRecord[];
  recentHistory: AttendanceRecord[];
  monthlyChart: Array<{
    month: string;
    present: number;
    absent: number;
    percentage: number;
  }>;
}

export interface MonthlyReportEmployeeRow {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  employmentStatus: EmploymentStatus;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
  recordedWorkingDays: number;
  presentDays: number;
  onTimeDays: number;
  lateEntryDays: number;
  absentDays: number;
  unmarkedDays: number;
  avgWorkingHours: number;
  compliantDays: number;
  isIncomplete: boolean;
  attendancePercentage: number | null;
}

export interface MonthlyReportResponse {
  period: {
    year: number;
    month: number;
    monthPrefix: string;
    scheduledWorkingDays: number;
    elapsedWorkingDays: number;
    weekendDays: number[];
    holidaysInMonth: string[];
  };
  totals: {
    employeesCount: number;
    presentDays: number;
    lateEntryDays: number;
    absentDays: number;
    recordedWorkingDays: number;
    incompleteRecordsCount: number;
    overallPercentage: number | null;
  };
  departments: string[];
  departmentSummary: Array<{
    department: string;
    employees: number;
    presentDays: number;
    lateEntryDays: number;
    absentDays: number;
    recordedDays: number;
    attendancePercentage: number | null;
  }>;
  data: MonthlyReportEmployeeRow[];
}
