import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getErrorMessage } from '../services/api.ts';
import { DEPARTMENTS } from '../utils/formatters.ts';

type AuthMode = 'login' | 'register';

export default function LoginPage({
  initialMode = 'login',
}: {
  initialMode?: AuthMode;
}) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up / Register fields (Employee self-registration)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [designation, setDesignation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please verify your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !regEmail.trim() ||
      !phone.trim() ||
      !designation.trim() ||
      !regPassword
    ) {
      setError('Please complete all required registration fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Please enter a valid work email address.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: phone.trim(),
        department,
        designation: designation.trim(),
        password: regPassword,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'employee') => {
    setMode('login');
    setError('');
    if (role === 'admin') {
      setEmail('admin@attendcloud.local');
      setPassword('Admin@ChangeMe2026');
    } else {
      setEmail('maya.patel@attendcloud.local');
      setPassword('Employee@2026');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex flex-col justify-between">
      {/* Header with explicit Login & Sign Up navigation */}
      <header className="px-6 sm:px-10 h-16 flex items-center justify-between border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#0f5257] text-white flex items-center justify-center font-display font-bold text-xs">
            AC
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-zinc-900">
            AttendCloud
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              mode === 'login'
                ? 'text-[#0f5257] bg-teal-50'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              mode === 'register'
                ? 'bg-[#0f5257] text-white'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[960px] bg-white border border-zinc-200 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Clean Editorial Left Photo */}
          <div className="hidden md:block md:col-span-5 relative bg-zinc-900 min-h-[540px]">
            <img
              src="/src/assets/images/login_workspace_1795098741013.jpg"
              alt="Corporate office meeting room"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/25 to-transparent" />
            <div className="relative z-10 h-full p-7 flex flex-col justify-end text-white space-y-2">
              <p className="text-sm font-medium leading-relaxed text-zinc-100">
                Biometric daily check-in, 10-hour shift tracking, and monthly workforce compliance reporting.
              </p>
              <p className="text-xs text-zinc-300">
                Entry ≤ 09:30 AM · Late Entry 09:30–10:00 AM · Check-out ≥ 6:00 PM
              </p>
            </div>
          </div>

          {/* Auth Panel */}
          <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-5">
              {/* Segmented Login / Sign Up Switcher */}
              <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-md">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`py-2 text-xs font-semibold rounded transition-colors ${
                    mode === 'login'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Login / Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`py-2 text-xs font-semibold rounded transition-colors ${
                    mode === 'register'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Sign Up (Employee)
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800"
                >
                  {error}
                </div>
              )}

              {mode === 'login' ? (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl font-bold font-display text-zinc-900">
                      Sign in to your account
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                      Enter your email and password to access your portal.
                    </p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                    <div>
                      <label
                        htmlFor="login-email"
                        className="block text-xs font-semibold text-zinc-700 mb-1.5"
                      >
                        Email address
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@attendcloud.local"
                        className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-zinc-700 mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-[#0f5257] hover:bg-[#0a3c40] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60"
                    >
                      {submitting ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
                    <span>Quick fill (local seed):</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fillCredentials('admin')}
                        className="font-medium text-[#0f5257] hover:underline"
                      >
                        Admin
                      </button>
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        onClick={() => fillCredentials('employee')}
                        className="font-medium text-[#0f5257] hover:underline"
                      >
                        Employee
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-xl font-bold font-display text-zinc-900">
                      Employee Sign Up
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">
                      Create your employee attendance account. Admin accounts are provisioned internally.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Alex"
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
                          placeholder="Morgan"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="alex@attendcloud.local"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (415) 555-0190"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Designation *
                        </label>
                        <input
                          type="text"
                          required
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="Software Engineer"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-[#0f5257] hover:bg-[#0a3c40] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60"
                    >
                      {submitting ? 'Creating Account...' : 'Create Employee Account'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-zinc-400">
        AttendCloud Employee Attendance Management System
      </footer>
    </div>
  );
}
