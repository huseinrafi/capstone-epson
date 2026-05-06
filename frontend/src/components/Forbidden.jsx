import { useNavigate } from 'react-router-dom';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F8F9FA] font-sans text-center px-4">
      {/* 403 Typography */}
      <div className="flex items-center justify-center text-[10rem] font-bold text-black mb-2 leading-none tracking-tighter">
        <span>4</span>
        <div className="w-28 h-28 bg-[#F44336] rounded-full flex items-center justify-center mx-2 shadow-sm">
          <div className="w-14 h-4 bg-white rounded-sm"></div>
        </div>
        <span>3</span>
      </div>
      
      <p className="text-lg text-black mb-8">Sorry, you don't have access to this page.</p>
      
      <button 
        onClick={() => navigate(-1)} 
        className="bg-[#002060] text-white px-6 py-3 text-sm font-semibold flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-md"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        RETURN TO PREVIOUS PAGE
      </button>
    </div>
  );
}