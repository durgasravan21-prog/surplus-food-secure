import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, VERIFICATION_STATUS } from '../config/constants';
import VerificationBanner from '../components/VerificationBanner';
import './DashboardLayout.css';

const navItems = {
  [ROLES.RESTAURANT]: [
    { to: '/dashboard', label: '📊 Dashboard', end: true },
    { to: '/dashboard/listings/new', label: '➕ New Listing' },
    { to: '/dashboard/listings', label: '📋 My Listings' },
    { to: '/dashboard/stats', label: '🌱 Impact Stats' },
  ],
  [ROLES.INDIVIDUAL_DONOR]: [
    { to: '/dashboard', label: '📊 Dashboard', end: true },
    { to: '/dashboard/listings/new', label: '➕ New Listing' },
    { to: '/dashboard/listings', label: '📋 My Listings' },
    { to: '/dashboard/stats', label: '🌱 Impact Stats' },
  ],
  [ROLES.NGO]: [
    { to: '/dashboard', label: '📊 Dashboard', end: true },
    { to: '/dashboard/matched', label: '🔔 Match Inbox' },
    { to: '/dashboard/board', label: '🗂️ Browse Board' },
    { to: '/dashboard/stats', label: '🌱 Impact Stats' },
  ],
  [ROLES.DELIVERY_PARTNER]: [
    { to: '/dashboard', label: '📊 Dashboard', end: true },
    { to: '/dashboard/offers', label: '🔔 Delivery Offers' },
    { to: '/dashboard/active', label: '🚚 Active Delivery' },
  ],
  [ROLES.ADMIN]: [
    { to: '/dashboard', label: '📊 Admin Dashboard', end: true },
    { to: '/dashboard/verification-queue', label: '✅ Verification Queue' },
    { to: '/dashboard/disputes', label: '⚖️ Disputes' },
    { to: '/dashboard/users', label: '👤 Users' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = navItems[user?.role] || [];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🍽️ Annayog</h2>
          <span className="role-badge">{user?.role?.replace('_', ' ')}</span>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-email">{user?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <VerificationBanner />
        <Outlet />
      </main>
    </div>
  );
}
