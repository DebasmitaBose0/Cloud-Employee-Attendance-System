import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  PaginationInfo,
} from '../types/index.ts';
import { DEPARTMENTS, formatReadableDate } from '../utils/formatters.ts';
import { TableSkeleton } from '../components/LoadingSkeleton.tsx';

export default function AttendanceHistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('All');
  const [employeeId, setEmployeeId] = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<{ success: boolean; data: Employee[] }>('/employees', {
        params: { limit: 100 },
      })
      .then((res) => setEmployeesList(res.data.data))
      .catch(() => {});
  }, [isAdmin]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        success: boolean;
        data: AttendanceRecord[];
        pagination: PaginationInfo;
      }>('/attendance', {
        params: {
          page,
          limit: 15,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          department: isAdmin && department !== 'All' ? department : undefined,
          employeeId: isAdmin && employeeId !== 'All' ? employeeId : undefined,
          status: status !== 'All' ? status : undefined,
          search: isAdmin && search.trim() ? search.trim() : undefined,
        },
      });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch attendance history.'));
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, department, employeeId, status, search, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditInTime(rec.checkInTime || '');
    setEditOutTime(rec.checkOutTime || '');
    setEditNotes(rec.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setUpdating(true);
    setError('');
    try {
      await api.put(`/attendance/${editingRecord._id}`, {
        status: editStatus,
        checkInTime: editStatus === 'Absent' ? null : editInTime || null,
        checkOutTime: editStatus === 'Absent' ? null : editOutTime || null,
        notes: editNotes,
      });
      setFeedback(
        `Updated attendance for ${editingRecord.employeeId} on ${formatReadableDate(editingRecord.date)}.`
      );
      setEditingRecord(null);
      fetchHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update attendance record.'));
    } finally {
      setUpdating(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDepartment('All');
    setEmployeeId('All');
    setStatus('All');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Attendance History
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 tabular-nums">
            {isAdmin
              ? `${pagination.total} historical record(s) across organization`
              : `${pagination.total} personal attendance record(s)`}
          </p>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
        >
          Clear Filters
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between">
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

      <div className="bg-white border border-zinc-200 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late Entry">Late Entry</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {isAdmin && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              >
                <option value="All">All Employees</option>
                {employeesList.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeId} · {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Quick Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name or ID..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={isAdmin ? 7 : 6} />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Employee ID</th>
                  <th className="px-4 py-2.5">Employee Name</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Check-In / Out</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5">Status</th>
                  {isAdmin && <th className="px-4 py-2.5 text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No attendance records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => {
                    const emp = rec.employee as Employee;
                    return (
                      <tr key={rec._id} className="hover:bg-zinc-50/75">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-700 tabular-nums whitespace-nowrap">
                          {formatReadableDate(rec.date)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                          {rec.employeeId}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                          {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                          {emp?.department || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                          {rec.checkInTime || '—'} → {rec.checkOutTime || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-right whitespace-nowrap">
                          {rec.workingHours > 0 ? (
                            <span
                              className={
                                rec.meetsTenHours && rec.meetsSixPmCheckout
                                  ? 'text-[#0f5257] font-semibold'
                                  : 'text-amber-700 font-medium'
                              }
                            >
                              {rec.workingHours.toFixed(2)}h
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
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
                        {isAdmin && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              className="p-1.5 text-zinc-500 hover:text-[#0f5257] hover:bg-zinc-100 rounded"
                              title="Update attendance record"
                              aria-label={`Edit attendance for ${rec.employeeId}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-600">
              <span className="tabular-nums">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-zinc-200 rounded-md w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-zinc-900">
                Update Attendance Record
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-zinc-600">
                <span className="font-mono font-medium text-zinc-900">
                  {editingRecord.employeeId}
                </span>{' '}
                · {formatReadableDate(editingRecord.date)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                >
                  <option value="Present">Present</option>
                  <option value="Late Entry">Late Entry</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              {editStatus !== 'Absent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Check-In (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={editInTime}
                      onChange={(e) => setEditInTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Check-Out (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={editOutTime}
                      onChange={(e) => setEditOutTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Remarks
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional reason or note"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
            </div>
            <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
