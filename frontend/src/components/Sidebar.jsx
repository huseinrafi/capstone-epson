import { Link, useLocation } from 'react-router-dom';

// ─── ROLE PERMISSION MAP ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    allowedRoles: ['supervisor', 'manajer'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    to: '/manifests',
    label: 'Manifests',
    allowedRoles: ['admin_gudang', 'supervisor', 'manajer'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/anomalies',
    label: 'Anomalies',
    allowedRoles: ['supervisor', 'manajer'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    allowedRoles: ['supervisor', 'manajer'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'User Management',
    allowedRoles: ['manajer'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

// ─── BRAND CONFIG BY ROLE ─────────────────────────────────────────────────────
const BRAND_BY_ROLE = {
  manajer: {
    title: 'SVSB Manager',
    subtitle: 'Production Control',
  },
  supervisor: {
    title: 'SVSB Supervisor',
    subtitle: 'Problem Manager',
  },
  admin_gudang: {
    title: 'Admin Gudang',
    subtitle: 'Inventory Control',
  },
};

// ─── SHARED SIDEBAR COMPONENT ─────────────────────────────────────────────────
export default function Sidebar({ onLogout }) {
  const location = useLocation();
  const role = localStorage.getItem('role') || '';

  const brand = BRAND_BY_ROLE[role] || {
    title: 'SVSB Staff',
    subtitle: 'Logistics System',
  };

  // Custom active state logic
  const isItemActive = (itemTo) => {
    if (itemTo === '/manifests') {
      // Manifests remains active (blue) when navigating to transit creation or print layouts
      return (
        location.pathname === '/manifests' ||
        location.pathname === '/create-transit' ||
        location.pathname === '/print-transit-label'
      );
    }
    return location.pathname === itemTo;
  };

  const visibleNav = NAV_ITEMS.filter(item => item.allowedRoles.includes(role));

  return (
    <aside className="w-[240px] shrink-0 bg-[#F8F9FA] border-r border-gray-200 flex flex-col h-full font-sans">

      {/* ── User info (SVSB Brand Style) ── */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Epson automation style robotic arm icon */}
          <div className="w-12 h-12 bg-[#002060] text-white flex items-center justify-center rounded-2xl shrink-0 shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 20h7" />
              <path d="M5 20v-4" />
              <path d="M5 16l5-6" />
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
              <path d="M10 10l6-2" />
              <circle cx="16" cy="8" r="1.5" fill="currentColor" />
              <path d="M16 8v3" />
              <path d="M14 11h4" />
              <path d="M14 11v2" />
              <path d="M18 11v2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[#002060] font-bold text-sm leading-tight truncate">{brand.title}</p>
            <p className="text-gray-500 text-[10px] mt-0.5 font-medium truncate">{brand.subtitle}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {visibleNav.map(item => {
          const active = isItemActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-3 transition-colors rounded-md ${
                active ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="border-t border-gray-200 p-3 flex flex-col gap-1">
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 rounded-md w-full text-left font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
