import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';

export default function PrintTransitLabel() {
  const location = useLocation();
  const navigate = useNavigate();

  // Ambil data boks dan nomor transit yang dikirim dari halaman CreateTransit
  const { transitNumber, itemsToPrint } = location.state || { transitNumber: '', itemsToPrint: [] };

  useEffect(() => {
    if (!transitNumber || !itemsToPrint || itemsToPrint.length === 0) {
      alert('Tidak ada data boks yang dapat dicetak!');
      navigate('/create-transit');
    }
  }, [transitNumber, itemsToPrint, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/create-transit');
  };

  if (!transitNumber || !itemsToPrint || itemsToPrint.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* ── KONTROL BAR (HANYA TAMPIL DI LAYAR, HILANG SAAT PRINT) ─── */}
      <div className="print:hidden sticky top-0 z-10 bg-[#002060] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-lg font-black tracking-wider">PRINT SURAT JALAN TRANSIT</h1>
          <p className="text-blue-200 text-xs mt-0.5 font-mono">{transitNumber} · {itemsToPrint.length} ITEM</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-bold tracking-wider transition-colors"
          >
            ← KEMBALI
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-white text-[#002060] text-xs font-black tracking-wider hover:bg-blue-50 shadow transition-colors"
          >
            🖨️ CETAK LABEL
          </button>
        </div>
      </div>

      {/* ── PREVIEW DESKRIPSI ─── */}
      <div className="print:hidden px-6 py-4 bg-blue-50 border-b border-blue-200 text-blue-800 text-sm font-semibold text-center">
        Preview label barcode untuk dicetak. Klik <strong>CETAK LABEL</strong> untuk membuka dialog print browser.
      </div>

      {/* ── LABEL BARCODE GRID (TAMPIL SAAT PRINT) ─── */}
      <div className="p-6 print:p-0 grid grid-cols-2 gap-6 print:grid-cols-2 print:gap-0 max-w-4xl mx-auto print:max-w-none">
        {itemsToPrint.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-white border-2 border-dashed border-gray-800 p-4 flex flex-col items-center justify-between print:border-black print:m-0"
            style={{ pageBreakInside: 'avoid', minHeight: '160px' }}
          >
            {/* Header Surat Jalan */}
            <div className="w-full text-center border-b border-gray-300 pb-2 mb-2">
              <p className="text-[10px] font-bold tracking-widest text-gray-500">EPSON INTERNAL TRANSIT</p>
              <p className="text-xs font-black text-gray-900 font-mono">{transitNumber}</p>
            </div>

            {/* Barcode */}
            <div className="flex justify-center items-center my-1">
              <Barcode
                value={item.internal_barcode || 'NO-BARCODE'}
                background="transparent"
                lineColor="#000000"
                width={1.5}
                height={50}
                fontSize={10}
                displayValue={true}
                margin={0}
              />
            </div>

            {/* Info Part */}
            <div className="w-full border-t border-gray-300 pt-1 mt-1 text-center">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide truncate">
                {item.part_name || item.sku || 'COMPONENT'}
              </p>
              <p className="text-[8px] text-gray-400 font-mono">{item.status || 'AVAILABLE'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOMBOL BAWAH (HANYA LAYAR) ─── */}
      <div className="print:hidden pb-12 text-center mt-4">
        <button
          onClick={handlePrint}
          className="px-8 py-3 bg-[#002060] text-white font-black text-sm tracking-widest hover:bg-blue-900 shadow-lg transition-colors"
        >
          🖨️ CETAK SEMUA LABEL ({itemsToPrint.length} ITEM)
        </button>
      </div>
    </div>
  );
}