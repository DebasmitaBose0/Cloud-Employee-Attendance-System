import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import { Employee, EmploymentStatus } from '../types/index.ts';
import { DEPARTMENTS, getTodayInputDate } from '../utils/formatters.ts';

interface EmployeeFormModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EmployeeFormModal({
  open,
  employee,
  onClose,
  onSaved,
}: EmployeeFormModalProps) {
  const isEditing = Boolean(employee);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState(getTodayInputDate());
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('Active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');

    if (employee) {
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmployeeId(employee.employeeId);
      setEmail(employee.email);
      setPhone(employee.phone);
      setDepartment(employee.department);
      setDesignation(employee.designation);
      setJoiningDate(employee.joiningDate);
      setEmploymentStatus(employee.employmentStatus);
    } else {
      setFirstName('');
      setLastName('');
      setEmployeeId('');
      setEmail('');
      setPhone('');
      setDepartment(DEPARTMENTS[0]);
      setDesignation('');
      setJoiningDate(getTodayInputDate());
      setEmploymentStatus('Active');

      api
        .get<{ success: boolean; employeeId: string }>('/employees/next-id')
        .then((res) => {
          setEmployeeId(res.data.employeeId);
        })
        .catch(() => {
          setEmployeeId('EMP-1013');
        });
    }
  }, [open, employee]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !designation.trim()) {
      setError('Please complete all required employee fields.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        employeeId: employeeId.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        department,
        designation: designation.trim(),
        joiningDate,
        employmentStatus,
      };

      if (isEditing && employee) {
        await api.put(`/employees/${employee._id}`, payload);
      } else {
        await api.post('/employees', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save employee record.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-zinc-200 rounded-md w-full max-w-2xl shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-semibold font-display text-zinc-900">
              {isEditing ? 'Edit Employee Record' : 'Add New Employee'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isEditing
                ? 'Update profile, role assignment, or employment status.'
                : 'Creates an employee directory record and linked login account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5257]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Jordan"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Alvarez"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="EMP-1013"
                  className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan.alvarez@attendcloud.local"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0148"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Designation *
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Cloud Architect"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
