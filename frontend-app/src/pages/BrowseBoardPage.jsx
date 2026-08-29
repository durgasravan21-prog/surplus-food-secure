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
      setListings((prev) => prev.filter((l) => l.id !== id));
      alert('Successfully claimed listing.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to claim listing.');
    }
  };

  if (loading) return <div className="loading">Loading board listings...</div>;

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Public Claim Board</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Unmatched or radius-widened listings available for voluntary manual claim by any verified NGO.
        </p>
      </div>

      {listings.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No unmatched listings currently available on the board.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {listings.map((l) => (
            <div key={l.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 10px', fontSize: '16px', color: '#0f172a' }}>{l.food_type}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#334155', marginBottom: '16px' }}>
                  <div><span style={{ color: '#64748b' }}>Quantity:</span> {l.quantity_meals} meals</div>
                  <div><span style={{ color: '#64748b' }}>Best Before:</span> {new Date(l.best_before_at).toLocaleTimeString()}</div>
                  {l.distance_km && <div><span style={{ color: '#64748b' }}>Distance:</span> {l.distance_km} km</div>}
                </div>
              </div>

              <button
                onClick={() => handleClaim(l.id)}
                style={{ width: '100%', padding: '10px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Claim Listing
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
