import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';

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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, from: 0, to: 0, last_page: 1 });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserData, setNewUserData] = useState({ name: '', username: '', email: '', password: '', role_id: '' });
  const [editUserRoleData, setEditUserRoleData] = useState({ role_id: '' });
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Hanya kirim parameter yang tidak kosong
      const params = new URLSearchParams({ page: currentPage, per_page: 10 });
      if (search)       params.append('search', search);
      if (roleFilter)   params.append('role_id', roleFilter);
      if (statusFilter) params.append('is_active', statusFilter);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/users?${params}`, { headers });
      const result = await res.json();
      console.log('[UserManagement] fetch result:', res.status, result);

      if (res.ok && result.success) {
        setUsers(result.data.data || []);
        setPagination({
          total: result.data.total || 0,
          from: result.data.from || 0,
          to: result.data.to || 0,
          last_page: result.data.last_page || 1
        });
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter, token]);

  // Fetch Roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/roles`, { headers });
      const result = await res.json();
      if (res.ok && result.success) {
        setRoles(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Add User Submission
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserData)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setShowAddModal(false);
        setNewUserData({ name: '', username: '', email: '', password: '', role_id: '' });
        fetchUsers();
      } else {
        setFormError(result.message || 'Gagal menambahkan user.');
      }
    } catch (err) {
      setFormError('Koneksi server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Role Submission
  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_id: editUserRoleData.role_id })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setShowEditRoleModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setFormError(result.message || 'Gagal merubah role.');
      }
    } catch (err) {
      setFormError('Koneksi server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (user) => {
    if (confirm(`Apakah Anda yakin ingin ${user.is_active ? 'menonaktifkan' : 'mengaktifkan'} user ${user.name}?`)) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${user.id}/toggle-status`, {
          method: 'PATCH',
          headers
        });
        const result = await res.json();
        if (res.ok && result.success) {
          fetchUsers();
        } else {
          alert(result.message || 'Gagal merubah status.');
        }
      } catch (err) {
        alert('Koneksi server gagal.');
      }
    }
  };

  // Helper styles for roles based on database constant slugs
  const getRoleStyle = (slug) => {
    switch (slug) {
      case 'manajer':
      case 'manager':
        return 'bg-[#002060] text-white border border-[#002060]';
      case 'supervisor':
        return 'bg-blue-50 text-blue-700 border border-blue-300';
      case 'admin_gudang':
      case 'admin':
        return 'bg-teal-50 text-teal-700 border border-teal-300';
      default:
        return 'bg-purple-50 text-purple-700 border border-purple-300';
    }
  };

  const getRoleName = (slug) => {
    switch (slug) {
      case 'manajer':
      case 'manager':
        return 'MANAJER';
      case 'supervisor':
        return 'SUPERVISOR';
      case 'admin_gudang':
      case 'admin':
        return 'ADMIN';
      default:
        return 'OPERATOR';
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F8F9FA] font-sans">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── TOPBAR ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 gap-4">
          <div className="shrink-0">
            <h1 className="font-bold text-gray-900 text-sm">Users Control</h1>
            <p className="text-[11px] text-gray-500">Manage personnel access, roles, and security credentials.</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          <div className="max-w-full">
            {/* Header Content */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">System Users</h2>
                <p className="text-xs text-gray-500">Manage personnel access, roles, and security credentials.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#002060] text-white px-4 py-2.5 text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                ADD NEW USER
              </button>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-[1fr_200px_200px] gap-4 mb-6 bg-white p-4 border border-gray-200 shadow-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">SEARCH PERSONNEL</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Scan or enter ID/Name..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm outline-none focus:border-[#002060]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">FILTER BY ROLE</label>
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 text-sm outline-none bg-transparent"
                >
                  <option value="">All Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{getRoleName(r.slug)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 tracking-wider block mb-1">STATUS</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 text-sm outline-none bg-transparent"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-500 uppercase font-bold border-b border-gray-200">
                    <th className="p-4 w-1/4">Employee Name</th>
                    <th className="p-4 w-1/5">Username / ID</th>
                    <th className="p-4 w-1/5 text-center">Assigned Role</th>
                    <th className="p-4 w-1/5 text-center">System Status</th>
                    <th className="p-4 w-1/6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="p-10 text-center">
                        <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-gray-400 font-medium">No users found.</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                          <div className="text-[10px] text-gray-500">{u.email}</div>
                        </td>
                        <td className="p-4 font-mono text-gray-700 text-sm font-semibold">{u.username}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-sm uppercase ${getRoleStyle(u.role?.slug)}`}>
                            {getRoleName(u.role?.slug)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded-sm">
                              ✓ ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-300 px-2 py-0.5 rounded-sm">
                              ∅ INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setEditUserRoleData({ role_id: u.role_id });
                                setShowEditRoleModal(true);
                              }}
                              className="text-gray-500 hover:text-[#002060] border border-gray-300 hover:bg-gray-50 p-2 transition-colors rounded shadow-xs"
                              title="Edit user role"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className="text-gray-500 hover:text-[#002060] border border-gray-300 hover:bg-gray-50 p-2 transition-colors rounded shadow-xs"
                              title={u.is_active ? 'Nonaktifkan User' : 'Aktifkan User'}
                            >
                              {u.is_active ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {/* Open Padlock */}
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {/* Closed Padlock */}
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && pagination.total > 0 && (
              <div className="flex justify-between items-center mt-4 text-xs font-bold text-gray-500">
                <div>
                  Showing {pagination.from} to {pagination.to} of {pagination.total} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 shadow-xs"
                  >
                    &lt; Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.last_page))}
                    disabled={currentPage === pagination.last_page}
                    className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 shadow-xs"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl w-full max-w-md border-2 border-[#002060]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Add New System User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">NAME</label>
                  <input
                    value={newUserData.name}
                    onChange={e => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#002060]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">USERNAME / EMPLOYEE ID</label>
                  <input
                    value={newUserData.username}
                    onChange={e => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g. EMP-9123"
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#002060]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">EMAIL</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={e => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#002060]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">PASSWORD</label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={e => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#002060]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">ASSIGNED ROLE</label>
                  <select
                    value={newUserData.role_id}
                    onChange={e => setNewUserData(prev => ({ ...prev, role_id: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="" disabled>Select a role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{getRoleName(r.slug)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#002060] text-white px-4 py-2 text-xs font-bold hover:bg-blue-900 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'SAVING...' : 'SAVE USER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User Role */}
      {showEditRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl w-full max-w-sm border-2 border-[#002060]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Edit User Role</h2>
              <button onClick={() => { setShowEditRoleModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditRoleSubmit}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                    {formError}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600 mb-2">
                    Mengubah role untuk employee: <strong className="text-gray-900">{selectedUser.name}</strong>
                  </p>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">NEW ASSIGNED ROLE</label>
                  <select
                    value={editUserRoleData.role_id}
                    onChange={e => setEditUserRoleData({ role_id: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none"
                    required
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{getRoleName(r.slug)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => { setShowEditRoleModal(false); setSelectedUser(null); }}
                  className="border border-gray-300 text-gray-700 px-4 py-2 text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#002060] text-white px-4 py-2 text-xs font-bold hover:bg-blue-900 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'UPDATING...' : 'UPDATE ROLE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}