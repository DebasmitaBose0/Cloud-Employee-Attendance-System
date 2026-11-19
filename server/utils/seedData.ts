import { env } from '../config/env.ts';
import { Attendance, AttendanceStatus } from '../models/Attendance.ts';
import { Employee } from '../models/Employee.ts';
import { User } from '../models/User.ts';
import {
  calculateWorkingHours,
  evaluateCheckoutCompliance,
  formatMinutesToHHMM,
} from './attendanceRules.ts';
import { isWorkingDay, toDateString } from './dateUtils.ts';

const SAMPLE_EMPLOYEES = [
  {
    employeeId: 'EMP-1001',
    firstName: 'Maya',
    lastName: 'Patel',
    email: 'maya.patel@attendcloud.local',
    phone: '+1 (415) 890-2101',
    department: 'Engineering',
    designation: 'Senior Cloud Engineer',
    joiningDate: '2024-03-11',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1002',
    firstName: 'Liam',
    lastName: 'OConnor',
    email: 'liam.oconnor@attendcloud.local',
    phone: '+1 (415) 890-2102',
    department: 'Engineering',
    designation: 'Backend Systems Architect',
    joiningDate: '2023-11-06',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1003',
    firstName: 'Sophia',
    lastName: 'Chen',
    email: 'sophia.chen@attendcloud.local',
    phone: '+1 (415) 890-2103',
    department: 'Product & Design',
    designation: 'Lead Product Designer',
    joiningDate: '2024-01-15',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1004',
    firstName: 'Marcus',
    lastName: 'Bennett',
    email: 'marcus.bennett@attendcloud.local',
    phone: '+1 (415) 890-2104',
    department: 'Operations',
    designation: 'Cloud Operations Manager',
    joiningDate: '2023-08-21',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1005',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@attendcloud.local',
    phone: '+1 (415) 890-2105',
    department: 'Engineering',
    designation: 'Full-Stack Developer',
    joiningDate: '2025-02-03',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1006',
    firstName: 'Daniel',
    lastName: 'Kim',
    email: 'daniel.kim@attendcloud.local',
    phone: '+1 (415) 890-2106',
    department: 'Finance',
    designation: 'Financial Analyst',
    joiningDate: '2024-06-10',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1007',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@attendcloud.local',
    phone: '+1 (415) 890-2107',
    department: 'Human Resources',
    designation: 'HR Operations Specialist',
    joiningDate: '2024-04-22',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1008',
    firstName: 'Noah',
    lastName: 'Williams',
    email: 'noah.williams@attendcloud.local',
    phone: '+1 (415) 890-2108',
    department: 'Engineering',
    designation: 'DevOps & Infrastructure Engineer',
    joiningDate: '2024-09-02',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1009',
    firstName: 'Amara',
    lastName: 'Okafor',
    email: 'amara.okafor@attendcloud.local',
    phone: '+1 (415) 890-2109',
    department: 'Product & Design',
    designation: 'Product Manager',
    joiningDate: '2024-07-15',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1010',
    firstName: 'Lucas',
    lastName: 'Moretti',
    email: 'lucas.moretti@attendcloud.local',
    phone: '+1 (415) 890-2110',
    department: 'Operations',
    designation: 'Logistics Coordinator',
    joiningDate: '2025-01-13',
    employmentStatus: 'On Leave' as const,
  },
  {
    employeeId: 'EMP-1011',
    firstName: 'Hannah',
    lastName: 'Alvarez',
    email: 'hannah.alvarez@attendcloud.local',
    phone: '+1 (415) 890-2111',
    department: 'Finance',
    designation: 'Payroll & Compliance Lead',
    joiningDate: '2023-10-09',
    employmentStatus: 'Active' as const,
  },
  {
    employeeId: 'EMP-1012',
    firstName: 'Ethan',
    lastName: 'Brooks',
    email: 'ethan.brooks@attendcloud.local',
    phone: '+1 (415) 890-2112',
    department: 'Human Resources',
    designation: 'Talent Acquisition Partner',
    joiningDate: '2025-04-07',
    employmentStatus: 'Active' as const,
  },
];

