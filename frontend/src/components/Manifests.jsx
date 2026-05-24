import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  PENDING:       { label: 'PENDING',      cls: 'bg-gray-100 text-gray-600 border border-gray-300' },
  IN_PROGRESS:   { label: 'IN PROGRESS',  cls: 'bg-blue-100 text-blue-700 border border-blue-300' },
  COMPLETED:     { label: 'COMPLETED',    cls: 'bg-green-100 text-green-700 border border-green-300' },
  HOLD_INBOUND:  { label: 'FLAGGED',      cls: 'bg-red-100 text-red-700 border border-red-300' },
  RETURNED:      { label: 'RETURNED',     cls: 'bg-orange-100 text-orange-700 border border-orange-300' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) +
    ', ' + new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Roles yang boleh CREATE manifest
const CAN_CREATE = ['admin_gudang', 'supervisor', 'manajer'];

function Sidebar({ onLogout }) {
  const navItem = ({ isActive }) =>
    `px-4 py-3 text-sm font-medium flex items-center gap-3 transition-colors rounded-md ${
      isActive ? 'bg-[#1A4B9F] text-white' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <aside className="w-[240px] shrink-0 bg-[#F8F9FA] border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#002060] text-white text-xs font-bold flex items-center justify-center rounded">E</div>
          <div>
            <p className="text-[#002060] font-bold text-sm leading-tight">SVSB Supervisor</p>
            <p className="text-gray-500 text-[10px]">Problem Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <NavLink to="/dashboard" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/manifests" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Manifests
        </NavLink>
        <NavLink to="/anomalies" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Anomalies
        </NavLink>
        <NavLink to="/analytics" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </NavLink>
        <NavLink to="/users" className={navItem}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          User Management
        </NavLink>
      </nav>

      <div className="border-t border-gray-200 p-3 flex flex-col gap-1">
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 rounded-md w-full text-left font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ─── CREATE MODAL ─────────────────────────────────────────────────────────────
function CreateManifestModal({ onClose, onSuccess }) {
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
      } catch (err) { console.error(err); }
      finally { setLoadingLookups(false); }
    };
    load();
  }, []);

  const addRow = () => setItems(prev => [...prev, { sku: '', part_name: '', vendor_barcode: '', expected_qty: 0 }]);
  const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const totalLines = items.length;

  const handleSubmit = async () => {
    setError('');
    if (!doNumber.trim()) { setError('DO Number wajib diisi.'); return; }
    if (!vendorId)         { setError('Vendor wajib dipilih.'); return; }
    if (!warehouseId)      { setError('Warehouse wajib dipilih.'); return; }

    const validItems = items.filter(it => it.sku.trim() && it.vendor_barcode.trim() && it.expected_qty > 0);
    if (validItems.length === 0) {
      setError('Minimal 1 item valid (SKU, barcode, dan qty > 0 wajib diisi).');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders`, {
        method: 'POST',
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
        setError(result.message || 'Gagal membuat manifest.');
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
            <h2 className="font-bold text-gray-900 text-base">Create New Manifest</h2>
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
                    placeholder="SCAN OR TYPE DO..."
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                  <div className="px-2 text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="4" width="2" height="16"/><rect x="5" y="4" width="1" height="16"/>
                      <rect x="7" y="4" width="2" height="16"/><rect x="10" y="4" width="1" height="16"/>
                      <rect x="12" y="4" width="3" height="16"/>
                    </svg>
                  </div>
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
                    className="flex-1 px-3 py-2 text-sm outline-none bg-transparent appearance-none"
                    disabled={isLoadingLookups}
                  >
                    <option value="">ENTER VENDOR ID</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.code} — {v.name}</option>
                    ))}
                  </select>
                  <div className="px-2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                  </div>
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
                  className="w-full border border-gray-300 focus:border-[#002060] px-3 py-2 text-sm outline-none appearance-none"
                  disabled={isLoadingLookups}
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
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
                    placeholder="SCAN SKU..."
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
            {isSubmitting ? 'MENYIMPAN...' : 'SAVE MANIFEST'}
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
            {isDeleting ? 'Menghapus...' : 'Ya, Batalkan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Manifests() {
  const [manifests, setManifests]     = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const role = localStorage.getItem('role') || '';
  const canCreate = CAN_CREATE.includes(role);

  // ── KPI counts ──────────────────────────────────────────────────────────────
  const pendingCount    = manifests.filter(m => m.status === 'PENDING').length;
  const inProgressCount = manifests.filter(m => m.status === 'IN_PROGRESS').length;
  const completedToday  = manifests.filter(m => {
    if (m.status !== 'COMPLETED' || !m.completed_at) return false;
    const today = new Date().toDateString();
    return new Date(m.completed_at).toDateString() === today;
  }).length;

  const matchRate = manifests.length > 0
    ? Math.round((manifests.filter(m => m.status === 'COMPLETED').length / manifests.length) * 100)
    : 0;

  const avgTime = (() => {
    const done = manifests.filter(m => m.status === 'IN_PROGRESS' && m.started_at);
    if (!done.length) return '—';
    const avg = done.reduce((sum, m) => {
      return sum + (Date.now() - new Date(m.started_at)) / 1000 / 60;
    }, 0) / done.length;
    return `${Math.round(avg)}m`;
  })();

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchManifests = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ per_page: 50 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delivery-orders?${params}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) setManifests(result.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchManifests(); }, [fetchManifests]);

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
        fetchManifests();
      } else {
        alert(result.message || 'Gagal menghapus manifest.');
      }
    } catch (err) { console.error(err); alert('Koneksi server gagal.'); }
    finally { setIsDeleting(false); }
  };

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = manifests.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.do_number.toLowerCase().includes(q) ||
           (m.vendor?.name || '').toLowerCase().includes(q);
  });

  const getLeftBarColor = (status) => {
    if (status === 'HOLD_INBOUND') return 'bg-red-500';
    if (status === 'IN_PROGRESS') return 'bg-blue-500';
    if (status === 'COMPLETED') return 'bg-green-500';
    return 'bg-gray-300';
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">

      {/* 1. SIDEBAR WAJIB DI-RENDER SEJAJAR DENGAN KONTEN VIEW UTAMA */}
      <Sidebar onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
      }} />

      {/* 2. CONTAINER KONTEN (Adopsi 100% Struktur Layout Anomalies) */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── UNIFIED DESKTOP TOPBAR ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Manifests Control</h1>
            <p className="text-[11px] text-gray-500">Manage inbound deliveries and vendor drops.</p>
          </div>

          {/* Search bar diletakkan di topbar untuk konsistensi UI */}
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
            <button className="flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              FILTERS
            </button>
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-[#002060] text-white px-4 py-2 text-sm font-bold hover:bg-blue-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                CREATE MANIFEST
              </button>
            )}
          </div>
        </header>

        {/* ── WORKSPACE CONTENT BODY (Dapat Di-scroll jika data penuh) ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          
          {/* ── KPI CARDS ── */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">PENDING VERIFICATION</p>
                <p className="text-4xl font-bold text-gray-900">{pendingCount}</p>
                {pendingCount > 0 && (
                  <p className="text-xs text-[#C0392B] font-bold mt-1">↑ {pendingCount} high priority</p>
                )}
              </div>
              <div className="text-gray-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">IN PROGRESS DROPS</p>
                <p className="text-4xl font-bold text-gray-900">{inProgressCount}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  Avg time: {avgTime}
                </p>
              </div>
              <div className="text-gray-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-2">COMPLETED TODAY</p>
                <p className="text-4xl font-bold text-gray-900">{completedToday}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  {matchRate}% match rate
                </p>
              </div>
              <div className="text-gray-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── DATA MANIFEST TABLE ── */}
          <div className="bg-white border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Active Delivery Orders</h2>
            </div>

            <div className="grid grid-cols-[4px_2fr_2fr_1.5fr_2fr_1fr] items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <div />
              <span className="text-[10px] font-bold text-gray-500 tracking-widest pl-3">DO NUMBER</span>
              <span className="text-[10px] font-bold text-gray-500 tracking-widest">VENDOR</span>
              <span className="text-[10px] font-bold text-gray-500 tracking-widest">STATUS</span>
              <span className="text-[10px] font-bold text-gray-500 tracking-widest">ARRIVAL DATE/TIME</span>
              <span className="text-[10px] font-bold text-gray-500 tracking-widest text-right">ACTIONS</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Tidak ada manifest ditemukan.</div>
            ) : (
              filtered.map(m => {
                const st = STATUS_STYLE[m.status] || STATUS_STYLE.PENDING;
                const canDelete = m.status === 'PENDING' && canCreate;
                return (
                  <div key={m.id} className="grid grid-cols-[4px_2fr_2fr_1.5fr_2fr_1fr] items-center px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className={`self-stretch w-1 rounded-full ${getLeftBarColor(m.status)}`} />
                    <span className="font-bold text-gray-900 text-sm pl-3">{m.do_number}</span>
                    <span className="text-sm text-gray-700">{m.vendor?.name || '—'}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 w-fit ${st.cls}`}>
                      {m.status === 'HOLD_INBOUND' && '⚠️ '}
                      {m.status === 'IN_PROGRESS' && '↺ '}
                      {m.status === 'COMPLETED' && '✓ '}
                      {st.label}
                    </span>
                    <span className="text-sm text-gray-600">{fmtDate(m.created_at)}</span>
                    <div className="flex items-center justify-end gap-2">
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Cancel manifest"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-[#002060] transition-colors p-1" title="View detail">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* MODALS COMPONENTS OVERLAY */}
      {showCreate && (
        <CreateManifestModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchManifests(); }}
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