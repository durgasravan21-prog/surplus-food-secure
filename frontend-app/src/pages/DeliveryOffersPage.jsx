import { useNavigate } from 'react-router-dom';
import { useDemoData } from '../context/DemoDataContext';
import { LISTING_STATUS } from '../config/constants';
import { useCountdown } from '../hooks/useCountdown';

function DeliveryOfferCard({ listing, onAccept }) {
  const timeLeft = useCountdown(new Date(Date.now() + 5 * 60 * 1000));

  return (
    <div className="stitch-match-card">
      <div className="match-card-header">
        <div>
          <span className="match-donor">Direct Pickup Assignment</span>
          <h3 className="match-food">{listing.food_type}</h3>
        </div>
        <span className="distance-badge">{listing.distance_km || 2.1} km to pickup</span>
      </div>

      <div className="match-specs">
        <div className="spec-box">
          <span className="spec-label">Pickup Kitchen</span>
          <span className="spec-value">{listing.donor_name}</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Quantity</span>
          <span className="spec-value">{listing.quantity_meals} meals</span>
        </div>
        <div className="spec-box">
          <span className="spec-label">Dropoff Destination</span>
          <span className="spec-value">{listing.matched_ngo_name || 'Anna Seva Trust Food Bank'}</span>
        </div>
      </div>

      <div className="match-countdown-bar">
        <div className="countdown-info">
          <span>Accept Assignment Window</span>
          <strong>{timeLeft.minutes}m {timeLeft.seconds}s remaining</strong>
        </div>
        <div className="countdown-progress">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, (timeLeft.total / (5 * 60 * 1000)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="match-actions">
        <button
          type="button"
          className="btn-accept"
          onClick={() => onAccept(listing.id)}
        >
          Accept Pickup & Open Route Stepper
        </button>
      </div>
    </div>
  );
}

export default function DeliveryOffersPage() {
  const { listings } = useDemoData();
  const navigate = useNavigate();

  // Find listings ready for delivery assignment
  const deliveryOffers = listings.filter(
    (l) => l.status === LISTING_STATUS.DELIVERY_ASSIGNED || l.status === LISTING_STATUS.NGO_ACCEPTED
  );

  const handleAccept = () => {
    navigate('/dashboard/active');
  };

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Volunteer Rider Command</span>
          <h1>Available Pickup Offers</h1>
          <p>Real-time delivery assignments sorted nearest-first within your active vehicle operating radius.</p>
        </div>
      </div>

      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Pending Dispatch Assignments</h2>
            <p>Assigned pickups matching your vehicle mode and current location</p>
          </div>
        </div>

        <div className="match-cards-container">
          {deliveryOffers.length === 0 ? (
            <div className="empty-inbox">
              <div className="empty-title">No pending pickup assignments</div>
              <p>Keep your status set to Online to receive real-time notifications when NGOs accept match offers.</p>
            </div>
          ) : (
            deliveryOffers.map((item) => (
              <DeliveryOfferCard key={item.id} listing={item} onAccept={handleAccept} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
