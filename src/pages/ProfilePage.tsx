import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatReadableDate } from '../utils/formatters.ts';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const emp = user.employee;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-md bg-zinc-900 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
            {user.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-zinc-900">
              {user.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>{user.email}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#0f5257]">
                {user.role === 'admin' ? 'HR Administrator' : 'Employee'}
              </span>
              {emp && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-800">{emp.employeeId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-md transition-colors whitespace-nowrap"
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-zinc-200 rounded-md p-6 space-y-4">
          <h3 className="text-sm font-semibold font-display text-zinc-900">
            Account Information
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100">
              <dt className="text-zinc-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>Login Email</span>
              </dt>
              <dd className="font-medium text-zinc-900">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100">
              <dt className="text-zinc-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                <span>Access Role</span>
              </dt>
              <dd className="font-medium text-zinc-900 capitalize">{user.role}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-zinc-500">Account Status</dt>
              <dd className="font-semibold text-[#0f5257]">
                {user.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border border-zinc-200 rounded-md p-6 space-y-4">
          <h3 className="text-sm font-semibold font-display text-zinc-900">
            {emp ? 'Employment Record' : 'Administrative Scope'}
          </h3>
          {emp ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <dt className="text-zinc-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  <span>Department</span>
                </dt>
                <dd className="font-medium text-zinc-900">{emp.department}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <dt className="text-zinc-500 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-zinc-400" />
                  <span>Designation</span>
                </dt>
                <dd className="font-medium text-zinc-900">{emp.designation}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <dt className="text-zinc-500 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span>Phone</span>
                </dt>
                <dd className="font-medium text-zinc-900 tabular-nums">{emp.phone}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-zinc-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span>Joining Date</span>
                </dt>
                <dd className="font-mono text-xs font-medium text-zinc-900 tabular-nums">
                  {formatReadableDate(emp.joiningDate)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-600 leading-relaxed">
              This account holds full HR Administrator privileges, including employee directory management, daily attendance verification, historical updates, and organization-wide monthly reporting.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
