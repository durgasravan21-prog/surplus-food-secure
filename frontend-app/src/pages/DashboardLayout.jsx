import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { ROLES, LISTING_STATUS } from '../config/constants';
import VerificationBanner from '../components/VerificationBanner';
import './DashboardLayout.css';

const ROLE_NAVIGATION = {
  [ROLES.RESTAURANT]: [
    { section: 'Operations', items: [
      { to: '/dashboard', label: 'Kitchen Overview', end: true },
      { to: '/dashboard/listings/new', label: 'Declare Surplus Food' },
      { to: '/dashboard/listings', label: 'Active Dispatches & History' },
    ]},
    { section: 'Intelligence & Trust', items: [
      { to: '/dashboard/stats', label: 'Carbon & Meal Ledger' },
      { to: '/verification/submit', label: 'FSSAI License & KYC' },
    ]}
  ],
  [ROLES.INDIVIDUAL_DONOR]: [
    { section: 'Home Donations', items: [
      { to: '/dashboard', label: 'Donor Overview', end: true },
      { to: '/dashboard/listings/new', label: 'Donate Home Surplus' },
      { to: '/dashboard/listings', label: 'My Donation History' },
    ]},
    { section: 'Impact', items: [
      { to: '/dashboard/stats', label: 'Community Contribution' },
    ]}
  ],
  [ROLES.NGO]: [
    { section: 'Shelter Intake', items: [
      { to: '/dashboard/matched', label: 'Incoming Match Inbox' },
      { to: '/dashboard/board', label: 'Public Claim Board' },
      { to: '/dashboard/listings', label: 'Received Deliveries' },
    ]},
    { section: 'Capacity & Compliance', items: [
      { to: '/dashboard/stats', label: 'Beneficiary Impact' },
      { to: '/verification/submit', label: '80G & Org Registration' },
    ]}
  ],
  [ROLES.DELIVERY_PARTNER]: [
    { section: 'Volunteer Dispatch', items: [
      { to: '/dashboard/offers', label: 'Available Pickup Offers' },
      { to: '/dashboard/active', label: 'Live Delivery Stepper' },
    ]},
    { section: 'Account', items: [
      { to: '/verification/submit', label: 'Rider ID & Liveness' },
      { to: '/dashboard/stats', label: 'Volunteer Impact Hours' },
    ]}
  ],
  [ROLES.ADMIN]: [
    { section: 'Platform Governance', items: [
      { to: '/dashboard', label: 'Command Center Stats', end: true },
      { to: '/dashboard/verification-queue', label: 'Verification Queue' },
      { to: '/dashboard/board', label: 'Active Network Board' },
    ]},
    { section: 'Analytics', items: [
      { to: '/dashboard/stats', label: 'Global Environmental Ledger' },
    ]}
  ],
};

const ALL_ROLES = [
  { key: ROLES.RESTAURANT, label: 'Restaurant' },
  { key: ROLES.INDIVIDUAL_DONOR, label: 'Donor' },
  { key: ROLES.NGO, label: 'NGO Shelter' },
  { key: ROLES.DELIVERY_PARTNER, label: 'Delivery Partner' },
  { key: ROLES.ADMIN, label: 'Platform Admin' },
];

export default function DashboardLayout() {
  const { user, logout, switchDemoRole } = useAuth();
  const { listings, activeDelivery, ngoCapacity } = useDemoData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleChange = (roleKey) => {
    switchDemoRole(roleKey);
    if (roleKey === ROLES.NGO) {
      navigate('/dashboard/matched');
    } else if (roleKey === ROLES.DELIVERY_PARTNER) {
      navigate('/dashboard/offers');
    } else if (roleKey === ROLES.ADMIN) {
      navigate('/dashboard/verification-queue');
    } else {
      navigate('/dashboard');
    }
  };

  const roleNavGroups = ROLE_NAVIGATION[user?.role] || ROLE_NAVIGATION[ROLES.RESTAURANT];

  // Count active stats for sidebar badge
  const pendingNgoMatches = listings.filter((l) => l.status === LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT).length;
  const inTransitCount = listings.filter((l) => l.status === LISTING_STATUS.DELIVERY_ASSIGNED).length;

  return (
    <div className="stitch-app">
      {/* Stitch Top Bar */}
      <header className="stitch-topbar">
        <div className="topbar-left">
          <div className="stitch-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <span className="brand-dot"></span>
            <span className="brand-name">Annayog</span>
            <span className="brand-badge-stitch">Stitch AI 2.0</span>
          </div>

          <div className="topbar-search-box">
            <span className="search-icon">Search:</span>
            <input type="text" placeholder="Search listings, NGOs, FSSAI licenses, riders..." />
          </div>
        </div>

        {/* Interactive Stitch Role Switcher */}
        <div className="demo-role-switcher">
          <span className="demo-label">Persona View:</span>
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
          <div className="system-indicator">
            <span className="indicator-pulse"></span>
            <span>AI Dispatch Engine Online</span>
          </div>

          <div className="user-profile-widget">
            <div className="profile-details">
              <span className="profile-name">{user?.org_name || user?.email?.split('@')[0]}</span>
              <span className="profile-role-tag">{user?.role?.replace(/_/g, ' ')}</span>
            </div>
            <button className="topbar-signout-btn" onClick={handleLogout} title="Sign Out">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Stitch Body */}
      <div className="stitch-body">
        {/* Role-Specific Left Sidebar */}
        <aside className="stitch-sidebar">
          <div className="sidebar-persona-badge">
            <span className="persona-type">Active Persona</span>
            <div className="persona-title">{user?.role?.replace(/_/g, ' ')}</div>
          </div>

          <nav className="stitch-nav">
            {roleNavGroups.map((group) => (
              <div key={group.section} className="nav-group">
                <div className="sidebar-section-label">{group.section}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `stitch-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span>{item.label}</span>
                    {item.to === '/dashboard/matched' && pendingNgoMatches > 0 && (
                      <span className="nav-count-badge">{pendingNgoMatches}</span>
                    )}
                    {item.to === '/dashboard/offers' && (
                      <span className="nav-count-badge">1</span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar Status Widget */}
          <div className="sidebar-bottom-info">
            <div className="sidebar-info-card">
              <div className="info-title">Network Status</div>
              <div className="info-stats-row">
                <span>Active Listings: <strong>{listings.length}</strong></span>
                <span>In Transit: <strong>{inTransitCount}</strong></span>
              </div>
              <div className="info-desc">
                Row-level locking active. Zero food waste dispatch protocol.
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="stitch-main">
          <VerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
