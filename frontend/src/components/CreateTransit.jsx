import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateTransit() {
    const navigate = useNavigate();

    // State Data Master
    const [warehouses, setWarehouses] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);

    // State Form Input
    const [originWh, setOriginWh] = useState('');
    const [destWh, setDestWh] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    // State Operasional
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingItems, setIsFetchingItems] = useState(false);
    const [error, setError] = useState(null);

    const token = localStorage.getItem('token');

    // 1. LOAD DAFTAR GUDANG UNTUK DROPDOWN
    useEffect(() => {
        async function loadWarehouses() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/lookups/warehouses`, {
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (res.ok) {
                    setWarehouses(result.data || result || []);
                }
            } catch (err) {
                console.error('Gagal memuat data gudang:', err);
            }
        }
        loadWarehouses();
    }, [token]);

    // 2. LOAD BARANG YANG AVAILABLE BERDASARKAN GUDANG ASAL YANG DIPILIH
    // GANTI useEffect kedua di file CreateTransit.jsx Anda dengan kode ini:
    useEffect(() => {
        if (!originWh) {
            setAvailableItems([]);
            return;
        }

        async function loadAvailableItems() {
            setIsFetchingItems(true);
            setSelectedItems([]);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/items?per_page=100`, {
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (res.ok) {
                    const rawItems = result.data?.data || result.data || [];

                    // PERBAIKAN FILTER: Mengantisipasi perbedaan penamaan key warehouse_id di database teman Anda
                    const filtered = rawItems.filter(item => {
                        // Ambil ID gudang boks, dukung format snake_case maupun camelCase dari API
                        const itemWarehouseId = item.current_warehouse_id || item.warehouse_id || item.warehouse?.id;

                        // Pastikan boks berstatus AVAILABLE dan berada di gudang asal yang Anda klik (Warehouse Test)
                        return item.status === 'AVAILABLE' && itemWarehouseId === originWh;
                    });

                    setAvailableItems(filtered);
                }
            } catch (err) {
                console.error('Gagal memuat boks internal:', err);
            } finally {
                setIsFetchingItems(false);
            }
        }

        loadAvailableItems();
    }, [originWh, token]);

    // Handle Aksi Checklist Baris Tabel
    const handleSelectItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    // 3. EKSEKUSI PENYIMPANAN & TRIGER PRINT SURAT JALAN
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedItems.length === 0) {
            alert('Pilih minimal 1 boks komponen untuk dipindahkan!');
            return;
        }
        if (originWh === destWh) {
            alert('Gudang asal dan tujuan tidak boleh sama!');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/transits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    origin_warehouse_id: originWh,
                    dest_warehouse_id: destWh,
                    internal_item_ids: selectedItems // Key array ID sesuai StoreTransitRequest teman Anda
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert(`Surat Jalan ${result.data.transit_number} Berhasil Diterbitkan!`);

                // Fungsi Otomatis Cetak Dokumen via Browser untuk ditempel di palet/troli kurir
                window.print();

                navigate('/desktop/transits'); // Kembalikan ke halaman daftar utama desktop
            } else {
                setError(result.message || 'Gagal menerbitkan dokumen transit.');
            }
        } catch (err) {
            console.error(err);
            setError('Koneksi ke server backend terputus.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white border border-gray-200 shadow-sm mt-6 font-sans text-gray-800">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-[#002060]">CREATE INTERNAL TRANSIT DOCUMENT</h1>
                <p className="text-xs text-gray-500 font-semibold tracking-wider mt-1">EPSON SVSB LOGISTICS MANAGEMENT PANEL</p>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 border border-red-200 mb-6 font-bold text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PANEL SELEKSI GUDANG */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2">ORIGIN WAREHOUSE (ASAL)</label>
                        <select
                            value={originWh}
                            onChange={e => setOriginWh(e.target.value)}
                            className="w-full border border-gray-300 px-3 py-2 outline-none focus:border-[#002060] bg-white text-sm font-semibold text-gray-700"
                            required
                        >
                            <option value="">-- Pilih Gudang Asal --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} [{w.code}]</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 tracking-wider mb-2">DESTINATION WAREHOUSE (TUJUAN)</label>
                        <select
                            value={destWh}
                            onChange={e => setDestWh(e.target.value)}
                            className="w-full border border-gray-300 px-3 py-2 outline-none focus:border-[#002060] bg-white text-sm font-semibold text-gray-700"
                            required
                        >
                            <option value="">-- Pilih Gudang Tujuan --</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} [{w.code}]</option>)}
                        </select>
                    </div>
                </div>

                {/* TABEL PILIHAN BOKS LOGISTIK BERDASARKAN GUDANG ASAL */}
                <div className="border border-gray-200">
                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 tracking-wider">
                        DAFTAR BOKS KOMPONEN YANG TERSEDIA DI GUDANG ASAL ({availableItems.length})
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {isFetchingItems ? (
                            <div className="text-center py-8 text-sm text-[#002060] font-bold animate-pulse">Menghubungkan Data Internal Items...</div>
                        ) : !originWh ? (
                            <div className="text-center py-8 text-xs text-gray-400 italic">Silakan pilih gudang asal terlebih dahulu untuk menarik stok barang.</div>
                        ) : availableItems.length === 0 ? (
                            <div className="text-center py-8 text-xs text-red-500 italic font-semibold">Tidak ada komponen boks berstatus AVAILABLE di gudang ini saat ini.</div>
                        ) : (
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600 uppercase font-bold border-b border-gray-200">
                                        <th className="p-3 w-12 text-center">Pilih</th>
                                        <th className="p-3">Internal Barcode</th>
                                        <th className="p-3">Part Name</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 font-semibold text-gray-700">
                                    {availableItems.map(item => (
                                        <tr key={item.id} className={`hover:bg-gray-50 ${selectedItems.includes(item.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="w-4 h-4 accent-[#002060]"
                                                />
                                            </td>
                                            <td className="p-3 font-mono text-[#002060] font-bold">{item.internal_barcode}</td>
                                            <td className="p-3 truncate max-w-[240px]">{item.part_name || 'Epson Component'}</td>
                                            <td className="p-3"><span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full">{item.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* BOTTOM PANEL SUBMIT ACTION */}
                <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-500 font-bold">
                        Total Terpilih: <span className="text-lg text-[#002060] font-black">{selectedItems.length}</span> Boks Komponen
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/desktop/transits')}
                            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || selectedItems.length === 0}
                            className={`px-6 py-2.5 bg-[#002060] text-white text-xs font-bold hover:bg-blue-900 transition-colors tracking-wider shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed animate-pulse' : ''
                                }`}
                        >
                            {isLoading ? 'SUBMITTING...' : '🖨️ GENERATE & PRINT SURAT JALAN'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}