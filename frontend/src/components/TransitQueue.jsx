import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const STATUS_CARD = {
  TRANSIT_INIT: {
    headerBg: 'bg-[#002060]', headerText: 'text-white',
    title: 'READY TO SCAN (OUT)', tag: 'AWAITING PICKUP',
    progressColor: 'bg-[#002060]',
    btnStyle: 'bg-[#002060] text-white hover:bg-blue-900',
    btnLabel: 'START SCANNING OUT',
    tagColor: 'text-blue-200',
  },
  IN_TRANSIT: {
    headerBg: 'bg-[#1A4B9F]', headerText: 'text-white',
    title: 'ARRIVED & SCAN (IN)', tag: 'MOVING TO DESTINATION',
    progressColor: 'bg-[#1A4B9F]',
    btnStyle: 'bg-[#1A4B9F] text-white hover:bg-blue-800',
    btnLabel: 'START SCANNING IN',
    tagColor: 'text-blue-200',
  },
  INVESTIGATION_REQUIRED: {
    headerBg: 'bg-[#7c1d04]', headerText: 'text-white',
    title: 'FLAGGED', tag: 'DISCREPANCY DETECTED',
    progressColor: 'bg-[#7c1d04]',
    btnStyle: 'bg-[#7c1d04] text-white border border-red-900',
    btnLabel: 'REVIEW ISSUES',
    tagColor: 'text-red-300',
  },
};

