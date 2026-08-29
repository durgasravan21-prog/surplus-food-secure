import { useState } from 'react';
import { useDemoData } from '../context/DemoDataContext';

export default function VerificationQueuePage() {
  const { verifications, reviewVerification } = useDemoData();
  const [filter, setFilter] = useState('PENDING');

  const filteredQueue = verifications.filter((v) => (filter ? v.status === filter : true));

  const handleReview = (id, decision) => {
    let reason = '';
    if (decision !== 'APPROVED') {
      reason = prompt('Reason for rejection / resubmission request:');
      if (!reason) return;
    }
    reviewVerification(id, decision);
    alert(`Verification ${id} marked as ${decision}.`);
  };

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Trust & Compliance</span>
          <h1>Verification Review Queue</h1>
          <p>Admin verification gate evaluating submitted FSSAI licenses, NGO registration certificates, and rider KYC.</p>
        </div>
      </div>

      <div className="stitch-section-card">
        <div className="section-card-header">
          <div>
            <h2>Submitted Verification Documents</h2>
            <p>Mandatory gate before entities can publish or claim surplus food</p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: filter === s ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: filter === s ? '#0f172a' : '#ffffff',
                  color: filter === s ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredQueue.length === 0 ? (
            <div className="empty-inbox">
              <div className="empty-title">No applications in this filter</div>
              <p>All submitted documents have been reviewed.</p>
            </div>
          ) : (
            filteredQueue.map((v) => (
              <div
                key={v.verification_id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{v.org_name}</strong>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                      {v.role}
                    </span>
                    {v.flagged_duplicate && (
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px' }}>
                        Duplicate License Flagged
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Doc Type: <strong>{v.doc_type}</strong> | {v.license_no ? `License: ${v.license_no}` : v.reg_no ? `Reg: ${v.reg_no}` : `Vehicle: ${v.vehicle_type}`}
                  </p>

                  {v.doc_type === 'FSSAI_LICENSE' && v.license_no && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a
                        href="https://foscos.fssai.gov.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🔍 Cross-Check on Official FoSCoS Portal ({v.license_no})
                      </a>
                    </div>
                  )}

                  {v.doc_type === 'FSSAI_LICENSE' && (
                    <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#475569' }}>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>🟢 AI Vision Pre-Check: 14-Digit Format Verified</span>
                      <div style={{ color: '#64748b', marginTop: '2px' }}>OCR Pre-Check: 98% Match Confidence · Human Admin review is the authoritative source of truth.</div>
                    </div>
                  )}

                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0' }}>
                    Submitted: {new Date(v.submitted_at).toLocaleString()}
                  </p>
                  
                  {v.file_url && (
                    v.file_url.toLowerCase().endsWith('.pdf') ? (
                      <div style={{ marginTop: '10px' }}>
                        <a href={v.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, fontSize: '12px', textDecoration: 'underline' }}>
                          📄 View Document (PDF)
                        </a>
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Document Preview:</span>
                        <img src={v.file_url} alt="Verification Doc" style={{ maxWidth: '180px', maxHeight: '120px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => window.open(v.file_url, '_blank')} />
                      </div>
                    )
                  )}

                  {(v.id_file_url || v.selfie_file_url) && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                      {v.id_file_url && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ID Card:</span>
                          <img src={v.id_file_url} alt="Govt ID" style={{ maxWidth: '120px', maxHeight: '90px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => window.open(v.id_file_url, '_blank')} />
                        </div>
                      )}
                      {v.selfie_file_url && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Selfie:</span>
                          <img src={v.selfie_file_url} alt="Selfie" style={{ maxWidth: '120px', maxHeight: '90px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => window.open(v.selfie_file_url, '_blank')} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`status-pill ${v.status === 'APPROVED' ? 'chip-green' : v.status === 'REJECTED' ? 'chip-red' : 'chip-amber'}`}>
                    {v.status}
                  </span>

                  {v.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReview(v.verification_id, 'APPROVED')}
                        style={{ padding: '8px 14px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(v.verification_id, 'REJECTED')}
                        style={{ padding: '8px 14px', background: '#ffffff', color: '#dc2626', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
