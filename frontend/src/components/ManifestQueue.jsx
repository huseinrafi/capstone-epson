import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function ManifestQueue() {
    const navigate = useNavigate();
    const location = useLocation(); // ✅ FIX 2: deteksi kembali ke halaman ini
    const [queue, setQueue] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const userStr = localStorage.getItem('user');
    const userName = userStr ? JSON.parse(userStr).name : 'Operator';

    // ✅ FIX 2: useCallback agar bisa dipanggil dari useEffect manapun
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
            console.err(err);
            setError('Koneksi ke server gagal.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ✅ FIX 2: fetch ulang setiap kali location berubah (kembali dari scanner)
    useEffect(() => {
        fetchQueueData();
    }, [location.key, fetchQueueData]);

    const pendingCount = queue.filter(i => i.status === 'PENDING').length;
    const activeCount = queue.filter(i => i.status === 'IN_PROGRESS' || i.status === 'HOLD_INBOUND').length;

    const handleStartScan = async (doId, currentStatus) => {
        const token = localStorage.getItem('token');

        // HOLD_INBOUND → fetch anomaly aktif, arahkan ke CaptureEvidence
        if (currentStatus === 'HOLD_INBOUND') {
            try {
                const doRes = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${doId}`, {
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                const doResult = await doRes.json();
                const doNumber = doResult.data?.do_number || doId;

                // Ambil anomaly PENDING_REVIEW untuk DO ini dari data DO (sekarang anomalies di-load di backend)
                const anomalies = doResult.data?.anomalies || [];
                const activeAnomaly = anomalies.find(a => a.status === 'PENDING_REVIEW');

                // Jika sudah ada evidence, langsung arahkan ke halaman waiting approval
                if (activeAnomaly && activeAnomaly.evidences && activeAnomaly.evidences.length > 0) {
                    navigate(`/waiting-approval/${doId}`, { state: { doNumber } });
                    return;
                }

                navigate(`/capture-evidence/${doId}`, {
                    state: {
                        anomalyId: activeAnomaly?.id,
                        anomalyType: activeAnomaly?.discrepancy_type || 'UNKNOWN',
                        doNumber: doNumber,
                        scannedBarcode: activeAnomaly?.affected_sku,
                        affectedSku: activeAnomaly?.affected_sku,
                        expectedQty: activeAnomaly?.expected_qty,
                        actualQty: activeAnomaly?.actual_qty,
                        evidenceUploadUrl: activeAnomaly ? `/api/v1/anomalies/${activeAnomaly.id}/evidences` : null,
                        expectedItem: null,
                    }
                });
            } catch (err) {
                console.error(err);
                alert('Gagal memuat data anomali.');
            }
            return;
        }

        // IN_PROGRESS → langsung ke scanner
        if (currentStatus === 'IN_PROGRESS') {
            navigate(`/scanner/${doId}`);
            return;
        }

        // PENDING → start scan dulu
        try {
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

    // Fungsi untuk render desain kartu dinamis berdasarkan status
    const renderCard = (item) => {
        const isPending = item.status === 'PENDING';
        const isFlagged = item.status === 'HOLD_INBOUND';
        // const isProgress = item.status === 'IN_PROGRESS';

        let headerBgClass = 'bg-[#002060]';
        let headerTextClass = 'text-white';
        let headerTitle = 'IN_PROGRESS';
        let headerTag = 'PRIORITY: NORMAL';
        let buttonStyle = 'bg-[#002060] text-white hover:bg-blue-900';
        let buttonText = 'CONTINUE SCANNING';

        if (isPending) {
            headerBgClass = 'bg-gray-200';
            headerTextClass = 'text-gray-600';
            headerTitle = 'PENDING';
            headerTag = 'AWAITING UNLOAD';
            buttonStyle = 'bg-transparent border-2 border-[#002060] text-[#002060] hover:bg-blue-50';
            buttonText = 'START SCANNING';
        } else if (isFlagged) {
            headerBgClass = 'bg-[#5c1c04]'; // Merah gelap bata
            headerTextClass = 'text-white';
            headerTitle = 'IN_PROGRESS (FLAGGED)';
            headerTag = 'DISCREPANCY DETECTED';
            buttonStyle = 'bg-[#5c1c04] text-white border border-red-900';
            buttonText = 'REVIEW ISSUES';
        }

        // Persentase progress bar
        const progressPercent = item.expected_total > 0
            ? Math.round((item.scanned_total / item.expected_total) * 100)
            : 0;

        return (
            <div key={item.id} className="bg-white border border-gray-200 shadow-sm mb-4">
                {/* Card Header */}
                <div className={`${headerBgClass} ${headerTextClass} px-3 py-2 flex justify-between items-center text-xs font-bold tracking-wider`}>
                    <div className="flex items-center gap-2">
                        {isFlagged ? <span>⚠️</span> : (isPending ? <span>🕒</span> : <span>📋</span>)}
                        <span>{headerTitle}</span>
                    </div>
                    <span className={isFlagged ? 'text-red-200' : (isPending ? 'text-gray-500' : 'text-blue-200')}>{headerTag}</span>
                </div>

                {/* Card Body */}
                <div className="p-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">DOCUMENT NUMBER</p>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">{item.do_number}</h2>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 flex items-center justify-center text-[#1A4B9F] rounded border border-blue-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{item.vendor?.name || 'Unknown Vendor'}</p>
                            <p className="text-xs text-gray-500">Date: {new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="mb-4">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm text-gray-700">Scanned Items</span>
                            <span className="text-sm text-gray-500"><span className={isFlagged ? 'text-[#5c1c04] font-bold' : 'text-[#002060] font-bold'}>{item.scanned_total}</span> / {item.expected_total}</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${isFlagged ? 'bg-[#5c1c04]' : 'bg-[#002060]'}`} style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => handleStartScan (item.id, item.status)}
                        className={`w-full py-2.5 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${buttonStyle}`}
                    >
                        {isFlagged ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        )}
                        {buttonText}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#F8F9FA] font-sans pb-20">

            {/* HEADER */}
            <header className="flex items-center justify-between p-4 bg-[#F8F9FA]">
                <button className="text-[#002060]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="text-[#002060] font-bold tracking-wider">EPSON LOGISTICS</h1>
                <button className="text-[#002060]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </button>
            </header>

            {/* GREETING & SUMMARY */}
            <div className="px-4 py-2">
                <h2 className="text-2xl font-bold text-[#002060]">Hi, {userName}!</h2>
                <p className="text-gray-600 text-sm mb-4">Station ID: INBOUND-1 | Role: Operator</p>

                <div className="flex bg-[#EFEFF4] rounded-md border border-gray-200">
                    <div className="flex-1 p-3 text-center border-r border-gray-300">
                        <p className="text-[10px] font-bold text-gray-500 tracking-wider">PENDING</p>
                        <p className="text-3xl font-bold text-[#002060]">{pendingCount.toString().padStart(2, '0')}</p>
                    </div>
                    <div className="flex-1 p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-500 tracking-wider">ACTIVE</p>
                        <p className="text-3xl font-bold text-[#5c1c04]">{activeCount.toString().padStart(2, '0')}</p>
                    </div>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="pl-2 pr-1 py-4">
                <div className="flex border border-[#002060] bg-white">
                    <div className="flex items-center pl-3 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input type="text" placeholder="Search DO Number" className="flex-1 py-2 outline-none text-gray-700" />
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

            {/* FAB (Floating Action Button) */}
            <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#002060] text-white rounded-md shadow-lg flex items-center justify-center border-2 border-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center z-20 pb-safe">
                <Link to="/inbound" className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F] text-white">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[10px] font-bold tracking-wider">INBOUND</span>
                </Link>
                <Link to="/transit" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    <span className="text-[10px] font-bold tracking-wider">TRANSIT</span>
                </Link>
                <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:bg-gray-50">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="text-[10px] font-bold tracking-wider">PROFILE</span>
                </Link>
            </nav>

        </div>
    );
}