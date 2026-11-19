import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import { Employee, PaginationInfo } from '../types/index.ts';
import { formatReadableDate } from '../utils/formatters.ts';
import { TableSkeleton } from '../components/LoadingSkeleton.tsx';
import EmployeeFormModal from '../components/EmployeeFormModal.tsx';
import EmployeeProfileDrawer from '../components/EmployeeProfileDrawer.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        success: boolean;
        data: Employee[];
        departments: string[];
        pagination: PaginationInfo;
      }>('/employees', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          department: department !== 'All' ? department : undefined,
          status: status !== 'All' ? status : undefined,
        },
      });
      setEmployees(res.data.data);
      setDepartments(res.data.departments);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch employees.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, department, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${deletingEmployee._id}`);
      setFeedback(
        `Removed ${deletingEmployee.firstName} ${deletingEmployee.lastName} (${deletingEmployee.employeeId}).`
      );
      setDeletingEmployee(null);
      fetchEmployees();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete employee.'));
      setDeletingEmployee(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-900">
            Employee Management
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 tabular-nums">
            {pagination.total} directory record(s)
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
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

      {/* Search & Filters */}
      <div className="bg-white border border-zinc-200 rounded-md p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by employee name, ID, email, or role..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
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

        <div className="md:col-span-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by employment status"
            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Employee ID</th>
                  <th className="px-4 py-2.5">Employee Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Designation</th>
                  <th className="px-4 py-2.5">Joining Date</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      <p className="font-medium text-zinc-700">No employees match your criteria.</p>
                      <p className="text-xs mt-1">Adjust your search filters or add a new employee.</p>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-zinc-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-700 tabular-nums whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {emp.email}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {emp.designation}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                        {formatReadableDate(emp.joiningDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            emp.employmentStatus === 'Active'
                              ? 'text-[#0f5257]'
                              : emp.employmentStatus === 'On Leave'
                                ? 'text-amber-700'
                                : 'text-zinc-500'
                          }`}
                        >
                          {emp.employmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingId(emp._id)}
                            className="p-1.5 text-zinc-500 hover:text-[#0f5257] hover:bg-zinc-100 rounded"
                            title="View Profile"
                            aria-label={`View ${emp.firstName} ${emp.lastName}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-zinc-500 hover:text-[#0f5257] hover:bg-zinc-100 rounded"
                            title="Edit Employee"
                            aria-label={`Edit ${emp.firstName} ${emp.lastName}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEmployee(emp)}
                            className="p-1.5 text-zinc-500 hover:text-[#be123c] hover:bg-rose-50 rounded"
                            title="Delete Employee"
                            aria-label={`Delete ${emp.firstName} ${emp.lastName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      <EmployeeFormModal
        open={formOpen}
        employee={editingEmployee}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFeedback(
            editingEmployee
              ? 'Employee record updated successfully.'
              : 'New employee created and login account provisioned.'
          );
          fetchEmployees();
        }}
      />

      <EmployeeProfileDrawer
        employeeId={viewingId}
        onClose={() => setViewingId(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingEmployee)}
        title="Delete Employee Record"
        description={
          deletingEmployee
            ? `Are you sure you want to permanently remove ${deletingEmployee.firstName} ${deletingEmployee.lastName} (${deletingEmployee.employeeId})? All associated attendance records and user access will be deleted.`
            : ''
        }
        confirmLabel="Delete Employee"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEmployee(null)}
      />
    </div>
  );
}
