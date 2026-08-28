import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listingsService } from '../services/listings';
import { statsService } from '../services/stats';
import { useWebSocket } from '../hooks/useWebSocket';
import { LISTING_STATUS } from '../config/constants';
import './DonorDashboard.css';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsService.getImpact().catch(() => ({ data: null })),
      listingsService.getMine({ limit: 5 }).catch(() => ({ data: [] })),
    ]).then(([statsRes, listingsRes]) => {
      setStats(statsRes.data);
      setRecentListings(listingsRes.data || []);
      setLoading(false);
    });
  }, []);

  useWebSocket('LISTING_STATUS_CHANGED', (data) => {
    setRecentListings((prev) =>
      prev.map((l) => (l.listing_id === data.listing_id ? { ...l, status: data.status } : l))
    );
  });

  const statusClass = (status) => {
    const classes = {
      [LISTING_STATUS.LISTED]: 'badge-blue',
      [LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT]: 'badge-amber',
      [LISTING_STATUS.NGO_ACCEPTED]: 'badge-green',
      [LISTING_STATUS.DELIVERY_ASSIGNED]: 'badge-purple',
      [LISTING_STATUS.PICKED_UP]: 'badge-teal',
      [LISTING_STATUS.DELIVERED]: 'badge-green-solid',
      [LISTING_STATUS.EXPIRED]: 'badge-neutral',
      [LISTING_STATUS.CANCELLED]: 'badge-red',
    };
    return classes[status] || 'badge-neutral';
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="donor-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <span className="user-indicator">{user?.email}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Meals Rescued</span>
          <span className="stat-value">{stats?.meals_rescued ?? '0'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Food Saved</span>
          <span className="stat-value">{stats?.kg_saved ? `${stats.kg_saved} kg` : '0 kg'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">CO2e Prevented</span>
          <span className="stat-value">{stats?.co2e_kg_estimate ? `${stats.co2e_kg_estimate} kg` : '0 kg'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Deliveries Completed</span>
          <span className="stat-value">{stats?.listings_delivered ?? '0'}</span>
        </div>
      </div>

      <div className="section-header">
        <h2>Recent Listings</h2>
      </div>

      {recentListings.length === 0 ? (
        <div className="empty-state">
          <p>No listings created yet.</p>
          <a href="/dashboard/listings/new" className="create-link">Create a food listing</a>
        </div>
      ) : (
        <div className="listings-table">
          <table>
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Quantity</th>
                <th>Best Before</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentListings.map((l) => (
                <tr key={l.listing_id}>
                  <td><strong>{l.food_type}</strong></td>
                  <td>{l.quantity_meals} meals</td>
                  <td>{new Date(l.best_before_at).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${statusClass(l.status)}`}>
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
