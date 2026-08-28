import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './config/constants';

// Pages
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback';
import SelectRolePage from './pages/SelectRolePage';
import DashboardLayout from './pages/DashboardLayout';
import DonorDashboard from './pages/DonorDashboard';
import NGODashboard from './pages/NGODashboard';
import CreateListingPage from './pages/CreateListingPage';
import MyListingsPage from './pages/MyListingsPage';
import MatchInboxPage from './pages/MatchInboxPage';
import BrowseBoardPage from './pages/BrowseBoardPage';
import DeliveryOffersPage from './pages/DeliveryOffersPage';
import ActiveDeliveryPage from './pages/ActiveDeliveryPage';
import VerificationSubmitPage from './pages/VerificationSubmitPage';
import ImpactStatsPage from './pages/ImpactStatsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import VerificationQueuePage from './pages/VerificationQueuePage';

import './App.css';

function RoleDashboard() {
  return <DonorDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/select-role" element={<SelectRolePage />} />

          {/* Verification */}
          <Route path="/verification/submit" element={
            <ProtectedRoute><VerificationSubmitPage /></ProtectedRoute>
          } />
          <Route path="/verification-pending" element={
            <ProtectedRoute>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ color: '#0f172a' }}>Verification Pending</h2>
                <p style={{ color: '#64748b' }}>Your account is being reviewed. You will be notified once approved.</p>
              </div>
            </ProtectedRoute>
          } />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardLayout /></ProtectedRoute>
          }>
            {/* Donor routes */}
            <Route index element={<RoleDashboard />} />
            <Route path="listings/new" element={
              <ProtectedRoute allowedRoles={[ROLES.RESTAURANT, ROLES.INDIVIDUAL_DONOR, ROLES.ADMIN]} requireVerified>
                <CreateListingPage />
              </ProtectedRoute>
            } />
            <Route path="listings" element={
              <ProtectedRoute allowedRoles={[ROLES.RESTAURANT, ROLES.INDIVIDUAL_DONOR, ROLES.ADMIN]}>
                <MyListingsPage />
              </ProtectedRoute>
            } />

            {/* NGO routes */}
            <Route path="matched" element={
              <ProtectedRoute allowedRoles={[ROLES.NGO, ROLES.ADMIN]}>
                <MatchInboxPage />
              </ProtectedRoute>
            } />
            <Route path="board" element={
              <ProtectedRoute allowedRoles={[ROLES.NGO, ROLES.ADMIN]} requireVerified>
                <BrowseBoardPage />
              </ProtectedRoute>
            } />

            {/* Delivery Partner routes */}
            <Route path="offers" element={
              <ProtectedRoute allowedRoles={[ROLES.DELIVERY_PARTNER, ROLES.ADMIN]}>
                <DeliveryOffersPage />
              </ProtectedRoute>
            } />
            <Route path="active" element={
              <ProtectedRoute allowedRoles={[ROLES.DELIVERY_PARTNER, ROLES.ADMIN]}>
                <ActiveDeliveryPage />
              </ProtectedRoute>
            } />

            {/* Shared */}
            <Route path="stats" element={<ImpactStatsPage />} />

            {/* Admin routes */}
            <Route path="verification-queue" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <VerificationQueuePage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column' }}>
              <h2 style={{ color: '#0f172a' }}>Access Restricted</h2>
              <p style={{ color: '#64748b' }}>You do not have permission to access this page.</p>
              <a href="/dashboard" style={{ color: '#15803d', marginTop: '12px', fontWeight: 600 }}>Go to Dashboard</a>
            </div>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
