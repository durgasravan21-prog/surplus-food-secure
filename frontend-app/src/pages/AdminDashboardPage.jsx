import { useState, useEffect } from 'react';
import { statsService } from '../services/stats';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getAdminDashboard()
      .then((res) => setDashboard(res.data))
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Platform Administration</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Real-time network operational metrics, match efficiency, and dispatch performance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { value: dashboard?.listings_today ?? '0', label: 'Listings Today' },
          { value: dashboard?.matched_pct ? `${dashboard.matched_pct}%` : '0%', label: 'Match Rate' },
          { value: dashboard?.delivered_pct ? `${dashboard.delivered_pct}%` : '0%', label: 'Delivery Rate' },
          { value: dashboard?.expired_pct ? `${dashboard.expired_pct}%` : '0%', label: 'Expiry Rate' },
          { value: dashboard?.avg_time_to_match_seconds ? `${dashboard.avg_time_to_match_seconds}s` : '0s', label: 'Avg Match Time' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
