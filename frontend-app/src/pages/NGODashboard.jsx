import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { matchingService } from '../services/matching';
import { statsService } from '../services/stats';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';
import './NGODashboard.css';

function MatchCard({ match, onAccept, onDecline }) {
  const { timeLeft } = useCountdown(match.expires_at);
  const isExpired = timeLeft.total <= 0;

  return (
    <div className={`match-card ${isExpired ? 'expired' : ''}`}>
      <div className="match-header">
        <h3>{match.food_type}</h3>
        <span className="match-distance">{match.distance_km} km away</span>
      </div>
      <div className="match-details">
        <span>🍽️ {match.quantity_meals} meals</span>
        <span>⏰ Best before: {new Date(match.best_before_at).toLocaleTimeString()}</span>
      </div>
      {!isExpired && (
        <div className="match-timer">
          ⏳ {timeLeft.minutes}m {timeLeft.seconds}s remaining
        </div>
      )}
      <div className="match-actions">
        <button className="accept-btn" onClick={() => onAccept(match.match_id)} disabled={isExpired}>Accept</button>
        <button className="decline-btn" onClick={() => onDecline(match.match_id)} disabled={isExpired}>Decline</button>
      </div>
    </div>
  );
}

export default function NGODashboard() {
  const { user } = useAuth();
  const [autoMatch, setAutoMatch] = useState(false);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      matchingService.getMatched({ limit: 10 }).catch(() => ({ data: [] })),
      statsService.getImpact().catch(() => ({ data: null })),
    ]).then(([matchRes, statsRes]) => {
      setMatches(matchRes.data || []);
      setStats(statsRes.data);
      setLoading(false);
    });
  }, []);

  const handleToggleAutoMatch = async () => {
    try {
      const res = await matchingService.toggleAutoMatch(!autoMatch);
      setAutoMatch(res.data.auto_match_enabled);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to toggle auto-match');
    }
  };

  const handleAccept = async (id) => {
    try {
      await matchingService.accept(id);
      setMatches((prev) => prev.filter((m) => m.match_id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to accept match');
    }
  };

  const handleDecline = async (id) => {
    try {
      await matchingService.decline(id);
      setMatches((prev) => prev.filter((m) => m.match_id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to decline match');
    }
  };

  const handleNewMatch = useCallback((data) => {
    setMatches((prev) => [data, ...prev]);
  }, []);

  useWebSocket('MATCH_OFFER', handleNewMatch);

  if (loading) return <div className="loading">Loading NGO dashboard...</div>;

  return (
    <div className="ngo-dashboard">
      <div className="ngo-header">
        <h1>NGO Dashboard</h1>
        <div className="auto-match-toggle">
          <label className="toggle-label">
            <span>Auto-Match</span>
            <div className={`toggle ${autoMatch ? 'on' : ''}`} onClick={handleToggleAutoMatch}>
              <div className="toggle-thumb" />
            </div>
          </label>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card green"><span className="stat-value">{stats?.meals_rescued ?? '—'}</span><span className="stat-label">Meals Received</span></div>
        <div className="stat-card blue"><span className="stat-value">{matches.filter(m => m.status === 'PENDING').length}</span><span className="stat-label">Pending Offers</span></div>
      </div>
      <h2>Match Inbox</h2>
      {matches.length === 0 ? (
        <p className="empty-state">No pending match offers. {autoMatch ? 'New matches will appear here automatically.' : 'Enable auto-match to receive offers.'}</p>
      ) : (
        <div className="matches-list">
          {matches.map((m) => (
            <MatchCard key={m.match_id} match={m} onAccept={handleAccept} onDecline={handleDecline} />
          ))}
        </div>
      )}
    </div>
  );
}
