import { env } from '../config/env.ts';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a Date object as YYYY-MM-DD in local/specified calendar terms.
 */
export function toDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates and normalizes a YYYY-MM-DD string.
 */
export function normalizeDateString(input: string): string | null {
  const trimmed = input.trim();
  if (!DATE_REGEX.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() + 1 !== m ||
    parsed.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Determines whether a YYYY-MM-DD date is a configured working day
 * (i.e. not a configured weekend day and not a configured public holiday).
 */
export function isWorkingDay(
  dateStr: string,
  holidays: string[] = env.publicHolidays,
  weekendDays: number[] = env.weekendDays
): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (weekendDays.includes(dayOfWeek)) {
    return false;
  }
  if (holidays.includes(dateStr)) {
    return false;
  }
  return true;
}

/**
 * Returns all YYYY-MM-DD strings in a given year and 1-indexed month (1-12).
 */
export function getDatesInMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  }
  return dates;
}

/**
 * Counts working days in a month (optionally capped at maxDateStr such as today).
 */
export function getWorkingDaysInMonth(
  year: number,
  month: number,
  maxDateStr?: string
): string[] {
  return getDatesInMonth(year, month).filter((dateStr) => {
    if (maxDateStr && dateStr > maxDateStr) return false;
    return isWorkingDay(dateStr);
  });
}

/**
 * Returns the last N working day YYYY-MM-DD strings ending at endDateStr (inclusive).
 */
export function getRecentWorkingDays(count: number, endDateStr: string = toDateString()): string[] {
  const [y, m, d] = endDateStr.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const result: string[] = [];
  let guard = 0;

  while (result.length < count && guard < 60) {
    const str = cursor.toISOString().slice(0, 10);
    if (isWorkingDay(str)) {
      result.unshift(str);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    guard += 1;
  }

  return result;
}
