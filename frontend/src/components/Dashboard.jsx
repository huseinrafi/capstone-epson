import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const STATUS_STYLE = {
  PENDING:      'bg-gray-100 text-gray-600 border border-gray-300',
  IN_PROGRESS:  'bg-blue-100 text-blue-700 border border-blue-300',
  COMPLETED:    'bg-green-100 text-green-700 border border-green-300',
  HOLD_INBOUND: 'bg-red-100 text-red-700 border border-red-300',
  RETURNED:     'bg-orange-100 text-orange-700 border border-orange-300',
};



export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [kpi, setKpi] = useState({ pending: 0, inProgress: 0, completed: 0, anomalies: 0 });

  // Debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch search results dari backend
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const token = localStorage.getItem('token');
    setIsSearching(true);
    setShowDropdown(true);
    fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?search=${encodeURIComponent(debouncedSearch)}&per_page=8`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) setSearchResults(result.data.data || []);
      })
      .catch(console.error)
      .finally(() => setIsSearching(false));
  }, [debouncedSearch]);

  // Fetch KPI counts
  const fetchKpi = useCallback(async () => {
    const token = localStorage.getItem('token');
    const h = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
    try {
      const [pRes, ipRes, cRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=PENDING&per_page=1`, { headers: h }),
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=IN_PROGRESS&per_page=1`, { headers: h }),
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=COMPLETED&per_page=1`, { headers: h }),
      ]);
      const [pD, ipD, cD] = await Promise.all([pRes.json(), ipRes.json(), cRes.json()]);
      setKpi({
        pending:    pD.success  ? (pD.data?.total  ?? 0) : 0,
        inProgress: ipD.success ? (ipD.data?.total ?? 0) : 0,
        completed:  cD.success  ? (cD.data?.total  ?? 0) : 0,
      });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchKpi(); }, [fetchKpi]);

  const role = localStorage.getItem('role') || 'Operator';

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">
      <Sidebar onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
      }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* â”€â”€ UNIFIED DESKTOP TOPBAR â”€â”€ */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Dashboard</h1>
            <p className="text-[11px] text-gray-500">Overview & quick search across all manifests.</p>
          </div>

          {/* Search bar dengan dropdown results */}
          <div className="flex-1 max-w-sm relative">
            <div className="flex items-center border border-gray-300 bg-white px-3 gap-2">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-[#002060] border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Scan or Search DO Number / Vendor..."
                className="flex-1 py-2 text-sm outline-none bg-transparent"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                  className="text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown hasil pencarian */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg z-50 max-h-72 overflow-y-auto mt-0.5">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="px-4 py-3 text-sm text-gray-400 italic text-center">Tidak ada manifest ditemukan.</div>
                ) : (
                  searchResults.map(m => (
                    <button
                      key={m.id}
                      onMouseDown={() => navigate('/manifests')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-[#002060] text-sm">{m.do_number}</p>
                        <p className="text-xs text-gray-500">{m.vendor?.name || 'â€”'} Â· {m.warehouse?.name || 'â€”'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[m.status] || 'bg-gray-100 text-gray-600'}`}>
                        {m.status?.replace('_', ' ')}
                      </span>
                    </button>
                  ))
                )}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <button onMouseDown={() => navigate('/manifests')}
                    className="text-xs text-[#002060] font-bold hover:underline">
                    Lihat semua manifest â†’
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="w-full p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-[#002060] mb-1">Selamat Datang!</h2>
          <p className="text-sm text-gray-500 mb-6 capitalize">Role: {role.replace('_', ' ')}</p>

          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            <div className="bg-white border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">PENDING</p>
              <p className="text-4xl font-bold text-gray-700">{kpi.pending}</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">IN PROGRESS</p>
              <p className="text-4xl font-bold text-[#002060]">{kpi.inProgress}</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">COMPLETED</p>
              <p className="text-4xl font-bold text-green-600">{kpi.completed}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