export default function TransitQueue() {
  const navigate = useNavigate();
  const location = useLocation();

  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const userStr = localStorage.getItem('user');
  const userName = userStr ? JSON.parse(userStr).name : 'Operator';

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      // Perbaikan Celah 1: Ambil data tanpa query string status yang merusak filter Eloquent teman Anda
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/transits?per_page=100`,
        { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } }
      );
      const result = await res.json();
      
      if (res.ok && result.success) {
        // Ambil data array mentah dari struktur pembungkus pagination Laravel
        const rawItems = result.data.data || result.data || [];
        
        // Lakukan filter status secara lokal di sisi Frontend agar aman
        const allowedStatus = ['TRANSIT_INIT', 'IN_TRANSIT', 'INVESTIGATION_REQUIRED'];
        const filteredItems = rawItems.filter(item => allowedStatus.includes(item.status));

        // Sorting prioritas kartu tugas
        const order = { TRANSIT_INIT: 1, IN_TRANSIT: 2, INVESTIGATION_REQUIRED: 3 };
        filteredItems.sort((a, b) => (order[a.status] || 4) - (order[b.status] || 4));
        
        setQueue(filteredItems);
      } else {
        setError(result.message || 'Gagal memuat antrian transit.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi server gagal.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [location.key, fetchQueue]);

  // Perbaikan Celah 3: Gunakan fallback penamaan relasi camelCase vs snake_case
  const filtered = queue.filter(t => {
    const originName = t.origin_warehouse?.name || t.originWarehouse?.name || '';
    const destName = t.destination_warehouse?.name || t.destinationWarehouse?.name || t.dest_warehouse?.name || '';
    
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.transit_number || '').toLowerCase().includes(q) ||
           originName.toLowerCase().includes(q) ||
           destName.toLowerCase().includes(q);
  });

  const readyCount = queue.filter(t => t.status === 'TRANSIT_INIT').length;
  const activeCount = queue.filter(t => t.status === 'IN_TRANSIT').length;
  const flaggedCount = queue.filter(t => t.status === 'INVESTIGATION_REQUIRED').length;

  const handleAction = (transit) => {
    if (transit.status === 'TRANSIT_INIT' || transit.status === 'IN_TRANSIT') {
      navigate(`/transit-scanner/${transit.id}`);
    } else if (transit.status === 'INVESTIGATION_REQUIRED') {
      const originName = transit.origin_warehouse?.name || transit.originWarehouse?.name || '—';
      const destName = transit.destination_warehouse?.name || transit.destinationWarehouse?.name || '—';
      
      navigate(`/capture-evidence/${transit.id}`, {
        state: {
          anomalyId: null,
          anomalyType: 'MISSING',
          doNumber: transit.transit_number,
          isTransit: true,
          originWarehouse: originName,
          destWarehouse: destName,
        }
      });
    }
  };

  const renderCard = (transit) => {
    const s = STATUS_CARD[transit.status] || STATUS_CARD.TRANSIT_INIT;
    
    // Perbaikan Celah 3: Amankan pemanggilan nama gudang dari potensi camelCase JSON Laravel
    const originName = transit.origin_warehouse?.name || transit.originWarehouse?.name || '—';
    const destName = transit.destination_warehouse?.name || transit.destinationWarehouse?.name || transit.dest_warehouse?.name || '—';

    // Perbaikan Celah 2: Kondisi hitungan dinamis (TRANSIT_INIT membaca sent_total, IN_TRANSIT membaca received_total)
    const isCheckingIn = transit.status === 'IN_TRANSIT';
    const currentScannedAmount = isCheckingIn ? (transit.received_total || 0) : (transit.sent_total || 0);
    
    const progress = transit.expected_total > 0
      ? Math.min(Math.round((currentScannedAmount / transit.expected_total) * 100), 100)
      : 0;

    return (
      <div key={transit.id} className="bg-white border border-gray-200 shadow-sm mb-4">
        {/* Header Status */}
        <div className={`${s.headerBg} ${s.headerText} px-3 py-2 flex justify-between items-center text-xs font-bold tracking-wider`}>
          <span>{s.title}</span>
          <span className={`${s.tagColor} text-[10px]`}>{s.tag}</span>
        </div>

        <div className="p-4">
          <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">TRANSIT NUMBER</p>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{transit.transit_number}</h2>

          {/* Rute Pergerakan */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 mb-4">
            <div className="flex-1 text-center">
              <p className="text-[9px] text-gray-400 font-bold tracking-wider">ORIGIN</p>
              <p className="text-xs font-bold text-[#002060]">{originName}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex-1 text-center">
              <p className="text-[9px] text-gray-400 font-bold tracking-wider">DESTINATION</p>
              <p className="text-xs font-bold text-[#002060]">{destName}</p>
            </div>
          </div>

          {/* Dinamika Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-gray-500 font-bold tracking-wider">
                {isCheckingIn ? 'RECEIVED PROGRESS' : 'LOADING PROGRESS'}
              </span>
              <span className="text-sm">
                <span className={`font-bold ${transit.status === 'INVESTIGATION_REQUIRED' ? 'text-[#7c1d04]' : 'text-[#002060]'}`}>
                  {currentScannedAmount}
                </span>
                <span className="text-gray-500"> / {transit.expected_total}</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${s.progressColor} transition-all duration-300`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <button
            onClick={() => handleAction(transit)}
            className={`w-full py-2.5 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${s.btnStyle}`}
          >
            {s.btnLabel}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans pb-20">
      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 bg-[#F8F9FA]">
        <button className="text-[#002060]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wider">EPSON LOGISTICS</h1>
        <button className="text-[#002060]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      <div className="px-4 py-2">
        <h2 className="text-2xl font-bold text-[#002060]">Hi, {userName}!</h2>
        <p className="text-gray-500 text-sm mb-4">Role: Material Handler</p>

        {/* KPI MATRIX BANNER */}
        <div className="flex bg-[#EFEFF4] border border-gray-200 mb-4">
          <div className="flex-1 p-3 text-center border-r border-gray-300">
            <p className="text-[10px] font-bold text-gray-500 tracking-wider">READY</p>
            <p className="text-3xl font-bold text-[#002060]">{String(readyCount).padStart(2,'0')}</p>
          </div>
          <div className="flex-1 p-3 text-center border-r border-gray-300">
            <p className="text-[10px] font-bold text-gray-500 tracking-wider">ACTIVE</p>
            <p className="text-3xl font-bold text-[#1A4B9F]">{String(activeCount).padStart(2,'0')}</p>
          </div>
          <div className="flex-1 p-3 text-center">
            <p className="text-[10px] font-bold text-gray-500 tracking-wider">FLAGGED</p>
            <p className="text-3xl font-bold text-[#7c1d04]">{String(flaggedCount).padStart(2,'0')}</p>
          </div>
        </div>

        {/* SEARCH BOX */}
        <div className="flex border border-[#002060] bg-white mb-4">
          <div className="flex items-center pl-3 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Transit Number..."
            className="flex-1 px-3 py-2 outline-none text-gray-700 text-sm"
          />
        </div>
      </div>

      {/* CORE QUEUE BUILDER */}
      <div className="px-4 flex-1">
        {isLoading ? (
          <div className="text-center py-10 text-[#002060] font-bold animate-pulse">Memuat Data Antrean...</div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 text-center border border-red-200">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Tidak ada surat jalan transit saat ini.</div>
        ) : (
          filtered.map(renderCard)
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <Link to="/inbound" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">INBOUND</span>
        </Link>
        <Link to="/transit" className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F] text-white">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">TRANSIT</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">PROFILE</span>
        </Link>
      </nav>
    </div>
  );
}