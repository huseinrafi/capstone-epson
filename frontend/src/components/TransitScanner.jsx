import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useParams } from 'react-router-dom';

const scanStorageKey = (transitId) => `transit_recent_scans_${transitId}`;

export default function TransitScanner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const transitId = id;

  // State Manajemen Layout & Sinkronisasi Data
  const [scanStatus, setScanStatus] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [progress, setProgress] = useState({ scanned: 0, expected: 0 });
  const [transitNumber, setTransitNumber] = useState('Memuat...');
  const [transitData, setTransitData] = useState(null);
  const [doReady, setDoReady] = useState(false);
  const [doError, setDoError] = useState(null);
  const [showFinishPopup, setShowFinishPopup] = useState(false);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // State Kontrol Senter
  const [flashOn, setFlashOn] = useState(false);

  // Sinkronisasi Lapangan lewat Session Storage
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = sessionStorage.getItem(scanStorageKey(id));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const html5QrCode = useRef(null);
  const scanLock = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(scanStorageKey(transitId), JSON.stringify(recentScans));
    } catch (e) { console.error(e); }
  }, [recentScans, transitId]);

  // ─── AMBIL DETAIL DOKUMEN TRANSIT (DARI BACKEND ASLI) ──────────────────────
  const fetchTransitDetail = useCallback(async (isMounted = true) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/transits/${transitId}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        if (isMounted) setDoError(result.message || 'Gagal memuat data transit.');
        return;
      }

      const tData = result.data;
      if (isMounted) {
        setTransitData(tData);
        setTransitNumber(tData.transit_number || transitId);
        
        // Pembedaan Variabel Progress: INIT membaca sent_total, IN_TRANSIT membaca received_total
        const isCheckingIn = tData.status === 'IN_TRANSIT';
        setProgress({
          scanned: isCheckingIn ? (tData.received_total ?? 0) : (tData.sent_total ?? 0),
          expected: tData.expected_total ?? 0
        });

        // Validasi Status Pengamanan Alur
        if (tData.status === 'TRANSIT_INIT' || tData.status === 'IN_TRANSIT') {
          setDoReady(true);
        } else if (tData.status === 'INVESTIGATION_REQUIRED') {
          navigate(`/capture-evidence/${transitId}`, {
            replace: true,
            state: {
              anomalyId: null,
              anomalyType: 'MISSING',
              doNumber: tData.transit_number,
              isTransit: true,
              originWarehouse: tData.originWarehouse?.name || tData.origin_warehouse?.name,
              destWarehouse: tData.destinationWarehouse?.name || tData.destination_warehouse?.name || tData.dest_warehouse?.name,
            }
          });
        } else {
          setDoError(`Akses ditolak. Dokumen transit sudah berstatus: ${tData.status}`);
        }
      }
    } catch (err) {
      console.error(err);
      if (isMounted) setDoError('Koneksi ke server terputus.');
    }
  }, [transitId, navigate]);

  useEffect(() => {
    let isMounted = true;
    fetchTransitDetail(isMounted);
    return () => { isMounted = false; };
  }, [fetchTransitDetail]);

  // ─── INTERSEPT HARDWARE BACK BUTTON ANDROID ────────────────────────────────
  useEffect(() => {
    if (!doReady) return;

    window.history.pushState(null, null, window.location.pathname);

    const handleAndroidBackButton = (e) => {
      e.preventDefault();
      window.history.pushState(null, null, window.location.pathname);
      setShowExitPopup(true);
    };

    window.addEventListener('popstate', handleAndroidBackButton);
    return () => { window.removeEventListener('popstate', handleAndroidBackButton); };
  }, [doReady]);

  // ─── KAMERA KONTROL & SENTER NATIVE OVERRIDE ───────────────────────────────
  const stopCamera = useCallback(() => {
    if (html5QrCode.current) {
      try {
        html5QrCode.current.stop().then(() => html5QrCode.current.clear()).catch(() => { });
      } catch (e) { console.error(e); }
      html5QrCode.current = null;
    }
    setFlashOn(false);
  }, []);

  const toggleFlashlight = async () => {
    try {
      const nextFlashState = !flashOn;
      const videoElem = containerRef.current?.querySelector('video');

      if (videoElem && videoElem.srcObject) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};

        if (capabilities.torch || 'torch' in capabilities) {
          await track.applyConstraints({ advanced: [{ torch: nextFlashState }] });
          setFlashOn(nextFlashState);
          return;
        }
      }

      if (html5QrCode.current && html5QrCode.current.isScanning) {
        await html5QrCode.current.applyVideoConstraints({ advanced: [{ torch: nextFlashState }] });
        setFlashOn(nextFlashState);
      }
    } catch (err) {
      console.warn('Hardware torch tidak merespon:', err);
      alert('Senter gagal diaktifkan. Pastikan izin kamera aktif.');
    }
  };

  // Tombol Manual Issue (Floating Button Merah)
  const handleReportIssue = async () => {
    stopCamera();
    navigate(`/capture-evidence/${transitId}`, {
      state: {
        anomalyId: `manual-${transitId}`,
        anomalyType: 'MANUAL_ISSUE',
        doNumber: transitNumber,
        scannedBarcode: 'MANUAL TRANSIT RECONCILIATION EXCEPTION',
        isTransit: true,
        originWarehouse: transitData?.originWarehouse?.name || transitData?.origin_warehouse?.name,
        destWarehouse: transitData?.destinationWarehouse?.name || transitData?.destination_warehouse?.name || transitData?.dest_warehouse?.name,
        evidenceUploadUrl: `/api/v1/anomalies/manual-${transitId}/evidences`
      }
    });
  };

  // ─── LOGIKA PEMINDAIAN BARCODE BERDASARKAN STATUS DOKUMEN BACKEND ─────────
  const processBarcode = useCallback(async (barcodeText) => {
    if (!transitData) return;
    
    try {
      const token = localStorage.getItem('token');
      const isCheckingIn = transitData.status === 'IN_TRANSIT';

      // SELEKSI ENDPOINT ASLI: INIT lari ke scan-out, IN_TRANSIT lari ke scan-in
      const scanEndpoint = isCheckingIn
        ? `${import.meta.env.VITE_API_URL}/transits/${transitId}/scan-in`
        : `${import.meta.env.VITE_API_URL}/transits/${transitId}/scan-out`;

      const response = await fetch(scanEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ barcode: barcodeText }) // Mengirimkan key parameter "barcode"
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        setScanStatus('MATCH');
        setScanMessage(barcodeText);

        // Langsung paksa re-fetch detail ke database teman agar hitungan akumulasi akurat
        const freshRes = await fetch(`${import.meta.env.VITE_API_URL}/transits/${transitId}`, {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const freshResult = await freshRes.json();
        
        if (freshRes.ok && freshResult.success) {
          const updatedTransit = freshResult.data;
          setProgress({
            scanned: isCheckingIn ? (updatedTransit.received_total ?? 0) : (updatedTransit.sent_total ?? 0),
            expected: updatedTransit.expected_total ?? 0
          });
        }

        setRecentScans(prev => [{
          partName: barcodeText, sku: 'INTERNAL PART', sn: barcodeText, status: 'MATCH',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));

        setTimeout(() => {
          setScanStatus(null);
          scanLock.current = false;
          try { html5QrCode.current?.resume(); } catch (e) { console.error(e); }
        }, 2000);

      } else {
        // Penanganan Deteksi Anomali Lapangan (OVER / DUPLICATE dari scan-in teman)
        const anomalyData = result.data?.anomaly || result.anomaly;
        const evidenceUrl = result.data?.evidence_upload_url || result.evidence_upload_url;

        setRecentScans(prev => [{
          partName: barcodeText, sku: '', sn: '', status: 'OVER',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));

        setScanMessage(result.message || 'Anomali terdeteksi');
        setScanStatus('OVER');

        setTimeout(() => {
          stopCamera();
          navigate(`/capture-evidence/${transitId}`, {
            state: {
              anomalyId: anomalyData?.id || result.data?.anomaly_id || result.anomaly_id,
              anomalyType: 'OVER',
              doNumber: transitNumber,
              scannedBarcode: barcodeText,
              isTransit: true,
              originWarehouse: transitData?.originWarehouse?.name || transitData?.origin_warehouse?.name,
              destWarehouse: transitData?.destinationWarehouse?.name || transitData?.destination_warehouse?.name || transitData?.dest_warehouse?.name,
              evidenceUploadUrl: evidenceUrl || `/api/v1/anomalies/${anomalyData?.id || result.data?.anomaly_id}/evidences`,
            }
          });
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setScanStatus('ERROR');
      setScanMessage('Koneksi server gagal');
      setTimeout(() => {
        setScanStatus(null);
        scanLock.current = false;
        try { html5QrCode.current?.resume(); } catch (e) { console.error(e); }
      }, 2000);
    }
  }, [transitId, transitData, transitNumber, navigate, stopCamera, fetchTransitDetail]);

  // Inisialisasi Lifecycle Kamera HTML5QRCODE
  useEffect(() => {
    if (!doReady) return;
    let isMounted = true;
    html5QrCode.current = new Html5Qrcode('reader');

    const startCamera = async () => {
      try {
        await html5QrCode.current.start(
          { facingMode: 'environment' },
          { fps: 5 },
          async (decodedText) => {
            if (!isMounted || scanLock.current) return;
            scanLock.current = true;
            try { html5QrCode.current?.isScanning && html5QrCode.current.pause(true); } catch (e) { console.error(e); }
            await processBarcode(decodedText.trim().toUpperCase());
          },
          () => { }
        );
      } catch (err) { console.error('Kamera gagal:', err); }
    };

    const timer = setTimeout(startCamera, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [doReady, processBarcode, stopCamera]);

  // ─── SELEKSI LOGIKA TOMBOL SUBMIT DI BAWAH (DEPART VS COMPLETE) ───────────
  const handleFinishConfirm = async () => {
    setIsFinishing(true);
    try {
      const token = localStorage.getItem('token');
      const isCheckingIn = transitData.status === 'IN_TRANSIT';

      // SELEKSI ENDPOINT SUBMIT: INIT lari ke depart, IN_TRANSIT lari ke complete
      const actionEndpoint = isCheckingIn
        ? `${import.meta.env.VITE_API_URL}/transits/${transitId}/complete`
        : `${import.meta.env.VITE_API_URL}/transits/${transitId}/depart`;

      const response = await fetch(actionEndpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.removeItem(scanStorageKey(transitId));
        stopCamera();

        // Evaluasi Apakah Muncul Anomali Kurang (MISSING) setelah submit akhir teman Anda
        if (result.data?.status === 'INVESTIGATION_REQUIRED' || result.status === 'INVESTIGATION_REQUIRED' || result.data?.requires_evidence) {
          const anomalyObj = result.data?.anomaly || result.anomaly;
          navigate(`/capture-evidence/${transitId}`, {
            state: {
              anomalyId: anomalyObj?.id || result.data?.anomaly_id,
              anomalyType: 'MISSING',
              doNumber: transitNumber,
              scannedBarcode: 'PART QUANTITY MISSING',
              isTransit: true,
              originWarehouse: transitData?.originWarehouse?.name || transitData?.origin_warehouse?.name,
              destWarehouse: transitData?.destinationWarehouse?.name || transitData?.destination_warehouse?.name || transitData?.dest_warehouse?.name,
              evidenceUploadUrl: result.data?.evidence_upload_url || `/api/v1/anomalies/${anomalyObj?.id}/evidences`,
            }
          });
        } else {
          // Jika lulus normal, buang langsung ke antrean transit utama
          navigate('/transit');
        }
      } else {
        alert(result.message || 'Gagal mengeksekusi transisi dokumen.');
        setShowFinishPopup(false);
      }
    } catch (err) {
      console.error(err);
      alert('Koneksi server gagal.');
      setShowFinishPopup(false);
    } finally {
      setIsFinishing(false);
    }
  };

  const progressPercent = progress.expected > 0 ? Math.min((progress.scanned / progress.expected) * 100, 100) : 0;

  if (doError) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] items-center justify-center p-8 gap-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <p className="text-center text-gray-800 font-semibold">{doError}</p>
        <button onClick={() => navigate('/transit')} className="bg-[#002060] text-white px-6 py-3 font-bold rounded shadow">
          Kembali ke Antrian
        </button>
      </div>
    );
  }

  if (!doReady) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#002060] font-bold tracking-wide animate-pulse">Menyiapkan Sesi SVSB Transit...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans">
      
      {/* ─── HEADER BAR (COPAS INBOUND + SENTER) ──────────────────────────────── */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button onClick={() => setShowExitPopup(true)} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide uppercase text-sm">
          TRANSIT - {transitData?.status === 'IN_TRANSIT' ? 'SCAN IN' : 'SCAN OUT'}
        </h1>
        <button
          onClick={toggleFlashlight}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border shadow-sm active:scale-95 transition-all text-base ${
            flashOn ? 'bg-yellow-400 text-gray-900 border-yellow-500' : 'bg-gray-100 text-gray-500 border-gray-300'
          }`}
          title="Toggle Flashlight"
        >
          An-Senter 🔦
        </button>
      </header>

      {/* ─── TRANSIT INFO MUTASI CARD ────────────────────────────────────────── */}
      <div className="p-4">
        <div className="bg-white border-2 border-[#002060] p-4 shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider">TRANSIT NUMBER</p>
              <p className="text-lg font-bold text-[#002060]">{transitNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-bold tracking-wider">
                {transitData?.status === 'IN_TRANSIT' ? 'RECEIVED' : 'LOADED'}
              </p>
              <p className="text-lg font-bold text-gray-700">
                <span className="text-[#002060]">{progress.scanned}</span> / {progress.expected}
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#002060] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* ─── KAMERA AREA ─────────────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="w-full aspect-square bg-black border-4 border-[#002060] relative overflow-hidden">
          <div id="reader" ref={containerRef} className="absolute inset-0 z-0" />
          <div className="absolute inset-8 border-2 border-dashed border-white/40 z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1A4B9F]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1A4B9F]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1A4B9F]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1A4B9F]" />
            <div className="w-full h-0.5 bg-blue-400 absolute top-1/2 shadow-[0_0_8px_2px_rgba(59,130,246,0.7)] animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 w-full text-center z-10 bg-black/50 py-1">
            <p className="text-white text-[10px] tracking-widest uppercase">ALIGN INTERNAL BARCODE WITHIN FRAME</p>
          </div>
        </div>
      </div>

      {/* ─── CARDS FEEDBACK VISUAL ───────────────────────────────────────────── */}
      <div className="px-4 mt-3 min-h-[4.5rem]">
        {scanStatus === 'MATCH' && (
          <div className="bg-white border-2 border-[#28A745] p-3 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-[#28A745] flex items-center justify-center text-[#28A745] shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#28A745] font-bold text-xs tracking-wider">BOX VERIFIED</p>
              <p className="text-[#002060] font-bold text-base leading-tight break-all">{scanMessage}</p>
            </div>
          </div>
        )}
        {['MISMATCH', 'NOT_FOUND', 'OVER', 'ERROR'].includes(scanStatus) && (
          <div className="bg-white border-2 border-[#DC3545] p-3 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-[#DC3545] flex items-center justify-center text-[#DC3545] shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-[#DC3545] font-bold text-xs tracking-wider">ANOMALY DETECTED</p>
              <p className="text-red-900 font-semibold text-sm leading-tight break-all">{scanMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── LIVE HISTORY LIST PINDAIAN ──────────────────────────────────────── */}
      <div className="flex-1 px-4 mt-3 overflow-y-auto pb-24">
        <h3 className="text-[10px] text-gray-500 font-bold tracking-wider mb-2">
          RECENT SCANS {recentScans.length > 0 && <span className="text-[#002060]">({recentScans.length})</span>}
        </h3>
        {recentScans.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Belum ada komponen boks yang di-scan.</p>
        ) : (
          recentScans.map((scan, index) => (
            <div key={index} className="bg-white p-3 border border-gray-200 flex items-center gap-3 shadow-sm mb-2">
              <div className={`shrink-0 ${scan.status === 'MATCH' ? 'text-[#002060]' : 'text-[#DC3545]'}`}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="4" width="2" height="16" /><rect x="5" y="4" width="1" height="16" />
                  <rect x="7" y="4" width="2" height="16" /><rect x="10" y="4" width="1" height="16" />
                  <rect x="12" y="4" width="3" height="16" /><rect x="16" y="4" width="1" height="16" />
                  <rect x="18" y="4" width="2" height="16" /><rect x="21" y="4" width="1" height="16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{scan.partName}</p>
                <p className="text-xs text-gray-500">
                  {scan.sn ? `ID: ${scan.sn}` : '—'}
                  {scan.time && <span className="ml-2 text-gray-400">{scan.time}</span>}
                </p>
              </div>
              <span className={`text-sm font-bold shrink-0 ${scan.status === 'MATCH' ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                {scan.status === 'MATCH' ? 'OK' : 'ERR'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ─── DYNAMIC SUBMIT BOTTOM BAR (DEPART VS COMPLETE) ─────────────────── */}
      <div className="fixed bottom-0 w-full p-4 bg-white border-t border-gray-200 z-50">
        <button onClick={() => setShowFinishPopup(true)}
          className="w-full bg-[#002060] text-white py-3.5 font-bold tracking-widest text-xs uppercase flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {transitData?.status === 'IN_TRANSIT' ? 'Finish Scan & Complete' : 'Finish Scan & Depart'}
        </button>
      </div>

      {/* FLOATING EMERGENCY BUTTON */}
      <button onClick={handleReportIssue} className="fixed bottom-24 right-5 z-[60] w-14 h-14 rounded-full bg-red-600 text-white shadow-xl active:scale-95 transition flex items-center justify-center" title="Report Issue">
        <span className="text-2xl">⚠️</span>
      </button>

      {/* ─── POPUP MODAL A: SUBMIT FINALISASI ─────────────────────────────────── */}
      {showFinishPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="px-6 pt-6 pb-3 flex items-center gap-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {transitData?.status === 'IN_TRANSIT' ? 'Complete Transit?' : 'Confirm Departure?'}
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm leading-relaxed">
                {transitData?.status === 'IN_TRANSIT' 
                  ? 'Apakah Anda yakin ingin menyelesaikan dokumen ini? Hak kepemilikan barang akan resmi masuk ke gudang tujuan.' 
                  : 'Apakah Anda yakin ingin memberangkatkan troli muat? Status dokumen akan berubah menjadi IN_TRANSIT.'}
              </p>
            </div>
            <div className="px-6 pb-8 flex flex-col gap-3">
              <button onClick={handleFinishConfirm} disabled={isFinishing}
                className="w-full bg-[#002060] text-white py-4 font-bold tracking-widest text-sm hover:bg-blue-900 transition-colors disabled:opacity-60">
                {isFinishing ? 'MEMPROSES TRANSAKSI...' : 'YES, PROCESS TRANSIT'}
              </button>
              <button onClick={() => setShowFinishPopup(false)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold tracking-widest text-sm hover:bg-gray-50 transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── POPUP MODAL B: LOGOUT / EXIT SEMENTARA ──────────────────────────── */}
      {showExitPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="px-6 pt-6 pb-3 flex items-center gap-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Exit Scan?</h2>
            </div>
            <div className="px-6 py-5">
              <div className="border border-dashed border-red-300 bg-red-50 rounded p-4 mb-4">
                <p className="text-gray-800 text-sm leading-relaxed">
                  Sesi pemindaian belum ditutup penuh <span className="font-bold text-[#002060]">({progress.scanned}/{progress.expected})</span>. 
                  Progress tersimpan otomatis — kurir bisa melanjutkan kapan saja dari antrean.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#002060]" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600 shrink-0 whitespace-nowrap">
                  {Math.round(progressPercent)}% DONE
                </span>
              </div>
            </div>
            <div className="px-6 pb-8 flex flex-col gap-3">
              <button onClick={() => setShowExitPopup(false)}
                className="w-full bg-[#002060] text-white py-4 font-bold tracking-widest text-sm flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors">
                STAY AND SCAN
              </button>
              <button 
                onClick={() => { 
                  stopCamera(); 
                  window.history.go(-1);
                  setTimeout(() => navigate('/transit'), 50);
                }}
                className="w-full bg-white border-2 border-[#002060] text-[#002060] py-3 font-bold tracking-widest text-sm hover:bg-blue-50 transition-colors"
              >
                EXIT TO QUEUE
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 pb-4 tracking-wider">EPSON SVSB SYSTEM • SECURITY LOGISTICS</p>
          </div>
        </div>
      )}

    </div>
  );
}