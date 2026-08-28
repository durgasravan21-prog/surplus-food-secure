import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { LISTING_STATUS, ROLES } from '../config/constants';

export default function MyListingsPage() {
  const { user } = useAuth();
  const { listings } = useDemoData();
  const [filter, setFilter] = useState('');

  // Filter listings based on active persona
  const userListings = listings.filter((l) =>
    user?.role === ROLES.INDIVIDUAL_DONOR ? l.donor_role === ROLES.INDIVIDUAL_DONOR : l.donor_role === ROLES.RESTAURANT
  );

  const filteredListings = userListings.filter((l) => (filter ? l.status === filter : true));

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case LISTING_STATUS.LISTED: return 'chip-blue';
      case LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT: return 'chip-amber';
      case LISTING_STATUS.NGO_ACCEPTED: return 'chip-teal';
      case LISTING_STATUS.DELIVERY_ASSIGNED: return 'chip-purple';
      case LISTING_STATUS.PICKED_UP: return 'chip-indigo';
      case LISTING_STATUS.DELIVERED: return 'chip-green';
      default: return 'chip-gray';
    }
  };

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Dispatch Records</span>
          <h1>My Food Rescue Listings</h1>
          <p>Complete lifecycle history of all declared surplus meals and real-time delivery status tracking.</p>
        </div>
        <div className="banner-actions">
          <Link to="/dashboard/listings/new" className="stitch-btn-primary">
            + Declare New Surplus
          </Link>
        </div>
      </div>

      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Listings History ({userListings.length})</h2>
            <p>Filter by state machine status</p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilter('')}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                border: !filter ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: !filter ? '#0f172a' : '#ffffff',
                color: !filter ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              All Statuses
            </button>
            {Object.values(LISTING_STATUS).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: filter === s ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: filter === s ? '#0f172a' : '#ffffff',
                  color: filter === s ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="stitch-table-wrapper">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Food Description</th>
                <th>Quantity</th>
                <th>Perishability</th>
                <th>Best Before</th>
                <th>Assigned Destination</th>
                <th>Dispatch Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No listings match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredListings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-title">{item.food_type}</div>
                      <div className="item-id">ID: {item.id} · Created {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <span className="qty-highlight">{item.quantity_meals} meals</span>
                    </td>
                    <td>
                      <span className="perish-tag">
                        {item.perishability === 'HIGHLY_PERISHABLE' ? 'Urgent (<6 hrs)' : 'Moderate'}
                      </span>
                    </td>
                    <td>{new Date(item.best_before_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span className="entity-name">{item.matched_ngo_name || 'Searching AI Pool...'}</span>
                      {item.assigned_partner_name && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Rider: {item.assigned_partner_name}</div>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(item.status)}`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
