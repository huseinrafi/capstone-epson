import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BarcodeGenerator from './BarcodeGenerator'; // Memanfaatkan komponen tim Anda

export default function PrintTransitLabel() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Ambil data boks dan nomor transit yang dikirim dari halaman CreateTransit
  const { transitNumber, itemsToPrint } = location.state || { transitNumber: '', itemsToPrint: [] };

  useEffect(() => {
    if (!transitNumber || itemsToPrint.length === 0) {
      alert('Tidak ada data boks yang dapat dicetak!');
      navigate('/desktop/transits');
      return;
    }

    // Beri jeda 1 detik agar komponen BarcodeGenerator selesai merender gambar barcode
    const timer = setTimeout(() => {
      window.print();
      // Setelah dialog print ditutup oleh user, balikkan layar ke daftar utama transit
      navigate('/desktop/transits');
    }, 1000);

    return () => clearTimeout(timer);
  }, [transitNumber, itemsToPrint, navigate]);

  return (
    <div className="p-8 bg-white min-h-screen font-mono text-black print:p-0">
      {/* Pesan petunjuk yang hanya terlihat di layar monitor, otomatis hilang saat dicetak */}
      <div className="print:hidden bg-blue-50 text-blue-700 p-4 border border-blue-200 mb-6 font-bold text-sm text-center animate-pulse">
        🖨️ MENYIAPKAN LABEL BARCODE TRANSIT... DIALOG CETAK AKAN MUNCUL OTOMATIS.
      </div>

      <div className="space-y-8">
        {itemsToPrint.map((item, index) => (
          <div 
            key={item.id || index} 
            className="border-2 border-dashed border-black p-4 w-[80mm] h-[50mm] mx-auto flex flex-col justify-between items-center page-break-after-always bg-white text-center"
            style={{ pageBreakAfter: 'always' }}
          >
            <div className="w-full text-center">
              <h2 className="text-sm font-black tracking-tight">EPSON INTERNAL TRANSIT</h2>
              <p className="text-[10px] font-bold text-gray-700">{transitNumber}</p>
            </div>

            {/* INTEGRASI DENGAN KOMPONEN BARCODE TIM ANDA */}
            <div className="my-1 flex justify-center items-center scale-90">
              <BarcodeGenerator value={item.internal_barcode} />
            </div>

            <div className="w-full border-t border-black pt-1 text-left text-[9px] font-bold space-y-0.5">
              <div className="truncate">PART: {item.part_name || 'COMPONENT'}</div>
              <div className="font-mono text-center text-xs mt-0.5">{item.internal_barcode}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}