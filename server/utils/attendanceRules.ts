import { AttendanceStatus } from '../models/Attendance.ts';

export const ON_TIME_CUTOFF_MINUTES = 9 * 60 + 30; // 09:30 AM
export const ABSENT_CUTOFF_MINUTES = 10 * 60; // 10:00 AM
export const CHECKOUT_MIN_MINUTES = 18 * 60; // 06:00 PM (18:00)
export const MIN_WORKING_HOURS = 10;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeString(timeStr: string): boolean {
  return TIME_REGEX.test(timeStr.trim());
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.trim().split(':').map(Number);
  return hh * 60 + mm;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Evaluates entry time:
 * - <= 09:30 -> 'Present'
 * - 09:31 to 10:00 -> 'Late Entry'
 * - > 10:00 -> 'Absent'
 */
export function evaluateCheckInStatus(checkInTime: string): AttendanceStatus {
  const mins = parseTimeToMinutes(checkInTime);
  if (mins <= ON_TIME_CUTOFF_MINUTES) {
    return 'Present';
  }
  if (mins <= ABSENT_CUTOFF_MINUTES) {
    return 'Late Entry';
  }
  return 'Absent';
}

/**
 * Calculates working hours between check-in and check-out.
 * Prefers exact ISO timestamps when available, falling back to HH:mm difference.
 */
export function calculateWorkingHours(
  checkInTime: string | null,
  checkOutTime: string | null,
  checkInIso?: string | null,
  checkOutIso?: string | null
): number {
  if (checkInIso && checkOutIso) {
    const startMs = Date.parse(checkInIso);
    const endMs = Date.parse(checkOutIso);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
      return Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2));
    }
  }

  if (!checkInTime || !checkOutTime) return 0;
  const startMins = parseTimeToMinutes(checkInTime);
  const endMins = parseTimeToMinutes(checkOutTime);
  if (endMins <= startMins) return 0;
  return Number(((endMins - startMins) / 60).toFixed(2));
}

export function evaluateCheckoutCompliance(
  checkOutTime: string | null,
  workingHours: number
): {
  meetsSixPmCheckout: boolean;
  meetsTenHours: boolean;
  isCompliant: boolean;
  complianceMessage: string;
} {
  if (!checkOutTime) {
    return {
      meetsSixPmCheckout: false,
      meetsTenHours: false,
      isCompliant: false,
      complianceMessage: 'Check-out pending (after 6:00 PM and minimum 10h required)',
    };
  }

  const outMins = parseTimeToMinutes(checkOutTime);
  const meetsSixPmCheckout = outMins >= CHECKOUT_MIN_MINUTES;
  const meetsTenHours = workingHours >= MIN_WORKING_HOURS;
  const isCompliant = meetsSixPmCheckout && meetsTenHours;

  let complianceMessage = 'Shift completed (10h+ & after 6:00 PM)';
  if (!meetsSixPmCheckout && !meetsTenHours) {
    complianceMessage = 'Checked out before 6:00 PM and under 10 working hours';
  } else if (!meetsSixPmCheckout) {
    complianceMessage = 'Checked out before 6:00 PM';
  } else if (!meetsTenHours) {
    complianceMessage = 'Worked less than 10 hours minimum';
  }

  return {
    meetsSixPmCheckout,
    meetsTenHours,
    isCompliant,
    complianceMessage,
  };
}
