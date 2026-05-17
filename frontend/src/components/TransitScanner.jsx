import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

export default function TransitScanner() {
  const navigate = useNavigate();

  // --- STATE TAHAP 1: SETUP TRANSIT ---
  const [warehouses, setWarehouses] = useState([]);
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- STATE TAHAP 2: SESI SCANNING ---
  const [transitId, setTransitId] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [recentScans, setRecentScans] = useState([]);

  // --- HARDWARE LOCK ---
  const html5QrCode = useRef(null);
  const scanLock = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // FETCH DAFTAR GUDANG SAAT MOUNT
  useEffect(() => {
    let isMounted = true;
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/warehouses`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await res.json();
        if (res.ok && result.success && isMounted) {
          // Asumsi struktur data pagination laravel (result.data.data) atau array flat (result.data)
          setWarehouses(result.data.data || result.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat gudang:", err);
      }
    };
    fetchWarehouses();
    return () => { isMounted = false; };
  }, []);

  // AKSI: TOMBOL START TRANSIT BATCH
  const handleStartTransit = async () => {
    if (!destinationId) {
      alert("Silakan pilih gudang tujuan terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/transits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destination_warehouse_id: destinationId,
          notes: notes
        })
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        setTransitId(result.data.id); // Pindah ke layar kamera
      } else {
        alert(result.message || "Gagal membuat surat jalan internal.");
      }
    } catch (err) {
      alert("Koneksi server gagal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // AKSI: PROSES BARCODE KE API TRANSIT
  const processBarcode = useCallback(async (barcodeText) => {
    if (!transitId) return;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/transits/${transitId}/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          internal_barcode: barcodeText,
          device_id: 'mobile-transit-01'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setScanStatus('MATCH');
        const partName = result.data.item_name || barcodeText;
        setScanMessage(`Berhasil memindai: ${partName}`);
        setRecentScans(prev => [{ barcode: barcodeText, label: partName, status: 'MATCH' }, ...prev].slice(0, 3));
      } else {
        setScanStatus('MISMATCH');
        setScanMessage(result.message || 'Barang tidak dapat ditransitkan.');
      }
    } catch (err) {
      setScanStatus('ERROR');
      setScanMessage('Koneksi server terputus.');
    } finally {
      setTimeout(() => {
        setScanStatus(null);
        scanLock.current = false;
        setIsProcessing(false);
        try {
          if (html5QrCode.current) {
            html5QrCode.current.resume();
          }
        } catch (e) {}
      }, 2000);
    }
  }, [transitId]);

  // SIKLUS HIDUP KAMERA
  useEffect(() => {
    if (!transitId) return;

    let isMounted = true;
    html5QrCode.current = new Html5Qrcode('transit-reader');

    const startCamera = async () => {
      try {
        await html5QrCode.current.start(
          { facingMode: 'environment' },
          { fps: 5 },
          async (decodedText) => {
            if (!isMounted || scanLock.current) return;
            scanLock.current = true;
            
            try {
              if (html5QrCode.current?.isScanning) html5QrCode.current.pause(true);
            } catch (e) {}
            
            const sanitizedBarcode = decodedText.trim().toUpperCase();
            await processBarcode(sanitizedBarcode);
          },
          () => {} 
        );
      } catch (err) {
        console.error('Kamera gagal menyala:', err);
      }
    };

    const timer = setTimeout(startCamera, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode.current) {
        try {
          html5QrCode.current.stop().then(() => {
            html5QrCode.current.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [transitId, processBarcode]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans">
      {/* HEADER (Sesuai Gambar) */}
      <header className="flex items-center justify-between p-4 bg-white shadow-sm z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:bg-gray-100 p-1 rounded">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide text-base">EPSON LOGISTICS</h1>
        {/* Avatar Placeholder Sesuai Gambar */}
        <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
        </div>
      </header>

      <div className="p-4 flex-1 flex flex-col">
        {!transitId ? (
          /* ========================================================
             TAHAP 1: SETUP TRANSIT (PIXEL PERFECT SESUAI GAMBAR)
             ======================================================== */
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex-1">
            <h2 className="text-[22px] font-bold text-[#002060] mb-1">INTERNAL TRANSIT SCAN</h2>
            <p className="text-[11px] font-bold text-gray-400 mb-8 tracking-wider">STATION: TRANSIT-OUT-1</p>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-gray-800 mb-2">Destination Warehouse</label>
              <div className="relative">
                <select 
                  value={destinationId} 
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-3.5 text-sm text-gray-700 font-medium appearance-none focus:outline-none focus:border-[#002060] focus:ring-1 focus:ring-[#002060]"
                >
                  <option value="" disabled>Select Destination ID</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-[13px] font-bold text-gray-800 mb-2">Optional Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan jika perlu..."
                className="w-full border border-gray-300 rounded-md p-3.5 text-sm text-gray-700 h-28 resize-none focus:outline-none focus:border-[#002060] focus:ring-1 focus:ring-[#002060]"
              ></textarea>
            </div>

            <button 
              onClick={handleStartTransit}
              disabled={isSubmitting}
              className={`w-full bg-[#002060] text-white text-sm font-bold py-4 rounded-md shadow-md hover:bg-[#001746] transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Processing...' : 'Start Transit Batch'}
            </button>
          </div>
        ) : (
          /* ========================================================
             TAHAP 2: KAMERA & HASIL (FALLBACK DESIGN)
             ======================================================== */
          <div className="flex flex-col h-full bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-1 relative pb-20">
            <h2 className="text-lg font-bold text-[#002060] mb-1">SCANNING IN PROGRESS</h2>
            <p className="text-[11px] font-bold text-gray-400 mb-4 tracking-wider">TRANSIT ID: {transitId.split('-')[0].toUpperCase()}</p>

            {/* KAMERA */}
            <div className="w-full aspect-square bg-gray-900 border-4 border-[#002060] relative overflow-hidden flex items-center justify-center rounded-md mb-4">
              <div id="transit-reader" className="w-full h-full absolute inset-0"></div>
              <div className="absolute inset-6 border-2 border-dashed border-white/40 z-10 pointer-events-none">
                <div className={`w-full h-0.5 bg-blue-500 absolute top-1/2 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] ${isProcessing ? 'hidden' : 'animate-pulse'}`} />
              </div>
            </div>

            {/* ALERT HASIL */}
            <div className="min-h-[4rem] mb-4">
              {scanStatus === 'MATCH' && (
                <div className="bg-[#E8F5E9] border-l-4 border-[#28A745] p-3 rounded shadow-sm">
                  <p className="text-[#28A745] font-bold text-xs tracking-wide">SUCCESS</p>
                  <p className="text-gray-800 font-semibold text-sm">{scanMessage}</p>
                </div>
              )}
              {(scanStatus === 'MISMATCH' || scanStatus === 'ERROR') && (
                <div className="bg-[#F8D7DA] border-l-4 border-[#DC3545] p-3 rounded shadow-sm">
                  <p className="text-[#DC3545] font-bold text-xs tracking-wide">{scanStatus}</p>
                  <p className="text-red-900 font-semibold text-sm">{scanMessage}</p>
                </div>
              )}
            </div>

            {/* ACTION BUTTON (BOTTOM FIXED) */}
            <div className="absolute bottom-4 left-4 right-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-[#002060] text-white font-bold py-3.5 rounded-md shadow hover:bg-blue-900 transition"
              >
                Finish Batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}