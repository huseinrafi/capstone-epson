import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function ManifestQueue() {
    const navigate = useNavigate();
    const location = useLocation();
    const [queue, setQueue] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const userStr = localStorage.getItem('user');
    const userName = userStr ? JSON.parse(userStr).name : 'Operator';

    const fetchQueueData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/queue`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setQueue(result.data.data);
            } else {
                setError(result.message || 'Gagal mengambil data antrian');
            }
        } catch (err) {
            console.error(err);
            setError('Koneksi ke server gagal.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueueData();
    }, [location.key, fetchQueueData]);

    const pendingCount = queue.filter(i => i.status === 'PENDING').length;
    const activeCount = queue.filter(i => i.status === 'IN_PROGRESS' || i.status === 'HOLD_INBOUND').length;

    const handleStartScan = async (doId, currentStatus) => {
        if (currentStatus === 'IN_PROGRESS' || currentStatus === 'HOLD_INBOUND') {
            navigate(`/scanner/${doId}`);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/delivery-orders/${doId}/inbound/start`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const result = await response.json();
            if (response.ok && result.success) {
                navigate(`/scanner/${doId}`);
            } else {
                alert(result.message || 'Gagal memulai sesi scan di server.');
            }
        } catch (err) {
            console.error(err);
            alert('Koneksi ke server gagal.');
        }
    };

    const renderCard = (item) => {
        const isInProgress = item.status === 'IN_PROGRESS';
        const isFlagged = item.status === 'HOLD_INBOUND';
        const isPending = item.status === 'PENDING';

        const progressPercent = item.expected_total > 0
            ? Math.min(Math.round((item.scanned_total / item.expected_total) * 100), 100)
            : 0;

        // ── IN_PROGRESS card (biru) ──────────────────────────────────────
        if (isInProgress) {
            return (
                <div key={item.id} className="bg-white border-2 border-[#002060] shadow-sm mb-4 overflow-hidden">
                    {/* Header biru */}
                    <div className="bg-[#002060] px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white text-xs font-bold tracking-wider">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>IN_PROGRESS</span>
                        </div>
                        <span className="text-blue-200 text-xs font-bold tracking-wider">PRIORITY: HIGH</span>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">DOCUMENT NUMBER</p>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">{item.do_number}</h2>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center rounded">
                                <svg className="w-5 h-5 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{item.vendor?.name || 'Unknown Vendor'}</p>
                                <p className="text-xs text-gray-500">
                                    ETA: {item.started_at
                                        ? new Date(item.started_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' | ' + new Date(item.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                        : new Date(item.created_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-sm text-gray-700">Scanned Items</span>
                                <span className="text-sm">
                                    <span className="text-[#002060] font-bold">{item.scanned_total}</span>
                                    <span className="text-gray-500"> / {item.expected_total}</span>
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#002060] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>

                        <button
                            onClick={() => handleStartScan(item.id, item.status)}
                            className="w-full bg-[#002060] text-white py-3 text-sm font-bold flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            CONTINUE SCANNING
                        </button>
                    </div>
                </div>
            );
        }

        // ── PENDING card (putih/outline) ─────────────────────────────────
        if (isPending) {
            return (
                <div key={item.id} className="bg-white border border-gray-300 shadow-sm mb-4 overflow-hidden">
                    {/* Header abu */}
                    <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold tracking-wider">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>PENDING</span>
                        </div>
                        <span className="text-gray-400 text-xs font-bold tracking-wider">AWAITING UNLOAD</span>
                    </div>

                    {/* Body compact */}
                    <div className="p-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{item.do_number}</h2>
                        <p className="text-sm text-gray-700 font-medium">{item.vendor?.name || 'Unknown Vendor'}</p>
                        <p className="text-xs text-gray-500 mb-4">
                            Date: {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </p>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-500">Expected</span>
                            <span className="text-sm font-bold text-gray-700">{item.expected_total} Units</span>
                        </div>

                        <button
                            onClick={() => handleStartScan(item.id, item.status)}
                            className="w-full bg-white border-2 border-[#002060] text-[#002060] py-2.5 text-sm font-bold flex justify-center items-center gap-2 hover:bg-blue-50 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            START SCANNING
                        </button>
                    </div>
                </div>
            );
        }

        // ── HOLD_INBOUND / FLAGGED card (merah gelap) ────────────────────
        if (isFlagged) {
            return (
                <div key={item.id} className="bg-white border-2 border-[#7c1d04] shadow-sm mb-4 overflow-hidden">
                    {/* Header merah gelap */}
                    <div className="bg-[#7c1d04] px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white text-xs font-bold tracking-wider">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>IN_PROGRESS (FLAGGED)</span>
                        </div>
                        <span className="text-red-300 text-xs font-bold tracking-wider text-right">DISCREPANCY<br/>DETECTED</span>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">DOCUMENT NUMBER</p>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">{item.do_number}</h2>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-50 border border-red-100 flex items-center justify-center rounded">
                                <svg className="w-5 h-5 text-[#7c1d04]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{item.vendor?.name || 'Unknown Vendor'}</p>
                                <p className="text-xs text-gray-500">
                                    Date: {new Date(item.created_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-sm text-gray-700">Scanned Items</span>
                                <span className="text-sm">
                                    <span className="text-[#7c1d04] font-bold">{item.scanned_total}</span>
                                    <span className="text-gray-500"> / {item.expected_total}</span>
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7c1d04] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>

                        <button
                            onClick={() => handleStartScan(item.id, item.status)}
                            className="w-full bg-[#7c1d04] text-white py-3 text-sm font-bold flex justify-center items-center gap-2 hover:bg-red-900 transition-colors border border-red-900"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            REVIEW ISSUES
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#F8F9FA] font-sans pb-20">

            {/* HEADER */}
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

            {/* GREETING & SUMMARY */}
            <div className="px-4 py-2">
                <h2 className="text-2xl font-bold text-[#002060]">Hi, {userName}!</h2>
                <p className="text-gray-500 text-sm mb-4">Station ID: INBOUND-1 | Role: Operator</p>

                <div className="flex bg-[#EFEFF4] rounded border border-gray-200">
                    <div className="flex-1 p-3 text-center border-r border-gray-300">
                        <p className="text-[10px] font-bold text-gray-500 tracking-wider">PENDING</p>
                        <p className="text-3xl font-bold text-[#002060]">{pendingCount.toString().padStart(2, '0')}</p>
                    </div>
                    <div className="flex-1 p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-500 tracking-wider">ACTIVE</p>
                        <p className="text-3xl font-bold text-[#7c1d04]">{activeCount.toString().padStart(2, '0')}</p>
                    </div>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="px-4 py-3">
                <div className="flex border border-[#002060] bg-white">
                    <div className="flex items-center pl-3 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search DO Number"
                        className="flex-1 px-3 py-2 outline-none text-gray-700 text-sm"
                    />
                    <button className="bg-[#002060] text-white px-4 py-2 font-semibold text-sm">SEARCH</button>
                </div>
            </div>

            {/* QUEUE LIST */}
            <div className="px-4 flex-1">
                {isLoading ? (
                    <div className="text-center py-10 text-[#002060] font-bold animate-pulse">Memuat Data...</div>
                ) : error ? (
                    <div className="bg-red-100 text-red-700 p-4 text-center border border-red-200 rounded">{error}</div>
                ) : queue.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">Tidak ada antrian DO saat ini.</div>
                ) : (
                    queue.map(item => renderCard(item))
                )}
            </div>

            {/* FAB */}
            <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#002060] text-white rounded shadow-lg flex items-center justify-center border-2 border-white z-30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center z-20">
                <Link to="/inbound" className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F] text-white">
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