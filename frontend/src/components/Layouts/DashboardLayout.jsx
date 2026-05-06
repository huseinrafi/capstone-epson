import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FA] font-sans flex">
      
      {/* SIDEBAR - Desktop*/}
      <aside className="hidden md:flex flex-col w-64 bg-[#F8F9FA] border-r border-gray-200 fixed h-full z-20">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-[#002060] font-bold text-lg leading-tight">EPSON</h1>
          <h2 className="text-gray-600 text-xs tracking-widest">LOGISTICS SYSTEMS</h2>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-2 px-4">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `px-4 py-3 text-sm font-medium rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <span>📊</span> Dashboard
          </NavLink>
          
          <NavLink 
            to="/manifests" 
            className={({ isActive }) => `px-4 py-3 text-sm font-medium rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <span>📋</span> Manifests
          </NavLink>
          
          <NavLink 
            to="/anomalies" 
            className={({ isActive }) => `px-4 py-3 text-sm font-medium rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <span>⚠️</span> Anomalies
          </NavLink>
          
          <NavLink 
            to="/analytics" 
            className={({ isActive }) => `px-4 py-3 text-sm font-medium rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <span>📈</span> Analytics
          </NavLink>
          
          <NavLink 
            to="/users" 
            className={({ isActive }) => `px-4 py-3 text-sm font-medium rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <span>👥</span> User Management
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm font-medium flex items-center gap-3 rounded-md">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col md:ml-64 w-full">
        
        {/* TOP NAVBAR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 fixed w-full md:w-[calc(100%-16rem)] z-10">
          {/* Logo Mobile (Tampil jika di mobile) */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-[#002060] font-bold">EPSON</span>
          </div>
          
          {/* Page Title Desktop */}
          <h1 className="hidden md:block text-[#002060] font-bold uppercase tracking-wide">DASHBOARD</h1>

          {/* Topbar Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex items-center bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
              <span className="text-gray-400 text-sm mr-2">🔍</span>
              <input type="text" placeholder="Scan or search DO / Vendor..." className="bg-transparent border-none focus:outline-none text-sm w-48" />
            </div>
            <button className="text-gray-500 hover:text-[#002060]">🔔</button>
            <div className="w-8 h-8 bg-gray-300 rounded-full border border-gray-400"></div>
          </div>
        </header>

        {/* DYNAMIC CONTENT AREA */}
        <main className="flex-1 pt-16 pb-20 md:pb-6 p-4 md:p-8 overflow-y-auto">
          {/* Komponen halaman spesifik akan dirender di sini */}
          <Outlet />
        </main>
      </div>

      {/* BOTTOM NAVIGATION - Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-[#002060] text-white flex justify-around items-center border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <Link to="/inbound" className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F]">
          <span className="text-lg">📦</span>
          <span className="text-[10px] font-medium mt-1">INBOUND</span>
        </Link>
        <Link to="/transit" className="flex flex-col items-center justify-center w-full h-full hover:bg-blue-900 transition-colors text-gray-300">
          <span className="text-lg">🚚</span>
          <span className="text-[10px] font-medium mt-1">TRANSIT</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full hover:bg-blue-900 transition-colors text-gray-300">
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-medium mt-1">PROFILE</span>
        </Link>
      </nav>

    </div>
  );
}