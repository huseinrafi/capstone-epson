import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DISC_STYLE = {
  MISMATCH:   { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700' },
  MISSING:    { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200',badge: 'bg-orange-100 text-orange-700' },
  OVER:       { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200',badge: 'bg-yellow-100 text-yellow-800' },
  UNEXPECTED: { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200',badge: 'bg-purple-100 text-purple-700' },
};
const STATUS_BADGE = {
  MATCH:      'bg-green-100 text-green-700 border border-green-300',
  MISMATCH:   'bg-red-100 text-red-700 border border-red-300',
  OVER:       'bg-yellow-100 text-yellow-800 border border-yellow-300',
  NOT_FOUND:  'bg-purple-100 text-purple-700 border border-purple-300',
  MISSING:    'bg-gray-100 text-gray-600 border border-gray-300',
  UNEXPECTED: 'bg-purple-100 text-purple-700 border border-purple-300',
};
const timeAgo = (d) => {
  if (!d) return '—';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s/60)} mins ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString('id-ID');
};
const fmtTs = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID') + ' ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ─── SIDEBAR (sama dengan DashboardLayout tapi standalone) ───────────────────
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

// ─── CONFIRM POPUP ────────────────────────────────────────────────────────────
function ConfirmPopup({ decision, anomaly, onClose, onConfirm, isSubmitting }) {
  const doNumber = anomaly?.reference?.do_number || '—';
  const evidenceCount = anomaly?.evidences?.length ?? 0;
  const operatorId = anomaly?.reporter?.id
    ? `OP-${String(anomaly.reporter.id).slice(-4).toUpperCase()}`
    : 'OP-????';

  const config = {
    APPROVE: {
      title: 'Approve Report?',
      body: <>This will <span className="font-bold text-[#002060] underline">let the mismatched package in</span> for <span className="text-[#002060] font-semibold">{doNumber}</span>. This action cannot be undone.</>,
    },
    RETURN: {
      title: 'Return to Vendor?',
      body: <>This will mark <span className="text-[#002060] font-semibold">{doNumber}</span> as <span className="font-bold text-orange-600 underline">RETURNED</span>. This action cannot be undone.</>,
    },
    RECOUNT: {
      title: 'Request Recount?',
      body: <>Operator will be asked to <span className="font-bold text-[#002060] underline">rescan from the beginning</span> for {doNumber}.</>,
    },
    HOLD: {
      title: 'Hold Report?',
      body: <>Keep <span className="text-[#002060] font-semibold">{doNumber}</span> on <span className="font-bold text-gray-600 underline">HOLD</span> pending further investigation.</>,
    },
  };

  const btnClass = {
    APPROVE: 'bg-[#002060] hover:bg-blue-900',
    RETURN:  'bg-orange-600 hover:bg-orange-700',
    RECOUNT: 'bg-gray-700 hover:bg-gray-800',
    HOLD:    'bg-gray-500 hover:bg-gray-600',
  }[decision] || 'bg-[#002060] hover:bg-blue-900';

  const cfg = config[decision] || config.APPROVE;

  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-md">
        <div className="bg-[#002060] px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-white font-bold text-base">{cfg.title}</h3>
        </div>
        <div className="px-5 py-5">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">{cfg.body}</p>
          <div className="bg-[#F0F4FF] border-l-4 border-[#002060] px-4 py-3 flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider">FILES ATTACHED</span>
              <span className="text-[#002060] font-bold text-sm">{evidenceCount} {evidenceCount === 1 ? 'PHOTO' : 'PHOTOS'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider">OPERATOR ID</span>
              <span className="text-[#002060] font-bold text-sm">{operatorId}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200">
              <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">CATATAN (opsional)</label>
              <textarea id="review-notes" className="w-full border border-gray-300 text-sm p-2 outline-none focus:border-[#002060] resize-none h-16" placeholder="Tambahkan catatan keputusan..." />
            </div>
          </div>
        </div>
        <div className="px-5 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            REVIEW AGAIN
          </button>
          <button
            onClick={() => onConfirm(decision, document.getElementById('review-notes')?.value || '')}
            disabled={isSubmitting}
            className={`flex-1 ${btnClass} text-white py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isSubmitting ? 'MEMPROSES...' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT LOG MODAL ──────────────────────────────────────────────────────────
function AuditLogModal({ doId, doNumber, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, per_page: 15 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/delivery-orders/${doId}/scan-results?${params}`,
        { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } }
      );
      const result = await res.json();
      if (res.ok && result.success) setData(result.data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [doId, search, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = [...(data?.scan_results?.data || []), ...(data?.missing_items || [])];
  const totalPages = data?.scan_results?.last_page || 1;

  const handleExport = () => {
    const csv = [
      ['Timestamp','Operator','Scanned Barcode','Status','Device ID'],
      ...rows.map(r => [fmtTs(r.scanned_at), r.operator?.name || '—', r.scanned_barcode || '—', r.result_status, r.device_id || '—']),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit_log_${doNumber}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col rounded-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Audit Log Detail</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">{doNumber}</span>
              <span className="text-[10px] bg-[#002060] text-white px-2 py-0.5 font-bold tracking-wider">{data?.summary?.status || '—'}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 flex items-center border border-gray-300 px-3 gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search Barcode or Operator ID..." className="flex-1 py-2 text-sm outline-none" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-300 text-sm px-3 py-2 outline-none">
            <option value="">All Status</option>
            <option value="MATCH">MATCH</option>
            <option value="MISMATCH">MISMATCH</option>
            <option value="OVER">OVER</option>
            <option value="NOT_FOUND">NOT FOUND</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['TIMESTAMP','OPERATOR ID','SCANNED BARCODE','STATUS','DEVICE ID'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Tidak ada data scan.</td></tr>
                ) : rows.map((row, i) => {
                  const isErr = ['MISMATCH','OVER','NOT_FOUND','UNEXPECTED','MISSING'].includes(row.result_status);
                  return (
                    <tr key={row.id || i} className={isErr ? 'bg-red-50' : ''}>
                      <td className={`px-4 py-3 text-xs ${isErr ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{fmtTs(row.scanned_at)}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${isErr ? 'text-red-600' : 'text-gray-700'}`}>{row.operator ? `OP-${String(row.operator.id || '').slice(-3)}` : '—'}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${isErr ? 'text-red-700 font-bold' : 'text-gray-800'}`}>{row.scanned_barcode || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_BADGE[row.result_status] || 'bg-gray-100 text-gray-600'}`}>
                          {row.result_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.device_id || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">Showing {rows.length} of {data?.scan_results?.total ?? 0} scans</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Anomalies() {
  const navigate = useNavigate();

  const [anomalies, setAnomalies]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isDetailLoad, setDetailLoad] = useState(false);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [confirmPopup, setConfirm]  = useState(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [auditLog, setAuditLog]     = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ per_page: 50 });
      if (typeFilter) params.append('anomaly_type', typeFilter);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/anomalies/review-queue?${params}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) setAnomalies(result.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch detail ────────────────────────────────────────────────────────────
  const fetchDetail = async (id) => {
    setDetailLoad(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/anomalies/${id}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) setSelected(result.data);
    } catch (err) { console.error(err); }
    finally { setDetailLoad(false); }
  };

  // ── Review ──────────────────────────────────────────────────────────────────
  const handleReview = async (decision, notes) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/anomalies/${selected.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ decision, notes: notes || null }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setConfirm(null);
        setSelected(null);
        fetchList();
      } else {
        alert(result.message || 'Gagal memproses keputusan.');
      }
    } catch (err) { console.error(err); alert('Koneksi server gagal.'); }
    finally { setSubmitting(false); }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = anomalies.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.reference?.do_number || '').toLowerCase().includes(q) ||
           (a.affected_sku || '').toLowerCase().includes(q);
  });

  const counts = {
    ALL:      anomalies.length,
    MISMATCH: anomalies.filter(a => a.discrepancy_type === 'MISMATCH').length,
    MISSING:  anomalies.filter(a => a.discrepancy_type === 'MISSING').length,
    OVER:     anomalies.filter(a => a.discrepancy_type === 'OVER').length,
  };

  const sel = selected;
  const selStyle = DISC_STYLE[sel?.discrepancy_type] || DISC_STYLE.MISMATCH;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">

      {/* SIDEBAR */}
      <Sidebar onLogout={handleLogout} />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOPBAR (khusus Anomalies — bukan topbar umum) ───────────────── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Anomaly Queue</h1>
            <p className="text-[11px] text-gray-500">Review and resolve flagged inbound sessions.</p>
          </div>

          {/* Search — di topbar */}
          <div className="flex-1 max-w-xs flex items-center border border-gray-300 bg-white px-3 gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SKU or Session..."
              className="flex-1 py-2 text-sm outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter button */}
            <button className="flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              FILTER
            </button>

            {/* Log Detail — di topbar pojok kanan */}
            {selected && (
              <button
                onClick={() => setAuditLog({ doId: selected.reference_id, doNumber: selected.reference?.do_number || '—' })}
                className="flex items-center gap-2 border border-[#002060] text-[#002060] px-3 py-2 text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                LOG DETAIL
              </button>
            )}
          </div>
        </header>

        {/* ── BODY: 30% list + 70% detail ─────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LIST — 30% */}
          <div className="w-[30%] min-w-[260px] max-w-[380px] flex flex-col border-r border-gray-200 bg-white overflow-hidden">

            {/* Filter tabs */}
            <div className="flex flex-wrap px-3 py-2 gap-1 border-b border-gray-100">
              {[
                { key: '',                    label: 'ALL',      count: counts.ALL },
                { key: 'INBOUND_DISCREPANCY', label: 'MISMATCH', count: counts.MISMATCH },
                { key: 'INBOUND_MISSING',     label: 'MISSING',  count: counts.MISSING },
                { key: 'INBOUND_OVER',        label: 'OVER',     count: counts.OVER },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setTypeFilter(tab.key); setSelected(null); }}
                  className={`text-[11px] font-bold px-2.5 py-1 border transition-colors ${
                    typeFilter === tab.key
                      ? 'bg-[#002060] text-white border-[#002060]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Tidak ada anomali.</p>
              ) : (
                filtered.map(a => {
                  const c = DISC_STYLE[a.discrepancy_type] || DISC_STYLE.MISMATCH;
                  const doNum = a.reference?.do_number || a.reference_id?.slice(0,8) || '—';
                  const isActive = selected?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => fetchDetail(a.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                        isActive
                          ? 'bg-blue-50 border-l-4 border-l-[#002060]'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold tracking-wider">SESSION #{a.id?.slice(-5).toUpperCase()}</p>
                          <p className="font-bold text-gray-900 text-sm">{doNum}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-0.5 ${c.badge}`}>
                          ⚠ {a.discrepancy_type}
                        </span>
                      </div>
                      <div className="flex gap-4 mb-1">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold tracking-wider">EXPECTED</p>
                          <p className="text-xs text-gray-700">SKU: {a.affected_sku || '—'}</p>
                        </div>
                        {a.actual_qty !== null && (
                          <div>
                            <p className="text-[9px] text-gray-400 font-bold tracking-wider">ACTUAL</p>
                            <p className={`text-xs font-bold ${c.text}`}>
                              {a.discrepancy_type === 'MISMATCH' ? 'MISMATCH' : `${a.actual_qty}`}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">🕒 {timeAgo(a.created_at)} · Op. {a.reporter?.name?.split(' ')[0] || '—'}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* DETAIL — 70% */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selected && !isDetailLoad ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Pilih anomali dari daftar untuk melihat detail</p>
                </div>
              </div>
            ) : isDetailLoad ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div className={`px-6 py-4 ${selStyle.bg} border-b ${selStyle.border} flex justify-between items-start shrink-0`}>
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1 mb-1 ${selStyle.text}`}>⚠ {sel.discrepancy_type}</span>
                    <h2 className="font-bold text-gray-900 text-xl">{sel.reference?.do_number || '—'}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Session #{sel.id?.slice(-5).toUpperCase()} • {sel.reference?.warehouse?.name || 'INBOUND-1'} • Operator: {sel.reporter?.name || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold tracking-wider">DISCREPANCY</p>
                    <p className={`text-2xl font-black ${selStyle.text}`}>
                      {sel.discrepancy_type === 'OVER'
                        ? `+${Math.abs((sel.actual_qty || 0) - (sel.expected_qty || 0))} Units`
                        : `−${sel.expected_qty ?? '?'} Unit(s)`}
                    </p>
                  </div>
                </div>

                {/* Evidence label */}
                <div className="px-6 py-2.5 border-b border-gray-200 shrink-0 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-500 tracking-wider">
                    OPERATOR EVIDENCE ({sel.evidences?.length ?? 0} photos)
                  </span>
                </div>

                {/* Evidence photos */}
                <div className="flex-1 overflow-y-auto p-6">
                  {(!sel.evidences || sel.evidences.length === 0) ? (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 text-gray-400 text-sm">
                      Belum ada foto bukti.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {sel.evidences.map((ev, i) => (
                        <div key={ev.id || i} className="relative group">
                          <img
                            src={ev.file_url}
                            alt={`Evidence ${i+1}`}
                            className="w-full h-52 object-cover border border-gray-200 bg-gray-100"
                            onError={e => { e.currentTarget.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><rect fill='%23f3f4f6' width='400' height='200'/><text fill='%23d1d5db' font-family='sans-serif' font-size='14' x='50%' y='50%' text-anchor='middle' dy='.3em'>Evidence Photo</text></svg>`; }}
                          />
                          {ev.notes && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {ev.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-white shrink-0">
                  <button onClick={() => setConfirm({ decision: 'RECOUNT' })}
                    className="flex items-center gap-2 border border-gray-400 text-gray-700 px-4 py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    RECOUNT
                  </button>
                  <button onClick={() => setConfirm({ decision: 'RETURN' })}
                    className="flex items-center gap-2 border border-orange-500 text-orange-600 px-4 py-2.5 text-sm font-bold hover:bg-orange-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    RETURN
                  </button>
                  <button onClick={() => setConfirm({ decision: 'APPROVE' })}
                    className="flex items-center gap-2 bg-[#002060] text-white px-5 py-2.5 text-sm font-bold hover:bg-blue-900 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    APPROVE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* POPUPS */}
      {confirmPopup && (
        <ConfirmPopup
          decision={confirmPopup.decision}
          anomaly={selected}
          onClose={() => setConfirm(null)}
          onConfirm={handleReview}
          isSubmitting={isSubmitting}
        />
      )}
      {auditLog && (
        <AuditLogModal
          doId={auditLog.doId}
          doNumber={auditLog.doNumber}
          onClose={() => setAuditLog(null)}
        />
      )}
    </div>
  );
}