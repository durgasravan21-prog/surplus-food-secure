import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    { section: 'Verification & Impact', items: [
      { to: '/dashboard/stats', label: 'Community Contribution' },
      { to: '/verification/submit', label: 'Identity Verification (ID Proof)' },
    ]}
  ],
  [ROLES.NGO]: [
    { section: 'Shelter Intake', items: [
      { to: '/dashboard', label: 'Match Inbox & Capacity', end: true },
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
      { to: '/dashboard', label: 'Available Pickup Offers', end: true },
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

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleNavGroups = ROLE_NAVIGATION[user?.role] || ROLE_NAVIGATION[ROLES.RESTAURANT];

  return (
    <div className="stitch-app">
      {/* Stitch Top Bar */}
      <header className="stitch-topbar">
        <div className="topbar-left">
          <div className="stitch-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <span className="brand-dot"></span>
            <span className="brand-name">Annayog</span>
            <span className="brand-badge-stitch">Role Authenticated</span>
          </div>
        </div>

        {/* Display strictly active role badge (Persona switcher removed for security) */}
        <div className="demo-role-switcher">
          <span className="demo-label">Role:</span>
          <span className="role-pill active" style={{ textTransform: 'capitalize', fontWeight: 700 }}>
            {user?.role?.replace(/_/g, ' ') || 'Guest'}
          </span>
        </div>

        <div className="topbar-right">
          <div className="system-indicator">
            <span className="indicator-pulse"></span>
            <span>AI Dispatch Online</span>
          </div>

          <div className="user-profile-widget">
            <div className="profile-details">
              <span className="profile-name">{user?.org_name || user?.name || user?.email?.split('@')[0]}</span>
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
            <span className="persona-type">Authenticated Role</span>
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
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar Status Widget */}
          <div className="sidebar-bottom-info">
            <div className="sidebar-info-card">
              <div className="info-title">Security & Compliance</div>
              <div className="info-desc">
                Role-gated JWT authentication enabled. Access restricted to authorized endpoints.
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
