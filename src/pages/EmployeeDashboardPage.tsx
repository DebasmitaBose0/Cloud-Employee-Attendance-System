import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Fingerprint, LogOut, Clock } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api, { getErrorMessage } from '../services/api.ts';
import { EmployeeReportData } from '../types/index.ts';
import StatCard from '../components/StatCard.tsx';
import { DashboardSkeleton } from '../components/LoadingSkeleton.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import { formatMonthYear, formatReadableDate, getTodayInputDate } from '../utils/formatters.ts';

function getCurrentLocalHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatDurationSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hrs = String(Math.floor(clamped / 3600)).padStart(2, '0');
  const mins = String(Math.floor((clamped % 3600) / 60)).padStart(2, '0');
  const secs = String(clamped % 60).padStart(2, '0');
  return `${hrs}h ${mins}m ${secs}s`;
}

export default function EmployeeDashboardPage() {
  const [data, setData] = useState<EmployeeReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [punchMessage, setPunchMessage] = useState('');
  const [punchError, setPunchError] = useState('');
  const [punching, setPunching] = useState(false);

  // Optional testing time override for evaluating 09:30 / 10:00 / 18:00 rules at any hour
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState('09:15');
  const [earlyCheckoutConfirm, setEarlyCheckoutConfirm] = useState(false);

  // Ticking live clock for working-hours calculation
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadPersonalDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean } & EmployeeReportData>(
        '/dashboard/stats'
      );
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load your attendance summary.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonalDashboard();
  }, []);

  const isActiveShift = Boolean(
    data &&
      (data.today.status === 'Present' || data.today.status === 'Late Entry') &&
      data.today.checkInTime &&
      !data.today.checkOutTime
  );

  useEffect(() => {
    if (!isActiveShift) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isActiveShift]);

  const elapsedSeconds = useMemo(() => {
    if (!data?.today.checkInTime) return 0;
    if (data.today.checkOutTime) {
      return Math.round((data.today.workingHours || 0) * 3600);
    }

    // If checked in with custom time or ISO timestamp, calculate live elapsed seconds
    const checkInIso = data.today.checkInIso;
    if (checkInIso) {
      // Check if ISO uses local real clock or YYYY-MM-DDTHH:mm:00.000Z simulated stamp
      const [hStr, mStr] = data.today.checkInTime.split(':');
      const simulatedIso = `${data.today.date}T${hStr}:${mStr}:00.000Z`;
      if (checkInIso !== simulatedIso) {
        const startMs = Date.parse(checkInIso);
        if (!Number.isNaN(startMs)) {
          return Math.max(0, Math.floor((nowTick - startMs) / 1000));
        }
      }
      // For simulated check-in time, compute relative to current local time of day
      const nowDate = new Date(nowTick);
      const nowSeconds =
        nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
      const inSeconds = Number(hStr) * 3600 + Number(mStr) * 60;
      if (nowSeconds >= inSeconds) {
        return nowSeconds - inSeconds;
      }
    }
    return 0;
  }, [data, nowTick]);

  const elapsedHoursDecimal = elapsedSeconds / 3600;
  const progressPercent = Math.min(100, (elapsedHoursDecimal / 10) * 100);

  const handleBiometricCheckIn = async () => {
    setPunchError('');
    setPunchMessage('');
    setPunching(true);
    try {
      const punchTime = useCustomTime ? customTime : getCurrentLocalHHMM();
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance/biometric/check-in',
        {
          date: getTodayInputDate(),
          time: punchTime,
          clientIso: new Date().toISOString(),
          isCustomTime: useCustomTime,
        }
      );
      setPunchMessage(res.data.message);
      await loadPersonalDashboard();
    } catch (err) {
      setPunchError(getErrorMessage(err, 'Biometric check-in failed.'));
    } finally {
      setPunching(false);
    }
  };

  const executeBiometricCheckOut = async () => {
    setPunchError('');
    setPunchMessage('');
    setPunching(true);
    setEarlyCheckoutConfirm(false);
    try {
      const punchTime = useCustomTime ? customTime : getCurrentLocalHHMM();
      const res = await api.post<{ success: boolean; message: string }>(
        '/attendance/biometric/check-out',
        {
          date: getTodayInputDate(),
          time: punchTime,
          clientIso: new Date().toISOString(),
          isCustomTime: useCustomTime,
        }
      );
      setPunchMessage(res.data.message);
      await loadPersonalDashboard();
    } catch (err) {
      setPunchError(getErrorMessage(err, 'Biometric check-out failed.'));
    } finally {
      setPunching(false);
    }
  };

  const handleBiometricCheckOutClick = () => {
    const punchTime = useCustomTime ? customTime : getCurrentLocalHHMM();
    const [hh, mm] = punchTime.split(':').map(Number);
    const isBeforeSixPm = hh < 18;
    let projectedHours = elapsedHoursDecimal;
    if (useCustomTime && data?.today.checkInTime) {
      const [inH, inM] = data.today.checkInTime.split(':').map(Number);
      projectedHours = (hh * 60 + mm - (inH * 60 + inM)) / 60;
    }
    if (isBeforeSixPm || projectedHours < 10) {
      setEarlyCheckoutConfirm(true);
      return;
    }
    executeBiometricCheckOut();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-md p-6 text-center space-y-3">
        <p className="text-sm text-rose-700">{error || 'Unable to load dashboard.'}</p>
        <button
          type="button"
          onClick={loadPersonalDashboard}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0f5257] rounded-md hover:bg-[#0a3c40]"
        >
          Retry
        </button>
      </div>
    );
  }

  const { employee, today, summary, monthlyChart, recentHistory } = data;

  const todayTone =
    today.status === 'Present'
      ? 'success'
      : today.status === 'Absent'
        ? 'danger'
        : 'default';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Welcome back, {employee.firstName} {employee.lastName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span className="font-mono text-zinc-800">{employee.employeeId}</span>
            <span aria-hidden="true">·</span>
            <span>{employee.designation}</span>
            <span aria-hidden="true">·</span>
            <span>{employee.department}</span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatReadableDate(employee.joiningDate)}</span>
          </div>
        </div>
        <Link
          to="/attendance-history"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-md transition-colors whitespace-nowrap"
        >
          <span>Full History</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Biometric Attendance Terminal Card */}
      <section className="bg-white border border-zinc-200 rounded-md p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold font-display text-zinc-900">
              Biometric Attendance Terminal
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Entry ≤ 09:30 AM: <span className="font-medium text-[#0f5257]">Present</span> ·
              09:31 AM – 10:00 AM: <span className="font-medium text-amber-700">Late Entry</span> ·
              After 10:00 AM: <span className="font-medium text-[#be123c]">Absent</span> ·
              Check-out required after 6:00 PM with minimum 10 working hours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomTime}
                onChange={(e) => setUseCustomTime(e.target.checked)}
                className="rounded border-zinc-300 text-[#0f5257] focus:ring-[#0f5257]"
              />
              <span>Test punch time</span>
            </label>
            {useCustomTime && (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                aria-label="Simulated punch time"
                className="px-2.5 py-1.5 text-xs font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            )}

            {today.status === 'Not Marked' && (
              <button
                type="button"
                disabled={punching}
                onClick={handleBiometricCheckIn}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap disabled:opacity-55"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{punching ? 'Recording...' : 'Biometric Attendance'}</span>
              </button>
            )}

            {isActiveShift && (
              <button
                type="button"
                disabled={punching}
                onClick={handleBiometricCheckOutClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap disabled:opacity-55"
              >
                <LogOut className="w-4 h-4" />
                <span>{punching ? 'Checking out...' : 'Biometric Check Out'}</span>
              </button>
            )}
          </div>
        </div>

        {punchMessage && (
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
            {punchMessage}
          </div>
        )}

        {punchError && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
            {punchError}
          </div>
        )}

        {/* Live Working Hours Calculation Bar */}
        <div className="pt-4 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#0f5257] shrink-0" />
            <div>
              <div className="text-xs text-zinc-500">
                {isActiveShift
                  ? 'Live Working Hours Elapsed'
                  : today.checkOutTime
                    ? 'Total Shift Hours Worked'
                    : 'Working Hours'}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
                {isActiveShift
                  ? formatDurationSeconds(elapsedSeconds)
                  : today.checkOutTime
                    ? `${today.workingHours.toFixed(2)} hrs`
                    : '00h 00m 00s'}
              </div>
            </div>
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-600 tabular-nums">
              <span>10-Hour Daily Target</span>
              <span className="font-mono font-medium">
                {isActiveShift
                  ? `${elapsedHoursDecimal.toFixed(2)} / 10.00 hrs`
                  : `${(today.workingHours || 0).toFixed(2)} / 10.00 hrs`}
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0f5257] transition-all duration-300"
                style={{
                  width: `${
                    today.checkOutTime
                      ? Math.min(100, ((today.workingHours || 0) / 10) * 100)
                      : progressPercent
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="md:col-span-3 text-xs text-zinc-600 space-y-1 md:text-right font-mono tabular-nums">
            <div>In: {today.checkInTime || '—'}</div>
            <div>Out: {today.checkOutTime || 'Pending (≥ 18:00)'}</div>
          </div>
        </div>
      </section>

      {/* Unified 4-Column Personal KPI Strip */}
      <div className="bg-white border border-zinc-200 rounded-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <StatCard
          label="Today's Status"
          value={today.status}
          detail={
            today.checkInTime
              ? `Checked in at ${today.checkInTime}`
              : formatReadableDate(today.date)
          }
          tone={todayTone}
        />
        <StatCard
          label="Monthly Present"
          value={summary.presentDays}
          detail={`${formatMonthYear(summary.year, summary.month)} · ${summary.lateEntryDays} late entry`}
          tone="success"
        />
        <StatCard
          label="Monthly Absent"
          value={summary.absentDays}
          detail={
            summary.unmarkedDays > 0
              ? `${summary.unmarkedDays} unmarked working day(s)`
              : 'All elapsed working days recorded'
          }
          tone="danger"
        />
        <StatCard
          label="Attendance Rate"
          value={
            summary.attendancePercentage !== null
              ? `${summary.attendancePercentage}%`
              : '—'
          }
          detail={`Avg ${summary.avgWorkingHours.toFixed(1)} hrs/day`}
          tone="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-zinc-200 rounded-md p-5">
          <h3 className="text-sm font-semibold font-display text-zinc-900">
            6-Month Attendance Trend
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Monthly attended and absent working days
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#e4e4e7',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="present" name="Present" fill="#0f5257" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#be123c" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-zinc-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-display text-zinc-900">
                Recent Attendance History
              </h3>
              <p className="text-xs text-zinc-500">Entry/exit timestamps and hours worked</p>
            </div>
            <Link
              to="/attendance-history"
              className="text-xs font-medium text-[#0f5257] hover:underline whitespace-nowrap"
            >
              See all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">In / Out</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      No attendance history available yet.
                    </td>
                  </tr>
                ) : (
                  recentHistory.slice(0, 8).map((rec) => (
                    <tr key={rec._id} className="hover:bg-zinc-50/75">
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                        {formatReadableDate(rec.date)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                        {rec.checkInTime || '—'} → {rec.checkOutTime || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 tabular-nums text-right whitespace-nowrap">
                        {rec.workingHours > 0 ? `${rec.workingHours.toFixed(2)}h` : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={earlyCheckoutConfirm}
        title="Early Check-Out Warning"
        description="Company policy requires checking out after 6:00 PM (18:00) and completing at least 10 working hours. Checking out now will flag this shift as incomplete. Do you want to proceed?"
        confirmLabel="Check Out Anyway"
        variant="danger"
        loading={punching}
        onConfirm={executeBiometricCheckOut}
        onCancel={() => setEarlyCheckoutConfirm(false)}
      />
    </div>
  );
}
