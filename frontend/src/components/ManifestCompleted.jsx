import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ManifestCompleted() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Data dari navigate state (dikirim BarcodeScanner saat finish)
  const stateData = location.state;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(!stateData);

  // Jika tidak ada state (misal direct URL / refresh), fetch dari API
  useEffect(() => {
    if (stateData) {
      setData(stateData);
      return;
    }

    const fetchDO = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${id}`, {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
          const d = result.data;
          setData({
            doNumber: d.do_number,
            scanned: d.scanned_total,
            expected: d.expected_total,
            missingCount: d.items?.filter(i => i.final_status === 'MISSING').length ?? 0,
            startedAt: d.started_at,
            completedAt: d.completed_at,
            operatorId: d.admin_user_id,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDO();
  }, [id, stateData]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#EEF1F8]">
        <div className="w-10 h-10 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { doNumber, scanned, expected, missingCount, startedAt, completedAt, operatorId } = data;
  const isSuccess = missingCount === 0 && scanned >= expected;
  const accuracyPercent = expected > 0 ? Math.round((scanned / expected) * 100) : 0;

  // Hitung durasi
  const getDuration = () => {
    if (!startedAt || !completedAt) return '—';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end - start;
    if (diffMs < 0) return '—';
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#EEF1F8] font-sans items-center justify-between py-10 px-6">

      {/* ICON + TITLE */}
      <div className="flex flex-col items-center gap-4 mt-4">
        {/* Checkmark icon */}
        <div className="w-24 h-24 bg-green-100 border-2 border-green-400 rounded-2xl flex items-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#28A745] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black text-[#002060] tracking-wide leading-tight">
            MANIFEST<br />COMPLETED
          </h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-xs text-center">
            {isSuccess
              ? 'Warehouse logistics sequence successfully finalized and verified.'
              : 'Manifest completed and finalized with missing parts.'}
          </p>
        </div>
      </div>

      {/* DIGITAL MANIFEST RECORD CARD */}
      <div className="w-full max-w-sm mt-6">
        <div className="bg-[#002060] px-4 py-3 flex items-center justify-between">
          <span className="text-white text-xs font-bold tracking-widest">DIGITAL MANIFEST RECORD</span>
          <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="bg-white border-2 border-[#002060] px-5 py-5 shadow-sm">
          {/* Manifest ID */}
          <div className="mb-5">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest">MANIFEST ID</p>
            <p className="text-xl font-bold text-[#002060] mt-0.5">{doNumber}</p>
          </div>

          {/* Accuracy & Duration */}
          <div className="flex gap-6">
            {/* Accuracy */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-1">ACCURACY</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-lg font-bold ${isSuccess ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                  {scanned}/{expected}
                </span>
                {isSuccess ? (
                  <svg className="w-5 h-5 text-[#28A745]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <p className={`text-[11px] font-bold mt-0.5 ${isSuccess ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                {accuracyPercent}% MATCH
              </p>
            </div>

            {/* Duration */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-1">DURATION</p>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-gray-800">{getDuration()}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">STANDARD CYCLE</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-4" />

          {/* Authorized by */}
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[11px] font-bold text-[#002060] tracking-wider">
              AUTHORIZED BY OP-{String(operatorId || '0000').slice(-4).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* RETURN BUTTON */}
      <div className="w-full max-w-sm mt-6">
        <button
          onClick={() => navigate('/inbound')}
          className="w-full bg-[#002060] text-white py-4 font-bold tracking-widest text-sm flex justify-center items-center gap-3 hover:bg-blue-900 transition-colors shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          RETURN TO DASHBOARD
        </button>
      </div>

      {/* FOOTER */}
      <p className="text-[10px] text-gray-400 tracking-widest mt-6">EPSON SVSB INDUSTRIAL</p>
    </div>
  );
}