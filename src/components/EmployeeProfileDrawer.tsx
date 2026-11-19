import { useEffect, useState } from 'react';
import { Mail, Phone, Calendar, Building2, Briefcase, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import { AttendanceRecord, Employee } from '../types/index.ts';
import { formatReadableDate } from '../utils/formatters.ts';

interface EmployeeDetail extends Employee {
  attendanceSummary: {
    presentDays: number;
    absentDays: number;
    recordedDays: number;
    attendancePercentage: number | null;
  };
  recentAttendance: AttendanceRecord[];
}

interface EmployeeProfileDrawerProps {
  employeeId: string | null;
  onClose: () => void;
}

export default function EmployeeProfileDrawer({
  employeeId,
  onClose,
}: EmployeeProfileDrawerProps) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employeeId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError('');
    api
      .get<{ success: boolean; data: EmployeeDetail }>(`/employees/${employeeId}`)
      .then((res) => setDetail(res.data.data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load profile.')))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/40">
      <div className="w-full max-w-lg bg-white h-full border-l border-zinc-200 shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold font-display text-zinc-900">
            Employee Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded"
            aria-label="Close profile drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-zinc-100 rounded" />
              <div className="h-32 bg-zinc-100 rounded" />
              <div className="h-48 bg-zinc-100 rounded" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && detail && (
            <>
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-md bg-zinc-900 text-white flex items-center justify-center font-display font-semibold text-base shrink-0">
                    {detail.firstName[0]}
                    {detail.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold font-display text-zinc-900">
                      {detail.firstName} {detail.lastName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span className="font-mono text-zinc-800">{detail.employeeId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{detail.designation}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    detail.employmentStatus === 'Active'
                      ? 'text-[#0f5257]'
                      : detail.employmentStatus === 'On Leave'
                        ? 'text-amber-700'
                        : 'text-zinc-500'
                  }`}
                >
                  {detail.employmentStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2.5 text-zinc-700">
                  <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate">{detail.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="tabular-nums">{detail.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700">
                  <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{detail.department}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700">
                  <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{detail.designation}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 sm:col-span-2">
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Joined {formatReadableDate(detail.joiningDate)}</span>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-5">
                <h4 className="text-xs font-semibold text-zinc-500 mb-3">
                  Cumulative Attendance Overview
                </h4>
                <div className="grid grid-cols-3 border border-zinc-200 rounded-md divide-x divide-zinc-200">
                  <div className="p-3">
                    <div className="text-xs text-zinc-500">Present Days</div>
                    <div className="text-lg font-bold font-display tabular-nums text-[#0f5257] mt-0.5">
                      {detail.attendanceSummary.presentDays}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-zinc-500">Absent Days</div>
                    <div className="text-lg font-bold font-display tabular-nums text-[#be123c] mt-0.5">
                      {detail.attendanceSummary.absentDays}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-zinc-500">Rate</div>
                    <div className="text-lg font-bold font-display tabular-nums text-zinc-900 mt-0.5">
                      {detail.attendanceSummary.attendancePercentage !== null
                        ? `${detail.attendanceSummary.attendancePercentage}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-5">
                <h4 className="text-xs font-semibold text-zinc-500 mb-3">
                  Recent Attendance Logs
                </h4>
                {detail.recentAttendance.length === 0 ? (
                  <p className="text-sm text-zinc-500">No attendance records logged yet.</p>
                ) : (
                  <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100">
                    {detail.recentAttendance.map((rec) => (
                      <div
                        key={rec._id}
                        className="px-3.5 py-2.5 flex items-center justify-between text-sm"
                      >
                        <div>
                          <div className="font-mono text-xs text-zinc-700 tabular-nums">
                            {formatReadableDate(rec.date)}
                            {rec.checkInTime ? ` · ${rec.checkInTime} → ${rec.checkOutTime || '—'}` : ''}
                            {rec.workingHours > 0 ? ` (${rec.workingHours.toFixed(1)}h)` : ''}
                          </div>
                          {rec.notes && (
                            <div className="text-xs text-zinc-500 mt-0.5">{rec.notes}</div>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            rec.status === 'Present'
                              ? 'text-[#0f5257]'
                              : rec.status === 'Late Entry'
                                ? 'text-amber-700'
                                : 'text-[#be123c]'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
