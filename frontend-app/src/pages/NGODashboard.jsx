import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchingService } from '../services/matching';
import { statsService } from '../services/stats';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';
import './NGODashboard.css';

const DEFAULT_DEMO_MATCHES = [
  {
    match_id: 'm-901',
    listing_id: 'lst-101',
    donor_name: 'Saffron Grand Commercial Kitchen',
    food_type: 'Cooked Basmati Rice + Dal Makhani + Mixed Veg',
    quantity_meals: 45,
    distance_km: 1.85,
    perishability: 'HIGHLY_PERISHABLE',
    best_before_at: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    status: 'PENDING',
  },
  {
    match_id: 'm-902',
    listing_id: 'lst-104',
    donor_name: 'The Orchid Convention Center',
    food_type: 'Assorted Buffet Platters & Flatbreads',
    quantity_meals: 60,
    distance_km: 3.2,
    perishability: 'HIGHLY_PERISHABLE',
    best_before_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    status: 'PENDING',
  },
];

function MatchCard({ match, onAccept, onDecline }) {
  const timeLeft = useCountdown(match.expires_at);
  const isExpired = timeLeft.total <= 0;

  return (
    <div className={`stitch-match-card ${isExpired ? 'expired' : ''}`}>
      <div className="match-card-header">
        <div>
          <span className="match-donor">{match.donor_name || 'Verified Commercial Donor'}</span>
          <h3 className="match-food">{match.food_type}</h3>
        </div>
        <span className="distance-badge">{match.distance_km} km away</span>
      </div>

      <div className="match-specs">
        <div className="spec-box">
          <span className="spec-label">Quantity</span>
          <span className="spec-value">{match.quantity_meals} meals</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Perishability</span>
          <span className="spec-value">{match.perishability === 'HIGHLY_PERISHABLE' ? 'Cooked (Urgent)' : 'Moderate'}</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Best Before</span>
          <span className="spec-value">{new Date(match.best_before_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {!isExpired ? (
        <div className="match-countdown-bar">
          <div className="countdown-info">
            <span>Offer Acceptance Window</span>
            <strong>{timeLeft.minutes}m {timeLeft.seconds}s remaining</strong>
          </div>
          <div className="countdown-progress">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (timeLeft.total / (10 * 60 * 1000)) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="expired-notice">Offer window expired — re-matching to next eligible NGO</div>
      )}

      <div className="match-actions">
        <button
          type="button"
          className="btn-accept"
          onClick={() => onAccept(match.match_id)}
          disabled={isExpired}
        >
          Accept Match & Auto-Assign Delivery
        </button>
        <button
          type="button"
          className="btn-decline"
          onClick={() => onDecline(match.match_id)}
          disabled={isExpired}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export default function NGODashboard() {
  const { user } = useAuth();
  const [autoMatch, setAutoMatch] = useState(true);
  const [matches, setMatches] = useState(DEFAULT_DEMO_MATCHES);
  const [capacity, setCapacity] = useState({
    daily_total: 150,
    daily_claimed: 65,
    remaining: 85,
  });

  const handleToggleAutoMatch = async () => {
    try {
      await matchingService.toggleAutoMatch(!autoMatch);
      setAutoMatch(!autoMatch);
    } catch {
      setAutoMatch(!autoMatch);
    }
  };

  const handleAccept = async (id) => {
    try {
      await matchingService.accept(id);
    } catch {
      // simulate for demo
    }
    setMatches((prev) => prev.filter((m) => m.match_id !== id));
    setCapacity((prev) => ({
      ...prev,
      daily_claimed: prev.daily_claimed + 45,
      remaining: Math.max(0, prev.remaining - 45),
    }));
    alert('Match Accepted! Delivery Partner auto-assignment job enqueued.');
  };

  const handleDecline = async (id) => {
    try {
      await matchingService.decline(id);
    } catch {
      // simulate for demo
    }
    setMatches((prev) => prev.filter((m) => m.match_id !== id));
  };

  return (
    <div className="stitch-ngo-portal">
      {/* Top NGO Control Card */}
      <div className="ngo-control-card">
        <div className="control-left">
          <span className="control-eyebrow">NGO Operations & Intake</span>
          <h1>{user?.org_name || 'Anna Seva Trust Food Bank'}</h1>
          <p>Declared Service Radius: 7.0 km | Operating Hours: 08:00 – 21:00</p>
        </div>

        <div className="control-right">
          <div className="toggle-container">
            <span className="toggle-title">AI Auto-Match</span>
            <div className={`stitch-switch ${autoMatch ? 'active' : ''}`} onClick={handleToggleAutoMatch}>
              <div className="switch-thumb" />
            </div>
            <span className={`switch-status ${autoMatch ? 'on' : 'off'}`}>
              {autoMatch ? 'Active (Receiving Matches)' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Capacity & Queue Metrics */}
      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Daily Capacity Budget</span>
          <div className="metric-number">{capacity.daily_claimed} <span className="unit">/ {capacity.daily_total} meals</span></div>
          <div className="capacity-bar-track">
            <div
              className="capacity-bar-fill"
              style={{ width: `${(capacity.daily_claimed / capacity.daily_total) * 100}%` }}
            />
          </div>
          <span className="metric-footnote">{capacity.remaining} meals remaining capacity today</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Pending AI Match Offers</span>
          <div className="metric-number">{matches.length}</div>
          <span className="metric-footnote">Direct offers reserved in 10-min window</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Public Browse Board</span>
          <div className="metric-number">3 <span className="unit">available</span></div>
          <span className="metric-footnote">
            <Link to="/dashboard/board" style={{ color: '#15803d', fontWeight: 600 }}>
              Browse unassigned listings →
            </Link>
          </span>
        </div>
      </div>

      {/* Match Inbox */}
      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Incoming Match Offers Inbox</h2>
            <p>High-priority food rescue matches offered directly to your organization</p>
          </div>
        </div>

        <div className="match-cards-container">
          {matches.length === 0 ? (
            <div className="empty-inbox">
              <div className="empty-title">All match offers reviewed</div>
              <p>When new surplus food within your 7km radius is listed, it will appear here automatically.</p>
            </div>
          ) : (
            matches.map((m) => (
              <MatchCard key={m.match_id} match={m} onAccept={handleAccept} onDecline={handleDecline} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
