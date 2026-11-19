import React, { useState } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AuthUser } from '../types/index.ts';

export default function SettingsPage() {
  const { user, updateUserState } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        user: AuthUser;
      }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      updateUserState(res.data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been updated securely.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-zinc-900">
          Account Settings &amp; Security
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Manage your authentication credentials and review role access configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-zinc-200 rounded-md p-6 space-y-5">
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-[#0f5257]" />
            <div>
              <h3 className="text-sm font-semibold font-display text-zinc-900">
                Change Password
              </h3>
              <p className="text-xs text-zinc-500">
                Minimum 8 characters required
              </p>
            </div>
          </div>

          {user.mustChangePassword && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-950">
              Your account is using an initial setup password. Please set a new private password now.
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f5257]" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-md p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-semibold font-display text-zinc-900">
              Session &amp; Policy Overview
            </h3>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="py-2 border-b border-zinc-100">
              <dt className="text-xs text-zinc-500">Signed-In Account</dt>
              <dd className="font-medium text-zinc-900 mt-0.5">{user.email}</dd>
            </div>
            <div className="py-2 border-b border-zinc-100">
              <dt className="text-xs text-zinc-500">Assigned Role</dt>
              <dd className="font-medium text-zinc-900 mt-0.5">
                {user.role === 'admin' ? 'Administrator / HR Manager' : 'Standard Employee'}
              </dd>
            </div>
            <div className="py-2 border-b border-zinc-100">
              <dt className="text-xs text-zinc-500">Working Day Calendar</dt>
              <dd className="text-zinc-600 mt-0.5 text-xs leading-relaxed">
                Monday – Friday working schedule. Weekends and configured public holidays are excluded from monthly working day denominators.
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-xs text-zinc-500">Authentication</dt>
              <dd className="text-zinc-600 mt-0.5 text-xs">
                JWT Bearer session · bcrypt password hashing
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
