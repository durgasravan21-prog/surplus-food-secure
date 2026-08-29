import { useState, useEffect } from 'react';
import { statsService } from '../services/stats';

export default function ImpactStatsPage() {
  const [impactStats, setImpactStats] = useState({
    totalMeals: 0,
    totalKg: 0,
    totalCo2e: 0,
    totalDelivered: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        setLoading(true);
        const res = await statsService.getImpact();
        setImpactStats({
          totalMeals: res.data?.total_meals || 0,
          totalKg: res.data?.total_kg || 0,
          totalCo2e: res.data?.total_co2e || 0,
          totalDelivered: res.data?.total_delivered || 0
        });
      } catch (err) {
        console.error('Error fetching impact stats:', err);
        setError('Failed to load impact stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchImpact();
  }, []);

  if (loading) {
    return <div className="stitch-dashboard"><div style={{ padding: '24px' }}>Loading impact stats...</div></div>;
  }

  if (error) {
    return <div className="stitch-dashboard"><div style={{ padding: '24px', color: '#ef4444' }}>{error}</div></div>;
  }

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Sustainability & ESG</span>
          <h1>Environmental Impact Ledger</h1>
          <p>Verified meal rescues, food diversion metrics, and carbon emissions offset recorded across the network.</p>
        </div>
      </div>

      <div className="stitch-metrics-grid">
        <div className="stitch-metric-card">
          <span className="metric-label">Meals Rescued</span>
          <div className="metric-number">{impactStats.totalMeals}</div>
          <span className="metric-footnote">Served to verified beneficiaries</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Food Saved from Waste</span>
          <div className="metric-number">{impactStats.totalKg} <span className="unit">kg</span></div>
          <span className="metric-footnote">Direct landfill diversion</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">CO2e Emissions Avoided</span>
          <div className="metric-number">{impactStats.totalCo2e} <span className="unit">kg</span></div>
          <span className="metric-footnote">Calculated EPA WARM factor</span>
        </div>

        <div className="stitch-metric-card">
          <span className="metric-label">Completed Dispatches</span>
          <div className="metric-number">{impactStats.totalDelivered}</div>
          <span className="metric-footnote">Full chain of custody verified</span>
        </div>
      </div>

      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Impact Distribution by Perishability Class</h2>
            <p>Breakdown of rescued food types</p>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#15803d', marginBottom: '6px' }}>
              Cooked Meals (Highly Perishable)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>68%</div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Matched within &lt;15 minutes to nearest shelters before expiry.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1a73e8', marginBottom: '6px' }}>
              Bakery & Fresh Produce (Moderate)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>24%</div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Scheduled for same-day evening community distribution.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#9333ea', marginBottom: '6px' }}>
              Packaged / Shelf Stable
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>8%</div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Stocked in NGO food bank pantry storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
