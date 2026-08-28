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

  const statusColor = (status) => {
    const colors = {
      [LISTING_STATUS.LISTED]: '#1a73e8',
      [LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT]: '#ff9800',
      [LISTING_STATUS.NGO_ACCEPTED]: '#0f9b58',
      [LISTING_STATUS.DELIVERY_ASSIGNED]: '#9c27b0',
      [LISTING_STATUS.PICKED_UP]: '#00bcd4',
      [LISTING_STATUS.DELIVERED]: '#4caf50',
      [LISTING_STATUS.EXPIRED]: '#9e9e9e',
      [LISTING_STATUS.CANCELLED]: '#f44336',
    };
    return colors[status] || '#666';
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="donor-dashboard">
      <h1>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h1>
      <div className="stats-grid">
        <div className="stat-card green">
          <span className="stat-value">{stats?.meals_rescued ?? '—'}</span>
          <span className="stat-label">Meals Rescued</span>
        </div>
        <div className="stat-card blue">
          <span className="stat-value">{stats?.kg_saved ? `${stats.kg_saved} kg` : '—'}</span>
          <span className="stat-label">Food Saved</span>
        </div>
        <div className="stat-card teal">
          <span className="stat-value">{stats?.co2e_kg_estimate ? `${stats.co2e_kg_estimate} kg` : '—'}</span>
          <span className="stat-label">CO₂e Prevented</span>
        </div>
        <div className="stat-card purple">
          <span className="stat-value">{stats?.listings_delivered ?? '—'}</span>
          <span className="stat-label">Deliveries Completed</span>
        </div>
      </div>
      <h2>Recent Listings</h2>
      {recentListings.length === 0 ? (
        <p className="empty-state">No listings yet. Create your first listing to start rescuing food!</p>
      ) : (
        <div className="listings-table">
          <table>
            <thead>
              <tr><th>Food Type</th><th>Qty</th><th>Best Before</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recentListings.map((l) => (
                <tr key={l.listing_id}>
                  <td>{l.food_type}</td>
                  <td>{l.quantity_meals} meals</td>
                  <td>{new Date(l.best_before_at).toLocaleString()}</td>
                  <td><span className="status-badge" style={{ background: statusColor(l.status) }}>{l.status.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
