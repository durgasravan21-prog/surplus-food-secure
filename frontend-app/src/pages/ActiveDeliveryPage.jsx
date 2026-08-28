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
      alert(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handlePhotoUpload = async (stage, e) => {
    const file = e.target.files[0];
    if (!file || !delivery) return;
    setUploading(true);
    try {
      const fileUrl = await uploadService.uploadFile(file, 'DELIVERY_PROOF');
      await deliveryService.uploadPhoto(delivery.id, stage, fileUrl);
      alert(`${stage} photo uploaded successfully!`);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const currentIdx = delivery ? DELIVERY_STATES.indexOf(delivery.status) : -1;

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 24px' }}>Active Delivery</h1>
      {!delivery ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#888' }}>
          No active delivery. Accept an offer to start.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {DELIVERY_STATES.map((state, idx) => (
              <div key={state} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: idx <= currentIdx ? '#e8f5e9' : '#f5f5f5', color: idx <= currentIdx ? '#0f9b58' : '#999' }}>
                {state.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {delivery.status === 'DELIVERY_ASSIGNED' && (
              <button onClick={() => handleStatusUpdate('PARTNER_ARRIVED_PICKUP')} style={{ padding: '12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                I've Arrived at Pickup
              </button>
            )}
            {delivery.status === 'PARTNER_ARRIVED_PICKUP' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Upload Pickup Photo *
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('PICKUP', e)} disabled={uploading} style={{ marginTop: '6px' }} />
                </label>
                <button onClick={() => handleStatusUpdate('PICKED_UP')} style={{ padding: '12px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Picked Up — Heading to Drop-off
                </button>
              </>
            )}
            {delivery.status === 'PICKED_UP' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Upload Drop-off Photo *
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('DROPOFF', e)} disabled={uploading} style={{ marginTop: '6px' }} />
                </label>
                <button onClick={() => handleStatusUpdate('DELIVERED')} style={{ padding: '12px', background: '#0f9b58', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  ✅ Mark as Delivered
                </button>
              </>
            )}
            {delivery.status === 'DELIVERED' && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#0f9b58', fontWeight: 600, fontSize: '18px' }}>
                🎉 Delivery Complete! Thank you for your service.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
