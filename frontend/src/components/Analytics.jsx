import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function Analytics() {
  // Main page filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Lookup options
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Live analytics data
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    summary: {
      total_delivery_orders: 0,
      total_match_scans: 0,
      total_anomalies: 0,
      average_processing_minutes: 0,
    },
    trend: [],
    distribution: []
  });

  // Modal export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('2024-05-01');
  const [exportDateTo, setExportDateTo] = useState('2024-05-31');
  const [exportFileFormat, setExportFileFormat] = useState('PDF');
  const [exportScope, setExportScope] = useState('All');
  const [exportVendorId, setExportVendorId] = useState('');
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Lookups
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

    fetch(`${import.meta.env.VITE_API_URL}/lookups/vendors`, { headers })
      .then(r => r.json())
      .then(res => { if (res.success) setVendors(res.data || []); })
      .catch(console.error);

    fetch(`${import.meta.env.VITE_API_URL}/lookups/warehouses`, { headers })
      .then(r => r.json())
      .then(res => { if (res.success) setWarehouses(res.data || []); })
      .catch(console.error);
  }, []);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

    let url = `${import.meta.env.VITE_API_URL}/dashboard/overview?date_from=${dateFrom}&date_to=${dateTo}`;
    if (selectedVendor) url += `&vendor_id=${selectedVendor}`;
    if (selectedWarehouse) url += `&warehouse_id=${selectedWarehouse}`;

    try {
      const response = await fetch(url, { headers });
      const result = await response.json();
      if (result.success) {
        const d = result.data;
        
        // Map discrepancy trend
        const mappedTrend = (d.discrepancy_trend || []).map(item => ({
          name: item.period.split('-').pop(), // get day number
          anomalies: item.total
        }));

        // Map anomaly distribution
        const mappedDist = (d.anomaly_distribution || []).map(item => {
          let color = '#7F8C8D';
          if (item.type === 'MISSING') color = '#C0392B';
          if (item.type === 'OVER' || item.type === 'EXCESSIVE') color = '#F39C12';
          if (item.type === 'MISMATCH') color = '#002060';
          return {
            name: item.type,
            value: item.total,
            color
          };
        });

        setStats({
          summary: d.summary || { total_delivery_orders: 0, total_match_scans: 0, total_anomalies: 0, average_processing_minutes: 0 },
          trend: mappedTrend.length ? mappedTrend : [{ name: '01', anomalies: 0 }],
          distribution: mappedDist
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedVendor, selectedWarehouse]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Modal export form validation
  useEffect(() => {
    if (exportDateFrom && exportDateTo) {
      if (new Date(exportDateTo) < new Date(exportDateFrom)) {
        setExportError('Tanggal akhir tidak boleh mendahului tanggal mulai.');
      } else {
        setExportError('');
      }
    }
  }, [exportDateFrom, exportDateTo]);

  // Export report execution
  const handleExport = async () => {
    if (exportError) return;
    setIsExporting(true);

    const token = localStorage.getItem('token');
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

    let url = `${import.meta.env.VITE_API_URL}/dashboard/anomalies/drilldown?date_from=${exportDateFrom}&date_to=${exportDateTo}&per_page=100`;
    if (exportScope === 'Specific Vendor' && exportVendorId) {
      url += `&vendor_id=${exportVendorId}`;
    }

    try {
      const response = await fetch(url, { headers });
      const result = await response.json();
      
      if (!result.success) {
        setExportError('Gagal mengambil data laporan dari server.');
        setIsExporting(false);
        return;
      }

      const anomaliesList = result.data?.data || [];
      const dateRangeStr = `${exportDateFrom}_to_${exportDateTo}`;

      if (exportFileFormat === 'CSV' || exportFileFormat === 'Excel') {
        // Build CSV Content
        const csvRows = [];
        // Header
        csvRows.push(['No.', 'Type', 'Affected SKU', 'Discrepancy Type', 'Expected Qty', 'Actual Qty', 'Status', 'Reporter', 'Date Reported'].join(','));
        
        anomaliesList.forEach((anomaly, index) => {
          const row = [
            index + 1,
            anomaly.anomaly_type,
            `"${anomaly.affected_sku || '-'}"`,
            anomaly.discrepancy_type,
            anomaly.expected_qty,
            anomaly.actual_qty,
            anomaly.status,
            `"${anomaly.reporter?.name || '-'}"`,
            `"${anomaly.created_at ? new Date(anomaly.created_at).toLocaleDateString('id-ID') : '-'}"`
          ];
          csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Epson_Logistics_Report_${dateRangeStr}.${exportFileFormat === 'Excel' ? 'xlsx' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFileFormat === 'PDF') {
        // Generate an HTML styled page that auto-prints to PDF
        const vendorText = exportScope === 'Specific Vendor' 
          ? (vendors.find(v => v.id === exportVendorId)?.name || 'Specific') 
          : 'All Vendors';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Epson Logistics Discrepancy Report</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                .header { border-bottom: 2px solid #002060; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 24px; font-weight: bold; color: #002060; }
                .meta { margin-top: 10px; font-size: 14px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
                th { background-color: #f8f9fa; color: #002060; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .footer { margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">Epson Logistics Discrepancy Report</div>
                <div class="meta">
                  Periode: <strong>${exportDateFrom} s.d. ${exportDateTo}</strong> | Scope: <strong>${vendorText}</strong>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Tipe</th>
                    <th>SKU Terkena</th>
                    <th>Discrepancy</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  ${anomaliesList.map((a, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${a.anomaly_type}</td>
                      <td>${a.affected_sku || '-'}</td>
                      <td>${a.discrepancy_type}</td>
                      <td>${a.expected_qty}</td>
                      <td>${a.actual_qty}</td>
                      <td>${a.status}</td>
                      <td>${a.reporter?.name || '-'}</td>
                      <td>${a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="footer">
                Dicetak pada ${new Date().toLocaleString('id-ID')} | SVSB Logistics Management System
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }

      setShowExportModal(false);
    } catch (err) {
      setExportError('Koneksi terputus saat mencoba mengunduh file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  // Match rate percentage calculation helper
  const totalScans = stats.summary.total_match_scans + stats.summary.total_anomalies;
  const matchRate = totalScans > 0 
    ? ((stats.summary.total_match_scans / totalScans) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans text-gray-800">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Analytics Overview</h1>
            <p className="text-[11px] text-gray-500">High-level KPI view for current shift.</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#002060] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Consolidated Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 bg-white border border-gray-200 p-4 shadow-sm rounded-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Mulai Tanggal</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-[#002060]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Sampai Tanggal</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-[#002060]" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Gudang</label>
                <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-[#002060] bg-white font-semibold text-gray-700">
                  <option value="">Semua Gudang</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Vendor</label>
                <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-[#002060] bg-white font-semibold text-gray-700">
                  <option value="">Semua Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div>
                <button onClick={fetchOverview} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs font-bold transition-colors rounded-sm shadow-sm">
                  Refresh Data
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={() => {
                  setExportDateFrom(dateFrom);
                  setExportDateTo(dateTo);
                  setShowExportModal(true);
                }}
                className="bg-[#002060] text-white px-5 py-2.5 font-bold text-xs flex items-center gap-2 rounded-sm shadow-sm hover:bg-blue-900 transition-colors w-full md:w-auto justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Report
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            {/* Card 1 */}
            <div className="bg-white border-l-4 border-l-[#002060] border-y border-r border-gray-200 p-5 shadow-sm rounded-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-500 tracking-wider">TOTAL DOs PROCESSED</p>
                <div className="w-6 h-6 bg-blue-50 text-[#002060] rounded flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.summary.total_delivery_orders}</p>
              <p className="text-[11px] font-bold text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                +12% vs last shift
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border-l-4 border-l-[#28A745] border-y border-r border-gray-200 p-5 shadow-sm rounded-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-500 tracking-wider">MATCH RATE %</p>
                <div className="w-6 h-6 bg-green-50 text-[#28A745] rounded flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{matchRate}%</p>
              <p className="text-[11px] font-bold text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                +0.5% vs target
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border-l-4 border-l-[#DC3545] border-y border-r border-gray-200 p-5 shadow-sm rounded-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-500 tracking-wider">TOTAL ANOMALIES</p>
                <div className="w-6 h-6 bg-red-50 text-[#DC3545] rounded flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.summary.total_anomalies}</p>
              <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
                Requires immediate review
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white border-l-4 border-l-[#002060] border-y border-r border-gray-200 p-5 shadow-sm rounded-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-gray-500 tracking-wider">AVG PROCESS TIME</p>
                <div className="w-6 h-6 bg-blue-50 text-[#002060] rounded flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.summary.average_processing_minutes}m</p>
              <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                <span className="w-3 h-[2px] bg-gray-400 block shrink-0 rounded" />
                Stable vs Baseline
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-[2fr_1fr] gap-6">
            {/* Chart 1 */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col">
              <div className="border-b border-gray-100 px-5 py-3 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-sm text-[#002060]">Discrepancy Trend (Last 7 Days)</h3>
              </div>
              <div className="p-6 flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A4B9F" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1A4B9F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                      itemStyle={{ color: '#002060', fontWeight: 'bold' }}
                      labelStyle={{ color: '#6B7280', fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="anomalies" stroke="#1A4B9F" strokeWidth={3} fillOpacity={1} fill="url(#colorAnomalies)" />
                    <Area type="monotone" dataKey="anomalies" stroke="none" fill="none" dot={{r: 4, fill: '#1A4B9F', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col">
              <div className="border-b border-gray-100 px-5 py-3 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-sm text-[#002060]">Anomaly Distribution</h3>
              </div>
              <div className="p-6 flex-1 min-h-[350px] flex items-center justify-between gap-4">
                {stats.distribution.length === 0 ? (
                  <p className="text-sm text-gray-400 italic w-full text-center">Tidak ada data anomali untuk periode ini.</p>
                ) : (
                  <>
                    <div className="w-[55%] h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {stats.distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="w-[45%] flex flex-col gap-4 pr-2">
                      {stats.distribution.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[11px] font-bold text-gray-600 tracking-wider break-all">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-sm">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[440px] shadow-2xl rounded-sm overflow-hidden border border-gray-200">
            <div className="bg-[#002060] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <h2 className="font-bold text-sm tracking-wide">Export Report Configuration</h2>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-blue-200 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="px-6 py-6">
              {/* Export Error Alert inside Modal (No popup alert!) */}
              {exportError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{exportError}</span>
                </div>
              )}

              {/* Date Range */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <label className="text-[11px] font-bold text-[#002060] tracking-widest">DATE RANGE</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">From Date</label>
                    <input type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)} className="w-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-[#002060]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">To Date</label>
                    <input type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)} className="w-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-[#002060]" />
                  </div>
                </div>
              </div>

              {/* File Format */}
              <div className="mb-6 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <label className="text-[11px] font-bold text-[#002060] tracking-widest">FILE FORMAT</label>
                </div>
                <div className="flex items-center gap-3">
                  {['PDF', 'Excel', 'CSV'].map(fmt => (
                    <button 
                      key={fmt}
                      onClick={() => setExportFileFormat(fmt)}
                      className={`flex-1 py-2.5 text-sm font-bold border rounded-sm transition-colors ${exportFileFormat === fmt ? 'bg-blue-50 border-[#002060] text-[#002060]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Report Scope */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  <label className="text-[11px] font-bold text-[#002060] tracking-widest">REPORT SCOPE</label>
                </div>
                <select 
                  value={exportScope}
                  onChange={e => setExportScope(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-[#002060] mb-4 bg-white"
                >
                  <option value="All">All Vendors</option>
                  <option value="Specific Vendor">Specific Vendor</option>
                </select>

                {exportScope === 'Specific Vendor' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Vendor</label>
                    <select value={exportVendorId} onChange={e => setExportVendorId(e.target.value)} className="w-full border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-[#002060] bg-white">
                      <option value="">Pilih Vendor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs tracking-wider bg-white hover:bg-gray-50 transition-colors shadow-sm rounded-sm"
              >
                CANCEL
              </button>
              <button 
                onClick={handleExport}
                disabled={!!exportError || isExporting}
                className="px-6 py-2.5 bg-[#002060] text-white font-bold text-xs tracking-wider flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    EXPORTING...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    GENERATE EXPORT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}