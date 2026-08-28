import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingsService } from '../services/listings';
import { statsService } from '../services/stats';
import { useWebSocket } from '../hooks/useWebSocket';
import { LISTING_STATUS } from '../config/constants';
import './DonorDashboard.css';

const DEFAULT_DEMO_LISTINGS = [
  {
    listing_id: 'lst-101',
    food_type: 'Cooked Basmati Rice + Vegetable Dal Tadka',
    quantity_meals: 45,
    perishability: 'HIGHLY_PERISHABLE',
    best_before_at: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
    status: LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT,
    matched_ngo: 'Anna Seva Trust Food Bank',
  },
  {
    listing_id: 'lst-102',
    food_type: 'Assorted Bakery Bread Loaves & Sandwiches',
    quantity_meals: 30,
    perishability: 'MODERATE',
    best_before_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    status: LISTING_STATUS.DELIVERY_ASSIGNED,
    matched_ngo: 'Shanti Shelter Home',
    partner_name: 'Rahul R. (Bike Partner)',
  },
  {
    listing_id: 'lst-103',
    food_type: 'Fresh Garden Salad & Fruit Bowls',
    quantity_meals: 20,
    perishability: 'HIGHLY_PERISHABLE',
    best_before_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    status: LISTING_STATUS.DELIVERED,
    matched_ngo: 'Care & Hope Community Kitchen',
  },
];

export default function DonorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    meals_rescued: 412,
    kg_saved: 185.4,
    co2e_kg_estimate: 490.2,
    listings_delivered: 38,
  });
  const [listings, setListings] = useState(DEFAULT_DEMO_LISTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      statsService.getImpact().catch(() => null),
      listingsService.getMine({ limit: 5 }).catch(() => null),
    ]).then(([statsRes, listingsRes]) => {
      if (statsRes?.data) setStats(statsRes.data);
      if (listingsRes?.data && listingsRes.data.length > 0) {
        setListings(listingsRes.data);
      }
    });
  }, []);

  useWebSocket('LISTING_STATUS_CHANGED', (data) => {
    setListings((prev) =>
      prev.map((l) => (l.listing_id === data.listing_id ? { ...l, status: data.status } : l))
    );
  });

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
      {/* Page Header */}
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Donor Kitchen Portal</span>
          <h1>Food Rescue Operations</h1>
          <p>Real-time overview of surplus food listings, automated AI dispatch, and environmental savings.</p>
        </div>
        <div className="banner-actions">
          <Link to="/dashboard/listings/new" className="stitch-btn-primary">
            + Publish New Listing
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Meals Rescued</span>
          <div className="metric-number">{stats.meals_rescued}</div>
          <span className="metric-footnote">Served to verified beneficiaries</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Food Saved</span>
          <div className="metric-number">{stats.kg_saved} <span className="unit">kg</span></div>
          <span className="metric-footnote">Diverted from waste stream</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">CO2e Emissions Prevented</span>
          <div className="metric-number">{stats.co2e_kg_estimate} <span className="unit">kg</span></div>
          <span className="metric-footnote">Calculated carbon offset</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Completed Deliveries</span>
          <div className="metric-number">{stats.listings_delivered}</div>
          <span className="metric-footnote">100% verified photo proof</span>
        </div>
      </div>

      {/* Active Listings Section */}
      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Active Listings & Dispatch Tracker</h2>
            <p>Live status machine updates powered by distance-first AI matching</p>
          </div>
          <Link to="/dashboard/listings" className="stitch-btn-ghost">
            View All Listings
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
                <th>Matched Entity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((item) => (
                <tr key={item.listing_id}>
                  <td>
                    <div className="item-title">{item.food_type}</div>
                    <div className="item-id">ID: {item.listing_id}</div>
                  </td>
                  <td>
                    <span className="qty-highlight">{item.quantity_meals} meals</span>
                  </td>
                  <td>
                    <span className="perish-tag">
                      {item.perishability === 'HIGHLY_PERISHABLE' ? 'High Perishability' : 'Moderate'}
                    </span>
                  </td>
                  <td>{new Date(item.best_before_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <span className="entity-name">{item.matched_ngo || 'Searching AI Pool...'}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusBadgeClass(item.status)}`}>
                      {item.status.replace(/_/g, ' ')}
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
