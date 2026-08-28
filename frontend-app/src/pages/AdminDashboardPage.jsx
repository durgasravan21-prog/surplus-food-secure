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
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 24px' }}>Admin Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { value: dashboard?.listings_today ?? '—', label: 'Listings Today', color: '#1a73e8' },
          { value: dashboard?.matched_pct ? `${dashboard.matched_pct}%` : '—', label: 'Matched Rate', color: '#0f9b58' },
          { value: dashboard?.delivered_pct ? `${dashboard.delivered_pct}%` : '—', label: 'Delivery Rate', color: '#00bcd4' },
          { value: dashboard?.expired_pct ? `${dashboard.expired_pct}%` : '—', label: 'Expired Rate', color: '#f44336' },
          { value: dashboard?.avg_time_to_match_seconds ? `${dashboard.avg_time_to_match_seconds}s` : '—', label: 'Avg Match Time', color: '#9c27b0' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '32px', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
