import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindBlood from './pages/FindBlood';
import EmergencyRequest from './pages/EmergencyRequest';
import BloodBanks from './pages/BloodBanks';
import About from './pages/About';
import MapView from './pages/MapView';

// Dashboards
import PatientDashboard from './dashboards/PatientDashboard';
import DonorDashboard from './dashboards/DonorDashboard';
import FacilityDashboard from './dashboards/FacilityDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/find-blood" element={<FindBlood />} />
            <Route path="/become-donor" element={<Register />} />
            <Route path="/blood-banks" element={<BloodBanks />} />
            <Route path="/about" element={<About />} />
            <Route path="/emergency" element={<EmergencyRequest />} />
            <Route path="/map" element={<MapView />} />
          </Route>

          {/* Protected: Patient dashboard */}
          <Route path="/dashboard/patient" element={
            <ProtectedRoute allowedRoles={['patient', 'admin']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PatientDashboard />} />
          </Route>

          {/* Protected: Donor dashboard */}
          <Route path="/dashboard/donor" element={
            <ProtectedRoute allowedRoles={['donor', 'admin']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DonorDashboard />} />
          </Route>

          {/* Protected: Facility dashboard */}
          <Route path="/dashboard/facility" element={
            <ProtectedRoute allowedRoles={['facility', 'admin']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<FacilityDashboard />} />
          </Route>

          {/* Protected: Admin dashboard */}
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
