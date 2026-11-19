import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import api, { getErrorMessage } from '../services/api.ts';
import { AdminDashboardData, Employee } from '../types/index.ts';
import StatCard from '../components/StatCard.tsx';
import { DashboardSkeleton } from '../components/LoadingSkeleton.tsx';
import { formatReadableDate } from '../utils/formatters.ts';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean } & AdminDashboardData>(
        '/dashboard/stats'
      );
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard analytics.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-md p-6 text-center space-y-3">
        <p className="text-sm text-rose-700">{error || 'Unable to load dashboard.'}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0f5257] rounded-md hover:bg-[#0a3c40]"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    stats,
    weeklyChart,
    monthlyTrend,
    departmentDistribution,
    recentActivity,
    recentAdditions,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Workforce Overview
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 tabular-nums">
            {formatReadableDate(data.date)} · {stats.notMarkedToday} unmarked today
          </p>
        </div>
        <Link
          to="/attendance"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Mark Daily Attendance</span>
        </Link>
      </div>

      {/* Unified 4-Column KPI Strip */}
      <div className="bg-white border border-zinc-200 rounded-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <StatCard
          label="Total Employees"
          value={stats.totalEmployees}
          detail={`${stats.activeEmployees} active staff`}
          tone="brand"
        />
        <StatCard
          label="Present Today"
          value={stats.presentToday}
          detail={`${stats.onTimeToday} on-time · ${stats.lateToday} late entry`}
          tone="success"
        />
        <StatCard
          label="Absent Today"
          value={stats.absentToday}
          detail={`${stats.notMarkedToday} pending mark`}
          tone="danger"
        />
        <StatCard
          label="Attendance Rate"
          value={
            stats.attendancePercentage !== null
              ? `${stats.attendancePercentage}%`
              : '—'
          }
          detail="Recorded attendance today"
          tone="default"
        />
      </div>

      {/* Weekly Chart & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-zinc-200 rounded-md p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold font-display text-zinc-900">
              Weekly Attendance
            </h3>
            <p className="text-xs text-zinc-500">
              Present vs. absent across recent working days
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#71717a' }} />
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

        <section className="bg-white border border-zinc-200 rounded-md p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold font-display text-zinc-900">
              6-Month Attendance Trend
            </h3>
            <p className="text-xs text-zinc-500">
              Monthly attendance rate progression
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#71717a' }} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value ?? 0}%`, 'Attendance Rate']}
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#e4e4e7',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#0f5257"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#0f5257' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Department Distribution & Recent Additions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-md p-5">
          <h3 className="text-sm font-semibold font-display text-zinc-900">
            Department Distribution
          </h3>
          <p className="text-xs text-zinc-500 mb-4">Headcount by department</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentDistribution}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis
                  type="category"
                  dataKey="department"
                  width={110}
                  tick={{ fontSize: 12, fill: '#3f3f46' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#e4e4e7',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Employees" fill="#18181b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-zinc-200 rounded-md overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-display text-zinc-900">
                Recent Employee Additions
              </h3>
              <p className="text-xs text-zinc-500">Latest directory entries</p>
            </div>
            <Link
              to="/employees"
              className="text-xs font-medium text-[#0f5257] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentAdditions.map((emp) => (
                  <tr key={emp._id} className="hover:bg-zinc-50/75">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                      {emp.employeeId}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-zinc-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-zinc-500">{emp.designation}</div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{emp.department}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                      {formatReadableDate(emp.joiningDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Recent Attendance Activity */}
      <section className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display text-zinc-900">
              Recent Attendance Activity
            </h3>
            <p className="text-xs text-zinc-500">Latest recorded status updates</p>
          </div>
          <Link
            to="/attendance-history"
            className="text-xs font-medium text-[#0f5257] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>Full history</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Employee ID</th>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No attendance activity recorded yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((rec) => {
                  const emp = rec.employee as Employee;
                  const marker =
                    typeof rec.markedBy === 'object' && rec.markedBy
                      ? rec.markedBy.name
                      : 'System';
                  return (
                    <tr key={rec._id} className="hover:bg-zinc-50/75">
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                        {rec.employeeId}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-zinc-900 whitespace-nowrap">
                        {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 whitespace-nowrap">
                        {emp?.department || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                        {formatReadableDate(rec.date)}
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
                      <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                        {marker}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
