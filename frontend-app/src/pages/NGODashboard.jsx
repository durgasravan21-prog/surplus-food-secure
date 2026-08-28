import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { LISTING_STATUS } from '../config/constants';
import { useCountdown } from '../hooks/useCountdown';
import './NGODashboard.css';

function MatchCard({ match, onAccept, onDecline }) {
  const timeLeft = useCountdown(match.expires_at || new Date(Date.now() + 8 * 60 * 1000));
  const isExpired = timeLeft.total <= 0;

  return (
    <div className={`stitch-match-card ${isExpired ? 'expired' : ''}`}>
      <div className="match-card-header">
        <div>
          <span className="match-donor">{match.donor_name || 'Verified Commercial Donor'}</span>
          <h3 className="match-food">{match.food_type}</h3>
        </div>
        <span className="distance-badge">{match.distance_km || '1.85'} km away</span>
      </div>

      <div className="match-specs">
        <div className="spec-box">
          <span className="spec-label">Quantity</span>
          <span className="spec-value">{match.quantity_meals} meals</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Perishability</span>
          <span className="spec-value">
            {match.perishability === 'HIGHLY_PERISHABLE' ? 'Cooked (Urgent)' : 'Moderate'}
          </span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Best Before</span>
          <span className="spec-value">
            {new Date(match.best_before_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {!isExpired ? (
        <div className="match-countdown-bar">
          <div className="countdown-info">
            <span>Offer Acceptance Lock</span>
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
          onClick={() => onAccept(match.id)}
          disabled={isExpired}
        >
          Accept Match & Auto-Assign Delivery Partner
        </button>
        <button
          type="button"
          className="btn-decline"
          onClick={() => onDecline(match.id)}
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
  const { listings, ngoCapacity, acceptNgoMatch, declineNgoMatch, toggleAutoMatch } = useDemoData();

  // Active match offers offered to this NGO
  const pendingMatches = listings.filter(
    (l) => l.status === LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT
  );

  const handleAccept = (id) => {
    acceptNgoMatch(id);
    alert('Match Accepted! Row-level lock acquired and Delivery Partner auto-assigned.');
  };

  const handleDecline = (id) => {
    declineNgoMatch(id);
  };

  return (
    <div className="stitch-ngo-portal">
      {/* Top NGO Control Card */}
      <div className="ngo-control-card">
        <div className="control-left">
          <span className="control-eyebrow">NGO Operations & Intake</span>
          <h1>{user?.org_name || 'Anna Seva Trust Food Bank'}</h1>
          <p>Declared Service Radius: 7.0 km | Daily Capacity Budget: {ngoCapacity.daily_capacity} meals</p>
        </div>

        <div className="control-right">
          <div className="toggle-container">
            <span className="toggle-title">AI Auto-Match</span>
            <div
              className={`stitch-switch ${ngoCapacity.auto_match_enabled ? 'active' : ''}`}
              onClick={toggleAutoMatch}
            >
              <div className="switch-thumb" />
            </div>
            <span className={`switch-status ${ngoCapacity.auto_match_enabled ? 'on' : 'off'}`}>
              {ngoCapacity.auto_match_enabled ? 'Active (Receiving Matches)' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Capacity & Queue Metrics */}
      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Daily Capacity Meter</span>
          <div className="metric-number">
            {ngoCapacity.daily_claimed} <span className="unit">/ {ngoCapacity.daily_capacity} meals</span>
          </div>
          <div className="capacity-bar-track">
            <div
              className="capacity-bar-fill"
              style={{
                width: `${Math.min(100, (ngoCapacity.daily_claimed / ngoCapacity.daily_capacity) * 100)}%`,
              }}
            />
          </div>
          <span className="metric-footnote">{ngoCapacity.remaining} meals remaining in today's intake budget</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Pending AI Match Offers</span>
          <div className="metric-number">{pendingMatches.length}</div>
          <span className="metric-footnote">Reserved exclusively for 10 minutes</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Public Claim Board</span>
          <div className="metric-number">
            {listings.filter((l) => l.status === LISTING_STATUS.LISTED).length} <span className="unit">available</span>
          </div>
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
            <p>Direct distance-first AI match offers sent to your organization</p>
          </div>
        </div>

        <div className="match-cards-container">
          {pendingMatches.length === 0 ? (
            <div className="empty-inbox">
              <div className="empty-title">All match offers reviewed</div>
              <p>
                When new surplus food within your declared 7km radius is published, it will trigger an automated match offer here.
              </p>
            </div>
          ) : (
            pendingMatches.map((m) => (
              <MatchCard key={m.id} match={m} onAccept={handleAccept} onDecline={handleDecline} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
