import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  History,
  BarChart3,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'employee'>;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Employees',
    to: '/employees',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Attendance',
    to: '/attendance',
    icon: CalendarCheck,
    roles: ['admin'],
  },
  {
    label: 'Attendance History',
    to: '/attendance-history',
    icon: History,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    label: 'My Profile',
    to: '/profile',
    icon: UserCircle,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    roles: ['admin', 'employee'],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/attendance': 'Daily Attendance',
  '/attendance-history': 'Attendance History',
  '/reports': 'Monthly Reports',
  '/profile': 'My Profile',
  '/settings': 'Settings',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, passwordNoticeDismissed, dismissPasswordNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const pageTitle = ROUTE_TITLES[location.pathname] || 'AttendCloud';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => {
              if (isMobile) setMobileOpen(false);
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#0f5257] text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/6'
              }`
            }
            title={collapsed && !isMobile ? item.label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {(!collapsed || isMobile) && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#f6f6f4] text-zinc-900">
      {/* Desktop Dark Charcoal Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#16191d] border-r border-zinc-800 transition-all duration-150 shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <div className="h-14 px-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-[#0f5257] text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
              AC
            </div>
            {!collapsed && (
              <span className="font-display font-semibold text-[15px] tracking-tight text-white whitespace-nowrap">
                AttendCloud
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-white/8 transition-colors shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {renderNavLinks(false)}

        <div className="p-2.5 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] font-medium text-zinc-400 hover:text-rose-300 hover:bg-white/6 transition-colors whitespace-nowrap"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#16191d] h-full border-r border-zinc-800 flex flex-col z-10">
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#0f5257] text-white flex items-center justify-center font-display font-bold text-xs">
                  AC
                </div>
                <span className="font-display font-semibold text-[15px] text-white">
                  AttendCloud
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks(true)}
            <div className="p-2.5 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-rose-300 hover:bg-white/6 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-zinc-600 hover:text-zinc-900 rounded hover:bg-zinc-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400 hidden sm:inline">Workspace</span>
              <span className="text-zinc-300 hidden sm:inline">/</span>
              <h1 className="font-semibold font-display text-zinc-900 truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-zinc-500 tabular-nums">
              {todayFormatted}
            </span>
            <div className="h-4 w-px bg-zinc-200 hidden md:block" />
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 text-left rounded py-1 px-1.5 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-7 h-7 rounded bg-zinc-900 text-white flex items-center justify-center text-[11px] font-semibold font-display shrink-0">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-semibold text-zinc-900 whitespace-nowrap">
                  {user.name}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {user.role === 'admin' ? 'HR Administrator' : 'Employee'}
                </div>
              </div>
            </button>
          </div>
        </header>

        {user.mustChangePassword &&
          !passwordNoticeDismissed &&
          location.pathname !== '/settings' && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 no-print">
              <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Initial setup password active. Update your password in Settings to secure your account.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="px-3 py-1 text-xs font-medium text-white bg-[#0f5257] hover:bg-[#0a3c40] rounded whitespace-nowrap"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={dismissPasswordNotice}
                    className="px-2 py-1 text-xs font-medium text-amber-900 hover:underline whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
