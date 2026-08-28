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
      reason = prompt('Reason for rejection/resubmit:');
      if (!reason) return;
    }
    try {
      await verificationService.review(id, decision, reason);
      setQueue((prev) => prev.filter((v) => v.verification_id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Review failed.');
    }
  };

  if (loading) return <div className="loading">Loading verification queue...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>Verification Queue</h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUIRED'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 14px', borderRadius: '20px', border: filter === s ? '2px solid #0f9b58' : '1px solid #ddd', background: filter === s ? '#e8f5e9' : 'white', cursor: 'pointer', fontSize: '12px' }}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>
      {queue.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888' }}>No items in queue.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queue.map((v) => (
            <div key={v.verification_id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <strong>{v.doc_type}</strong>
                  <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>User: {v.user_id} · Submitted: {new Date(v.submitted_at).toLocaleString()}</p>
                  {v.flagged_duplicate && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>⚠️ Flagged Duplicate</span>}
                </div>
              </div>
              {filter === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleReview(v.verification_id, 'APPROVED')} style={{ padding: '8px 16px', background: '#0f9b58', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => handleReview(v.verification_id, 'REJECTED')} style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                  <button onClick={() => handleReview(v.verification_id, 'RESUBMIT_REQUIRED')} style={{ padding: '8px 16px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Request Resubmit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
