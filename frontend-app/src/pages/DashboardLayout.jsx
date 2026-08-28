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
    { to: '/dashboard/matched', label: 'Match Inbox' },
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
  ],
};

const ALL_ROLES = [
  { key: ROLES.RESTAURANT, label: 'Restaurant' },
  { key: ROLES.INDIVIDUAL_DONOR, label: 'Donor' },
  { key: ROLES.NGO, label: 'NGO / Shelter' },
  { key: ROLES.DELIVERY_PARTNER, label: 'Delivery Partner' },
  { key: ROLES.ADMIN, label: 'Admin' },
];

export default function DashboardLayout() {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleChange = (roleKey) => {
    switchDemoRole(roleKey);
    navigate('/dashboard');
  };

  const items = navItems[user?.role] || [];

  return (
    <div className="stitch-app">
      {/* Stitch Top Header */}
      <header className="stitch-topbar">
        <div className="topbar-left">
          <div className="stitch-brand">
            <span className="brand-dot"></span>
            <span className="brand-name">Annayog</span>
            <span className="brand-subtitle">Surplus Food Network</span>
          </div>
        </div>

        {/* Interactive Demo Role Switcher */}
        <div className="demo-role-switcher">
          <span className="demo-label">Demo Persona:</span>
          <div className="role-pills">
            {ALL_ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-pill ${user?.role === r.key ? 'active' : ''}`}
                onClick={() => handleRoleChange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="topbar-right">
          <span className="status-chip verified">
            <span className="chip-dot"></span>
            {user?.verification_status === 'APPROVED' ? 'Verified Account' : 'Verification Required'}
          </span>
          <div className="user-profile">
            <span className="profile-name">{user?.email?.split('@')[0]}</span>
            <button className="topbar-logout" onClick={handleLogout} title="Sign Out">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="stitch-body">
        {/* Stitch Clean Sidebar */}
        <aside className="stitch-sidebar">
          <div className="sidebar-section-label">Navigation</div>
          <nav className="stitch-nav">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `stitch-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-bottom-info">
            <div className="sidebar-info-card">
              <div className="info-title">AI Matching Engine</div>
              <div className="info-desc">Distance & Perishability scoring active in 10km radius</div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="stitch-main">
          <VerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
