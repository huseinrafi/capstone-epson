import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  PENDING: { label: 'PENDING', cls: 'bg-gray-100 text-gray-600 border border-gray-300' },
  IN_PROGRESS: { label: 'IN PROGRESS', cls: 'bg-blue-100 text-blue-700 border border-blue-300' },
  COMPLETED: { label: 'COMPLETED', cls: 'bg-green-100 text-green-700 border border-green-300' },
  HOLD_INBOUND: { label: 'FLAGGED', cls: 'bg-red-100 text-red-700 border border-red-300' },
  RETURNED: { label: 'RETURNED', cls: 'bg-orange-100 text-orange-700 border border-orange-300' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) +
    ', ' + new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Roles yang boleh CREATE manifest
const CAN_CREATE = ['admin_gudang', 'supervisor', 'manajer'];



// ─── CREATE MODAL ─────────────────────────────────────────────────────────────
function CreateManifestModal({ onClose, onSuccess, editId = null }) {
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoadingLookups, setLoadingLookups] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [doNumber, setDoNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { sku: '', part_name: '', vendor_barcode: '', expected_qty: 0 },
  ]);

  // Load vendors & warehouses
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
        const [vRes, wRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/lookups/vendors`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/lookups/warehouses`, { headers }),
        ]);
        const [vData, wData] = await Promise.all([vRes.json(), wRes.json()]);
        if (vData.success) setVendors(vData.data);
        if (wData.success) setWarehouses(wData.data);

        if (editId) {
          const detailRes = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${editId}`, { headers });
          const detailData = await detailRes.json();
          if (detailData.success) {
            const m = detailData.data;
            setDoNumber(m.do_number || '');
            setVendorId(m.vendor_id || '');
            setWarehouseId(m.warehouse_id || '');
            setNotes(m.notes || '');
            if (m.items && m.items.length > 0) {
              setItems(m.items.map(it => ({
                sku: it.sku || '',
                part_name: it.part_name || '',
                vendor_barcode: it.vendor_barcode || '',
                expected_qty: it.expected_qty || 0
              })));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLookups(false);
      }
    };
    load();
  }, [editId]);

  const addRow = () => setItems(prev => [...prev, { sku: '', part_name: '', vendor_barcode: '', expected_qty: 0 }]);
  const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const totalLines = items.length;

  const handleSubmit = async () => {
    setError('');
    if (!doNumber.trim()) { setError('DO Number wajib diisi.'); return; }
    if (!vendorId) { setError('Vendor wajib dipilih.'); return; }
    if (!warehouseId) { setError('Warehouse wajib dipilih.'); return; }

    const validItems = items.filter(it => it.sku.trim() && it.vendor_barcode.trim() && it.expected_qty > 0);
    if (validItems.length === 0) {
      setError('Minimal 1 item valid (SKU, barcode, dan qty > 0 wajib diisi).');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = editId
        ? `${import.meta.env.VITE_API_URL}/delivery-orders/${editId}`
        : `${import.meta.env.VITE_API_URL}/delivery-orders`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          do_number: doNumber.trim(),
          vendor_id: vendorId,
          warehouse_id: warehouseId,
          notes: notes.trim() || null,
          items: validItems.map(it => ({
            sku: it.sku.trim(),
            part_name: it.part_name.trim() || it.sku.trim(),
            vendor_barcode: it.vendor_barcode.trim().toUpperCase(),
            expected_qty: parseInt(it.expected_qty, 10),
          })),
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        onSuccess();
      } else {
        setError(result.message || 'Gagal menyimpan manifest.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi server gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-[#002060]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="font-bold text-gray-900 text-base">{editId ? 'Edit Manifest' : 'Create New Manifest'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* ROUTING INFORMATION */}
          <div className="mb-5">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">ROUTING INFORMATION</p>
            <div className="grid grid-cols-3 gap-3">
              {/* DO Number */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Delivery Order (DO) Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-gray-300 focus-within:border-[#002060]">
                  <input
                    value={doNumber}
                    onChange={e => setDoNumber(e.target.value)}
                    placeholder="TYPE DOCUMENT NUMBER"
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Vendor */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Vendor Code <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-gray-300 focus-within:border-[#002060]">
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    className={`flex-1 px-3 py-2 text-sm outline-none bg-transparent appearance-none ${vendorId === '' ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    disabled={isLoadingLookups}
                  >
                    <option value="" className="text-gray-400">Select Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id} className="text-gray-900">{v.code} — {v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Destination Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  className={`w-full border border-gray-300 focus:border-[#002060] px-3 py-2 text-sm outline-none appearance-none ${warehouseId === '' ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  disabled={isLoadingLookups}
                >
                  <option value="" className="text-gray-400">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id} className="text-gray-900">{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-3">
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Notes (opsional)</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="w-full border border-gray-300 focus:border-[#002060] px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          {/* MANIFEST LINE ITEMS */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-gray-500 tracking-widest">MANIFEST LINE ITEMS</p>
              <span className="text-[11px] font-bold text-gray-400 border border-gray-300 px-2 py-0.5">
                Total Lines: {totalLines}
              </span>
            </div>

            <div className="border border-gray-200">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1fr_1fr_1fr_80px_32px] bg-gray-50 border-b border-gray-200 px-2 py-2">
                <span className="text-[10px] font-bold text-gray-500 tracking-wider text-center">#</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider pl-2">ITEM SKU</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider pl-2">PART DESCRIPTION</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider pl-2">VENDOR BARCODE</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider text-center">EXPECTED QTY</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider text-center">ACT</span>
              </div>

              {/* Rows */}
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[32px_1fr_1fr_1fr_80px_32px] items-center border-b border-gray-100 px-2 py-1.5">
                  <span className="text-xs text-gray-400 text-center font-medium">{i + 1}</span>
                  <input
                    value={item.sku}
                    onChange={e => updateRow(i, 'sku', e.target.value)}
                    placeholder="TYPE SKU NUMBER..."
                    className="mx-1 px-2 py-1.5 text-sm border border-dashed border-gray-300 focus:border-[#002060] outline-none w-full font-medium text-[#002060]"
                  />
                  <input
                    value={item.part_name}
                    onChange={e => updateRow(i, 'part_name', e.target.value)}
                    placeholder="Description"
                    className="mx-1 px-2 py-1.5 text-sm border border-gray-200 focus:border-[#002060] outline-none w-full text-gray-600"
                  />
                  <input
                    value={item.vendor_barcode}
                    onChange={e => updateRow(i, 'vendor_barcode', e.target.value.toUpperCase())}
                    placeholder="VB-001"
                    className="mx-1 px-2 py-1.5 text-sm border border-gray-200 focus:border-[#002060] outline-none w-full font-mono text-gray-700"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.expected_qty}
                    onChange={e => updateRow(i, 'expected_qty', e.target.value)}
                    className="mx-1 px-2 py-1.5 text-sm border border-gray-300 focus:border-[#002060] outline-none w-full text-center font-bold text-gray-800"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    disabled={items.length === 1}
                    className="mx-auto text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add row */}
              <button
                onClick={addRow}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors border-t border-dashed border-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ADD NEW ROW
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors">
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#002060] text-white px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isSubmitting ? 'MENYIMPAN...' : editId ? 'UPDATE MANIFEST' : 'SAVE MANIFEST'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────
function DeleteConfirm({ manifest, onClose, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white shadow-xl w-full max-w-sm border-2 border-red-500">
        <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-white font-bold text-base">Cancel Manifest?</h3>
        </div>
        <div className="px-5 py-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            Manifest <span className="font-bold text-[#002060]">{manifest?.do_number}</span> akan dibatalkan dan dihapus dari sistem. Aksi ini tidak bisa diundur.
          </p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 text-sm font-bold hover:bg-gray-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 bg-red-600 text-white py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-60">
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Manifests() {
  const [manifests, setManifests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [expandData, setExpandData] = useState({});
  const [expandLoading, setExpandLoading] = useState({});

  const role = localStorage.getItem('role') || '';
  const navigate = useNavigate();
  const canCreate = ['admin_gudang', 'supervisor', 'manajer'].includes(role);
  const canDelete = ['supervisor', 'manajer'].includes(role);
  const canEdit = ['supervisor', 'manajer'].includes(role);

  // ── KPI state — diambil langsung dari DB, terpisah dari tabel ──────────────
  const [kpi, setKpi] = useState({
    pendingCount: 0,
    inProgressCount: 0,
    completedToday: 0,
    matchRate: 0,
    avgTime: '—',
  });

  // ── Fetch KPI — request paralel per status langsung dari DB ─────────────────
  const fetchKpi = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

      // PENDING VERIFICATION = PENDING + HOLD_INBOUND (perlu tindakan)
      const [pendingRes, holdRes, inProgressRes, completedRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=PENDING&per_page=1`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=HOLD_INBOUND&per_page=1`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=IN_PROGRESS&per_page=100`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?status=COMPLETED&per_page=100`, { headers }),
      ]);

      const [pendingData, holdData, inProgressData, completedData] = await Promise.all([
        pendingRes.json(),
        holdRes.json(),
        inProgressRes.json(),
        completedRes.json(),
      ]);

      // Pending Verification = PENDING + HOLD_INBOUND (keduanya butuh perhatian)
      const pendingOnly = pendingData.success
        ? (pendingData.data?.total ?? pendingData.data?.data?.length ?? 0)
        : 0;
      const holdOnly = holdData.success
        ? (holdData.data?.total ?? holdData.data?.data?.length ?? 0)
        : 0;
      const pendingCount = pendingOnly + holdOnly;

      // In Progress — hitung avg time dari started_at
      const inProgressItems = inProgressData.success ? (inProgressData.data?.data || []) : [];
      const inProgressCount = inProgressData.success
        ? (inProgressData.data?.total ?? inProgressItems.length)
        : 0;

      const avgTime = (() => {
        const withStart = inProgressItems.filter(m => m.started_at);
        if (!withStart.length) return '—';
        const avg = withStart.reduce((sum, m) =>
          sum + (Date.now() - new Date(m.started_at)) / 1000 / 60, 0
        ) / withStart.length;
        return `${Math.round(avg)}m`;
      })();

      // Completed — filter yang hari ini
      const completedItems = completedData.success ? (completedData.data?.data || []) : [];
      const todayStr = new Date().toDateString();
      const completedToday = completedItems.filter(m => {
        if (!m.completed_at) return false;
        return new Date(m.completed_at).toDateString() === todayStr;
      }).length;

      // Match rate = completed / (completed + hold + returned) * 100
      const totalCompleted = completedData.success ? (completedData.data?.total ?? completedItems.length) : 0;
      const matchRate = totalCompleted > 0
        ? Math.min(100, Math.round((completedItems.filter(m => m.status === 'COMPLETED').length / completedItems.length) * 100))
        : 0;

      setKpi({ pendingCount, inProgressCount, completedToday, matchRate, avgTime });
    } catch (err) {
      console.error('KPI fetch error:', err);
    }
  }, []);

  // ── Debounce search query 400ms ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch tabel manifest ───────────────────────────────────────────────────
  const fetchManifests = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ per_page: 50 });
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?${params}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) setManifests(result.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [debouncedSearch]);

  // Fetch expand detail (on demand saat user klik baris)
  const fetchExpand = useCallback(async (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      next.add(id);
      return next;
    });
    if (expandData[id]) return;
    setExpandLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${id}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) setExpandData(prev => ({ ...prev, [id]: result.data }));
    } catch (err) { console.error(err); }
    finally { setExpandLoading(prev => ({ ...prev, [id]: false })); }
  }, [expandData]);

  // Fetch keduanya saat mount dan setiap filter berubah
  useEffect(() => {
    fetchKpi();
    fetchManifests();
  }, [fetchKpi, fetchManifests]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setDeleteTarget(null);
        fetchKpi();
        fetchManifests();
      } else {
        alert(result.message || 'Gagal menghapus manifest.');
      }
    } catch (err) { console.error(err); alert('Koneksi server gagal.'); }
    finally { setIsDeleting(false); }
  };

  // ── Filter (server-side via API, hasil sudah difilter) ───────────────────────
  const filtered = manifests;

  const getLeftBarColor = (status) => {
    if (status === 'HOLD_INBOUND') return 'bg-red-500';
    if (status === 'IN_PROGRESS') return 'bg-blue-500';
    if (status === 'COMPLETED') return 'bg-green-500';
    return 'bg-gray-300';
  };

  // Lokasi terkini berdasarkan status manifest
  const getLocationInfo = (m) => {
    switch (m.status) {
      case 'PENDING':      return { loc: 'At Vendor', sub: 'Belum inbound', cls: 'text-gray-500' };
      case 'IN_PROGRESS':  return { loc: m.warehouse?.name || '—', sub: 'Inbound berlangsung', cls: 'text-blue-600' };
      case 'HOLD_INBOUND': return { loc: m.warehouse?.name || '—', sub: 'On Hold / Ditahan', cls: 'text-red-600' };
      case 'COMPLETED':    return { loc: m.warehouse?.name || '—', sub: 'Sudah diterima', cls: 'text-green-600' };
      case 'RETURNED':     return { loc: m.warehouse?.name || '—', sub: 'Dikembalikan', cls: 'text-orange-600' };
      default:             return { loc: m.warehouse?.name || '—', sub: '—', cls: 'text-gray-500' };
    }
  };

  // Bangun timeline perpindahan dari data detail
  const buildTimeline = (manifest, detail) => {
    const steps = [{
      id: 'inbound', type: 'INBOUND',
      from: manifest.vendor?.name || 'Vendor',
      to: manifest.warehouse?.name || '—',
      status: manifest.status,
      docNumber: manifest.do_number,
      date: manifest.completed_at || manifest.started_at || manifest.created_at,
    }];
    if (detail?.internal_items) {
      const seen = new Set();
      const transits = [];
      detail.internal_items.forEach(item =>
        (item.transit_items || []).forEach(ti => {
          if (ti.transit && !seen.has(ti.transit.id)) {
            seen.add(ti.transit.id);
            transits.push(ti.transit);
          }
        })
      );
      transits.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      transits.forEach(t => steps.push({
        id: t.id, type: 'TRANSIT',
        from: t.origin_warehouse?.name || '—',
        to: t.destination_warehouse?.name || '—',
        status: t.status,
        docNumber: t.transit_number,
        date: t.departed_at,
        arrivedAt: t.arrived_at,
      }));
    }
    return steps;
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">

      <Sidebar onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
      }} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Manifests Control</h1>
            <p className="text-[11px] text-gray-500">Manage inbound deliveries and vendor drops.</p>
          </div>
          <div className="flex-1 max-w-xs flex items-center border border-gray-300 bg-white px-3 gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search DO Number or Vendor..."
              className="flex-1 py-2 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canCreate && (
              <>
                <button
                  onClick={() => navigate('/create-transit')}
                  className="flex items-center gap-2 border border-gray-300 text-[#002060] px-4 py-2 text-sm font-bold hover:bg-[#002060] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  ISSUE TRANSIT DOCUMENT
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-[#002060] text-white px-4 py-2 text-sm font-bold hover:bg-blue-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  CREATE MANIFEST
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          <div className="max-w-full">

            {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Pending */}
              <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">PENDING VERIFICATION</p>
                  <p className="text-4xl font-bold text-gray-900">{kpi.pendingCount}</p>
                  {kpi.pendingCount > 0 && (
                    <p className="text-xs text-[#C0392B] font-bold mt-1">↑ {kpi.pendingCount} high priority</p>
                  )}
                </div>
                <div className="text-gray-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">IN PROGRESS DROPS</p>
                  <p className="text-4xl font-bold text-gray-900">{kpi.inProgressCount}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Avg time: {kpi.avgTime}
                  </p>
                </div>
                <div className="text-gray-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>

              {/* Completed Today */}
              <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">COMPLETED TODAY</p>
                  <p className="text-4xl font-bold text-gray-900">{kpi.completedToday}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {kpi.matchRate}% match rate
                  </p>
                </div>
                <div className="text-gray-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ── TABLE ────────────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">Active Delivery Orders</h2>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[4px_2fr_2fr_1.5fr_1.5fr_2fr_1fr] items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div />
                <span className="text-[10px] font-bold text-gray-500 tracking-widest pl-3">DO NUMBER</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">VENDOR</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">STATUS</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">WAREHOUSE</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">ARRIVAL DATE/TIME</span>
                <span className="text-[10px] font-bold text-gray-500 tracking-widest text-right">ACTIONS</span>
              </div>

              {/* Rows */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">Tidak ada manifest ditemukan.</div>
              ) : (
                filtered.map(m => {
                  const st = STATUS_STYLE[m.status] || STATUS_STYLE.PENDING;
                  const locInfo = getLocationInfo(m);
                  const isExpanded = expandedIds.has(m.id);
                  return (
                    <div key={m.id} className="border-b border-gray-50">
                      {/* Main row */}
                      <div className="grid grid-cols-[4px_2fr_2fr_1.5fr_1.5fr_2fr_1fr] items-center px-4 py-3.5 hover:bg-gray-50 transition-colors">
                        {/* Color indicator */}
                        <div className={`self-stretch w-1 rounded-full ${getLeftBarColor(m.status)}`} />

                        {/* DO Number */}
                        <span className="font-bold text-gray-900 text-sm pl-3">{m.do_number}</span>

                        {/* Vendor */}
                        <span className="text-sm text-gray-700">{m.vendor?.name || '—'}</span>

                        {/* Status */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 w-fit ${st.cls}`}>
                          {m.status === 'HOLD_INBOUND' && '⚠ '}
                          {m.status === 'IN_PROGRESS' && '↺ '}
                          {m.status === 'COMPLETED' && '✓ '}
                          {st.label}
                        </span>

                        {/* Warehouse — current location, klik untuk expand */}
                        <button
                          onClick={() => fetchExpand(m.id)}
                          className="flex items-center gap-1.5 text-left group w-full"
                          title="Klik untuk lihat riwayat perpindahan"
                        >
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${locInfo.cls}`}>{locInfo.loc}</p>
                            <p className="text-[10px] text-gray-400 truncate">{locInfo.sub}</p>
                          </div>
                          <svg
                            className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Date */}
                        <span className="text-sm text-gray-600">{fmtDate(m.created_at)}</span>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const isEditable = m.status === 'PENDING' && canEdit;
                            const isDeletable = m.status === 'PENDING' && canDelete;
                            return (
                              <>
                                <button
                                  onClick={() => isEditable && setEditTargetId(m.id)}
                                  disabled={!isEditable}
                                  className={`p-2 transition-colors rounded shadow-xs border ${isEditable ? 'text-gray-500 hover:text-[#002060] border-gray-300 hover:bg-gray-50 cursor-pointer' : 'text-gray-300 border-gray-200 cursor-not-allowed opacity-50'}`}
                                  title={isEditable ? "Edit manifest" : !canEdit ? "Hanya Supervisor/Manajer yang dapat mengedit" : "Hanya manifest berstatus PENDING yang dapat diedit"}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => isDeletable && setDeleteTarget(m)}
                                  disabled={!isDeletable}
                                  className={`p-2 transition-colors rounded shadow-xs border ${isDeletable ? 'text-red-600 hover:text-white border-red-300 hover:bg-red-600 cursor-pointer' : 'text-gray-300 border-gray-200 cursor-not-allowed opacity-50'}`}
                                  title={isDeletable ? "Hapus manifest" : !canDelete ? "Hanya Supervisor/Manajer yang dapat menghapus" : "Hanya manifest berstatus PENDING yang dapat dihapus"}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Expand: Warehouse Movement Timeline */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                          <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-4">WAREHOUSE MOVEMENT HISTORY</p>
                          {expandLoading[m.id] ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                              <div className="w-4 h-4 border-2 border-[#002060] border-t-transparent rounded-full animate-spin" />
                              Memuat riwayat perpindahan...
                            </div>
                          ) : (
                            <div className="flex items-start flex-wrap gap-2">
                              {buildTimeline(m, expandData[m.id]).map((step, idx, arr) => (
                                <div key={step.id} className="flex items-start">
                                  {/* Step card */}
                                  <div className={`rounded border px-3 py-2 min-w-[140px] max-w-[200px] ${step.type === 'INBOUND' ? 'bg-blue-50 border-blue-200' : 'bg-indigo-50 border-indigo-200'}`}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded ${step.type === 'INBOUND' ? 'bg-[#002060] text-white' : 'bg-indigo-600 text-white'}`}>
                                        {step.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="text-gray-500 font-medium truncate">{step.from}</span>
                                      <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                      </svg>
                                      <span className="font-bold text-gray-800 truncate">{step.to}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 font-mono">{step.docNumber}</p>
                                    <p className="text-[10px] text-gray-400">{step.date ? fmtDate(step.date) : 'Belum dimulai'}</p>
                                    {step.type === 'TRANSIT' && (
                                      <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        step.status === 'TRANSIT_COMPLETED' ? 'bg-green-100 text-green-700' :
                                        step.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                                        step.status === 'INVESTIGATION_REQUIRED' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>{step.status?.replace(/_/g, ' ')}</span>
                                    )}
                                  </div>
                                  {/* Arrow connector */}
                                  {idx < arr.length - 1 && (
                                    <div className="flex items-center self-center mx-1 mt-1">
                                      <div className="h-px w-5 bg-gray-300" />
                                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })

              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      {showCreate && (
        <CreateManifestModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchKpi(); fetchManifests(); }}
        />
      )}
      {editTargetId && (
        <CreateManifestModal
          editId={editTargetId}
          onClose={() => setEditTargetId(null)}
          onSuccess={() => { setEditTargetId(null); fetchKpi(); fetchManifests(); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          manifest={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}