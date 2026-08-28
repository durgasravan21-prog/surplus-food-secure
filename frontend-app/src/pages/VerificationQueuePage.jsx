import { useState, useEffect } from 'react';
import { verificationService } from '../services/verification';

export default function VerificationQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    verificationService.getQueue({ status: filter })
      .then((res) => setQueue(res.data || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleReview = async (id, decision) => {
    let reason = '';
    if (decision !== 'APPROVED') {
      reason = prompt('Reason for rejection or resubmission:');
      if (!reason) return;
    }
    try {
      await verificationService.review(id, decision, reason);
      setQueue((prev) => prev.filter((v) => v.verification_id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Review action failed.');
    }
  };

  if (loading) return <div className="loading">Loading verification queue...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Verification Review Queue</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Evaluate submitted documents for Restaurants, NGOs, and Delivery Partners.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUIRED'].map((s) => (
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

      {queue.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No records found in this queue.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queue.map((v) => (
            <div key={v.verification_id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{v.doc_type}</strong>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    User ID: {v.user_id} · Submitted: {new Date(v.submitted_at).toLocaleString()}
                  </p>
                  {v.flagged_duplicate && (
                    <span style={{ display: 'inline-block', padding: '3px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '11px', fontWeight: 700, marginTop: '8px' }}>
                      Duplicate License Flagged
                    </span>
                  )}
                </div>
              </div>

              {filter === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReview(v.verification_id, 'APPROVED')}
                    style={{ padding: '8px 16px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(v.verification_id, 'REJECTED')}
                    style={{ padding: '8px 16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(v.verification_id, 'RESUBMIT_REQUIRED')}
                    style={{ padding: '8px 16px', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Request Resubmit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
