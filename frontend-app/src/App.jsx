import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function VerificationPendingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name || user?.email || 'User';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px 32px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxWidth: '480px', width: '100%' }}>
        <div style={{ width: '56px', height: '56px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span style={{ fontSize: '24px' }}>⏳</span>
        </div>
        <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 700, margin: '0 0 12px' }}>Verification Pending</h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
          Your account is currently being reviewed by our administrators. You will receive access once your submitted documents are verified.
        </p>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Logged in as: <strong style={{ color: '#0f172a' }}>{displayName}</strong>
          </span>
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            style={{ padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', width: '100%' }}
            onMouseOver={(e) => e.target.style.background = '#b91c1c'}
            onMouseOut={(e) => e.target.style.background = '#dc2626'}
          >
            Sign Out / Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}

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
              <VerificationPendingPage />
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
