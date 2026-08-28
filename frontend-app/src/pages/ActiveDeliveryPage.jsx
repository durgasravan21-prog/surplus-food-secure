import { useState } from 'react';
import { deliveryService } from '../services/delivery';
import { uploadService } from '../services/uploads';

const DELIVERY_STATES = ['DELIVERY_ASSIGNED', 'PARTNER_ARRIVED_PICKUP', 'PICKED_UP', 'DELIVERED'];

export default function ActiveDeliveryPage() {
  const [delivery, setDelivery] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    if (!delivery) return;
    try {
      await deliveryService.updateStatus(delivery.id, newStatus);
      setDelivery((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update delivery status.');
    }
  };

  const handlePhotoUpload = async (stage, e) => {
    const file = e.target.files[0];
    if (!file || !delivery) return;
    setUploading(true);
    try {
      const fileUrl = await uploadService.uploadFile(file, 'DELIVERY_PROOF');
      await deliveryService.uploadPhoto(delivery.id, stage, fileUrl);
      alert(`${stage} photo uploaded and verified successfully.`);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const currentIdx = delivery ? DELIVERY_STATES.indexOf(delivery.status) : -1;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Active Delivery Tracker</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          Follow the sequential verification steps from pickup to dropoff.
        </p>
      </div>

      {!delivery ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No active delivery assignment in progress. Accept an offer from the Delivery Offers page.
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {DELIVERY_STATES.map((state, idx) => (
              <div
                key={state}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  textAlign: 'center',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: idx <= currentIdx ? '#dcfce7' : '#f1f5f9',
                  color: idx <= currentIdx ? '#166534' : '#64748b',
                  border: idx === currentIdx ? '1px solid #15803d' : '1px solid transparent'
                }}
              >
                {state.replace(/_/g, ' ')}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {delivery.status === 'DELIVERY_ASSIGNED' && (
              <button
                onClick={() => handleStatusUpdate('PARTNER_ARRIVED_PICKUP')}
                style={{ padding: '12px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                Confirm Arrival at Pickup Kitchen
              </button>
            )}

            {delivery.status === 'PARTNER_ARRIVED_PICKUP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Upload Pickup Proof Photo *
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('PICKUP', e)}
                    disabled={uploading}
                    style={{ marginTop: '8px' }}
                  />
                </label>
                <button
                  onClick={() => handleStatusUpdate('PICKED_UP')}
                  style={{ padding: '12px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  Mark as Picked Up — En Route to NGO
                </button>
              </div>
            )}

            {delivery.status === 'PICKED_UP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Upload Dropoff Proof Photo *
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload('DROPOFF', e)}
                    disabled={uploading}
                    style={{ marginTop: '8px' }}
                  />
                </label>
                <button
                  onClick={() => handleStatusUpdate('DELIVERED')}
                  style={{ padding: '12px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  Confirm Delivery to NGO
                </button>
              </div>
            )}

            {delivery.status === 'DELIVERED' && (
              <div style={{ textAlign: 'center', padding: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontWeight: 600 }}>
                Delivery Completed Successfully. Thank you for rescuing surplus food!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
