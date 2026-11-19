import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  X,
  Save,
  Search,
  RotateCcw,
  Fingerprint,
  ClockAlert,
} from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import {
  AttendanceStatus,
  DailyAttendanceRow,
  DailyAttendanceStatus,
} from '../types/index.ts';
import { formatReadableDate, getTodayInputDate } from '../utils/formatters.ts';
import { TableSkeleton } from '../components/LoadingSkeleton.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';

interface DraftEdit {
  status: AttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
}

function evaluateLocalTimeStatus(checkIn: string): AttendanceStatus {
  if (!/^\d{2}:\d{2}$/.test(checkIn)) return 'Present';
  const [hh, mm] = checkIn.split(':').map(Number);
  const mins = hh * 60 + mm;
  if (mins <= 9 * 60 + 30) return 'Present';
  if (mins <= 10 * 60) return 'Late Entry';
  return 'Absent';
}

function computeLocalHours(checkIn: string, checkOut: string): number {
  if (!/^\d{2}:\d{2}$/.test(checkIn) || !/^\d{2}:\d{2}$/.test(checkOut)) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const diff = outH * 60 + outM - (inH * 60 + inM);
  if (diff <= 0) return 0;
  return Number((diff / 60).toFixed(2));
}

export default function AttendancePage() {
  const [date, setDate] = useState(getTodayInputDate());
  const [department, setDepartment] = useState('All');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<DailyAttendanceRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isWorkingDay, setIsWorkingDay] = useState(true);

  const [drafts, setDrafts] = useState<Record<string, DraftEdit>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cutoffConfirmOpen, setCutoffConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadDailySheet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        success: boolean;
        date: string;
        summary: {
          total: number;
          present: number;
          lateEntry: number;
          absent: number;
          notMarked: number;
          isWorkingDay: boolean;
        };
        departments: string[];
        data: DailyAttendanceRow[];
      }>('/attendance/daily', {
        params: {
          date,
          department: department !== 'All' ? department : undefined,
          search: search.trim() || undefined,
        },
      });
      setRows(res.data.data);
      setDepartments(res.data.departments);
      setIsWorkingDay(res.data.summary.isWorkingDay);
      setDrafts({});
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load daily attendance sheet.'));
    } finally {
      setLoading(false);
    }
  }, [date, department, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDailySheet();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadDailySheet]);

  const effectiveRows = useMemo(() => {
    return rows.map((row) => {
      const draft = drafts[row.employee._id];
      const currentStatus: DailyAttendanceStatus = draft ? draft.status : row.status;
      const currentIn = draft ? draft.checkInTime : row.checkInTime || '';
      const currentOut = draft ? draft.checkOutTime : row.checkOutTime || '';
      const currentNotes = draft ? draft.notes : row.notes;
      const computedHours =
        currentStatus !== 'Absent' && currentIn && currentOut
          ? computeLocalHours(currentIn, currentOut)
          : row.workingHours || 0;

      return {
        ...row,
        currentStatus,
        currentIn,
        currentOut,
        currentNotes,
        computedHours,
        isModified: Boolean(draft),
      };
    });
  }, [rows, drafts]);

  const counts = useMemo(() => {
    const present = effectiveRows.filter((r) => r.currentStatus === 'Present').length;
    const lateEntry = effectiveRows.filter((r) => r.currentStatus === 'Late Entry').length;
    const absent = effectiveRows.filter((r) => r.currentStatus === 'Absent').length;
    const notMarked = effectiveRows.filter((r) => r.currentStatus === 'Not Marked').length;
    return {
      total: effectiveRows.length,
      present,
      lateEntry,
      absent,
      notMarked,
      pendingChanges: Object.keys(drafts).length,
    };
  }, [effectiveRows, drafts]);

  const updateRowDraft = (
    row: DailyAttendanceRow,
    patch: Partial<DraftEdit>
  ) => {
    setFeedback('');
    setDrafts((prev) => {
      const existing = prev[row.employee._id] || {
        status: (row.status === 'Not Marked' ? 'Present' : row.status) as AttendanceStatus,
        checkInTime: row.checkInTime || '',
        checkOutTime: row.checkOutTime || '',
        notes: row.notes || '',
      };
      const merged = { ...existing, ...patch };
      if (patch.checkInTime !== undefined && patch.checkInTime && merged.status !== 'Absent') {
        merged.status = evaluateLocalTimeStatus(patch.checkInTime);
      }
      if (merged.status === 'Absent') {
        merged.checkInTime = '';
        merged.checkOutTime = '';
      }
      return {
        ...prev,
        [row.employee._id]: merged,
      };
    });
  };

  const handleBiometricPunchRow = async (empId: string) => {
    setError('');
    setFeedback('');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance/biometric/check-in',
        {
          employeeId: empId,
          date,
          time: timeStr,
          clientIso: now.toISOString(),
        }
      );
      setFeedback(res.data.message);
      await loadDailySheet();
    } catch (err) {
      setError(getErrorMessage(err, 'Biometric attendance punch failed.'));
    }
  };

  const handleBiometricPunchOutRow = async (empId: string) => {
    setError('');
    setFeedback('');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance/biometric/check-out',
        {
          employeeId: empId,
          date,
          time: timeStr,
          clientIso: now.toISOString(),
        }
      );
      setFeedback(res.data.message);
      await loadDailySheet();
    } catch (err) {
      setError(getErrorMessage(err, 'Biometric check-out failed.'));
    }
  };

  const handleCutoffAbsent = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance/cutoff-absent',
        { date }
      );
      setCutoffConfirmOpen(false);
      setFeedback(res.data.message);
      await loadDailySheet();
    } catch (err) {
      setCutoffConfirmOpen(false);
      setError(getErrorMessage(err, 'Failed to apply 10:00 AM absent cutoff.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfirmed = async () => {
    const recordsToSave = Object.entries(drafts).map(([empId, edit]) => ({
      employeeId: empId,
      status: edit.status,
      checkInTime: edit.checkInTime || null,
      checkOutTime: edit.checkOutTime || null,
      notes: edit.notes,
    }));

    if (recordsToSave.length === 0) {
      setConfirmOpen(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance',
        {
          date,
          records: recordsToSave,
        }
      );
      setConfirmOpen(false);
      setFeedback(res.data.message);
      await loadDailySheet();
    } catch (err) {
      setConfirmOpen(false);
      setError(getErrorMessage(err, 'Failed to save attendance records.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Daily Attendance Management
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 tabular-nums">
            {formatReadableDate(date)} ·{' '}
            {isWorkingDay
              ? 'On Time ≤ 09:30 · Late Entry 09:31–10:00 · Absent > 10:00 · Out ≥ 18:00 & 10h min'
              : 'Non-Working Day (Weekend or Holiday)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {counts.notMarked > 0 && (
            <button
              type="button"
              onClick={() => setCutoffConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#be123c] bg-white border border-rose-300 hover:bg-rose-50 rounded-md transition-colors whitespace-nowrap"
            >
              <ClockAlert className="w-4 h-4" />
              <span>Enforce 10:00 AM Absent Cutoff</span>
            </button>
          )}
          {counts.pendingChanges > 0 && (
            <button
              type="button"
              onClick={() => setDrafts({})}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-md transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Changes</span>
            </button>
          )}
          <button
            type="button"
            disabled={counts.pendingChanges === 0 || saving}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap disabled:opacity-45"
          >
            <Save className="w-4 h-4" />
            <span>
              Save Attendance{counts.pendingChanges > 0 ? ` (${counts.pendingChanges})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Unified Summary Bar */}
      <div className="bg-white border border-zinc-200 rounded-md grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500">Listed Staff</div>
          <div className="text-xl font-bold font-display tabular-nums text-zinc-900 mt-0.5">
            {counts.total}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500">Present (≤ 09:30)</div>
          <div className="text-xl font-bold font-display tabular-nums text-[#0f5257] mt-0.5">
            {counts.present}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500">Late Entry (09:30–10:00)</div>
          <div className="text-xl font-bold font-display tabular-nums text-amber-700 mt-0.5">
            {counts.lateEntry}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500">Absent</div>
          <div className="text-xl font-bold font-display tabular-nums text-[#be123c] mt-0.5">
            {counts.absent}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500">Not Marked</div>
          <div className="text-xl font-bold font-display tabular-nums text-zinc-500 mt-0.5">
            {counts.notMarked}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-xs font-medium text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-md p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3 relative">
          <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={date}
            max={getTodayInputDate()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Attendance date"
            className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          />
        </div>

        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label="Filter by department"
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            <option value="All">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Check-In</th>
                  <th className="px-4 py-2.5">Check-Out</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {effectiveRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                      No active employees found matching your filters.
                    </td>
                  </tr>
                ) : (
                  effectiveRows.map((row) => {
                    const statusColor =
                      row.currentStatus === 'Present'
                        ? 'text-[#0f5257]'
                        : row.currentStatus === 'Late Entry'
                          ? 'text-amber-700'
                          : row.currentStatus === 'Absent'
                            ? 'text-[#be123c]'
                            : 'text-zinc-500';

                    const canBiometricIn = row.status === 'Not Marked';
                    const canBiometricOut =
                      (row.status === 'Present' || row.status === 'Late Entry') &&
                      !row.checkOutTime;

                    return (
                      <tr
                        key={row.employee._id}
                        className={row.isModified ? 'bg-teal-50/40' : 'hover:bg-zinc-50/75'}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-zinc-900">
                            {row.employee.firstName} {row.employee.lastName}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {row.employee.employeeId} · {row.employee.department}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${statusColor}`}>
                            {row.currentStatus}
                          </span>
                          {row.isModified && (
                            <span className="text-xs text-zinc-400 ml-1">· Unsaved</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="time"
                            value={row.currentIn}
                            disabled={row.currentStatus === 'Absent'}
                            onChange={(e) =>
                              updateRowDraft(row, {
                                checkInTime: e.target.value,
                                status: evaluateLocalTimeStatus(e.target.value),
                              })
                            }
                            aria-label={`Check-in time for ${row.employee.firstName}`}
                            className="px-2 py-1 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0f5257] disabled:bg-zinc-50 disabled:text-zinc-400"
                          />
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="time"
                            value={row.currentOut}
                            disabled={row.currentStatus === 'Absent' || row.currentStatus === 'Not Marked'}
                            onChange={(e) =>
                              updateRowDraft(row, {
                                checkOutTime: e.target.value,
                              })
                            }
                            aria-label={`Check-out time for ${row.employee.firstName}`}
                            className="px-2 py-1 text-xs font-mono border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0f5257] disabled:bg-zinc-50 disabled:text-zinc-400"
                          />
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                          {row.computedHours > 0 ? (
                            <span
                              className={
                                row.computedHours >= 10 && row.currentOut >= '18:00'
                                  ? 'text-[#0f5257] font-semibold'
                                  : 'text-amber-700 font-medium'
                              }
                            >
                              {row.computedHours.toFixed(2)}h
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canBiometricIn && (
                              <button
                                type="button"
                                onClick={() => handleBiometricPunchRow(row.employee._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border bg-[#0f5257] text-white border-[#0f5257] hover:bg-[#0a3c40] transition-colors"
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>Biometric Attendance</span>
                              </button>
                            )}
                            {canBiometricOut && (
                              <button
                                type="button"
                                onClick={() => handleBiometricPunchOutRow(row.employee._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 transition-colors"
                              >
                                <span>Check Out</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                updateRowDraft(row, {
                                  status: 'Present',
                                  checkInTime: row.currentIn || '09:15',
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                                row.currentStatus === 'Present'
                                  ? 'bg-[#0f5257] text-white border-[#0f5257]'
                                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-[#0f5257]'
                              }`}
                              title="Mark Present (≤ 09:30)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateRowDraft(row, {
                                  status: 'Absent',
                                  checkInTime: '',
                                  checkOutTime: '',
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                                row.currentStatus === 'Absent'
                                  ? 'bg-[#be123c] text-white border-[#be123c]'
                                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-[#be123c]'
                              }`}
                              title="Mark Absent"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Daily Attendance Save"
        description={`Save or update attendance and working hours for ${counts.pendingChanges} employee(s) on ${formatReadableDate(date)}?`}
        confirmLabel="Save Attendance"
        loading={saving}
        onConfirm={handleSaveConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={cutoffConfirmOpen}
        title="Enforce 10:00 AM Absent Cutoff"
        description={`Mark all ${counts.notMarked} unmarked active employee(s) on ${formatReadableDate(date)} as Absent for missing the 10:00 AM entry cutoff?`}
        confirmLabel="Mark Absent"
        variant="danger"
        loading={saving}
        onConfirm={handleCutoffAbsent}
        onCancel={() => setCutoffConfirmOpen(false)}
      />
    </div>
  );
}
