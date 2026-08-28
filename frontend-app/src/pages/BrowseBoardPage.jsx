import { useState, useEffect } from 'react';
import { listingsService } from '../services/listings';

export default function BrowseBoardPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listingsService.getBoard()
      .then((res) => setListings(res.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async (id) => {
    try {
      await listingsService.claim(id);
      setListings((prev) => prev.filter((l) => l.listing_id !== id));
      alert('Successfully claimed listing!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to claim listing.');
    }
  };

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>Browse Board</h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>Unmatched listings available for manual claim by any verified NGO.</p>
      {listings.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888' }}>No unmatched listings available right now.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {listings.map((l) => (
            <div key={l.listing_id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{l.food_type}</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px' }}>🍽️ {l.quantity_meals} meals</p>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px' }}>⏰ Best before: {new Date(l.best_before_at).toLocaleTimeString()}</p>
              {l.distance_km && <p style={{ fontSize: '13px', color: '#1a73e8', margin: '0 0 12px' }}>📍 {l.distance_km} km away</p>}
              <button onClick={() => handleClaim(l.listing_id)} style={{ width: '100%', padding: '10px', background: '#0f9b58', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Claim This Listing</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
