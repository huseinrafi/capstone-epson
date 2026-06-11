import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';

import Manifests from './components/Manifests';
import Anomalies from './components/Anomalies';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';
import ManifestQueue from './components/ManifestQueue';
import BarcodeScanner from './components/BarcodeScanner';
import CaptureEvidence from './components/CaptureEvidence';
import WaitingApproval from './components/WaitingApproval';
import ManifestCompleted from './components/ManifestCompleted';
import TransitScanner from './components/TransitScanner';
import Forbidden from './components/Forbidden';
import Profile from "./components/Profile";
import TransitQueue from "./components/TransitQueue";
import CreateTransit from './components/CreateTransit';
import PrintTransitLabel from './components/PrintTransitLabel';

// ─── INTERCEPTOR FETCH GLOBAL UNTUK HTTP 401 ──────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const isLoginRequest = args[0] && typeof args[0] === 'string' && args[0].includes('/login');
    if (!isLoginRequest && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      if (!window.isSessionExpiredAlerted) {
        window.isSessionExpiredAlerted = true;
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        window.location.href = "/login";
      }
    }
  }
  return response;
};

// Helper untuk mengecek tanggal kadaluarsa dari token JWT secara lokal
function checkTokenExpiration() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    if (exp && exp < Date.now() / 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      if (!window.isSessionExpiredAlerted) {
        window.isSessionExpiredAlerted = true;
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        window.location.href = "/login";
      }
    }
  } catch (e) {
    console.error("Token parse error:", e);
  }
}

// ─── KOMPONEN PROTEKSI AKSES ROLE (RBAC ENGINE) ──────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Validasi masa aktif token saat ganti route/komponen dimuat
  checkTokenExpiration();

  // 1. Jika token tidak valid/kosong, paksa kembali ke gerbang Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Jika role pengguna tidak terdaftar dalam wewenang halaman, lempar ke 403 Forbidden
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // 3. Jika verifikasi lolos, izinkan halaman dimuat secara bersih
  return children;
}

export default function App() {
  useEffect(() => {
    // Reset flag saat aplikasi di-load/mount
    window.isSessionExpiredAlerted = false;

    // Lakukan pemeriksaan berkala setiap 5 menit (tidak mengganggu saat demo)
    const interval = setInterval(() => {
      checkTokenExpiration();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // ─── MATRIKS GRUP OTORISASI SESUAI SPESIFIKASI OPERASIONAL ─────────────────
  
  // 1. Level Tertinggi Eksekutif (Hanya Manajer yang memegang kendali user)
  const managerOnly = ['manajer', 'manager'];
  
  // 2. Level Manajemen Analytics (Supervisor dan Manajer)
  const analyticsRoles = ['supervisor', 'manajer', 'manager'];

  // 3. Level Dasbor Kontrol (Admin Gudang bisa memantau/input, Supervisor & Manajer punya kontrol penuh)
  const desktopControlRoles = ['supervisor', 'manajer', 'manager', 'admin_gudang', 'admin'];

  // 4. Aturan Hierarki Atas ke Bawah: Supervisor, Manajer, & Admin wajib bisa mengakses fitur lapangan (Mobile)
  const mobileExecutionRoles = [
    'operator', 
    'operator_gudang', 
    'operator_checker', 
    'operator checker', 
    'admin_gudang', 
    'admin',
    'supervisor',
    'manajer',
    'manager'
  ];

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<Forbidden />} />

        {/* ─── DESKTOP VIEW ROUTES (MANAGEMENT CONTROL TOWER) ─── */}
        <Route
          path="/manifests"
          element = {
            <ProtectedRoute allowedRoles={desktopControlRoles}>
              <Manifests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-transit"
          element = {
            <ProtectedRoute allowedRoles={desktopControlRoles}>
              <CreateTransit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/print-transit-label"
          element = {
            <ProtectedRoute allowedRoles={desktopControlRoles}>
              <PrintTransitLabel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/anomalies"
          element = {
            <ProtectedRoute allowedRoles={analyticsRoles}>
              <Anomalies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element = {
            <ProtectedRoute allowedRoles={analyticsRoles}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element = {
            <ProtectedRoute allowedRoles={managerOnly}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* ─── MOBILE VIEW ROUTES (FIELD RUNTIME LOGISTICS) ─── */}
        {/* Catatan Penting: Parameter URL menggunakan :id (konsisten mengacu ke Delivery Order ID) */}
        <Route
          path="/inbound"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <ManifestQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scanner/:id"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <BarcodeScanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/capture-evidence/:id"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <CaptureEvidence />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waiting-approval/:id"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <WaitingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manifests-completed/:id"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <ManifestCompleted />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transit"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <TransitQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transit-scanner/:id"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <TransitScanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element = {
            <ProtectedRoute allowedRoles={mobileExecutionRoles}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}