import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Printer,
  Search,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
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
import { MonthlyReportResponse } from '../types/index.ts';
import { exportRowsToCsv, formatMonthYear } from '../utils/formatters.ts';
import { DashboardSkeleton } from '../components/LoadingSkeleton.tsx';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [department, setDepartment] = useState('All');
  const [search, setSearch] = useState('');

  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean } & MonthlyReportResponse>(
        '/reports/monthly',
        {
          params: {
            month,
            year,
            department: department !== 'All' ? department : undefined,
            search: search.trim() || undefined,
          },
        }
      );
      setReport(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate monthly attendance report.'));
    } finally {
      setLoading(false);
    }
  }, [month, year, department, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReport();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadReport]);

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Department',
      'Designation',
      'Scheduled Working Days',
      'Recorded Working Days',
      'Present Days (Total)',
      'Late Entry Days',
      'Absent Days',
      'Unmarked Days',
      'Avg Working Hours',
      'Attendance Percentage (%)',
      'Data Completeness',
    ];

    const rows = report.data.map((row) => [
      row.employeeId,
      row.name,
      row.email,
      row.department,
      row.designation,
      row.totalWorkingDays,
      row.recordedWorkingDays,
      row.presentDays,
      row.lateEntryDays,
      row.absentDays,
      row.unmarkedDays,
      row.avgWorkingHours.toFixed(2),
      row.attendancePercentage !== null ? row.attendancePercentage : 'N/A',
      row.isIncomplete ? 'Incomplete' : 'Complete',
    ]);

    exportRowsToCsv(
      `attendance-report-${report.period.monthPrefix}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Monthly Attendance Reports
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {formatMonthYear(year, month)} · Formula: (Present Days / Total Recorded Working Days) × 100
          </p>
        </div>

        <div className="flex items-center gap-2.5 no-print">
          <button
            type="button"
            disabled={!report || report.data.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-md transition-colors whitespace-nowrap disabled:opacity-45"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap disabled:opacity-45"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Period & Filter Controls */}
      <div className="bg-white border border-zinc-200 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 no-print">
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            <option value="All">All Departments</option>
            {(report?.departments || []).map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-4">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Search Employee</label>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Employee name or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
            />
          </div>
        </div>
      </div>

      {loading && <DashboardSkeleton />}

      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && report && (
        <>
          <div className="bg-white border border-zinc-200 rounded-md print-card overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
              <div className="p-4">
                <div className="text-xs text-zinc-500">Scheduled Working Days</div>
                <div className="text-xl font-bold font-display tabular-nums text-zinc-900 mt-0.5">
                  {report.period.scheduledWorkingDays}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Excludes weekends &amp; {report.period.holidaysInMonth.length} holiday(s)
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-500">Total Present Logs</div>
                <div className="text-xl font-bold font-display tabular-nums text-[#0f5257] mt-0.5">
                  {report.totals.presentDays}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Across {report.totals.employeesCount} employee(s)
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-500">Total Absent Logs</div>
                <div className="text-xl font-bold font-display tabular-nums text-[#be123c] mt-0.5">
                  {report.totals.absentDays}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Unmarked days excluded
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-zinc-500">Overall Attendance Rate</div>
                <div className="text-xl font-bold font-display tabular-nums text-zinc-900 mt-0.5">
                  {report.totals.overallPercentage !== null
                    ? `${report.totals.overallPercentage}%`
                    : '—'}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {report.totals.recordedWorkingDays} recorded day(s)
                </div>
              </div>
            </div>

            {report.totals.incompleteRecordsCount > 0 && (
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Incomplete attendance data for{' '}
                  <strong className="tabular-nums">{report.totals.incompleteRecordsCount}</strong>{' '}
                  employee(s) across {report.period.elapsedWorkingDays} elapsed working days. Unmarked dates are flagged separately and are not counted as absent.
                </span>
              </div>
            )}

            {report.period.holidaysInMonth.length > 0 && (
              <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2 text-xs text-zinc-600">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  Configured holidays in {formatMonthYear(year, month)}:{' '}
                  <span className="font-mono text-zinc-800">
                    {report.period.holidaysInMonth.join(', ')}
                  </span>
                </span>
              </div>
            )}
          </div>

          {report.data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
              <section className="lg:col-span-7 bg-white border border-zinc-200 rounded-md p-5">
                <h3 className="text-sm font-semibold font-display text-zinc-900">
                  Employee Attendance Comparison
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Present vs. absent working days per employee
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.data.slice(0, 12)}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis dataKey="employeeId" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '6px',
                          borderColor: '#e4e4e7',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="presentDays" name="Present Days" fill="#0f5257" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="absentDays" name="Absent Days" fill="#be123c" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-md overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-200">
                  <h3 className="text-sm font-semibold font-display text-zinc-900">
                    Department-Wise Summary
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Monthly attendance rate by department
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                      <tr>
                        <th className="px-4 py-2.5">Department</th>
                        <th className="px-4 py-2.5 text-right">Staff</th>
                        <th className="px-4 py-2.5 text-right">Present</th>
                        <th className="px-4 py-2.5 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {report.departmentSummary.map((dept) => (
                        <tr key={dept.department} className="hover:bg-zinc-50/75">
                          <td className="px-4 py-2.5 font-medium text-zinc-900">
                            {dept.department}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
                            {dept.employees}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                            {dept.presentDays}/{dept.recordedDays}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0f5257]">
                            {dept.attendancePercentage !== null
                              ? `${dept.attendancePercentage}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-md overflow-hidden print-card">
            <div className="px-5 py-3.5 border-b border-zinc-200">
              <h3 className="text-sm font-semibold font-display text-zinc-900">
                Employee-Wise Attendance Summary
              </h3>
              <p className="text-xs text-zinc-500">
                Detailed breakdown for {formatMonthYear(year, month)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5">Employee ID</th>
                    <th className="px-4 py-2.5">Employee Name</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5 text-right">Working Days</th>
                    <th className="px-4 py-2.5 text-right">Recorded</th>
                    <th className="px-4 py-2.5 text-right">Present</th>
                    <th className="px-4 py-2.5 text-right">Late Entry</th>
                    <th className="px-4 py-2.5 text-right">Absent</th>
                    <th className="px-4 py-2.5 text-right">Avg Hrs</th>
                    <th className="px-4 py-2.5 text-right">Unmarked</th>
                    <th className="px-4 py-2.5 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {report.data.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-zinc-500">
                        No employees found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    report.data.map((row) => (
                      <tr key={row._id} className="hover:bg-zinc-50/75">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                          {row.employeeId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-zinc-900">{row.name}</div>
                          <div className="text-xs text-zinc-500">{row.designation}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                          {row.department}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600">
                          {row.totalWorkingDays}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                          {row.recordedWorkingDays}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#0f5257]">
                          {row.presentDays}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-amber-700">
                          {row.lateEntryDays}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#be123c]">
                          {row.absentDays}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                          {row.avgWorkingHours > 0 ? `${row.avgWorkingHours.toFixed(1)}h` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {row.unmarkedDays > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {row.unmarkedDays} (Incomplete)
                            </span>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-zinc-900">
                          {row.attendancePercentage !== null
                            ? `${row.attendancePercentage}%`
                            : 'No Data'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
