import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LISTING_STATUS, ROLES } from '../config/constants';
import { listingsService } from '../services/listings';
import { statsService } from '../services/stats';
import { wsManager } from '../services/websocket';
import './DonorDashboard.css';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donorListings, setDonorListings] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [listingsRes, impactRes] = await Promise.all([
        listingsService.getMine(),
        statsService.getImpact()
      ]);
      setDonorListings(listingsRes.data || []);
      setImpactStats(impactRes.data || {});
    } catch (err) {
      console.error('Error fetching donor data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleStatusChanged = () => {
      fetchDashboardData();
    };
    const unsubscribe = wsManager.on('LISTING_STATUS_CHANGED', handleStatusChanged);
    return () => unsubscribe();
  }, [fetchDashboardData]);

  const totalMeals = impactStats?.total_meals ?? donorListings.reduce((sum, l) => sum + (l.quantity_meals || 0), 0);
  const totalKg = impactStats?.total_kg ?? (totalMeals * 0.45).toFixed(1);
  const totalCo2e = impactStats?.total_co2e ?? (totalMeals * 1.18).toFixed(1);
  const deliveredCount = impactStats?.total_delivered ?? donorListings.filter((l) => l.status === LISTING_STATUS.DELIVERED).length;

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

  const isHomeDonor = user?.role === ROLES.INDIVIDUAL_DONOR;

  if (loading && donorListings.length === 0) {
    return <div className="stitch-dashboard"><div style={{ padding: '24px' }}>Loading dashboard data...</div></div>;
  }

  if (error) {
    return <div className="stitch-dashboard"><div style={{ padding: '24px', color: '#ef4444' }}>{error}</div></div>;
  }

  return (
    <div className="stitch-dashboard">
      {/* Page Header */}
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">
            {isHomeDonor ? 'Home Donor Portal' : 'Commercial Kitchen Operations'}
          </span>
          <h1>{isHomeDonor ? 'Community Food Sharing' : 'Surplus Rescue Overview'}</h1>
          <p>
            {isHomeDonor
              ? 'Safely donate home-cooked meals to nearby community shelters with food safety validation.'
              : 'Deterministic AI matching dispatches bulk kitchen surplus to the nearest verified NGO within minutes.'}
          </p>
        </div>
        <div className="banner-actions">
          <Link to="/dashboard/listings/new" className="stitch-btn-primary">
            + {isHomeDonor ? 'Donate Home Food' : 'Declare Kitchen Surplus'}
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Meals Rescued</span>
          <div className="metric-number">{totalMeals}</div>
          <span className="metric-footnote">Served to verified beneficiaries</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Food Saved</span>
          <div className="metric-number">{totalKg} <span className="unit">kg</span></div>
          <span className="metric-footnote">Diverted from landfills</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">CO2e Emissions Prevented</span>
          <div className="metric-number">{totalCo2e} <span className="unit">kg</span></div>
          <span className="metric-footnote">Direct carbon reduction</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Completed Rescues</span>
          <div className="metric-number">{deliveredCount}</div>
          <span className="metric-footnote">100% verified photo proof</span>
        </div>
      </div>

      {/* Active Listings Section */}
      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Active Listings & Real-time State Machine</h2>
            <p>Live status transitions powered by distance-first matching</p>
          </div>
          <Link to="/dashboard/listings" className="stitch-btn-ghost">
            View All ({donorListings.length})
          </Link>
        </div>

        <div className="stitch-table-wrapper">
          <table className="stitch-table">
            <thead>
              <tr>
                <th>Listing Item</th>
                <th>Quantity</th>
                <th>Perishability</th>
                <th>Best Before</th>
                <th>Assigned Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donorListings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No listings declared yet. Click "+ Declare Surplus" to test the AI matching pipeline!
                  </td>
                </tr>
              ) : (
                donorListings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-title">{item.food_type}</div>
                      <div className="item-id">ID: {item.id}</div>
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
                      <span className="entity-name">{item.matched_ngo_name || 'Enqueued in AI Matching Pool...'}</span>
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
