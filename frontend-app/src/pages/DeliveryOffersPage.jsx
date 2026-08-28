import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from '../services/delivery';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';

function OfferCard({ offer, onAccept, onDecline }) {
  const { timeLeft } = useCountdown(offer.expires_at);
  const isExpired = timeLeft.total <= 0;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: isExpired ? 0.5 : 1 }}>
      <h3 style={{ margin: '0 0 8px' }}>{offer.food_type || 'Food Pickup'}</h3>
      <p style={{ fontSize: '13px', color: '#666' }}>📍 {offer.distance_km ? `${offer.distance_km} km away` : 'Location available on accept'}</p>
      {!isExpired && <p style={{ fontSize: '13px', color: '#ff9800', fontWeight: 600, margin: '8px 0' }}>⏳ {timeLeft.minutes}m {timeLeft.seconds}s remaining</p>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button onClick={() => onAccept(offer.id)} disabled={isExpired} style={{ flex: 1, padding: '10px', background: '#0f9b58', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isExpired ? 'not-allowed' : 'pointer', opacity: isExpired ? 0.5 : 1 }}>Accept</button>
        <button onClick={() => onDecline(offer.id)} disabled={isExpired} style={{ flex: 1, padding: '10px', background: 'white', color: '#666', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600, cursor: isExpired ? 'not-allowed' : 'pointer', opacity: isExpired ? 0.5 : 1 }}>Decline</button>
      </div>
    </div>
  );
}

export default function DeliveryOffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deliveryService.getPendingOffers()
      .then((res) => setOffers(res.data || []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    try {
      await deliveryService.acceptOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (err) { alert(err.response?.data?.error?.message || 'Failed to accept'); }
  };

  const handleDecline = async (id) => {
    try {
      await deliveryService.declineOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (err) { alert(err.response?.data?.error?.message || 'Failed to decline'); }
  };

  const handleNewOffer = useCallback((data) => setOffers((prev) => [data, ...prev]), []);
  useWebSocket('DELIVERY_OFFER', handleNewOffer);

  if (loading) return <div className="loading">Loading offers...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 24px' }}>Delivery Offers</h1>
      {offers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888' }}>No pending delivery offers. Stay online to receive new ones!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {offers.map((o) => <OfferCard key={o.id} offer={o} onAccept={handleAccept} onDecline={handleDecline} />)}
        </div>
      )}
    </div>
  );
}
