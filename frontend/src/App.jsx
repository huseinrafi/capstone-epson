import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
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

// ─── KOMPONEN PROTEKSI AKSES ROLE (RBAC ENGINE) ──────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

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
          path="/dashboard"
          element = {
            <ProtectedRoute allowedRoles={desktopControlRoles}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manifests"
          element = {
            <ProtectedRoute allowedRoles={desktopControlRoles}>
              <Manifests />
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