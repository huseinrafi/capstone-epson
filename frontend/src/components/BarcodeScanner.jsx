import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useParams } from 'react-router-dom';

export default function BarcodeScanner() {
  const navigate = useNavigate();
  // Idealnya ID DO didapat dari parameter URL rute (misal: /scanner/:id)
  const { id } = useParams(); 
  const deliveryOrderId = id || '019ddef2-9b28-7363-95a7-e6eb4e06a33b'; // ID Testing fallback dari Postman

  const [scanStatus, setScanStatus] = useState(null); // 'MATCH', 'MISMATCH', 'UNEXPECTED'
  const [scanMessage, setScanMessage] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [progress, setProgress] = useState({ scanned: 0, expected: 50 }); // Default fallback
  const [isProcessing, setIsProcessing] = useState(false);
  
  const html5QrCode = useRef(null);

  useEffect(() => {
    let isComponentUnmounted = false;
    const initCamera = setTimeout(() => {
      if (isComponentUnmounted) return;

      html5QrCode.current = new Html5Qrcode("reader");
      html5QrCode.current.start(
        { facingMode: "environment" },
        { fps: 10 },
        async (decodedText) => {
          // Cegah scan berulang jika sedang memproses API
          if (isProcessing) return;
          
          if (html5QrCode.current && html5QrCode.current.isScanning) {
            html5QrCode.current.pause(); // Jeda kamera saat menembak API
          }
          
          await processBarcode(decodedText);
        },
        () => {} // Abaikan frame kosong
      ).catch((err) => {
        console.error("Camera error:", err);
      });
    }, 500);

    return () => {
      isComponentUnmounted = true;
      clearTimeout(initCamera);
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  const processBarcode = async (barcodeText) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${deliveryOrderId}/inbound/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barcode: barcodeText,
          device_id: 'mobile-operator-01'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Ekstrak data dari response Postman
        const status = result.data.result_status; // MATCH
        const label = result.data.label_payload.part_name || barcodeText;
        const currentProgress = result.data.item_progress;

        setScanStatus(status);
        setScanMessage(label);
        setProgress({ scanned: currentProgress.scanned_qty, expected: currentProgress.expected_qty });

        // Tambahkan ke riwayat bawah
        setRecentScans(prev => [{ barcode: barcodeText, label: label, status: status }, ...prev].slice(0, 3));
      } else {
        // Tangani jika API mengembalikan error (misal: UNEXPECTED/MISMATCH)
        setScanStatus('MISMATCH');
        setScanMessage(result.message || 'Barcode tidak valid');
      }
    } catch (error) {
      console.error("Print Error:", error);
      setScanStatus('ERROR');
      setScanMessage('Koneksi server terputus');
    } finally {
      // Lanjutkan kamera setelah 2 detik agar operator bisa melihat hasil
      setTimeout(() => {
        setScanStatus(null);
        setIsProcessing(false);
        if (html5QrCode.current && html5QrCode.current.isPaused) {
          html5QrCode.current.resume();
        }
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide">EPSON LOGISTICS</h1>
        <button className="text-[#002060]">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </button>
      </header>

      {/* DO INFO CARD */}
      <div className="p-4">
        <div className="bg-white border-2 border-[#002060] p-4 rounded-sm shadow-sm">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-gray-500 font-bold tracking-wider">DELIVERY ORDER</p>
              <p className="text-xl font-bold text-[#002060]">DO-TEST-002</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-bold tracking-wider">PROGRESS</p>
              <p className="text-lg font-bold text-gray-700"><span className="text-[#002060]">{progress.scanned}</span> / {progress.expected}</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#002060]" style={{ width: `${(progress.scanned / progress.expected) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* CAMERA AREA */}
      <div className="px-4 relative">
        <div className="w-full aspect-square bg-gray-900 border-4 border-[#002060] relative overflow-hidden flex items-center justify-center">
          
          {/* Camera Feed div */}
          <div id="reader" className="w-full h-full absolute inset-0 object-cover"></div>

          {/* Overlay Scanner Brackets */}
          <div className="absolute inset-8 border-2 border-dashed border-white/50 z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1A4B9F]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1A4B9F]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1A4B9F]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1A4B9F]"></div>
            
            {/* Laser Line Animation (Optional CSS) */}
            <div className="w-full h-0.5 bg-blue-500 absolute top-1/2 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] animate-pulse"></div>
          </div>

          <div className="absolute bottom-4 left-0 w-full text-center z-10 bg-black/50 py-1">
            <p className="text-white text-xs tracking-widest uppercase">ALIGN BARCODE WITHIN FRAME</p>
          </div>
        </div>
      </div>

      {/* RESULT POP-UP (Kondisional) */}
      <div className="px-4 mt-4 h-24">
        {scanStatus === 'MATCH' && (
          <div className="bg-white border border-[#28A745] p-3 flex items-center gap-4 shadow-sm animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-[#28A745] flex items-center justify-center text-[#28A745]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-[#28A745] font-bold text-sm tracking-wide">MATCH FOUND</p>
              <p className="text-[#002060] font-bold text-lg leading-tight">{scanMessage}</p>
            </div>
          </div>
        )}
        {(scanStatus === 'MISMATCH' || scanStatus === 'UNEXPECTED') && (
          <div className="bg-white border border-[#DC3545] p-3 flex items-center gap-4 shadow-sm animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-[#DC3545] flex items-center justify-center text-[#DC3545]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div>
              <p className="text-[#DC3545] font-bold text-sm tracking-wide">{scanStatus}</p>
              <p className="text-red-900 font-bold text-lg leading-tight truncate">{scanMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* RECENT SCANS LIST */}
      <div className="flex-1 px-4 mt-2 overflow-y-auto pb-20">
        <h3 className="text-xs text-gray-500 font-bold tracking-wider mb-2">RECENT SCANS</h3>
        <div className="flex flex-col gap-2">
          {recentScans.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada data scan.</p>}
          {recentScans.map((scan, index) => (
            <div key={index} className="bg-white p-3 border border-gray-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-[#002060]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{scan.label}</p>
                  <p className="text-xs text-gray-500">SN: {scan.barcode}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${scan.status === 'MATCH' ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                {scan.status === 'MATCH' ? 'OK' : 'ERR'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM ACTION */}
      <div className="fixed bottom-0 w-full p-4 bg-white border-t border-gray-200">
        <button className="w-full bg-[#002060] text-white py-3 font-semibold flex justify-center items-center gap-2 hover:bg-blue-900 shadow-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Finish Scan
        </button>
      </div>

    </div>
  );
}