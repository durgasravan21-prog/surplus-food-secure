import { useState, useEffect } from 'react';
import { statsService } from '../services/stats';

export default function ImpactStatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getImpact()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading impact stats...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>🌱 Your Impact</h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>Your contribution to reducing food waste.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { value: stats?.meals_rescued ?? '—', label: 'Meals Rescued', icon: '🍽️', color: '#0f9b58' },
          { value: stats?.kg_saved ? `${stats.kg_saved} kg` : '—', label: 'Food Saved', icon: '⚖️', color: '#1a73e8' },
          { value: stats?.co2e_kg_estimate ? `${stats.co2e_kg_estimate} kg` : '—', label: 'CO₂e Prevented', icon: '🌍', color: '#00bcd4' },
          { value: stats?.listings_delivered ?? '—', label: 'Deliveries Completed', icon: '✅', color: '#9c27b0' },
          { value: stats?.listings_expired ?? '—', label: 'Listings Expired', icon: '⏰', color: '#f44336' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
