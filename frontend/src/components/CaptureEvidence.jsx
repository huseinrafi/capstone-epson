import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function CaptureEvidence() {
  const navigate = useNavigate();
  const { doId } = useParams();
  const location = useLocation();
  const state = location.state || {};

  const {
    anomalyId,
    anomalyType,       // NOT_FOUND | MISMATCH | OVER | MISSING
    doNumber,
    scannedBarcode,
    evidenceUploadUrl,
  } = state;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedPhoto, setCapturedPhoto] = useState(null); // blob URL
  const [capturedFile, setCapturedFile] = useState(null);   // File object
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState({ lat: null, lon: null });
  const [timestamp] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const operatorId = user.id ? `OP-${String(user.id).slice(-4).toUpperCase()}` : 'OP-0000';

  // ─── INIT KAMERA & GPS ───────────────────────────────────────────────────
  useEffect(() => {
    // GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setGps({ lat: -6.2, lon: 106.8167 }) // fallback Jakarta
      );
    }

    // Kamera
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        setCameraError('Kamera tidak dapat diakses. Gunakan file upload sebagai alternatif.');
      }
    };

    startCam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ─── AMBIL FOTO ───────────────────────────────────────────────────────────
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
      const url = URL.createObjectURL(blob);
      setCapturedPhoto(url);
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null);
    setCapturedFile(null);
  };

  // ─── SUBMIT EVIDENCE ─────────────────────────────────────────────────────
  const handleSubmitConfirm = async () => {
    if (!capturedFile) {
      alert('Harap ambil foto bukti terlebih dahulu.');
      setShowSubmitPopup(false);
      return;
    }

    if (!anomalyId) {
      alert('Data anomali tidak ditemukan. Harap kembali ke antrian/scanner.');
      setShowSubmitPopup(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', capturedFile);
      formData.append('taken_at', timestamp.toISOString());
      if (gps.lat) formData.append('latitude', String(gps.lat));
      if (gps.lon) formData.append('longitude', String(gps.lon));
      formData.append('notes', notes || 'Bukti anomali dari operator.');
      formData.append('device_id', 'mobile-operator-01');

      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, ''); 
      const url = evidenceUploadUrl
        ? `${baseUrl}${evidenceUploadUrl}`
        : `${import.meta.env.VITE_API_URL}/anomalies/${anomalyId}/evidences`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        navigate(`/waiting-approval/${doId}`, { replace: true, state: { doNumber } });
      } else {
        alert(result.message || 'Gagal mengunggah bukti.');
        setShowSubmitPopup(false);
      }
    } catch (err) {
      console.error(err);
      alert('Koneksi server gagal.');
      setShowSubmitPopup(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── HELPER MAPPING BANNER (SESUAI GAMBAR BARU MISMATH & MISSING) ─────────
  const getAnomalyLabel = () => {
    if (anomalyType === 'MISSING') {
      return { 
        title: 'MISSING PART DETECTED', 
        sub: 'Quantity does not match manifest entry.' 
      };
    }
    switch (anomalyType) {
      case 'MISMATCH': 
        return { title: 'MISMATCH DETECTED', sub: 'Hardware scan does not match manifest entry.' };
      case 'OVER':     
        return { title: 'OVER QUANTITY', sub: 'Item scanned melebihi expected quantity.' };
      case 'NOT_FOUND':
      default:         
        return { title: 'MISMATCH DETECTED', sub: 'Barcode does not match manifest entry.' };
    }
  };

  const anomalyLabel = getAnomalyLabel();
  const formattedTimestamp = timestamp.toLocaleDateString('id-ID') + ' | ' +
    timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans pb-8">

      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={() => navigate(`/scanner/${doId}`)} className="text-gray-600 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide">EPSON LOGISTICS</h1>
        <div className="w-5" />
      </header>

      {/* PAGE TITLE */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Capture Evidence</h2>
      </div>

      {/* ── ANOMALY BANNER (DINAMIS SESUAI GAMBAR) ─────────────────────────── */}
      <div className="mx-4 mb-3 bg-[#C0392B] text-white px-4 py-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="font-black text-sm tracking-wider uppercase">{anomalyLabel.title}</p>
          <p className="text-red-100 text-xs mt-0.5">{anomalyLabel.sub}</p>
        </div>
      </div>

      {/* ── SCANNED INPUT CARD (BLOK EXPECTED BERHASIL DICABUT SESUAI FIGMA BARU) ── */}
      <div className="mx-4 mb-3">
        <div className="bg-[#FFF0F0] border-2 border-[#C0392B] px-4 py-3 relative">
          <span className="absolute top-2 right-2 text-[10px] font-black text-[#C0392B] tracking-wider bg-red-100 px-2 py-0.5">
            ACTUAL
          </span>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[#C0392B]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="4" width="2" height="16"/><rect x="5" y="4" width="1" height="16"/>
                <rect x="7" y="4" width="2" height="16"/><rect x="10" y="4" width="1" height="16"/>
                <rect x="12" y="4" width="3" height="16"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold text-[#C0392B] tracking-wider">SCANNED INPUT</p>
          </div>
          <p className="text-[#C0392B] font-black text-base break-all">
            {scannedBarcode || '—'}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            {anomalyType === 'MISSING' ? 'Kuantitas total item dalam manifes belum terpenuhi.' : 'Barcode tidak sesuai dengan data ekspektasi manifes.'}
          </p>
        </div>
      </div>

      {/* ── EVIDENCE CAPTURE AREA ──────────────────────────────────────────── */}
      <div className="mx-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-gray-900 tracking-wider text-sm">EVIDENCE CAPTURE</h3>
          <span className="text-[10px] text-gray-500 font-bold tracking-wider">STEP 2 OF 3</span>
        </div>

        <div className="bg-black w-full aspect-video relative overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <svg className="w-8 h-8 mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-red-300">{cameraError}</p>
            </div>
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="evidence" className="w-full h-full object-cover" />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[10px] font-bold tracking-wider">LIVE FEED</span>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 mt-2">
          {!capturedPhoto ? (
            <button onClick={takePhoto}
              className="flex-1 bg-white border-2 border-gray-300 py-3 flex items-center justify-center gap-2 text-gray-700 font-bold text-sm hover:bg-gray-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              TAKE PHOTO
            </button>
          ) : (
            <button onClick={retakePhoto}
              className="flex-1 bg-gray-800 text-white py-3 flex items-center justify-center gap-2 font-bold text-sm hover:bg-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              RETAKE
            </button>
          )}
        </div>
      </div>

      {/* ── OPERATOR COMMENTS ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-3">
        <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">OPERATOR COMMENTS</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the condition or discrepancy..."
          className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-700 resize-none h-24 outline-none focus:border-[#002060]"
        />
      </div>

      {/* ── LOCATION & TIMESTAMP ──────────────────────────────────────────── */}
      <div className="mx-4 mb-4 bg-white border border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider">LOCATION</p>
            <p className="text-xs font-bold text-gray-700">INBOUND-1</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider">TIMESTAMP</p>
            <p className="text-xs font-bold text-gray-700">{formattedTimestamp}</p>
          </div>
        </div>
      </div>

      {/* ── ACTIONS ──────────────────────────────────────────────────────────*/}
      <div className="mx-4 flex flex-col gap-3">
        <button
          onClick={() => {
            if (!capturedPhoto) { alert('Harap ambil foto bukti terlebih dahulu.'); return; }
            setShowSubmitPopup(true);
          }}
          className="w-full bg-[#C0392B] text-white py-4 font-black tracking-widest text-sm flex justify-center items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          SUBMIT EVIDENCE
        </button>
        <button
          onClick={() => navigate(`/scanner/${doId}`)}
          className="w-full bg-white border border-gray-300 text-gray-500 py-3 font-bold tracking-widest text-sm hover:bg-gray-50 transition-colors"
        >
          CANCEL & RETURN TO SCAN
        </button>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full h-14 bg-white border-t border-gray-200 flex justify-around items-center z-20">
        <button className="flex flex-col items-center justify-center w-full h-full bg-[#1A4B9F] text-white">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider">INBOUND</span>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-500">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider">TRANSIT</span>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-full text-gray-500">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider">PROFILE</span>
        </button>
      </nav>

      {/* ── POPUP: SUBMIT EVIDENCE ─────────────────────────────────────────── */}
      {showSubmitPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="bg-[#002060] px-5 py-4 flex items-center gap-3">
              <svg className="w-6 h-6 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-white font-black text-lg">Submit Evidence?</h2>
            </div>

            <div className="px-5 py-5">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                This will <span className="font-black text-[#C0392B] underline">lock</span> the discrepancy
                report for <span className="text-[#002060] font-bold">{doNumber}</span>. This action cannot be undone.
              </p>

              <div className="bg-[#F0F4FF] border-l-4 border-[#002060] px-4 py-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 tracking-wider">FILES ATTACHED</span>
                  <span className="text-[#002060] font-black text-sm tracking-wider">
                    {capturedFile ? '1 PHOTO' : '0 PHOTOS'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 tracking-wider">OPERATOR ID</span>
                  <span className="text-[#002060] font-black text-sm tracking-wider">{operatorId}</span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-8 flex flex-col gap-3">
              <button
                onClick={handleSubmitConfirm}
                disabled={isSubmitting}
                className="w-full bg-[#002060] text-white py-4 font-bold text-sm flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors disabled:opacity-60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isSubmitting ? 'MENGUNGGAH...' : 'Confirm & Submit'}
              </button>
              <button
                onClick={() => setShowSubmitPopup(false)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold text-sm flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                REVIEW AGAIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}