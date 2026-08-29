import { Link } from 'react-router-dom';
import { useDemoData } from '../context/DemoDataContext';
import { LISTING_STATUS } from '../config/constants';

export default function AdminDashboardPage() {
  const { listings, verifications } = useDemoData();

  const pendingVerifications = verifications.filter((v) => v.status === 'PENDING').length;
  const activeDispatches = listings.filter((l) => l.status === LISTING_STATUS.DELIVERY_ASSIGNED || l.status === LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT).length;
  const totalDelivered = listings.filter((l) => l.status === LISTING_STATUS.DELIVERED).length;

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Platform Governance</span>
          <h1>System Command Center</h1>
          <p>Real-time network operational metrics, AI match efficiency, dispatch monitoring, and KYC approvals.</p>
        </div>
        <div className="banner-actions">
          <Link to="/dashboard/verification-queue" className="stitch-btn-primary">
            Review Queue ({pendingVerifications})
          </Link>
        </div>
      </div>

      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Network Match Rate</span>
          <div className="metric-number">94.2%</div>
          <span className="metric-footnote">AI distance & perishability algorithm</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Avg. Time to Match</span>
          <div className="metric-number">84 <span className="unit">seconds</span></div>
          <span className="metric-footnote">From publish to NGO reservation</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Active Dispatches</span>
          <div className="metric-number">{activeDispatches}</div>
          <span className="metric-footnote">Live pickups & deliveries in transit</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Pending Verifications</span>
          <div className="metric-number">{pendingVerifications}</div>
          <span className="metric-footnote">Awaiting FSSAI / 80G review</span>
        </div>
      </div>

      {/* Network Overview Table */}
      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Active Network Dispatches & Listings</h2>
            <p>Full audit trail of all listings across the platform</p>
          </div>
          <Link to="/dashboard/board" className="stitch-btn-ghost">
            View Public Board
          </Link>
        </div>

        <div className="stitch-table-wrapper">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Listing ID</th>
                <th>Donor Entity</th>
                <th>Food Item</th>
                <th>Portions</th>
                <th>Assigned Destination</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td><span style={{ fontWeight: 700, color: '#0f172a' }}>{l.id}</span></td>
                  <td>{l.donor_name}</td>
                  <td><strong>{l.food_type}</strong></td>
                  <td>{l.quantity_meals} meals</td>
                  <td>{l.matched_ngo_name || 'Enqueued in AI pool'}</td>
                  <td>
                    <span className="status-pill chip-green">
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
