import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from '../services/delivery';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCountdown } from '../hooks/useCountdown';

function OfferCard({ offer, onAccept, onDecline }) {
  const timeLeft = useCountdown(offer.expires_at);
  const isExpired = timeLeft.total <= 0;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', opacity: isExpired ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
          Delivery Assignment Offer
        </span>
        {offer.distance_km && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
            {offer.distance_km} km to pickup
          </span>
        )}
      </div>

      <h3 style={{ margin: '8px 0', fontSize: '16px', color: '#0f172a' }}>{offer.food_type || 'Surplus Food Pickup'}</h3>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
        Exact address and route will be disclosed upon acceptance.
      </p>

      {!isExpired && (
        <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '4px', marginBottom: '14px', display: 'inline-block' }}>
          Accept window expires in: <strong>{timeLeft.minutes}m {timeLeft.seconds}s</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onAccept(offer.id)}
          disabled={isExpired}
          style={{ flex: 1, padding: '10px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: isExpired ? 'not-allowed' : 'pointer' }}
        >
          Accept Assignment
        </button>
        <button
          onClick={() => onDecline(offer.id)}
          disabled={isExpired}
          style={{ flex: 1, padding: '10px', background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: isExpired ? 'not-allowed' : 'pointer' }}
        >
          Decline
        </button>
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
      window.location.href = '/dashboard/active';
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to accept offer.');
    }
  };

  const handleDecline = async (id) => {
    try {
      await deliveryService.declineOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to decline offer.');
    }
  };

  const handleNewOffer = useCallback((data) => setOffers((prev) => [data, ...prev]), []);
  useWebSocket('DELIVERY_OFFER', handleNewOffer);

  if (loading) return <div className="loading">Loading delivery offers...</div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Delivery Offers</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Auto-assigned pickup opportunities within your vehicle operating radius.
        </p>
      </div>

      {offers.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No pending delivery offers at the moment. Keep your status online to receive assignments.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onAccept={handleAccept} onDecline={handleDecline} />
          ))}
        </div>
      )}
    </div>
  );
}
