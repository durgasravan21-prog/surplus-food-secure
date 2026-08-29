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
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'CANCELLED' } : l));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel listing.');
    }
  };

  const statusClass = (status) => {
    const classes = {
      LISTED: 'badge-blue',
      MATCHED_PENDING_NGO_ACCEPT: 'badge-amber',
      NGO_ACCEPTED: 'badge-green',
      DELIVERY_ASSIGNED: 'badge-purple',
      PICKED_UP: 'badge-teal',
      DELIVERED: 'badge-green-solid',
      EXPIRED: 'badge-neutral',
      CANCELLED: 'badge-red',
    };
    return classes[status] || 'badge-neutral';
  };

  if (loading) return <div className="loading">Loading listings...</div>;

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>My Listings</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Track status and dispatch lifecycle for all your published listings</p>
        </div>
        <Link to="/dashboard/listings/new" style={{ padding: '10px 16px', background: '#15803d', color: '#ffffff', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
          Create Listing
        </Link>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '6px 14px',
            borderRadius: '4px',
            border: !filter ? '1px solid #15803d' : '1px solid #cbd5e1',
            background: !filter ? '#15803d' : '#ffffff',
            color: !filter ? '#ffffff' : '#475569',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          All
        </button>
        {Object.values(LISTING_STATUS).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: filter === s ? '1px solid #15803d' : '1px solid #cbd5e1',
              background: filter === s ? '#15803d' : '#ffffff',
              color: filter === s ? '#ffffff' : '#475569',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {listings.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No listings found under the selected filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {listings.map((l) => (
            <div key={l.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>{l.food_type}</strong>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  {l.quantity_meals} meals · Best before: {new Date(l.best_before_at).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className={`status-badge ${statusClass(l.status)}`}>
                  {l.status.replace(/_/g, ' ')}
                </span>
                {!['DELIVERED', 'EXPIRED', 'CANCELLED'].includes(l.status) && (
                  <button
                    onClick={() => handleCancel(l.id)}
                    style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
