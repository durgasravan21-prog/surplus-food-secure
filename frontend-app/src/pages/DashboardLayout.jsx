import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/constants';
import VerificationBanner from '../components/VerificationBanner';
import './DashboardLayout.css';

const navItems = {
  [ROLES.RESTAURANT]: [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/listings/new', label: 'Create Listing' },
    { to: '/dashboard/listings', label: 'My Listings' },
    { to: '/dashboard/stats', label: 'Impact Metrics' },
  ],
  [ROLES.INDIVIDUAL_DONOR]: [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/listings/new', label: 'Create Listing' },
    { to: '/dashboard/listings', label: 'My Listings' },
    { to: '/dashboard/stats', label: 'Impact Metrics' },
  ],
  [ROLES.NGO]: [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/matched', label: 'Incoming Matches' },
    { to: '/dashboard/board', label: 'Browse Board' },
    { to: '/dashboard/stats', label: 'Impact Metrics' },
  ],
  [ROLES.DELIVERY_PARTNER]: [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/offers', label: 'Delivery Offers' },
    { to: '/dashboard/active', label: 'Active Delivery' },
  ],
  [ROLES.ADMIN]: [
    { to: '/dashboard', label: 'Platform Stats', end: true },
    { to: '/dashboard/verification-queue', label: 'Verification Queue' },
    { to: '/dashboard/disputes', label: 'Disputes' },
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
          <div className="sidebar-brand">Annayog</div>
          <span className="role-badge">{user?.role?.replace(/_/g, ' ')}</span>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-email">{user?.email}</div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <VerificationBanner />
        <Outlet />
      </main>
    </div>
  );
}
