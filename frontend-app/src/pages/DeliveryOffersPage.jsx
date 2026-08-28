import { useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';

const DEMO_OFFERS = [
  {
    id: 'do-501',
    donor_kitchen: 'Saffron Grand Commercial Kitchen',
    pickup_address: 'Koramangala 80ft Road, Bengaluru (Exact pin on accept)',
    dropoff_ngo: 'Anna Seva Trust Food Bank',
    food_type: 'Cooked Rice + Dal Makhani (Warm Container)',
    quantity_meals: 45,
    distance_km: 1.85,
    expires_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
    status: 'PENDING',
  },
];

function OfferCard({ offer, onAccept, onDecline }) {
  const timeLeft = useCountdown(offer.expires_at);
  const isExpired = timeLeft.total <= 0;

  return (
    <div className="stitch-match-card">
      <div className="match-card-header">
        <div>
          <span className="match-donor">Pickup Assignment Request</span>
          <h3 className="match-food">{offer.food_type}</h3>
        </div>
        <span className="distance-badge">{offer.distance_km} km pickup</span>
      </div>

      <div className="match-specs">
        <div className="spec-box">
          <span className="spec-label">Pickup Kitchen</span>
          <span className="spec-value">{offer.donor_kitchen}</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Quantity</span>
          <span className="spec-value">{offer.quantity_meals} meals</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Destination</span>
          <span className="spec-value">{offer.dropoff_ngo}</span>
        </div>
      </div>

      {!isExpired && (
        <div className="match-countdown-bar">
          <div className="countdown-info">
            <span>Accept Window</span>
            <strong>{timeLeft.minutes}m {timeLeft.seconds}s remaining</strong>
          </div>
          <div className="countdown-progress">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (timeLeft.total / (5 * 60 * 1000)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="match-actions">
        <button
          type="button"
          className="btn-accept"
          onClick={() => onAccept(offer.id)}
          disabled={isExpired}
        >
          Accept Delivery Assignment
        </button>
        <button
          type="button"
          className="btn-decline"
          onClick={() => onDecline(offer.id)}
          disabled={isExpired}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export default function DeliveryOffersPage() {
  const [offers, setOffers] = useState(DEMO_OFFERS);

  const handleAccept = (id) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    window.location.href = '/dashboard/active';
  };

  const handleDecline = (id) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Delivery Partner Portal</span>
          <h1>Volunteer Pickup Offers</h1>
          <p>Assigned pickups sorted nearest-first within your bike operating radius.</p>
        </div>
      </div>

      <div className="stitch-section-card">
        <div className="section-card-header">
          <h2>Pending Delivery Offers</h2>
        </div>

        <div className="match-cards-container">
          {offers.length === 0 ? (
            <div className="empty-inbox">
              <div className="empty-title">No pending pickup offers</div>
              <p>Keep your status set to ONLINE to receive automatic assignments.</p>
            </div>
          ) : (
            offers.map((o) => (
              <OfferCard key={o.id} offer={o} onAccept={handleAccept} onDecline={handleDecline} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
