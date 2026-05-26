import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// ─── ROLE LABEL ───────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  operator_checker: 'Operator Checker',
  admin_gudang:     'Admin Gudang',
  supervisor:       'Supervisor',
  manajer:          'Manajer',
};

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        enabled ? 'bg-[#002060]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();

  // User data dari localStorage
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('ENGLISH');
  const [darkMode, setDarkMode] = useState(false);
  const [haptic, setHaptic] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Load preferences
    setLanguage(localStorage.getItem('pref_language') || 'ENGLISH');
    setDarkMode(localStorage.getItem('pref_dark') === 'true');
    setHaptic(localStorage.getItem('pref_haptic') !== 'false');
  }, []);

  const handleLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('pref_language', lang);
  };

  const handleDark = (val) => {
    setDarkMode(val);
    localStorage.setItem('pref_dark', String(val));
  };

  const handleHaptic = (val) => {
    setHaptic(val);
    localStorage.setItem('pref_haptic', String(val));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // Derived display values
  const displayName = user?.name || 'Operator';
  const userId = user?.id ? `OP-${String(user.id).slice(-4).toUpperCase()}` : 'OP-0000';
  const roleSlug = localStorage.getItem('role') || user?.role?.slug || '';
  const roleLabel = ROLE_LABEL[roleSlug] || roleSlug || 'Operator';
  // Inisial untuk avatar placeholder
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F0F2F5] font-sans pb-24">

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button className="text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide text-sm">EPSON LOGISTICS</h1>
        <button className="text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      <div className="flex-1 px-4 pt-5 flex flex-col gap-4">

        {/* ── OPERATOR IDENTITY CARD ── */}
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Blue title bar */}
          <div className="bg-[#002060] px-4 py-2">
            <p className="text-white text-[10px] font-bold tracking-widest">OPERATOR IDENTITY</p>
          </div>

          <div className="px-5 py-6 flex flex-col items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#002060] flex items-center justify-center shadow-md overflow-hidden border-2 border-white">
                {/* Placeholder avatar dengan inisial */}
                <span className="text-white text-2xl font-bold">{initials}</span>
              </div>
              {/* Badge verified */}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Name & ID */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#002060]">
                {displayName} ({userId})
              </h2>
            </div>

            {/* Role badge */}
            <div className="flex items-center gap-1.5 border border-gray-300 px-4 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">{roleLabel}</span>
            </div>

            {/* Station badge */}
            <div className="flex items-center gap-1.5 border border-gray-300 px-4 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 font-mono">WH-SEC-A4</span>
            </div>
          </div>
        </div>

        {/* ── SYSTEM LANGUAGE ── */}
        <div className="bg-white border border-gray-200 shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-bold text-gray-700 tracking-wider">SYSTEM LANGUAGE</span>
          </div>

          <div className="flex">
            <button
              onClick={() => handleLanguage('ENGLISH')}
              className={`flex-1 py-2.5 text-sm font-bold tracking-wider transition-colors ${
                language === 'ENGLISH'
                  ? 'bg-[#002060] text-white'
                  : 'bg-white text-gray-600 border border-gray-300'
              }`}
            >
              ENGLISH
            </button>
            <button
              onClick={() => handleLanguage('INDONESIAN')}
              className={`flex-1 py-2.5 text-sm font-bold tracking-wider transition-colors ${
                language === 'INDONESIAN'
                  ? 'bg-[#002060] text-white'
                  : 'bg-white text-gray-600 border border-gray-300 border-l-0'
              }`}
            >
              INDONESIAN
            </button>
          </div>
        </div>

        {/* ── DARK MODE ── */}
        <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">DARK MODE</p>
            <p className="text-xs text-gray-500">Optimize for low light</p>
          </div>
          <Toggle enabled={darkMode} onChange={handleDark} />
        </div>

        {/* ── HAPTIC FEEDBACK ── */}
        <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">HAPTIC FEEDBACK</p>
            <p className="text-xs text-gray-500">Vibrate on successful scan</p>
          </div>
          <Toggle enabled={haptic} onChange={handleHaptic} />
        </div>

        {/* ── APP INFO ── */}
        <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2.5">
          {[
            { label: 'APP VERSION',  value: 'v4.12.0-PROD' },
            { label: 'DEVICE ID',   value: 'HHT-EPS-9221' },
            { label: 'LAST SYNC',   value: new Date().toISOString().slice(0, 16).replace('T', ' ') },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-500 tracking-widest">{row.label}</span>
              <span className="text-xs font-mono text-gray-700">{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── LOGOUT ── */}
        <button
          onClick={handleLogout}
          className="w-full bg-[#C0392B] text-white py-4 font-bold tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-red-800 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          LOGOUT
        </button>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 tracking-widest pb-2">
          PT. INDONESIA EPSON INDUSTRY © 2023
        </p>
      </div>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <Link to="/inbound" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">INBOUND</span>
        </Link>
        <Link to="/transit" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">TRANSIT</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F] text-white">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">PROFILE</span>
        </Link>
      </nav>
    </div>
  );
}