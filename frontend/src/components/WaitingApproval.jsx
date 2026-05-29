import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function WaitingApproval() {
  const navigate = useNavigate();
  const { id } = useParams();
  const doId = id;
  const location = useLocation();
  const doNumber = location.state?.doNumber || doId;
  const isTransit = location.state?.isTransit || false;

  // Cek status secara berkala
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const endpoint = isTransit
          ? `${import.meta.env.VITE_API_URL}/transits/${doId}`
          : `${import.meta.env.VITE_API_URL}/delivery-orders/${doId}`;

        const res = await fetch(endpoint, {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        
        if (res.ok && result.success && isMounted) {
          const data = result.data;
          if (isTransit) {
            if (data.status === 'IN_TRANSIT') {
              navigate(`/transit-scanner/${doId}`, { replace: true });
            } else if (data.status === 'TRANSIT_COMPLETED') {
              navigate('/transit', { replace: true });
            }
          } else {
            // Jika sudah di-approve dan kembali ke IN_PROGRESS, redirect ke scanner
            if (data.status === 'IN_PROGRESS') {
              navigate(`/scanner/${doId}`, { replace: true });
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000); // Cek setiap 5 detik

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [doId, navigate, isTransit]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] items-center justify-center p-8 gap-6 font-sans">
      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center animate-pulse shadow-inner">
        <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#002060] mb-2 tracking-wide">MENUNGGU APPROVAL SPV</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          Manifest <span className="font-bold text-[#002060]">{doNumber}</span> sedang ditahan karena anomali.<br/>
          Silakan hubungi Supervisor untuk melakukan <i>review</i> dan <i>approval</i> agar Anda dapat melanjutkan proses scan.
        </p>
      </div>

      <div className="flex flex-col w-full max-w-sm gap-3 mt-4">
        <button 
          onClick={() => navigate(isTransit ? '/transit' : '/inbound')} 
          className="w-full bg-[#002060] text-white py-4 font-bold tracking-widest text-sm rounded shadow hover:bg-blue-900 transition-colors"
        >
          KEMBALI KE ANTRIAN
        </button>
      </div>
      
      <p className="text-center text-[10px] text-gray-400 mt-8 tracking-wider">HALAMAN AKAN REFRESH OTOMATIS SAAT DI-APPROVE</p>
    </div>
  );
}