export async function seedDatabase(forceReset = false): Promise<void> {
  if (forceReset) {
    await Promise.all([
      Attendance.deleteMany({}),
      User.deleteMany({}),
      Employee.deleteMany({}),
    ]);
  }

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !forceReset) {
    return;
  }

  const adminUser = await User.create({
    name: env.adminName,
    email: env.adminEmail,
    password: env.adminPassword,
    role: 'admin',
    employee: null,
    isActive: true,
    mustChangePassword: true,
  });

  const createdEmployees = [];
  for (const empData of SAMPLE_EMPLOYEES) {
    const emp = await Employee.create(empData);
    createdEmployees.push(emp);

    await User.create({
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      password: env.defaultEmployeePassword,
      role: 'employee',
      employee: emp._id,
      isActive: true,
      mustChangePassword: false,
    });
  }

  const today = new Date();
  const todayStr = toDateString(today);
  const attendanceDocs: Array<{
    employee: unknown;
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
    markedBy: unknown;
    notes: string;
  }> = [];

  for (let daysAgo = 60; daysAgo >= 0; daysAgo -= 1) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - daysAgo);
    const dateStr = toDateString(dt);

    if (!isWorkingDay(dateStr)) continue;

    createdEmployees.forEach((emp, empIndex) => {
      // Leave Maya Patel (EMP-1001) and Ethan Brooks (EMP-1012) unmarked today
      // so users can test Biometric Attendance check-in live
      if (dateStr === todayStr && (empIndex === 0 || empIndex === createdEmployees.length - 1)) {
        return;
      }

      const hash = (daysAgo * 31 + empIndex * 17) % 100;
      let status: AttendanceStatus = 'Present';
      let checkInTime: string | null = null;
      let checkOutTime: string | null = null;
      let notes = '';

      if (emp.employmentStatus === 'On Leave' && daysAgo <= 5) {
        status = 'Absent';
        notes = 'Approved scheduled leave';
      } else if (hash < 8) {
        status = 'Absent';
        notes = hash < 4 ? 'Not entered by 10:00 AM cutoff' : 'Personal leave';
      } else if (hash < 20) {
        status = 'Late Entry';
        const inMins = 9 * 60 + 32 + (hash % 25); // 09:32 - 09:56
        checkInTime = formatMinutesToHHMM(inMins);
        if (dateStr !== todayStr) {
          const outMins = inMins + 10 * 60 + 10; // ~19:42 - 20:06 (>= 10h & >= 18:00)
          checkOutTime = formatMinutesToHHMM(outMins);
        }
        notes = `Biometric late entry at ${checkInTime}`;
      } else {
        status = 'Present';
        const inMins = 9 * 60 + (hash % 28); // 09:00 - 09:27
        checkInTime = formatMinutesToHHMM(inMins);
        if (dateStr !== todayStr) {
          const outMins =
            hash % 15 === 0
              ? 18 * 60 + 25 // Occasional <10h shift
              : Math.max(18 * 60 + 30, inMins + 10 * 60 + 15); // >=10h & >=18:00
          checkOutTime = formatMinutesToHHMM(outMins);
        }
        notes = `Biometric check-in at ${checkInTime}`;
      }

      const checkInIso = checkInTime ? `${dateStr}T${checkInTime}:00.000Z` : null;
      const checkOutIso = checkOutTime ? `${dateStr}T${checkOutTime}:00.000Z` : null;
      const workingHours =
        checkInTime && checkOutTime
          ? calculateWorkingHours(checkInTime, checkOutTime, checkInIso, checkOutIso)
          : 0;
      const compliance = evaluateCheckoutCompliance(checkOutTime, workingHours);

      attendanceDocs.push({
        employee: emp._id,
        employeeId: emp.employeeId,
        date: dateStr,
        status,
        checkInTime,
        checkInIso,
        checkOutTime,
        checkOutIso,
        workingHours,
        meetsSixPmCheckout: compliance.meetsSixPmCheckout,
        meetsTenHours: compliance.meetsTenHours,
        markedBy: adminUser._id,
        notes,
      });
    });
  }

  if (attendanceDocs.length > 0) {
    await Attendance.insertMany(attendanceDocs);
  }

  console.log(
    `[Seed] Initialized 1 admin (${adminUser.email}), ${createdEmployees.length} employees, and ${attendanceDocs.length} biometric attendance records.`
  );
}
