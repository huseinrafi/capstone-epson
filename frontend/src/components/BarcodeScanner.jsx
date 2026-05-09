import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useParams } from 'react-router-dom';

export default function BarcodeScanner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const deliveryOrderId = id;

  // --- STATE UI & DATA ---
  const [scanStatus, setScanStatus] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [progress, setProgress] = useState({ scanned: 0, expected: 0 });
  const [doNumber, setDoNumber] = useState('Memuat...');
  
  // --- STATE VALIDASI DO ---
  const [doReady, setDoReady] = useState(false);
  const [doError, setDoError] = useState(null);

  // --- REF HARDWARE & LOCK ---
  const html5QrCode = useRef(null);
  const scanLock = useRef(false); // Gembok pelatuk sinkronus pencegah double-scan

  // ─── TAHAP 1: VALIDASI & SINKRONISASI DO ─────────────────────────────────
  useEffect(() => {
    if (!deliveryOrderId) {
      setDoError('Delivery Order ID tidak valid.');
      return;
    }

    let isMounted = true;

    const verifyAndEnsureInProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Cek status real-time ke database
        const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${deliveryOrderId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const result = await res.json();

        if (!res.ok || !result.success) {
          if (isMounted) setDoError(result.message || 'Gagal memuat data DO dari server.');
          return;
        }

        const doData = result.data;
        const status = doData.status;

        if (isMounted) {
          setDoNumber(doData.do_number || deliveryOrderId);
          setProgress({
            scanned: doData.scanned_total ?? 0,
            expected: doData.expected_total ?? 0,
          });
        }

        if (status === 'IN_PROGRESS' || status === 'HOLD_INBOUND') {
          await ensureItemsMap(doData);
          if (isMounted) setDoReady(true);
        } else if (status === 'PENDING') {
          // Paksa Start jika belum dimulai
          const startRes = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${deliveryOrderId}/inbound/start`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          const startResult = await startRes.json();

          if (startRes.ok && startResult.success) {
            await ensureItemsMap(startResult.data);
            if (isMounted) {
              setProgress({
                scanned: startResult.data.scanned_total ?? 0,
                expected: startResult.data.expected_total ?? 0,
              });
              setDoReady(true);
            }
          } else {
            if (isMounted) setDoError(startResult.message || 'Gagal memulai sesi DO.');
          }
        } else {
          if (isMounted) setDoError(`Akses ditolak. Status DO saat ini: ${status}`);
        }
      } catch (err) {
        console.error('Verifikasi DO Error:', err);
        if (isMounted) setDoError('Koneksi ke server terputus.');
      }
    };

    verifyAndEnsureInProgress();

    return () => {
      isMounted = false;
    };
  }, [deliveryOrderId]);

  const ensureItemsMap = async (doData) => {
    const storageKey = `do_items_${deliveryOrderId}`;
    const items = doData.items || [];
    if (items.length > 0) {
      const map = {};
      items.forEach(item => {
        if (item.vendor_barcode) {
          map[item.vendor_barcode.trim().toUpperCase()] = item.sku;
        }
      });
      sessionStorage.setItem(storageKey, JSON.stringify(map));
    }
  };

  // ─── TAHAP 2: PROSES BARCODE KE API ──────────────────────────────────────
  const processBarcode = useCallback(async (barcodeText) => {
    try {
      const token = localStorage.getItem('token');
      const itemsMap = JSON.parse(sessionStorage.getItem(`do_items_${deliveryOrderId}`) || '{}');
      const sku = itemsMap[barcodeText] || null;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${deliveryOrderId}/inbound/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barcode: barcodeText,
          device_id: 'mobile-operator-01',
          ...(sku && { sku })
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const status = result.data.result_status;
        const label = result.data.label_payload?.part_name || barcodeText;
        const currentProgress = result.data.item_progress;

        setScanStatus(status);
        setScanMessage(label);
        setProgress({
          scanned: currentProgress.scanned_qty,
          expected: currentProgress.expected_qty
        });
        setRecentScans(prev => [{ barcode: barcodeText, label, status }, ...prev].slice(0, 3));
      } else {
        setScanStatus('MISMATCH');
        setScanMessage(result.message || 'Teks tidak dikenali oleh sistem');
      }
    } catch (err) {
      console.error(err)
      setScanStatus('ERROR');
      setScanMessage('Koneksi server gagal');
    } finally {
      // Jeda 2 detik sebelum membuka gembok pelatuk kamera
      setTimeout(() => {
        setScanStatus(null);
        scanLock.current = false; // Gembok dibuka
        try {
          if (html5QrCode.current) {
            html5QrCode.current.resume();
          }
        } catch (e) {
            console.error(e)
          // Abaikan jika instance sudah dihancurkan
        }
      }, 2000);
    }
  }, [deliveryOrderId]);

  // ─── TAHAP 3: SIKLUS HIDUP KAMERA STRICT-MODE SAFE ───────────────────────
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
            // Evaluasi Lock & Komponen
            if (!isMounted || scanLock.current) return;
            scanLock.current = true; // Kunci segera setelah teks pertama masuk

            // Jeda kamera secara visual
            try {
              if (html5QrCode.current?.isScanning) {
                html5QrCode.current.pause(true);
              }
            } catch (e) {
                console.error(e)
            }

            // Sanitasi ketat
            const sanitizedBarcode = decodedText.trim().toUpperCase();
            await processBarcode(sanitizedBarcode);
          },
          () => {} // Abaikan frame kosong
        );
      } catch (err) {
        console.error('Kamera gagal menyala:', err);
      }
    };

    // Jeda inisialisasi agar DOM tag <div id="reader"> selesai dirender React
    const timer = setTimeout(startCamera, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode.current) {
        try {
          html5QrCode.current.stop().then(() => {
            html5QrCode.current.clear();
          }).catch(() => {});
        } catch (e) {
            console.error(e);
        }
      }
    };
  }, [doReady, processBarcode]);

  // ─── RENDER UI ───────────────────────────────────────────────────────────
  const progressPercent = progress.expected > 0
    ? Math.min((progress.scanned / progress.expected) * 100, 100)
    : 0;

  if (doError) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans items-center justify-center p-8 gap-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <p className="text-center text-gray-800 font-semibold">{doError}</p>
        <button onClick={() => navigate('/inbound')} className="bg-[#002060] text-white px-6 py-3 font-bold rounded shadow">
          Kembali ke Antrian
        </button>
      </div>
    );
  }

  if (!doReady) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#002060] font-bold tracking-wide animate-pulse">Menyiapkan Sesi SVSB...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button onClick={() => navigate('/inbound')} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide">EPSON LOGISTICS</h1>
        <div className="w-6 h-6"></div> {/* Spacer */}
      </header>

      {/* DO INFO CARD */}
      <div className="p-4">
        <div className="bg-white border-2 border-[#002060] p-4 rounded-sm shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-gray-500 font-bold tracking-wider">DELIVERY ORDER</p>
              <p className="text-xl font-bold text-[#002060]">{doNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-bold tracking-wider">PROGRESS</p>
              <p className="text-lg font-bold text-gray-700">
                <span className="text-[#002060]">{progress.scanned}</span> / {progress.expected}
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#002060] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* CAMERA AREA */}
      <div className="px-4 relative">
        <div className="w-full aspect-square bg-black border-4 border-[#002060] relative overflow-hidden flex items-center justify-center">
          <div id="reader" className="w-full h-full absolute inset-0" />
          
          <div className="absolute inset-8 border-2 border-dashed border-white/50 z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1A4B9F]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1A4B9F]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1A4B9F]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1A4B9F]" />
            <div className="w-full h-0.5 bg-blue-500 absolute top-1/2 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] animate-pulse" />
          </div>
          
          <div className="absolute bottom-4 left-0 w-full text-center z-10 bg-black/50 py-1">
            <p className="text-white text-xs tracking-widest uppercase">ALIGN BARCODE WITHIN FRAME</p>
          </div>
        </div>
      </div>

      {/* RESULT */}
      <div className="px-4 mt-4 min-h-[6rem]">
        {scanStatus === 'MATCH' && (
          <div className="bg-white border border-[#28A745] p-3 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-[#28A745] flex items-center justify-center text-[#28A745] shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#28A745] font-bold text-sm tracking-wide">MATCH FOUND</p>
              <p className="text-[#002060] font-bold text-lg leading-tight">{scanMessage}</p>
            </div>
          </div>
        )}
        {(scanStatus === 'MISMATCH' || scanStatus === 'UNEXPECTED' || scanStatus === 'ERROR') && (
          <div className="bg-white border border-[#DC3545] p-3 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-[#DC3545] flex items-center justify-center text-[#DC3545] shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-[#DC3545] font-bold text-sm tracking-wide">{scanStatus}</p>
              <p className="text-red-900 font-bold text-base leading-tight break-words">{scanMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* RECENT SCANS */}
      <div className="flex-1 px-4 mt-2 overflow-y-auto pb-24">
        <h3 className="text-xs text-gray-500 font-bold tracking-wider mb-2">RECENT SCANS</h3>
        {recentScans.length === 0 && (
          <p className="text-sm text-gray-400 italic">Belum ada data scan.</p>
        )}
        {recentScans.map((scan, index) => (
          <div key={index} className="bg-white p-3 border border-gray-200 flex items-center justify-between shadow-sm mb-2">
            <div>
              <p className="text-sm font-bold text-gray-800">{scan.label}</p>
              <p className="text-xs text-gray-500">SN: {scan.barcode}</p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${scan.status === 'MATCH' ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
              {scan.status === 'MATCH' ? 'OK' : 'ERR'}
            </span>
          </div>
        ))}
      </div>

      {/* BOTTOM ACTION */}
      <div className="fixed bottom-0 w-full p-4 bg-white border-t border-gray-200 z-50">
        <button 
          onClick={() => navigate('/inbound')}
          className="w-full bg-[#002060] text-white py-3 font-semibold flex justify-center items-center gap-2 hover:bg-blue-900 shadow-md transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Finish Scan
        </button>
      </div>
    </div>
  );
}