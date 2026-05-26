import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Sidebar({ onLogout }) {
  const navItem = ({ isActive }) =>
    `px-4 py-3 text-sm font-medium flex items-center gap-3 transition-colors rounded-md ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <aside className="w-[240px] shrink-0 bg-[#F8F9FA] border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#002060] text-white text-xs font-bold flex items-center justify-center rounded">E</div>
          <div>
            <p className="text-[#002060] font-bold text-sm leading-tight">SVSB Supervisor</p>
            <p className="text-gray-500 text-[10px]">Problem Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <NavLink to="/dashboard" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/manifests" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Manifests
        </NavLink>
        <NavLink to="/anomalies" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Anomalies
        </NavLink>
        <NavLink to="/analytics" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </NavLink>
        <NavLink to="/users" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          User Management
        </NavLink>
      </nav>

      <div className="border-t border-gray-200 p-3 flex flex-col gap-1">
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 rounded-md w-full text-left font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">

      {/* 1. SIDEBAR WAJIB DI-RENDER SEJAJAR DENGAN KONTEN VIEW UTAMA */}
      <Sidebar onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
      }} />

      {/* 2. CONTAINER KONTEN (Adopsi 100% Struktur Layout Anomalies) */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── UNIFIED DESKTOP TOPBAR ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
          </div>

          {/* Search bar diletakkan di topbar untuk konsistensi UI */}
          <div className="flex-1 max-w-xs flex items-center border border-gray-300 bg-white px-3 gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Scan or Search DO / Vendor..."
              className="flex-1 py-2 text-sm outline-none bg-transparent"
            />
          </div>
        </header>
        <div className="w-full p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-[#002060] mb-4">Hi, Aris Setiawan!</h2>
          <p className="text-sm text-gray-600 mb-6">Station ID: INBOUND-1 | Role: Operator</p>

          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="bg-[#EBECEF] p-4 text-center rounded-sm border border-gray-200">
              <p className="text-xs text-gray-500 font-bold tracking-wider mb-1">PENDING</p>
              <p className="text-4xl font-bold text-[#002060]">01</p>
            </div>
            <div className="bg-[#EBECEF] p-4 text-center rounded-sm border border-gray-200">
              <p className="text-xs text-gray-500 font-bold tracking-wider mb-1">ACTIVE</p>
              <p className="text-4xl font-bold text-[#7F2B12]">02</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}