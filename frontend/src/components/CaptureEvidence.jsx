import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function CaptureEvidence() {
  const navigate = useNavigate();
  const { id } = useParams();
  const doId = id;
  const location = useLocation();
  const state = location.state || {};

  const {
    anomalyId,
    anomalyType,       // MISMATCH | MISSING | EXCESSIVE | NOT_FOUND | MANUAL_ISSUE
    doNumber,
    scannedBarcode,
    evidenceUploadUrl,
    isTransit,
  } = state;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState({ lat: null, lon: null });
  const [timestamp] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const operatorId = user.id ? `OP-${String(user.id).slice(-4).toUpperCase()}` : 'OP-0001';

  // ─── INIT KAMERA & GPS LOCK ───────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setGps({ lat: -6.3478, lon: 106.9712 }) // Fallback Lokasi Pabrik Epson Cikarang
      );
    }

    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error(err);
        setCameraError('Modul kamera diblokir atau tidak tersedia.');
      }
    };

    startCam();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ─── LOGIKA ACQUISITION FOTO ──────────────────────────────────────────────
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
      setCapturedPhoto(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null);
    setCapturedFile(null);
  };

  // ─── KIRIM FORM MULTI-PART KE BACKEND ──────────────────────────────────────
  const handleSubmitConfirm = async () => {
    if (!capturedFile) {
      alert('Foto bukti kondisi fisik wajib dilampirkan sebelum submit.');
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
      formData.append('notes', notes || `Laporan bukti tipe: ${anomalyType}`);
      formData.append('device_id', 'mobile-operator-01');

      // Proteksi rute aman jika endpoint dinamis kosong
      const fallbackUrl = `/api/v1/anomalies/${anomalyId || 'placeholder'}/evidences`;
      const finalTargetUrl = evidenceUploadUrl || fallbackUrl;
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');

      const response = await fetch(`${baseUrl}${finalTargetUrl}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Berhasil dikunci, kirim operator ke halaman tunggu approval supervisor
        navigate(`/waiting-approval/${doId}`, { replace: true, state: { doNumber, isTransit } });
      } else {
        alert(result.message || 'Gagal menyimpan bukti data anomali.');
        setShowSubmitPopup(false);
      }
    } catch (err) {
      console.error(err);
      alert('Koneksi transmisi API gagal.');
      setShowSubmitPopup(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnomalyLabel = () => {
    switch (anomalyType) {
      case 'MISSING':
        return {
          title: 'MISSING PARTS DETECTED',
          sub: 'Quantity does not match manifest entry.'
        };
      case 'EXCESSIVE':
      case 'OVER':
        return {
          title: 'EXCESSIVE AMOUNT',
          sub: 'Quantity exceed the manifest entry.'
        };
      case 'MANUAL_ISSUE':
        return {
          title: 'REPORT AN ISSUE',
          sub: 'If there is any problem on the package.'
        };
      case 'MISMATCH':
        return {
          title: 'MISMATCH DETECTED',
          sub: 'Hardware scan does not match manifest entry.'
        };
      case 'NOT_FOUND':
      default:
        return {
          title: 'MISMATCH DETECTED',
          sub: 'Barcode does not match manifest entry.'
        };
    }
  };

  const anomalyLabel = getAnomalyLabel();
  const formattedTimestamp = timestamp.toLocaleDateString('id-ID') + ' | ' +
    timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] font-sans pb-8">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={() => navigate(isTransit ? `/transit-scanner/${doId}` : `/scanner/${doId}`)} className="text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[#002060] font-bold tracking-wide">EPSON LOGISTICS</h1>
        <div className="w-5" />
      </header>

      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Capture Evidence</h2>
      </div>

      {/* DYNAMIC BANNER BAR */}
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

      {/* ── SCANNED INPUT CARD (HANYA MUNCUL JIKA ANOMALI SCAN/MISMATCH) ── */}
      {!['MISSING', 'EXCESSIVE', 'MANUAL_ISSUE'].includes(anomalyType) && (
        <div className="mx-4 mb-3">
          <div className="bg-[#FFF0F0] border-2 border-[#C0392B] px-4 py-3 relative">
            <span className="absolute top-2 right-2 text-[10px] font-black text-[#C0392B] tracking-wider bg-red-100 px-2 py-0.5">
              ACTUAL
            </span>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[#C0392B]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="4" width="2" height="16" /><rect x="5" y="4" width="1" height="16" />
                  <rect x="7" y="4" width="2" height="16" /><rect x="10" y="4" width="1" height="16" />
                  <rect x="12" y="4" width="3" height="16" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-[#C0392B] tracking-wider">SCANNED INPUT</p>
            </div>
            <p className="text-[#C0392B] font-black text-base break-all">
              {scannedBarcode || '—'}
            </p>
          </div>
        </div>
      )}

      {/* CAMERA INTERFACE */}
      <div className="mx-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-gray-900 tracking-wider text-sm">EVIDENCE CAPTURE</h3>
          <span className="text-[10px] text-gray-500 font-bold tracking-wider">STEP 2 OF 3</span>
        </div>

        <div className="bg-black w-full aspect-video relative overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <p className="text-xs text-red-300">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${capturedPhoto ? 'hidden' : ''}`}
              />
              {!capturedPhoto && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-[10px] font-bold tracking-wider">LIVE FEED</span>
                </div>
              )}
              {capturedPhoto && (
                <img src={capturedPhoto} alt="evidence" className="w-full h-full object-cover" />
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 mt-2">
          {!capturedPhoto ? (
            <button onClick={takePhoto} className="flex-1 bg-white border-2 border-gray-300 py-3 flex items-center justify-center gap-2 text-gray-700 font-bold text-sm hover:bg-gray-50">
              📷 TAKE PHOTO
            </button>
          ) : (
            <button onClick={retakePhoto} className="flex-1 bg-gray-800 text-white py-3 flex items-center justify-center gap-2 font-bold text-sm hover:bg-gray-700">
              🔄 RETAKE
            </button>
          )}
        </div>
      </div>

      {/* COMMENTS */}
      <div className="mx-4 mb-3">
        <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">OPERATOR COMMENTS</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the condition or discrepancy..."
          className="w-full bg-white border border-gray-300 p-3 text-sm text-gray-700 h-24 outline-none focus:border-[#002060] resize-none"
        />
      </div>

      {/* META LOGS */}
      <div className="mx-4 mb-4 bg-white border border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold block">LOCATION</span>
          <p className="text-xs font-bold text-gray-700">INBOUND-1</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold block">TIMESTAMP</span>
          <p className="text-xs font-bold text-gray-700">{formattedTimestamp}</p>
        </div>
      </div>

      {/* SUBMIT ACTIONS */}
      <div className="mx-4 flex flex-col gap-3">
        <button
          onClick={() => {
            if (!capturedPhoto) { alert('Ambil foto fisik boks terlebih dahulu.'); return; }
            setShowSubmitPopup(true);
          }}
          className="w-full bg-[#C0392B] text-white py-4 font-black tracking-widest text-sm hover:bg-red-800 transition-colors shadow"
        >
          SUBMIT EVIDENCE
        </button>
      </div>

      {/* POPUP CONFIRMATION */}
      {showSubmitPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="bg-[#002060] px-5 py-4 flex items-center gap-3">
              <h2 className="text-white font-black text-lg">Submit Report?</h2>
            </div>
            <div className="px-5 py-5">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                This will lock the anomaly state report for <span className="text-[#002060] font-bold">{doNumber}</span>.
              </p>
            </div>
            <div className="px-5 pb-8 flex flex-col gap-3">
              <button onClick={handleSubmitConfirm} disabled={isSubmitting} className="w-full bg-[#002060] text-white py-4 font-bold text-sm disabled:opacity-60">
                {isSubmitting ? 'UPLOADING...' : 'Confirm & Submit'}
              </button>
              <button onClick={() => setShowSubmitPopup(false)} className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold text-sm">
                REVIEW AGAIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}