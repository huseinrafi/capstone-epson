import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Forbidden from './components/Forbidden';
import DashboardLayout from './components/Layouts/DashboardLayout';
import Dashboard from './components/Dashboard';
import Manifests from './components/Manifests';
import Anomalies from './components/Anomalies';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';
import BarcodeScanner from './components/BarcodeScanner';
import ManifestQueue from "./components/ManifestQueue";
import ManifestCompleted from "./components/ManifestCompleted";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/403" element={<Forbidden />} />

        {/* Mobile Operator*/}
        <Route path="/inbound" element={<ManifestQueue />} />
        <Route path="/scanner/:id" element={<BarcodeScanner />} />
        <Route path="/manifests-completed/:id" element={<ManifestCompleted />} />
        <Route path="/capture-evidence/:doId" element={<CaptureEvidence />} />
        <Route path="/waiting-approval/:doId" element={<WaitingApproval />} />
        <Route path="/anomalies" element={<Anomalies />} />

        {/* Protected Routes*/}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/manifests" element={<Manifests />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;