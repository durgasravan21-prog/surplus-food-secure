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

  if (loading) return <div className="loading">Loading impact statistics...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Environmental & Social Impact</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Cumulative statistics on meals rescued, food diverted from landfills, and CO2 emissions prevented.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {[
          { value: stats?.meals_rescued ?? '0', label: 'Meals Rescued', desc: 'Direct meals served to beneficiaries' },
          { value: stats?.kg_saved ? `${stats.kg_saved} kg` : '0 kg', label: 'Food Waste Diverted', desc: 'Total mass of food preserved' },
          { value: stats?.co2e_kg_estimate ? `${stats.co2e_kg_estimate} kg` : '0 kg', label: 'CO2e Prevented', desc: 'Methane & carbon emissions saved' },
          { value: stats?.listings_delivered ?? '0', label: 'Completed Rescues', desc: 'Verified dropoff deliveries' },
          { value: stats?.listings_expired ?? '0', label: 'Expired Listings', desc: 'Unmatched or timed out listings' },
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
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
