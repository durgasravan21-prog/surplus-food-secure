import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingsService } from '../services/listings';
import { LISTING_STATUS } from '../config/constants';

export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? { status: filter } : {};
    listingsService.getMine(params)
      .then((res) => setListings(res.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleCancel = async (id) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    try {
      await listingsService.cancel(id, reason);
      setListings((prev) => prev.map((l) => l.listing_id === id ? { ...l, status: 'CANCELLED' } : l));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel listing.');
    }
  };

  const statusColor = (status) => {
    const colors = { LISTED: '#1a73e8', MATCHED_PENDING_NGO_ACCEPT: '#ff9800', NGO_ACCEPTED: '#0f9b58', DELIVERY_ASSIGNED: '#9c27b0', PICKED_UP: '#00bcd4', DELIVERED: '#4caf50', EXPIRED: '#9e9e9e', CANCELLED: '#f44336' };
    return colors[status] || '#666';
  };

  if (loading) return <div className="loading">Loading listings...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>My Listings</h1>
        <Link to="/dashboard/listings/new" style={{ padding: '10px 20px', background: '#0f9b58', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
          + New Listing
        </Link>
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('')} style={{ padding: '6px 14px', borderRadius: '20px', border: !filter ? '2px solid #0f9b58' : '1px solid #ddd', background: !filter ? '#e8f5e9' : 'white', cursor: 'pointer', fontSize: '12px' }}>All</button>
        {Object.values(LISTING_STATUS).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 14px', borderRadius: '20px', border: filter === s ? '2px solid #0f9b58' : '1px solid #ddd', background: filter === s ? '#e8f5e9' : 'white', cursor: 'pointer', fontSize: '12px' }}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>
      {listings.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888' }}>No listings found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {listings.map((l) => (
            <div key={l.listing_id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{l.food_type}</strong>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{l.quantity_meals} meals · Best before: {new Date(l.best_before_at).toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', background: statusColor(l.status), color: 'white', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{l.status.replace(/_/g, ' ')}</span>
                {!['DELIVERED', 'EXPIRED', 'CANCELLED'].includes(l.status) && (
                  <button onClick={() => handleCancel(l.listing_id)} style={{ padding: '6px 12px', background: 'white', border: '1px solid #f44336', color: '#f44336', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
